import { RESIDENTS } from "./residents";
import { clearedChapters } from "./clearedChapters";
import { sushis, spawn } from "../world";

/** クリア済みの章の住人を箱庭に出す。普通のお客と違い markSeen はしない */
export function spawnResidents(): void {
  const cleared = clearedChapters(RESIDENTS.map((r) => r.chapter));
  for (const r of RESIDENTS) {
    if (!cleared.includes(r.chapter)) continue;
    spawn(undefined, undefined, r.species);
    sushis[sushis.length - 1].line = r.line;
  }
}
