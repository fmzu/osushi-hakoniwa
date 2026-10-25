import { describe, it, expect } from "vite-plus/test";
import { costOf, createState, isWon, parseLevel, solve, step, undo } from "./core";
import type { Dir, State } from "./core";

/** 文字盤から遊び始める。制限手数は十分大きくしておく */
function start(rows: string[], moveLimit = 99): State {
  return createState(parseLevel(rows, { moveLimit }));
}

function at(s: State, id: string): [number, number] {
  const p = s.board.pieces.find((q) => q.id === id)!;
  return [p.x, p.y];
}

/** 動かして、動けたことと手数の増え方を確かめる */
function mustMove(s: State, id: string, dir: Dir, cost: number): State {
  const next = step(s, id, dir);
  expect(next.last, `${id}→${dir} が動けない`).not.toBe("blocked");
  expect(next.moves - s.moves).toBe(cost);
  return next;
}

function mustBlock(s: State, id: string, dir: Dir): void {
  const next = step(s, id, dir);
  expect(next.last).toBe("blocked");
  expect(next.board).toBe(s.board);
  expect(next.moves).toBe(s.moves);
}

describe("parseLevel", () => {
  it("reads kinds, merges adjacent letters into one rectangle and sorts fixed pieces last", () => {
    const lv = parseLevel(["HaaT", "W.A.", "b..1"], { moveLimit: 9 });
    expect(lv.w).toBe(4);
    expect(lv.h).toBe(3);
    const byId = Object.fromEntries(lv.pieces.map((p) => [p.id, p]));
    expect(byId.H.kind).toBe("hero");
    expect(byId.T.kind).toBe("target");
    expect(byId.W.kind).toBe("heavy");
    expect(byId.A.kind).toBe("angry");
    expect(byId["1"].kind).toBe("angry");
    expect(byId.a).toMatchObject({ kind: "mob", x: 1, y: 0, w: 2, h: 1 });
    const kinds = lv.pieces.map((p) => p.kind);
    const firstFixed = kinds.findIndex((k) => k === "target" || k === "angry");
    expect(kinds.slice(firstFixed).every((k) => k === "target" || k === "angry")).toBe(true);
  });

  it("makes a 2x2 piece out of a 2x2 block of the same letter", () => {
    const lv = parseLevel(["aab", "aaH"], { moveLimit: 9 });
    expect(lv.pieces.find((p) => p.id === "a")).toMatchObject({ w: 2, h: 2 });
  });
});

describe("normal moves", () => {
  it("moves one cell into an empty cell for 1 move", () => {
    let s = start(["Ha.", "..."]);
    s = mustMove(s, "H", "down", 1);
    expect(at(s, "H")).toEqual([0, 1]);
    expect(s.last).toBe("moved");
  });

  it("is blocked by other pieces and by the edge of the board", () => {
    const s = start(["Ha"]);
    mustBlock(s, "H", "right");
    mustBlock(s, "H", "up");
    mustBlock(s, "a", "right");
  });

  it("needs room for the whole body of a long piece", () => {
    const s = start(["aa.", "H.b"]);
    mustBlock(s, "a", "down");
    expect(at(mustMove(s, "a", "right", 1), "a")).toEqual([1, 0]);
  });

  it("never moves the target or a wasabi", () => {
    const s = start(["T.A.", "H..."]);
    for (const dir of ["up", "down", "left", "right"] as const) {
      mustBlock(s, "T", dir);
      mustBlock(s, "A", dir);
    }
  });

  it("ignores unknown ids", () => {
    mustBlock(start(["H."]), "z", "right");
  });
});

describe("natto (heavy)", () => {
  it("takes two moves: the first one only gathers it up and leaves the board unchanged", () => {
    let s = start(["HW."]);
    s = mustMove(s, "W", "right", 1);
    expect(s.last).toBe("armed");
    expect(s.board.armed).toBe("W");
    expect(at(s, "W")).toEqual([1, 0]);
    s = mustMove(s, "W", "right", 1);
    expect(s.last).toBe("moved");
    expect(s.board.armed).toBeNull();
    expect(at(s, "W")).toEqual([2, 0]);
    // 動いたあとは、また拾い集めるところから
    s = mustMove(s, "W", "left", 1);
    expect(at(s, "W")).toEqual([2, 0]);
  });

  it("gathers up in any direction, even where it cannot move", () => {
    let s = start(["HW"]);
    s = mustMove(s, "W", "up", 1);
    expect(s.board.armed).toBe("W");
    mustBlock(s, "W", "up");
  });

  it("is un-gathered when another piece moves", () => {
    let s = start(["HW.", "..."]);
    s = mustMove(s, "W", "right", 1);
    s = mustMove(s, "H", "down", 1);
    expect(s.board.armed).toBeNull();
    s = mustMove(s, "W", "right", 1);
    expect(at(s, "W")).toEqual([1, 0]);
    s = mustMove(s, "W", "right", 1);
    expect(at(s, "W")).toEqual([2, 0]);
  });

  it("stays gathered after a blocked attempt", () => {
    let s = start(["HW"]);
    s = mustMove(s, "W", "up", 1);
    mustBlock(s, "W", "up");
    expect(step(s, "W", "up").board.armed).toBe("W");
  });

  it("swaps places with a 1x1 piece", () => {
    let s = start(["aWH"]);
    s = mustMove(s, "W", "left", 1);
    s = mustMove(s, "W", "left", 1);
    expect(at(s, "W")).toEqual([0, 0]);
    expect(at(s, "a")).toEqual([1, 0]);
  });

  it.each([
    ["a long piece", ["aaWH"]],
    ["a tall piece", ["aW", "aH"]],
    ["the target", ["TWH"]],
    ["a wasabi", ["AWH"]],
  ])("cannot swap with %s", (_name, rows) => {
    const s = mustMove(start(rows), "W", "left", 1);
    mustBlock(s, "W", "left");
  });
});

