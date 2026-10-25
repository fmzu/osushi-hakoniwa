import { describe, it, expect } from "vite-plus/test";
import { costOf, createState, solve, step } from "./core";
import { LEVELS, levelKey, parseSol } from "./levels";

describe("levels", () => {
  it("has 5 chapters x 3 levels with unique keys", () => {
    expect(LEVELS).toHaveLength(15);
    expect(new Set(LEVELS.map(levelKey)).size).toBe(15);
    for (const [i, l] of LEVELS.entries()) {
      expect(l.chapter).toBe(Math.floor(i / 3) + 1);
      expect(l.n).toBe((i % 3) + 1);
    }
  });

  describe.each(LEVELS.map((l) => [`${levelKey(l)} ${l.who}`, l] as const))("%s", (_name, l) => {
    it("limit is ceil(best * 1.3)", () => {
      expect(l.limit).toBe(Math.ceil(l.best * 1.3));
      expect(l.level.moveLimit).toBe(l.limit);
    });

    it("the precomputed solution clears the level in exactly `best` moves", () => {
      let s = createState(l.level);
      for (const m of l.sol) {
        const next = step(s, m.id, m.dir);
        expect(next.last, `${m.id}→${m.dir} が動けない`).not.toBe("blocked");
        s = next;
      }
      expect(s.status).toBe("won");
      expect(s.moves).toBe(l.best);
      expect(costOf(l.level, l.sol)).toBe(l.best);
    });

    it("the in-browser solver reproduces `best`", { timeout: 30_000 }, () => {
      const found = solve(l.level);
      expect(found).not.toBeNull();
      expect(costOf(l.level, found!)).toBe(l.best);
    });
  });
});

describe("parseSol", () => {
  it("reads piece letter + direction letter", () => {
    expect(parseSol("dL HU xR yD")).toEqual([
      { id: "d", dir: "left" },
      { id: "H", dir: "up" },
      { id: "x", dir: "right" },
      { id: "y", dir: "down" },
    ]);
  });

  it("rejects malformed moves", () => {
    expect(() => parseSol("dQ")).toThrow();
    expect(() => parseSol("dLL")).toThrow();
  });
});
