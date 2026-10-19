/**
 * Deep-space atmosphere — the site's background canvas.
 *
 * ONE fixed, fully transparent, `pointer-events:none` `<canvas>` fills the
 * viewport and paints the whole atmosphere: faint drifting star dust, occasional
 * right-to-left shooting stars and purple lightning (an ambient timer flash plus
 * a pointer-interactive bolt). It is driven by the SINGLE shared animation loop
 * the DOM port owns (`deps.adapters.dom.startLoop`), never by its own
 * `requestAnimationFrame`; it pauses while the tab is hidden
 * (`onVisibilityChange`) and is never even created when the visitor asked for
 * reduced motion (`prefersReducedMotion`).
 *
 * This is a client module, so it is the one place allowed to touch browser
 * primitives the port does not model (creating the canvas, listening for
 * `pointermove` on `window`, sizing to the viewport). Components never import
 * this module nor reference a browser global — the mount script in
 * `BaseLayout.astro` calls `attachAtmosphere(clientDeps)` with the injected
 * bundle, exactly like `attachScrollHeader`.
 */

import type { ClientDeps } from "@/hooks/deps";

/** Stable selector/id so QA can find the one atmosphere canvas. */
export const ATMOSPHERE_CANVAS_ID = "atmosphere-canvas";

/** Exact value of `--accent` in `src/styles/tokens.css` (the ONE brand purple). */
const ACCENT_TOKEN = "oklch(0.6268 0.2325 303.9004)";
/** Exact value of `--text` in `src/styles/tokens.css` (star ink). */
const STAR_TOKEN = "oklch(0.9475 0.0067 286.2717)";

/** Hard numeric fallbacks if a CSS custom property cannot be resolved. */
const ACCENT_FALLBACK: Rgb = [168, 85, 247];
const STAR_FALLBACK: Rgb = [240, 240, 245];

/** Never rasterise above 2x: the dust is faint, so extra pixels are waste. */
const MAX_DPR = 2;

/** Bound the per-frame step so a resumed/backgrounded tab cannot jump. */
const MAX_DT_MS = 48;

/** Shooting-star cadence: a bounded random interval keeps it occasional. */
const METEOR_MIN_MS = 6000;
const METEOR_MAX_MS = 17000;

/** Ambient lightning cadence: a bounded random interval, deliberately sparse. */
const AMBIENT_MIN_MS = 9000;
const AMBIENT_MAX_MS = 22000;
/** How long a single bolt takes to fade out. */
const BOLT_LIFE_MS = 760;
/** Cap the simultaneously-live bolts so a fast gesture stays cheap. */
const MAX_BOLTS = 14;
/** Gesture length (px) that fires one bolt. */
const POINTER_MIN_SEG = 54;
/** A pause this long commits the trailing gesture stretch into a bolt. */
const POINTER_IDLE_MS = 130;

type Rgb = readonly [number, number, number];

interface Point {
  x: number;
  y: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  phase: number;
  twinkle: number;
  drift: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Streak length in px. */
  trail: number;
  /** Lifetime in ms; the head fades over it. */
  life: number;
  age: number;
}

interface Bolt {
  trunk: Point[];
  forks: Point[][];
  born: number;
  life: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Resolve a CSS colour string to an `[r, g, b]` triple by rasterising it: a
 * 1x1 canvas is filled with the raw value and its pixel read back, which forces
 * any notation the browser can paint — `oklch(...)` included, where the canvas
 * `fillStyle` string is *not* normalised to hex — into concrete sRGB bytes.
 * A sentinel fill detects an unparseable value, which then falls back.
 */
function rasterise(raw: string, fallback: Rgb): Rgb {
  try {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const probeCtx = probe.getContext("2d");
    if (!probeCtx) return fallback;
    probeCtx.fillStyle = "#010203";
    probeCtx.fillStyle = raw;
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillRect(0, 0, 1, 1);
    const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data;
    if (r === 1 && g === 2 && b === 3) return fallback;
    return [r, g, b];
  } catch {
    return fallback;
  }
}

/** Read a design token off `:root`, or the documented literal when unavailable. */
function readToken(name: string, literal: string, fallback: Rgb): Rgb {
  let raw = literal;
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    if (value) raw = value;
  } catch {
    // keep the documented literal
  }
  return rasterise(raw, fallback);
}

