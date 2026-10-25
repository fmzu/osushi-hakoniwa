import { describe, it, expect } from "vite-plus/test";
import { apply, createState, step } from "./core";
import type { Dir, Move, State } from "./core";
import { findHint, precomputedHint } from "./hintMove";
import { LEVELS } from "./levels";

function play(s: State, moves: Move[]): State {
  return moves.reduce((acc, m) => step(acc, m.id, m.dir), s);
}

describe("precomputedHint", () => {
  it.each(LEVELS.map((l) => [l.chapter + "-" + l.n, l] as const))(
    "%s: on the solution path it returns the next move at every step",
    (_name, l) => {
      let s = createState(l.level);
      for (const m of l.sol) {
        expect(precomputedHint(s, l.sol)).toEqual(m);
        s = step(s, m.id, m.dir);
      }
    },
  );

  it("returns null once off the solution path", () => {
    const l = LEVELS[0];
    const dirs: Dir[] = ["up", "down", "left", "right"];
    const start = createState(l.level);
    // 正解手順の最初の一手とは違う、動ける手を探す
    const off = start.board.pieces
      .filter((p) => p.kind !== "target" && p.kind !== "angry")
      .flatMap((p) => dirs.map((d) => ({ id: p.id, dir: d })))
      .find(
        (m) =>
          (m.id !== l.sol[0].id || m.dir !== l.sol[0].dir) &&
          apply(start.level, start.board, m.id, m.dir).kind === "moved",
      )!;
    expect(precomputedHint(step(start, off.id, off.dir), l.sol)).toBeNull();
  });
});

describe("findHint", () => {
  it("answers from the precomputed path at the start", () => {
    const l = LEVELS[0];
    expect(findHint(createState(l.level), l.sol)).toEqual(l.sol[0]);
  });

  it("falls back to the solver when off the path, and the move is playable", () => {
    const l = LEVELS[0];
    let s = createState(l.level);
    // 正解手順の途中まで進めてから、戻す手を挟んで手順から外れる
    s = play(s, l.sol.slice(0, 2));
    const back: Move = {
      id: l.sol[1].id,
      dir: { left: "right", right: "left", up: "down", down: "up" }[l.sol[1].dir] as Dir,
    };
    s = step(s, back.id, back.dir);
    const h = findHint(s, l.sol);
    expect(h).not.toBeNull();
    expect(apply(s.level, s.board, h!.id, h!.dir).kind).not.toBe("blocked");
  });

  it("does not use the precomputed path when its rest no longer fits the remaining moves", () => {
    // 1-1 で行って戻るを2回すると初期盤に戻るが、残り9手で最短10手には届かない
    const l = LEVELS[0];
    const back: Dir = { left: "right", right: "left", up: "down", down: "up" }[l.sol[0].dir] as Dir;
    const wiggle = [l.sol[0], { id: l.sol[0].id, dir: back }];
    const s = play(createState(l.level), [...wiggle, ...wiggle]);
    expect(l.limit - s.moves).toBeLessThan(l.best);
    expect(precomputedHint(s, l.sol)).toBeNull();
    expect(findHint(s, l.sol)).toBeNull();
  });

  it("returns null when it cannot be cleared within the remaining moves", () => {
    const l = LEVELS[0];
    const s: State = { ...createState(l.level), moves: l.limit - 1 };
    expect(findHint(s, [])).toBeNull();
  });
});
