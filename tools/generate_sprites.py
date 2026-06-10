#!/usr/bin/env python3
"""お寿司箱庭 スプライト生成ツール

文字列グリッド(正面ビュー)とボクセルモデル(アイソメ)から、
スプライトシートとプレビューGIFを assets/ に一括生成する。

  python3 tools/generate_sprites.py

ネタの追加方法:
  正面ビュー  -> NETA_FRONT に4色(+帯があればband)を追加
  アイソメ    -> NETA_ISO に5色を追加
形状そのものの変更は GRID_* / build_voxels を編集する。
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / "assets" / "sheets"
PREVIEWS = ROOT / "assets" / "previews"

# ============================================================
# 正面ビュー(箱庭標準) : イモムシ移動v2
#   . 透明 / E ネタ縁 / S ネタ / L スジ / H ハイライト
#   R シャリ / D 米粒影 / d シャリ縁
# ============================================================
GRID_STRETCH = [
"................","................","................",
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
"................","................","................"]
GRID_SCRUNCH = [
"................","................",
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
"................","................","................"]
BAND_COLS = {"stretch": (7, 8), "scrunch": (8, 9)}  # 海苔帯(縮みは前端固定で1列ずれる)

RICE = {"R": (255,253,246), "D": (239,223,200), "d": (224,207,178)}
NETA_FRONT = {
    "salmon": {"S": (255,140,95), "L": (255,201,161), "H": (255,230,210), "E": (224,106,60)},
    "maguro": {"S": (230,74,94),  "L": (242,133,143), "H": (250,180,187), "E": (184,54,72)},
    "tamago": {"S": (255,210,74), "L": (255,226,133), "H": (255,242,188), "E": (232,162,62),
               "band": (65,79,68)},
}

def render_front(grid, neta, band_cols=None):
    pal = {**RICE, **{k: v for k, v in neta.items() if k != "band"}}
    im = Image.new("RGBA", (16, 16))
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            if band_cols and x in band_cols:
                im.putpixel((x, y), neta["band"] + (255,))
            else:
                im.putpixel((x, y), pal[ch] + (255,))
    return im

# ============================================================
# アイソメビュー : ボクセルモデル + 2:1投影 (32x32)
# ============================================================
NETA_ISO = {
    "salmon": {"top": (255,140,95), "stripe": (255,201,161), "hi": (255,230,210),
               "left": (236,112,70), "right": (224,106,60)},
    "maguro": {"top": (230,74,94),  "stripe": (242,133,143), "hi": (250,180,187),
               "left": (216,64,90), "right": (184,54,72)},
}
RICE_ISO = {"top": (255,253,246), "left": (245,234,212), "right": (224,207,178)}

def render_iso(neta, scrunch=False, size=(32,32), ox=10, oy=15):
    rx0 = 1 if scrunch else 0          # 縮み: 後端1ボクセル前進(前端固定)
    nx0 = 0 if scrunch else -1
    nzt = 10 if scrunch else 9         # 縮み: ネタ+1px厚(背中の盛り上がり)
    im = Image.new("RGBA", size)
    px = im.load()
    def put(x, y, c):
        if 0 <= x < size[0] and 0 <= y < size[1]:
            px[x, y] = c + (255,)
    for z in range(0, nzt + 1):
        for y in range(-1, 5):
            for x in range(nx0, 9):
                if z <= 4:
                    kind = "rice" if (rx0 <= x < 8 and 0 <= y < 4) else None
                else:
                    kind = "neta"
                if not kind:
                    continue
                sx = 2 * (x - y) + ox
                sy = (x + y) - z + oy
                if kind == "neta":
                    top = neta["stripe"] if (x + y) % 3 == 0 else neta["top"]
                    if x <= nx0 + 1 and y <= 0:
                        top = neta["hi"]
                    left, right = neta["left"], neta["right"]
                else:
                    top, left, right = RICE_ISO["top"], RICE_ISO["left"], RICE_ISO["right"]
                put(sx+1, sy, top); put(sx+2, sy, top)
                for dx in range(4): put(sx+dx, sy+1, top)
                put(sx, sy+2, left); put(sx+1, sy+2, left)
                put(sx+2, sy+2, right); put(sx+3, sy+2, right)
    return im

# ============================================================
# 出力
# ============================================================
def save_sheet(frames, path):
    w, h = frames[0].size
    sheet = Image.new("RGBA", (w * len(frames), h))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * w, 0))
    sheet.save(path)

def save_gif(frames, path, scale, bg=(255,240,244)):
    imgs = []
    for f in frames:
        c = Image.new("RGBA", f.size, bg + (255,))
        c.alpha_composite(f)
        imgs.append(c.resize((f.size[0]*scale, f.size[1]*scale), Image.NEAREST).convert("P"))
    imgs[0].save(path, save_all=True, append_images=imgs[1:], duration=190, loop=0)

def main():
    SHEETS.mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    for name, neta in NETA_FRONT.items():
        has_band = "band" in neta
        frames = [
            render_front(GRID_STRETCH, neta, BAND_COLS["stretch"] if has_band else None),
            render_front(GRID_SCRUNCH, neta, BAND_COLS["scrunch"] if has_band else None),
        ]
        save_sheet(frames, SHEETS / f"{name}-front.png")
        save_gif(frames, PREVIEWS / f"{name}-front.gif", scale=15)
    for name, neta in NETA_ISO.items():
        frames = [render_iso(neta, False), render_iso(neta, True)]
        save_sheet(frames, SHEETS / f"{name}-iso.png")
        save_gif(frames, PREVIEWS / f"{name}-iso.gif", scale=9)
    print(f"generated -> {SHEETS} / {PREVIEWS}")

if __name__ == "__main__":
    main()
