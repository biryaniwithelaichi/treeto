# Implementation Guide for Dark Theme UI

## Overview

This guide explains how to understand and extend the new dark theme UI without breaking existing business logic.

## File Organization

```
src/
├── App.tsx                 # Main component with new dark theme UI
├── theme.css              # CSS variables and global styles
├── main.tsx               # Entry point (unchanged)
├── vite-env.d.ts         # Type definitions (unchanged)
│
├── useMicStream.ts        # Mic capture hook (unchanged)
├── pcmChunker.ts          # PCM buffering (unchanged)
├── silenceDetector.ts     # Speech/silence classification (unchanged)
├── segmentBuilder.ts      # Speech grouping (unchanged)
├── noiseEstimator.ts      # Noise floor tracking (unchanged)
├── meetingManager.ts      # Meeting lifecycle (unchanged)
│
├── asr/                   # ASR providers (unchanged)
│   ├── types.ts
│   ├── asrManager.ts
│   └── providers/
│       ├── mockASR.ts
│       ├── deepgramASR.ts
│       └── deepgramStreamingASR.ts
│
├── callouts/              # Callout detection (unchanged)
│   └── calloutDetector.ts
│
├── actions/               # Action extraction (unchanged)
│   └── actionItemExtractor.ts
│
└── notes/                 # Notes generation (unchanged)
    └── notesBuilder.ts
```

## App.tsx Structure

### 1. Imports & Setup
```typescript
import "./theme.css";  // IMPORTANT: Load theme first
```

### 2. State Variables (Minimal)
```typescript
const [micRunning, setMicRunning] = useState(false);
const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null);
const [activeCallout, setActiveCallout] = useState<Callout | null>(null);
```

Only state needed for UI rendering. All processing state lives in refs.

### 3. Refs (All Unchanged)
```typescript
const chunkerRef = useRef<PcmChunker | null>(null);
const detectorRef = useRef<SilenceDetector | null>(null);
const builderRef = useRef<SegmentBuilder | null>(null);
// ... etc
```

### 4. Handlers (Simplified)
```typescript
const handleStart = () => {
  // Only updates UI state and wires up callbacks
  // All audio processing happens in refs
};

const handleStop = () => {
  // Finalizes pending segment
  // Triggers meeting end flow
};
```

### 5. Render (Dark Theme)
```typescript
return (
  <div style={{
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "var(--bg-primary)",  // Use CSS variable
    color: "var(--text-primary)",
    fontFamily: "var(--font-family)",
    // ...
  }}>
    {/* Top Bar */}
    {/* Main Content */}
    {/* Bottom Bar */}
  </div>
);
```

## Adding New Features

### Example: Add Settings Panel

1. **Create component** (`src/components/SettingsPanel.tsx`):
```typescript
export function SettingsPanel() {
  return (
    <div style={{
      backgroundColor: "var(--bg-secondary)",
      color: "var(--text-primary)",
      padding: "var(--spacing-lg)",
      borderRadius: "8px"
    }}>
      {/* Settings UI */}
    </div>
  );
}
```

2. **Add to App.tsx**:
```typescript
const [showSettings, setShowSettings] = useState(false);

return (
  <div>
    {/* ... existing UI ... */}
    {showSettings && <SettingsPanel />}
  </div>
);
```

3. **Use theme variables**:
Always reference CSS variables, never hardcode colors.

### Example: Change Accent Color

1. **Update theme.css**:
```css
:root {
  --accent-recording: #3b82f6;  /* Change from green to blue */
}
```

2. **That's it!** All components using `--accent-recording` update automatically.

## Styling Guidelines

### ✅ DO: Use CSS Variables
```typescript
<div style={{
  backgroundColor: "var(--bg-elevated)",
  color: "var(--text-primary)",
  padding: "var(--spacing-lg)"
}}>
```

### ❌ DON'T: Hardcode Colors
```typescript
<div style={{
  backgroundColor: "#1C2230",      // Bad
  color: "#E6E9EF",                // Bad
  padding: "16px"                  // Bad - use spacing variable
}}>
```

### ✅ DO: Use Semantic Spacing
```typescript
margin: "var(--spacing-lg)",      // 16px
padding: "var(--spacing-md)",     // 12px
gap: "var(--spacing-sm)"          // 8px
```

### ❌ DON'T: Use Pixel Values
```typescript
margin: "16px",    // Wrong - should use variable
padding: 12,       // Wrong - string or variable
gap: 8             // Wrong - not even a string
```

### ✅ DO: Use Typography Variables
```typescript
fontSize: "var(--font-size-lg)",      // 16px
fontFamily: "var(--font-family)",     // System font
lineHeight: "var(--line-height-normal)" // 1.6
```

### ❌ DON'T: Hardcode Typography
```typescript
fontSize: "16px",                 // Wrong
fontFamily: "Arial",              // Wrong
lineHeight: "1.6",                // Use variable
```

### ✅ DO: Use Animation Timings
```typescript
transition: "all var(--transition-fast)"  // 150ms
animation: "fadeIn var(--transition-base)" // 250ms
```

## Common Patterns

### Button Style (Primary Action)
```typescript
<button style={{
  backgroundColor: "var(--accent-recording)",
  color: "white",
  padding: "var(--spacing-md) var(--spacing-lg)",
  borderRadius: "8px",
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all var(--transition-fast)"
}}>
  Start
</button>
```

