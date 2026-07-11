# 新種6体追加 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** osushi-hakoniwa の住人図鑑に新種6体（ほたて・さば・たい・かに・コーン・大えび）を追加し、12種→18種にする。

**Architecture:** 純粋追加（アプローチA）。`SPECIES` 配列に6要素を追加するだけで、出現抽選（`pickSpecies`）・図鑑ページング（`zukan.ts`）・セーブ形式（`store.ts`）は種数に依存しない実装のため無改修で自動対応する。新規ドット絵は既存の `NIGIRI`/`GUNKAN` グリッド + 1文字パレット方式をそのまま踏襲し、色コードのみ新規追加する。

**Tech Stack:** TypeScript（`vp` = vite-plus CLI）、`vite-plus/test`（vitest 互換）、Canvas 2D（ドット絵ベイク）。

## Global Constraints

- **純粋追加のみ**: `pickSpecies`/`zukan.ts`/`store.ts`/`constants.ts`/`types.ts`/UI・CSS は一切変更しない（設計書「変更しないファイル」節）。
- **`Species` 型は変更しない**（`src/types.ts:16-32`）。`type` 定義のみ使用、`interface` は使わない（Type Honesty）。
- **`RARITY_WEIGHT`・`GREET_NEED` は変更しない**（既存値をそのまま使用。設計書の性格分布表で確認済み）。
- **パレットの明度関係を守る**: 各種で `H`（ハイライト）が最も明るく、`L` > `E`（縁）となること。GUNKAN は `P` > `Q`。既存パターンから逸脱しない。
- **一関数一ファイル**: このタスクは既存データファイル（`sprites.ts`/`species.ts`）へのデータ追加のみで、新規関数は作らない。既存の複数エクスポート構成（グリッド定数・パレット定数・データ配列）は変更しない前提を踏襲する。
- **テストを必ず書く**（プロジェクトルール）: `pickSpecies.test.ts` に新種データの検証テストを追加する。
- **`vp check` は必ず `src/` を指定する**: 引数なし `vp check` はリポジトリ全体を再整形してしまうため禁止。`vp check src/` を使うこと。
- **PATH**: すべての `vp` コマンド実行前に `export PATH="$HOME/.vite-plus/bin:$PATH"` を通すこと（非対話シェル/CI では明示指定が必要）。
- **コミットメッセージ末尾**: 必ず `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` を付ける。
- **公開リポジトリのドキュメントにオーナー名・エージェント名を書かない**（CLAUDE.md 全体ルール）。

---

### Task 1: 新種6体のパレット設計 + プレビューHTMLでオーナー確認

**Files:**

- Create（一時ファイル、コミットしない）: `/Users/f/osushi-hakoniwa/tmp-new-species-preview.html`

**Interfaces:**

- Consumes: なし（既存 `src/sprites.ts` の `NIGIRI`/`GUNKAN`/`EBI_TAIL` グリッド定義・`RICE` パレット・既存12種の `pal` を静的にコピーして使う。ソースは変更しない）
- Produces: Task 2 で使う確定パレット・大えびオーバーレイグリッド（このタスクの成果物はコード変数ではなくオーナー承認そのもの。承認された色コード/グリッドは以下の Step 2 の値を正としてそのまま Task 2 に転記する）

このタスクではプロダクションコード（`src/sprites.ts`/`src/species.ts`）は一切変更しない。スタンドアロン HTML で全18種（既存12種 + 新規6種）を並べて描画し、オーナーに見た目を確認してもらってから Task 2 に進む。

- [ ] **Step 1: プレビュー用の色コードとグリッドを以下の通り確定する**

新種6体の確定パレット（明度関係 `H` > `S`、`L` > `E` を満たすことを事前検算済み）:

