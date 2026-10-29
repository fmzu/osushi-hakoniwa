import type { StoryRead } from "./progress";
import type { Part } from "./story";

/** その章の始まり／終わりを読んだか */
export function isRead(read: StoryRead, chapter: number, part: Part): boolean {
  return read[`${chapter}-${part}`] === true;
}
