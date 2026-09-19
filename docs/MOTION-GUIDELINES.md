# QRPrint — Motion Primitives & UI Animation Guidelines

**Standard**: Motion Primitives Reference Implementation  
**Technology**: Motion (Framer Motion v12) + Tailwind CSS + React 19  
**Core Principle**: Purpose-Driven, Accessible Motion — Enhancing Feedback, Hierarchy, and Responsiveness  

---

## 1. Design Philosophy

Motion in QRPrint is **functional, not decorative**. Animations exist to:
1. Clarify state transitions (e.g. from file upload to configuration to payment to pickup).
2. Guide visual hierarchy (drawing the customer's eye to their 8-digit verification code).
3. Enhance perceived responsiveness on low-power kiosk and point-of-sale hardware.
4. Provide immediate tactile feedback during drag-and-drop file operations.

### Anti-Patterns (Strictly Prohibited):
- Do NOT animate every label, input field, or table cell.
- Do NOT introduce continuous looping background animations.
- Do NOT add animation that delays or blocks user interactions (clicking, printing, submitting).
- Do NOT alter brand colors, typography, or established layout structure for the sake of animation.

---

## 2. Reusable Motion Primitives

Both `app/customer-web` and `app/merchant-desktop` share an identical, self-contained suite of Motion Primitives located in `src/components/motion-primitives/`:

### 2.1 `AnimatedGroup`
- **Location**: `src/components/motion-primitives/AnimatedGroup.tsx`
- **Purpose**: Staggers child elements (e.g., metric cards, print option tiles, payment methods) into view.
- **Physics**: Smooth spring damping (`stiffness: 400`, `damping: 30`) with configurable stagger delays (default `0.08s`).
- **Variants**: `fade`, `slide`, `scale`, `blur-slide`.
- **Usage Example**:
```tsx
import { AnimatedGroup } from './motion-primitives';

<AnimatedGroup preset="slide" staggerDelay={0.06} className="grid grid-cols-3 gap-4">
  <MetricCard title="Active Jobs" value={12} />
  <MetricCard title="Printers Online" value={3} />
  <MetricCard title="Today's Revenue" value="₹1,240" />
</AnimatedGroup>
```

### 2.2 `TextEffect`
- **Location**: `src/components/motion-primitives/TextEffect.tsx`
- **Purpose**: Creates subtle, high-impact headline reveals for customer kiosk splash screens and onboarding banners.
- **Granularity**: Animates per `word` or `char`.
- **Usage Example**:
```tsx
import { TextEffect } from './motion-primitives';

<TextEffect per="word" preset="fade-in-blur" className="text-2xl font-bold text-gray-900">
  Fast, Touchless Document Printing
</TextEffect>
```

### 2.3 `InView`
- **Location**: `src/components/motion-primitives/InView.tsx`
- **Purpose**: Triggers animations only when an element enters the viewport using high-performance `IntersectionObserver`.
- **Usage Example**:
```tsx
import { InView } from './motion-primitives';

<InView threshold={0.2} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
  <PricingSummaryTable data={pricing} />
</InView>
```

### 2.4 `Disclosure`
- **Location**: `src/components/motion-primitives/Disclosure.tsx`
- **Purpose**: Accessible collapsible accordion container for complex settings and job details with smooth height transitions.
- **Usage Example**:
```tsx
import { Disclosure, DisclosureTrigger, DisclosureContent } from './motion-primitives';

<Disclosure>
  <DisclosureTrigger className="flex justify-between py-2 text-sm font-medium">
    Advanced Spooler Settings
  </DisclosureTrigger>
  <DisclosureContent className="pt-2 text-gray-600">
    <SpoolerDiagnosticsPanel />
  </DisclosureContent>
</Disclosure>
```

---

## 3. Screen-by-Screen Motion Application

### 3.1 Customer Web Kiosk (`app/customer-web`)
| Screen / Component | Motion Pattern | Component Used | UX Benefit |
|---|---|---|---|
| **Welcome / Splash** | Headline word stagger | `TextEffect` | Welcoming kiosk feel without overwhelming the customer. |
| **Document Upload** | Dropzone border & scale spring | Native Motion `motion.div` | Clear tactile feedback when a file is dragged over the target. |
| **Print Configuration** | Staggered option cards | `AnimatedGroup` | Guides customer through copies, color, duplex options sequentially. |
| **Payment Modal** | Staggered payment choices | `AnimatedGroup` | Smooth reveal of UPI QR code vs Cash pay-at-counter button. |
| **Success / Claim** | Verification code pop & confetti | `motion.div` + `canvas-confetti` | High-delight moment clearly highlighting the 8-digit pickup code. |

### 3.2 Merchant Management Desktop (`app/merchant-desktop`)
| Screen / Component | Motion Pattern | Component Used | UX Benefit |
|---|---|---|---|
| **Dashboard Metrics** | Metric cards stagger | `AnimatedGroup` | Clean entry on startup; communicates data freshness. |
| **Print Queue** | Job state transitions | Motion `layout` | Smooth reordering when jobs move from `QUEUED` to `PRINTED`. |
| **Printer Fleet** | Status badge update | Motion `AnimatePresence` | Instant visual awareness when a printer goes offline or has a jam. |
| **Settings Modal** | Collapsible section accordions | `Disclosure` | Keeps dense printer configuration organized and readable. |

---

## 4. Accessibility & Reduced Motion Standard

Every Motion Primitive in QRPrint strictly adheres to the WCAG 2.1 Level AAA motion sensitivity guideline:

```tsx
import { useReducedMotion } from 'motion/react';

const shouldReduceMotion = useReducedMotion();
```

### When `prefers-reduced-motion: reduce` is detected:
1. **Transforms Removed**: All `translateY`, `translateX`, and `scale` offsets are removed (`y: 0`, `x: 0`, `scale: 1`).
2. **Blurs Removed**: `filter: blur(...)` transitions are eliminated.
3. **Staggers Removed**: Stagger delays are set to `0s`, displaying all child elements simultaneously.
4. **Duration Minimized**: Transitions fall back to instant or ultra-fast (50ms) opacity fades.
5. **Keyboard Equivalence**: Tab order, focus rings, and enter/space activations operate identically regardless of motion settings.

---

## 5. Performance & Hardware Targets

Stationery and Xerox shops frequently run on legacy POS machines or dual-core Windows 7 terminals. QRPrint guarantees 60 FPS UI performance through strict performance constraints:
- **GPU-Accelerated Properties Only**: Animations strictly manipulate `transform` and `opacity`. No layout properties (`width`, `height`, `margin`, `padding`, `top`, `left`) are animated.
- **Zero Continuous Animation Loops**: No persistent CPU-draining `requestAnimationFrame` loops.
- **Tiny Bundle Footprint**: The shared Motion library adds only ~12 kB gzipped to the production bundles, with zero runtime dependencies.
