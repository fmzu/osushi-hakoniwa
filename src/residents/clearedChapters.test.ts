import { describe, it, expect, beforeEach } from "vite-plus/test";
import { clearedChapters } from "./clearedChapters";
import { PROGRESS_KEY } from "../puzzle/progress";

const ALL = [1, 2, 3, 4, 5];
const put = (medals: unknown) =>
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ medals, read: {} }));

describe("clearedChapters", () => {
  beforeEach(() => localStorage.clear());

  it("is empty when nothing is saved", () => {
    expect(clearedChapters(ALL)).toEqual([]);
  });

  it("counts a chapter whose 3rd level is cleared with silver", () => {
    put({ "1-3": "silver" });
    expect(clearedChapters(ALL)).toEqual([1]);
  });

  it("does not count a chapter with only 3-1 cleared", () => {
    put({ "3-1": "gold" });
    expect(clearedChapters(ALL)).toEqual([]);
  });

  it("is empty for broken JSON", () => {
    localStorage.setItem(PROGRESS_KEY, "{broken");
    expect(clearedChapters(ALL)).toEqual([]);
  });
});
