/**
 * Simple Python IPC Interface
 * Receives face detection data from Python and logs to console
 * Uses TCP sockets instead of ZeroMQ to avoid ES module issues
 */

import net from 'net';
import { EventEmitter } from 'events';

class PythonIPCInterface extends EventEmitter {
	constructor() {
		super(); // Call EventEmitter constructor
		this.socket = null;
		this.isConnected = false;
		this.port = 5555;
		this.host = 'localhost';
		this.buffer = '';

		console.log('🐍 Python IPC Interface initialized');
	}

	/**
	 * Connect to Python vision system
	 */
	async connect() {
		try {
			//console.log('🔌 Connecting to Python vision system...');

			// Create TCP socket
			this.socket = new net.Socket();

			// Connect to Python publisher
			this.socket.connect(this.port, this.host, () => {
				//console.log(`✅ Connected to Python at ${this.host}:${this.port}`);
				this.isConnected = true;
			});

			// Set up message handling
			this.setupMessageHandling();
		} catch (error) {
			//console.error('❌ Failed to connect to Python:', error.message);
			this.scheduleReconnect();
		}
	}

	/**
	 * Set up message handling from Python
	 */
	setupMessageHandling() {
		if (!this.socket) return;

		// Handle incoming data
		this.socket.on('data', (data) => {
			this.buffer += data.toString();

			// Process complete messages (assuming newline-delimited JSON)
			const lines = this.buffer.split('\n');
			this.buffer = lines.pop(); // Keep incomplete line in buffer

			for (const line of lines) {
				if (line.trim()) {
					try {
						// Parse JSON message
						const eventData = JSON.parse(line);

						//console.log('📊 Face Detection Data:', eventData);

						// Emit events based on the event type
						if (eventData.event === 'user_unfocused') {
							console.log('User UNFOCUSED! LOCK BACK IN!!');
							// Emit distraction detected event
							this.emit('distraction_detected', eventData);
							this.emit('focus_update', {
								focused: false,
								...eventData
							});
						} else if (eventData.event === 'user_focused') {
							console.log('User FOCUSED! GOOD JOB!!');
							// Emit focus restored event
							this.emit('focus_restored', eventData);
							this.emit('focus_update', {
								focused: true,
								...eventData
							});
						}

                        // AWS Rekognition data ALL OUTPUTTED HERE!! Everything about room,
                        // distractions, objects nearby, user's surroundings, etc will be here.
                        console.log(eventData.context.rekognition_data);

					} catch (error) {
						console.error('❌ Failed to parse message:', error.message);
						console.log('Raw message:', line);
					}
				}
			}
		});

		// Handle socket errors
		this.socket.on('error', (error) => {
			//console.error('❌ Socket error:', error.message);
			this.handleDisconnection();
		});

		// Handle connection close
		this.socket.on('close', () => {
			//console.log('🔌 Connection closed');
			this.handleDisconnection();
		});
	}

	/**
	 * Handle disconnection
	 */
	handleDisconnection() {
		this.isConnected = false;
		//console.log('🔌 Disconnected from Python system');
		this.scheduleReconnect();
	}

	/**
	 * Schedule reconnection attempt
	 */
	scheduleReconnect() {
		setTimeout(() => {
			//console.log('🔄 Attempting to reconnect...');
			this.connect();
		}, 5000); // 5 second delay
	}

	/**
	 * Disconnect from Python system
	 */
	async disconnect() {
		//console.log('🔌 Disconnecting from Python system...');

		if (this.socket) {
			try {
				this.socket.destroy(); // Immediately destroy the socket
			} catch (error) {
				console.error('Error closing socket:', error.message);
			}
			this.socket = null;
		}

		this.isConnected = false;
		//console.log('✅ Disconnected from Python system');
	}
}

// Export the class
export default PythonIPCInterface;
