/** 物語の暗い全画面を閉じる（ふわっと消える） */
export function closeOverlay(): void {
  const el = document.getElementById("story");
  if (!el) return;
  el.onclick = null;
  el.onkeydown = null;
  el.classList.remove("on", "slow");
  document.querySelector(".wrap")?.removeAttribute("inert");
}
