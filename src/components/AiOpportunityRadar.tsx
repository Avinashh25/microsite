import { useMemo, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence, LayoutGroup } from 'framer-motion';

type Vertical = 'all' | 'Payor' | 'Provider' | 'Life Sciences';

type Opportunity = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagClass: string;
  bars: ('normal' | 'short' | 'long')[];
  rank: number;
  vertical: Vertical;
};

const RADAR_POINTS: { id: string; cx: number; cy: number; fill: string }[] = [
  { id: 'p1', cx: 48, cy: -58, fill: '#5A9278' },
  { id: 'p2', cx: 62, cy: -42, fill: '#7091E6' },
  { id: 'p3', cx: 74, cy: -30, fill: '#6B7694' },
  { id: 'p4', cx: 80, cy: -22, fill: '#6B7694' },
  { id: 'p5', cx: 34, cy: -26, fill: '#7091E6' },
  { id: 'p6', cx: 40, cy: -12, fill: '#A8946A' },
  { id: 'p7', cx: -12, cy: -50, fill: '#6B7694' },
  { id: 'p8', cx: 14, cy: -22, fill: '#8697C4' },
  { id: 'p9', cx: 22, cy: -30, fill: '#5A9278' },
  { id: 'p10', cx: -30, cy: 0, fill: '#7091E6' },
  { id: 'p11', cx: -8, cy: 14, fill: '#ADBBD4' },
  { id: 'p12', cx: -15, cy: 34, fill: '#7091E6' },
  { id: 'p13', cx: -58, cy: 46, fill: '#5A9278' },
  { id: 'p14', cx: -50, cy: 48, fill: '#A8946A' },
  { id: 'p15', cx: -44, cy: 38, fill: '#5A9278' },
  { id: 'p16', cx: -22, cy: 44, fill: '#A8946A' },
  { id: 'p17', cx: 14, cy: 58, fill: '#8697C4' },
];

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'o1',
    title: 'Claims Adjudication Automation',
    subtitle: 'Payor · Operations',
    tag: 'Validate',
    tagClass: 'tag-am',
    bars: ['normal', 'short'],
    rank: 1,
    vertical: 'Payor',
  },
  {
    id: 'o2',
    title: 'Member Engagement Personalization',
    subtitle: 'Payor · CX',
    tag: 'Build',
    tagClass: 'tag-bl',
    bars: ['normal', 'normal'],
    rank: 2,
    vertical: 'Payor',
  },
  {
    id: 'o3',
    title: 'Fraud Detection Enhancement',
    subtitle: 'Payor · Risk',
    tag: 'Explore',
    tagClass: 'tag-gy',
    bars: ['long', 'short'],
    rank: 3,
    vertical: 'Payor',
  },
  {
    id: 'o4',
    title: 'Network Optimization AI',
    subtitle: 'Payor · Strategy',
    tag: 'Explore',
    tagClass: 'tag-gy',
    bars: ['normal', 'short'],
    rank: 4,
    vertical: 'Payor',
  },
  {
    id: 'o5',
    title: 'Clinical Trial Matching Engine',
    subtitle: 'Life Sciences · R&D',
    tag: 'Build',
    tagClass: 'tag-bl',
    bars: ['long', 'normal'],
    rank: 2,
    vertical: 'Life Sciences',
  },
  {
    id: 'o6',
    title: 'Prior Auth Triage Assistant',
    subtitle: 'Provider · Operations',
    tag: 'Validate',
    tagClass: 'tag-am',
    bars: ['normal', 'long'],
    rank: 3,
    vertical: 'Provider',
  },
];

function pointJitterMs(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i) * (i + 3)) % 200;
  }
  return 50 + (h % 151);
}

const AXIS_LABELS: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fromX: number;
  fromY: number;
}[] = [
  { text: 'Feasibility', x: 0, y: -105, anchor: 'middle', fromX: 0, fromY: -32 },
  { text: 'Value', x: 105, y: 2, anchor: 'end', fromX: 36, fromY: 2 },
  { text: 'Compliance', x: 0, y: 115, anchor: 'middle', fromX: 0, fromY: 36 },
  { text: 'Readiness', x: -105, y: 2, anchor: 'start', fromX: -36, fromY: 2 },
];

const ZONE_LABELS: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fill: string;
  fromX: number;
  fromY: number;
}[] = [
  { text: 'Explore', x: -65, y: -55, anchor: 'start', fill: '#7091E6', fromX: -22, fromY: -18 },
  { text: 'Validate', x: -30, y: -32, anchor: 'start', fill: '#A8946A', fromX: -10, fromY: -10 },
  { text: 'Build', x: 20, y: -12, anchor: 'start', fill: '#8697C4', fromX: 7, fromY: -4 },
  { text: 'Scale', x: 65, y: -12, anchor: 'start', fill: '#5A9278', fromX: 22, fromY: -4 },
];

