// 満員電車スライドパズル 核ロジック（描画なし）
// 箱入り娘型。盤は W×H、駒は矩形、空きマスにしか滑れない。
// ゴール: 主人公(hero)がターゲット(target)の隣に立つ。ターゲットは動かない。
//
// このファイルがルールの正。tools/sushizume（Go）のソルバーは同じルールを実装しているので、
// ここを変えたら Go 側も同じに直すこと（詳細は tools/sushizume/README.md）。
//
// 駒の種類
//  hero    主人公(宇宙人)。動かせる
//  target  ターゲット(鯛)。動かない
//  mob     乗客(寿司)。動かせる
//  heavy   納豆。動かすのに2手かかる（1手目で拾い集める、2手目で動く）。
//          埋まっているマスへ割り込める（そこにいた1×1の駒と入れ替わる）
//  angry   わさび。動かない。主人公が新たに隣のマスに入ると「ツーン！」で手数が1増える

export type Kind = "hero" | "target" | "mob" | "heavy" | "angry";
export type Dir = "up" | "down" | "left" | "right";

export type Piece = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Level = {
  w: number;
  h: number;
  moveLimit: number;
  pieces: Piece[];
};

export type Board = {
  pieces: Piece[];
  /** 拾い集めている納豆の id */
  armed: string | null;
};

export type State = {
  level: Level;
  board: Board;
  moves: number;
  status: "playing" | "won" | "lost";
  history: { board: Board; moves: number }[];
  undos: number;
  hints: number;
  last: "moved" | "armed" | "blocked" | null;
  /** 直前の手でツーンとなったわさびの id（演出用） */
  angered: string[];
};

export type Move = { id: string; dir: Dir };

/** ルールの調整。テスト用で、ゲーム本体では使わない */
export type RuleOptions = {
  /** true ならわさびの手数ペナルティを無効にする（わさびを「ただの壁」として扱う） */
  noPenalty?: boolean;
};

export type Outcome =
  | { kind: "moved"; board: Board; cost: number; angered: string[] }
  | { kind: "armed"; board: Board; cost: number; angered: string[] }
  | { kind: "blocked" };

const DELTA: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const DIRS: Dir[] = ["up", "down", "left", "right"];

export function createState(level: Level): State {
  return {
    level,
    board: { pieces: level.pieces.map((p) => ({ ...p })), armed: null },
    moves: 0,
    status: "playing",
    history: [],
    undos: 0,
    hints: 0,
    last: null,
    angered: [],
  };
}

function isFixed(p: Piece): boolean {
  return p.kind === "target" || p.kind === "angry";
}

function inBounds(level: Level, p: Piece): boolean {
  return p.x >= 0 && p.y >= 0 && p.x + p.w <= level.w && p.y + p.h <= level.h;
}

function overlaps(a: Piece, b: Piece): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** 重なっておらず、辺で接している */
function adjacent(a: Piece, b: Piece): boolean {
  if (overlaps(a, b)) return false;
  const touchX = a.x + a.w === b.x || b.x + b.w === a.x;
  const touchY = a.y + a.h === b.y || b.y + b.h === a.y;
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  const overlapY = a.y < b.y + b.h && b.y < a.y + a.h;
  return (touchX && overlapY) || (touchY && overlapX);
}

/** 駒を1マス動かした配置を返す。動けなければ null */
function slide(level: Level, pieces: Piece[], p: Piece, dir: Dir): Piece[] | null {
  if (isFixed(p)) return null;
  const [dx, dy] = DELTA[dir];
  const moved = { ...p, x: p.x + dx, y: p.y + dy };
  if (!inBounds(level, moved)) return null;
  const hit = pieces.filter((q) => q.id !== p.id && overlaps(moved, q));
  if (hit.length === 0) return pieces.map((q) => (q.id === p.id ? moved : q));
  if (p.kind === "heavy" && hit.length === 1 && p.w === 1 && p.h === 1) {
    const v = hit[0];
    if (v.w !== 1 || v.h !== 1 || isFixed(v)) return null;
    const swapped = { ...v, x: p.x, y: p.y };
    return pieces.map((q) => (q.id === p.id ? moved : q.id === v.id ? swapped : q));
  }
  return null;
}

