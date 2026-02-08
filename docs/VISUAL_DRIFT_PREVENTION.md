# Visual Drift Prevention Audit Checklist

## Overview
This document serves as a comprehensive audit checklist to ensure visual consistency across the AI Code Chat Assistant application. Visual drift occurs when UI elements deviate from the established design system over time.

---

## 1. Color System Compliance

### Primary Colors
- [x] **Background Primary**: `#0D1117` - Main application background
- [x] **Background Surface**: `#1A1A2E` - Secondary surfaces
- [x] **Background Panel**: `#252530` - Panel backgrounds
- [x] **Background Card**: `#2A2A35` - Card elements

### Text Colors
- [x] **Text Primary**: `#FFFFFF` - Main text content
- [x] **Text Secondary**: `rgba(255, 255, 255, 0.7)` - Secondary text
- [x] **Text Muted**: `rgba(255, 255, 255, 0.5)` - Placeholder/disabled text

### Accent Colors
- [x] **AI Accent**: `#FF6B6B` - AI-related highlights
- [x] **Success**: `#10B981` - Success states
- [x] **Warning**: `#F59E0B` - Warning states
- [x] **Error**: `#EF4444` - Error states

### Glow Effects
- [x] **AI Glow**: `rgba(255, 107, 107, 0.3)` - AI element glow
- [x] **Success Glow**: `rgba(16, 185, 129, 0.3)` - Success glow
- [x] **Warning Glow**: `rgba(245, 158, 11, 0.3)` - Warning glow
- [x] **Error Glow**: `rgba(239, 68, 68, 0.3)` - Error glow

### Border Colors
- [x] **Border Subtle**: `rgba(255, 255, 255, 0.1)` - Default borders
- [x] **Border Focus**: `rgba(255, 107, 107, 0.3)` - Focus states
- [x] **Border Active**: `rgba(255, 107, 107, 0.5)` - Active states

### Audit Check
```css
/* Verify these CSS variables exist in globals.css */
--color-bg-primary: #0D1117;
--color-bg-surface: #1A1A2E;
--color-bg-panel: #252530;
--color-bg-card: #2A2A35;
--color-text-primary: #FFFFFF;
--color-text-secondary: rgba(255, 255, 255, 0.7);
--color-text-muted: rgba(255, 255, 255, 0.5);
--color-accent-ai: #FF6B6B;
--color-accent-success: #10B981;
--color-accent-warning: #F59E0B;
--color-accent-error: #EF4444;
```

---

## 2. Typography System Compliance

### Font Families
- [x] **UI Font**: `Inter, system-ui, sans-serif` - Body text, UI elements
- [x] **Heading Font**: `Space Grotesk, system-ui, sans-serif` - Headings
- [x] **Code Font**: `JetBrains Mono, 'Fira Code', monospace` - Code blocks

### Type Scale
- [x] **text-xs**: `0.75rem` (12px) - Captions, timestamps
- [x] **text-sm**: `0.875rem` (14px) - Secondary text
- [x] **text-base**: `1rem` (16px) - Body text
- [x] **text-lg**: `1.125rem` (18px) - Emphasized body
- [x] **text-xl**: `1.25rem` (20px) - Small headings
- [x] **text-2xl**: `1.5rem` (24px) - Section headings
- [x] **text-3xl**: `1.875rem` (30px) - Major headings

### Usage Guidelines
- [ ] All headings use `font-heading` (Space Grotesk)
- [ ] All body text uses `font-sans` (Inter)
- [ ] All code blocks use `font-mono` (JetBrains Mono)
- [ ] No custom font sizes outside the defined scale

### Audit Check
```typescript
// Verify in layout.tsx
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";

const inter = Inter({ variable: "--font-inter", ... });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", ... });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", ... });
```

---

## 3. Motion Standards Compliance

### Timing Tokens
- [x] **Micro**: `150ms` - Micro-interactions (button presses)
- [x] **Fast**: `250ms` - Button hovers, toggles
- [x] **Normal**: `400ms` - Panel transitions
- [x] **Slow**: `800ms` - Page transitions

### Easing Functions
- [x] **Default**: `[0.4, 0, 0.2, 1]` - Standard ease-out
- [x] **Enter**: `[0, 0, 0.2, 1]` - Enter animations
- [x] **Exit**: `[0.4, 0, 1, 1]` - Exit animations
- [x] **Bounce**: `[0.68, -0.55, 0.265, 1.55]` - Pop animations
- [x] **Smooth**: `[0.25, 0.1, 0.25, 1]` - Page transitions

### Implementation Check
- [x] `MotionProvider` wraps the application
- [x] All animations use `DURATIONS` from MotionProvider
- [x] All animations use `EASINGS` from MotionProvider
- [x] No hardcoded animation durations in components

### Audit Check
```typescript
// Verify in MotionProvider.tsx
export const DURATIONS = {
  micro: 0.15,   // 150ms
  fast: 0.25,    // 250ms
  normal: 0.4,   // 400ms
  slow: 0.8,     // 800ms
} as const;
```

---

## 4. Glassmorphism Policy Compliance

### When to Use (Strict)
Glass effects are ONLY for:
- [ ] Overlay panels (modals, dropdowns)
- [ ] Floating toolbars
- [ ] Notification toasts
- [ ] Draggable elements

