import type { Sushi } from "./types";
import { W, H } from "./constants";
import { cv } from "./canvas";
import { sushis, hearts } from "./world";
import { state, store } from "./store";
import { GREET_NEED } from "./species";
import { showBanner } from "./banner";
import { updateZukanCount } from "./zukan";

export function greet(s: Sushi): void {
  const sp = s.sp;
  hearts.push({ x: s.x + 8, y: s.y - 2, life: 1 });
  if (state.friends.has(sp.id)) return;
  state.greet[sp.id] = (state.greet[sp.id] || 0) + 1;
  if (sp.seikaku === "はずかしがりや") {
    s.dir *= -1;
    s.pause = 0;
    s.x = Math.max(2, Math.min(W - 18, s.x + 6 * s.dir));
  }
  if (state.greet[sp.id] >= GREET_NEED[sp.seikaku]) {
    state.friends.add(sp.id);
    showBanner("なかよしになった！ " + sp.name);
    for (let i = 0; i < 6; i++)
      hearts.push({ x: s.x + 4 + Math.random() * 8, y: s.y - 2 - Math.random() * 4, life: 1 });
    updateZukanCount();
  }
  store.save(state);
}

export function initInput(): void {
  cv.addEventListener("pointerdown", (e) => {
    const r = cv.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W,
      py = ((e.clientY - r.top) / r.height) * H;
    const sorted = [...sushis].sort((a, b) => b.y - a.y);
    for (const s of sorted) {
      if (px >= s.x && px < s.x + 16 && py >= s.y && py < s.y + 16) {
        greet(s);
        return;
      }
    }
  });
}