/** 主人公が動いた結果、新たに隣接したわさびの一覧（ツーンとくるのは主人公だけ） */
function newlyAngered(before: Piece[], after: Piece[]): string[] {
  const heroBefore = before.find((q) => q.kind === "hero");
  const heroAfter = after.find((q) => q.kind === "hero");
  if (!heroBefore || !heroAfter) return [];
  if (heroBefore.x === heroAfter.x && heroBefore.y === heroAfter.y) return [];
  return after
    .filter((a) => a.kind === "angry" && adjacent(heroAfter, a) && !adjacent(heroBefore, a))
    .map((a) => a.id);
}

export function apply(
  level: Level,
  board: Board,
  id: string,
  dir: Dir,
  opts: RuleOptions = {},
): Outcome {
  const p = board.pieces.find((q) => q.id === id);
  if (!p || isFixed(p)) return { kind: "blocked" };

  if (p.kind === "heavy" && board.armed !== id) {
    return { kind: "armed", board: { pieces: board.pieces, armed: id }, cost: 1, angered: [] };
  }
  const next = slide(level, board.pieces, p, dir);
  if (!next) return { kind: "blocked" };
  const angered = newlyAngered(board.pieces, next);
  const penalty = opts.noPenalty ? 0 : angered.length;
  return { kind: "moved", board: { pieces: next, armed: null }, cost: 1 + penalty, angered };
}

export function isWon(pieces: Piece[]): boolean {
  const hero = pieces.find((p) => p.kind === "hero");
  const target = pieces.find((p) => p.kind === "target");
  return !!hero && !!target && adjacent(hero, target);
}

export function step(state: State, id: string, dir: Dir, opts: RuleOptions = {}): State {
  if (state.status !== "playing") return state;
  const out = apply(state.level, state.board, id, dir, opts);
  if (out.kind === "blocked") return { ...state, last: "blocked", angered: [] };
  const moves = state.moves + out.cost;
  let status: State["status"] = "playing";
  // 制限を超えたらクリアの形でも失敗（わさびの罰で最後の一手が制限をまたぐ場合）
  if (moves > state.level.moveLimit) status = "lost";
  else if (isWon(out.board.pieces)) status = "won";
  else if (moves >= state.level.moveLimit) status = "lost";
  return {
    ...state,
    board: out.board,
    moves,
    status,
    history: [...state.history, { board: state.board, moves: state.moves }],
    last: out.kind,
    angered: out.angered,
  };
}

export function undo(state: State): State {
  const prev = state.history[state.history.length - 1];
  if (!prev) return state;
  return {
    ...state,
    board: prev.board,
    moves: prev.moves,
    status: "playing",
    history: state.history.slice(0, -1),
    undos: state.undos + 1,
    last: null,
    angered: [],
  };
}

// ---------- ソルバー（コストが1か2なので、コスト別バケットの Dijkstra） ----------

function key(b: Board): string {
  let s = b.armed ?? "";
  for (const p of b.pieces) if (!isFixed(p)) s += "|" + p.x + "," + p.y;
  return s;
}

/** 探索の結果。gaveUp は状態数の上限で打ち切った（解があるかは分からない） */
export type SearchResult = { kind: "found"; path: Move[] } | { kind: "none" } | { kind: "gaveUp" };

