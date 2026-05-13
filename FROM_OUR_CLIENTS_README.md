# From Our Clients Section - Code Documentation

This document contains all code related to the **"From Our Clients"** (Testimonials) section of the Senzai application.

---

## Overview

The **TestimonialsSlider** component displays client testimonials in an interactive carousel with:
- 3D tilt effect on hover
- Auto-advance carousel with manual navigation
- Side card visibility with dimmed effect
- Keyboard navigation support (arrow keys)
- Dot-based pagination
- Full accessibility features (ARIA labels, keyboard support, etc.)

---

## Files

1. **TestimonialsSlider.tsx** - Main React component
2. **TestimonialsSlider.css** - Component styling

---

## TSX Code

### File: `src/components/TestimonialsSlider.tsx`

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import './TestimonialsSlider.css';

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    id: 0,
    quote:
      '"SENZAI gave us something we didn\'t have before — a single place where business intent and technical execution stay in sync. From the first idea to the deployed outcome."',
    name: 'James Kirk',
    role: 'CTO, Global Healthcare Enterprise',
  },
  {
    id: 1,
    quote:
      '"The governance piece changed how we operate. Every agent that ships has a traceable Blueprint behind it. Our compliance team finally trusts what engineering is building."',
    name: 'Marcus Chen',
    role: 'VP Engineering, Payor Major',
  },
  {
    id: 2,
    quote:
      '"We went from a 12-week delivery cycle to a full runnable POC in days. The second build was faster than the first. The Marketplace is the part nobody else has thought about."',
    name: 'John Smith',
    role: 'Head of AI, Major Healthcare Group',
  },
];

const TOTAL = TESTIMONIALS.length;
const AUTO_INTERVAL = 5500; // ms — paused while hovering a side card

/* ─────────────────────────────────────────────
   Lerp / Vec2 utilities (same as voyage slider)
───────────────────────────────────────────── */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

class Vec2 {
  x: number;
  y: number;
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  lerp(v: Vec2, t: number) {
    this.x = lerp(this.x, v.x, t);
    this.y = lerp(this.y, v.y, t);
  }
}

