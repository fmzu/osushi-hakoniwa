import { ZUKAN_PAGE_SIZE } from "./constants";
import { SPECIES } from "./species";
import { state } from "./store";

let zukanPage = 0;

export function updateZukanCount(): void {
  const zcnt = document.getElementById("zcnt");
  const zcnt2 = document.getElementById("zcnt2");
  if (zcnt) zcnt.textContent = `${state.friends.size}/${SPECIES.length}`;
  if (zcnt2)
    zcnt2.textContent = `みかけた ${state.seen.size}/${SPECIES.length} ・ なかよし ${state.friends.size}/${SPECIES.length}`;
}

function zukanPageCount(): number {
  return Math.ceil(SPECIES.length / ZUKAN_PAGE_SIZE);
}

export function renderZukan(): void {
  const cards = document.getElementById("cards")!;
  cards.replaceChildren();
  for (const sp of SPECIES.slice(zukanPage * ZUKAN_PAGE_SIZE, (zukanPage + 1) * ZUKAN_PAGE_SIZE)) {
    const friend = state.friends.has(sp.id);
    const seen = state.seen.has(sp.id);
    const card = document.createElement("div");
    card.className = "card" + (friend ? "" : seen ? " seen" : " unknown");
    const img = document.createElement("img");
    img.src = (seen ? sp.spr!["1"][0] : sp.shadow!).toDataURL();
    const rar = document.createElement("div");
    rar.className = "rar";
    rar.textContent = "★".repeat(sp.rarity);
    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = friend ? sp.name : "？？？";
    const sk = document.createElement("div");
    sk.className = "sk";
    sk.textContent = friend
      ? "せいかく: " + sp.seikaku
      : seen
        ? "あいさつして なかよくなろう"
        : "…だれだろう";
    card.append(img, rar, nm, sk);
    cards.append(card);
  }
  document.getElementById("zPageNum")!.textContent = zukanPage + 1 + " / " + zukanPageCount();
  (document.getElementById("zPrev") as HTMLButtonElement).disabled = zukanPage === 0;
  (document.getElementById("zNext") as HTMLButtonElement).disabled =
    zukanPage >= zukanPageCount() - 1;
}

export function initZukan(): void {
  const zukan = document.getElementById("zukan")!;
  document.getElementById("openZukan")!.onclick = () => {
    zukanPage = 0;
    renderZukan();
    zukan.classList.add("open");
  };
  document.getElementById("closeZukan")!.onclick = () => zukan.classList.remove("open");
  document.getElementById("zPrev")!.onclick = () => {
    if (zukanPage > 0) {
      zukanPage--;
      renderZukan();
    }
  };
  document.getElementById("zNext")!.onclick = () => {
    if (zukanPage < zukanPageCount() - 1) {
      zukanPage++;
      renderZukan();
    }
  };
  zukan.addEventListener("pointerdown", (e) => {
    if (e.target === zukan) zukan.classList.remove("open");
  });
}
