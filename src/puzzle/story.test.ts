import { describe, it, expect } from "vite-plus/test";
import { LEVELS } from "./levels";
import { BETWEEN, GOAL, STORY } from "./story";

describe("story data", () => {
  it("has 5 chapters in order, matching the levels", () => {
    expect(STORY).toHaveLength(5);
    for (const [i, c] of STORY.entries()) {
      expect(c.chapter).toBe(i + 1);
      const level = LEVELS.find((l) => l.chapter === c.chapter);
      expect(c.who).toBe(level?.who);
    }
  });

  it("gives every chapter a start, an end and a one-line word", () => {
    for (const c of STORY) {
      expect(c.start.length).toBeGreaterThan(0);
      expect(c.end.length).toBeGreaterThan(0);
      expect(c.line.trim()).not.toBe("");
    }
  });

  it("neither starts nor ends a text with a blank line", () => {
    for (const c of STORY) {
      for (const lines of [c.start, c.end]) {
        expect(lines[0]).not.toBe("");
        expect(lines[lines.length - 1]).not.toBe("");
      }
    }
  });

  it("ends every start with the puzzle's goal in the narrator's words", () => {
    for (const c of STORY) expect(c.start[c.start.length - 1]).toBe("隣まで、行かなくては。");
  });

  it("closes every end with 'その夜、' (chapter 3 and 5 carry on after a scene break)", () => {
    for (const c of STORY) expect(c.end.some((l) => l.startsWith("その夜、"))).toBe(true);
    for (const n of [1, 2, 4]) {
      const end = STORY[n - 1].end;
      expect(end[end.length - 1].startsWith("その夜、")).toBe(true);
    }
    for (const n of [3, 5]) expect(STORY[n - 1].end).toContain("　＊");
  });

  it("explains the sushi vision only in chapter 1", () => {
    const hit = STORY.filter((c) => c.start.includes("目を細めると、乗客がみんな寿司に見えた。"));
    expect(hit.map((c) => c.chapter)).toEqual([1]);
  });

  it("has the shared between-level words and the goal", () => {
    expect(BETWEEN).toEqual(["まだ、遠い。", "あと、少し。"]);
    expect(GOAL).toBe("宇宙人を、鯛の隣へ");
  });
});
