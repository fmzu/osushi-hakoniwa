import { describe, it, expect } from "vite-plus/test";
import { RESIDENTS, STORY_ONLY_SPECIES } from "./residents";
import { STORY } from "../puzzle/story";
import { SPECIES } from "../species";

describe("RESIDENTS", () => {
  it("has one resident per chapter with the line from STORY", () => {
    expect(RESIDENTS).toHaveLength(5);
    RESIDENTS.forEach((r, i) => {
      expect(r.chapter).toBe(STORY[i].chapter);
      expect(r.line).toBe(STORY[i].line);
      expect(r.line.length).toBeGreaterThan(0);
      expect(r.species.shape.stretch).toHaveLength(16);
    });
  });

  it("uses existing species for chapters 1, 2, 5 and story-only for 3, 4", () => {
    expect(RESIDENTS.map((r) => r.species.id)).toEqual([
      "maguro",
      "anago",
      "kanpyo",
      "futomaki",
      "ikura",
    ]);
  });

  it("keeps story-only species out of SPECIES", () => {
    for (const sp of STORY_ONLY_SPECIES) expect(SPECIES.some((s) => s.id === sp.id)).toBe(false);
  });
});
