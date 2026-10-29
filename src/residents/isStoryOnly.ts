import type { Species } from "../types";
import { SPECIES } from "../species";

/** 物語専用の種か（SPECIES に無い id） */
export function isStoryOnly(sp: Species): boolean {
  return !SPECIES.some((s) => s.id === sp.id);
}
