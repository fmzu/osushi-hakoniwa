import { describe, it, expect } from "vite-plus/test";
import { parseLevel } from "./core";
import { assignLooks } from "./looks";
import type { LookContext } from "./looks";
import type { PuzzleSprites } from "./sprites";

/** canvas の代わりに、名前だけ持つ偽物。jsdom は canvas を描けない */
function fake(name: string): HTMLCanvasElement {
  return { name } as unknown as HTMLCanvasElement;
}
const spr: PuzzleSprites = {
  maguro: fake("maguro"),
  tamago: fake("tamago"),
  alien: fake("alien"),
  wasabi: fake("wasabi"),
  tai: [fake("tai0"), fake("tai1")],
  taiSushi: fake("taiSushi"),
  nattoArmed: fake("nattoArmed"),
  natto: fake("natto"),
  futomaki: fake("futomaki"),
  longH: { anago: fake("anago"), saba: fake("saba"), kani: fake("kani") },
  longV: { classic: fake("classic"), kaisen: fake("kaisen"), tororo: fake("tororo") },
};
const name = (c: HTMLCanvasElement) => (c as unknown as { name: string }).name;
const idle: LookContext = { won: false, armedId: null, flop: 0 };

describe("assignLooks", () => {
  const lv = parseLevel(["HWT", "aab", "ccd", "e1."], { moveLimit: 9 });
  const looks = assignLooks(lv.pieces, spr);
  const look = (id: string, c = idle) => name(looks.get(id)!(c));

  it("gives special pieces their own sprites", () => {
    expect(look("H")).toBe("alien");
    expect(look("1")).toBe("wasabi");
    expect(look("T")).toBe("tai0");
    expect(look("T", { ...idle, flop: 1 })).toBe("tai1");
    expect(look("T", { ...idle, won: true })).toBe("taiSushi");
  });

  it("shows natto as gathered only while it is armed", () => {
    expect(look("W")).toBe("natto");
    expect(look("W", { ...idle, armedId: "W" })).toBe("nattoArmed");
    expect(look("W", { ...idle, armedId: "x" })).toBe("natto");
  });

  it("alternates sprites among pieces of the same size in board order", () => {
    // 1マスは b, d, e の順にマグロ/タマゴ/マグロ。横長は a, c の順にアナゴ/カニ
    expect(look("b")).toBe("maguro");
    expect(look("d")).toBe("tamago");
    expect(look("e")).toBe("maguro");
    expect(look("a")).toBe("anago");
    expect(look("c")).toBe("kani");
  });

  it("uses the 2x2 sprite and the tall sprite by shape", () => {
    const big = parseLevel(["aab", "aac", "HdT"], { moveLimit: 9 });
    expect(name(assignLooks(big.pieces, spr).get("a")!(idle))).toBe("futomaki");
    const tall = parseLevel(["ab", "aH", "T."], { moveLimit: 9 });
    expect(name(assignLooks(tall.pieces, spr).get("a")!(idle))).toBe("classic");
  });
});