```
hotate（ほたて・NIGIRI・rarity1）:
  S:"#FFF6EA"  L:"#FFE9C9"  H:"#FFFFFF"  E:"#E5C99A"

saba（さば・NIGIRI・rarity1）:
  S:"#B8C4D0"  L:"#8FA4B8"  H:"#EAF2F8"  E:"#5C7488"

tai（たい・NIGIRI・rarity2）:
  S:"#F5D6D6"  L:"#FCE9E5"  H:"#FFFAF8"  E:"#D9A8A8"

kani（かに・NIGIRI・rarity2）:
  S:"#FF5A35"  L:"#E8432A"  H:"#FFB48F"  E:"#B82F1C"

corn（コーン・GUNKAN・rarity2）:
  N:"#414F44"  n:"#5E6E60"  O:"#FFD23E"  P:"#FFEFAE"  Q:"#D9A017"

botanebi（大えび・NIGIRI・rarity3、EBI_TAIL 拡張版オーバーレイ付き）:
  S:"#FF6B45"  L:"#FF8A3D"  H:"#FFC9A8"  E:"#C23A1E"  T:"#E8431F"  U:"#A82810"
```

大えび用オーバーレイ `BOTANEBI_TAIL`（`EBI_TAIL` を一回り大きくした尻尾。各行16文字・全16行、`.` は透過）:

```
stretch:
  "UTTU............"
  "TTT............."
  ".TTT............"
  "..TTU..........."
  "...UU..........."
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"

scrunch:
  "..UTTU.........."
  "..TTT..........."
  "...TTT.........."
  "....TTU........."
  ".....UU........."
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
  "................"
```

- [ ] **Step 2: プレビューHTMLを作成する**

