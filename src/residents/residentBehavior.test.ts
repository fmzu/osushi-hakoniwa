import { describe, it, expect, beforeEach } from "vite-plus/test";
import { sushis, leave } from "../world";
import { greet } from "../input";
import { state } from "../store";
import { KANPYO_MAKI } from "./storySpecies";
import { SPECIES } from "../species";
import type { Sushi } from "../types";

const make = (sp = SPECIES[0], resident?: true): Sushi => ({
  sp,
  x: 50,
  y: 50,
  dir: 1,
  frame: 0,
  timer: 0,
  pause: 0,
  resident,
});

describe("leave", () => {
  beforeEach(() => {
    sushis.length = 0;
  });

  it("never removes residents", () => {
    sushis.push(make(KANPYO_MAKI, true), make(), make(), make(), make());
    for (let i = 0; i < 20; i++) leave();
    expect(sushis.filter((s) => s.resident)).toHaveLength(1);
    expect(sushis).toHaveLength(4);
  });

  it("does not leave when guests (non-residents) are 3 or fewer", () => {
    sushis.push(make(KANPYO_MAKI, true), make(), make(), make());
    leave();
    expect(sushis).toHaveLength(4);
  });
});

describe("greet a story-only species", () => {
  beforeEach(() => {
    state.friends.clear();
    state.greet = {};
    localStorage.clear();
  });

  it("changes neither friendship nor saved data", () => {
    const s = make(KANPYO_MAKI, true);
    for (let i = 0; i < 10; i++) greet(s);
    expect(state.friends.size).toBe(0);
    expect(state.greet).toEqual({});
    expect(localStorage.getItem("osushi-zukan-v2")).toBeNull();
  });
});
