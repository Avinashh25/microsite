import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
  { num: '01', label: 'Decide' },
  { num: '02', label: 'Design' },
  { num: '03', label: 'Accelerate' },
  { num: '04', label: 'Govern' },
  { num: '05', label: 'Reuse' },
];

/** Clamp a scroll-range value to the valid [0, 1] window */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function SenzaiLoopTransition() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <div
      ref={containerRef}
      className="loop-transition-outer"
      style={{ height: '200vh', position: 'relative' }}
    >
      <div className="loop-transition-sticky">
        <div className="loop-transition-stage">

          {/* Cards — horizontal → vertical nav list */}
          {STEPS.map((step, i) => (
            <TransitionCard
              key={step.num}
              step={step}
              index={i}
              progress={scrollYProgress}
            />
          ))}

          {/* Nav items that fade in as cards dissolve */}
          {STEPS.map((step, i) => (
            <NavItem
              key={`nav-${step.num}`}
              label={step.label}
              index={i}
              isFirst={i === 0}
              progress={scrollYProgress}
            />
          ))}

        </div>
      </div>
    </div>
  );
}

/* ─── Card width / gap constants ─────────────────────────────────────────── */
const CARD_W = 140;   // initial card width
const CARD_H = 72;    // initial card height
const CARD_GAP = 8;   // gap between cards in start state

/* Final sidebar position (mirrors PlatformRail exactly) */
const NAV_LEFT = 32;  // padding-left of the sidebar
const NAV_TOP  = 60;  // top offset of first nav item
const NAV_GAP  = 44;  // vertical gap between nav items

/* ─── TransitionCard ──────────────────────────────────────────────────────── */
function TransitionCard({
  step,
  index,
  progress,
}: {
  step: { num: string; label: string };
  index: number;
  progress: MotionValue<number>;
}) {
  const p1Range: [number, number] = [0, 0.6];

  // Cards dissolve one by one, staggered
  const dissolveStart = clamp01(0.45 + index * 0.04);
  const dissolveEnd   = clamp01(dissolveStart + 0.18);

  // Start position: tightly packed horizontal row at top-left (0 offset)
  const startX = index * (CARD_W + CARD_GAP);
  const startY = 0;

  // End position: vertical list matching sidebar layout
  const destX = NAV_LEFT - 10; // slightly left so border fade looks natural
  const destY = NAV_TOP + index * NAV_GAP - 8;

  const left    = useTransform(progress, p1Range, [startX, destX]);
  const top     = useTransform(progress, p1Range, [startY, destY]);
  const width   = useTransform(progress, p1Range, [CARD_W, 120]);
  const height  = useTransform(progress, p1Range, [CARD_H, 32]);

  // Border / background fade out mid-way through the animation
  const borderOpacity = useTransform(progress, [0, 0.35, 0.6], [1, 0.4, 0]);
  const bgOpacity     = useTransform(progress, [0, 0.35, 0.6], [1, 0.3, 0]);
  const cardOpacity   = useTransform(progress, [dissolveStart, dissolveEnd], [1, 0]);

  const pointerEvents = useTransform(
    progress,
    (v) => (v < dissolveEnd ? 'auto' : 'none'),
  );

  return (
    <motion.div
      className="loop-transition-card"
      style={{
        left,
        top,
        width,
        height,
        opacity: cardOpacity,
        pointerEvents: pointerEvents as MotionValue<'auto' | 'none'>,
        borderColor: borderOpacity as unknown as string,
        background: bgOpacity as unknown as string,
      }}
    >
      <motion.span
        className="card-num"
        style={{ opacity: useTransform(progress, [0, 0.4], [1, 0]) }}
      >
        {step.num}
      </motion.span>
      <motion.span
        className="card-label"
        style={{ opacity: useTransform(progress, [0.2, 0.58], [1, 0]) }}
      >
        {step.label}
      </motion.span>
    </motion.div>
  );
}

/* ─── NavItem ─────────────────────────────────────────────────────────────── */
/**
 * Fades in as a plain sidebar text item — exactly matching PlatformRail style.
 * First item (Decide) gets the glowing dot bullet.
 */
function NavItem({
  label,
  index,
  isFirst,
  progress,
}: {
  label: string;
  index: number;
  isFirst: boolean;
  progress: MotionValue<number>;
}) {
  const start = clamp01(0.45 + index * 0.085);
  const end   = clamp01(start + 0.18);

  const opacity = useTransform(progress, [start, end], [0, 1]);
  const x       = useTransform(progress, [start, end], [-10, 0]);

  return (
    <motion.div
      className={`lt-nav-item${isFirst ? ' lt-nav-item--active' : ''}`}
      style={{
        top: NAV_TOP + index * NAV_GAP,
        left: NAV_LEFT,
        opacity,
        x,
      }}
    >
      <span className="lt-nav-dot-wrap" aria-hidden="true">
        {isFirst && <span className="lt-nav-dot" />}
      </span>
      <span className="lt-nav-label">{label}</span>
    </motion.div>
  );
}
