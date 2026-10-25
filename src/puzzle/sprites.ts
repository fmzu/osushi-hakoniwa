// すしづめのドット絵。握り・軍艦の形と色は本編(../sprites.ts, ../species.ts)から借り、
// パズル専用の絵（宇宙人・わさび・鯛・長い寿司・太巻き）をここで描く。
// canvas を作るので、モジュールを読んだだけでは何も描かない。画面の起動時に createSprites() を呼ぶ。
import type { Grid, Palette } from "../types";
import { GUNKAN, NIGIRI, RICE } from "../sprites";
import { SPECIES } from "../species";

type Canvas = HTMLCanvasElement;
type PutPixel = (x: number, y: number, color: string) => void;

export type PuzzleSprites = {
  maguro: Canvas;
  tamago: Canvas;
  alien: Canvas;
  wasabi: Canvas;
  /** 鯛。2コマでピチピチ */
  tai: [Canvas, Canvas];
  taiSushi: Canvas;
  /** 納豆。拾い集めた状態と、こぼれた状態 */
  nattoArmed: Canvas;
  natto: Canvas;
  futomaki: Canvas;
  /** 横長（2×1）の寿司 */
  longH: { anago: Canvas; saba: Canvas; kani: Canvas };
  /** 縦長（1×2）の恵方巻き */
  longV: { classic: Canvas; kaisen: Canvas; tororo: Canvas };
};

// わさび山盛り（シャリの上に緑の山）
const WASABI: Grid = [
  "................",
  "................",
  "................",
  "................",
  "......GGGG......",
  ".....GHHGGG.....",
  "....GHGGGGGG....",
  "...GGGGGGgGGG...",
  "..GGGGgGGGGGGG..",
  ".ERRRRRRRRRRRRE.",
  "..dDRRDRRRRRDd..",
  "..dDRRRRRDRRDd..",
  "..dDRRRRRRRRDd..",
  "...dddddddddd...",
  "................",
  "................",
];

// 宇宙人＋👁👁
const ALIEN: Grid = [
  "................",
  ".....AAAAAA.....",
  "...AAAAAAAAAA...",
  "..AAAAAAAAAAAA..",
  ".AAAKKKAAKKKAAA.",
  ".AAKWWWKKWWWKAA.",
  ".AAKWPWKKWPrKAA.",
  ".AAAKKKAAKKKAAA.",
  "..AAAAAAAAAAAA..",
  "...AAAAAAAAAA...",
  "....AAAMMAAA....",
  ".....AAAAAA.....",
  "......BBBB......",
  "....BBBBBBBB....",
  "...BBBBBBBBBB...",
  "................",
];

const SPRITE_PAL: Palette = {
  G: "#8CC152",
  g: "#8CC152",
  H: "#C6E59A",
  K: "#4A2A3A",
  W: "#FFFFFF",
  P: "#1A1016",
  r: "#E0526A",
  L: "#B08AA0",
  A: "#BFD8B0",
  M: "#6E8A66",
  B: "#9AA4B8",
};
// ふち取りの色（その文字の外周を暗い色にする）
const OUTLINE: Palette = { G: "#5E8A34", g: "#8E5470", A: "#7E9C72", B: "#6A7488" };

const NORI: [string, string] = ["#414F44", "#5E6E60"];
const TORORO: [string, string] = ["#B8A878", "#D8CCA0"];

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function newCanvas(w: number, h: number): [Canvas, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function speciesPal(id: string): Palette {
  const sp = SPECIES.find((s) => s.id === id);
  if (!sp) throw new Error(`species ${id} がない`);
  return sp.pal;
}

/** 文字盤を canvas に塗る。band の列は、ネタ(SLHE)の部分だけ pal.band で塗る */
function bakeGrid(grid: Grid, pal: Palette, band: number[] | null, w = 16, h = 16): Canvas {
  const [c, g] = newCanvas(w, h);
  grid.forEach((row, y) =>
    row.split("").forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle =
        band && pal.band && band.includes(x) && "SLHE".includes(ch) ? pal.band : pal[ch];
      g.fillRect(x, y, 1, 1);
    }),
  );
  return c;
}

