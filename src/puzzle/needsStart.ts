import { isRead } from "./isRead";
import type { StoryRead } from "./progress";

/** 面に入るとき、章の始まりを自動で出すか。章の1面目で、まだ読んでいないときだけ */
export function needsStart(read: StoryRead, level: { chapter: number; n: number }): boolean {
  return level.n === 1 && !isRead(read, level.chapter, "start");
}
