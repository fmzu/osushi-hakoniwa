import { describe, it, expect, beforeEach } from "vite-plus/test";
import { greet } from "./input";
import { SPECIES } from "./species";
import { state } from "./store";
import type { Sushi } from "./types";

function makeSushi(id: string): Sushi {
  const sp = SPECIES.find((s) => s.id === id)!;
  return { sp, x: 50, y: 50, dir: 1, frame: 0, timer: 0, pause: 0 };
}

describe("greet threshold", () => {
  beforeEach(() => {
    state.friends.clear();
    state.greet = {};
  });

  it("tamago (あまえんぼ) becomes a friend after 2 greets", () => {
    const s = makeSushi("tamago");
    greet(s);
    expect(state.friends.has("tamago")).toBe(false);
    greet(s);
    expect(state.friends.has("tamago")).toBe(true);
  });

  it("ebi (はずかしがりや) needs 6 greets and flees (moves) when greeted", () => {
    const s = makeSushi("ebi");
    const x0 = s.x;
    for (let i = 0; i < 5; i++) greet(s);
    expect(state.friends.has("ebi")).toBe(false);
    expect(s.x).not.toBe(x0); // 逃げて位置が動く
    greet(s);
    expect(state.friends.has("ebi")).toBe(true);
  });

  it("does not increment the greet counter past the threshold once already a friend", () => {
    const s = makeSushi("tamago");
    greet(s);
    greet(s);
    expect(state.greet.tamago).toBe(2);
    greet(s); // already a friend: should short-circuit before incrementing
    expect(state.greet.tamago).toBe(2);
  });

  it("tracks greet counts per species independently", () => {
    const tamago = makeSushi("tamago");
    const ebi = makeSushi("ebi");
    greet(tamago);
    greet(ebi);
    expect(state.greet.tamago).toBe(1);
    expect(state.greet.ebi).toBe(1);
  });
});
