import { describe, it, expect } from "vite-plus/test";
import { betweenLine } from "./betweenLine";
import { isRead } from "./isRead";
import { markRead } from "./markRead";
import { needsEnd } from "./needsEnd";
import { needsStart } from "./needsStart";
import { readableParts } from "./readableParts";

describe("needsStart", () => {
  it("shows the start on the first level of an unread chapter", () => {
    expect(needsStart({}, { chapter: 1, n: 1 })).toBe(true);
    expect(needsStart({ "1-end": true }, { chapter: 1, n: 1 })).toBe(true);
  });

  it("does not show it again once read", () => {
    expect(needsStart({ "1-start": true }, { chapter: 1, n: 1 })).toBe(false);
  });

  it("does not show it when entering mid-chapter", () => {
    expect(needsStart({}, { chapter: 3, n: 2 })).toBe(false);
    expect(needsStart({}, { chapter: 3, n: 3 })).toBe(false);
  });

  it("tracks each chapter on its own", () => {
    expect(needsStart({ "1-start": true }, { chapter: 2, n: 1 })).toBe(true);
  });
});

describe("needsEnd", () => {
  it("shows the end on clearing the third level of an unread chapter", () => {
    expect(needsEnd({}, { chapter: 1, n: 3 })).toBe(true);
  });

  it("does not repeat once read", () => {
    expect(needsEnd({ "1-end": true }, { chapter: 1, n: 3 })).toBe(false);
  });

  it("is silent for the first and second levels", () => {
    expect(needsEnd({}, { chapter: 1, n: 1 })).toBe(false);
    expect(needsEnd({}, { chapter: 1, n: 2 })).toBe(false);
  });
});

describe("betweenLine", () => {
  it("has a word after levels 1 and 2 but not after 3", () => {
    expect(betweenLine(1)).toBe("まだ、遠い。");
    expect(betweenLine(2)).toBe("あと、少し。");
    expect(betweenLine(3)).toBeNull();
  });
});

describe("markRead / isRead", () => {
  it("records without mutating, and returns the same object when already read", () => {
    const a = {};
    const b = markRead(a, 2, "end");
    expect(a).toEqual({});
    expect(isRead(b, 2, "end")).toBe(true);
    expect(isRead(b, 2, "start")).toBe(false);
    expect(markRead(b, 2, "end")).toBe(b);
  });
});

describe("readableParts", () => {
  it("is empty before reading anything", () => {
    expect(readableParts({})).toEqual([]);
  });

  it("lists only what has been read, in chapter order, never later chapters", () => {
    const read = { "2-start": true, "1-start": true, "1-end": true } as const;
    expect(readableParts(read)).toEqual([
      { chapter: 1, who: "Aさん", part: "start" },
      { chapter: 1, who: "Aさん", part: "end" },
      { chapter: 2, who: "おっさん", part: "start" },
    ]);
  });
});