/** ふち取り: OUTLINE に載っている文字の、空きに接する画素を暗い色にする */
function bakeOutlined(grid: Grid, pal: Palette): Canvas {
  const at = (x: number, y: number) => (grid[y] && grid[y][x]) || ".";
  const [c, g] = newCanvas(16, 16);
  grid.forEach((row, y) =>
    row.split("").forEach((ch, x) => {
      if (ch === ".") return;
      const edge = OUTLINE[ch] && NEIGHBORS.some(([dx, dy]) => at(x + dx, y + dy) === ".");
      g.fillStyle = edge ? OUTLINE[ch] : pal[ch];
      g.fillRect(x, y, 1, 1);
    }),
  );
  return c;
}

/** 手続きで描く 32×16 の横長の寿司 */
function longSprite(paint: (px: PutPixel) => void): Canvas {
  const [c, g] = newCanvas(32, 16);
  paint((x, y, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  });
  return c;
}

function rotate(src: Canvas): Canvas {
  const [c, g] = newCanvas(src.height, src.width);
  g.translate(c.width, 0);
  g.rotate(Math.PI / 2);
  g.drawImage(src, 0, 0);
  return c;
}

/**
 * 納豆の軍艦。armed なら本編と同じ軍艦。
 * そうでなければ「こぼれ納豆」: 軍艦を左へ2pxずらし、空いた右側に ◣ の形で崩れ落ちる
 */
