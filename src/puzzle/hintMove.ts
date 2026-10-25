import { costOf, createState, searchFrom, step } from "./core";
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

/** 事前計算した正解手順の上にいて、残りが残り手数に収まるなら、その次の一手を返す。そうでなければ null */
export function precomputedHint(state: State, sol: Move[]): Move | null {
  const now = signature(state.board);
  let s = createState(state.level);
  for (let i = 0; i < sol.length; i++) {
    if (signature(s.board) === now) {
      const left = state.level.moveLimit - state.moves;
      // 残りの手順のコスト（わさびの罰込み）= 全体 − ここまで
      const rest = costOf(state.level, sol) - costOf(state.level, sol.slice(0, i));
      return rest <= left ? sol[i] : null;
    }
    s = step({ ...s, moves: 0 }, sol[i].id, sol[i].dir);
  }
  return null;
}

/** ヒントの結果。gaveUp は探索の上限で打ち切った（解けるかは分からない） */
export type Hint = { kind: "move"; move: Move } | { kind: "impossible" } | { kind: "gaveUp" };

/** 外れた局面で探す状態数の上限。15面で無駄な手を混ぜた150局面では一度も達しなかった */
export const HINT_MAX_STATES = 300_000;

/** ヒントの一手を探す。手順の上なら即答、外れていたらソルバーで探す */
export function findHint(state: State, sol: Move[], maxStates = HINT_MAX_STATES): Hint {
  const pre = precomputedHint(state, sol);
  if (pre) return { kind: "move", move: pre };
  const r = searchFrom(state.level, state.board, state.level.moveLimit - state.moves, maxStates);
  if (r.kind === "gaveUp") return r;
  return r.kind === "found" && r.path.length > 0
    ? { kind: "move", move: r.path[0] }
    : { kind: "impossible" };
}
