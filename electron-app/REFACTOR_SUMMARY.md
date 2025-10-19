# Distraction Detection Refactor - Summary

## Overview

Successfully refactored the distraction detection system from scattered frontend logic into a clean, modular architecture in the Electron main process. All business logic now lives in the main process with clear separation of concerns.

## What Changed

### New Files Created

1. **`electron/bedrock-service.js`**
   - Amazon Bedrock LLM integration
   - Generates context-aware messages for Dubs
   - Moved from frontend to keep API keys secure

2. **`electron/pushover-service.js`**
   - Push notification service
   - Sends alerts to user's mobile device
   - Uses Node.js `https` module instead of `fetch`

3. **`electron/distraction-manager.js`** ⭐ Core orchestrator
   - Centralized distraction detection logic
   - Manages 10-second timer with OR logic (window OR eye tracking)
   - Hard reset when user refocuses
   - Orchestrates full alert flow:
     1. Request Rekognition data from Python
     2. Gather context (task, window, trigger source)
     3. Call Bedrock for AI-generated message
     4. Generate audio via ElevenLabs
     5. Send push notification if phone detected
     6. Broadcast to frontend

### Modified Files

1. **`electron/elevenlabs-service.js`**
   - Added `generateSpeechFromText(text)` method for custom text-to-speech

2. **`electron/py_interfacer.js`**
   - Fixed `requestData()` to properly handle async responses
   - Added `rekognition_data` event emission
   - Returns Promise that resolves with Rekognition data

3. **`electron/ipc-handlers.js`**
   - Removed direct event forwarding to frontend
   - Now forwards events to DistractionManager instead
   - Simplified handler setup

4. **`electron/preload.js`**
   - Removed old listeners: `onActiveWindowUpdate`, `onVisionFocusUpdate`, etc.
   - Added new unified listener: `onDistractionAlert(callback)`

5. **`electron/main.js`**
   - Initialize all services (Bedrock, Pushover, DistractionManager)
   - Wire DistractionManager to WindowTracker and PythonIPC
   - Register windows with DistractionManager

6. **`src/routes/overlay/+page.svelte`**
   - **Dramatically simplified** (369 lines → 215 lines)
   - Removed all business logic (Bedrock, Pushover, timers, etc.)
   - Now only handles:
     - Listening for `distraction-alert` events
     - Playing animations
     - Displaying AI-generated messages
     - Playing audio

## Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                          │
│                                                           │
│  WindowTracker ──┐                                       │
│                  │                                       │
│  PythonIPC ──────┼──> DistractionManager                │
│                  │     (10s timer, OR logic)             │
│                  │            │                          │
│                  │            ▼ (threshold reached)      │
│                  │     1. Request Rekognition            │
│                  │     2. Gather context                 │
│                  │     3. Bedrock → AI message           │
│                  │     4. ElevenLabs → Audio             │
│                  │     5. Pushover (if phone)            │
│                  │     6. Broadcast to windows           │
│                  │                                       │
└──────────────────┼───────────────────────────────────────┘
                   │
                   ▼ IPC: 'distraction-alert'
┌──────────────────────────────────────────────────────────┐
│                 Renderer Process                         │
│                                                           │
│  Overlay Component:                                      │
│  - Receive alert                                         │
│  - Play animation                                        │
│  - Show AI message                                       │
│  - Play audio                                            │
└──────────────────────────────────────────────────────────┘
```

## Key Benefits

✅ **Security** - API keys stay in main process, not exposed in renderer bundle

✅ **Reliability** - State persists even if overlay window crashes/reloads

✅ **Persistence** - Foundation ready for event logging and analytics

✅ **Scalability** - Easy to add new distraction sources or multiple windows

✅ **Clean Separation** - Business logic (main) vs presentation (renderer)

✅ **Testability** - Each service can be tested independently

## Distraction Detection Logic

### Timer Behavior

- **OR Logic**: Distraction triggered if WindowTracker OR EyeTracker detects distraction
- **Hard Reset**: Timer resets to 0 when user refocuses (requires 10 continuous seconds)
- **Threshold**: 10 seconds (configurable in `DistractionManager.DISTRACTION_THRESHOLD`)
- **Session-aware**: Only tracks when a focus session is active

### Trigger Sources

1. **Window Tracker**: Detects non-productive apps/websites
2. **Eye Tracker**: Detects user looking away (Python OpenCV)

### Alert Package

When threshold is reached, frontend receives:

```javascript
{
  message: "AI-generated message from Dubs",
  audioData: "base64-encoded audio",
  triggerSource: "window_tracker" | "eye_tracker",
  hasPhone: boolean,
  timestamp: number,
  context: {
    session: { taskName, timeElapsed, isActive },
    window: { appName, url, isProductive },
    trigger: { source, windowDistracted, eyeDistracted },
    rekognition: { scene_analysis, face_analysis, ... }
  }
}
```

## Environment Variables Required

Make sure these are in your `.env` file:

```env
# ElevenLabs (voice)
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id

# AWS (Bedrock LLM + Rekognition)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# Pushover (mobile notifications)
PUSHOVER_TOKEN=your_token
PUSHOVER_USER=your_user_key
```

## Testing the Refactor

1. Start the Electron app
2. Start a focus session
3. Trigger distraction (either method):
   - Switch to a distracting app/website (e.g., YouTube)
   - Look away from screen for 10 seconds (if Python vision is running)
4. Observe:
   - Console logs showing the full orchestration flow
   - Dubs waking up and barking
   - AI-generated message in thought bubble
   - Audio playing
   - Push notification (if phone detected in Rekognition)

## Optional: Enable Event Logging

A `DistractionLogger` class is included but not enabled by default. To enable logging:

1. In `electron/main.js`, import the logger:

```javascript
import DistractionLogger from './distraction-logger.js';
```

2. Initialize it in `initializeServices()`:

```javascript
const distractionLogger = new DistractionLogger();
```

3. Pass it to DistractionManager:

```javascript
distractionManager = new DistractionManager({
  pythonIPC,
  sessionManager,
  windowTracker,
  elevenLabsService,
  bedrockService,
  pushoverService,
  logger: distractionLogger  // Add this line
});
```

Logs will be saved to: `{userData}/distraction-logs/YYYY-MM-DD.json`

## Future Enhancements Ready

The new architecture supports:

- **Event Logging**: DistractionLogger ready to use (see above)
- **Analytics Dashboard**: Query logged events with `logger.getDailySummary()`
- **Multiple Windows**: Alerts broadcast to all registered windows
- **Custom Triggers**: Easy to add new distraction sources
- **A/B Testing**: Test different thresholds, messages, etc.

## Migration Notes

### If you have custom code that used old APIs

**Old way (removed):**

```javascript
window.electronAPI.onActiveWindowUpdate((data) => { ... })
window.electronAPI.onVisionFocusUpdate((data) => { ... })
```

**New way:**

```javascript
window.electronAPI.onDistractionAlert((alertPackage) => {
  // alertPackage contains everything you need
})
```

## Rollback (if needed)

If you need to rollback, the old overlay component is available in git history:

```bash
git diff HEAD~1 src/routes/overlay/+page.svelte
```

---

**Refactor completed successfully!** 🎉

All todos completed, no linting errors, and the system is ready for testing.
