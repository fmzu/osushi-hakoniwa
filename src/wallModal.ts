import { WALLS } from "./walls";
import { state, store } from "./store";

export function renderWalls(): void {
  const el = document.getElementById("swatches")!;
  el.replaceChildren();
  for (const w of WALLS) {
    const s = document.createElement("div");
    s.className = "swatch" + (w.id === state.wall ? " on" : "");
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.style.background = w.wall;
    chip.style.borderBottom = "4px solid " + w.base;
    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = w.name;
    s.append(chip, nm);
    s.onclick = () => {
      state.wall = w.id;
      store.save(state);
      renderWalls();
    };
    el.append(s);
  }
}

export function initWallModal(): void {
  const wallModal = document.getElementById("wallModal")!;
  document.getElementById("openWall")!.onclick = () => {
    renderWalls();
    wallModal.classList.add("open");
  };
  document.getElementById("closeWall")!.onclick = () => wallModal.classList.remove("open");
  wallModal.addEventListener("pointerdown", (e) => {
    if (e.target === wallModal) wallModal.classList.remove("open");
  });
}
