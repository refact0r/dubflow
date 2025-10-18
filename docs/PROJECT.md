# LockInDubs - Project Context & Development Rules

## Objective

Build LockInDubs - a focus companion app that helps users stay productive using AI-driven feedback, webcam and activity monitoring, and a virtual pet overlay. The app should detect when a user is distracted, react in real-time through an animated character, and reward consistent focus through gamified elements.

## Core Concept

LockInDubs features "Dubs," (Dubs is the UW mascot) an intelligent, animated dog that sits as an overlay on the user's desktop. Dubs monitors focus behavior and encourages the user to stay on task.

**States:**

- **When focused** -> Dubs sleeps or idles peacefully
- **When distracted** -> Dubs wakes up, reacts, and delivers a witty AI-generated reminder to "lock back in"
- **When goals are met** -> User can feed or reward Dubs, unlocking treats, decorations, and tokens
- Other states TBD

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
- **States:**
  - Sleeping (focused)
  - Alert (noticing distraction)
  - Reacting (AI message / animation)
- Overlay should have a transparent background and minimal performance impact

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
- **Overlay**: Pixel art animated sprite system

### ML/Tracking

- **Focus Detection:** OpenCV for face and eye tracking.
- **System Access:** OS APIs for active window tracking.

### Backend

TBD
