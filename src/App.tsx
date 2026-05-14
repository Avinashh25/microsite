import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import img2 from './assets/img2.png';
import img3 from './assets/img3.png';
import img4 from './assets/img4.svg';
import whyTruth from './assets/why-truth.svg';
import whyContext from './assets/why-context.svg';
import whyGovernance from './assets/why-governance.svg';
import { AiEnergyFlowOverlay } from './components/AiEnergyFlowOverlay';
import { AiOpportunityRadar } from './components/AiOpportunityRadar';
import { TestimonialsSlider } from './components/TestimonialsSlider';
import { PlatformRail } from './components/PlatformRail';

// ─── PipelineArc ─────────────────────────────────────────────────────────────
const PIPELINE_LABELS = [
  { label: 'Decide',     pct: 0.08 },
  { label: 'Design',     pct: 0.25 },
  { label: 'Accelerate', pct: 0.50 },
  { label: 'Govern',     pct: 0.75 },
  { label: 'Reuse',      pct: 0.92 },
];

function PipelineArc() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const w = wrap.clientWidth;
      const baseH = Math.round(w * 0.32);
      const h = baseH + 180; // Added height for the vertical line
      canvas.width  = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let startTs = 0;
    const DRAW_DUR = 1800;
    const DELAY    = 400;

    // Smooth tracking of scroll-driven dot progress
    let currentDotProgress = 0;

    const getBezierXY = (t: number, sx: number, sy: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, ex: number, ey: number) => {
      const mt = 1 - t;
      const x = mt*mt*mt*sx + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*ex;
      const y = mt*mt*mt*sy + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*ey;
      return { x, y };
    };

    const frame = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs - DELAY;
      const raw = Math.min(1, Math.max(0, elapsed / DRAW_DUR));
      const p = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;

      const W  = canvas.width  / devicePixelRatio;
      const H  = canvas.height / devicePixelRatio;
      // We increased canvas height by 180, so the convergence point is at H - 180 - 8
      const cx = W / 2;
      const cy = H - 188;

      // Track scroll progress for the travelling dots
      const scrollY = window.scrollY || 0;
      // Map scroll 50px -> 450px to 0 -> 1 progress
      const targetDotProgress = Math.min(1, Math.max(0, (scrollY - 50) / 400));
      currentDotProgress += (targetDotProgress - currentDotProgress) * 0.08;

      ctx.clearRect(0, 0, W, H);
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0,   '#0e1326');
      bgGrad.addColorStop(0.5, '#0d1228');
      bgGrad.addColorStop(1,   '#0b1020');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // top rule
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(W, 1);
      ctx.strokeStyle = 'rgba(126,205,233,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Draw branching lines ─────────────────────────────────────────────
      PIPELINE_LABELS.forEach(({ pct }) => {
        const finalX = pct * W;
        const targetX = cx + (finalX - cx) * p;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.bezierCurveTo(cx, cy * 0.6, targetX, cy * 0.4, targetX, 0);

        ctx.shadowColor = '#4aa8c0';
        ctx.shadowBlur  = 12;
        ctx.strokeStyle = `rgba(74,168,192,${0.6 * p})`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      });

      // Centre glowing dot at the bottom of the curves
      if (p > 0.1) {
        const arriveIntensity = Math.pow(currentDotProgress, 4); // Sharp increase when dots arrive
        const pulse = 0.5 + 0.5 * Math.sin(ts * 0.003) + arriveIntensity * 0.5;
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24 + arriveIntensity * 12);
        bg.addColorStop(0, `rgba(126,205,233,${0.3 * p + pulse * 0.15})`);
        bg.addColorStop(1, 'rgba(126,205,233,0)');
        ctx.beginPath(); ctx.arc(cx, cy, 24 + arriveIntensity * 12, 0, Math.PI * 2);
        ctx.fillStyle = bg; ctx.fill();
        
        ctx.beginPath(); ctx.arc(cx, cy, 4 + arriveIntensity * 2, 0, Math.PI * 2);
        ctx.fillStyle = '#effcff';
        ctx.shadowColor = '#7ecde9'; ctx.shadowBlur = 16 + arriveIntensity * 12;
        ctx.fill(); ctx.shadowBlur = 0;
        
        // Descending vertical line from the dot
        const lineGrad = ctx.createLinearGradient(cx, cy, cx, H);
        lineGrad.addColorStop(0, `rgba(126,200,227,${0.8 * p})`); // #7ec8e3
        lineGrad.addColorStop(1, 'rgba(126,200,227,0)');
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + (H - cy) * p); // Animate drawing downwards
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw travelling glowing dots along each curve
        if (currentDotProgress > 0.01) {
          PIPELINE_LABELS.forEach(({ pct }) => {
            const finalX = pct * W;
            const targetX = cx + (finalX - cx) * p;

            // Curve starts at top (targetX, 0) and ends at convergence (cx, cy)
            const { x, y } = getBezierXY(currentDotProgress, targetX, 0, targetX, cy * 0.4, cx, cy * 0.6, cx, cy);

            // Subtle cyan radial glow
            const dotGlow = ctx.createRadialGradient(x, y, 0, x, y, 14);
            dotGlow.addColorStop(0, `rgba(126, 200, 227, ${0.7 * p})`);
            dotGlow.addColorStop(1, 'rgba(126, 200, 227, 0)');
            ctx.beginPath();
            ctx.arc(x, y, 14, 0, Math.PI * 2);
            ctx.fillStyle = dotGlow;
            ctx.fill();

            // Bright white dot center
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#7ec8e3';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          });
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return (
    <div className="hero-pipeline" aria-label="Platform stages" ref={wrapRef}>
      <canvas ref={canvasRef} className="pipeline-canvas" aria-hidden="true" />
      <div className="pipeline-labels">
        {PIPELINE_LABELS.map(({ label, pct }) => (
          <span key={label} className="pipeline-label" style={{ left: `${pct * 100}%` }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];


const VIEWPORT_ONCE = { once: true as const, amount: 0.15 as const, margin: '0px 0px -12% 0px' as const };

function ScrollRevealHeading() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start 85%', 'start 40%']
  });

  const words1 = "Enterprise AI deserves".split(" ");
  const words2 = "an operating system of its own.".split(" ");
  const allWords = [...words1, ...words2];

  return (
    <div ref={container} style={{ textAlign: 'left', marginBottom: '80px', paddingLeft: '6%' }}>
      <h2 style={{ fontSize: 'clamp(40px, 5vw, 56px)', fontWeight: 700, margin: 0, lineHeight: 1.15 }}>
        {allWords.map((word, i) => {
          const start = i / allWords.length;
          const end = start + (1 / allWords.length);
          
          // All words start dim and animate to light blue sequentially
          const targetColor = 'rgba(137, 208, 245, 1)';
          const startColor = 'rgba(255, 255, 255, 0.25)';
          
          const color = useTransform(scrollYProgress, [start, end], [startColor, targetColor]);
          
          const targetShadow = '0px 0px 24px rgba(137, 208, 245, 0.4)';
          const textShadow = useTransform(scrollYProgress, [start, end], ['0px 0px 0px rgba(137, 208, 245, 0)', targetShadow]);

          return (
            <span key={i}>
              <motion.span style={{ color, textShadow, display: 'inline-block' }}>
                {word}
              </motion.span>
              {i === words1.length - 1 ? <br /> : <span style={{ display: 'inline-block', width: '0.28em' }} />}
            </span>
          );
        })}
      </h2>
    </div>
  );
}

export default function App() {
  const appRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const blueprintRef = useRef<HTMLDivElement>(null);
  const bpTimersRef = useRef<number[]>([]);
  const scoreRafRef = useRef<number | null>(null);
  const [bpStarted, setBpStarted] = useState(false);
  const [processingActive, setProcessingActive] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [cardStates, setCardStates] = useState<Array<'hidden' | 'loading' | 'done'>>([
    'hidden',
    'hidden',
    'hidden',
    'hidden'
  ]);
  const [scoreValue, setScoreValue] = useState(0);
  const [scoreStarted, setScoreStarted] = useState(false);
  const [approvedVisible, setApprovedVisible] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);

  const reducedMotion = useReducedMotion();
  const reduce = reducedMotion === true;
  const { scrollY } = useScroll();
  const heroParallaxY = useTransform(scrollY, [0, 900], [0, 140]);

  const sectionVariants = useMemo(
    () =>
      reduce
        ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
        : {
            hidden: { opacity: 0, y: 40 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.78, ease: EASE },
            },
          },
    [reduce]
  );

  const staggerContainer = useMemo(
    () =>
      reduce
        ? { hidden: {}, visible: {} }
        : {
            hidden: {},
            visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
          },
    [reduce]
  );

  const staggerItem = useMemo(
    () =>
      reduce
        ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
        : {
            hidden: { opacity: 0, y: 32 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.72, ease: EASE },
            },
          },
    [reduce]
  );

  const heroWord = useMemo(
    () =>
      reduce
        ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
        : {
            hidden: { opacity: 0, y: 22 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.68, ease: EASE },
            },
          },
    [reduce]
  );

  const heroSubVariants = useMemo(
    () =>
      reduce
        ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
        : {
            hidden: { opacity: 0, y: 28 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.72, ease: EASE, delay: 0.48 },
            },
          },
    [reduce]
  );

  const bpSteps = ['Intake', 'Generating', 'Blueprint', 'Governance', 'Export'];
  const bpRows = [
    {
      num: '01 · EXECUTIVE SUMMARY',
      title: 'Claims Auto-Adjudication Agent',
      val: '99.5% accuracy target · Payor vertical'
    },
    {
      num: '03 · DOMAIN CONTEXT',
      title: 'Healthcare · HIPAA · HITRUST',
      val: 'PHI masking required · client-specific constraints'
    },
    {
      num: '06 · AGENT ARCHITECTURE',
      title: 'Agentic · Planner → Builder → Verifier',
      val: 'Orchestration pattern · multi-agent'
    },
    {
      num: '09 · TEST CONTRACT',
      title: '142 test cases · 85% coverage target',
      val: 'Functional + security validation included'
    }
  ];
  const bpBars = [
    { height: 22, hi: true },
    { height: 18, hi: true },
    { height: 20, hi: true },
    { height: 14, hi: false },
    { height: 19, hi: true },
    { height: 12, hi: false },
    { height: 16, hi: true },
    { height: 21, hi: true }
  ];

  useLayoutEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const syncNavScrollOffset = () => {
      const h = Math.ceil(navEl.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--nav-scroll-offset', `${h}px`);
    };

    syncNavScrollOffset();
    document.fonts?.ready?.then(syncNavScrollOffset).catch(() => {});
    const ro = new ResizeObserver(syncNavScrollOffset);
    ro.observe(navEl);
    window.addEventListener('resize', syncNavScrollOffset);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncNavScrollOffset);
    };
  }, []);

  /** In-page anchors: scroll so section top clears the fixed nav (measured at scroll time). */
  const scrollToSectionId = useCallback((id: string, behavior: ScrollBehavior) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navEl = navRef.current;
    const offset = navEl
      ? Math.ceil(navEl.getBoundingClientRect().height)
      : Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-scroll-offset')
        ) || 0;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior });
  }, []);

  useLayoutEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    const id = decodeURIComponent(raw);
    if (!document.getElementById(id)) return;
    scrollToSectionId(id, 'auto');
  }, [scrollToSectionId]);

  useEffect(() => {
    const root = appRef.current;
    if (!root) return;

    const prefersSmooth = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const a = target.closest('a');
      if (!(a instanceof HTMLAnchorElement) || !a.hash) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      const hash = url.hash;
      if (!hash || hash === '#') return;
      const id = decodeURIComponent(hash.slice(1));
      if (!id || !document.getElementById(id)) return;

      e.preventDefault();
      const smooth: ScrollBehavior = prefersSmooth() ? 'smooth' : 'auto';
      scrollToSectionId(id, smooth);
      if (window.location.hash !== hash) {
        history.pushState(null, '', hash);
      }
    };

    const onPopState = () => {
      const raw = window.location.hash.slice(1);
      if (!raw) {
        window.scrollTo({ top: 0, behavior: prefersSmooth() ? 'smooth' : 'auto' });
        return;
      }
      const id = decodeURIComponent(raw);
      if (!document.getElementById(id)) return;
      scrollToSectionId(id, prefersSmooth() ? 'smooth' : 'auto');
    };

    root.addEventListener('click', onClick);
    window.addEventListener('popstate', onPopState);
    return () => {
      root.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
    };
  }, [scrollToSectionId]);

  useEffect(() => {
    // Add scroll event logic
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const wh = window.innerHeight;
      const maxScroll = document.body.scrollHeight - wh;
      const progress = Math.max(0, Math.min(1, scrollY / maxScroll));
      document.body.style.setProperty('--scroll-progress', progress.toString());
      
      const nav = document.querySelector('.nav');
      if (nav) {
        if (scrollY > 50) {
          nav.setAttribute('data-scrolled', 'true');
        } else {
          nav.removeAttribute('data-scrolled');
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const target = blueprintRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setBpStarted(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!bpStarted) return;

    const STEP_INTERVAL = 700;
    const STEP_COMPLETE_OFFSET = 490;
    const CARD_START_DELAY = 240;
    const CARD_STAGGER = 330;
    const CARD_LOADING_MS = 380;

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      bpTimersRef.current.push(id);
    };

    setProcessingActive(true);
    setPipelineComplete(false);
    setActiveStep(0);
    setCompletedSteps(0);
    setCardStates(['hidden', 'hidden', 'hidden', 'hidden']);
    setScoreStarted(false);
    setScoreValue(0);
    setApprovedVisible(false);

    bpSteps.forEach((_, i) => {
      schedule(() => setActiveStep(i), i * STEP_INTERVAL);
      schedule(() => setCompletedSteps(i + 1), i * STEP_INTERVAL + STEP_COMPLETE_OFFSET);
    });

    const stepperTotalMs = (bpSteps.length - 1) * STEP_INTERVAL + STEP_COMPLETE_OFFSET;
    bpRows.forEach((_, i) => {
      const loadingAt = stepperTotalMs + CARD_START_DELAY + i * CARD_STAGGER;
      const resolveAt = loadingAt + CARD_LOADING_MS;
      schedule(() => {
        setCardStates((prev) => {
          const next = [...prev];
          next[i] = 'loading';
          return next;
        });
      }, loadingAt);
      schedule(() => {
        setCardStates((prev) => {
          const next = [...prev];
          next[i] = 'done';
          return next;
        });
      }, resolveAt);
    });

    const cardsDoneAt =
      stepperTotalMs + CARD_START_DELAY + (bpRows.length - 1) * CARD_STAGGER + CARD_LOADING_MS;
    schedule(() => {
      setProcessingActive(false);
      setPipelineComplete(true);
      setScoreStarted(true);

      const scoreTarget = 82;
      const duration = 1100;
      const start = performance.now();
      const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
      const animate = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = easeOut(t);
        const raw = Math.round(scoreTarget * eased);
        setScoreValue(Math.max(0, Math.min(scoreTarget, raw)));
        if (t < 1) {
          scoreRafRef.current = window.requestAnimationFrame(animate);
        } else {
          setScoreValue(scoreTarget);
          schedule(() => setApprovedVisible(true), 150);
        }
      };
      scoreRafRef.current = window.requestAnimationFrame(animate);
    }, cardsDoneAt + 260);

    return () => {
      bpTimersRef.current.forEach((id) => window.clearTimeout(id));
      bpTimersRef.current = [];
      if (scoreRafRef.current !== null) {
        window.cancelAnimationFrame(scoreRafRef.current);
        scoreRafRef.current = null;
      }
    };
  }, [bpStarted]);

  return (
    <div className="app-container" ref={appRef}>
      <AiEnergyFlowOverlay containerRef={appRef} />

{/* ============================================================
     NAV
     ============================================================ */}
<header ref={navRef} className="nav" data-nav="">
  <a className="nav-brand" href="#top" aria-label="SENZAI">
    <img src={img2} alt="SENZAI" className="nav-mark" />
  </a>
  <nav className="nav-links" aria-label="Primary">
    <a href="#problem">Why Senzai</a>
    <a href="#decide">Decide</a>
    <a href="#design">Design</a>
    <a href="#accelerate">Accelerate</a>
    <a href="#govern">Govern</a>
    <a href="#reuse">Reuse</a>
  </nav>
  <div className="nav-actions">
    <motion.a
      className="nav-cta-ghost"
      href="#problem"
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.22, ease: EASE }}
    >
      Explore Platform
    </motion.a>
    <motion.a
      className="nav-cta"
      href="#cta"
      whileHover={reduce ? undefined : { y: -2, scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.26, ease: EASE }}
    >
      Request Demo
    </motion.a>
  </div>
