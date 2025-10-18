/**
 * WebSocket client for Python vision server
 *
 * This is a stub/placeholder for future integration with the Python-based
 * webcam tracking server. The server will run separately and communicate
 * focus/distraction events via WebSocket.
 *
 * Expected message format from Python server:
 * {
 *   type: 'focus_update',
 *   data: {
 *     isFocused: boolean,
 *     confidence: number (0-1),
 *     faceDetected: boolean,
 *     eyesOnScreen: boolean,
 *     timestamp: number
 *   }
 * }
 *
 * Additional message types:
 * - 'distraction_detected': User looked away or at phone
 * - 'focus_restored': User returned attention to screen
 * - 'no_presence': No face detected for extended period
 */

export class VisionWebSocket {
	constructor(url = 'ws://localhost:8765') {
		this.url = url;
		this.ws = null;
		this.isConnected = false;
		this.reconnectInterval = null;
		this.listeners = new Map();
	}

	/**
	 * Connect to the Python vision server
	 */
	connect() {
		try {
			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				console.log('Connected to vision server');
				this.isConnected = true;
				this.emit('connected');

				// Clear reconnect interval if it exists
				if (this.reconnectInterval) {
					clearInterval(this.reconnectInterval);
					this.reconnectInterval = null;
				}
			};

			this.ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);
					this.handleMessage(message);
				} catch (error) {
					console.error('Failed to parse message from vision server:', error);
				}
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.emit('error', error);
			};

			this.ws.onclose = () => {
				console.log('Disconnected from vision server');
				this.isConnected = false;
				this.emit('disconnected');

				// Attempt to reconnect every 5 seconds
				if (!this.reconnectInterval) {
					this.reconnectInterval = setInterval(() => {
						console.log('Attempting to reconnect to vision server...');
						this.connect();
					}, 5000);
				}
			};
		} catch (error) {
			console.error('Failed to connect to vision server:', error);
			this.emit('error', error);
		}
	}

	/**
	 * Disconnect from the server
	 */
	disconnect() {
		if (this.reconnectInterval) {
			clearInterval(this.reconnectInterval);
			this.reconnectInterval = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.isConnected = false;
	}

	/**
	 * Handle incoming messages from the vision server
	 */
	handleMessage(message) {
		const { type, data } = message;

		switch (type) {
			case 'focus_update':
				this.emit('focusUpdate', data);
				break;
			case 'distraction_detected':
				this.emit('distractionDetected', data);
				break;
			case 'focus_restored':
				this.emit('focusRestored', data);
				break;
			case 'no_presence':
				this.emit('noPresence', data);
				break;
			default:
				console.warn('Unknown message type:', type);
				this.emit('message', message);
		}
	}

	/**
	 * Send a message to the server
	 */
	send(type, data) {
		if (this.ws && this.isConnected) {
			this.ws.send(JSON.stringify({ type, data }));
		} else {
			console.warn('Cannot send message: not connected to vision server');
		}
	}

	/**
	 * Register an event listener
	 */
	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event).push(callback);
	}

	/**
	 * Remove an event listener
	 */
	off(event, callback) {
		if (this.listeners.has(event)) {
			const callbacks = this.listeners.get(event);
			const index = callbacks.indexOf(callback);
			if (index > -1) {
				callbacks.splice(index, 1);
			}
		}
	}

	/**
	 * Emit an event to all registered listeners
	 */
	emit(event, data) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).forEach((callback) => {
				try {
					callback(data);
				} catch (error) {
					console.error(`Error in ${event} listener:`, error);
				}
			});
		}
	}
}

// Singleton instance (optional - can be instantiated per component)
export const visionSocket = new VisionWebSocket();
