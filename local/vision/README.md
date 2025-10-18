# LockInDubs Vision System

The Python computer vision component for LockInDubs, responsible for real-time focus detection and communication with the Electron frontend.

## Overview

This module implements the core focus detection pipeline that:
- Captures video frames from the webcam at ~20 FPS
- Analyzes user focus using OpenCV and MediaPipe
- Integrates with AWS Rekognition for context enrichment
- Communicates focus state changes to the Electron frontend via ZeroMQ
- Implements debouncing logic to prevent false triggers

## Architecture

### Core Components

1. **FocusDetector** (`focus_detector.py`)
   - Implements the main `isUserFocused()` function
   - Uses MediaPipe for facial landmark detection
   - Analyzes eye aspect ratio, head pose, and gaze direction
   - Provides debug visualization capabilities

2. **RekognitionAnalyzer** (`aws_rekognition.py`)
   - Integrates with AWS Rekognition for scene analysis
   - Detects objects and faces in the environment
   - Provides context enrichment for focus events
   - Handles API throttling and error management

3. **IPCCommunicator** (`ipc_communication.py`)
   - Manages communication with Electron frontend
   - Creates properly formatted JSON events
   - Uses ZeroMQ for reliable message passing
   - Handles heartbeat and event transmission

4. **LockInDubsVision** (`main.py`)
   - Main event loop and state management
   - Implements the consecutive frame debouncing logic
   - Coordinates all components
   - Handles graceful shutdown and statistics

### Configuration

The system is configured via environment variables (see `env_template.txt`):

- **Camera Settings**: Camera index, frame rate, thresholds
- **AWS Settings**: Access keys, region for Rekognition
- **Debug Settings**: Video feed display, debug mode
- **IPC Settings**: Communication port

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp env_template.txt .env
# Edit .env with your AWS credentials and preferences
```

3. Run the vision system:
```bash
python main.py
```

## Usage

### Running the Main System

```bash
python main.py
```

The system will:
- Initialize the camera and all components
- Start the main event loop
- Display debug video feed (if enabled)
- Send focus events to Electron frontend
- Print session statistics on shutdown

### Testing Individual Components

```bash
python test_vision.py
```

This provides a test suite for:
- Camera functionality
- Focus detection
- AWS Rekognition integration

## Focus Detection Algorithm

The system determines user focus based on multiple factors:

1. **Face Detection**: Ensures user is present and facing camera
2. **Eye Aspect Ratio (EAR)**: Detects eye closure (blinking/sleeping)
3. **Head Pose**: Monitors head orientation and turning away
4. **Gaze Direction**: Tracks eye movement and attention direction

### State Management

The system maintains:
- `userFocusState`: Current boolean focus state
- `consecutiveFrames`: Counter for state change confirmation
- `consecutiveFramesThreshold`: Frames required for state change

### Event Flow

1. **Frame Capture**: Continuous video capture at configured FPS
2. **Focus Analysis**: Process frame through focus detection pipeline
3. **State Evaluation**: Compare current result with previous state
4. **Debouncing**: Require consecutive frames to confirm state change
5. **Event Generation**: Create JSON event for state transitions
6. **IPC Communication**: Send event to Electron frontend

## JSON Event Format

Events sent to Electron follow this structure:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "event": "user_focused|user_unfocused",
  "context": {
    "opencv_data": {
      "face_detected": true,
      "eye_aspect_ratio": 0.35,
      "head_pose": [0.0, 5.2, 0.0],
      "gaze_direction": [0.1, -0.05],
      "confidence": 0.85
    },
    "rekognition_data": {
      "available": true,
      "labels": [...],
      "distraction_objects": [...],
      "distraction_level": "low"
    },
    "focus_metrics": {...},
    "session_info": {...}
  }
}
```

## Debug Features

- **Video Feed**: Real-time display of focus detection results
- **Debug Mode**: Verbose logging and frame saving
- **Statistics**: Session metrics and performance data
- **Test Suite**: Individual component testing

## Performance Considerations

- **Frame Rate**: Configurable FPS (default 20) balances accuracy and performance
- **API Throttling**: AWS Rekognition calls limited to prevent excessive usage
- **Memory Management**: Efficient frame processing and cleanup
- **Error Handling**: Graceful degradation when components fail

## Troubleshooting

### Common Issues

1. **Camera Not Found**: Check camera index in configuration
2. **AWS Errors**: Verify credentials and region settings
3. **IPC Connection**: Ensure port is available and Electron is listening
4. **Performance**: Adjust frame rate and thresholds for your system

### Debug Mode

Enable debug mode in configuration to get:
- Detailed logging
- Video feed display
- Frame saving capabilities
- Performance metrics

## Future Enhancements

- Emotion detection integration
- Multi-face support
- Advanced gaze tracking
- Machine learning model improvements
- Real-time performance optimization
