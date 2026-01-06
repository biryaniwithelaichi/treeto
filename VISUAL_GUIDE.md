# Visual Component Guide

## Overall Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│                    TOP APP BAR (60px)                      │
│  ┌──────────────────┬────────────────┬────────────────┐   │
│  │ Title + Status   │                │   Settings     │   │
│  │ Treeto [● LIVE]  │                │       ⚙️       │   │
│  └──────────────────┴────────────────┴────────────────┘   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│                   MAIN CONTENT AREA                        │
│                    (Scrollable, 1-3)                       │
│                                                             │
│  State 1 (Idle):                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │                        🎤                             │ │
│  │                   Ready to capture                    │ │
│  │              Start a meeting to begin                │ │
│  │                                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  State 2 (Live Meeting):                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Live Callouts & Actions                              │ │
│  │                                                        │ │
│  │ ┌────────────────────────────────────────────────┐   │ │
│  │ │ 🔶 Forming                                      │   │ │
│  │ │ This is an urgent action item we need to handle │   │ │
│  │ └────────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  State 3 (Post-Meeting):                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Meeting Notes              [Copy Markdown]            │ │
│  │                                                        │ │
│  │ # Project Meeting Notes                              │ │
│  │ December 23, 2025                                     │ │
│  │                                                        │ │
│  │ ## Key Discussion Points                              │ │
│  │ • User requested dark theme                          │ │
│  │ • Implemented with CSS variables                     │ │
│  │ • Zero breaking changes to logic                     │ │
│  │                                                        │ │
│  │ ## Action Items                                       │ │
│  │ ☐ Deploy to production                               │ │
│  │ ☐ Gather user feedback                               │ │
│  │ ☐ Plan next features                                 │ │
│  │                                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                BOTTOM CONTROL BAR (70px)                   │
│  [▶ Start Meeting]  [⏹ End Meeting]  | Audio Level ▮▮▮   │
└────────────────────────────────────────────────────────────┘
```

## Top App Bar Component

```
┌──────────────────────────────────────────────┐
│                                              │
│  Treeto     [● LIVE]                   ⚙️   │
│                                              │
│  Height: 60px                                │
│  Background: --bg-secondary (#161A22)        │
│  Border-bottom: --border-color               │
│                                              │
└──────────────────────────────────────────────┘
```

### Sub-elements

**Title Section:**
```
┌────────────────────────┐
│ Treeto                 │  Font: 18px, bold
│ [● LIVE]               │  Badge: Dynamic text + dot
│                        │  Dot color: Green (recording)
└────────────────────────┘                     │  Dot animation: Pulse
```

**Status Badge:**
```
State: Recording
┌────────────────────────┐
│ ● LIVE                 │  Background: rgba hover
│                        │  Border: --accent-recording
│ Font: 12px, bold       │  Dot: 6px, pulsing
│ Color: --accent-recording
│ Border radius: 20px    │
└────────────────────────┘

State: Paused
┌────────────────────────┐
│ ● PAUSED               │  Background: --bg-hover
│                        │  Border: --border-color
│ Font: 12px, bold       │  Dot: Static, gray
│ Color: --text-tertiary │
│ Border radius: 20px    │
└────────────────────────┘
```

## Main Content Area Components

### Idle State Component

```
┌────────────────────────────────────┐
│                                    │
│                                    │
│           🎤                       │  Icon: 48px emoji
│                                    │
│    Ready to capture                │  Heading: --font-size-lg
│                                    │  Color: --text-secondary
│ Start a meeting to begin recording │  Subtext: --text-tertiary
│                                    │
│                                    │
└────────────────────────────────────┘
```

### Live Meeting State - Callout Card

```
Forming (< 0.7 confidence):
┌────────────────────────────────────┐
│ 🔶 Forming                          │  Border-left: 3px orange
│                                    │  Background: --bg-elevated
│ This is an urgent deadline we       │  Dot: Pulsing orange
│ need to meet tomorrow morning       │  Animation: slideUp 250ms
│                                    │
└────────────────────────────────────┘

Confirmed (>= 0.7 confidence):
┌────────────────────────────────────┐
│ ✓ Confirmed                         │  Border-left: 3px green
│                                    │  Background: --bg-elevated
│ This is an urgent deadline we       │  Dot: Static green
│ need to meet tomorrow morning       │
│                                    │
└────────────────────────────────────┘
```

**Fallback (No callout):**
```
┌────────────────────────────────────┐
│                                    │
│   Listening for callouts…          │  Dashed border
│                                    │  Gray text
│                                    │  Centered
└────────────────────────────────────┘
```

### Post-Meeting State - Notes Display

```
┌────────────────────────────────────────────────┐
│ Meeting Notes              [Copy Markdown]     │
│                                                │
│ # Project Meeting                              │  H1: 24px, bold
│                                                │
│ December 23, 2025                              │
│                                                │
│ ## Agenda                                      │  H2: 16px, bold
│                                                │
│ • User requested dark theme                   │  Bullet: Orange color
│ • Timeline: ASAP                               │  List: Left padding
│ • No breaking changes required                │
│                                                │
│ ## Decisions                                   │
│                                                │
│ • Proceed with CSS variable approach           │
│ • Keep all business logic unchanged            │
│ • Document for future developers               │
│                                                │
│ ## Action Items                                │
│                                                │
│ ☐ Deploy to production                        │  Checkbox: Blue left border
│ ☐ Gather feedback                              │  Item: Interactive checkbox
│ ☐ Plan enhancements                            │
│                                                │
└────────────────────────────────────────────────┘
```

## Bottom Control Bar Component

```
┌────────────────────────────────────────────────┐
│                                                │
│  [▶ Start]  [⏹ Stop]  | Audio Level ▮▮▮░░░░  │
│                                                │
│  Height: 70px                                  │
│  Background: --bg-secondary (#161A22)          │
│  Border-top: --border-color                    │
│  Layout: Flex, space-between                   │
│                                                │
└────────────────────────────────────────────────┘
```

### Button Styles

**Start Button (Idle State):**
```
┌──────────────┐
│ ▶ Start      │  Enabled:
│              │  - Background: --accent-recording (green)
│ padding: sm  │  - Color: white
│ font: bold   │  - Cursor: pointer
│ radius: 8px  │  - Hover: opacity 0.9
└──────────────┘

┌──────────────┐
│ ▶ Start      │  Disabled:
│ (Recording)  │  - Background: --bg-elevated
│              │  - Color: --text-tertiary
│ padding: sm  │  - Cursor: not-allowed
│ font: bold   │  - Opacity: 0.5
│ radius: 8px  │
└──────────────┘
```

**Stop Button (Recording State):**
```
┌──────────────┐
│ ⏹ Stop       │  Enabled:
│              │  - Background: --accent-danger (red)
│ padding: sm  │  - Color: white
│ font: bold   │  - Cursor: pointer
│ radius: 8px  │  - Hover: opacity 0.9
└──────────────┘

┌──────────────┐
│ ⏹ Stop       │  Disabled:
│ (Idle)       │  - Background: --bg-elevated
│              │  - Color: --text-tertiary
│ padding: sm  │  - Cursor: not-allowed
│ font: bold   │  - Opacity: 0.5
│ radius: 8px  │
└──────────────┘
```

### Audio Level Indicator

```
┌────────────────────────────────┐
│ Audio Level | ▮▮▮▮░░░░░░░░░░░  │
│                                │
│ Label: 12px, --text-tertiary   │
│ Bar container: 200px max        │
│ Bar fill: Variable width        │
│ Bar color: --accent-recording   │
│ Bar height: 4px                │
│ Update: 100ms                  │
│                                │
└────────────────────────────────┘
```

## Color Application Examples

### Example 1: Card Surface
```
Background Color:    var(--bg-elevated)   #1C2230
Text Color:          var(--text-primary)  #E6E9EF
Border Color:        var(--border-color)  #2A2F38
Accent Left Border:  var(--accent-action) #3B82F6

Result: Clean, readable card with professional appearance
```

### Example 2: Live Indicator
```
Badge Background:    var(--bg-hover)        #2A2F38
Badge Border:        var(--accent-recording) #22C55E
Dot Color:           var(--accent-recording) #22C55E
Dot Animation:       pulse 2s infinite

Result: Clear, active recording indicator with visual feedback
```

### Example 3: Typography Hierarchy
```
Page Title:     var(--font-size-xl)    18px, bold
Section Head:   var(--font-size-lg)    16px, bold
Subsection:     var(--font-size-md)    14px, 600
Body Text:      var(--font-size-base)  13px, normal
Small Text:     var(--font-size-sm)    12px, normal
```

## Responsive Considerations

### Desktop (Current)
```
┌──────────────────────────────┐
│        Top Bar (60px)        │
├──────────────────────────────┤
│     Main Content (flex)      │
│                              │
├──────────────────────────────┤
│    Bottom Bar (70px)         │
└──────────────────────────────┘
```

### Mobile (Future Enhancement)
```
┌──────────────┐
│  Top (48px)  │
├──────────────┤
│   Content    │
│   (scroll)   │
├──────────────┤
│Bottom (60px) │
└──────────────┘
```

## Spacing Visualization

```
Padding Grid (4px base):

xs  ▯ 4px      Used for: Small gaps, icon spacing
sm  ▯▯ 8px     Used for: Input padding, badge spacing
md  ▯▯▯ 12px   Used for: Normal padding, list gaps
lg  ▯▯▯▯ 16px  Used for: Card padding, section spacing
xl  ▯▯▯▯▯▯ 24px Used for: Main section padding
2xl ▯▯▯▯▯▯▯▯ 32px Used for: Header/footer padding
```

## Animation Timeline

```
Callout Card Entrance:
Time  0ms    100ms   250ms
      │        │       │
fade  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ ✓ (slideUp)
      0%     50%    100%
      opacity, translateY

Button Hover:
      ▁▁▁▁ (instant)
      press  release
      0→0.9→1.0
```

---

**Design System Version 1.0** - Production Ready
