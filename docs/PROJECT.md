# Nudge - Project Context & Development Rules

## Objective

Build Nudge - a focus companion app that helps users stay productive using AI-driven feedback, webcam and activity monitoring, and a virtual pet overlay. The app should detect when a user is distracted, react in real-time through an animated character, and reward consistent focus through gamified elements.

## Core Concept

Nudge features "Dubs," (Dubs is the UW mascot) an intelligent, animated dog that sits as an overlay on the user's desktop. Dubs monitors focus behavior and encourages the user to stay on task.

**States:**

Dubs reacts to user focus behavior through various animated states (currently being refined).

## Product Vision

Create a fun, motivational companion that merges accountability, humor, and data-driven insight. The app mimics the positive influence of a study partner - pushing users to achieve flow states.

## Key Features

### 1. Webcam Focus Tracking

- Detect face/eye direction using the webcam to estimate user attention
- Optionally detect presence of distractions (e.g., looking at phone)

### 2. Active Window / Tab Tracking

- Detect the user's active OS window or browser tab
- Mark as on-task or off-task based on goal context or predefined categories

### 3. Overlay Character System

- Always-on animated character (Dubs) rendered on screen
- Multiple animated states that react to user focus behavior

### 4. AI Interaction

- Use a local or cloud AI model to generate contextual, witty, motivational reactions
- Customize tone/personality (e.g., playful, sarcastic, encouraging)

### 5. Pomodoro & Goal Management

- User sets a timed session (e.g., 30 minutes) and task name
- System tracks focus consistency during that period
- On completion, if focus threshold met, user earns rewards for Dubs

### 6. Dashboard & Analytics

- Display timeline of distractions, focus percentage, and session summaries
- Visualize progress over time with simple graphs or badges
- Manage rewards and Dubs' customizations

## Technical Stack

### Frontend

- **Platform**: Electron (for overlay + dashboard) with Vite. Target macOS.
- **Framework**: SvelteKit and Svelte 5
- **Overlay**: GIF-based animated sprite system

### ML/Tracking

- **Focus Detection:** Python with OpenCV for face/eye tracking
- **Scene Analysis:** AWS Rekognition for webcam video analysis
- **System Access:** Node get-windows for active window tracking

### Backend

- **Python Server**: TCP socket server for real-time communication between Python vision system and Electron app

## Project Structure

### `/local/` - Python Vision System

The Python backend handles all webcam-based monitoring:

- `main.py` - Main event loop and entry point. Manages camera capture, focus detection pipeline, and coordinates all components
- `focus_detector_opencv.py` - OpenCV-based focus detection using face landmarks and eye aspect ratio (EAR)
- `focus_detector.py` - Base focus detector interface/abstract class
- `aws_rekognition.py` - AWS Rekognition integration for scene analysis and context detection
- `tcp_communication.py` - TCP socket server that sends focus events to Electron app
- `ipc_communication.py` - IPC communication utilities
- `config.py` - Configuration settings (frame rates, thresholds, camera settings, etc.)
- `setup.py` - Setup and installation script
- `requirements.txt` - Python dependencies

### `/electron-app/` - Main Application

The Electron + SvelteKit application.

#### `/electron-app/electron/` - Electron Core Logic

Non-frontend application logic:

- `main.js` - Main Electron process, window management and app lifecycle
- `py_interfacer.js` - Manages Python process spawning and IPC communication with Python backend
- `ipc-handlers.js` - IPC handlers for renderer-to-main communication
- `preload.js` - Preload script for secure IPC exposure to renderer
- `window-tracker.js` - Active window detection using `get-windows`, classifies productive vs. distracting apps/sites
- `session-manager.js` - Focus session state management and lifecycle (start/stop sessions, track metrics)
- `focus-config.js` - Configuration for productive/distracting apps and websites classification

#### `/electron-app/src/` - SvelteKit Frontend

Standard SvelteKit structure:

- `/routes/+layout.svelte` - Root layout for the app
- `/routes/+page.svelte` - Main dashboard page
- `/routes/overlay/+page.svelte` - Dubs overlay window (transparent, always-on-top)
- `/routes/settings/+page.svelte` - Settings page
- `/lib/stores/` - Svelte 5 stores for state management (using runes)
- `/lib/websocket.js` - WebSocket client class (placeholder for future Python vision server integration)

#### `/electron-app/static/` - Assets

Dubs animation GIFs.
