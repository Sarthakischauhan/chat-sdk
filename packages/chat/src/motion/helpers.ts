import { motion } from "./classes";

const CHAT_ROOT = ".chat-root";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const motionRoot = (node?: Element | null) =>
  node?.closest(CHAT_ROOT) ?? (typeof document !== "undefined" ? document.querySelector(CHAT_ROOT) : null);

const readRaw = (name: string, node?: Element | null) => {
  const root = motionRoot(node);
  if (!root) {
    return "";
  }

  return getComputedStyle(root).getPropertyValue(name);
};

/** Read a duration custom property (ms) from `.chat-root`, with a numeric fallback. */
export const readDurationMs = (name: string, fallback: number, node?: Element | null) => {
  const value = parseFloat(readRaw(name, node));
  return Number.isFinite(value) ? value : fallback;
};

const revertTimers = new WeakMap<HTMLElement, number>();
const shakeTimers = new WeakMap<HTMLElement, number>();

export type SwapTextOptions = {
  onSwap?: () => void;
};

/**
 * Three-phase text swap from transitions.dev (04-text-states-swap):
 * exit → swap content → enter-start (no transition) → rest.
 */
export const swapText = (el: HTMLElement, next: string, options?: SwapTextOptions) => {
  if (prefersReducedMotion()) {
    el.textContent = next;
    options?.onSwap?.();
    return;
  }

  const dur = readDurationMs("--text-swap-dur", 200, el);
  el.classList.add(motion.isExit);

  return window.setTimeout(() => {
    el.classList.remove(motion.isExit);
    el.classList.add(motion.isEnterStart);
    el.textContent = next;
    options?.onSwap?.();
    void el.offsetHeight;
    el.classList.remove(motion.isEnterStart);
  }, dur);
};

export const openDropdown = (el: HTMLElement) => {
  el.classList.remove(motion.isClosing);
  el.classList.add(motion.isOpen);
};

export const closeDropdown = (el: HTMLElement, onClosed?: () => void) => {
  el.classList.remove(motion.isOpen);
  el.classList.add(motion.isClosing);

  const closeMs = prefersReducedMotion() ? 0 : readDurationMs("--dropdown-close-dur", 150, el);

  return window.setTimeout(() => {
    el.classList.remove(motion.isClosing);
    onClosed?.();
  }, closeMs);
};

export type TriggerErrorShakeOptions = {
  /** Keep `.is-error` after the shake (persistent tool errors). Default: auto-revert. */
  revert?: boolean;
};

/**
 * Replay the error shake from a clean baseline (12-error-state-shake).
 * `.is-error` and `.is-shaking` stay orthogonal so the shake can restart
 * without flickering the error treatment.
 */
export const triggerErrorShake = (wrap: HTMLElement, options?: TriggerErrorShakeOptions) => {
  const input =
    wrap.matches(`.${motion.input}`)
      ? wrap
      : (wrap.querySelector<HTMLElement>(`.${motion.input}`) ?? wrap);

  wrap.classList.add(motion.isError);
  input.classList.add(motion.isError);

  input.classList.remove(motion.isShaking);
  void input.offsetWidth;
  input.classList.add(motion.isShaking);

  const existingShake = shakeTimers.get(input);
  if (existingShake) {
    window.clearTimeout(existingShake);
  }

  const shakeMs =
    readDurationMs("--shake-dur-a", 80, wrap) * 2 + readDurationMs("--shake-dur-b", 60, wrap) * 2;
  shakeTimers.set(
    input,
    window.setTimeout(() => {
      input.classList.remove(motion.isShaking);
      shakeTimers.delete(input);
    }, shakeMs + 20),
  );

  const existingRevert = revertTimers.get(wrap);
  if (existingRevert) {
    window.clearTimeout(existingRevert);
    revertTimers.delete(wrap);
  }

  if (options?.revert === false) {
    return;
  }

  const hold = readDurationMs("--revert-hold", 3000, wrap);
  revertTimers.set(
    wrap,
    window.setTimeout(() => {
      revertTimers.delete(wrap);
      wrap.classList.remove(motion.isError);
      input.classList.remove(motion.isError);
    }, shakeMs + hold),
  );
};

export const clearErrorShake = (wrap: HTMLElement) => {
  const input =
    wrap.matches(`.${motion.input}`)
      ? wrap
      : (wrap.querySelector<HTMLElement>(`.${motion.input}`) ?? wrap);

  const existingRevert = revertTimers.get(wrap);
  if (existingRevert) {
    window.clearTimeout(existingRevert);
    revertTimers.delete(wrap);
  }

  const existingShake = shakeTimers.get(input);
  if (existingShake) {
    window.clearTimeout(existingShake);
    shakeTimers.delete(input);
  }

  wrap.classList.remove(motion.isError);
  input.classList.remove(motion.isError, motion.isShaking);
};

/** Measure an SVG path and set stroke-dasharray for the success-check draw. */
export const calibrateCheckPath = (path: SVGPathElement) => {
  const len = Math.ceil(path.getTotalLength());
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = String(len);
};