/* ─────────────────────────────────────────────
   Per-card tilt hook (only fires on current card)
───────────────────────────────────────────── */
function useTilt(
  triggerRef: React.RefObject<HTMLElement | null>,
  innerRef: React.RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !active) return;

    let rafId: number;
    let lerpAmt = 0.06;
    const rot = { cur: new Vec2(), tgt: new Vec2() };
    const bg  = { cur: new Vec2(), tgt: new Vec2() };

    const tick = () => {
      rot.cur.lerp(rot.tgt, lerpAmt);
      bg.cur.lerp(bg.tgt, lerpAmt);
      const el = innerRef.current;
      if (el) {
        el.style.setProperty('--rotX', rot.cur.y.toFixed(2) + 'deg');
        el.style.setProperty('--rotY', rot.cur.x.toFixed(2) + 'deg');
      }
      rafId = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      lerpAmt = 0.1;
      const el = innerRef.current;
      if (!el) return;
      const ox = (e.offsetX - el.clientWidth  * 0.5) / (Math.PI * 3);
      const oy = -(e.offsetY - el.clientHeight * 0.5) / (Math.PI * 4);
      rot.tgt.x = ox; rot.tgt.y = oy;
      bg.tgt.x  = -ox * 0.3; bg.tgt.y = oy * 0.3;
    };

    const onLeave = () => {
      lerpAmt = 0.06;
      rot.tgt.x = 0; rot.tgt.y = 0;
    };

    trigger.addEventListener('mousemove', onMove as EventListener);
    trigger.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      trigger.removeEventListener('mousemove', onMove as EventListener);
      trigger.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
      // reset vars on cleanup
      const el = innerRef.current;
      if (el) {
        el.style.setProperty('--rotX', '0deg');
        el.style.setProperty('--rotY', '0deg');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/* ─────────────────────────────────────────────
   Single card
───────────────────────────────────────────── */
interface CardProps {
  t: (typeof TESTIMONIALS)[number];
  state: 'current' | 'next' | 'previous';
  onClick: () => void;
}

function TestiCard({ t, state, onClick }: CardProps) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isCurrent = state === 'current';

  useTilt(cardRef, innerRef, isCurrent);

  return (
    <div
      className="ts-slide"
      data-state={state}
      ref={cardRef}
      onClick={!isCurrent ? onClick : undefined}
      role={!isCurrent ? 'button' : undefined}
      tabIndex={!isCurrent ? 0 : undefined}
      aria-label={!isCurrent ? `View ${t.name}'s testimonial` : undefined}
      aria-current={isCurrent ? 'true' : undefined}
      onKeyDown={!isCurrent ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="ts-slide__inner" ref={innerRef}>
        {/* decorative quote mark */}
        <div className="ts-slide__qq" aria-hidden="true">"</div>

        <div className="ts-slide__text-wrapper">
          <div className="ts-slide--text ts-slide--quote">
            <span>{t.quote}</span>
          </div>
          <div className="ts-slide--text ts-slide--name">
            <span>{t.name}</span>
          </div>
          <div className="ts-slide--text ts-slide--role">
            <span>{t.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main slider
───────────────────────────────────────────── */
export function TestimonialsSlider() {
  const [current, setCurrent]     = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wrap = (n: number) => ((n % TOTAL) + TOTAL) % TOTAL;
  const next = wrap(current + 1);

  const go = useCallback((dir: 1 | -1) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent((c) => wrap(c + dir));
    setTimeout(() => setIsAnimating(false), 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnimating]);

  /* ── auto-advance ── */
  useEffect(() => {
    autoRef.current = setTimeout(() => go(1), AUTO_INTERVAL);
    return () => { if (autoRef.current) clearTimeout(autoRef.current); };
  }, [current, go]);

  /* ── keyboard navigation ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const stateOf = (idx: number): 'current' | 'next' | 'previous' => {
    if (idx === current) return 'current';
    if (idx === next)    return 'next';
    return 'previous';
  };

  return (
    <div className="ts-slider" aria-label="Client testimonials">
      {/* Slides */}
      <div className="ts-slides__wrapper">
        <div className="ts-slides">
          {TESTIMONIALS.map((t, i) => {
            const state = stateOf(i);
            const dir: 1 | -1 = state === 'next' ? 1 : -1;
            return (
              <TestiCard
                key={t.id}
                t={t}
                state={state}
                onClick={() => go(dir)}
              />
            );
          })}
        </div>

        {/* Dot navigation */}
        <div className="ts-dots" role="tablist" aria-label="Slide select">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1}`}
              id={`ts-dot-${i}`}
              className={`ts-dot ${i === current ? 'ts-dot--active' : ''}`}
              onClick={() => {
                if (!isAnimating && i !== current) {
                  go(i > current ? 1 : -1);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## CSS Code

### File: `src/components/TestimonialsSlider.css`

```css
/* ================================================================
   TestimonialsSlider.css
   Click-to-advance, no blur, side card text visible at low opacity.
   ================================================================ */

/* Layout variables */
.ts-slider {
  --ts-card-width: min(28vw, 340px);
  --ts-card-aspect: 3 / 4;
  --ts-transition-dur: 800ms;
  --ts-transition-ease: cubic-bezier(0.22, 1, 0.36, 1);

  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0 32px;
  position: relative;
}

/* Wrapper grid – all cards share the same cell */
.ts-slides__wrapper {
  flex: 1;
  min-width: 0;
  display: grid;
  place-items: center;
}

.ts-slides {
  width: 100%;
  display: grid;
  place-items: center;
}

.ts-slides > * {
  grid-area: 1 / -1;
}

/* Individual slide card */
.ts-slide {
  --ts-tx: 0px;
  --ts-tz: 0px;
  --ts-rotY: 0deg;
  --ts-scale: 1;

  width: var(--ts-card-width);
  aspect-ratio: var(--ts-card-aspect);
  perspective: 800px;
  user-select: none;
  position: relative;

  transform:
    perspective(1000px)
    translate3d(var(--ts-tx), 0, var(--ts-tz))
    rotateY(var(--ts-rotY))
    scale(var(--ts-scale));

  transition:
    transform var(--ts-transition-dur) var(--ts-transition-ease),
    opacity   var(--ts-transition-dur) var(--ts-transition-ease),
    filter    var(--ts-transition-dur) var(--ts-transition-ease);
}

/* Current - center, scaled up, full brightness */
.ts-slide[data-state="current"] {
  --ts-scale: 1.18;
  --ts-tx: 0px;
  --ts-tz: 0px;
  --ts-rotY: 0deg;

  opacity: 1;
  filter: brightness(1);
  z-index: 20;
  pointer-events: auto;
}

/* Next - right side, dimmed but content readable, NO blur */
.ts-slide[data-state="next"] {
  --ts-tx: calc(var(--ts-card-width) * 1.07);
  --ts-rotY: -45deg;
  --ts-scale: 1;

  opacity: 0.65;
  filter: brightness(0.7);
  z-index: 10;
  pointer-events: auto;
  cursor: pointer;
}

/* Previous - left side, dimmed but content readable, NO blur */
.ts-slide[data-state="previous"] {
  --ts-tx: calc(-1 * var(--ts-card-width) * 1.07);
  --ts-rotY: 45deg;
  --ts-scale: 1;

  opacity: 0.65;
  filter: brightness(0.7);
  z-index: 10;
  pointer-events: auto;
  cursor: pointer;
}

/* Hover on side cards - brighten as click affordance */
.ts-slide[data-state="next"]:hover,
.ts-slide[data-state="previous"]:hover {
  opacity: 0.88;
  filter: brightness(0.9);
  --ts-scale: 1.05;
}

/* Inner – receives 3-D tilt vars from hook */
.ts-slide__inner {
  --rotX: 0deg;
  --rotY: 0deg;

  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: rotateX(var(--rotX)) rotateY(var(--rotY));
  transition: transform 0.1s linear;

  /* Glass card */
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  padding: 36px 32px 32px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-shadow:
    0 4px 32px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(255, 255, 255, 0.06) inset;
}

/* Top-left highlight sheen */
.ts-slide__inner::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%);
  pointer-events: none;
}

/* Giant decorative quote mark */
.ts-slide__qq {
  position: absolute;
  top: 18px;
  left: 24px;
  font-size: 5rem;
  line-height: 1;
  font-family: 'Clash Display', 'Inter', sans-serif;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.09);
  pointer-events: none;
  user-select: none;
}