describe("wasabi", () => {
  it("costs +1 when the hero newly arrives next to it", () => {
    const s = mustMove(start(["H.A"]), "H", "right", 2);
    expect(s.angered).toEqual(["A"]);
  });

  it("costs +2 when the hero steps between two wasabi", () => {
    const s = mustMove(start(["A.2", ".H."]), "H", "up", 3);
    expect(s.angered.sort()).toEqual(["2", "A"]);
  });

  it("does not cost when other pieces come next to it", () => {
    const s = mustMove(start(["A.a.", "H..."]), "a", "left", 1);
    expect(s.angered).toEqual([]);
  });

  it("does not repeat while the hero stays next to it", () => {
    let s = start(["AA", "H."]);
    s = mustMove(s, "H", "right", 1);
    s = mustMove(s, "H", "left", 1);
    expect(s.angered).toEqual([]);
  });

  it("costs again when the hero leaves and comes back", () => {
    let s = start(["A.", "H."]);
    s = mustMove(s, "H", "right", 1); // 斜めになるので離れる
    s = mustMove(s, "H", "left", 2);
    expect(s.angered).toEqual(["A"]);
  });

  it("treats the hero as the mover when a natto swap moves it", () => {
    let s = start(["HW", ".A"]);
    s = mustMove(s, "W", "left", 1);
    s = mustMove(s, "W", "left", 2);
    expect(at(s, "H")).toEqual([1, 0]);
    expect(s.angered).toEqual(["A"]);
  });

  it("can be ignored with the noPenalty option (a plain wall)", () => {
    const s = start(["H.A"]);
    expect(step(s, "H", "right", { noPenalty: true }).moves).toBe(1);
  });
});

describe("win / lose", () => {
  it("wins at once when the hero touches the target", () => {
    const s = mustMove(start(["H.T"]), "H", "right", 1);
    expect(s.status).toBe("won");
    expect(isWon(s.board.pieces)).toBe(true);
  });

  it("does not count a diagonal as touching", () => {
    expect(isWon(start(["T.", ".H"]).board.pieces)).toBe(false);
    expect(isWon(start(["T", "H"]).board.pieces)).toBe(true);
  });

  it("stops accepting moves after winning", () => {
    const won = mustMove(start(["H.T."]), "H", "right", 1);
    expect(step(won, "T", "left")).toBe(won);
    expect(step(won, "H", "left")).toBe(won);
  });

  it("loses when the move limit is reached without winning", () => {
    let s = start(["H..T"], 2);
    s = step(s, "H", "right");
    expect(s.status).toBe("playing");
    s = step(s, "H", "left");
    expect(s.status).toBe("lost");
  });

  it("wins even on the move that reaches the limit", () => {
    const s = step(start(["H.T"], 1), "H", "right");
    expect(s.status).toBe("won");
  });

  it("loses when a wasabi penalty on the winning move goes over the limit", () => {
    // 移動1＋ツーン1＝2手。制限ちょうどならクリア、超えたら失敗
    expect(step(start(["H.T", ".A."], 2), "H", "right").status).toBe("won");
    expect(step(start(["H.T", ".A."], 1), "H", "right").status).toBe("lost");
  });
});

describe("undo", () => {
  it("restores the board and moves and counts the undo", () => {
    const s0 = start(["H.A", "..."]);
    const s1 = mustMove(s0, "H", "right", 2);
    const back = undo(s1);
    expect(back.board).toBe(s0.board);
    expect(back.moves).toBe(0);
    expect(back.undos).toBe(1);
    expect(back.history).toHaveLength(0);
  });

  it("restores the gathered-up natto", () => {
    const s1 = mustMove(start(["HW."]), "W", "right", 1);
    const s2 = mustMove(s1, "W", "right", 1);
    expect(undo(s2).board.armed).toBe("W");
  });

  it("does nothing without history", () => {
    const s = start(["H."]);
    expect(undo(s)).toBe(s);
  });

  it("goes back to playing after a win", () => {
    const won = mustMove(start(["H.T"]), "H", "right", 1);
    expect(undo(won).status).toBe("playing");
  });
});

describe("solve", () => {
  it("finds the cheapest route, counting wasabi", () => {
    const lv = parseLevel(["H.T", ".A."], { moveLimit: 9 });
    expect(solve(lv)).toHaveLength(1);
    expect(solve(lv, undefined, { noPenalty: true })).toHaveLength(1);
  });

  it("uses natto where nothing else can move", () => {
    const moves = solve(parseLevel(["HWT"], { moveLimit: 9 }));
    expect(moves).toEqual([
      { id: "W", dir: expect.any(String) },
      { id: "W", dir: "left" },
    ]);
  });

  it("returns the cheapest goal, not the first one found (wasabi makes costs uneven)", () => {
    // HU HR HR HD（ツーンで7手）より HU HR HR HR（6手）が安い
    const lv = parseLevel(["....", "1...", "....", "H2.T"], { moveLimit: 12 });
    expect(costOf(lv, solve(lv)!)).toBe(6);
  });

  it("returns null when there is no route within the limit", () => {
    expect(solve(parseLevel(["HaT"], { moveLimit: 9 }))).toBeNull();
    expect(solve(parseLevel(["H..T"], { moveLimit: 1 }))).toBeNull();
  });
});