### Card Style
```typescript
<div style={{
  backgroundColor: "var(--bg-elevated)",
  padding: "var(--spacing-lg)",
  borderRadius: "8px",
  border: "1px solid var(--border-color)",
  marginBottom: "var(--spacing-lg)"
}}>
  {/* Content */}
</div>
```

### Callout Card (Highlighted)
```typescript
<div style={{
  backgroundColor: "var(--bg-elevated)",
  borderLeft: "3px solid var(--accent-callout)",
  padding: "var(--spacing-lg)",
  borderRadius: "6px",
  animation: "slideUp var(--transition-base)"
}}>
  {/* Callout text */}
</div>
```

### Text Hierarchy
```typescript
<h1 style={{
  fontSize: "var(--font-size-2xl)",
  fontWeight: 700,
  margin: "0 0 var(--spacing-lg) 0",
  color: "var(--text-primary)"
}}>
  Main Heading
</h1>

<h3 style={{
  fontSize: "var(--font-size-md)",
  fontWeight: 600,
  margin: "var(--spacing-lg) 0 var(--spacing-md) 0",
  color: "var(--text-primary)"
}}>
  Subheading
</h3>

<p style={{
  fontSize: "var(--font-size-base)",
  lineHeight: "var(--line-height-normal)",
  color: "var(--text-secondary)",
  margin: "0"
}}>
  Body text
</p>
```

## Testing the Theme

### Visual Testing
1. Open http://localhost:3000
2. Start a meeting
3. Verify:
   - Dark background is not pure black (should be #0F1115)
   - Text is readable (high contrast)
   - Status badge shows LIVE with green indicator
   - Callout card appears with orange border when callout detected
   - Bottom bar has functional buttons

### Color Contrast
Run accessibility checks:
```bash
# Using a tool like axe DevTools
# All text should meet WCAG AA standard (4.5:1 ratio)
```

### Animation Smoothness
- Callout entry: Should be smooth 250ms slide up
- Button hover: Should be instant opacity change
- Status pulse: Should pulse at 2 second interval
- No jank or layout shift

## Extending the Theme

### Add a New Accent Color
1. **In theme.css**:
```css
--accent-secondary: #06B6D4;  /* Cyan */
```

2. **Use in component**:
```typescript
<div style={{
  backgroundColor: "var(--accent-secondary)"
}}>
```

### Add New Spacing Value
1. **In theme.css**:
```css
--spacing-3xl: 48px;
```

2. **Use throughout**:
```typescript
padding: "var(--spacing-3xl)"
```

### Add New Animation
1. **In theme.css**:
```css
@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

2. **Use in component**:
```typescript
<div style={{
  animation: "fadeInRight var(--transition-base)"
}}>
```

## Debugging

### CSS Variables Not Updating?
1. Check theme.css is imported in App.tsx
2. Verify variable name (case-sensitive)
3. Clear browser cache
4. Restart dev server

### Color Looks Wrong?
1. Verify variable is defined in theme.css
2. Check browser DevTools computed styles
3. Ensure no inline styles override the variable
4. Test in incognito mode (no cache)

### Animation Janky?
1. Use `transform` and `opacity` only (not `top`, `left`, etc.)
2. Verify timing function is valid
3. Check for layout shifts (use `translateX` instead of `left`)
4. Profile with DevTools Performance tab

## Performance Considerations

- **CSS Variables**: Minimal performance impact
- **Inline Styles**: Acceptable for React (scoped to component)
- **Animations**: GPU-accelerated (transform, opacity)
- **No Global Styles**: Avoid side effects

## Best Practices

1. **Always import theme.css** in App.tsx
2. **Never hardcode colors**—use CSS variables
3. **Use spacing grid**—avoid random pixel values
4. **Prefer system fonts**—better performance, native feel
5. **Test accessibility**—contrast ratios matter
6. **Animate with transform/opacity**—smooth, performant
7. **Keep state minimal**—only for UI rendering
8. **Trust the refs**—all processing lives there
9. **Document new patterns**—help future developers
10. **Test in dark room**—ensure legibility

## Common Mistakes to Avoid

❌ **Don't import theme.css in components**
✅ **Import it once in App.tsx**

❌ **Don't use rgba() for dark theme**
✅ **Use solid colors from palette**

❌ **Don't animate layout properties**
✅ **Animate with transform and opacity**

❌ **Don't add state for UI that shouldn't update**
✅ **Keep refs and let callbacks update state**

❌ **Don't mix inline styles with classNames**
✅ **Pick one approach and stick with it**

❌ **Don't forget var() syntax**
✅ **Always wrap variable: `var(--name)`**

## Resources

- [CSS Variables MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [React Inline Styles](https://react.dev/reference/react-dom/components/common#style)
- [WCAG Contrast Guide](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [CSS Animations MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation)

## Getting Help

- Check `THEME_REFERENCE.md` for color/spacing quick lookup
- Check `UI_ARCHITECTURE.md` for layout details
- Check `REFACTOR_SUMMARY.md` for overview of changes
- Refer to `theme.css` for variable definitions
- Review existing components for pattern examples