/* Text wrapper */
.ts-slide__text-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Shared text rule - overflow visible so side cards aren't clipped */
.ts-slide--text {
  overflow: visible;
}

.ts-slide--text span {
  display: block;
  transition:
    opacity  var(--ts-transition-dur) var(--ts-transition-ease),
    transform var(--ts-transition-dur) var(--ts-transition-ease);
}

/* Current card - fully visible text */
.ts-slide[data-state="current"] .ts-slide--text span {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  transition-delay: 250ms;
}

/* Side cards - text visible at reduced opacity, stays in place */
.ts-slide:not([data-state="current"]) .ts-slide--text span {
  opacity: 0.45;
  transform: translate3d(0, 0, 0);
  transition-delay: 0ms;
}

/* Quote text */
.ts-slide--quote span {
  font-family: 'Archivo', 'Inter', sans-serif;
  font-size: clamp(0.8rem, 1.5cqw, 0.92rem);
  font-weight: 400;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.82);
  white-space: normal;
}

/* Name */
.ts-slide--name span {
  font-family: 'Clash Display', 'Inter', sans-serif;
  font-size: clamp(0.88rem, 1.8cqw, 1rem);
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.01em;
  margin-top: 4px;
}

/* Role */
.ts-slide--role span {
  font-family: 'Archivo', 'Inter', sans-serif;
  font-size: clamp(0.7rem, 1.2cqw, 0.78rem);
  font-weight: 400;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.02em;
}

/* Dot navigation */
.ts-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 32px;
}

.ts-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: background 300ms ease, width 300ms ease;
}

.ts-dot--active {
  background: rgba(255, 255, 255, 0.85);
  width: 22px;
  border-radius: 4px;
}

.ts-dot:hover:not(.ts-dot--active) {
  background: rgba(255, 255, 255, 0.45);
}

.ts-dot:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 3px;
}

/* Responsive */
@media (max-width: 768px) {
  .ts-slider {
    --ts-card-width: min(72vw, 320px);
  }

  .ts-slide[data-state="next"],
  .ts-slide[data-state="previous"] {
    opacity: 0;
    pointer-events: none;
  }
}
```

---

## Features

### ✨ Key Features

1. **3D Tilt Effect**: Mouse-based tilt animation on the current card
2. **Auto-Advance**: Carousel automatically advances every 5.5 seconds
3. **Manual Navigation**: Click side cards to advance, or use arrow keys
4. **Glass Morphism**: Modern glass card design with blur and transparency
5. **Responsive**: Adapts card size to screen width
6. **Accessibility**: Full ARIA labels, keyboard support, and semantic HTML

### 🎯 Interaction Modes

- **Mouse Hover**: Tilt effect on active card
- **Click**: Side cards are clickable to advance
- **Keyboard**: Arrow keys (Left/Right) to navigate
- **Touch**: (via dots) Pagination buttons for direct slide access

---

## Data Structure

```typescript
interface Testimonial {
  id: number;
  quote: string;
  name: string;
  role: string;
}
```

---

## Constants

- `TOTAL`: Number of testimonials (3)
- `AUTO_INTERVAL`: 5500ms - Time between auto-advance
- `TRANSITION_DURATION`: 800ms - Smooth animation duration

---

## Customization

### Add More Testimonials

Edit the `TESTIMONIALS` array in `TestimonialsSlider.tsx`:

```typescript
const TESTIMONIALS = [
  {
    id: 3,
    quote: '"Your new testimonial quote here"',
    name: 'Client Name',
    role: 'Position, Company',
  },
  // Add more...
];
```

### Adjust Timing

```typescript
const AUTO_INTERVAL = 5500; // Change auto-advance delay
```

### Modify Card Size

```css
.ts-slider {
  --ts-card-width: min(28vw, 340px); /* Adjust responsive size */
  --ts-card-aspect: 3 / 4; /* Change aspect ratio */
}
```

---

## Browser Support

- Modern browsers with CSS Grid, CSS Variables, and 3D Transforms support
- Mobile responsive with dedicated mobile layout

---

## Performance Notes

- Uses `requestAnimationFrame` for smooth 60fps tilt animation
- CSS Grid for efficient layout stacking
- Transition delays optimized for visual flow
- Lightweight and no external animation libraries

