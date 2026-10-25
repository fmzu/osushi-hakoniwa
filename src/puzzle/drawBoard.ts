import type { Move, Piece, State } from "./core";
import type { Look } from "./looks";

/** 1マスのドット数（スプライトは1マス16×16） */
export const CELL = 16;
const MOVE_MS = 110;

/** 動いたコマのスライド演出。fx,fy は動く前の位置 */
export type Slide = { fx: number; fy: number; t0: number };

export type DrawInput = {
  state: State;
  looks: Map<string, Look>;
  slides: Map<string, Slide>;
  hint: Move | null;
  /** クリアした時刻（performance.now） */
  wonAt: number;
  flop: 0 | 1;
  now: number;
};

/** スライド演出を考慮した、いまの描画位置 */
function position(p: Piece, slides: Map<string, Slide>, now: number): [number, number] {
  const a = slides.get(p.id);
  if (!a) return [p.x, p.y];
  const t = Math.min(1, (now - a.t0) / MOVE_MS);
  if (t >= 1) {
    slides.delete(p.id);
    return [p.x, p.y];
  }
  const e = 1 - (1 - t) * (1 - t);
  return [a.fx + (p.x - a.fx) * e, a.fy + (p.y - a.fy) * e];
}

export function drawBoard(g: CanvasRenderingContext2D, d: DrawInput): void {
  const { state, looks, slides, hint, wonAt, flop, now } = d;
  const { w, h } = state.level;
  const won = state.status === "won";
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#FFEAF1";
  g.fillRect(0, 0, w * CELL, h * CELL);
  g.fillStyle = "#FBD3E0";
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if ((x + y) % 2) g.fillRect(x * CELL, y * CELL, CELL, CELL);
  for (const p of state.board.pieces) {
    const [x, y] = position(p, slides, now);
    if (hint && hint.id === p.id) {
      g.fillStyle = "#FFE066";
      g.fillRect(Math.round(x * CELL), Math.round(y * CELL), p.w * CELL, p.h * CELL);
    }
    const sprite = looks.get(p.id)!({ won, armedId: state.board.armed, flop });
    // クリアした鯛の寿司は、ぴょんと跳ねて着地する
    const lift = p.kind === "target" && won ? -Math.max(0, 3 - (now - wonAt) / 120) | 0 : 0;
    g.drawImage(sprite, Math.round(x * CELL), Math.round(y * CELL) + lift);
  }
  if (won) {
    const t = state.board.pieces.find((p) => p.kind === "target");
    if (!t) return;
    const phase = Math.floor((now - wonAt) / 150) % 2;
    g.fillStyle = "#FFF7B0";
    const sparkles = phase
      ? [
          [1, 1],
          [14, 3],
          [3, 13],
          [13, 12],
        ]
      : [
          [7, 0],
          [0, 7],
          [15, 8],
          [8, 15],
        ];
    for (const [dx, dy] of sparkles) g.fillRect(t.x * CELL + dx, t.y * CELL + dy, 1, 1);
  }
}
