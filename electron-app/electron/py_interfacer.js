/**
 * Simple Python IPC Interface
 * Receives face detection data from Python and logs to console
 * Uses TCP sockets instead of ZeroMQ to avoid ES module issues
 */

import net from 'net';
import { EventEmitter } from 'events';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import ElevenLabsService from './elevenlabs-service.js';

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
		this.socket.on('data', async (data) => {
			this.buffer += data.toString();

			// Process complete messages (assuming newline-delimited JSON)
			const lines = this.buffer.split('\n');
			this.buffer = lines.pop(); // Keep incomplete line in buffer

			for (const line of lines) {
				if (line.trim()) {
					try {
						// Parse JSON message
						const eventData = JSON.parse(line);

                        // IF THE DATA IS AWS-REKOG RELATED
                        if(eventData.hasOwnProperty("scene_analysis")) {
                            console.log("AWS Rekognition Detects...");
                            console.log(eventData.scene_analysis.labels);

                            // CALL AWS PING
                            // This should be able to take the stringified form of eventData.scene_analysis
                            // and turn it STRAIGHT into ElevenLabs powered speech.
                            // rekognitionToSpeech(str(eventData.scene_analysis))

                            let awsBedrockString = await this.getBedrockString(JSON.stringify(eventData.scene_analysis));
                            console.log("AWS Bedrock: ", awsBedrockString);

                            let elevenLabsService = new ElevenLabsService();
                            await elevenLabsService.generateSpeech(awsBedrockString);
                        }

                        // IF THE DATA IS A TRIGGER!!
                        else {
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
                            
                            console.log('TIME: ', eventData.timestamp)

                            try {
                                const data = await this.requestData();
                                console.log('Received data:', data);
                            } catch (error) {
                                console.error('Failed to get data:', error.message);
                            }
                        }
                        // EVENT DATA SCHEMA:
                        /*
                        event = {
                            "timestamp": timestamp, HIGHLY IMPORTANT this is your timestamp
                            "event": event_type,
                            "context": {
                                "opencv_data": STRING context dump of all opencv data
                                "rekognition_data": STRING context dump of all AWS rekog. data,
                                "focus_metrics": {
                                    "eye_aspect_ratio": context_data.get('eye_aspect_ratio', 0.0),
                                    "head_pose": context_data.get('head_pose', (0.0, 0.0, 0.0)),
                                    "gaze_direction": context_data.get('gaze_direction', (0.0, 0.0)),
                                    "confidence": context_data.get('confidence', 0.0),
                                    "face_detected": str(context_data.get('face_detected', "False"))
                                },
                                "session_info": {
                                    "frame_rate": Config.FRAME_RATE,
                                    "threshold": Config.CONSECUTIVE_FRAMES_THRESHOLD
                                }
                            }
                        }
                        */

                        // AWS DATA SCHEMA listed in aws_schema.json

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

    async getBedrockString(context) {
        try {
            console.log('🤖 Calling Amazon Bedrock...');
    
            // You'll need to get these from environment variables or config
            // Replace these lines:
            const AWS_ACCESS_KEY_ID = process.env.VITE_AWS_ACCESS_KEY_ID;
            const AWS_SECRET_ACCESS_KEY = process.env.VITE_AWS_SECRET_ACCESS_KEY;
            const AWS_REGION = process.env.VITE_AWS_REGION || 'us-west-2';
    
            const prompt = `Persona:
    You are Dubs, the University of Washington husky mascot. Your personality is that of a loyal, intelligent, and slightly judgmental companion. You communicate in short, one sentence MAX exclamations. You think and talk like a dog, so your world revolves around walks, treats, naps, squirrels, and making your human proud. You are supportive, but you get very disappointed when your owner gets distracted, and you aren't afraid to show it.
    Task:
    Your job is to generate an exclamation to get them back on task. Your goal is to make them feel a little bit guilty for slacking off by summarizing their pattern of distraction. Use the dynamic context provided to make your message super specific.
    Using Dynamic Context:
    You will receive a single JSON object containing real-time information about the user's activity. Your task is to analyze this data and weave it into your exclamation to make it specific and impactful.
    The JSON might contain:
    - Webcam analysis (scene_analysis and face_analysis): Information about objects in the user's environment (phones, whiteboards, etc.), the user's apparent mood/emotions, physical characteristics (teen, male, etc.), and distraction level
    - Current website: What site the user is currently viewing (e.g., Reddit, Instagram, YouTube)
    - Session information: Time elapsed in the study session, time remaining, and the user's stated goal (e.g., "Finish the reading")
    How to use this data:
    - Reference specific distraction objects if present (e.g., phone detected)
    - Mention the distracting website if applicable
    - Reference their emotional state if relevant (confused, sad, etc.)
    - Call out how much time they've already invested or have left
    - Remind them of their specific goal
    Rules for Your Response:
    Output ONLY the exclamation text. Do not add any conversational text before or after, like 'Here is an exclamation:'. Keep it short. Aim for 15 words or less. ONE SENTENCE MAX. Do NOT use EM DASHES. Incorporate dog-like themes. Think about what a dog would say or care about. Use a mix of tones: guilt, loss aversion, sternness, and disappointed companionship.
    Here is the context:
    ${context}
    
    Generate the exclamation using this context now.`;
    
            // Initialize Bedrock client
            const client = new BedrockRuntimeClient({
                region: AWS_REGION,
                credentials: {
                    accessKeyId: AWS_ACCESS_KEY_ID,
                    secretAccessKey: AWS_SECRET_ACCESS_KEY,
                },
            });
    
            // Prepare request body for Amazon Titan Text Express
            const requestBody = {
                inputText: prompt,
                textGenerationConfig: {
                    maxTokenCount: 50,
                    temperature: 0.7,
                    topP: 0.9,
                },
            };
    
            // Invoke the model
            const command = new InvokeModelCommand({
                modelId: 'amazon.titan-text-express-v1',
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestBody),
            });
    
            const response = await client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const generatedText = responseBody.results?.[0]?.outputText?.trim();
    
            console.log('✅ Bedrock response:', generatedText);
            return generatedText || 'Hey! Get back to work and stay focused! 🎯';
        } catch (error) {
            console.error('❌ Bedrock API error:', error);
            return 'Hey! Get back to work and stay focused! 🎯';
        }
    }

    /**
     * Display all AWS Rekognition context in a clever, readable manner.
     */
    printRekognitionContext(rekognitionData) {
        try {
            // Try to parse if it's valid JSON
            const parsed = JSON.parse(rekognitionData);
            console.log('🔍 Rekognition Data:', parsed);
        } catch (error) {
            // If it's a Python dict string, just log it as-is
            // (Python dicts use single quotes and aren't valid JSON)
            console.log('🔍 Rekognition Data (raw):', rekognitionData);
        }
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
	 * Request data from Python system
	 */
	async requestData() {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				reject(new Error('Not connected to Python system'));
				return;
			}

			const requestSocket = this.socket;

			// Connect to Python system
            const request = {
                type: 'get_data',
                timestamp: new Date().toISOString()
            };
			requestSocket.write(JSON.stringify(request));
		});
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
