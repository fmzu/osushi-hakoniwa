import type { Piece } from "./core";
import type { PuzzleSprites } from "./sprites";

/** 描くときの状況 */
export type LookContext = {
  won: boolean;
  /** 拾い集めている納豆の id */
  armedId: string | null;
  /** 鯛のピチピチの2コマ目か */
  flop: 0 | 1;
};

export type Look = (c: LookContext) => HTMLCanvasElement;

const SMALL = ["maguro", "tamago"] as const;
const LONG_H = ["anago", "kani", "saba"] as const;
const LONG_V = ["classic", "kaisen", "tororo"] as const;

/**
 * コマごとの見た目を面の読み込み時に決める。
 * 同じ種類のコマには、盤の中の並び順で絵を交互に割り当てる（1マス=マグロ/タマゴ、横長=アナゴ/カニ/サバ、縦長=恵方巻き3種）
 */
export function assignLooks(pieces: Piece[], spr: PuzzleSprites): Map<string, Look> {
  const looks = new Map<string, Look>();
  let small = 0;
  let longH = 0;
  let longV = 0;
  for (const p of pieces) {
    if (p.kind === "hero") looks.set(p.id, () => spr.alien);
    else if (p.kind === "target") looks.set(p.id, (c) => (c.won ? spr.taiSushi : spr.tai[c.flop]));
    else if (p.kind === "heavy")
      looks.set(p.id, (c) => (c.armedId === p.id ? spr.nattoArmed : spr.natto));
    else if (p.kind === "angry") looks.set(p.id, () => spr.wasabi);
    else if (p.w === 2 && p.h === 2) looks.set(p.id, () => spr.futomaki);
    else if (p.w === 2 && p.h === 1) {
      const k = LONG_H[longH++ % 3];
      looks.set(p.id, () => spr.longH[k]);
    } else if (p.h === 2 && p.w === 1) {
      const k = LONG_V[longV++ % 3];
      looks.set(p.id, () => spr.longV[k]);
    } else {
      const k = SMALL[small++ % 2];
      looks.set(p.id, () => spr[k]);
    }
  }
  return looks;
}
