import type { Species } from "../types";
import { SPECIES } from "../species";
import { KANPYO_MAKI, FUTOMAKI_SPECIES } from "./storySpecies";

export type Resident = { chapter: number; species: Species };

function byId(id: string): Species {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error(`species not found: ${id}`);
  return sp;
}

/** すしづめの章→その章で寿司になって箱庭に住みつく種 */
export const RESIDENTS: readonly Resident[] = [
  { chapter: 1, species: byId("maguro") },
  { chapter: 2, species: byId("anago") },
  { chapter: 3, species: KANPYO_MAKI },
  { chapter: 4, species: FUTOMAKI_SPECIES },
  { chapter: 5, species: byId("ikura") },
];

/** 物語専用の種（焼く必要がある） */
export const STORY_ONLY_SPECIES: Species[] = [KANPYO_MAKI, FUTOMAKI_SPECIES];
