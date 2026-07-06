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
import { scheduleVisit, scheduleLeave, welcomeBack, startLastVisitSave } from "./schedule";

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
// scheduleVisit/scheduleLeave/welcomeBack/startLastVisitSave は ./schedule に切り出し済み
// 起動時の呼び出し配置は Task 19 で行う
