import { openOverlay } from "./openOverlay";
import type { ReadablePart } from "./readableParts";

const PART_LABEL = { start: "はじまり", end: "おわり" } as const;

/** 読み返す物語を選ばせる。選んだものを返し、「とじる」なら null。閉じるのは呼び出し側 */
export function showMenu(items: readonly ReadablePart[]): Promise<ReadablePart | null> {
  const root = openOverlay();
  return new Promise((resolve) => {
    root.onclick = null;
    root.onkeydown = null;

    const title = document.createElement("div");
    title.className = "story-label";
    title.textContent = "ものがたり";

    const list = document.createElement("div");
    list.className = "story-menu";
    for (const it of items) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = `${it.chapter}章　${it.who}　${PART_LABEL[it.part]}`;
      b.onclick = () => resolve(it);
      list.append(b);
    }

    const close = document.createElement("button");
    close.type = "button";
    close.className = "story-close";
    close.textContent = "とじる";
    close.onclick = () => resolve(null);

    root.replaceChildren(title, list, close);
    (list.firstElementChild as HTMLElement | null)?.focus();
  });
}
