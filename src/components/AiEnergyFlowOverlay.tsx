import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };

const STAGE_ANCHOR_IDS = ['decide', 'design', 'accelerate', 'govern', 'reuse'] as const;

function pathLengthFromD(d: string): number {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  return p.getTotalLength();
}

/** Single vertical segment (center spine) — collinear anchors collapse to one line. */
function verticalSpinePath(cx: number, points: Point[]): string {
  if (points.length === 0) return '';
  const sorted = [...points].sort((a, b) => a.y - b.y);
  const y0 = sorted[0].y;
  const y1 = sorted[sorted.length - 1].y;
  if (sorted.length === 1) return `M ${cx} ${y0}`;
  return `M ${cx} ${y0} L ${cx} ${y1}`;
}

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export function AiEnergyFlowOverlay({ containerRef }: Props) {
  const reduce = useReducedMotion() === true;
  const rafMeasureRef = useRef<number>(0);
  const spinePathRef = useRef<SVGPathElement>(null);
  const [geom, setGeom] = useState<{
    w: number;
    h: number;
    d: string;
    nodes: Point[];
    len: number;
    startY: number;
    endY: number;
    startScroll: number;
    endScroll: number;
  } | null>(null);
  const geomRef = useRef<typeof geom>(null);
  const [scrollT, setScrollT] = useState(0);
  const [traveler, setTraveler] = useState<Point | null>(null);

  const readScrollProgress = useCallback(() => {
    const g = geomRef.current;
    if (!g) return 0;
    const span = Math.max(1, g.endScroll - g.startScroll);
    return Math.min(1, Math.max(0, (window.scrollY - g.startScroll) / span));
  }, []);

  const measure = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;

    const w = Math.max(1, root.offsetWidth);
    const h = Math.max(1, root.offsetHeight);
    const rootRect = root.getBoundingClientRect();
    const cx = w * 0.5;

    const relY = (el: Element | null, yBias: number): number | null => {
      if (!(el instanceof HTMLElement)) return null;
      const r = el.getBoundingClientRect();
      return r.top - rootRect.top + r.height * yBias;
    };
    const absTop = (el: Element | null): number | null => {
      if (!(el instanceof HTMLElement)) return null;
      return el.getBoundingClientRect().top + window.scrollY;
    };

    const pts: Point[] = [];

    const hero = document.getElementById('hero');
    const heroY = relY(hero, 0.42);
    if (heroY != null) pts.push({ x: cx, y: heroY });

    for (const id of STAGE_ANCHOR_IDS) {
      const el = document.getElementById(id);
      const y = relY(el, 0.12);
      if (y != null) pts.push({ x: cx, y });
    }

    const foot = root.querySelector('.site-foot');
    const footY = relY(foot, 0.2);
    if (footY != null) pts.push({ x: cx, y: footY });

    if (pts.length < 2) {
      setGeom(null);
      return;
    }

    const nodes = pts.map((p) => ({ x: cx, y: p.y }));
    const sortedNodes = [...nodes].sort((a, b) => a.y - b.y);
    const startY = sortedNodes[0].y;
    const endY = sortedNodes[sortedNodes.length - 1].y;
    const d = verticalSpinePath(cx, nodes);
    const len = pathLengthFromD(d);
    const heroTop = absTop(hero) ?? 0;
    const footTop = absTop(foot) ?? heroTop + 1;
    const startScroll = Math.max(0, heroTop - window.innerHeight * 0.18);
    const endScroll = Math.max(startScroll + 1, footTop - window.innerHeight * 0.62);

    setGeom({ w, h, d, nodes, len, startY, endY, startScroll, endScroll });
  }, [containerRef]);

  const syncTravelerToPath = useCallback((t: number, d: string, len: number) => {
    const pathEl = spinePathRef.current;
    if (!pathEl || len <= 0) {
      setTraveler(null);
      return;
    }
    pathEl.setAttribute('d', d);
    const L = pathEl.getTotalLength();
    if (L <= 0) {
      setTraveler(null);
      return;
    }
    const dist = Math.min(L, Math.max(0, t * L));
    const pt = pathEl.getPointAtLength(dist);
    setTraveler({ x: pt.x, y: pt.y });
  }, []);

  useLayoutEffect(() => {
    geomRef.current = geom;
  }, [geom]);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const scheduleMeasure = () => {
      if (rafMeasureRef.current) cancelAnimationFrame(rafMeasureRef.current);
      rafMeasureRef.current = requestAnimationFrame(() => {
        rafMeasureRef.current = 0;
        measure();
      });
    };

    scheduleMeasure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(root);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      if (rafMeasureRef.current) cancelAnimationFrame(rafMeasureRef.current);
    };
  }, [measure]);

  useLayoutEffect(() => {
    const onScroll = () => setScrollT(readScrollProgress());
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [readScrollProgress]);

  useLayoutEffect(() => {
    if (!geom) {
      setTraveler(null);
      return;
    }
    syncTravelerToPath(scrollT, geom.d, geom.len);
  }, [geom, scrollT, syncTravelerToPath]);

  if (!geom) {
    return <div className="ai-energy-flow" aria-hidden="true" />;
  }

  const { w, h, d, nodes, len, startY } = geom;
  const dashPattern = len > 0 ? `${Math.max(24, len * 0.06)} ${Math.max(40, len * 0.14)}` : '80 120';
  const cx = w * 0.5;
  const branchTop = Math.max(10, startY - Math.min(260, h * 0.24));
  const leftWideX = Math.max(10, cx - Math.min(260, w * 0.34));
  const leftMidX = Math.max(10, cx - Math.min(160, w * 0.2));
  const rightWideX = Math.min(w - 10, cx + Math.min(280, w * 0.36));
  const branchPaths = [
    `M ${leftWideX} ${branchTop} C ${leftWideX + 120} ${branchTop + 16} ${cx - 18} ${startY - 78} ${cx} ${startY}`,
    `M ${leftMidX} ${Math.max(8, branchTop - 8)} C ${leftMidX + 72} ${branchTop + 12} ${cx - 10} ${startY - 72} ${cx} ${startY}`,
    `M ${rightWideX} ${Math.max(10, branchTop + 4)} C ${rightWideX - 130} ${branchTop + 26} ${cx + 20} ${startY - 76} ${cx} ${startY}`,
  ];

  return (
    <div className="ai-energy-flow" aria-hidden="true">
      <svg
        className="ai-energy-flow__svg"
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ai-energy-stroke" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6ba3c4" stopOpacity="0.08" />
            <stop offset="40%" stopColor="#8fd4ea" stopOpacity="0.18" />
            <stop offset="72%" stopColor="#6b9bd4" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#5a7ab0" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="ai-energy-trail" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7ec8e3" stopOpacity="0" />
            <stop offset="45%" stopColor="#a8e6ff" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#e8fbff" stopOpacity="0.5" />
            <stop offset="65%" stopColor="#7ec8e3" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#7ec8e3" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ai-energy-traveler-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c8f0ff" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#7ec8e3" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#5a8ab0" stopOpacity="0" />
          </radialGradient>
          <filter id="ai-energy-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ai-energy-node" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="nb" />
            <feMerge>
              <feMergeNode in="nb" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ai-energy-traveler-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="tg" />
            <feMerge>
              <feMergeNode in="tg" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="ai-energy-branch-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6bb7dc" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#8fd4ea" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#8fd4ea" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        {/* Geometry source for getPointAtLength — must match visible spine */}
        <path ref={spinePathRef} d={d} fill="none" stroke="none" opacity={0} aria-hidden />

        <motion.g
          style={{ transformOrigin: '50% 50%' }}
          animate={reduce ? undefined : { opacity: [0.72, 0.92, 0.72] }}
          transition={reduce ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {branchPaths.map((bp, idx) => (
            <path
              key={idx}
              d={bp}
              fill="none"
              stroke="url(#ai-energy-branch-stroke)"
              strokeWidth={1.8}
              strokeLinecap="round"
              filter="url(#ai-energy-glow)"
              opacity={0.52}
            />
          ))}
          <path
            d={d}
            fill="none"
            stroke="url(#ai-energy-stroke)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ai-energy-glow)"
            opacity={0.55}
          />
          <path
            d={d}
            fill="none"
            stroke="url(#ai-energy-stroke)"
            strokeWidth={0.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.42}
          />
          {!reduce && len > 0 && (
            <>
              <motion.path
                d={d}
                fill="none"
                stroke="url(#ai-energy-trail)"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeDasharray={dashPattern}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -len * 1.2 }}
                transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                opacity={0.55}
              />
              <motion.path
                d={d}
                fill="none"
                stroke="rgba(180, 230, 255, 0.18)"
                strokeWidth={0.55}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(6, len * 0.008)} ${Math.max(28, len * 0.05)}`}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -len }}
                transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
              />
            </>
          )}
        </motion.g>

        {nodes.map((n, i) => (
          <g key={i} transform={`translate(${n.x} ${n.y})`}>
            <circle r={10} fill="rgba(100, 180, 220, 0.06)" filter="url(#ai-energy-node)" />
            <circle r={3.2} fill="rgba(200, 240, 255, 0.22)" />
            <circle r={1.35} fill="rgba(240, 252, 255, 0.55)" />
            {!reduce && (
              <motion.circle
                r={5.5}
                fill="none"
                stroke="rgba(140, 210, 235, 0.2)"
                strokeWidth={0.5}
                initial={{ opacity: 0.2 }}
                animate={{ opacity: [0.2, 0.48, 0.2] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.35,
                }}
              />
            )}
          </g>
        ))}

        {traveler && (
          <g transform={`translate(${traveler.x} ${traveler.y})`} className="ai-energy-flow__traveler">
            <circle r={26} fill="url(#ai-energy-traveler-halo)" opacity={0.85} />
            <circle r={8} fill="rgba(126, 200, 227, 0.35)" filter="url(#ai-energy-traveler-glow)" />
            <circle r={3.2} fill="#f8fdff" />
            <circle r={1.25} fill="#ffffff" />
            {!reduce && (
              <motion.circle
                r={14}
                fill="none"
                stroke="rgba(180, 235, 255, 0.35)"
                strokeWidth={0.6}
                animate={{ opacity: [0.35, 0.08, 0.35], r: [12, 18, 12] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
