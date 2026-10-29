import { openOverlay } from "./openOverlay";
import type { Fade } from "./openOverlay";

export type LinesResult = "done" | "skipped";

export type LinesOptions = {
  /** 左上の小さな見出し。無ければ空文字 */
  label: string;
  /** 本文。"" は段落の区切り */
  lines: readonly string[];
  fade?: Fade;
};

/**
 * 暗い画面で本文を1行ずつ出す。タップ／Enter／Space で次の行、最後の行（アクセント色）のあとの
 * もう一回で resolve("done")。「とばす」で resolve("skipped")。閉じるのは呼び出し側
 */
export function showLines(opts: LinesOptions): Promise<LinesResult> {
  const root = openOverlay(opts.fade);
  return new Promise((resolve) => {
    const label = document.createElement("div");
    label.className = "story-label";
    label.textContent = opts.label;

    const text = document.createElement("div");
    text.className = "story-text";
    const ps = opts.lines.map((t, i) => {
      const p = document.createElement("p");
      p.textContent = t;
      p.className = "hide";
      if (t === "") p.classList.add("gap");
      if (i === opts.lines.length - 1) p.classList.add("last");
      text.append(p);
      return p;
    });

    const hint = document.createElement("div");
    hint.className = "story-tap";
    hint.textContent = "▼";
    hint.setAttribute("aria-hidden", "true");

    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "story-skip";
    skip.textContent = "とばす";
    skip.onclick = (e) => {
      e.stopPropagation();
      resolve("skipped");
    };
    skip.onkeydown = (e) => e.stopPropagation();

    root.replaceChildren(label, text, hint, skip);

    let i = 0;
    const next = (): void => {
      // 区切りの行は読ませずに飛ばし、間だけ空ける
      while (i < ps.length && ps[i].classList.contains("gap")) {
        ps[i].classList.remove("hide");
        i++;
      }
      if (i < ps.length) {
        ps[i].classList.remove("hide");
        i++;
        return;
      }
      resolve("done");
    };
    root.onclick = next;
    root.onkeydown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (!e.repeat) next();
    };
    // 開いた直後に最初の行を出す（フェードを効かせるため1フレーム置く）
    requestAnimationFrame(next);
  });
}
