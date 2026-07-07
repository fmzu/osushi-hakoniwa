import type { Sushi, Heart, Species } from "./types";
import { W, H, GROUND_TOP, MAX_SUSHI } from "./constants";
import { SPECIES, RARITY_WEIGHT } from "./species";
import { state, store } from "./store";
import { showBanner } from "./banner";
import { updateZukanCount } from "./zukan";

export const sushis: Sushi[] = [];
export const hearts: Heart[] = [];

export function pickSpecies(rng: () => number = Math.random): Species {
  const total = SPECIES.reduce((a, s) => a + RARITY_WEIGHT[s.rarity], 0);
  let r = rng() * total;
  for (const s of SPECIES) {
    r -= RARITY_WEIGHT[s.rarity];
    if (r < 0) return s;
  }
  return SPECIES[SPECIES.length - 1];
}

export function spawn(x?: number, y?: number, sp?: Species): void {
  const species = sp || pickSpecies();
  sushis.push({
    sp: species,
    x: Math.max(2, Math.min(W - 18, x ?? Math.random() * (W - 20))),
    y: Math.max(
      GROUND_TOP,
      Math.min(H - 18, y ?? GROUND_TOP + Math.random() * (H - GROUND_TOP - 18)),
    ),
    dir: Math.random() < 0.5 ? 1 : -1,
    frame: Math.random() < 0.5 ? 0 : 1,
    timer: Math.random() * species.step,
    pause: 0,
  });
  const count = document.getElementById("count");
  if (count) count.textContent = String(sushis.length);
}

export function markSeen(sp: Species): void {
  if (state.seen.has(sp.id)) return;
  state.seen.add(sp.id);
  store.save(state);
  if (sp.rarity === 3) {
    showBanner("✨レアはっけん！！ " + sp.name + "✨");
    for (let i = 0; i < 10; i++)
      hearts.push({ x: 30 + Math.random() * 100, y: GROUND_TOP + Math.random() * 80, life: 1 });
  } else {
    showBanner("みかけた！ " + sp.name);
  }
  updateZukanCount();
}

export function visit(): boolean {
  if (sushis.length >= MAX_SUSHI) return false;
  const sp = pickSpecies();
  spawn(undefined, undefined, sp);
  markSeen(sp);
  return true;
}

export function leave(): void {
  if (sushis.length <= 3) return;
  const i = Math.floor(Math.random() * sushis.length);
  sushis.splice(i, 1);
  const count = document.getElementById("count");
  if (count) count.textContent = String(sushis.length);
}

export function tick(dt: number): void {
  for (const s of sushis) {
    const p = s.sp;
    if (s.pause > 0) {
      s.pause -= dt;
      continue;
    }
    s.timer += dt;
    if (s.timer < p.step) continue;
    s.timer -= p.step;
    s.frame = 1 - s.frame;
    if (s.frame === 0) {
      s.x += 2 * s.dir;
      if (Math.random() < p.driftP) s.y += Math.random() < 0.5 ? 1 : -1;
      s.y = Math.max(GROUND_TOP, Math.min(H - 18, s.y));
      if (s.x < 2 || s.x > W - 18) {
        s.dir *= -1;
        s.x = Math.max(2, Math.min(W - 18, s.x));
      } else if (Math.random() < p.flipP) s.dir *= -1;
      if (Math.random() < p.pauseP)
        s.pause = p.pauseLen[0] + Math.random() * (p.pauseLen[1] - p.pauseLen[0]);
      if (Math.random() < p.heartP) hearts.push({ x: s.x + 8, y: s.y - 2, life: 1 });
    }
  }
  for (let i = hearts.length - 1; i >= 0; i--) {
    hearts[i].y -= dt * 0.008;
    hearts[i].life -= dt / 1200;
    if (hearts[i].life <= 0) hearts.splice(i, 1);
  }
}
