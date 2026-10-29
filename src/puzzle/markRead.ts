import type { StoryRead } from "./progress";
import type { Part } from "./story";

/** 読んだ印を付けた新しい既読を返す。すでに読んでいれば同じ物を返す */
export function markRead(read: StoryRead, chapter: number, part: Part): StoryRead {
  const key = `${chapter}-${part}`;
  if (read[key] === true) return read;
  return { ...read, [key]: true };
}
