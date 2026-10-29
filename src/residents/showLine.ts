import type { Sushi } from "../types";
import { cv } from "../canvas";
import { bubbles, SHOW_MS, FADE_MS } from "./lineBubbles";
import { placeBubble } from "./placeBubble";

function arm(s: Sushi, el: HTMLElement): number {
  return window.setTimeout(() => {
    el.classList.add("fade");
    bubbles.get(s)!.timer = window.setTimeout(() => {
      el.remove();
      bubbles.delete(s);
    }, FADE_MS);
  }, SHOW_MS);
}

/** 寿司の頭上に一行を出す。出ている間にもう一度タップしたら出し直さず延長する */
export function showLine(s: Sushi): void {
  if (!s.line) return;
  const cur = bubbles.get(s);
  if (cur) {
    clearTimeout(cur.timer);
    cur.el.classList.remove("fade");
    cur.timer = arm(s, cur.el);
    return;
  }
  const el = document.createElement("div");
  el.className = "bubble";
  el.textContent = s.line;
  cv.parentElement!.append(el);
  bubbles.set(s, { el, timer: 0 });
  bubbles.get(s)!.timer = arm(s, el);
  placeBubble(s, el);
}
