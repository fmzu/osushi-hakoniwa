// @ts-nocheck
import "./style.css";
import { W, H, GROUND_TOP, MAX_SUSHI, BELL_CD, ZUKAN_PAGE_SIZE, AWAY_MS } from "./constants";
import { bakeAllSprites } from "./sprites";
import { SPECIES, RARITY_WEIGHT, GREET_NEED } from "./species";
import { WALLS, currentWall } from "./walls";
import { store, state } from "./store";

bakeAllSprites(SPECIES);

// ============ ワールド ============
const cv = document.getElementById("cv");
cv.width = W;
cv.height = H;
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;

const sushis = [],
  hearts = [];

function pickSpecies() {
  const total = SPECIES.reduce((a, s) => a + RARITY_WEIGHT[s.rarity], 0);
  let r = Math.random() * total;
  for (const s of SPECIES) {
    r -= RARITY_WEIGHT[s.rarity];
    if (r < 0) return s;
  }
  return SPECIES.at(-1);
}
function spawn(x, y, sp) {
  sp = sp || pickSpecies();
  sushis.push({
    sp,
    x: Math.max(2, Math.min(W - 18, x ?? Math.random() * (W - 20))),
    y: Math.max(
      GROUND_TOP,
      Math.min(H - 18, y ?? GROUND_TOP + Math.random() * (H - GROUND_TOP - 18)),
    ),
    dir: Math.random() < 0.5 ? 1 : -1,
    frame: Math.random() < 0.5 ? 0 : 1,
    timer: Math.random() * sp.step,
    pause: 0,
  });
  document.getElementById("count").textContent = sushis.length;
}
function markSeen(sp) {
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
function visit() {
  if (sushis.length >= MAX_SUSHI) return false;
  const sp = pickSpecies();
  spawn(undefined, undefined, sp);
  markSeen(sp);
  return true;
}
function leave() {
  if (sushis.length <= 3) return;
  const i = Math.floor(Math.random() * sushis.length);
  sushis.splice(i, 1);
  document.getElementById("count").textContent = sushis.length;
}

function tick(dt) {
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

function drawHeart(x, y, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = "#F783A1";
  const px = [
    [1, 0],
    [3, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [2, 3],
  ];
  for (const [dx, dy] of px) ctx.fillRect(Math.round(x) + dx - 2, Math.round(y) + dy - 2, 1, 1);
  ctx.globalAlpha = 1;
}
function draw() {
  ctx.fillStyle = "#FFEAF1";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FBD3E0";
  for (let y = 4; y < H; y += 12)
    for (let x = (y / 12) % 2 ? 10 : 4; x < W; x += 12) ctx.fillRect(x, y, 1, 1);
  const cw = currentWall(state.wall);
  ctx.fillStyle = cw.wall;
  ctx.fillRect(0, 0, W, GROUND_TOP - 2);
  ctx.fillStyle = cw.line;
  for (let x = 8; x < W; x += 16) ctx.fillRect(x, 0, 1, GROUND_TOP - 2);
  ctx.fillStyle = cw.base;
  ctx.fillRect(0, GROUND_TOP - 2, W, 1);
  const sorted = [...sushis].sort((a, b) => a.y - b.y);
  for (const s of sorted) {
    ctx.drawImage(
      s.sp.spr[String(s.dir)][s.pause > 0 ? 0 : s.frame],
      Math.round(s.x),
      Math.round(s.y),
    );
  }
  for (const h of hearts) drawHeart(h.x, h.y, Math.max(0, h.life));
}

let last = performance.now();
(function loop(now) {
  tick(Math.min((now || last) - last, 100));
  last = now || last;
  draw();
  requestAnimationFrame(loop);
})(last);

// ============ はっけん ============
const banner = document.getElementById("banner");
let bannerTimer = null;
function showBanner(text) {
  banner.textContent = text;
  banner.classList.add("show");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove("show"), 1800);
}
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
const zukan = document.getElementById("zukan");
const cards = document.getElementById("cards");
function updateZukanCount() {
  document.getElementById("zcnt").textContent = `${state.friends.size}/${SPECIES.length}`;
  document.getElementById("zcnt2").textContent =
    `みかけた ${state.seen.size}/${SPECIES.length} ・ なかよし ${state.friends.size}/${SPECIES.length}`;
}
let zukanPage = 0;
function zukanPageCount() {
  return Math.ceil(SPECIES.length / ZUKAN_PAGE_SIZE);
}
function renderZukan() {
  cards.replaceChildren();
  for (const sp of SPECIES.slice(zukanPage * ZUKAN_PAGE_SIZE, (zukanPage + 1) * ZUKAN_PAGE_SIZE)) {
    const friend = state.friends.has(sp.id);
    const seen = state.seen.has(sp.id);
    const card = document.createElement("div");
    card.className = "card" + (friend ? "" : seen ? " seen" : " unknown");
    const img = document.createElement("img");
    img.src = (seen ? sp.spr["1"][0] : sp.shadow).toDataURL();
    const rar = document.createElement("div");
    rar.className = "rar";
    rar.textContent = "★".repeat(sp.rarity);
    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = friend ? sp.name : "？？？";
    const sk = document.createElement("div");
    sk.className = "sk";
    sk.textContent = friend
      ? "せいかく: " + sp.seikaku
      : seen
        ? "あいさつして なかよくなろう"
        : "…だれだろう";
    card.append(img, rar, nm, sk);
    cards.append(card);
  }
  document.getElementById("zPageNum").textContent = zukanPage + 1 + " / " + zukanPageCount();
  document.getElementById("zPrev").disabled = zukanPage === 0;
  document.getElementById("zNext").disabled = zukanPage >= zukanPageCount() - 1;
}
document.getElementById("openZukan").onclick = () => {
  zukanPage = 0;
  renderZukan();
  zukan.classList.add("open");
};
document.getElementById("closeZukan").onclick = () => zukan.classList.remove("open");
document.getElementById("zPrev").onclick = () => {
  if (zukanPage > 0) {
    zukanPage--;
    renderZukan();
  }
};
document.getElementById("zNext").onclick = () => {
  if (zukanPage < zukanPageCount() - 1) {
    zukanPage++;
    renderZukan();
  }
};
zukan.addEventListener("pointerdown", (e) => {
  if (e.target === zukan) zukan.classList.remove("open");
});
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
