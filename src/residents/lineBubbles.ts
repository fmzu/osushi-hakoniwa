import type { Sushi } from "../types";

export type Bubble = { el: HTMLElement; timer: number };

/** 吹き出しを出している寿司 */
export const bubbles = new Map<Sushi, Bubble>();

export const SHOW_MS = 2600;
export const FADE_MS = 400;
