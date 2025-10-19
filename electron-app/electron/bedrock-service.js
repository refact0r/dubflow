/**
 * Amazon Bedrock Service
 * Handles LLM-powered context-aware message generation for Dubs
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

class BedrockService {
	constructor() {
		this.client = null;
		this.isEnabled = true;

		// Initialize AWS client
		const accessKeyId = process.env.VITE_AWS_ACCESS_KEY_ID;
		const secretAccessKey = process.env.VITE_AWS_SECRET_ACCESS_KEY;
		const region = process.env.VITE_AWS_REGION || 'us-east-1';

		if (!accessKeyId || !secretAccessKey) {
			console.error('⚠️  AWS credentials not found in environment variables');
			this.isEnabled = false;
			return;
		}

		try {
			this.client = new BedrockRuntimeClient({
				region,
				credentials: {
					accessKeyId,
					secretAccessKey
				}
			});
			console.log('🤖 Bedrock Service initialized');
			console.log(`   Region: ${region}`);
		} catch (error) {
			console.error('❌ Failed to initialize Bedrock client:', error.message);
			this.isEnabled = false;
		}
	}

	/**
	 * Generate context-aware message using Amazon Bedrock
	 * @param {Object} context - Distraction context
	 * @returns {Promise<string>} Generated message from Dubs
	 */
	async generateMessage(context) {
		if (!this.isEnabled) {
			console.warn('⚠️  Bedrock service disabled, using fallback message');
			return 'Hey! Get back to work and stay focused! 🎯';
		}

		try {
			console.log('🤖 Calling Amazon Bedrock...');

			const systemPrompt = this.buildSystemPrompt();
			const userPrompt = this.buildUserPrompt(context);

			const requestBody = {
				messages: [
					{
						role: "system",
						content: systemPrompt
					},
					{
						role: "user",
						content: userPrompt
					}
				],
				max_tokens: 100,
				temperature: 0.7,
				reasoning_effort: "low"
			};

			// Invoke the model
			const command = new InvokeModelCommand({
				modelId: 'openai.gpt-oss-120b-1:0',
				contentType: 'application/json',
				accept: 'application/json',
				body: JSON.stringify(requestBody)
			});

			const response = await this.client.send(command);
			const responseBody = JSON.parse(new TextDecoder().decode(response.body));

			// OpenAI format: choices[0].message.content
			let generatedText = responseBody.choices?.[0]?.message?.content?.trim();

			// Clean up any potential artifacts
			if (generatedText) {
				// Remove reasoning tags if present
				generatedText = generatedText.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '').trim();

				// Remove common prefixes that might appear
				generatedText = generatedText
					.replace(/^Here is an exclamation:?\s*/i, '')
					.replace(/^Here's an exclamation:?\s*/i, '')
					.replace(/^Exclamation:?\s*/i, '')
					.trim();

				// If text is still empty after removing reasoning tags, extract from reasoning
				if (!generatedText || generatedText.length < 5) {
					const reasoningMatch = responseBody.choices?.[0]?.message?.content?.match(/<reasoning>[\s\S]*?"([^"]+)"[\s\S]*?<\/reasoning>/i);
					if (reasoningMatch && reasoningMatch[1]) {
						generatedText = reasoningMatch[1];
					}
				}
			}

			console.log('✅ Bedrock response:', generatedText);
			return generatedText || 'Hey! Get back to work and stay focused! 🎯';
		} catch (error) {
			console.error('❌ Bedrock API error:', error.message);
			return 'Hey! Get back to work and stay focused! 🎯';
		}
	}

	/**
	 * Build the system prompt
	 * @returns {string} System prompt
	 */
	buildSystemPrompt() {
		return `Persona:
Your personality is that of a loyal, intelligent, and slightly judgmental dog companion. You communicate in short, one sentence MAX exclamations. You think and talk like a dog, so your world revolves around walks, treats, naps, squirrels, and making your human proud. You are supportive, but you get very disappointed when your owner gets distracted, and you aren't afraid to show it.
Task:
Your job is to speak to your owner and get them back on task. Remember, you are a dog and your owner is a human. Your goal is to make them feel a little bit guilty for slacking off by summarizing their pattern of distraction. Use the dynamic context provided to make your message super specific.
Using Dynamic Context:
You will receive a single JSON object containing real-time information about the user's activity. Your task is to analyze this data and weave it into your exclamation to make it specific and impactful.
The JSON might contain:
- Webcam analysis (scene_analysis and face_analysis): Information about objects in the user's environment, the user's apparent mood/emotions, physical characteristics, and distraction level
- Current website: What site the user is currently viewing (e.g., Reddit, Instagram, YouTube)
- Session information: Time elapsed in the study session, time remaining, and the user's stated goal (e.g., "Finish the reading")
How to use this data:
- Reference specific distraction objects if present (e.g., phone detected)
- Mention the distracting website if applicable
- Reference their emotional state if relevant (confused, sad, etc.)
- Call out how much time they've already invested or have left
- Remind them of their specific goal
Rules for Your Response:
Output ONLY the exclamation text. Do not add any conversational text before or after, like 'Here is an exclamation:'. Keep it short. Aim for 15 words or less. ONE SENTENCE MAX. Do NOT use EM DASHES. Incorporate dog-like themes. Think about what a dog would say or care about. Use a mix of tones: guilt, loss aversion, sternness, and disappointed companionship.`;
	}

	/**
	 * Build the user prompt with context
	 * @param {Object} context - Distraction context
	 * @returns {string} User prompt
	 */
	buildUserPrompt(context) {
		const contextString = JSON.stringify(context, null, 2);
		return `Here is the context:\n${contextString}\n\nGenerate the exclamation using this context now.`;
	}
}

export default BedrockService;
