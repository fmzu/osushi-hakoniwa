import type { Sushi } from "../types";
import { W } from "../constants";
import { cv } from "../canvas";

/** canvas の座標を表示サイズに換算して、寿司の頭上に置く */
export function placeBubble(s: Sushi, el: HTMLElement): void {
  const k = cv.getBoundingClientRect().width / W;
  el.style.left = cv.offsetLeft + (s.x + 8) * k + "px";
  el.style.top = cv.offsetTop + (s.y + 1) * k + "px";
}