function natto(armed: boolean): Canvas {
  const base = bakeGrid(GUNKAN.stretch, { ...RICE, ...speciesPal("natto") }, null);
  if (armed) return base;
  const [c, g] = newCanvas(16, 16);
  g.drawImage(base, -2, 0);
  const B = ["#C9A86A", "#A8854A", "#E8CD92"];
  const cells: [number, number][] = [];
  const row = (y: number, x0: number, x1: number) => {
    for (let x = x0; x <= x1; x++) cells.push([x, y]);
  };
  row(4, 2, 9); // 上の盛り
  for (let y = 5; y <= 14; y++) row(y, 13, Math.min(15, 13 + Math.floor(((y - 5) * 3) / 9))); // 海苔の外に ◣
  row(5, 11, 12); // ふちからあふれる
  for (const [x, y] of cells) {
    g.fillStyle = B[(x * 7 + y * 3) % 5 === 0 ? 2 : (x + y) % 3 === 0 ? 1 : 0];
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

/** カニの押し寿司: 四角いシャリ＋白い身に赤いふち。切れ目入り */
function kaniOshi(): Canvas {
  return longSprite((px) => {
    for (let x = 2; x <= 29; x++) {
      for (let y = 5; y <= 12; y++) {
        const edge = x === 2 || x === 29 || y === 12;
        let col: string;
        if (y === 5) col = "#B82F1C";
        else if (y <= 7)
          col = (x * 3 + y) % 5 === 0 ? "#FF5A35" : y === 6 && x % 3 === 0 ? "#FFB48F" : "#FFF0E8";
        else if (y === 8) col = "#E8432A";
        else col = edge ? "#E0CFB2" : (x * 5 + y) % 11 === 0 ? "#EFDFC8" : "#FFFDF6";
        if (edge && y <= 8) col = "#B82F1C";
        if ((x === 9 || x === 16 || x === 23) && y >= 6 && y <= 11)
          col = y <= 8 ? "#E8432A" : "#E0CFB2";
        px(x, y, col);
      }
    }
  });
}

/** サバの棒寿司: 四角く押したシャリ＋銀青の皮 */
function saba(): Canvas {
  return longSprite((px) => {
    for (let x = 2; x <= 29; x++) {
      for (let y = 5; y <= 12; y++) {
        const edge = x === 2 || x === 29 || y === 12;
        let col: string;
        if (y === 5) col = "#5E7088";
        else if (y <= 7) col = (x + y * 3) % 7 === 0 ? "#2E4058" : y === 6 ? "#B8C8D8" : "#D0DCE8";
        else if (y === 8) col = "#8A9AAE";
        else col = edge ? "#E0CFB2" : (x * 5 + y) % 11 === 0 ? "#EFDFC8" : "#FFFDF6";
        if (edge && y <= 8) col = "#5E7088";
        px(x, y, col);
      }
    }
    for (let x = 4; x <= 27; x += 6) {
      px(x, 6, "#2E4058");
      px(x + 1, 7, "#2E4058");
    }
  });
}

/** アナゴ一本: シャリは普通サイズで真ん中。ネタはシャリの上だけ持ち上がり、両脇は床に沿って平らに伸びる */
function anagoLong(): Canvas {
  return longSprite((px) => {
    NIGIRI.stretch.slice(7, 13).forEach((row, i) =>
      row.split("").forEach((ch, x) => {
        if (ch === "." || "SE".includes(ch)) return;
        if ((x + 8 === 10 || x + 8 === 21) && i + 7 === 9) return; // シャリの上の角を丸める
        px(x + 8, i + 7, RICE[ch] || RICE.R);
      }),
    );
    const cells = new Map<string, string>();
    for (let x = 1; x <= 30; x++) {
      const top =
        x >= 10 && x <= 21
          ? 5
          : (({ 9: 6, 22: 6, 8: 7, 23: 7, 7: 8, 24: 8, 6: 9, 25: 9 } as Record<number, number>)[
              x
            ] ?? 10);
      const thick = top === 10 && (x <= 2 || x >= 29) ? 2 : 3;
      for (let t = 0; t < thick; t++) {
        const y = top + t + (top === 10 && thick === 2 ? 1 : 0);
        cells.set(x + "," + y, t === 0 ? "#E0B383" : x % 4 === 1 ? "#9C6B40" : "#C08A5A");
      }
    }
    const out = new Map<string, string>();
    for (const k of cells.keys()) {
      const [x, y] = k.split(",").map(Number);
      for (const [ax, ay] of NEIGHBORS) {
        const n = x + ax + "," + (y + ay);
        if (!cells.has(n)) out.set(n, "#8A5A34");
      }
    }
    // 肩の角を1px丸める
    for (const k of ["10,4", "21,4", "9,5", "22,5"]) out.delete(k);
    out.set("10,5", "#8A5A34");
    out.set("21,5", "#8A5A34");
    for (const k of ["10,5", "21,5"]) cells.delete(k);
    for (const [k, col] of [...out, ...cells]) {
      const [x, y] = k.split(",").map(Number);
      if (x >= 0 && x < 32 && y >= 0 && y < 16) px(x, y, col);
    }
  });
}

/** 恵方巻き: 外側（海苔 or とろろ昆布）＋左端に具の断面。具の色で種類を変える */
function ehomaki(fill: string[], outer: [string, string], tororo: boolean): Canvas {
  const [o1, o2] = outer;
  return longSprite((px) => {
    for (let x = 3; x <= 29; x++) {
      for (let y = 4; y <= 12; y++) {
        if (x === 29 && (y === 4 || y === 12)) continue;
        px(x, y, (tororo ? (x * 7 + y * 13) % 11 === 0 : (x * 3 + y) % 9 === 0) ? o2 : o1);
      }
    }
    for (let y = 4; y <= 12; y++) {
      for (let x = 1; x <= 8; x++) {
        const d = Math.hypot((x - 4.5) * 1.2, y - 8);
        if (d > 4.6) continue;
        const col = d > 3.8 ? o1 : d > 2.4 ? "#FFFDF6" : fill[(x + y * 2) % fill.length];
        px(x, y, col);
      }
    }
  });
}

/** ターゲット: 鯛（左向き）。frame でしっぽと体を振ってピチピチ */
function tai(frame: 0 | 1): Canvas {
  const [c, g] = newCanvas(16, 16);
  const cells = new Map<string, string>();
  const put = (x: number, y: number, col: string) => {
    if (x >= 0 && x < 16 && y >= 0 && y < 16) cells.set(x + "," + y, col);
  };
  const dy = frame ? -1 : 0;
  const ty = frame ? -1 : 1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const nx = (x - 6.5) / 6;
      const ny = (y - 8.5 - dy) / 3.8;
      if (nx * nx + ny * ny <= 1)
        put(x, y, y - dy > 9 ? "#FAD0C8" : (x + y) % 4 === 0 ? "#F49A92" : "#EE6E72");
    }
  }
  for (let i = 0; i < 4; i++)
    for (let k = -i; k <= i; k++) put(12 + i, 8 + dy + k + (i > 1 ? ty : 0), "#E0505A");
  for (const x of [4, 6, 8, 10]) {
    put(x, 4 + dy, "#E0505A");
    put(x + 1, 5 + dy, "#E0505A");
  }
  for (let x = 4; x <= 10; x++) put(x, 5 + dy, "#E0505A");
  const OUT = "#A8344A";
  const body = new Set(cells.keys());
  for (const k of body) {
    const [x, y] = k.split(",").map(Number);
    for (const [ax, ay] of NEIGHBORS) {
      const n = x + ax + "," + (y + ay);
      if (!body.has(n)) put(x + ax, y + ay, OUT);
    }
  }
  put(3, 7 + dy, "#FFFFFF");
  put(2, 7 + dy, "#1A1016");
  put(1, 9 + dy, OUT);
  for (const [k, col] of cells) {
    const [x, y] = k.split(",").map(Number);
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

/** 太巻き（2×2）: 上から見た切り口。緑の具は入れない（わさびと紛れるため） */
function futomaki(): Canvas {
  const [c, g] = newCanvas(32, 32);
  const cx = 15.5;
  const cy = 16.5;
  const fill: [number, number, number, string][] = [
    [0, -5, 3, "#FFD24A"],
    [5, -1, 3, "#F8B5B0"],
    [2, 5, 3, "#C08A5A"],
    [-4, 4, 3, "#E64A5E"],
    [-5, -3, 3, "#8A5A34"],
    [0, 0, 2.2, "#FFF2BC"],
  ];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.08);
      let col: string | null = null;
      if (d < 11) {
        col = (x * 5 + y * 3) % 13 === 0 ? "#EFDFC8" : "#FFFDF6";
        for (const [fx, fy, r, fc] of fill) if (Math.hypot(x - cx - fx, y - cy - fy) < r) col = fc;
      } else if (d < 12) col = "#EFDFC8";
      else if (d < 14.5) col = (x * 3 + y) % 7 === 0 ? "#5E6E60" : "#414F44";
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}

export function createSprites(): PuzzleSprites {
  const classic = ["#FFD24A", "#E64A5E", "#F8B5B0", "#C08A5A"];
  const kaisen = ["#FF8C5F", "#FFC9A1", "#FF7436", "#FFFDF6"];
  return {
    maguro: bakeGrid(NIGIRI.stretch, { ...RICE, ...speciesPal("maguro") }, null),
    tamago: bakeGrid(NIGIRI.stretch, { ...RICE, ...speciesPal("tamago") }, NIGIRI.band!.stretch),
    alien: bakeOutlined(ALIEN, SPRITE_PAL),
    wasabi: bakeOutlined(WASABI, { ...RICE, ...SPRITE_PAL }),
    tai: [tai(0), tai(1)],
    taiSushi: bakeGrid(
      NIGIRI.stretch,
      {
        ...RICE,
        S: "#F5C4C0",
        L: "#FADAD6",
        H: "#FFF0EE",
        E: "#D9A09C",
      },
      null,
    ),
    nattoArmed: natto(true),
    natto: natto(false),
    futomaki: futomaki(),
    longH: { anago: anagoLong(), saba: saba(), kani: kaniOshi() },
    longV: {
      classic: rotate(ehomaki(classic, NORI, false)),
      kaisen: rotate(ehomaki(kaisen, NORI, false)),
      tororo: rotate(ehomaki(classic, TORORO, true)),
    },
  };
}
