# LockInDubs - Electron App

A focus companion app with an animated mascot overlay and activity tracking.

## Features

### Current Implementation (MVP)

- ✅ **Dual Window System**: Dashboard for controls + transparent overlay for Dubs character
- ✅ **Active Window Tracking**: Monitors currently active app on macOS using AppleScript
- ✅ **Focus Session Management**: Pomodoro-style timer with start/stop controls
- ✅ **Dubs Character System**: Animated sprite that reacts to productivity state
  - Sleeping when focused
  - Waking/alert when distracted
  - Barking when prolonged distraction
- ✅ **Activity Monitor**: Real-time display of active apps and productivity classification
- ✅ **Session Stats**: Track elapsed time, focus rate, and distraction count
- ✅ **WebSocket Stub**: Ready for Python vision server integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- macOS (required for window tracking features)

### Installation

```bash
npm install
```

### Running the App

```bash
npm start
```

This will launch two windows:

1. **Dashboard Window**: Main control interface
2. **Overlay Window**: Transparent Dubs character (bottom-right corner)

### Development

The app uses:

- **Electron Forge** for app packaging and development
- **SvelteKit** with Svelte 5 (runes syntax)
- **Vite** for fast builds and HMR

## Usage

1. **Start a Focus Session**:
   - Enter your task name in the dashboard
   - Click "Start Session"
   - The timer will begin and Dubs will start monitoring

2. **Window Tracking**:
   - The app automatically tracks your active window every 2 seconds
   - Apps are classified as "Productive" or "Distraction" (customizable in `main.js`)

3. **Dubs Reactions**:
   - When focused: Dubs sleeps peacefully
   - When distracted: Dubs wakes up and shows alerts
   - Prolonged distraction: Dubs barks to remind you to lock in!

4. **Overlay Controls**:
   - Use the "Hide/Show Overlay" button in the dashboard to toggle Dubs visibility

## Project Structure

```
electron-app/
├── electron/
│   ├── main.js          # Main Electron process (window management, IPC, tracking)
│   └── preload.js       # IPC bridge for renderer security
├── src/
│   ├── lib/
│   │   ├── stores.js    # Svelte 5 state management with runes
│   │   └── websocket.js # WebSocket client stub for Python server
│   └── routes/
│       ├── +page.svelte       # Dashboard UI
│       ├── +layout.svelte     # Global layout
│       └── overlay/
│           └── +page.svelte   # Overlay character UI
└── static/              # Dubs sprite assets (GIFs)
```

## Customization

### Window Classification

Edit the `classifyWindow()` function in `electron/main.js` to customize which apps are considered productive or distracting:

```javascript
const productiveApps = [
 'Code', 'Visual Studio Code', 'Cursor', 'Xcode', 'Terminal', ...
];

const distractingApps = [
 'Messages', 'Discord', 'Slack', 'Instagram', ...
];
```

### Dubs States and Sprites

The character states are managed in `src/lib/stores.js` in the `DubsStore` class:

- `sleeping` → `dubs_sleeping.gif`
- `waking` → `dubs_waking_up.gif`
- `alert` → `dubs_mildly_annoyed.gif`
- `barking` → `dubs_barking_angry.gif`

## Next Steps

### Future Integration

1. **Python Vision Server**:
   - The WebSocket client is ready in `src/lib/websocket.js`
   - Connect to `ws://localhost:8765` (configurable)
   - Expected message format documented in the WebSocket client

2. **AI Reactions** (AWS Bedrock):
   - Integrate contextual AI-generated messages when Dubs reacts
   - Replace static "Lock In!" messages with dynamic motivation

3. **Enhanced Analytics**:
   - Historical session data
   - Focus pattern visualization
   - Weekly/monthly progress reports

4. **Gamification**:
   - Reward system for consistent focus
   - Unlockable Dubs customizations
   - Achievement badges

## Building for Production

```bash
npm run package  # Create distributable package
npm run make     # Create platform-specific installers
```

## Troubleshooting

### Overlay not appearing

- Make sure system permissions allow the app to appear on top of other windows
- Check the "Show/Hide Overlay" toggle in dashboard

### Window tracking not working

- The app requires macOS for AppleScript-based window tracking
- Grant necessary accessibility permissions in System Preferences

### Dubs not reacting

- Ensure a focus session is active
- Check that the active app classification is working (visible in dashboard)

## License

MIT
