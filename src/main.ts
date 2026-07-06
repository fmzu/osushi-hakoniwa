// @ts-nocheck
import "./style.css";
import { W, H, GROUND_TOP, MAX_SUSHI, ZUKAN_PAGE_SIZE, AWAY_MS } from "./constants";
import { bakeAllSprites } from "./sprites";
import { SPECIES, RARITY_WEIGHT } from "./species";
import { WALLS, currentWall } from "./walls";
import { store, state } from "./store";
import { showBanner } from "./banner";
import { updateZukanCount, renderZukan, initZukan } from "./zukan";
import { initWallModal } from "./wallModal";
import { sushis, pickSpecies, spawn, markSeen, visit, leave, tick } from "./world";
import { ctx } from "./canvas";
import { draw } from "./render";
import { initBell } from "./bell";
import { initInput } from "./input";

bakeAllSprites(SPECIES);

// ============ ワールド ============

let last = performance.now();
(function loop(now) {
  tick(Math.min((now || last) - last, 100));
  last = now || last;
  draw();
  requestAnimationFrame(loop);
})(last);

// ============ はっけん ============
initInput();

// ============ 呼び鈴 ============
initBell();

// ============ ずかん ============
updateZukanCount();
initZukan();
initWallModal();

// ============ 来店・退店(タイマー) ============
function scheduleVisit() {
  setTimeout(
    () => {
      visit();
      scheduleVisit();
    },
    60000 + Math.random() * 60000,
  ); // 60〜120秒
}
function scheduleLeave() {
  setTimeout(
    () => {
      leave();
      scheduleLeave();
    },
    120000 + Math.random() * 120000,
  ); // 2〜4分
}
scheduleVisit();
scheduleLeave();

// ============ 留守中の来店 + 初回 ============
(function welcomeBack() {
  let arrivals = 0;
  if (state.lastVisit > 0) {
    arrivals = Math.min(5, Math.floor((Date.now() - state.lastVisit) / AWAY_MS));
  }
  for (let i = 0; i < arrivals; i++) visit();
  if (arrivals > 0) setTimeout(() => showBanner("るすのあいだに 来てたみたい"), 600);
  while (sushis.length < 3) visit(); // 初回・過疎時の最低保証
})();
// 最終訪問時刻を定期保存
setInterval(() => {
  state.lastVisit = Date.now();
  store.save(state);
}, 30000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    state.lastVisit = Date.now();
    store.save(state);
  }
});