`/Users/f/osushi-hakoniwa/tmp-new-species-preview.html` を以下の内容で作成する（既存12種のグリッド・パレットは `src/sprites.ts`・`src/species.ts` から転記済み。本番の `bake()` ロジック（`src/sprites.ts:124-144`）と同じ描画規則を再現している）。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>新種6体プレビュー（全18種）</title>
    <style>
      body {
        background: #1c1c22;
        color: #eee;
        font-family: sans-serif;
        padding: 16px;
      }
      h1 {
        font-size: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 16px;
      }
      .card {
        background: #2a2a33;
        border-radius: 8px;
        padding: 8px;
        text-align: center;
      }
      .card.new {
        outline: 2px solid #ffd23e;
      }
      canvas {
        image-rendering: pixelated;
        background: #111;
      }
      .nm {
        font-size: 12px;
        margin-top: 4px;
      }
      .id {
        font-size: 10px;
        color: #999;
      }
    </style>
  </head>
  <body>
    <h1>新種6体プレビュー（黄枠 = 新規）</h1>
    <div class="grid" id="grid"></div>
    <script>
      const SCALE = 8;
      const RICE = { R: "#FFFDF6", D: "#EFDFC8", d: "#E0CFB2" };

      const NIGIRI_STRETCH = [
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
      ];
      const GUNKAN_STRETCH = [
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
      ];
      const EBI_TAIL_STRETCH = [
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
      ];
      const BOTANEBI_TAIL_STRETCH = [
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
      ];

      const SHAPES = { NIGIRI: NIGIRI_STRETCH, GUNKAN: GUNKAN_STRETCH };
      const OVERLAYS = { EBI_TAIL: EBI_TAIL_STRETCH, BOTANEBI_TAIL: BOTANEBI_TAIL_STRETCH };

      // 既存12種（src/species.ts から転記。変更しない）
      const EXISTING = [
        {
          id: "salmon",
          name: "サーモン",
          rarity: 1,
          shape: "NIGIRI",
          pal: { S: "#FF8C5F", L: "#FFC9A1", H: "#FFE6D2", E: "#E06A3C" },
        },
        {
          id: "maguro",
          name: "まぐろ",
          rarity: 1,
          shape: "NIGIRI",
          pal: { S: "#E64A5E", L: "#F2858F", H: "#FAB4BB", E: "#B83648" },
        },
        {
          id: "tamago",
          name: "たまご",
          rarity: 1,
          shape: "NIGIRI",
          pal: { S: "#FFD24A", L: "#FFE285", H: "#FFF2BC", E: "#E8A23E", band: "#414F44" },
          bandCols: [7, 8],
        },
        {
          id: "tako",
          name: "たこ",
          rarity: 1,
          shape: "NIGIRI",
          pal: { S: "#FAEDF2", L: "#C9608A", H: "#FFFFFF", E: "#B4527A" },
        },
        {
          id: "natto",
          name: "なっとう",
          rarity: 1,
          shape: "GUNKAN",
          pal: { N: "#3E4A40", n: "#5C6B5E", O: "#C9A86A", P: "#E8CD92", Q: "#A8854A" },
        },
        {
          id: "ebi",
          name: "えび",
          rarity: 2,
          shape: "NIGIRI",
          pal: {
            S: "#FFF0E8",
            L: "#FF8662",
            H: "#FFFAF6",
            E: "#EE9476",
            T: "#FF8662",
            U: "#EE9476",
          },
          overlay: "EBI_TAIL",
        },
        {
          id: "ika",
          name: "いか",
          rarity: 2,
          shape: "NIGIRI",
          pal: { S: "#F3F2F7", L: "#FFFFFF", H: "#FFFFFF", E: "#CFCBDC" },
        },
        {
          id: "ikura",
          name: "いくら",
          rarity: 2,
          shape: "GUNKAN",
          pal: { N: "#414F44", n: "#5E6E60", O: "#FF7436", P: "#FFC18E", Q: "#E0522A" },
        },
        {
          id: "anago",
          name: "あなご",
          rarity: 2,
          shape: "NIGIRI",
          pal: { S: "#C08A5A", L: "#9C6B40", H: "#E0B383", E: "#8A5A34" },
        },
        {
          id: "engawa",
          name: "えんがわ",
          rarity: 2,
          shape: "NIGIRI",
          pal: { S: "#FBF2E0", L: "#F2D9A4", H: "#FFFFFF", E: "#E3BC78" },
        },
        {
          id: "uni",
          name: "うに",
          rarity: 3,
          shape: "GUNKAN",
          pal: { N: "#414F44", n: "#5E6E60", O: "#F2A23E", P: "#FFD089", Q: "#D27E1E" },
        },
        {
          id: "toro",
          name: "とろ",
          rarity: 3,
          shape: "NIGIRI",
          pal: { S: "#F8B5B0", L: "#FFE8E4", H: "#FFF5F3", E: "#E08B86" },
        },
      ];

      // 新種6体
      const NEW = [
        {
          id: "hotate",
          name: "ほたて",
          rarity: 1,
          shape: "NIGIRI",
          pal: { S: "#FFF6EA", L: "#FFE9C9", H: "#FFFFFF", E: "#E5C99A" },
        },
        {
          id: "saba",
          name: "さば",
          rarity: 1,
          shape: "NIGIRI",
          pal: { S: "#B8C4D0", L: "#8FA4B8", H: "#EAF2F8", E: "#5C7488" },
        },
        {
          id: "tai",
          name: "たい",
          rarity: 2,
          shape: "NIGIRI",
          pal: { S: "#F5D6D6", L: "#FCE9E5", H: "#FFFAF8", E: "#D9A8A8" },
        },
        {
          id: "kani",
          name: "かに",
          rarity: 2,
          shape: "NIGIRI",
          pal: { S: "#FF5A35", L: "#E8432A", H: "#FFB48F", E: "#B82F1C" },
        },
        {
          id: "corn",
          name: "コーン",
          rarity: 2,
          shape: "GUNKAN",
          pal: { N: "#414F44", n: "#5E6E60", O: "#FFD23E", P: "#FFEFAE", Q: "#D9A017" },
        },
        {
          id: "botanebi",
          name: "大えび",
          rarity: 3,
          shape: "NIGIRI",
          pal: {
            S: "#FF6B45",
            L: "#FF8A3D",
            H: "#FFC9A8",
            E: "#C23A1E",
            T: "#E8431F",
            U: "#A82810",
          },
          overlay: "BOTANEBI_TAIL",
        },
      ];

      function bake(sp) {
        const c = document.createElement("canvas");
        c.width = 16 * SCALE;
        c.height = 16 * SCALE;
        const g = c.getContext("2d");
        const pal = { ...RICE, ...sp.pal };
        const put = (row, y) =>
          row.split("").forEach((ch, x) => {
            if (ch === ".") return;
            g.fillStyle = sp.bandCols && sp.bandCols.includes(x) ? pal.band : pal[ch];
            g.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
          });
        SHAPES[sp.shape].forEach(put);
        if (sp.overlay) OVERLAYS[sp.overlay].forEach(put);
        return c;
      }

      const grid = document.getElementById("grid");
      const stars = (r) => "★".repeat(r);
      for (const sp of [...EXISTING, ...NEW]) {
        const card = document.createElement("div");
        card.className = "card" + (NEW.includes(sp) ? " new" : "");
        card.appendChild(bake(sp));
        const nm = document.createElement("div");
        nm.className = "nm";
        nm.textContent = `${sp.name} ${stars(sp.rarity)}`;
        const id = document.createElement("div");
        id.className = "id";
        id.textContent = sp.id;
        card.appendChild(nm);
        card.appendChild(id);
        grid.appendChild(card);
      }
    </script>
  </body>
