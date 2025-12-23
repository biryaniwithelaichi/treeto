# Dark Theme Quick Reference

## Color Palette

```
Backgrounds:
  Primary:    #0F1115  (--bg-primary)     - Main app background
  Secondary:  #161A22  (--bg-secondary)   - Panels, bars
  Elevated:   #1C2230  (--bg-elevated)    - Cards, surfaces
  Hover:      #2A2F38  (--bg-hover)       - Interactive states

Text:
  Primary:    #E6E9EF  (--text-primary)   - Main text
  Secondary:  #9AA4B2  (--text-secondary) - Subtext
  Tertiary:   #6E7681  (--text-tertiary)  - Placeholder, hint

Accents:
  Recording:  #22C55E  (--accent-recording) - LIVE, active
  Callout:    #F59E0B  (--accent-callout)   - Forming/warning
  Action:     #3B82F6  (--accent-action)    - Action items
  Danger:     #EF4444  (--accent-danger)    - Stop, error
```

## Spacing Grid (4px base)

```
xs:  4px   (--spacing-xs)
sm:  8px   (--spacing-sm)
md:  12px  (--spacing-md)
lg:  16px  (--spacing-lg)
xl:  24px  (--spacing-xl)
2xl: 32px  (--spacing-2xl)
```

## Typography Scale

```
xs:  11px  (--font-size-xs)   - Labels, badges
sm:  12px  (--font-size-sm)   - Small text
base: 13px (--font-size-base) - Body text
md:  14px  (--font-size-md)   - Subheadings
lg:  16px  (--font-size-lg)   - Section titles
xl:  18px  (--font-size-xl)   - App title
2xl: 24px  (--font-size-2xl)  - Main headings
```

## Line Heights

```
tight:    1.4  (--line-height-tight)   - Compact labels
normal:   1.6  (--line-height-normal)  - Standard body
relaxed:  1.8  (--line-height-relaxed) - Readable notes
```

## Animation Timings

```
fast:  150ms cubic-bezier(0.4, 0, 0.2, 1)  (--transition-fast)
base:  250ms cubic-bezier(0.4, 0, 0.2, 1)  (--transition-base)
slow:  350ms cubic-bezier(0.4, 0, 0.2, 1)  (--transition-slow)
```

## Component Defaults

### Buttons
- Background: Depends on context (recording green, danger red)
- Padding: 8px 12px (sm/md)
- Border radius: 8px
- Font weight: 600
- Hover: opacity 0.9
- Disabled: opacity 0.5

### Cards
- Background: var(--bg-elevated) or var(--bg-secondary)
- Padding: 16px 24px (lg/xl)
- Border radius: 6-8px
- Border: 1px solid var(--border-color) (optional)
- Box shadow: None (minimal elevation)

### Callout Badge
- State: LIVE (green) or PAUSED (gray)
- Size: Small (sm)
- Animation: Pulsing dot when live
- Border: 1px colored

## Usage Examples

### Dark surface with light text
```css
background-color: var(--bg-secondary);
color: var(--text-primary);
```

### Accent highlight
```css
border-left: 3px solid var(--accent-action);
background-color: var(--bg-elevated);
```

### Smooth transition
```css
transition: all var(--transition-fast);
```

### Recording indicator
```css
background-color: var(--accent-recording);
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
```

## Contrast Ratios

| Foreground | Background | Ratio |
|-----------|-----------|-------|
| #E6E9EF (primary) | #0F1115 | 10.5:1 |
| #9AA4B2 (secondary) | #0F1115 | 6.2:1 |
| #22C55E (accent) | #0F1115 | 5.8:1 |
| White | #1C2230 | 15:1 |

All ratios exceed WCAG AA (4.5:1) for normal text and AAA (7:1) for large text.

## Implementation Notes

1. **Import theme.css** in main.tsx before rendering
2. **Use CSS variables** throughout inline styles
3. **No hardcoded colors** - always reference variables
4. **Test hover states** in different contexts
5. **Ensure dark mode** backgrounds are warm (not pure black #000000)

## Mobile Considerations

- Buttons: 44px minimum touch target
- Padding: Increase on small screens
- Font: Consider larger base on mobile
- Spacing: Maintain 16px minimum gutters