function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.max(0, alpha).toFixed(3)})`;
}

/**
 * Recursive midpoint displacement: bend one straight chord into the crooked
 * trunk of a bolt. The displacement is a fraction of the chord, halving each
 * level, so a long chord swings wide and the recursion resolves to fine
 * fracture. Returns the points *after* the start (the caller seeds the start).
 */
function boltPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  displacement: number,
  depth: number,
): Point[] {
  if (depth <= 0) return [{ x: x2, y: y2 }];
  const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displacement;
  const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displacement;
  const half = displacement * 0.5;
  return [
    ...boltPoints(x1, y1, midX, midY, half, depth - 1),
    ...boltPoints(midX, midY, x2, y2, half, depth - 1),
  ];
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  }
  return total;
}

/**
 * Grow a fork tree off a trunk: each fork springs from a point on its parent,
 * spans a fraction of the parent's length, and can fork again. This is what
 * turns a bent line into a bolt rather than a scribble.
 */
function growForks(
  points: Point[],
  depth: number,
  scale: number,
  out: Point[][],
  budget: { n: number },
): void {
  if (depth <= 0 || budget.n <= 0) return;
  const length = polylineLength(points);
  const count = depth > 1 ? 2 : 1;
  for (let f = 0; f < count && budget.n > 0; f += 1) {
    budget.n -= 1;
    const i = 1 + Math.floor(Math.random() * Math.max(1, points.length - 2));
    const from = points[i - 1];
    const at = points[i];
    const angle =
      Math.atan2(at.y - from.y, at.x - from.x) +
      (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.6);
    const forkLength = length * scale * (0.45 + Math.random() * 0.55);
    const endX = at.x + Math.cos(angle) * forkLength;
    const endY = at.y + Math.sin(angle) * forkLength;
    const fork = [
      { x: at.x, y: at.y },
      ...boltPoints(at.x, at.y, endX, endY, Math.max(3, forkLength * 0.4), 4),
    ];
    out.push(fork);
    growForks(fork, depth - 1, scale * 0.56, out, budget);
  }
}

/**
 * Re-sample a gesture polyline into a few widely spaced nodes. The spacing (not
 * the raw cursor samples) is what gives each chord room to swing, so the trunk
 * reads as lightning instead of a jittery swipe mark.
 */
function spineOf(points: Point[]): { spine: Point[]; chord: number } | null {
  const segments: { a: Point; b: Point; d: number }[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    if (d < 0.001) continue;
    segments.push({ a: points[i - 1], b: points[i], d });
    total += d;
  }
  if (!segments.length) return null;

  const count = Math.max(2, Math.min(6, Math.round(total / 40)));
  const chord = total / count;
  const spine: Point[] = [{ x: segments[0].a.x, y: segments[0].a.y }];
  let need = chord;
  for (const original of segments) {
    let segment = original;
    while (segment.d >= need) {
      const t = need / segment.d;
      const cut = {
        x: segment.a.x + (segment.b.x - segment.a.x) * t,
        y: segment.a.y + (segment.b.y - segment.a.y) * t,
      };
      spine.push(cut);
      segment = { a: cut, b: segment.b, d: segment.d - need };
      need = chord;
    }
    need -= segment.d;
  }
  const last = segments[segments.length - 1].b;
  spine.push({ x: last.x, y: last.y });
  return { spine, chord };
}

/**
 * Create and drive the atmosphere. Returns a cleanup that tears the canvas, the
 * listeners and the loop down. A no-op when reduced motion is requested or the
 * DOM is unavailable: the canvas is never created.
 */
export function attachAtmosphere(deps: ClientDeps): () => void {
  const dom = deps.adapters.dom;
  if (dom.prefersReducedMotion()) return () => {};
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  const canvas = document.createElement("canvas");
  canvas.id = ATMOSPHERE_CANVAS_ID;
  canvas.setAttribute("data-atmosphere", "");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;";
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  // Annotated as non-nullable so the hoisted draw helpers below keep the
  // narrowed type (TypeScript drops `const` narrowing inside `function`
  // declarations).
  const ctx: CanvasRenderingContext2D = context;
  document.body.appendChild(canvas);

  const starColor = readToken("--text", STAR_TOKEN, STAR_FALLBACK);
  const accentColor = readToken("--accent", ACCENT_TOKEN, ACCENT_FALLBACK);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars: Star[] = [];
  const meteors: Meteor[] = [];
  const bolts: Bolt[] = [];
  let pending: Point[] = [];
  let lastRaw: Point | null = null;
  let lastMove = Number.NEGATIVE_INFINITY;
  let nextMeteorIn = rand(METEOR_MIN_MS, METEOR_MAX_MS);
  let nextAmbientIn = rand(AMBIENT_MIN_MS, AMBIENT_MAX_MS);

  function resize(): void {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
  }

  function seedStars(): void {
    const count = Math.round(
      Math.min(160, Math.max(60, (width * height) / 16000)),
    );
    stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: rand(0.3, 1.2),
        alpha: rand(0.14, 0.6),
        phase: Math.random() * Math.PI * 2,
        twinkle: rand(0.0004, 0.002),
        drift: rand(0.01, 0.06),
      });
    }
  }

  function spawnMeteor(): void {
    meteors.push({
      x: width + rand(40, 120),
      y: rand(height * 0.04, height * 0.55),
      vx: -rand(0.34, 0.6),
      vy: rand(0.05, 0.16),
      trail: rand(90, 190),
      life: rand(900, 1500),
      age: 0,
    });
  }

  function drawStars(dt: number): void {
    for (const star of stars) {
      star.phase += star.twinkle * dt;
      star.y += star.drift * dt * 0.06;
      if (star.y > height) star.y = 0;
      const twinkle = 0.6 + 0.4 * Math.sin(star.phase);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(starColor, star.alpha * twinkle);
      ctx.fill();
    }
  }

  function drawMeteors(dt: number): void {
    for (let i = meteors.length - 1; i >= 0; i -= 1) {
      const meteor = meteors[i];
      meteor.age += dt;
      meteor.x += meteor.vx * dt;
      meteor.y += meteor.vy * dt;
      const life = 1 - meteor.age / meteor.life;
      if (life <= 0 || meteor.x < -meteor.trail - 40) {
        meteors.splice(i, 1);
        continue;
      }
      const fade =
        Math.min(1, life * 2.4) * Math.min(1, (meteor.age / meteor.life) * 5);
      const norm = Math.hypot(meteor.vx, meteor.vy) || 1;
      const tailX = meteor.x - (meteor.vx / norm) * meteor.trail;
      const tailY = meteor.y - (meteor.vy / norm) * meteor.trail;
      const gradient = ctx.createLinearGradient(
        meteor.x,
        meteor.y,
        tailX,
        tailY,
      );
      gradient.addColorStop(0, rgba(starColor, 0.85 * fade));
      gradient.addColorStop(1, rgba(starColor, 0));
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }

  function strike(gesture: Point[], weight: number, now: number): void {
    const sampled = spineOf(gesture);
    if (!sampled || sampled.spine.length < 2) return;
    const displacement = Math.max(10, sampled.chord * 0.62);

    const trunk: Point[] = [];
    for (let i = 1; i < sampled.spine.length; i += 1) {
      const a = sampled.spine[i - 1];
      const b = sampled.spine[i];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 1) continue;
      if (!trunk.length) trunk.push({ x: a.x, y: a.y });
      trunk.push(...boltPoints(a.x, a.y, b.x, b.y, displacement, 5));
    }
    if (trunk.length < 2) return;

    const forks: Point[][] = [];
    growForks(trunk, 2, 0.5, forks, { n: 5 + Math.round(weight) });
    bolts.push({ trunk, forks, born: now, life: BOLT_LIFE_MS });
    while (bolts.length > MAX_BOLTS) bolts.shift();
  }

  function ambientStrike(now: number): void {
    const startX = rand(width * 0.1, width * 0.9);
    const startY = rand(-30, height * 0.08);
    const endX = startX + rand(-width * 0.22, width * 0.22);
    const endY = rand(height * 0.3, height * 0.72);
    strike(
      [
        { x: startX, y: startY },
        { x: endX, y: endY },
      ],
      1.2,
      now,
    );
  }

  function gestureLength(): number {
    let total = 0;
    for (let i = 1; i < pending.length; i += 1) {
      total += Math.hypot(
        pending[i].x - pending[i - 1].x,
        pending[i].y - pending[i - 1].y,
      );
    }
    return total;
  }

  function pushPointer(x: number, y: number, now: number): void {
    const from = lastRaw ?? { x, y };
    const dx = x - from.x;
    const dy = y - from.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.min(16, Math.round(distance / 8)));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      pending.push({ x: from.x + dx * t, y: from.y + dy * t });
    }
    lastRaw = { x, y };
    lastMove = now;

    if (pending.length < 2) return;
    if (gestureLength() >= POINTER_MIN_SEG) {
      const tail = pending[pending.length - 1];
      strike(pending.slice(), 1.2, now);
      pending = [tail];
    }
  }

  function resetGesture(): void {
    pending = [];
    lastRaw = null;
  }

  function drawBolts(now: number): void {
    const strokePath = (points: Point[]): void => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let k = 1; k < points.length; k += 1) {
        ctx.lineTo(points[k].x, points[k].y);
      }
      ctx.stroke();
    };

    ctx.lineJoin = "round";
    for (let i = bolts.length - 1; i >= 0; i -= 1) {
      const bolt = bolts[i];
      const life = 1 - (now - bolt.born) / bolt.life;
      if (life <= 0) {
        bolts.splice(i, 1);
        continue;
      }
      const eased = life * life;

      ctx.lineCap = "round";
      ctx.lineWidth = 7;
      ctx.strokeStyle = rgba(accentColor, eased * 0.12);
      strokePath(bolt.trunk);

      ctx.lineCap = "butt";
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(accentColor, Math.min(1, eased * 1.15) * 0.9);
      strokePath(bolt.trunk);

      ctx.lineWidth = 0.8;
      ctx.strokeStyle = rgba(accentColor, eased * 0.45);
      for (const fork of bolt.forks) {
        if (fork.length < 2) continue;
        strokePath(fork);
      }
      ctx.lineCap = "round";
    }
  }

  let lastTime = 0;
  let stopLoop: (() => void) | null = null;

  function frame(time: number): void {
    const dt = lastTime === 0 ? 0 : Math.min(time - lastTime, MAX_DT_MS);
    lastTime = time;

    ctx.clearRect(0, 0, width, height);
    drawStars(dt);

    nextMeteorIn -= dt;
    if (nextMeteorIn <= 0) {
      spawnMeteor();
      nextMeteorIn = rand(METEOR_MIN_MS, METEOR_MAX_MS);
    }
    drawMeteors(dt);

    nextAmbientIn -= dt;
    if (nextAmbientIn <= 0) {
      ambientStrike(time);
      nextAmbientIn = rand(AMBIENT_MIN_MS, AMBIENT_MAX_MS);
    }
    if (pending.length >= 3 && time - lastMove > POINTER_IDLE_MS) {
      strike(pending.slice(), 1.2, time);
      pending = [];
    }
    drawBolts(time);
  }

  function start(): void {
    if (stopLoop) return;
    lastTime = 0;
    stopLoop = dom.startLoop(frame);
  }

  function stop(): void {
    if (!stopLoop) return;
    stopLoop();
    stopLoop = null;
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (document.hidden) return;
    pushPointer(event.clientX, event.clientY, performance.now());
  };
  const onReset = (): void => resetGesture();

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("blur", onReset);

  // Fires immediately with the current state, so a hidden tab never starts.
  const unsubscribeVisibility = dom.onVisibilityChange((hidden) => {
    if (hidden) stop();
    else start();
  });

  return () => {
    stop();
    unsubscribeVisibility();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("blur", onReset);
    canvas.remove();
  };
}