/** 現在の盤面から、残り手数以内の最小コスト手順を探す */
export function searchFrom(
  level: Level,
  board: Board,
  movesLeft: number,
  maxStates = 1_500_000,
  opts: RuleOptions = {},
): SearchResult {
  if (isWon(board.pieces)) return { kind: "found", path: [] };
  // 手順は配列をコピーせず、親の番号とそこからの一手で持つ（Go のソルバーと同じ）
  const boards: Board[] = [board];
  const keys: string[] = [key(board)];
  const parent: number[] = [-1];
  const via: (Move | null)[] = [null];
  const best = new Map<string, number>([[keys[0], 0]]);
  const buckets: number[][] = [[0]];
  const pathTo = (i: number): Move[] => {
    const path: Move[] = [];
    for (let j = i; parent[j] !== -1; j = parent[j]) path.push(via[j]!);
    return path.reverse();
  };
  for (let c = 0; c <= movesLeft; c++) {
    const bucket = buckets[c];
    if (!bucket) continue;
    for (const i of bucket) {
      if ((best.get(keys[i]) ?? Infinity) < c) continue;
      // コストが1か2なので、見つけた時点ではなくバケットから取り出した時点で判定する
      if (isWon(boards[i].pieces)) return { kind: "found", path: pathTo(i) };
      for (const p of boards[i].pieces) {
        if (isFixed(p)) continue;
        for (const d of DIRS) {
          const out = apply(level, boards[i], p.id, d, opts);
          if (out.kind === "blocked") continue;
          const cost = c + out.cost;
          if (cost > movesLeft) continue;
          const k = key(out.board);
          if ((best.get(k) ?? Infinity) <= cost) continue;
          best.set(k, cost);
          if (best.size > maxStates) return { kind: "gaveUp" };
          const j = boards.length;
          boards.push(out.board);
          keys.push(k);
          parent.push(i);
          via.push({ id: p.id, dir: d });
          (buckets[cost] ||= []).push(j);
          // 納豆を拾い集める手は向きによらないので、向きの試行は1回で足りる
          if (out.kind === "armed") break;
        }
      }
    }
  }
  return { kind: "none" };
}

/** searchFrom の手順だけを返す版。解なし・打ち切りはどちらも null */
export function solveFrom(
  level: Level,
  board: Board,
  movesLeft: number,
  maxStates = 1_500_000,
  opts: RuleOptions = {},
): Move[] | null {
  const r = searchFrom(level, board, movesLeft, maxStates, opts);
  return r.kind === "found" ? r.path : null;
}

export function solve(level: Level, maxStates?: number, opts?: RuleOptions): Move[] | null {
  return solveFrom(
    level,
    { pieces: level.pieces.map((p) => ({ ...p })), armed: null },
    level.moveLimit,
    maxStates,
    opts,
  );
}

/** 手順の総コスト */
export function costOf(level: Level, moves: Move[], opts?: RuleOptions): number {
  let s = createState({ ...level, moveLimit: 9999 });
  for (const m of moves) s = step(s, m.id, m.dir, opts);
  return s.moves;
}

/** 文字盤の記法
 *  H=主人公 T=ターゲット W=納豆 A か数字=わさび .=空き
 *  その他の文字=乗客。同じ文字が隣接していれば1つの矩形駒
 */
export function parseLevel(rows: string[], opts: { moveLimit: number }): Level {
  const h = rows.length;
  const w = rows[0].length;
  const pieces: Piece[] = [];
  const done = new Set<string>();
  const kindOf = (c: string): Kind =>
    c === "H"
      ? "hero"
      : c === "T"
        ? "target"
        : c === "W"
          ? "heavy"
          : c === "A" || /[0-9]/.test(c)
            ? "angry"
            : "mob";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === "." || done.has(c)) continue;
      let pw = 0;
      while (x + pw < w && rows[y][x + pw] === c) pw++;
      let ph = 0;
      while (y + ph < h && rows[y + ph].slice(x, x + pw) === c.repeat(pw)) ph++;
      pieces.push({ id: c, kind: kindOf(c), x, y, w: pw, h: ph });
      done.add(c);
    }
  }
  // 固定駒を後ろに回しておく（key の走査が軽くなる）
  pieces.sort((a, b) => Number(isFixed(a)) - Number(isFixed(b)));
  return { w, h, moveLimit: opts.moveLimit, pieces };
}
