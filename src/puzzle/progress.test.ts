import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import {
  PROGRESS_KEY,
  loadProgress,
  loadRead,
  recordMedal,
  saveProgress,
  saveRead,
} from "./progress";

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("uses its own key, separate from the main game", () => {
    expect(PROGRESS_KEY).toBe("osushi-sushizume-v1");
    saveProgress({ "1-1": "gold" });
    expect(localStorage.getItem("osushi-zukan-v2")).toBeNull();
  });

  it("is empty when nothing is saved", () => {
    expect(loadProgress()).toEqual({});
  });

  it("round-trips medals", () => {
    saveProgress({ "1-1": "gold", "1-2": "silver" });
    expect(loadProgress()).toEqual({ "1-1": "gold", "1-2": "silver" });
  });

  it("falls back to empty on corrupted JSON", () => {
    localStorage.setItem(PROGRESS_KEY, "{not valid json");
    expect(loadProgress()).toEqual({});
  });

  it("drops unknown medals and wrong shapes", () => {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ medals: { "1-1": "gold", "1-2": "bronze", "1-3": 5 } }),
    );
    expect(loadProgress()).toEqual({ "1-1": "gold" });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(["gold"]));
    expect(loadProgress()).toEqual({});
    localStorage.setItem(PROGRESS_KEY, "null");
    expect(loadProgress()).toEqual({});
  });

  it("still works when localStorage is unavailable", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadProgress()).toEqual({});
    expect(() => saveProgress({ "1-1": "gold" })).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});

describe("recordMedal", () => {
  it("adds a medal without mutating the original", () => {
    const p = {};
    expect(recordMedal(p, "1-1", "silver")).toEqual({ "1-1": "silver" });
    expect(p).toEqual({});
  });

  it("upgrades silver to gold", () => {
    expect(recordMedal({ "1-1": "silver" }, "1-1", "gold")).toEqual({ "1-1": "gold" });
  });

  it("never downgrades gold to silver and returns the same object", () => {
    const p = { "1-1": "gold" } as const;
    expect(recordMedal(p, "1-1", "silver")).toBe(p);
  });
});

describe("story read", () => {
  beforeEach(() => localStorage.clear());

  it("is empty when nothing is saved, and for old data with only medals", () => {
    expect(loadRead()).toEqual({});
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ medals: { "1-1": "gold" } }));
    expect(loadRead()).toEqual({});
    expect(loadProgress()).toEqual({ "1-1": "gold" });
  });

  it("round-trips, and saving one side keeps the other", () => {
    saveProgress({ "1-1": "gold" });
    saveRead({ "1-start": true });
    expect(loadProgress()).toEqual({ "1-1": "gold" });
    expect(loadRead()).toEqual({ "1-start": true });
    saveProgress({ "1-1": "gold", "1-2": "silver" });
    expect(loadRead()).toEqual({ "1-start": true });
  });

  it("drops unknown keys and wrong shapes", () => {
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ read: { "1-start": true, "1-end": false, "x-start": true, "1-mid": true } }),
    );
    expect(loadRead()).toEqual({ "1-start": true });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ read: ["1-start"] }));
    expect(loadRead()).toEqual({});
    localStorage.setItem(PROGRESS_KEY, "{broken");
    expect(loadRead()).toEqual({});
  });

  it("does not touch the main game's key", () => {
    saveRead({ "1-start": true });
    expect(localStorage.getItem("osushi-zukan-v2")).toBeNull();
  });
});
