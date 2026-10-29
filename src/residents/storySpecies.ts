import type { Species } from "../types";
import { KANPYO, KANPYO_PAL, FUTOMAKI, FUTOMAKI_PAL } from "../sprites";

// 物語専用の種。SPECIES には入れない（ランダム来店しない・図鑑の分母を変えない）
export const KANPYO_MAKI: Species = {
  id: "kanpyo",
  name: "かんぴょうまき",
  seikaku: "のんびりや",
  shape: KANPYO,
  rarity: 1,
  pal: KANPYO_PAL,
  step: 200,
  pauseP: 0.06,
  pauseLen: [1500, 3000],
  heartP: 0.012,
  flipP: 0.03,
  driftP: 0.3,
};

export const FUTOMAKI_SPECIES: Species = {
  id: "futomaki",
  name: "ふとまき",
  seikaku: "のんびりや",
  shape: FUTOMAKI,
  rarity: 1,
  pal: FUTOMAKI_PAL,
  step: 180,
  pauseP: 0.05,
  pauseLen: [1200, 2800],
  heartP: 0.012,
  flipP: 0.03,
  driftP: 0.3,
};
