// @ts-nocheck
import "./style.css";
import { W, H, GROUND_TOP, MAX_SUSHI, BELL_CD, ZUKAN_PAGE_SIZE, AWAY_MS } from "./constants";
import { bakeAllSprites } from "./sprites";
import { SPECIES, RARITY_WEIGHT, GREET_NEED } from "./species";
import { WALLS, currentWall } from "./walls";
import { store, state } from "./store";
import { showBanner } from "./banner";
import { updateZukanCount, renderZukan, initZukan } from "./zukan";
import { sushis, hearts, pickSpecies, spawn, markSeen, visit, leave, tick } from "./world";
import { cv, ctx } from "./canvas";
import { draw } from "./render";

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
function greet(s) {
  const sp = s.sp;
  hearts.push({ x: s.x + 8, y: s.y - 2, life: 1 });
  if (state.friends.has(sp.id)) return;
  state.greet[sp.id] = (state.greet[sp.id] || 0) + 1;
  if (sp.seikaku === "はずかしがりや") {
    // 逃げる素振り
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

cv.addEventListener("pointerdown", (e) => {
  const r = cv.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * W,
    py = ((e.clientY - r.top) / r.height) * H;
  const sorted = [...sushis].sort((a, b) => b.y - a.y); // 手前のコから当たり判定
  for (const s of sorted) {
    if (px >= s.x && px < s.x + 16 && py >= s.y && py < s.y + 16) {
      greet(s);
      return;
    }
  }
});

// ============ 呼び鈴 ============
const bell = document.getElementById("bell");
let bellLeft = 0;
bell.addEventListener("click", () => {
  if (bellLeft > 0) return;
  bellLeft = BELL_CD;
  bell.disabled = true;
  setTimeout(
    () => {
      visit();
    },
    1500 + Math.random() * 2500,
  ); // 少し間を置いて来店
});
setInterval(() => {
  if (bellLeft <= 0) return;
  bellLeft--;
  if (bellLeft > 0) {
    bell.textContent = `🔔 (${bellLeft})`;
  } else {
    bell.textContent = "🔔 よぶ";
    bell.disabled = false;
  }
}, 1000);

// ============ ずかん ============
const wallModal = document.getElementById("wallModal");
function renderWalls() {
  const el = document.getElementById("swatches");
  el.replaceChildren();
  for (const w of WALLS) {
    const s = document.createElement("div");
    s.className = "swatch" + (w.id === state.wall ? " on" : "");
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.style.background = w.wall;
    chip.style.borderBottom = "4px solid " + w.base;
    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = w.name;
    s.append(chip, nm);
    s.onclick = () => {
      state.wall = w.id;
      store.save(state);
      renderWalls();
    };
    el.append(s);
  }
}
document.getElementById("openWall").onclick = () => {
  renderWalls();
  wallModal.classList.add("open");
};
document.getElementById("closeWall").onclick = () => wallModal.classList.remove("open");
wallModal.addEventListener("pointerdown", (e) => {
  if (e.target === wallModal) wallModal.classList.remove("open");
});
updateZukanCount();
initZukan();

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