</header>


{/* ============================================================
     SECTIONS — scroll the page, the world reacts.
     Each section is a "stage" the camera moves to.
     ============================================================ */}
<main id="top">

  {/* HERO */}
  <motion.section
    className="stage stage-hero"
    data-stage-id="hero"
    id="hero"
    initial="hidden"
    animate="visible"
    variants={sectionVariants}
  >
    <div className="stage-inner hero-inner">
      <motion.div className="hero-parallax-bg" style={{ y: reduce ? 0 : heroParallaxY }} aria-hidden>
        <div className="hero-parallax-blob hero-parallax-blob--a" />
        <div className="hero-parallax-blob hero-parallax-blob--b" />
      </motion.div>
      <div className="hero-title-aurora" aria-hidden />
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="hero-eyebrow" variants={staggerItem}>
          <span className="dot"></span>
          Infinite's Enterprise AI Delivery Operating System
        </motion.div>
        <motion.h1 className="hero-title" variants={heroWord}>
          Built to Deliver.
        </motion.h1>
        <motion.p className="hero-sub" variants={heroSubVariants}>
          From raw idea to governed AI outcome — one continuous loop.
          Scored. Blueprinted. Built. Governed. Every output a reusable asset.
        </motion.p>
        <motion.div className="hero-ctas" variants={staggerItem}>
          <motion.a
            className="btn btn-primary"
            href="#cta"
            whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
            whileTap={reduce ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            Request a Demo<span aria-hidden="true">→</span>
          </motion.a>
          <motion.a
            className="btn btn-ghost"
            href="#problem"
            whileHover={reduce ? undefined : { y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            Explore the Platform
          </motion.a>
        </motion.div>
      </motion.div>
    </div>
  </motion.section>

  {/* PIPELINE ARC — animated canvas */}
  <PipelineArc />

  {/* PROBLEM */}
  <motion.section
    className="stage stage-problem"
    data-stage-id="problem"
    id="problem"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
    style={{ paddingTop: '16px' }}
  >
    <motion.div className="stage-inner" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
      <ScrollRevealHeading />
      <motion.div className="problem-grid" variants={staggerItem}>
        <article className="problem-card" style={{"--i":"0"} as any} tabIndex={0} aria-label="No single source of truth">
          <div className="flip-card-inner">
            <div className="flip-card-face flip-card-front">
              <div className="problem-num">01</div>
              <div className="problem-media">
                <img src={whyTruth} alt="" loading="lazy" />
              </div>
              <h3>No single source of truth</h3>
            </div>
            <div className="flip-card-face flip-card-back">
              <div className="problem-num">01</div>
              <h3>No single source of truth</h3>
              <p>
                Without a governed Blueprint, every team interprets intent differently. Context drifts across runs, tools, and people — outputs diverge from what the business actually needed.
              </p>
            </div>
          </div>
        </article>
        <article className="problem-card" style={{"--i":"1"} as any} tabIndex={0} aria-label="Generic context, generic output">
          <div className="flip-card-inner">
            <div className="flip-card-face flip-card-front">
              <div className="problem-num">02</div>
              <div className="problem-media">
                <img src={whyContext} alt="" loading="lazy" />
              </div>
              <h3>Generic context, generic output</h3>
            </div>
            <div className="flip-card-face flip-card-back">
              <div className="problem-num">02</div>
              <h3>Generic context, generic output</h3>
              <p>
                AI without domain knowledge — industry patterns, client constraints, compliance rules — produces generic results. Precision requires context baked in from the start, not patched on later.
              </p>
            </div>
          </div>
        </article>
        <article className="problem-card" style={{"--i":"2"} as any} tabIndex={0} aria-label="Speed without governance">
          <div className="flip-card-inner">
            <div className="flip-card-face flip-card-front">
              <div className="problem-num">03</div>
              <div className="problem-media">
                <img src={whyGovernance} alt="" loading="lazy" />
              </div>
              <h3>Speed without governance</h3>
            </div>
            <div className="flip-card-face flip-card-back">
              <div className="problem-num">03</div>
              <h3>Speed without governance</h3>
              <p>
                Ungoverned AI velocity creates security gaps, audit failures, and technical debt that compounds faster than the code itself. Faster is only better when it's also governed.
              </p>
            </div>
          </div>
        </article>
      </motion.div>
    </motion.div>
  </motion.section>


  {/* LOOP REVEAL — split hero + stage rail */}
  <motion.section
    className="stage stage-loop"
    data-stage-id="loop"
    id="loop"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div
      className="stage-inner loop-hero-inner"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
    >
      <motion.div className="loop-hero-pill-wrap" variants={staggerItem}>
        <div className="loop-hero-pill">The SENZAI Loop</div>
      </motion.div>

      <motion.div className="loop-hero-split" variants={staggerContainer}>
        <motion.div className="loop-hero-left" variants={staggerItem}>
          <h2
            className="loop-hero-title"
            aria-label="One continuous operating loop from demand to delivery."
          >
            <span className="loop-hero-title-line">One continuous</span>
            <span className="loop-hero-title-line">operating loop</span>
            <span className="loop-hero-title-line">from demand</span>
            <span className="loop-hero-title-line">to delivery.</span>
          </h2>
        </motion.div>

        <motion.div className="loop-hero-divider" aria-hidden="true" variants={staggerItem}>
          <span className="loop-hero-divider-line" />
          <span className="loop-hero-divider-dot" />
        </motion.div>

        <motion.div className="loop-hero-right" variants={staggerItem}>
          <p className="loop-hero-mono">
            SENZAI centralizes intake, portfolio governance, blueprinting, factory execution, and reusable AI assets in one controlled system. Five stages. One ring of governance around all of them.
          </p>
        </motion.div>
      </motion.div>

      {/* Static 5 step cards */}
      <motion.div className="loop-steps" variants={staggerItem}>
        {[
          { num: '01', label: 'Decide' },
          { num: '02', label: 'Design' },
          { num: '03', label: 'Accelerate' },
          { num: '04', label: 'Govern' },
          { num: '05', label: 'Reuse' },
        ].map((s) => (
          <div className="loop-step" key={s.num}>
            <span className="ls-n">{s.num}</span>
            <span className="ls-t">{s.label}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  </motion.section>


  {/* ── PLATFORM (Drum Rail + Sections) ── */}
  <div className="platform-stages-shell" id="platform">
    <PlatformRail scrollToSection={(id, b) => scrollToSectionId(id, b ?? 'smooth')} />
    <div className="platform-stages-main">


  {/* DECIDE */}
  <motion.section
    className="stage stage-decide"
    data-stage-id="decide"
    id="decide"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div className="stage-inner split" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
      <motion.div className="split-copy" variants={staggerItem}>
        <div className="eyebrow">01 · Decide</div>
        <h2>Score every idea.<br />Build only the right ones.</h2>
        <p className="lede">
          Opportunity Radar surfaces and scores AI initiatives across value, feasibility, readiness, and compliance. Every idea is routed — Build, Validate, Explore, or Defer — before a single sprint is planned.
        </p>
        <ul className="bullets">
          <li>
            <strong>Multi-dimension scoring at intake.</strong>
            Value · Feasibility · Readiness · Compliance — a clear signal before any commitment.
          </li>
          <li>
            <strong>Visual opportunity landscape.</strong>
            Interactive radar heatmap. Spot patterns, verticals, and priorities your leadership can act on.
          </li>
          <li>
            <strong>Routed into Portfolio Pipeline.</strong>
            Promoted ideas flow directly into the governed pipeline — Idea → Validating → Blueprinted → In Factory → Live.
          </li>
        </ul>
      </motion.div>
      <motion.div className="split-art" variants={staggerItem}>
        <div className="screen tilt">
          <div className="screen-bar">
            <span className="dot dot-r"></span><span className="dot dot-y"></span><span className="dot dot-g"></span>
            <span className="screen-title">AI Opportunity Radar</span>
          </div>
          <AiOpportunityRadar />
        </div>
      </motion.div>
    </motion.div>
  </motion.section>


  {/* DESIGN */}
  <motion.section
    className="stage stage-design"
    data-stage-id="design"
    id="design"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div className="stage-inner split split-flip" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
      <motion.div className="split-copy" variants={staggerItem}>
        <div className="eyebrow">02 · Design</div>
        <h2>One Blueprint.<br />Every agent builds from it.</h2>
        <p className="lede">
          Blueprint Studio turns intent into a governed specification — 14 sections covering architecture, domain context, compliance, governance gates, and test contracts. Frozen at approval. Immutable in the Factory. The single source of truth for everything downstream.
        </p>
        <ul className="bullets">
          <li>
            <strong>Domain and client context, built in.</strong>
            Healthcare logic, financial rules, client-specific constraints — precision from the start, not retrofitted.
          </li>
          <li>
            <strong>Three governance gates.</strong>
            Blueprint only enters Factory after passing structured approval. No unapproved build ever runs.
          </li>
          <li>
            <strong>New Build and Modernize modes.</strong>
            Same governed Blueprint process — different starting points. Greenfield or existing system transformation.
          </li>
        </ul>
      </motion.div>
      <motion.div className="split-art" variants={staggerItem}>
        <div className="screen tilt tilt-flip">
          <div className="screen-bar">
            <span className="dot dot-r"></span><span className="dot dot-y"></span><span className="dot dot-g"></span>
            <span className="screen-title">Blueprint Studio</span>
          </div>
          <div
            className={`screen-body screen-body-light bp-sim ${processingActive ? 'is-processing' : ''} ${pipelineComplete ? 'is-complete' : ''}`}
            ref={blueprintRef}
          >
            <div className="bp-processing-overlay" aria-hidden="true"></div>
            <div className="bp-steps">
              {bpSteps.map((label, i) => {
                const stateClass = i < completedSteps ? 'done' : i === activeStep ? 'act' : 'wait';
                return (
                  <div className="bp-step" key={label}>
                    <div className={`bp-step-n ${stateClass}`}>{i < completedSteps ? '✓' : i + 1}</div>
                    <div className="bp-step-l">{label}</div>
                  </div>
                );
              })}
            </div>
            {bpRows.map((row, i) => (
              <div
                className={`bp-row ${cardStates[i] === 'done' ? 'done is-done' : ''} ${cardStates[i] === 'loading' ? 'is-loading' : ''}`}
                key={row.num}
              >
                <div className="bp-row-ping" aria-hidden="true"></div>
                <div className="bp-row-num">{row.num}</div>
                <div className="bp-row-title">{row.title}</div>
                <div className="bp-row-val">{row.val}</div>
              </div>
            ))}
            <div className={`bp-score ${scoreStarted ? 'is-live' : ''} ${approvedVisible ? 'is-approved' : ''}`}>
              <div>
                <div className="bps-l">SenzScore</div>
                <div className="bps-d">{approvedVisible ? '8 dimensions · Approved' : '8 dimensions · Validating...'}</div>
              </div>
              <div className="bps-right">
                <div className="bps-bars">
                  {bpBars.map((bar, i) => (
                    <span
                      key={`bar-${i}`}
                      style={{ height: `${bar.height}px`, transitionDelay: `${i * 90}ms` }}
                      className={bar.hi ? 'hi' : ''}
                    ></span>
                  ))}
                </div>
                <div className="bps-v">{scoreValue}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </motion.section>


  {/* ACCELERATE */}
  <motion.section
    className="stage stage-accelerate"
    data-stage-id="accelerate"
    id="accelerate"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div className="stage-inner" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
      <motion.div className="section-head section-head-center" variants={staggerItem}>
        <div className="eyebrow">03 · Accelerate</div>
        <h2>Blueprint in.<br />Governed outcome out.</h2>
        <p className="lede">
          The Agent Factory takes the frozen Blueprint, runs parallel Senz agent threads, and produces a full runnable POC. Lock it and push to your IDE of choice — with epics, stories, and sprints ready.
        </p>
      </motion.div>

      <motion.div className="split" variants={staggerContainer}>
        <motion.div className="split-copy" variants={staggerItem}>
          <ul className="bullets">
            <li>
              <strong>Planner → Builder → Verifier.</strong>
              Human checkpoint after planning. Every build is spec-gated. No surprise outputs, no unapproved runs.
            </li>
            <li>
              <strong>Full POC, not scaffolding.</strong>
              The deliverable is a viewable, runnable product — not a code outline. Refine conversationally with agents before final push.
            </li>
            <li>
              <strong>IDE handoff with user stories.</strong>
              Push to Cursor, VS Code, or IntelliJ. Epics, stories, and sprint structure included — your team picks up exactly where SENZAI left off.
            </li>
          </ul>

          <div className="agents">
            <div className="agent-card">
              <div className="agent-name"><span className="agent-prefix">Dev</span>Senz</div>
              <div className="agent-role">Build Agent</div>
              <p>Generates production code from Blueprint spec. File-by-file visibility. Spec-driven. No guesswork.</p>
            </div>
            <div className="agent-card">
              <div className="agent-name"><span className="agent-prefix">Test</span>Senz</div>
              <div className="agent-role">Quality + Review Agent</div>
              <p>Writes and runs test suites against the Test Contract. Reviews code quality. Coverage enforced before push.</p>
            </div>
            <div className="agent-card">
              <div className="agent-name"><span className="agent-prefix">Data</span>Senz</div>
              <div className="agent-role">Data Engineering Agent</div>
              <p>Pipelines, schemas, migrations, integrations. PHI and PII handling built in from the Blueprint.</p>
            </div>
            <div className="agent-card">
              <div className="agent-name"><span className="agent-prefix">Secure</span>Senz</div>
              <div className="agent-role">Security Agent</div>
              <p>SAST, CVE scanning, compliance checks at every stage. Security is not a post-build step.</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="split-art" variants={staggerItem}>
          <div className="screen tilt">
            <div className="screen-bar">
              <span className="dot dot-r"></span><span className="dot dot-y"></span><span className="dot dot-g"></span>
              <span className="screen-title">Agent Factory · Sprint 2 / 3</span>
            </div>
            <div className="screen-body screen-body-light">
              <div className="fac-phases">
                <div className="fp done">✓ Planner</div>
                <div className="fp active">Builder</div>
                <div className="fp">Verifier</div>
              </div>
              <div className="fac-row"><span className="fr-dot done"></span><span className="fr-name"><b>Dev</b>Senz</span><span className="fr-file">claims_handler.py · done</span></div>
              <div className="fac-row"><span className="fr-dot run"></span><span className="fr-name"><b>Test</b>Senz</span><span className="fr-file">test_eligibility.py · running…</span></div>
              <div className="fac-row"><span className="fr-dot run"></span><span className="fr-name"><b>Secure</b>Senz</span><span className="fr-file">CVE scan · 2 flagged, remediating</span></div>
              <div className="fac-row"><span className="fr-dot wait"></span><span className="fr-name"><b>Data</b>Senz</span><span className="fr-file">queued · data layer Sprint 3</span></div>
              <div className="fac-section">Sprint Plan · Jira Synced</div>
              <div className="fac-block">
                Epic 1 · Core claims engine (8 stories) ✓<br />
                Epic 2 · Integration layer (6 stories) · in progress<br />
                Epic 3 · Compliance hardening (4 stories) · queued
              </div>
              <div className="fac-out">✓ POC preview ready · Push to IDE → Cursor / VS Code / IntelliJ</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  </motion.section>


  {/* GOVERN */}
  <motion.section
    className="stage stage-govern"
    data-stage-id="govern"
    id="govern"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div className="stage-inner split split-flip" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
      <motion.div className="split-copy" variants={staggerItem}>
        <div className="eyebrow">04 · Govern</div>
        <h2>Nothing ships<br />without a trail.</h2>
        <p className="lede">
          Portfolio is the system of record for every idea, Blueprint, build, and agent. Stage gates enforce accountability at every transition. Audit trails are immutable. Govern is not a dashboard — it is the operating system itself.
        </p>
        <ul className="bullets">
          <li>
            <strong>Stage gates at every transition.</strong>
            Radar → Blueprint → Factory → Marketplace. Nothing advances without structured approval.
          </li>
          <li>
            <strong>Full lineage, always.</strong>
            Who ideated it. Who approved the Blueprint. Which agents built it. What changed. One place.
          </li>
          <li>
            <strong>ROI visible to leadership.</strong>
            Initiatives in flight, agents shipped, hours saved — live, without a separate reporting layer.
          </li>
        </ul>
      </motion.div>
      <motion.div className="split-art" variants={staggerItem}>
        <div className="screen tilt tilt-flip">
          <div className="screen-bar">
            <span className="dot dot-r"></span><span className="dot dot-y"></span><span className="dot dot-g"></span>
            <span className="screen-title">Portfolio · Govern</span>
          </div>
          <div className="screen-body screen-body-light">
            <div className="pf-head">
              <div>
                <div className="pf-eye">AI Pipeline</div>
                <div className="pf-title">Portfolio</div>
                <div className="pf-sub">Manage AI initiatives across the lifecycle</div>
              </div>
              <button type="button" className="pf-cta">+ New Use Case</button>
            </div>
            <div className="pf-tools">
              <span className="pf-seg active">▦ Board</span>
              <span className="pf-seg">≡ List</span>
              <span className="pf-search">Search…</span>
              <span className="pf-filter">All Domains ▾</span>
            </div>
            <div className="pf-board">
              <div className="pf-col">
                <div className="pf-h pf-h-idea">Idea <span>13</span></div>
                <div className="pf-card"><div className="pf-t">Auth lookup tool for US payer</div><div className="pf-d">Finance</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">RAG</span></div></div>
                <div className="pf-card"><div className="pf-t">Enterprise Search Enhancement</div><div className="pf-d">Customer Experience</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">RAG</span></div></div>
              </div>
              <div className="pf-col">
                <div className="pf-h pf-h-val">Validating <span>6</span></div>
                <div className="pf-card pf-card-val"><div className="pf-t">AI in Financial Services — Autonomous Credit…</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">Agentic</span></div></div>
                <div className="pf-card pf-card-val"><div className="pf-t">Real-Time Fraud Detection and…</div><div className="pf-d">Procurement</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">Agentic</span></div></div>
              </div>
              <div className="pf-col">
                <div className="pf-h pf-h-bp">Blueprinted <span>203</span></div>
                <div className="pf-card pf-card-bp"><div className="pf-t">AI-Powered Employee Helpdesk</div><div className="pf-d">Customer Experience</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">Hybrid</span></div></div>
                <div className="pf-card pf-card-bp"><div className="pf-t">AI-Powered Employee Helpdesk</div><div className="pf-d">Research &amp; Development</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">Agentic</span></div></div>
              </div>
              <div className="pf-col">
                <div className="pf-h pf-h-fac">In Factory <span>35</span></div>
                <div className="pf-card pf-card-fac"><div className="pf-t">Employee leave management</div><div className="pf-d">HR &amp; People</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">Automation</span></div></div>
                <div className="pf-card pf-card-fac"><div className="pf-t">Meeting notes summarizer</div><div className="pf-d">IT &amp; Security</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">Automation</span></div></div>
              </div>
              <div className="pf-col">
                <div className="pf-h pf-h-live">Live <span>8</span></div>
                <div className="pf-card pf-card-live"><div className="pf-t">AI-based Resume Screening System</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">RAG</span></div></div>
                <div className="pf-card pf-card-live"><div className="pf-t">D365 journal Process engine</div><div className="pf-d">Data &amp; Analytics</div><div className="pf-tags"><span className="pf-tag tag-bl">Build</span><span className="pf-tag tag-bl">Agentic</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </motion.section>


  {/* REUSE / MARKETPLACE */}
  <motion.section
    className="stage stage-reuse"
    data-stage-id="reuse"
    id="reuse"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div className="stage-inner split" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
      <motion.div className="split-copy" variants={staggerItem}>
        <div className="eyebrow">05 · Reuse</div>
        <h2>Every output becomes<br />a reusable asset.</h2>
        <p className="lede">
          Every POC the Factory produces, every agent that runs — lands in the Marketplace. The next team starts from a proven foundation. The more SENZAI delivers, the faster every future delivery becomes.
        </p>
        <ul className="bullets">
          <li>
            <strong>Reuse scan before every Blueprint.</strong>
            SENZAI checks Marketplace before generating anything new. Reuse first. Build second. Always.
          </li>
          <li>
            <strong>Agents, POCs, tools, and patterns.</strong>
            Senz agents available standalone. Completed POCs as accelerators. Governed connectors your teams can trust out of the box.
          </li>
          <li>
            <strong>Continuously enriched by every delivery.</strong>
            Each Factory run adds to Marketplace. The enterprise AI flywheel compounds with every initiative.
          </li>
        </ul>
      </motion.div>
      <motion.div className="split-art" variants={staggerItem}>
        <div className="screen tilt">
          <div className="screen-bar">
            <span className="dot dot-r"></span><span className="dot dot-y"></span><span className="dot dot-g"></span>
            <span className="screen-title">Marketplace</span>
          </div>
          <div className="screen-body screen-body-light">
            <div className="mk-banner">↩ 2 Marketplace matches found for current Blueprint</div>
            <div className="mk-grid">
              <div className="mk-card"><div className="mk-cat">POC</div><div className="mk-name">Claims Adjudication Agent</div><span className="mk-tag tag-em">Production</span></div>
              <div className="mk-card"><div className="mk-cat">Agent</div><div className="mk-name">DevSenz</div><span className="mk-tag tag-in">Standalone</span></div>
              <div className="mk-card"><div className="mk-cat">Tool</div><div className="mk-name">AI Readiness Assessment</div><span className="mk-tag tag-em">Production</span></div>
              <div className="mk-card"><div className="mk-cat">Pattern</div><div className="mk-name">HIPAA Connector Template</div><span className="mk-tag tag-em">Governed</span></div>
              <div className="mk-card"><div className="mk-cat">Tool</div><div className="mk-name">ROI Calculator</div><span className="mk-tag tag-em">Production</span></div>
              <div className="mk-card"><div className="mk-cat">Agent</div><div className="mk-name">SecureSenz</div><span className="mk-tag tag-in">Standalone</span></div>
            </div>
            <div className="mk-foot" data-placeholder="">38 assets · enriched by every Factory delivery</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </motion.section>

    </div>{/* end platform-stages-main */}
  </div>{/* end platform-stages-shell */}


  {/* TESTIMONIALS — placeholder, marked */}
  <motion.section
    className="stage stage-testimonials"
    data-stage-id="testimonials"
    id="testimonials"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div className="stage-inner" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_ONCE}>
      <motion.div className="section-head section-head-center" variants={staggerItem}>
        <div className="eyebrow">From our clients</div>
        <h2>The first AI delivery system<br />built for governance from day one.</h2>
      </motion.div>
      <motion.div variants={staggerItem}>
        <TestimonialsSlider />
      </motion.div>
      <div className="placeholder-note">
</div>
    </motion.div>
  </motion.section>


  {/* CTA */}
  <motion.section
    className="stage stage-cta"
    data-stage-id="cta"
    id="cta"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <motion.div
      className="stage-inner cta-inner"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
    >
      <motion.div className="eyebrow" variants={staggerItem}>SENZAI</motion.div>
      <motion.h2 variants={staggerItem}>From idea to governed outcome.<br /><span className="grad">In days, not quarters.</span></motion.h2>
      <motion.p className="lede" variants={staggerItem}>
        See SENZAI in action — the loop that turns enterprise AI demand into production-ready, reusable, governed outcomes.
      </motion.p>
      <motion.div className="hero-ctas" variants={staggerItem}>
        <motion.a
          className="btn btn-primary"
          href="mailto:senzai@infinite.com?subject=SENZAI%20Demo%20Request"
          whileHover={reduce ? undefined : { y: -3, scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          Request a Demo<span aria-hidden="true">→</span>
        </motion.a>
        <motion.a
          className="btn btn-ghost"
          href="#hero"
          whileHover={reduce ? undefined : { y: -2 }}
          whileTap={reduce ? undefined : { scale: 0.99 }}
          transition={{ duration: 0.26, ease: EASE }}
        >
          Back to Top
        </motion.a>
      </motion.div>
      <motion.div className="cta-tag" variants={staggerItem}>Decide · Design · Accelerate · Govern</motion.div>
    </motion.div>
  </motion.section>


  {/* FOOTER */}
  <motion.footer
    className="site-foot"
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT_ONCE}
    variants={sectionVariants}
  >
    <div className="foot-inner">
      <div className="foot-brand">
        <img src={img3} alt="" className="foot-mark" />
        <div>
          <div className="foot-name">SENZAI</div>
          <div className="foot-parent">
            by
            <img src={img4} alt="Infinite Computer Solutions" className="foot-infinite" />
          </div>
        </div>
      </div>
      <ul className="foot-links">
        <li><a href="#decide">Platform</a></li>
        <li><a href="#accelerate">Agent Factory</a></li>
        <li><a href="#reuse">Marketplace</a></li>
        <li><a href="mailto:senzai@infinite.com">Contact</a></li>
      </ul>
      <div className="foot-copy">© 2026 Infinite Computer Solutions</div>
    </div>
  </motion.footer>

</main>





    </div>
  );
}
