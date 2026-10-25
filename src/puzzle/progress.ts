// すしづめの進行（各面の金/銀）。本編の保存キー osushi-zukan-v2 とは別に持つ。
// localStorage が使えない環境でも落ちず、保存しないだけで遊べる。

export type Medal = "gold" | "silver";
/** 面の識別子("1-1" など)→メダル。クリアしていない面は載らない */
export type Progress = Record<string, Medal>;

export const PROGRESS_KEY = "osushi-sushizume-v1";

export function loadProgress(): Progress {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null");
    const medals: unknown = v?.medals;
    const out: Progress = {};
    if (medals && typeof medals === "object") {
      for (const [k, m] of Object.entries(medals)) {
        if (m === "gold" || m === "silver") out[k] = m;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ medals: p }));
  } catch {
    // localStorage が使用できない環境では保存をスキップする
  }
}

/** メダルを記録した新しい進行を返す。すでに金なら銀で上書きしない */
export function recordMedal(p: Progress, key: string, medal: Medal): Progress {
  if (p[key] === "gold") return p;
  if (p[key] === medal) return p;
  return { ...p, [key]: medal };
}
