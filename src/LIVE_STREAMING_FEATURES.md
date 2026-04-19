# Live Streaming with Bible + Screen Share System

## Overview
Complete live streaming ecosystem with integrated Bible access, screen sharing, and verse display for viewers.

## Core Features

### 1. **Live Streaming Foundation**
- ✅ Users can start/stop live streams
- ✅ Persistent room IDs for group continuity
- ✅ Viewer count tracking
- ✅ Notifications to followers/friends when user goes live
- ✅ Video + audio recording
- ✅ Stream status management (live → ended → posted)

### 2. **Pre-Stream Setup**
- ✅ Stream title input
- ✅ **Enable Bible Mode** toggle (default: ON)
- ✅ **Enable Screen Share** toggle (default: OFF)
- ✅ Features can be toggled during stream

### 3. **Bible Overlay During Stream** (when enabled)
- ✅ **Live Bible Panel** on right side of broadcast
- ✅ Book/chapter selection
- ✅ Version selector (KJV, NIV, NLT, ESV, NKJV, AMP)
- ✅ Scrollable verse display with verse numbers
- ✅ Click to select verses
- ✅ **Show Verse on Screen** - displays selected verse to viewers
- ✅ **Hide Verse** button to remove from viewers
- ✅ Chapter navigation (prev/next)

### 4. **Verse Display to Viewers**
- ✅ **Live Verse Overlay** - centered modal display
- ✅ Shows: Reference, Full Text, Version
- ✅ Dismiss button for viewers
- ✅ Beautiful backdrop blur effect
- ✅ Only visible when host displays it

### 5. **Screen Sharing** (when enabled)
- ✅ **Share Screen Button** in broadcast controls
- ✅ Toggles between camera and screen
- ✅ Browser screen share API (getDisplayMedia)
- ✅ Fallback to camera when screen sharing stops
- ✅ Error handling + retry
- ✅ Mobile-compatible structure

### 6. **Host Controls During Live**
Location: Bottom and left side of broadcast view
- **Left side (stacked)**:
  - Bible toggle (if enabled)
  - Screen Share toggle (if enabled)
  
- **Bottom center**:
  - Microphone toggle (red when muted)
  - Camera toggle (red when off)
  - **End Live** button

- **Top badges**:
  - LIVE indicator (animated)
  - Viewer count

### 7. **Floating Features**
- FloatingReactions (existing)
- BroadcastSettings (existing)

## Component Structure

### New Components
1. **LiveBiblePanel.jsx** - Interactive Bible for host
   - Book/chapter selection
   - Verse selection
   - Display status indicator
   
2. **LiveVerseOverlay.jsx** - Verse display for viewers
   - Centered modal display
   - Reference + text + version
   - Dismiss button

3. **LiveScreenShare.jsx** - Screen sharing controls
   - Start/stop screen share
   - Stream switching logic
   - Error handling

4. **BibleSetupToggle.jsx** - Pre-stream configuration
   - Toggle Bible mode
   - Toggle screen sharing
   - Reusable for future features

### Updated Components
1. **GoLiveDialog** - Added setup toggles
2. **HostBroadcastView** - Integrated all features
3. **LiveStreams page** - Passes config to stream
4. **LiveStream entity** - Added enable_bible & enable_screen_share fields

## Data Flow

### Starting a Stream
```
User clicks "Go Live"
  ↓
GoLiveDialog shows (Bible & Screen Share toggles)
  ↓
User confirms title + toggles
  ↓
Config sent to backend
  ↓
LiveStream entity created with enable_bible/enable_screen_share
  ↓
HostBroadcastView renders with features enabled/disabled
```

### Displaying a Verse
```
Host opens Bible panel
  ↓
Selects book/chapter/version
  ↓
Clicks a verse to display
  ↓
"Displaying verse X" status shows in Bible panel
  ↓
Verse appears in viewers' screens (LiveVerseOverlay)
  ↓
Viewers can dismiss
  ↓
Host clicks "Hide" to remove from viewers
```

### Screen Sharing
```
Host clicks "Share Screen"
  ↓
Browser permission dialog
  ↓
Screen capture starts
  ↓
Camera feed replaced with screen
  ↓
Host clicks "Stop Sharing"
  ↓
Camera feed restored automatically
```

## Features Not Yet Implemented (Future)
- [ ] Real-time verse sync between host + viewers
- [ ] Highlight verses during stream
- [ ] Save/clip verses from replays
- [ ] Collaborative note-taking
- [ ] Chat message reactions
- [ ] Mobile screen share (iOS/Android native)
- [ ] Audio-only screen share option

## Performance Notes
- Bible loading uses LLM (lightweight)
- Local state only - no real-time sync overhead
- Screen share uses native browser APIs
- Verse overlay is simple HTML/CSS (no heavy animations)

## Mobile Responsiveness
- ✅ Touch-friendly buttons
- ✅ Compact Bible panel
- ✅ Adaptive screen share controls
- ✅ Safe area insets respected

## Security & Permissions
- ✅ Camera/mic permissions requested
- ✅ Screen share permission (browser native)
- ✅ Only host can display verses
- ✅ RLS on LiveStream entity respects ownership