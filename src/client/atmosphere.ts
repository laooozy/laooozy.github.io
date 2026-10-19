/**
 * Deep-space atmosphere — the site's background canvas.
 *
 * ONE fixed, fully transparent, `pointer-events:none` `<canvas>` fills the
 * viewport and paints faint drifting star dust plus occasional right-to-left
 * shooting stars. It is driven by the SINGLE shared animation loop the DOM port
 * owns (`deps.adapters.dom.startLoop`), never by its own `requestAnimationFrame`,
 * and it pauses while the tab is hidden (`onVisibilityChange`) and is never even
 * created when the visitor asked for reduced motion (`prefersReducedMotion`).
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

/** Exact value of `--text` in `src/styles/tokens.css` (star ink). */
const STAR_TOKEN = "oklch(0.9475 0.0067 286.2717)";

/** Hard numeric fallback if the star-ink custom property cannot be resolved. */
const STAR_FALLBACK: Rgb = [240, 240, 245];

/** Never rasterise above 2x: the dust is faint, so the extra pixels are waste. */
const MAX_DPR = 2;

/** Bound the per-frame step so a resumed/backgrounded tab cannot jump. */
const MAX_DT_MS = 48;

/** Shooting-star cadence: a bounded random interval keeps it occasional. */
const METEOR_MIN_MS = 6000;
const METEOR_MAX_MS = 17000;

type Rgb = readonly [number, number, number];

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

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Resolve a CSS colour string to an `[r, g, b]` triple using the canvas itself,
 * which normalises any supported notation (`oklch(...)`, `rgb(...)`, hex) to a
 * concrete sRGB value. Falls back when the string is unparseable.
 */
function toRgb(ctx: CanvasRenderingContext2D, raw: string, fallback: Rgb): Rgb {
  try {
    const previous = ctx.fillStyle;
    ctx.fillStyle = raw;
    const normalised = ctx.fillStyle;
    ctx.fillStyle = previous;
    const hex = /^#([0-9a-f]{6})$/i.exec(normalised);
    if (hex) {
      const value = Number.parseInt(hex[1], 16);
      return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    }
    const nums = normalised.match(/[\d.]+/g);
    if (nums && nums.length >= 3) {
      return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
    }
  } catch {
    // fall through to the fallback
  }
  return fallback;
}

/** Read a design token off `:root`, or the documented literal when unavailable. */
function readToken(
  ctx: CanvasRenderingContext2D,
  name: string,
  literal: string,
  fallback: Rgb,
): Rgb {
  let raw = literal;
  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    if (value) raw = value;
  } catch {
    // keep the documented literal
  }
  return toRgb(ctx, raw, fallback);
}

function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.max(0, alpha).toFixed(3)})`;
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

  const starColor = readToken(ctx, "--text", STAR_TOKEN, STAR_FALLBACK);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars: Star[] = [];
  const meteors: Meteor[] = [];
  let nextMeteorIn = rand(METEOR_MIN_MS, METEOR_MAX_MS);

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
      // Fade in then out so the streak never pops.
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

  resize();
  window.addEventListener("resize", resize, { passive: true });

  // Fires immediately with the current state, so a hidden tab never starts.
  const unsubscribeVisibility = dom.onVisibilityChange((hidden) => {
    if (hidden) stop();
    else start();
  });

  return () => {
    stop();
    unsubscribeVisibility();
    window.removeEventListener("resize", resize);
    canvas.remove();
  };
}
