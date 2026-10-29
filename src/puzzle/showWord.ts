import { openOverlay } from "./openOverlay";
import type { Fade } from "./openOverlay";

export type WordOptions = {
  /** 画面いっぱいに出す一言 */
  text: string;
  /** 一言の上の小さな見出し（任意） */
  label?: string;
  fade?: Fade;
};

/** 出た直後の連打で飛ばしてしまわないための待ち(ms) */
const GUARD_MS = 300;

/** 暗い画面に一言だけ出す。タップ／Enter／Space で resolve。閉じるのは呼び出し側 */
export function showWord(opts: WordOptions): Promise<void> {
  const root = openOverlay(opts.fade);
  return new Promise((resolve) => {
    const label = document.createElement("div");
    label.className = "story-label";
    label.textContent = opts.label ?? "";

    const text = document.createElement("div");
    text.className = "story-text center";
    const p = document.createElement("p");
    p.className = "hide last";
    p.textContent = opts.text;
    text.append(p);

    const hint = document.createElement("div");
    hint.className = "story-tap";
    hint.textContent = "▼";
    hint.setAttribute("aria-hidden", "true");

    root.replaceChildren(label, text, hint);
    // 中身を差し替えるとフォーカスしていたボタン（メニュー・とばす）が消えて body に落ち、
    // Enter／Space が届かなくなるので、暗い画面に戻す
    root.focus({ preventScroll: true });

    const shownAt = performance.now();
    const next = (): void => {
      if (performance.now() - shownAt < GUARD_MS) return;
      resolve();
    };
    root.onclick = next;
    root.onkeydown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (!e.repeat) next();
    };
    requestAnimationFrame(() => p.classList.remove("hide"));
  });
}
