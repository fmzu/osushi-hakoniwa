export type Fade = "none" | "slow";

/** 物語の暗い全画面を開く。すでに開いていれば何もしない（開きかけの暗転を途中で切らない） */
export function openOverlay(fade: Fade = "none"): HTMLElement {
  const el = document.getElementById("story");
  if (!el) throw new Error("#story がない");
  if (!el.classList.contains("on")) {
    el.classList.toggle("slow", fade === "slow");
    el.classList.add("on");
    // 下の画面はスワイプもフォーカスも受けない
    document.querySelector(".wrap")?.setAttribute("inert", "");
    el.focus({ preventScroll: true });
  }
  return el;
}
