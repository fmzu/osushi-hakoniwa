import { isRead } from "./isRead";
import type { StoryRead } from "./progress";

/** 面をクリアしたとき、章の終わりを出すか。章の3面目で、まだ読んでいないときだけ */
export function needsEnd(read: StoryRead, level: { chapter: number; n: number }): boolean {
  return level.n === 3 && !isRead(read, level.chapter, "end");
}