</html>
```

- [ ] **Step 3: ブラウザで開いてオーナーに確認してもらう**

```bash
open /Users/f/osushi-hakoniwa/tmp-new-species-preview.html
```

オーナーに新種6体（黄枠）の見た目を見せ、承認を得る。修正依頼があれば Step 1 の色コード/グリッドを直接調整し、Step 2 の該当 `pal`/`overlay` 定義を書き換えて再確認する（承認が出るまで繰り返す）。

- [ ] **Step 4: 承認後、プレビューファイルを削除する**

このファイルはプロダクションコードではないため、コミットしない。

```bash
rm /Users/f/osushi-hakoniwa/tmp-new-species-preview.html
```

Step 1 で確定した色コード・`BOTANEBI_TAIL` グリッドが Task 2 の正となる。

---

### Task 2: sprites.ts + species.ts にデータ追加

**Files:**

- Modify: `/Users/f/osushi-hakoniwa/src/sprites.ts`
- Modify: `/Users/f/osushi-hakoniwa/src/species.ts`

**Interfaces:**

- Consumes: Task 1 で承認済みの色コード・`BOTANEBI_TAIL` グリッド（このタスク内に確定値として再掲する）。既存 `Shape`/`Palette`/`Overlay`/`Species` 型（`src/types.ts:3-32`、変更なし）。既存 `NIGIRI`/`GUNKAN`/`RICE`/`EBI_TAIL`（`src/sprites.ts:4-121`、変更なし）。
- Produces: `BOTANEBI_TAIL: Overlay`（`src/sprites.ts` からエクスポート、Task 3 では未使用）。`SPECIES: Species[]`（`src/species.ts` からエクスポート、要素数18。Task 3 のテストが参照する）。

- [ ] **Step 1: `src/sprites.ts` に `BOTANEBI_TAIL` オーバーレイを追加する**

`export const EBI_TAIL: Overlay = { ... };`（`src/sprites.ts:84-121`）の直後、`// ============ スプライトベイク ============`（`src/sprites.ts:123`）の直前に以下を挿入する:

```typescript
// 大えびのしっぽ(拡大おうぎ尾) : EBI_TAIL を一回り大きくした尻尾
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
```

- [ ] **Step 2: `src/species.ts` の import を更新する**

`src/species.ts:2` を変更する:

```typescript
// 変更前
import { NIGIRI, GUNKAN, EBI_TAIL } from "./sprites";
// 変更後
import { NIGIRI, GUNKAN, EBI_TAIL, BOTANEBI_TAIL } from "./sprites";
```

