/**
 * Public motion class names and data-attribute hooks from the
 * transitions.dev recipes packaged with `@sarchauhan/chat`.
 *
 * Consumers should import these constants instead of hard-coding
 * `t-*` strings so class names stay autocomplete-safe and typechecked.
 */

export const motion = {
  textSwap: "t-text-swap",
  isExit: "is-exit",
  isEnterStart: "is-enter-start",
  iconSwap: "t-icon-swap",
  icon: "t-icon",
  successCheck: "t-success-check",
  dropdown: "t-dropdown",
  isOpen: "is-open",
  isClosing: "is-closing",
  inputWrap: "t-input-wrap",
  input: "t-input",
  errorMsg: "t-error-msg",
  isError: "is-error",
  isShaking: "is-shaking",
} as const;

export type MotionClass = (typeof motion)[keyof typeof motion];

export const iconSwapStates = ["a", "b"] as const;
export type IconSwapState = (typeof iconSwapStates)[number];

export const successCheckStates = ["out", "in"] as const;
export type SuccessCheckState = (typeof successCheckStates)[number];

export const dropdownOrigins = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type DropdownOrigin = (typeof dropdownOrigins)[number];

export const motionData = {
  state: "data-state",
  icon: "data-icon",
  origin: "data-origin",
  open: "data-open",
} as const;

export type MotionDataAttr = (typeof motionData)[keyof typeof motionData];

export const textSwapPhases = ["rest", "exit", "enter-start"] as const;
export type TextSwapPhase = (typeof textSwapPhases)[number];

export const dropdownPhases = ["rest", "open", "closing"] as const;
export type DropdownPhase = (typeof dropdownPhases)[number];
