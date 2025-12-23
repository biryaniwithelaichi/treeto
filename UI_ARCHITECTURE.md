# Treeto UI Architecture

## Overview

The Treeto UI has been refactored to a production-grade dark theme inspired by modern note-taking applications. The design emphasizes clarity, minimal visual noise, and smooth interactions.

## Theme System

### CSS Variables (`src/theme.css`)

The entire color palette, typography, spacing, and animations are defined via CSS custom properties:

**Colors:**
- `--bg-primary`: #0F1115 (main background)
- `--bg-secondary`: #161A22 (panels and surfaces)
- `--bg-elevated`: #1C2230 (elevated UI elements)
- `--bg-hover`: #2A2F38 (hover state)
- `--text-primary`: #E6E9EF (primary text)
- `--text-secondary`: #9AA4B2 (secondary text)
- `--text-tertiary`: #6E7681 (tertiary text)

**Accents:**
- `--accent-recording`: #22C55E (recording/active state)
- `--accent-callout`: #F59E0B (callout highlight)
- `--accent-action`: #3B82F6 (action items)
- `--accent-danger`: #EF4444 (error/stop)

**Typography:**
- Font family: System font stack (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
- Font sizes: From --font-size-xs (11px) to --font-size-2xl (24px)
- Line heights: tight (1.4), normal (1.6), relaxed (1.8)

**Spacing:**
- Consistent grid: --spacing-xs (4px) through --spacing-2xl (32px)
- Used for padding, margins, and gaps

**Animations:**
- `fadeIn`: 0-250ms opacity + vertical shift
- `slideUp`: 250ms vertical animation
- `pulse`: 2s infinite pulsing (for live indicators)

## Layout Structure

### 1. Top App Bar
- Height: 60px
- Background: --bg-secondary
- Contains:
  - **Left**: App title (Treeto) + Mic status badge (LIVE/PAUSED)
  - **Right**: Settings icon (currently placeholder)
- Mic badge shows:
  - Animated green dot with pulse when recording
  - Static gray dot when paused
  - Border color indicates state

### 2. Main Content Area
- Scrollable central panel with flexible layout based on meeting state
- **Three states:**

#### Idle State (No meeting)
- Centered prompt with microphone icon
- "Ready to capture" message
- Encourages user to start a meeting

#### Live Meeting State
- **Live Callouts & Actions** heading
- Active callout card (if any):
  - Orange border/dot if forming (partial confidence)
  - Green border/dot if confirmed (final)
  - Shows callout text
  - Auto-dismisses after 5 seconds
- Fallback: "Listening for callouts…" placeholder
- Action items populated after meeting ends

#### Post-Meeting State
- **Meeting Notes** heading with "Copy Markdown" button
- Rendered markdown with semantic HTML:
  - H1/H2 with proper typography
  - Lists with bullet points and accent colors
  - Checkboxes for action items with left border accent
- Max width: 800px for readability

### 3. Bottom Control Bar
- Height: 70px
- Background: --bg-secondary
- Flexbox layout with space-between
- Contains:
  - **Left**: Start/Stop buttons
    - Start: Green (--accent-recording) when idle
    - Disabled and gray when meeting is live
    - Stop: Red (--accent-danger) when meeting is live
    - Disabled and gray when idle
  - **Right**: Audio level indicator
    - Label + animated progress bar
    - Shows 45% (placeholder, not live RMS)
    - Accent green color

## Component Organization

### State Management
- `App.tsx` manages all state:
  - `micRunning`: Boolean tracking recording state
  - `meetingResult`: Final result with notes and action items
  - `activeCallout`: Current callout with partial flag
- All refs remain unchanged (chunker, detector, builder, etc.)

### UI State Flow
```
Start Meeting → Live State (callouts, forming actions)
                   ↓
            End Meeting → Post-Meeting State (notes)
                              ↓
                        Copy/Export Notes
```

### Callback Integration
All existing business logic callbacks are preserved:
- ASR results → callout detection → badge update
- Meeting end → note generation → display
- Callout detection → auto-dismiss timeout

## Typography

- **Headlines**: H1 (24px, bold) for section titles, H3 (14px) for subsections
- **Body**: 13px base, 1.6 line height
- **Note details**: Line height 1.8 for relaxed reading
- **System font stack**: Ensures native feel on macOS/Windows/Linux

## Interaction Patterns

### Buttons
- Rounded corners (8px)
- Smooth opacity transitions (150ms)
- Hover state: opacity 0.9
- Disabled state: opacity 0.5, cursor not-allowed
- Font weight: 600 (semibold)

### Cards & Panels
- Background: --bg-elevated or --bg-secondary
- Subtle borders: --border-color (only when needed)
- Soft shadows: No drop shadows (minimal elevation)
- Border radius: 6-8px

### Callout Cards
- Prominent left/top border with accent color
- Pulsing indicator dot for forming state
- Animated entry (slideUp 250ms)
- Text-based, no raw metrics displayed

## Accessibility

- Dark theme reduces eye strain in low-light environments
- High contrast text ratios (#E6E9EF on #0F1115)
- Large touch targets for buttons (min 44px)
- Clear visual states (hover, active, disabled)
- System fonts for OS-native rendering

## Performance Optimizations

- CSS variables for dynamic theming (single update point)
- Minimal DOM complexity
- CSS animations prefer GPU (transform, opacity)
- No layout shift animations (use opacity/transform only)
- Efficient re-renders (state updates only when necessary)

## Customization

To customize colors, update CSS variables in `theme.css`:

```css
:root {
  --bg-primary: #0f1115; /* Change main background */
  --accent-recording: #22c55e; /* Change recording color */
  /* etc. */
}
```

## Business Logic Separation

✅ **Preserved & Unchanged:**
- Audio capture pipeline
- PCM chunking and resampling
- Silence detection and segmentation
- ASR providers (Mock, Deepgram batch, Deepgram streaming)
- Callout detection algorithms
- Action item extraction
- Notes generation

🎨 **Refactored:**
- Layout and component structure
- Color scheme and visual hierarchy
- Typography and spacing
- Animation and transitions
- Button styling
- Card and panel designs

## Future Enhancements

Potential improvements without breaking current design:
- Settings panel for theme customization
- Export options (PDF, Word, JSON)
- Search/filter within notes
- Speaker identification badges
- Confidence score visualization
- Meeting duration and transcript preview
- Dark/light theme toggle (infrastructure ready)