const VERTICAL_CYCLE: Vertical[] = ['all', 'Payor', 'Provider', 'Life Sciences'];

function ribClass(kind: 'normal' | 'short' | 'long') {
  if (kind === 'short') return 'rib short';
  if (kind === 'long') return 'rib long';
  return 'rib';
}

export function AiOpportunityRadar() {
  const engineRef = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState<Vertical>('all');
  const [sortMode, setSortMode] = useState<'rank' | 'stage'>('rank');

  const inView = useInView(engineRef, {
    once: true,
    amount: 0.28,
  });

  const filtered = useMemo(() => {
    const list =
      vertical === 'all'
        ? OPPORTUNITIES
        : OPPORTUNITIES.filter((o) => o.vertical === vertical);
    const next = [...list];
    if (sortMode === 'rank') {
      next.sort((a, b) => a.rank - b.rank);
    } else {
      const order = ['Explore', 'Validate', 'Build'];
      next.sort(
        (a, b) => order.indexOf(a.tag) - order.indexOf(b.tag) || a.rank - b.rank
      );
    }
    return next;
  }, [vertical, sortMode]);

  const countLabel = `${filtered.length} opportunities`;

  return (
    <div ref={engineRef} className="screen-body screen-body-light radar-engine">
      <div className="radar-head">
        <div>
          <motion.div
            className="radar-eye"
            initial={{ opacity: 0, y: -4 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            Opportunity Intelligence
          </motion.div>
          <motion.div
            className="radar-title"
            initial={{ opacity: 0, y: 4 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            AI Opportunity Radar
          </motion.div>
          <motion.div
            className="radar-sub"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.35, delay: 0.12 }}
          >
            Explore AI opportunities. Click any point to see details.
          </motion.div>
        </div>
        <button type="button" className="radar-cta" aria-label="Radar actions">
          ···
        </button>
      </div>
      <div className="radar-filters">
        <span className="radar-fl">Filter:</span>
        <button
          type="button"
          className="radar-chip radar-chip-interactive"
          onClick={() => {
            const i = VERTICAL_CYCLE.indexOf(vertical);
            setVertical(VERTICAL_CYCLE[(i + 1) % VERTICAL_CYCLE.length]);
          }}
        >
          {vertical === 'all' ? 'All Verticals' : vertical} ▾
        </button>
        <button
          type="button"
          className="radar-chip radar-chip-interactive"
          onClick={() =>
            setSortMode((m) => (m === 'rank' ? 'stage' : 'rank'))
          }
        >
          {sortMode === 'rank' ? 'By rank' : 'By stage'} ▾
        </button>
        <span className="radar-chip radar-chip-count">{countLabel}</span>
      </div>
      <div className="radar-wrap">
        <div className="radar-canvas">
          <svg
            viewBox="-110 -110 220 220"
            className="radar-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="radarPointGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle r="100" fill="none" stroke="#5A9278" strokeWidth="0.6" opacity="0.45" />
            <circle
              r="75"
              fill="none"
              stroke="#A8946A"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.42"
            />
            <circle
              r="50"
              fill="none"
              stroke="#7091E6"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.45"
            />
            <circle
              r="25"
              fill="none"
              stroke="#8697C4"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              opacity="0.45"
            />
            <line x1="-110" y1="0" x2="110" y2="0" stroke="#ADBBD4" strokeWidth="0.4" opacity="0.55" />
            <line x1="0" y1="-110" x2="0" y2="110" stroke="#ADBBD4" strokeWidth="0.4" opacity="0.55" />

            {inView &&
              [0, 1, 2].map((i) => (
                <motion.circle
                  key={`wave-${i}`}
                  cx={0}
                  cy={0}
                  r={12}
                  fill="none"
                  stroke="rgba(112, 145, 230, 0.22)"
                  strokeWidth={0.85}
                  initial={false}
                  animate={{ r: [11, 108], opacity: [0.32, 0] }}
                  transition={{
                    duration: 4.25,
                    repeat: Infinity,
                    ease: [0.22, 1, 0.36, 1],
                    delay: i * 1.42,
                    repeatDelay: 0,
                  }}
                />
              ))}

            {AXIS_LABELS.map((l, i) => (
              <motion.text
                key={l.text}
                textAnchor={l.anchor}
                fontSize={6}
                fontFamily="Inter, system-ui, sans-serif"
                initial={{ opacity: 0, x: l.fromX, y: l.fromY, fill: '#ADBBD4' }}
                animate={
                  inView ? { opacity: 1, x: l.x, y: l.y, fill: '#6B7694' } : {}
                }
                transition={{
                  opacity: { duration: 0.45, delay: i * 0.28, ease: [0.22, 1, 0.36, 1] },
                  x: { duration: 0.55, delay: i * 0.28, ease: [0.22, 1, 0.36, 1] },
                  y: { duration: 0.55, delay: i * 0.28, ease: [0.22, 1, 0.36, 1] },
                  fill: { duration: 0.45, delay: i * 0.28 + 0.08 },
                }}
                style={{
                  filter: inView ? 'drop-shadow(0 0 3px rgba(112,145,230,0.35))' : undefined,
                }}
              >
                {l.text}
              </motion.text>
            ))}

            {ZONE_LABELS.map((l, i) => (
              <motion.text
                key={l.text}
                textAnchor={l.anchor}
                fontSize={4.5}
                fontFamily="Inter, system-ui, sans-serif"
                initial={{ opacity: 0, x: l.fromX, y: l.fromY, fill: l.fill }}
                animate={inView ? { opacity: 1, x: l.x, y: l.y, fill: l.fill } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.85 + i * 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  filter: inView ? 'drop-shadow(0 0 4px rgba(112,145,230,0.28))' : undefined,
                }}
              >
                {l.text}
              </motion.text>
            ))}

            <g className="radar-pts">
              {RADAR_POINTS.map((p, i) => {
                const jitter = pointJitterMs(p.id) / 1000;
                return (
                  <g key={p.id} transform={`translate(${p.cx},${p.cy})`}>
                    <motion.circle
                      cx={0}
                      cy={0}
                      r={3.5}
                      fill={p.fill}
                      filter="url(#radarPointGlow)"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={
                        inView
                          ? {
                              opacity: [0, 1, 1],
                              scale: [0, 1.28, 1],
                            }
                          : {}
                      }
                      transition={{
                        delay: i * 0.045 + jitter,
                        duration: 0.62,
                        times: [0, 0.58, 1],
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="radar-legend">
            <span>
              <i style={{ background: '#7091E6' }} />
              Payor
            </span>
            <span>
              <i style={{ background: '#5A9278' }} />
              Provider
            </span>
            <span>
              <i style={{ background: '#8697C4' }} />
              Life Sciences
            </span>
            <span>
              <i style={{ background: '#A8946A' }} />
              Medtech
            </span>
            <span>
              <i style={{ background: '#6B7694' }} />
              Cross-Industry
            </span>
          </div>
        </div>
        <div className="radar-list radar-list-stream">
          <div className="radar-list-h">Opportunities</div>
          <LayoutGroup id="radar-opportunities">
            <AnimatePresence initial={false} mode="popLayout">
              {filtered.map((opp, index) => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  index={index}
                  inView={inView}
                  isTop={index === 0}
                />
              ))}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({
  opp,
  index,
  inView,
  isTop,
}: {
  opp: Opportunity;
  index: number;
  inView: boolean;
  isTop: boolean;
}) {
  const baseDelay = 0.12 + index * 0.2;

  return (
    <motion.div
      layout
      layoutId={opp.id}
      className={`radar-item ${isTop ? 'radar-item--top' : 'radar-item--dim'}`}
      initial={{ opacity: 0, x: 22, filter: 'blur(8px)' }}
      animate={
        inView
          ? {
              opacity: isTop ? 1 : 0.86,
              x: 0,
              filter: 'blur(0px)',
              scale: isTop ? 1.02 : 1,
            }
          : { opacity: 0, x: 22, filter: 'blur(8px)', scale: 1 }
      }
      exit={{ opacity: 0, x: 14, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      transition={{
        layout: { type: 'tween', duration: 0.38, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.42, delay: baseDelay, ease: [0.22, 1, 0.36, 1] },
        x: { duration: 0.46, delay: baseDelay, ease: [0.22, 1, 0.36, 1] },
        filter: { duration: 0.4, delay: baseDelay },
        scale: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <motion.div
        className="ri-t"
        initial={{ opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{
          delay: baseDelay + 0.06,
          duration: 0.36,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {opp.title}
      </motion.div>
      <motion.div
        className="ri-s"
        initial={{ opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{
          delay: baseDelay + 0.12,
          duration: 0.34,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {opp.subtitle}
      </motion.div>
      <motion.div
        className="ri-bars"
        initial={{ opacity: 0, y: 5 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{
          delay: baseDelay + 0.18,
          duration: 0.34,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {opp.bars.map((b, bi) => (
          <motion.span
            key={`${opp.id}-b-${bi}`}
            className={ribClass(b)}
            initial={{ scaleX: 0.2 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{
              delay: baseDelay + 0.14 + bi * 0.05,
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ transformOrigin: 'left center', display: 'inline-block' }}
          />
        ))}
        <motion.span
          className={`ri-tag ${opp.tagClass}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{
            duration: 0.34,
            ease: [0.22, 1, 0.36, 1],
            delay: baseDelay + 0.28,
          }}
        >
          {opp.tag}
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
