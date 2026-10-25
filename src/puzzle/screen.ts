import { createState, step, undo } from "./core";
import type { Dir, Move, State } from "./core";
import { CELL, drawBoard } from "./drawBoard";
import type { Slide } from "./drawBoard";
import type { HintRequest, HintResponse } from "./hintWorker";
import { assignLooks } from "./looks";
import type { Look } from "./looks";
import { LEVELS, levelKey } from "./levels";
import { loadProgress, recordMedal, saveProgress } from "./progress";
import type { Medal } from "./progress";
import { createSprites } from "./sprites";

const ARROW: Record<Dir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const MEDAL_MARK: Record<Medal, string> = { gold: "🥇", silver: "🥈" };

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} がない`);
  return el as T;
}

/** すしづめの画面を起動する。sushizume.html の要素にイベントをつなぎ、描画ループを回す */
export function startScreen(): void {
  const board = byId<HTMLCanvasElement>("board");
  const g = board.getContext("2d")!;
  const stage = byId("stage");
  const info = byId("info");
  const meter = byId("meter");
  const note = byId("note");
  const sel = byId<HTMLSelectElement>("level");
  const nextBtn = byId<HTMLButtonElement>("next");
  const hintBtn = byId<HTMLButtonElement>("hint");
  const hintWorker = new Worker(new URL("./hintWorker.ts", import.meta.url), { type: "module" });

  const sprites = createSprites();
  let progress = loadProgress();

  let cur = 0;
  let state: State = createState(LEVELS[0].level);
  let looks = new Map<string, Look>();
  const slides = new Map<string, Slide>();
  let flop: 0 | 1 = 0;
  let shownHint: Move | null = null;
  /** 探索中のヒントの番号と、頼んだときの盤面。探索中でなければ null */
  let asking: { id: number; board: State["board"]; moves: number } | null = null;
  let askSeq = 0;
  let wonAt = 0;

  /** 面の選択肢。クリア済みの面には金/銀の印を付ける */
  function renderOptions(): void {
    sel.replaceChildren(
      ...LEVELS.map((l, i) => {
        const o = document.createElement("option");
        const medal = progress[levelKey(l)];
        o.value = String(i);
        o.textContent = `${medal ? MEDAL_MARK[medal] : "・"} ${l.chapter}章 ${l.who}  ${l.n}/3`;
        return o;
      }),
    );
    sel.value = String(cur);
  }

  function load(i: number): void {
    cur = i;
    state = createState(LEVELS[i].level);
    shownHint = null;
    slides.clear();
    wonAt = 0;
    board.width = state.level.w * CELL;
    board.height = state.level.h * CELL;
    board.style.aspectRatio = `${state.level.w} / ${state.level.h}`;
    looks = assignLooks(state.board.pieces, sprites);
    stage.querySelectorAll(".pop").forEach((e) => e.remove());
    sel.value = String(i);
    update();
  }

  function pop(p: { x: number; y: number; w: number }, text: string, cls: string): void {
    const el = document.createElement("div");
    el.className = "pop " + cls;
    el.textContent = text;
    el.style.left = ((p.x + p.w / 2) / state.level.w) * 100 + "%";
    el.style.top = (p.y / state.level.h) * 100 + "%";
    stage.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  function update(): void {
    const entry = LEVELS[cur];
    const lim = state.level.moveLimit;
    const count = document.createElement("b");
    count.textContent = String(state.moves);
    const best = document.createElement("span");
    best.textContent = `最短 ${entry.best}`;
    info.replaceChildren(count, ` / ${lim} 手`, best);
    meter.style.width = Math.min(100, (state.moves / lim) * 100) + "%";
    note.className = "note";
    if (state.status === "won") {
      const clean = state.undos === 0 && state.hints === 0;
      const chapterDone = entry.n === 3 ? `　${entry.who}の章クリア` : "";
      note.textContent =
        (clean ? "鯛を寿司にした！（金）" : "鯛を寿司にした！（銀：戻す・ヒントを使った）") +
        chapterDone;
      note.className = "note win";
    } else if (state.status === "lost") {
      note.textContent = "次の駅に着いてしまった…";
      note.className = "note lose";
    } else if (state.last === "armed")
      note.textContent = "納豆を拾い集めた。もう一度スワイプすると動く";
    else if (state.last === "blocked") note.textContent = "そっちには動けない";
    else if (shownHint) note.textContent = `ヒント：光っているコマを ${ARROW[shownHint.dir]}`;
    else note.textContent = "宇宙人を鯛のとなりまで連れていこう";
    nextBtn.hidden = state.status !== "won" || cur >= LEVELS.length - 1;
  }

  /** クリアしたとき、金/銀を記録して選択肢の印を更新する */
  function recordClear(): void {
    const clean = state.undos === 0 && state.hints === 0;
    const next = recordMedal(progress, levelKey(LEVELS[cur]), clean ? "gold" : "silver");
    if (next === progress) return;
    progress = next;
    saveProgress(progress);
    renderOptions();
  }

  function move(id: string, dir: Dir): void {
    if (state.status !== "playing") return;
    const before = new Map(state.board.pieces.map((p) => [p.id, [p.x, p.y]]));
    const prev = state;
    state = step(state, id, dir);
    if (state === prev) return;
    shownHint = null;
    const now = performance.now();
    for (const p of state.board.pieces) {
      const [fx, fy] = before.get(p.id)!;
      if (fx !== p.x || fy !== p.y) slides.set(p.id, { fx, fy, t0: now });
    }
    for (const a of state.angered) {
      const p = state.board.pieces.find((q) => q.id === a);
      if (p) pop(p, "ツーン！ +1", "angry");
    }
    if (state.status === "won") {
      wonAt = now;
      const t = state.board.pieces.find((p) => p.kind === "target");
      if (t) setTimeout(() => pop(t, "スシッ", "win"), 120);
      recordClear();
    }
    update();
  }

  // ---- 入力: コマの上でスワイプすると1マス動く ----
  let swipe: { x: number; y: number; id: string } | null = null;
  function cellAt(e: PointerEvent): [number, number] {
    const r = board.getBoundingClientRect();
    return [
      Math.floor(((e.clientX - r.left) / r.width) * state.level.w),
      Math.floor(((e.clientY - r.top) / r.height) * state.level.h),
    ];
  }
  board.addEventListener("pointerdown", (e) => {
    const [cx, cy] = cellAt(e);
    const hit = state.board.pieces.find(
      (p) => cx >= p.x && cx < p.x + p.w && cy >= p.y && cy < p.y + p.h,
    );
    if (!hit) return;
    swipe = { x: e.clientX, y: e.clientY, id: hit.id };
    board.setPointerCapture(e.pointerId);
  });
  board.addEventListener("pointermove", (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    const th = Math.max(16, (board.getBoundingClientRect().width / state.level.w) * 0.3);
    if (Math.abs(dx) < th && Math.abs(dy) < th) return;
    const dir: Dir =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    const id = swipe.id;
    swipe = null;
    move(id, dir);
  });
  board.addEventListener("pointerup", () => {
    swipe = null;
  });
  board.addEventListener("pointercancel", () => {
    swipe = null;
  });

  // ---- ボタン ----
  byId("reset").onclick = () => load(cur);
  byId("undo").onclick = () => {
    state = undo(state);
    shownHint = null;
    slides.clear();
    update();
  };
  hintBtn.onclick = () => {
    if (state.status !== "playing" || asking) return;
    asking = { id: ++askSeq, board: state.board, moves: state.moves };
    hintBtn.disabled = true;
    note.textContent = "考え中…";
    // 手戻しの履歴は探索に要らないので送らない
    const req: HintRequest = {
      id: asking.id,
      state: { ...state, history: [] },
      sol: LEVELS[cur].sol,
    };
    hintWorker.postMessage(req);
  };
  hintWorker.onmessage = (e: MessageEvent<HintResponse>) => {
    const { id, hint } = e.data;
    if (!asking || asking.id !== id) return;
    const asked = asking;
    asking = null;
    hintBtn.disabled = false;
    // 考えているあいだに盤が変わった（動かした・戻した・面を変えた）なら、結果は捨てて数えない
    if (state.board !== asked.board || state.moves !== asked.moves || state.status !== "playing") {
      update();
      return;
    }
    if (hint.kind === "gaveUp") {
      // 何も教えていないので、ヒントを使ったことにはしない
      update();
      note.textContent = "ヒントが見つからなかった。少し戻してから、もう一度";
      return;
    }
    state = { ...state, hints: state.hints + 1, last: null };
    shownHint = hint.kind === "move" ? hint.move : null;
    update();
    if (hint.kind === "impossible") note.textContent = "残りの手数では無理そう。戻すか、はじめから";
  };
  hintWorker.onerror = () => {
    asking = null;
    hintBtn.disabled = false;
    update();
    note.textContent = "ヒントを出せなかった。もう一度押してみて";
  };
  nextBtn.onclick = () => load(cur + 1);
  sel.onchange = () => load(Number(sel.value));

  renderOptions();
  load(0);

  function loop(now: number): void {
    flop = Math.floor(now / 450) % 2 === 0 ? 0 : 1;
    drawBoard(g, { state, looks, slides, hint: shownHint, wonAt, flop, now });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
