import { createState, solveFrom, step } from "./core";
import type { Board, Move, State } from "./core";

/** 盤面の署名（納豆の拾い集め状態＋全駒の位置）。駒の並び順に左右されない */
function signature(b: Board): string {
  return (
    (b.armed ?? "") +
    "|" +
    b.pieces
      .map((p) => p.id + p.x + "," + p.y)
      .sort()
      .join(";")
  );
}

/** 残りの手順のコスト（わさびの罰込み） */
function restCost(state: State, rest: Move[]): number {
  let s = { ...state, level: { ...state.level, moveLimit: Infinity }, moves: 0 };
  for (const m of rest) s = step(s, m.id, m.dir);
  return s.moves;
}

/** 事前計算した正解手順の上にいて、残りが残り手数に収まるなら、その次の一手を返す。そうでなければ null */
export function precomputedHint(state: State, sol: Move[]): Move | null {
  const now = signature(state.board);
  let s = createState(state.level);
  for (let i = 0; i < sol.length; i++) {
    if (signature(s.board) === now) {
      const left = state.level.moveLimit - state.moves;
      return restCost(s, sol.slice(i)) <= left ? sol[i] : null;
    }
    s = step({ ...s, moves: 0 }, sol[i].id, sol[i].dir);
  }
  return null;
}

/** ヒントの一手を探す。手順の上なら即答、外れていたらブラウザ内のソルバーで探す。なければ null */
export function findHint(state: State, sol: Move[]): Move | null {
  const pre = precomputedHint(state, sol);
  if (pre) return pre;
  const found = solveFrom(state.level, state.board, state.level.moveLimit - state.moves, 300_000);
  return found && found.length > 0 ? found[0] : null;
}
