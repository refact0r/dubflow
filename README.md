<h1>
  Dubflow
</h1>

<img src="https://github.com/user-attachments/assets/8091cfc0-231b-4c55-996c-f16242e3d2b5" width="200" align="right">

<hp align="center">A focus companion app that helps you stay productive through AI-driven feedback and real-time distraction detection. Meet Dubs, your animated desktop companion that monitors your focus and keeps you on task.</p>

<br>
<br>
<img width="3024" height="1826" alt="image" src="https://github.com/user-attachments/assets/1ad3baa7-a755-4d6b-a46a-1be0c69513bc" />


## Features

- **Focus Tracking** - Webcam-based attention monitoring using OpenCV and AWS Rekognition
- **Activity Monitoring** - Detects productive vs. distracting windows and applications
- **Animated Overlay** - Dubs reacts to your focus behavior with contextual animations
- **Pomodoro Sessions** - Timed focus sessions with progress tracking and rewards
- **Analytics Dashboard** - Visualize focus patterns, session summaries, and productivity metrics
- **AI Speech Interactions** - Contextual, motivational feedback powered by AI

## Tech Stack

### Frontend

- Electron + SvelteKit (Svelte 5)

### Backend

- Python with OpenCV for face/eye tracking
- AWS Rekognition for scene analysis
- AWS Bedrock for AI-generated speech
- ElevenLabs for speech synthesis
- Pushover for mobile notifications
- TCP socket server for real-time communication
- Node `get-windows` for active window detection

## Project Structure

```
/electron-app/       # Main Electron + SvelteKit application
  /electron/         # Electron core logic (main process, IPC, window tracking)
  /src/              # SvelteKit frontend
    /lib/            # Frontend stores and logic
    /routes/         # Frontend routes/pages
  /static/           # Dubs animation GIFs and assets

/local/              # Python vision system (focus detection, webcam monitoring)
```

---

Built for DubHacks 2025
