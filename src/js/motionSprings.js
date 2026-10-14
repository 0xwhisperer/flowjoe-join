// Shared spring physics for the app's motion (tree, gallery handover). The presets are the motion-design mockup's (mass 1). Two ways to use a spring:
// springCurve() turns one into a CSS linear() easing plus its settle time for the Web Animations API; createSpring() steps one frame by frame for values
// that two edges must follow at different stiffness (the travelling tree highlight).

export const SPRINGS = {
  snappy: {k: 520, c: 40},
  default: {k: 260, c: 30},
  panel: {k: 300, c: 33}, // windows and big panels: a controlled settle with no visible overshoot
  exit: {k: 720, c: 58},
  lead: {k: 320, c: 30},
  trail: {k: 140, c: 22}
};

const curveCache = new Map();

export function springCurve(name) {
  if (curveCache.has(name)) return curveCache.get(name);
  const {k, c} = SPRINGS[name];
  const dt = 1 / 120;
  const samples = [0];
  let x = 0;
  let v = 0;
  let t = 0;
  let settledFor = 0;
  while (t < 2 && settledFor < 6) {
    v += (-k * (x - 1) - c * v) * dt;
    x += v * dt;
    t += dt;
    samples.push(x);
    settledFor = Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.02 ? settledFor + 1 : 0;
  }
  samples[samples.length - 1] = 1;
  const step = Math.max(1, Math.floor(samples.length / 40));
  const points = [];
  for (let i = 0; i < samples.length; i += step) points.push(Number(samples[i].toFixed(4)));
  if (points[points.length - 1] !== 1) points.push(1);
  const curve = {easing: `linear(${points.join(", ")})`, duration: Math.max(80, Math.round(t * 1000))};
  curveCache.set(name, curve);
  return curve;
}

// Motion stands down when the user asks for reduced motion, or where the browser cannot animate.
export function canAnimate(el) {
  if (!el || typeof el.animate !== "function") return false;
  // A hidden window animates nothing (the page's frames are throttled and the queued motion would replay on return).
  if (typeof document !== "undefined" && document.hidden) return false;
  try {
    // `localStorage.setItem("flowjoe_motion", "off")` and a reload turns every motion in this file's family off, so the app can be compared with and without it.
    if (localStorage.getItem("flowjoe_motion") === "off") return false;
  } catch {
    /* storage unavailable: motion stays on */
  }
  try {
    return !(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch {
    return true;
  }
}

// Independent translate / scale properties are used (never `transform`) so a slot, row or dialog keeps the placement the app gave it.
export function run(el, keyframes, spring, extra = {}) {
  const {easing, duration} = springCurve(spring);
  return el.animate(keyframes, {duration: extra.duration || duration, easing, fill: "backwards", delay: extra.delay || 0});
}

// One number that chases a target on a spring. step(dtSeconds) returns true while it is still moving.
export function createSpring(initial) {
  return {
    v: initial,
    vel: 0,
    target: initial,
    spring: "default",
    to(target, spring) {
      this.target = target;
      this.spring = spring;
    },
    step(dt) {
      const {k, c} = SPRINGS[this.spring];
      let left = Math.min(dt, 0.05);
      while (left > 0) {
        const h = Math.min(left, 1 / 240);
        this.vel += (-k * (this.v - this.target) - c * this.vel) * h;
        this.v += this.vel * h;
        left -= h;
      }
      if (Math.abs(this.v - this.target) < 0.05 && Math.abs(this.vel) < 0.5) {
        this.v = this.target;
        this.vel = 0;
        return false;
      }
      return true;
    }
  };
}