- [ ] **Step 3: `SPECIES` 配列に6要素を追加する**

`src/species.ts` の `toro` エントリ（`src/species.ts:165-178`）の直後、配列を閉じる `];`（`src/species.ts:179`）の直前に以下を挿入する:

```typescript
  {
    id: "hotate",
    name: "ほたて",
    seikaku: "あまえんぼ",
    shape: NIGIRI,
    rarity: 1,
    pal: { S: "#FFF6EA", L: "#FFE9C9", H: "#FFFFFF", E: "#E5C99A" },
    step: 190,
    pauseP: 0.03,
    pauseLen: [800, 2300],
    heartP: 0.07,
    flipP: 0.03,
    driftP: 0.35,
  },
  {
    id: "saba",
    name: "さば",
    seikaku: "せっかち",
    shape: NIGIRI,
    rarity: 1,
    pal: { S: "#B8C4D0", L: "#8FA4B8", H: "#EAF2F8", E: "#5C7488" },
    step: 135,
    pauseP: 0,
    pauseLen: [0, 0],
    heartP: 0.01,
    flipP: 0.02,
    driftP: 0.35,
  },
  {
    id: "tai",
    name: "たい",
    seikaku: "のんびりや",
    shape: NIGIRI,
    rarity: 2,
    pal: { S: "#F5D6D6", L: "#FCE9E5", H: "#FFFAF8", E: "#D9A8A8" },
    step: 240,
    pauseP: 0.06,
    pauseLen: [1500, 3500],
    heartP: 0.012,
    flipP: 0.03,
    driftP: 0.35,
  },
  {
    id: "kani",
    name: "かに",
    seikaku: "こうきしんおうせい",
    shape: NIGIRI,
    rarity: 2,
    pal: { S: "#FF5A35", L: "#E8432A", H: "#FFB48F", E: "#B82F1C" },
    step: 170,
    pauseP: 0.02,
    pauseLen: [800, 2300],
    heartP: 0.015,
    flipP: 0.08,
    driftP: 0.5,
  },
  {
    id: "corn",
    name: "コーン",
    seikaku: "ねぼすけ",
    shape: GUNKAN,
    rarity: 2,
    pal: { N: "#414F44", n: "#5E6E60", O: "#FFD23E", P: "#FFEFAE", Q: "#D9A017" },
    step: 210,
    pauseP: 0.06,
    pauseLen: [2500, 6000],
    heartP: 0.01,
    flipP: 0.03,
    driftP: 0.35,
  },
  {
    id: "botanebi",
    name: "大えび",
    seikaku: "はずかしがりや",
    shape: NIGIRI,
    rarity: 3,
    pal: { S: "#FF6B45", L: "#FF8A3D", H: "#FFC9A8", E: "#C23A1E", T: "#E8431F", U: "#A82810" },
    overlay: BOTANEBI_TAIL,
    step: 190,
    pauseP: 0.03,
    pauseLen: [800, 2300],
    heartP: 0.01,
    flipP: 0.14,
    driftP: 0.35,
  },
```

- [ ] **Step 4: 型チェックで確認する**

```bash
export PATH="$HOME/.vite-plus/bin:$PATH"
cd /Users/f/osushi-hakoniwa
vp check src/
```

Expected: エラー0（`Species` 型の必須フィールドがすべて揃っているため型エラーは出ない）。

---

### Task 3: テスト更新 + 検証 + commit

**Files:**

- Modify: `/Users/f/osushi-hakoniwa/src/pickSpecies.test.ts`

**Interfaces:**

- Consumes: `SPECIES`（`src/species.ts`、Task 2 で18要素になったもの）。`pickSpecies`（`src/world.ts:11`、変更なし）。
- Produces: なし（このタスクが最終タスク）。

- [ ] **Step 1: 新種データの検証テストを追加する**

`src/pickSpecies.test.ts` の既存 `describe("pickSpecies", ...)` ブロック（`src/pickSpecies.test.ts:5-39`）の閉じ括弧 `});`（`src/pickSpecies.test.ts:39`）の直後に、以下の新しい `describe` ブロックを追加する:

```typescript
describe("SPECIES (2026-07-11 new-species addition)", () => {
  it("has 18 species total", () => {
    expect(SPECIES.length).toBe(18);
  });

  it("keeps the rarity-tier distribution defined in the design doc (7 / 8 / 3)", () => {
    const counts: Record<number, number> = {};
    for (const sp of SPECIES) {
      counts[sp.rarity] = (counts[sp.rarity] || 0) + 1;
    }
    expect(counts[1]).toBe(7);
    expect(counts[2]).toBe(8);
    expect(counts[3]).toBe(3);
  });

  it("includes the 6 new species with the expected ids", () => {
    const newIds = ["hotate", "saba", "tai", "kani", "corn", "botanebi"];
    for (const id of newIds) {
      expect(SPECIES.some((sp) => sp.id === id)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: テストを実行して全てパスすることを確認する**

```bash
export PATH="$HOME/.vite-plus/bin:$PATH"
cd /Users/f/osushi-hakoniwa
vp test run
```

Expected: 全テストファイル PASS（既存の `pickSpecies` テスト5件 + 新規3件 + `greet.test.ts`/`store.test.ts`/`walls.test.ts` の既存テストすべて）。

- [ ] **Step 3: lint/型チェック + ビルドを実行する**

```bash
export PATH="$HOME/.vite-plus/bin:$PATH"
cd /Users/f/osushi-hakoniwa
vp check src/
vp build
```

Expected: 両方エラー0・ビルド成功。

- [ ] **Step 4: `vp dev` でブラウザ確認する**

```bash
export PATH="$HOME/.vite-plus/bin:$PATH"
cd /Users/f/osushi-hakoniwa
vp dev
```

ブラウザで以下を確認する:

- 新規タブ + `localStorage.clear()` でリロード → 18種のいずれかが出現しうる
- 図鑑を開く → 3ページ構成（`ZUKAN_PAGE_SIZE=6` × 3 = 18）になっている
- 新種6体（ほたて・さば・たい・かに・コーン・大えび）のドット絵が正常に描画される（欠けたピクセル・透過色化けがない）
- 既存のなかよし記録（`localStorage` の `osushi-zukan-v2`）がある状態でリロードしても保持されている

確認後、開発サーバーを停止する（`Ctrl+C`）。

- [ ] **Step 5: ヘッドレススモークで最終確認する（任意・既存スクリプト流用）**

`~/.workspace/osushi-smoke/check.js` は `SPECIES.length`/`sushis.length` 等を出力する既存の Playwright スモークスクリプト（このリポジトリの外にあるため編集不要。コード内コメントの `// 12` は単なる旧値メモで assert ではない）。実行して `speciesCount` が `18` になっていることを目視確認する。

```bash
node /Users/f/.workspace/osushi-smoke/check.js
```

Expected: 出力 JSON の `results.speciesCount` が `18`。`results.consoleErrors` が空配列。それ以外の既存チェック（`fillToMax`/`greetTamago`/`zukan.cardCount` 等）も従来通りパスすること（`zukan.cardCount` は `ZUKAN_PAGE_SIZE=6` のため1ページ目は変わらず `6`）。

- [ ] **Step 6: commit する**

```bash
cd /Users/f/osushi-hakoniwa
git add src/sprites.ts src/species.ts src/pickSpecies.test.ts
git commit -m "$(cat <<'EOF'
feat: 新種6体を追加（ほたて・さば・たい・かに・コーン・大えび）

図鑑を12種→18種に拡張。純粋追加のみで出現ロジック・図鑑UI・セーブ形式は無改修。
大えびは EBI_TAIL を拡大した BOTANEBI_TAIL オーバーレイで えび と差別化。

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
git status
```

Expected: commit 成功、`git status` が clean（`tmp-new-species-preview.html` は Task 1 Step 4 で削除済みのため untracked に残らない）。
