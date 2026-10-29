import type { Species } from "../types";
import { SPECIES } from "../species";
import { STORY } from "../puzzle/story";
import { KANPYO_MAKI, FUTOMAKI_SPECIES } from "./storySpecies";

export type Resident = { chapter: number; species: Species; line: string };

function byId(id: string): Species {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error(`species not found: ${id}`);
  return sp;
}

// 章→住みつく種。一行は STORY が唯一の正
const SPECIES_OF_CHAPTER: readonly Species[] = [
  byId("maguro"),
  byId("anago"),
  KANPYO_MAKI,
  FUTOMAKI_SPECIES,
  byId("ikura"),
];

export const RESIDENTS: readonly Resident[] = STORY.map((c, i) => ({
  chapter: c.chapter,
  species: SPECIES_OF_CHAPTER[i],
  line: c.line,
}));

/** 物語専用の種（焼く必要がある） */
export const STORY_ONLY_SPECIES: Species[] = [KANPYO_MAKI, FUTOMAKI_SPECIES];
