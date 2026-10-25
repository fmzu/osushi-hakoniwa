import raw from "./levels.json";
import { parseLevel } from "./core";
import type { Dir, Level, Move } from "./core";

/** 1面ぶんのデータ（levels.json は tools/sushizume の export で作る生成物） */
export type LevelEntry = {
  chapter: number;
  who: string;
  /** 章の中の番号（1〜3） */
  n: number;
  /** 文字盤。行を "/" でつないだもの */
  rows: string;
  /** 最短手数 */
  best: number;
  /** 制限手数 */
  limit: number;
  /** 事前計算した最短手順（ヒント用） */
  sol: Move[];
  level: Level;
};

const LETTER_TO_DIR: Record<string, Dir> = { U: "up", D: "down", L: "left", R: "right" };

/** "dL pL cU ..." を手順に直す。駒の文字+向き(U/D/L/R) */
export function parseSol(text: string): Move[] {
  return text
    .split(" ")
    .filter((m) => m !== "")
    .map((m) => {
      const dir = LETTER_TO_DIR[m[1]];
      if (m.length !== 2 || !dir) throw new Error(`手順の書式が不正: ${m}`);
      return { id: m[0], dir };
    });
}

export const LEVELS: LevelEntry[] = raw.map((l) => ({
  ...l,
  sol: parseSol(l.sol),
  level: parseLevel(l.rows.split("/"), { moveLimit: l.limit }),
}));

/** 面の識別子（進行の保存に使う）。例: "1-1" */
export function levelKey(l: Pick<LevelEntry, "chapter" | "n">): string {
  return `${l.chapter}-${l.n}`;
}
