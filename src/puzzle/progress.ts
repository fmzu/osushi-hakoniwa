// すしづめの進行（各面の金/銀、読んだ物語）。本編の保存キー osushi-zukan-v2 とは別に持つ。
// localStorage が使えない環境でも落ちず、保存しないだけで遊べる。

export type Medal = "gold" | "silver";
/** 面の識別子("1-1" など)→メダル。クリアしていない面は載らない */
export type Progress = Record<string, Medal>;

/** 読んだ物語。キーは "章-start" / "章-end"（例: "1-start"）。読んでいないものは載らない */
export type StoryRead = Record<string, true>;

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

export function loadRead(): StoryRead {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null");
    const read: unknown = v?.read;
    const out: StoryRead = {};
    if (read && typeof read === "object") {
      for (const [k, r] of Object.entries(read)) {
        if (r === true && /^[1-9]-(start|end)$/.test(k)) out[k] = true;
      }
    }
    return out;
  } catch {
    return {};
  }
}

// 金銀と既読は同じキーに入れるので、片方を保存するときもう片方を消さない
function write(p: Progress, read: StoryRead): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ medals: p, read }));
  } catch {
    // localStorage が使用できない環境では保存をスキップする
  }
}

export function saveProgress(p: Progress): void {
  write(p, loadRead());
}

export function saveRead(read: StoryRead): void {
  write(loadProgress(), read);
}

/** メダルを記録した新しい進行を返す。すでに金なら銀で上書きしない */
export function recordMedal(p: Progress, key: string, medal: Medal): Progress {
  if (p[key] === "gold") return p;
  if (p[key] === medal) return p;
  return { ...p, [key]: medal };
}
