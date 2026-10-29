import { isRead } from "./isRead";
import type { StoryRead } from "./progress";
import { STORY } from "./story";
import type { Part } from "./story";

export type ReadablePart = { chapter: number; who: string; part: Part };

/** 読み返せる物語。読んだことのある始まり・終わりだけを章の順に返す（未読はネタバレなので出さない） */
export function readableParts(read: StoryRead): ReadablePart[] {
  const out: ReadablePart[] = [];
  for (const c of STORY) {
    for (const part of ["start", "end"] as const) {
      if (isRead(read, c.chapter, part)) out.push({ chapter: c.chapter, who: c.who, part });
    }
  }
  return out;
}
