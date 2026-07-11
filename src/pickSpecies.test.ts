import { describe, it, expect } from "vite-plus/test";
import { pickSpecies } from "./world";
import { SPECIES } from "./species";

describe("pickSpecies", () => {
  it("returns the first species when rng() is 0", () => {
    expect(pickSpecies(() => 0)).toBe(SPECIES[0]);
  });

  it("returns the last species when rng() is ~1", () => {
    expect(pickSpecies(() => 0.999999)).toBe(SPECIES[SPECIES.length - 1]);
  });

  it("can return every species across a deterministic sweep", () => {
    const seen = new Set<string>();
    let seed = 0;
    for (let i = 0; i < 100000; i++) {
      seed = (seed + 0.6180339887) % 1; // 低ディスクレパンシーで [0,1) を走査
      seen.add(pickSpecies(() => seed).id);
    }
    expect(seen.size).toBe(SPECIES.length);
  });

  it("favors common (rarity 1) over rare (rarity 3)", () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const s = pickSpecies();
      counts[String(s.rarity)] = (counts[String(s.rarity)] || 0) + 1;
    }
    expect(counts["1"]).toBeGreaterThan(counts["3"]);
  });

  it("uses Math.random by default when no rng is supplied", () => {
    // pickSpecies() without an argument must still resolve to a real species
    // (i.e. the default parameter wires up to a working rng, not undefined).
    const s = pickSpecies();
    expect(SPECIES).toContain(s);
  });

  it("has 18 species total", () => {
    expect(SPECIES).toHaveLength(18);
  });

  it("includes all 6 new species", () => {
    const ids = SPECIES.map((s) => s.id);
    for (const id of ["hotate", "saba", "tai", "kani", "corn", "botanebi"]) {
      expect(ids).toContain(id);
    }
  });

  it("has the expected rarity distribution (7 star1 / 8 star2 / 3 star3)", () => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const s of SPECIES) {
      counts[s.rarity] = (counts[s.rarity] || 0) + 1;
    }
    expect(counts[1]).toBe(7);
    expect(counts[2]).toBe(8);
    expect(counts[3]).toBe(3);
  });

  it("can return the newly added species (last entry is botanebi)", () => {
    const s = pickSpecies(() => 0.999999);
    expect(s.id).toBe("botanebi");
  });
});
