# Python Vision Server Integration Guide

This document explains how to integrate the Python-based webcam tracking server with the LockInDubs Electron app.

## Architecture Overview

```
┌─────────────────────┐         WebSocket          ┌──────────────────────┐
│  Python Vision      │◄────────────────────────────►│  Electron App        │
│  Server (OpenCV)    │     ws://localhost:8765      │  (Dashboard/Overlay) │
└─────────────────────┘                              └──────────────────────┘
         │                                                      │
         ├─ Face Detection                                     ├─ Window Tracking
         ├─ Eye Tracking                                       ├─ Session Management
         ├─ Attention Estimation                              ├─ Dubs Animation
         └─ Distraction Detection                             └─ Stats Display
```

## WebSocket Message Protocol

### Message Format

All messages are JSON objects with the following structure:

```json
{
  "type": "message_type",
  "data": { /* message-specific data */ }
}
```

### Message Types from Python → Electron

#### 1. Focus Update

Sent continuously (every 1-2 seconds) with the current focus state:

```json
{
  "type": "focus_update",
  "data": {
    "isFocused": true,
    "confidence": 0.95,
    "faceDetected": true,
    "eyesOnScreen": true,
    "timestamp": 1697654321000
  }
}
```

**Fields:**

- `isFocused` (boolean): Overall assessment of user focus
- `confidence` (number, 0-1): Confidence level of the assessment
- `faceDetected` (boolean): Whether a face is detected in frame
- `eyesOnScreen` (boolean): Whether eyes are directed at screen
- `timestamp` (number): Unix timestamp in milliseconds

#### 2. Distraction Detected

Sent when user attention shifts away:

```json
{
  "type": "distraction_detected",
  "data": {
    "reason": "eyes_away",
    "duration": 3000,
    "confidence": 0.87,
    "timestamp": 1697654321000
  }
}
```

**Reasons:**

- `eyes_away`: User looking away from screen
- `phone_detected`: Phone detected in frame
- `no_face`: Face not detected for extended period
- `multiple_faces`: Multiple people detected

#### 3. Focus Restored

Sent when user returns attention to screen:

```json
{
  "type": "focus_restored",
  "data": {
    "distractionDuration": 5000,
    "timestamp": 1697654326000
  }
}
```

#### 4. No Presence

Sent when no face detected for extended period (e.g., 30+ seconds):

```json
{
  "type": "no_presence",
  "data": {
    "duration": 35000,
    "timestamp": 1697654350000
  }
}
```

### Message Types from Electron → Python

#### 1. Session Control

```json
{
  "type": "session_start",
  "data": {
    "taskName": "Working on project",
    "timestamp": 1697654321000
  }
}
```

```json
{
  "type": "session_stop",
  "data": {
    "timestamp": 1697656321000
  }
}
```

#### 2. Configuration

```json
{
  "type": "config_update",
  "data": {
    "sensitivity": 0.7,
    "distractionThreshold": 3,
    "updateInterval": 1000
  }
}
```

## Integration Steps

### 1. Python Server Setup

Create a WebSocket server on the Python side:

```python
import asyncio
import websockets
import json

async def handle_client(websocket, path):
    print("Client connected")
    
    try:
        # Send periodic focus updates
        while True:
            focus_data = {
                "type": "focus_update",
                "data": {
                    "isFocused": detect_focus(),  # Your OpenCV logic
                    "confidence": calculate_confidence(),
                    "faceDetected": is_face_detected(),
                    "eyesOnScreen": are_eyes_on_screen(),
                    "timestamp": int(time.time() * 1000)
                }
            }
            
            await websocket.send(json.dumps(focus_data))
            await asyncio.sleep(1)  # Update every second
            
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")

async def main():
    server = await websockets.serve(handle_client, "localhost", 8765)
    print("Vision server running on ws://localhost:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
```

### 2. Electron App Integration

The WebSocket client is already implemented in `src/lib/websocket.js`. To use it:

```javascript
// In your Svelte component
import { visionSocket } from '$lib/websocket';
import { onMount } from 'svelte';

onMount(() => {
  // Connect to Python server
  visionSocket.connect();
  
  // Listen for focus updates
  visionSocket.on('focusUpdate', (data) => {
    console.log('Focus state:', data.isFocused);
    // Update your app state
  });
  
  visionSocket.on('distractionDetected', (data) => {
    console.log('Distraction:', data.reason);
    // Trigger Dubs reaction
  });
  
  // Cleanup
  return () => {
    visionSocket.disconnect();
  };
});
```

### 3. Combining with Window Tracking

You can combine vision-based focus detection with window tracking for more accurate results:

```javascript
// In stores.js or a new integration module
class FocusDetector {
  constructor() {
    this.visionFocused = true;
    this.windowFocused = true;
  }
  
  get overallFocus() {
    // User must be both looking at screen AND on productive app
    return this.visionFocused && this.windowFocused;
  }
  
  updateVisionFocus(isFocused) {
    this.visionFocused = isFocused;
    this.updateDubsState();
  }
  
  updateWindowFocus(isProductive) {
    this.windowFocused = isProductive;
    this.updateDubsState();
  }
  
  updateDubsState() {
    if (this.overallFocus) {
      dubsStore.setState('sleeping');
    } else {
      dubsStore.setState('alert');
    }
  }
}
```

## Testing Without Python Server

The app will work without the vision server connected. You can test the integration by:

1. Running a simple test server:

```python
# test_server.py
import asyncio
import websockets
import json
import time

async def test_server(websocket, path):
    while True:
        # Simulate alternating focus states
        is_focused = (int(time.time()) % 20) < 10
        
        message = {
            "type": "focus_update",
            "data": {
                "isFocused": is_focused,
                "confidence": 0.9,
                "faceDetected": True,
                "eyesOnScreen": is_focused,
                "timestamp": int(time.time() * 1000)
            }
        }
        
        await websocket.send(json.dumps(message))
        await asyncio.sleep(1)

asyncio.get_event_loop().run_until_complete(
    websockets.serve(test_server, "localhost", 8765)
)
asyncio.get_event_loop().run_forever()
```

2. Run: `python test_server.py`
3. The Electron app will automatically connect and show focus updates

## Recommended Python Libraries

For the vision server implementation:

```
opencv-python>=4.8.0
mediapipe>=0.10.0        # Face and eye detection
websockets>=11.0
numpy>=1.24.0
```

## Performance Considerations

1. **Update Frequency**: Send focus updates every 1-2 seconds (not faster)
2. **Image Processing**: Run OpenCV processing in separate thread/process
3. **Connection Recovery**: The Electron app auto-reconnects every 5 seconds if disconnected
4. **Bandwidth**: Keep messages small (<1KB) - don't send image data

## Security Notes

- Currently configured for localhost only (`ws://localhost:8765`)
- For production, consider adding authentication
- The Electron preload script limits what the renderer can access
- All IPC communication is type-checked

## Debugging

Enable WebSocket logging in the browser console:

```javascript
// In your component
visionSocket.on('connected', () => console.log('✅ Connected to vision server'));
visionSocket.on('disconnected', () => console.log('❌ Disconnected'));
visionSocket.on('error', (err) => console.error('WebSocket error:', err));
```

## Next Steps

1. Implement OpenCV face/eye detection in Python
2. Set up WebSocket server with the protocol above
3. Test with the Electron app
4. Tune sensitivity and thresholds
5. Add configuration UI in the Electron dashboard
