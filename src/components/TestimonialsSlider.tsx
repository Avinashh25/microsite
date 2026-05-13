import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
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
const AUTO_INTERVAL = 5500;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

class Vec2 {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  lerp(v: Vec2, t: number) {
    this.x = lerp(this.x, v.x, t);
    this.y = lerp(this.y, v.y, t);
  }
}

function useTilt(
  triggerRef: RefObject<HTMLElement | null>,
  innerRef: RefObject<HTMLElement | null>,
  active: boolean
) {
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !active) return;

    let rafId: number;
    let lerpAmt = 0.06;
    const rot = { cur: new Vec2(), tgt: new Vec2() };

    const tick = () => {
      rot.cur.lerp(rot.tgt, lerpAmt);
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
      const ox = (e.offsetX - el.clientWidth * 0.5) / (Math.PI * 3);
      const oy = -(e.offsetY - el.clientHeight * 0.5) / (Math.PI * 4);
      rot.tgt.x = ox;
      rot.tgt.y = oy;
    };

    const onLeave = () => {
      lerpAmt = 0.06;
      rot.tgt.x = 0;
      rot.tgt.y = 0;
    };

    trigger.addEventListener('mousemove', onMove as EventListener);
    trigger.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(tick);

    return () => {
      trigger.removeEventListener('mousemove', onMove as EventListener);
      trigger.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
      const el = innerRef.current;
      if (el) {
        el.style.setProperty('--rotX', '0deg');
        el.style.setProperty('--rotY', '0deg');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

interface CardProps {
  t: (typeof TESTIMONIALS)[number];
  state: 'current' | 'next' | 'previous';
  onClick: () => void;
}

function TestiCard({ t, state, onClick }: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
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
        <div className="ts-slide__qq" aria-hidden="true">
          "
        </div>

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

export function TestimonialsSlider() {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wrap = (n: number) => ((n % TOTAL) + TOTAL) % TOTAL;
  const next = wrap(current + 1);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrent((c) => wrap(c + dir));
      setTimeout(() => setIsAnimating(false), 800);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [isAnimating]
  );

  useEffect(() => {
    autoRef.current = setTimeout(() => go(1), AUTO_INTERVAL);
    return () => {
      if (autoRef.current) clearTimeout(autoRef.current);
    };
  }, [current, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const stateOf = (idx: number): 'current' | 'next' | 'previous' => {
    if (idx === current) return 'current';
    if (idx === next) return 'next';
    return 'previous';
  };

  return (
    <div className="ts-slider" aria-label="Client testimonials">
      <div className="ts-slides__wrapper">
        <div className="ts-slides">
          {TESTIMONIALS.map((t, i) => {
            const state = stateOf(i);
            const dir: 1 | -1 = state === 'next' ? 1 : -1;
            return <TestiCard key={t.id} t={t} state={state} onClick={() => go(dir)} />;
          })}
        </div>

        <div className="ts-dots" role="tablist" aria-label="Slide select">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.id}
              type="button"
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
