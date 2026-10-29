import { loadProgress } from "../puzzle/progress";

/** 3面目をクリア（金か銀）した章の番号。読み取るだけで保存はしない */
export function clearedChapters(chapters: readonly number[]): number[] {
  const p = loadProgress();
  return chapters.filter((c) => p[`${c}-3`] !== undefined);
}
