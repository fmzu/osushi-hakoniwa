import { BELL_CD } from "./constants";
import { visit } from "./world";

export function initBell(): void {
  const bell = document.getElementById("bell") as HTMLButtonElement;
  let bellLeft = 0;
  bell.addEventListener("click", () => {
    if (bellLeft > 0) return;
    bellLeft = BELL_CD;
    bell.disabled = true;
    setTimeout(
      () => {
        visit();
      },
      1500 + Math.random() * 2500,
    ); // 少し間を置いて来店
  });
  setInterval(() => {
    if (bellLeft <= 0) return;
    bellLeft--;
    if (bellLeft > 0) {
      bell.textContent = `🔔 (${bellLeft})`;
    } else {
      bell.textContent = "🔔 よぶ";
      bell.disabled = false;
    }
  }, 1000);
}
