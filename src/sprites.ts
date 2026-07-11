import type { Grid, Shape, Overlay, Palette, Species } from "./types";

// ============ 形状グリッド ============
export const NIGIRI: Shape = {
  stretch: [
    "................",
    "................",
    "................",
    "...EEEEEEEEEE...",
    "..ESHSLSSSLSSE..",
    ".ESHSLSSSLSSSLE.",
    ".ESSLSSSLSSSLSE.",
    ".ESRRRRDRRRRRSE.",
    ".ESRRRRRRRRRRSE.",
    "..dDRRRRRRRRDd..",
    "..dDRRDRRRRRDd..",
    "..dDRRRRRDRRDd..",
    "...dddddddddd...",
    "................",
    "................",
    "................",
  ],
  scrunch: [
    "................",
    "................",
    ".....EEEEEEEE...",
    "....EHSLSSLSSE..",
    "...EHSLSSLSSLSE.",
    "...ESLSSLSSLSSE.",
    "...ESSLSSLSSLSE.",
    "...ESRRRDRRRRSE.",
    "...ESRRRRRRRRSE.",
    "....dDRRRRRRDd..",
    "....dDRDRRRRDd..",
    "....dDRRRRDRDd..",
    ".....dddddddd...",
    "................",
    "................",
    "................",
  ],
  band: { stretch: [7, 8], scrunch: [8, 9] },
};
export const GUNKAN: Shape = {
  stretch: [
    "................",
    "................",
    "................",
    "................",
    "...P..P..P..P...",
    "..OOOOOOOOOOOO..",
    ".NQOQQOQQOQQOQN.",
    ".NNNNNNNNNNNNNN.",
    ".NNnNNNNNNNNNNN.",
    ".NNNNNNNnNNNNNN.",
    ".NNNNNNNNNNNnNN.",
    ".NNNNNNNNNNNNNN.",
    "..NNNNNNNNNNNN..",
    "................",
    "................",
    "................",
  ],
  scrunch: [
    "................",
    "................",
    "................",
    ".....P..P..P....",
    "...NOOOOOOOOON..",
    "...NOOOOOOOOON..",
    "...NQOQQOQQOQN..",
    "...NNNNNNNNNNNN.",
    "...NNnNNNNNNNNN.",
    "...NNNNNNNNnNNN.",
    "...NNNNNNNNNNNN.",
    "...NNNNNNNNNNNN.",
    "....NNNNNNNNNN..",
    "................",
    "................",
    "................",
  ],
};
export const RICE: Palette = { R: "#FFFDF6", D: "#EFDFC8", d: "#E0CFB2" };

// えびのしっぽ(おうぎ尾) : ネタ後端から斜め上に開く。縮みはネタに合わせ右上へシフト
export const EBI_TAIL: Overlay = {
  stretch: [
    "................",
    "UTU.............",
    "TT..............",
    ".TT.............",
    "..U.............",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  scrunch: [
    "..UTU...........",
    "..TT............",
    "...TT...........",
    "....U...........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

// 大えびのしっぽ(おうぎ尾) : えびより一回り大きい尾。EBI_TAILと同構造
export const BOTANEBI_TAIL: Overlay = {
  stretch: [
    "UTTU............",
    "TTT.............",
    ".TTT............",
    "..TTU...........",
    "...UU...........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  scrunch: [
    "..UTTU..........",
    "..TTT...........",
    "...TTT..........",
    "....TTU.........",
    ".....UU.........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

// かにのはさみ足 : ネタ側面から突き出るはさみ
export const KANI_LEG: Overlay = {
  stretch: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "KK..............",
    "VK..............",
    ".V..............",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  scrunch: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..KK............",
    "..VK............",
    "...V............",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
};

// ============ スプライトベイク ============
export function bake(
  grid: Grid,
  flip: boolean,
  pal: Palette,
  bandCols: number[] | null,
  overlay: Grid | null,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const g = c.getContext("2d")!;
  const put = (row: string, y: number) =>
    row.split("").forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle = bandCols && bandCols.includes(x) ? pal.band : pal[ch];
      g.fillRect(flip ? 15 - x : x, y, 1, 1);
    });
  grid.forEach(put);
  if (overlay) overlay.forEach(put);
  return c;
}
export function silhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const g = c.getContext("2d")!;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#E5BFCA";
  g.fillRect(0, 0, 16, 16);
  return c;
}
export function bakeAllSprites(species: Species[]): void {
  for (const sp of species) {
    const pal = { ...RICE, ...sp.pal };
    const bS = sp.pal.band ? sp.shape.band!.stretch : null;
    const bC = sp.pal.band ? sp.shape.band!.scrunch : null;
    const oS = sp.overlay ? sp.overlay.stretch : null;
    const oC = sp.overlay ? sp.overlay.scrunch : null;
    sp.spr = {
      "1": [bake(sp.shape.stretch, false, pal, bS, oS), bake(sp.shape.scrunch, false, pal, bC, oC)],
      "-1": [bake(sp.shape.stretch, true, pal, bS, oS), bake(sp.shape.scrunch, true, pal, bC, oC)],
    };
    sp.shadow = silhouette(sp.spr["1"][0]);
  }
}