### Standard Glass Effect
```css
.glass-panel {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### Prohibited Usage
- [ ] Main content panels (use `ai-panel` instead)
- [ ] Sidebar navigation
- [ ] Code editor backgrounds
- [ ] Static cards

### Audit Check
- [ ] Search for `backdrop-filter` usage
- [ ] Ensure only overlay elements use glass effect
- [ ] Verify `ai-panel` class used for standard panels

---

## 5. Common Drift Patterns to Watch

### Color Drift
| Drift Pattern | Prevention |
|--------------|------------|
| Hardcoded hex codes | Always use CSS variables |
| One-off rgba values | Define in globals.css |
| Inline styles for colors | Use Tailwind classes |
| Missing opacity variants | Use standard opacity steps (0.5, 0.7) |

### Typography Drift
| Drift Pattern | Prevention |
|--------------|------------|
| Custom font sizes | Stick to text-xs through text-3xl |
| Mixing font families | Use font-sans, font-heading, font-mono |
| Arbitrary font weights | Use font-normal (400), font-medium (500), font-semibold (600), font-bold (700) |
| Custom line heights | Use Tailwind leading-* classes |

### Spacing Drift
| Drift Pattern | Prevention |
|--------------|------------|
| Arbitrary pixel values | Use Tailwind spacing scale |
| Inconsistent padding | Standard panel padding: p-4, p-6 |
| Margin inconsistencies | Use gap utilities in flex/grid containers |

### Motion Drift
| Drift Pattern | Prevention |
|--------------|------------|
| Hardcoded transition durations | Use MotionProvider DURATIONS |
| Custom easing functions | Use MotionProvider EASINGS |
| Missing AnimatePresence | Wrap exit animations properly |

---

## 6. Component Audit Checklist

### For Each New/Modified Component:

- [ ] Uses design token CSS variables for colors
- [ ] Uses standard typography classes
- [ ] Uses MotionProvider for animations
- [ ] Follows glassmorphism policy
- [ ] Uses standard spacing (Tailwind scale)
- [ ] Has consistent border radius (rounded-lg, rounded-xl)
- [ ] Has proper focus states
- [ ] Has proper hover states
- [ ] Maintains 4.5:1 contrast ratio (accessibility)

### Button Components
- [ ] Primary: `#FF6B6B` background
- [ ] Secondary: Transparent with border
- [ ] Ghost: No background, text only
- [ ] Micro duration (150ms) for hover/press

### Card Components
- [ ] Background: `#2A2A35`
- [ ] Border: `rgba(255, 255, 255, 0.1)`
- [ ] Border radius: `rounded-xl`
- [ ] Shadow: Subtle or none

### Input Components
- [ ] Background: `#1A1A2E`
- [ ] Border: `rgba(255, 255, 255, 0.1)`
- [ ] Focus border: `rgba(255, 107, 107, 0.3)`
- [ ] Placeholder: `rgba(255, 255, 255, 0.5)`

---

## 7. Automated Prevention

### ESLint Rules to Consider
```javascript
// .eslintrc.js additions
{
  rules: {
    // Prevent hardcoded colors
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^#[0-9A-Fa-f]{6}$/]',
        message: 'Use CSS variables instead of hardcoded hex colors'
      }
    ]
  }
}
```

### Code Review Checklist
- [ ] No hardcoded color values
- [ ] No custom font sizes
- [ ] No hardcoded animation durations
- [ ] Proper use of design tokens
- [ ] Accessibility compliance (contrast ratios)

---

## 8. Visual Regression Testing

### Critical Screens
1. **Main Application Layout**
   - Sidebar navigation
   - File explorer
   - Chat interface
   - Code viewer

2. **Component States**
   - Default state
   - Hover state
   - Active/Selected state
   - Disabled state
   - Loading state
   - Error state

3. **Responsive Breakpoints**
   - Desktop (1280px+)
   - Tablet (768px - 1279px)
   - Mobile (< 768px)

---

## 9. Documentation Maintenance

### Keep Updated
- [ ] Color system changes
- [ ] Typography changes
- [ ] Motion timing changes
- [ ] New component patterns
- [ ] Glassmorphism exceptions

### Version Control
- Version: 1.0.0
- Last Updated: 2026-02-08
- Next Review: 2026-03-08

---

## 10. Quick Reference

### CSS Variables Summary
```css
/* Backgrounds */
--color-bg-primary: #0D1117;
--color-bg-surface: #1A1A2E;
--color-bg-panel: #252530;
--color-bg-card: #2A2A35;

/* Text */
--color-text-primary: #FFFFFF;
--color-text-secondary: rgba(255, 255, 255, 0.7);
--color-text-muted: rgba(255, 255, 255, 0.5);

/* Accents */
--color-accent-ai: #FF6B6B;
--color-accent-success: #10B981;
--color-accent-warning: #F59E0B;
--color-accent-error: #EF4444;

/* Motion */
--duration-micro: 150ms;
--duration-fast: 250ms;
--duration-normal: 400ms;
--duration-slow: 800ms;
```

### Tailwind Classes Summary
```
/* Fonts */
font-sans    → Inter
font-heading → Space Grotesk
font-mono    → JetBrains Mono

/* Backgrounds */
bg-[#0D1117] → Primary
bg-[#1A1A2E] → Surface
bg-[#252530] → Panel
bg-[#2A2A35] → Card

/* Accents */
text-[#FF6B6B] → AI Accent
bg-[#FF6B6B]   → AI Background
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Design Lead | | | |
| Tech Lead | | | |
| QA Lead | | | |

---

**Note**: This checklist should be reviewed monthly and updated whenever design system changes are made.
