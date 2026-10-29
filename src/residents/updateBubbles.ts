import { bubbles } from "./lineBubbles";
import { placeBubble } from "./placeBubble";

/** 毎フレーム呼ぶ。歩く寿司に吹き出しを追従させる */
export function updateBubbles(): void {
  for (const [s, b] of bubbles) placeBubble(s, b.el);
}
