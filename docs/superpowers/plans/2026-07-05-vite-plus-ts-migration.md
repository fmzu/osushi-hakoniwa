# おすしのはこにわ Vite+/TypeScript 移行 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依存ゼロ素HTMLの osushi-hakoniwa を、Vite+(vp)+TypeScript のモジュール構成に純粋移植する（挙動不変）。

**Architecture:** 現行の共有グローバル（state / sushis / hearts / canvas）を、ESモジュールの「共有シングルトン（各モジュールが export し他が import）」として素直に移植する。振る舞いは1ミリも変えない。ツールチェーンは vp（ベータ）。

**Tech Stack:** Vite+ (vp), TypeScript, Vitest, Cloudflare Pages + GitHub Actions。

---

## 全体方針（実装者は必ず読むこと）

- **純粋移植**。挙動・見た目・数値・DOM構造を変えない。各モジュールは「現行 `index.html`（原本）の該当ブロックをそのまま移し、型を付ける」だけ。勝手なリファクタ・最適化・命名変更・数値変更をしない。
- **原本の場所**: 移植元は `/Users/f/osushi-hakoniwa/index.html`（Task 3 で `src/main.ts` に丸ごと移した後、Stage B で1モジュールずつ切り出す）。本計画が「原本 line X-Y」と書いたら、この `index.html` の行番号を指す。
- **共有シングルトン方式**: `state`（store.ts が生成し export）、`sushis`/`hearts`（world.ts が export）、`cv`/`ctx`（canvas.ts が export）などは、各モジュールが export し必要な所で import する。関数シグネチャは原則そのまま。
- **循環依存の回避（重要）**:
  - `sprites.ts` は `species.ts` を import しない。`bakeAllSprites(species)` が引数で SPECIES を受け取り破壊的に `spr`/`shadow` を埋める。
  - `world.ts` → `zukan.ts`（`updateZukanCount`）は**一方向**。`zukan.ts` は `world.ts` を import しない。
  - `walls.ts` は `store.ts` を import しない。`currentWall(wallId: string)` が wallId を引数で受け、呼び出し側（render.ts）が `state.wall` を渡す。
- **DOMイベント配線は `initX()` 関数に隔離する（テスト安全化のための最小限の構造化）**: 各UIモジュール（input / bell / zukan / wallModal）の `addEventListener` / `.onclick` / `setInterval` 配線は、モジュール読み込み時の副作用にせず、export した `initX()` の中に入れる。`main.ts` が起動時に `initX()` を呼ぶ。純粋ロジック関数（`greet` `renderZukan` `updateZukanCount` `renderWalls` `pickSpecies` `currentWall`）は個別に export し、単体テストから直接呼べるようにする。**挙動は不変**（配線は起動時に走る）。
- **test-enabling な null ガードのみ許可**: `showBanner` / `updateZukanCount` / `spawn`・`leave` の count 更新 / `canvas.ts` の `imageSmoothingEnabled` は、対象要素が無い（jsdom 単体テスト）場合に落ちないよう null ガードする。実ブラウザでは要素が必ず在るので**挙動は不変**。
- **型は `interface` を使わず `type` で統一する**。これは `software-design` スキル「Type Honesty」の明文ルール（「TypeScript の `interface` 構文は使わない、`type` で表す」「不変データ＋ロジック不要 ⇒ type」）に準拠。`types.ts` 全体を `type` エイリアスで揃える。
- **vp コマンド名は Task 1 で実物確定する**。以降のタスクで `vp dev` `vp build` `vp preview` `vp check` `vp test run` と書いた箇所は、すべて「Task 1 で確定したコマンド名」を使うこと。相違があれば Task 1 の記録に従って読み替える。
- **push はしない（Stage E まで）**。各タスク末尾で `git commit` する。ローカルの各 commit を push するかは**主導者（メイン）が判断**する。Stage E のデプロイ設定でのみ push を前提にする。

## ファイル構成（最終形）

```
index.html            # body マークアップ + <script type="module" src="/src/main.ts">
src/style.css         # 現行 <style> の中身（原本 line 9-84）
src/constants.ts      # 数値定数
src/types.ts          # 型定義（Grid/Shape/Overlay/Palette/Species/Wall/Sushi/Heart/SaveState）
src/sprites.ts        # RICE/NIGIRI/GUNKAN/EBI_TAIL/bake/silhouette/bakeAllSprites
src/species.ts        # SPECIES/RARITY_WEIGHT/GREET_NEED
src/walls.ts          # WALLS/currentWall(wallId)
src/store.ts          # store{load,save}/state シングルトン
src/banner.ts         # showBanner
src/zukan.ts          # updateZukanCount/renderZukan/initZukan
src/world.ts          # sushis/hearts/pickSpecies/spawn/markSeen/visit/leave/tick
src/canvas.ts         # cv/ctx
src/render.ts         # drawHeart/draw
src/wallModal.ts      # renderWalls/initWallModal
src/bell.ts           # initBell
src/input.ts          # greet/initInput
src/schedule.ts       # scheduleVisit/scheduleLeave/welcomeBack/startLastVisitSave
src/main.ts           # 起動シーケンス
src/pickSpecies.test.ts / greet.test.ts / store.test.ts / walls.test.ts
vite.config.ts        # test ブロック（jsdom）
.github/workflows/deploy.yml
```

依存グラフ（→ = import する側 → される側）:
`sprites→types` / `species→types,sprites` / `walls→types` / `store→types` / `zukan→constants,species,store` / `world→constants,species,store,banner,zukan` / `canvas→constants` / `render→constants,canvas,world,walls,store` / `wallModal→walls,store` / `bell→constants,world` / `input→constants,canvas,world,store,species,banner,zukan` / `schedule→constants,world,store,banner` / `main→(all)`。この順序が Stage B の抽出順（依存先を先に切り出す）。

---

## Stage A: 足場

### Task 1: vp 実体確認ゲート

**Files:** なし（コマンド実行と記録のみ）

- [ ] **Step 1: vp の存在確認。無ければ導入**

Run: `vp --version`
未導入で `command not found` の場合のみ:
Run: `curl -fsSL https://vite.plus | bash`
その後シェルを開き直すか `export PATH` を通し、再度 `vp --version` が版番号を返すことを確認。

- [ ] **Step 2: サブコマンドの正式名を実物で確定**

Run: `vp help`
Run: `vp create --list`
以下を**実物の出力から**確定し、メモに控える（推測禁止）:
1. vanilla-ts テンプレートの正式名（設計の想定は `vanilla-ts`）
2. 雛形作成コマンドの正確な構文（想定 `vp create vite -- --template vanilla-ts`）
3. dev / build / preview / test / lint+型 の各サブコマンド名（想定 `vp dev` / `vp build` / `vp preview` / `vp test run` / `vp check`）
4. `vp build` の出力ディレクトリ（想定 `dist/`。`vp help build` などで確認）
5. 依存追加の方法（`vp add` があるか。無ければ「package.json を編集 → `vp install`」で代替する）

- [ ] **Step 3: 確定結果を計画に注記（コミット不要）**

以降のタスクの `vp dev` 等は、ここで確定した正式名で読み替えて実行する。想定と実物が食い違った場合は、実物を正とする。

**このタスクはコミット対象なし**（ソース変更が無いため）。次タスクから commit を積む。

---

### Task 2: vanilla-ts 雛形を作成し既存リポジトリへ取り込む

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`（雛形由来）, `src/`（雛形の暫定中身。Task 3 で置き換え）
- Modify: `.gitignore`（`node_modules` / `dist` 追加）
- 保持（触らない）: `index.html`（現行。Task 3 で置換）, `iso.html`, `docs/`, `assets/`, `tools/`, `LICENSE`, `README.md`, `.git`, `.superpowers`

- [ ] **Step 1: 別ディレクトリに雛形を生成する（既存ファイルを汚さないため）**

Run（Task 1 で確定した create 構文を使用。以下は想定）:
```bash
cd /Users/f && vp create vite /Users/f/.workspace/osushi-scaffold -- --template vanilla-ts
```
（`vp create` の対話が出る場合は vanilla-ts / TypeScript を選ぶ。生成先は `~/.workspace` 配下＝作業用の捨て場所）

- [ ] **Step 2: 雛形から必要ファイルだけをリポジトリへコピーする**

`package.json` / `tsconfig.json` / `vite.config.ts`（または `.js`）/ `.gitignore` の雛形版と、`src/` の雛形一式を `/Users/f/osushi-hakoniwa/` へコピーする。**既存の `index.html` は上書きしない**（Task 3 で扱う）。`public/` が雛形にあればコピー。
```bash
cd /Users/f/.workspace/osushi-scaffold && \
cp -R src /Users/f/osushi-hakoniwa/ && \
cp package.json tsconfig.json vite.config.* /Users/f/osushi-hakoniwa/ 2>/dev/null; \
[ -d public ] && cp -R public /Users/f/osushi-hakoniwa/
```

- [ ] **Step 3: `.gitignore` に node_modules / dist を追加**

`/Users/f/osushi-hakoniwa/.gitignore` を開き、以下が含まれるようにする（既存の中身は残す）:
```
node_modules
dist
```

- [ ] **Step 4: 依存導入して dev が立つことを確認**

Run: `cd /Users/f/osushi-hakoniwa && vp install`
Run: `cd /Users/f/osushi-hakoniwa && vp dev`
Expected: Vite の開発サーバが起動し、ブラウザで雛形のデフォルト画面（"Vite" ロゴ等）が表示される。確認したら Ctrl+C で停止。

- [ ] **Step 5: Commit**

```bash
cd /Users/f/osushi-hakoniwa && \
git add package.json tsconfig.json vite.config.* src .gitignore public 2>/dev/null; \
git commit -m "chore: scaffold Vite+ vanilla-ts project into repo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: 現行ゲームをまるごと1枚で移植（まだ分割しない）

狙い: **早期に「動く Vite+TS 版」を得る**。分割は Stage B。

**Files:**
- Create: `src/style.css`（原本 line 9-84 の CSS）
- Modify/Replace: `src/main.ts`（雛形の中身を破棄し、原本 `<script>` の全内容 line 124-537 を移植）
- Replace: `index.html`（body マークアップのみ + module script）
- Delete: 雛形が作った `src/counter.ts` `src/typescript.svg` `src/style.css`（雛形版）等の不要ファイル（存在すれば）

- [ ] **Step 1: `src/style.css` を作る**

原本 `index.html` の `<style>` 内（line 9-84）を**そのまま**貼り付ける（`<style>`/`</style>` タグは含めない）。

- [ ] **Step 2: `src/main.ts` を現行スクリプトで置き換える**

先頭に `import './style.css';` を置き、その下に原本 `<script>` の中身（line 124-537）を**そのまま**貼り付ける。ファイル冒頭（import の直後）に `// @ts-nocheck` を1行入れる（Stage B で型を付けながら段階的に外す。dev/build は esbuild なので型エラーでも動く）。

```ts
import './style.css';
// @ts-nocheck
// ↓ 原本 index.html line 124-537 をそのまま貼り付け（形状グリッド〜visibilitychange まで全部）
```

- [ ] **Step 3: `index.html` を body だけに置き換える**

`/Users/f/osushi-hakoniwa/index.html` を以下で全置換する。`<head>` の meta / title / フォント link は原本 line 4-7 のまま維持し、`<style>` と `<script>` を削除、末尾に module script を足す。body は原本 line 88-121 をそのまま使う。
```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>おすしのはこにわ</title>
<link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet">
</head>
<body>
<!-- ↓ 原本 index.html line 88-121（h1/sub/frame/canvas/banner/bar/zukan/wallModal）をそのまま貼り付け -->
<script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 4: 雛形の不要ファイルを削除**

存在するものだけ削除:
```bash
cd /Users/f/osushi-hakoniwa && rm -f src/counter.ts src/typescript.svg public/vite.svg
```
（雛形版 `src/style.css` は Step 1 で上書き済み）

- [ ] **Step 5: dev で現行と同一に動くことを目視確認**

Run: `cd /Users/f/osushi-hakoniwa && vp dev`
ブラウザで確認: 初期3匹が歩く / 🔔よぶ / 🎨かべ（6色・切替保存）/ ずかん（2ページ・3状態・★）/ お寿司タップであいさつ。原本（`file://.../index.html` を別窓で開いて比較）と見た目・挙動が同一であること。確認後 Ctrl+C。

- [ ] **Step 6: Commit**

```bash
cd /Users/f/osushi-hakoniwa && \
git add index.html src/main.ts src/style.css && \
git rm --cached src/counter.ts src/typescript.svg public/vite.svg 2>/dev/null; \
git commit -m "feat: port current game into Vite+ as a single main.ts (behavior unchanged)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Stage B: モジュール抽出（挙動不変・1モジュール1タスク）

各タスク共通の手順: (1) 新ファイルを作る、(2) `src/main.ts` から該当ブロックを削除し `import` を足す（必要なら `initX()` 呼び出しを追加）、(3) `vp dev` で挙動が変わらないことを目視確認、(4) commit。抽出が進むごとに `main.ts` の `// @ts-nocheck` が指す範囲は縮む。**最後の Task 19 で `// @ts-nocheck` を外し `vp check` を green にする**。

コミットメッセージは各タスクとも末尾に必ず:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
を付ける（以下の各 commit ブロックでは省略表記。実際には必ず付与）。

### Task 4: constants.ts

**Files:** Create `src/constants.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/constants.ts` を作る**

```ts
export const W = 160;
export const H = 144;
export const GROUND_TOP = 28;
export const MAX_SUSHI = 14;
export const BELL_CD = 90;
export const ZUKAN_PAGE_SIZE = 6;
export const AWAY_MS = 20 * 60 * 1000;
```

- [ ] **Step 2: main.ts から定数の定義を削除し import に置換**

`main.ts` 内の `const W = 160, H = 144, GROUND_TOP = 28;`（原本 line 287）、`const MAX_SUSHI = 14;`（line 314）、`const BELL_CD = 90;`（line 436）、`const ZUKAN_PAGE_SIZE = 6;`（line 459）、および welcomeBack 内の `const AWAY_MS = 20*60*1000;`（line 524）を削除。`main.ts` 冒頭（`import './style.css';` の下）に追加:
```ts
import { W, H, GROUND_TOP, MAX_SUSHI, BELL_CD, ZUKAN_PAGE_SIZE, AWAY_MS } from './constants';
```
welcomeBack 内の `AWAY_MS` はローカル宣言を消してこの import を参照する。

- [ ] **Step 3: dev 確認** — `vp dev` で挙動不変を目視。

- [ ] **Step 4: Commit** — `git add src/constants.ts src/main.ts && git commit -m "refactor: extract constants.ts"`

### Task 5: types.ts

**Files:** Create `src/types.ts`（型のみ。ランタイム出力なし）

- [ ] **Step 1: `src/types.ts` を作る**

```ts
export type Grid = string[];

export type Overlay = {
  stretch: Grid;
  scrunch: Grid;
};

export type Shape = {
  stretch: Grid;
  scrunch: Grid;
  band?: { stretch: [number, number]; scrunch: [number, number] };
};

export type Palette = Record<string, string>;

export type Species = {
  id: string;
  name: string;
  seikaku: string;
  shape: Shape;
  rarity: number;
  pal: Palette;
  overlay?: Overlay;
  step: number;
  pauseP: number;
  pauseLen: [number, number];
  heartP: number;
  flipP: number;
  driftP: number;
  spr?: Record<string, [HTMLCanvasElement, HTMLCanvasElement]>;
  shadow?: HTMLCanvasElement;
};

export type Wall = {
  id: string;
  name: string;
  wall: string;
  line: string;
  base: string;
};

export type Sushi = {
  sp: Species;
  x: number;
  y: number;
  dir: number;
  frame: number;
  timer: number;
  pause: number;
};

export type Heart = {
  x: number;
  y: number;
  life: number;
};

export type SaveState = {
  seen: Set<string>;
  friends: Set<string>;
  greet: Record<string, number>;
  lastVisit: number;
  wall: string;
};
```

- [ ] **Step 2: dev 確認**（型ファイル追加のみ。`vp dev` が起動すればOK）

- [ ] **Step 3: Commit** — `git add src/types.ts && git commit -m "refactor: add types.ts"`

### Task 6: sprites.ts

**Files:** Create `src/sprites.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/sprites.ts` を作る**

`NIGIRI` / `GUNKAN` / `RICE` / `EBI_TAIL` の**中身（16行グリッド等）は原本からそのまま移す**。原本の対応箇所: `NIGIRI` = line 125-137、`GUNKAN` = line 138-149、`RICE` = line 150、`EBI_TAIL` = line 153-164。`bake` = line 218-230、`silhouette` = line 231-240、for ループ = line 241-252（→ `bakeAllSprites` 関数化）。型注釈と export を付ける:

```ts
import type { Grid, Shape, Overlay, Palette, Species } from './types';

export const NIGIRI: Shape = {
  // 原本 line 126-135 の stretch / scrunch 16行 + band をそのまま
  stretch: [ /* ...原本のまま... */ ],
  scrunch: [ /* ...原本のまま... */ ],
  band: { stretch: [7, 8], scrunch: [8, 9] },
};

export const GUNKAN: Shape = {
  stretch: [ /* 原本 line 139-143 のまま */ ],
  scrunch: [ /* 原本 line 144-148 のまま */ ],
};

export const RICE: Palette = { R: '#FFFDF6', D: '#EFDFC8', d: '#E0CFB2' };

export const EBI_TAIL: Overlay = {
  stretch: [ /* 原本 line 154-158 のまま */ ],
  scrunch: [ /* 原本 line 159-163 のまま */ ],
};

export function bake(
  grid: Grid,
  flip: boolean,
  pal: Palette,
  bandCols: number[] | null,
  overlay: Grid | null,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d')!;
  const put = (row: string, y: number) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = bandCols && bandCols.includes(x) ? pal.band : pal[ch];
      g.fillRect(flip ? 15 - x : x, y, 1, 1);
    });
  grid.forEach(put);
  if (overlay) overlay.forEach(put);
  return c;
}

export function silhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#E5BFCA';
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
      '1': [bake(sp.shape.stretch, false, pal, bS, oS), bake(sp.shape.scrunch, false, pal, bC, oC)],
      '-1': [bake(sp.shape.stretch, true, pal, bS, oS), bake(sp.shape.scrunch, true, pal, bC, oC)],
    };
    sp.shadow = silhouette(sp.spr['1'][0]);
  }
}
```
（注: `NIGIRI`/`GUNKAN`/`RICE`/`EBI_TAIL` の宣言順は原本と同じで良い。`bake` は元 `SPECIES` の後にあったが、モジュールでは順不同で可）

- [ ] **Step 2: main.ts を修正**

main.ts から `NIGIRI` `GUNKAN` `RICE` `EBI_TAIL` の定義（原本 line 125-164）、`bake`/`silhouette`（line 218-240）、for ループ（line 241-252）を削除。for ループの代わりに、`SPECIES` 定義の**後**に `bakeAllSprites(SPECIES);` を1行置く（元 for ループと同じ位置）。冒頭に import 追加:
```ts
import { NIGIRI, GUNKAN, EBI_TAIL, bakeAllSprites } from './sprites';
```
（`RICE`/`bake`/`silhouette` は sprites 内部でのみ使うので main では import しない）

- [ ] **Step 3: dev 確認** — スプライトが従来通り描画される（レア発見の演出含む）ことを目視。

- [ ] **Step 4: Commit** — `git add src/sprites.ts src/main.ts && git commit -m "refactor: extract sprites.ts"`

### Task 7: species.ts

**Files:** Create `src/species.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/species.ts` を作る**

`SPECIES` 配列の中身は**原本 line 171-209 をそのまま**移す（12種のデータ）。`shape: NIGIRI` / `shape: GUNKAN` / `overlay: EBI_TAIL` は sprites から import した参照を使う:
```ts
import type { Species } from './types';
import { NIGIRI, GUNKAN, EBI_TAIL } from './sprites';

export const SPECIES: Species[] = [
  // 原本 line 172-208 の12要素をそのまま（NIGIRI/GUNKAN/EBI_TAIL は上の import を参照）
];

export const RARITY_WEIGHT: Record<number, number> = { 1: 6, 2: 3, 3: 1 };

export const GREET_NEED: Record<string, number> = {
  'あまえんぼ': 2,
  'のんびりや': 3,
  'こうきしんおうせい': 3,
  'せっかち': 4,
  'ねぼすけ': 4,
  'はずかしがりや': 6,
};
```
（`EBI_TAIL` は ebi 要素の `overlay:EBI_TAIL` で参照。`_` の付いていない `overlay:EBI_TAIL` を原本のまま）

- [ ] **Step 2: main.ts を修正**

main.ts から `SPECIES`（line 171-209）、`RARITY_WEIGHT`（line 211）、`GREET_NEED`（line 212-215）の定義を削除。冒頭 import に追加:
```ts
import { SPECIES, RARITY_WEIGHT, GREET_NEED } from './species';
```
（Task 6 で置いた `bakeAllSprites(SPECIES);` はそのまま。`SPECIES` は import 参照になる）

- [ ] **Step 3: dev 確認** — 種別・レアリティ・なつき閾値が従来通り。

- [ ] **Step 4: Commit** — `git add src/species.ts src/main.ts && git commit -m "refactor: extract species.ts"`

### Task 8: walls.ts

**Files:** Create `src/walls.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/walls.ts` を作る**

`WALLS` は原本 line 276-283 をそのまま。`currentWall` は wallId を引数で受ける純粋関数に変える（原本 line 284 は `state.wall` を直接参照していたのを引数化）:
```ts
import type { Wall } from './types';

export const WALLS: Wall[] = [
  // 原本 line 277-282 の6要素をそのまま
];

export function currentWall(wallId: string): Wall {
  return WALLS.find((w) => w.id === wallId) || WALLS[0];
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `WALLS`（line 276-283）と `currentWall`（line 284）を削除。冒頭 import 追加:
```ts
import { WALLS, currentWall } from './walls';
```
main.ts 内で `currentWall()` を呼んでいる箇所（`draw` 内 原本 line 378 `const cw = currentWall();`）を `const cw = currentWall(state.wall);` に変更する。

- [ ] **Step 3: dev 確認** — かべ6色の表示・切替・保存が従来通り。

- [ ] **Step 4: Commit** — `git add src/walls.ts src/main.ts && git commit -m "refactor: extract walls.ts (currentWall takes wallId)"`

### Task 9: store.ts

**Files:** Create `src/store.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/store.ts` を作る**（原本 line 257-275 をそのまま + 型付け）

```ts
import type { SaveState } from './types';

export const store = {
  load(): SaveState {
    try {
      const v2 = JSON.parse(localStorage.getItem('osushi-zukan-v2') as string);
      if (v2)
        return {
          seen: new Set<string>(v2.seen || []),
          friends: new Set<string>(v2.friends || []),
          greet: v2.greet || {},
          lastVisit: v2.lastVisit || 0,
          wall: v2.wall || 'sakura',
        };
      const v1 = JSON.parse(localStorage.getItem('osushi-zukan') || '[]');
      return { seen: new Set<string>(v1), friends: new Set<string>(v1), greet: {}, lastVisit: 0, wall: 'sakura' };
    } catch (e) {
      return { seen: new Set<string>(), friends: new Set<string>(), greet: {}, lastVisit: 0, wall: 'sakura' };
    }
  },
  save(st: SaveState): void {
    try {
      localStorage.setItem(
        'osushi-zukan-v2',
        JSON.stringify({
          seen: [...st.seen],
          friends: [...st.friends],
          greet: st.greet,
          lastVisit: st.lastVisit,
          wall: st.wall,
        }),
      );
    } catch (e) {}
  },
};

export const state: SaveState = store.load();
```

- [ ] **Step 2: main.ts を修正**

main.ts から `store`（line 257-274）と `const state = store.load();`（line 275）を削除。冒頭 import 追加:
```ts
import { store, state } from './store';
```

- [ ] **Step 3: dev 確認** — セーブ/ロード（発見・なかよし・かべ）が従来通り。DevTools で localStorage を確認。

- [ ] **Step 4: Commit** — `git add src/store.ts src/main.ts && git commit -m "refactor: extract store.ts + state singleton"`

### Task 10: banner.ts

**Files:** Create `src/banner.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/banner.ts` を作る**（原本 line 399-406。`banner` 取得を null ガード）

```ts
const banner = document.getElementById('banner');
let bannerTimer: ReturnType<typeof setTimeout> | null = null;

export function showBanner(text: string): void {
  if (!banner) return;
  banner.textContent = text;
  banner.classList.add('show');
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove('show'), 1800);
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `const banner = document.getElementById('banner');`（line 399）、`let bannerTimer = null;`（line 400）、`function showBanner`（line 401-406）を削除。冒頭 import 追加:
```ts
import { showBanner } from './banner';
```

- [ ] **Step 3: dev 確認** — 「みかけた！」「なかよしになった！」「レアはっけん！」等のバナーが従来通り出る。

- [ ] **Step 4: Commit** — `git add src/banner.ts src/main.ts && git commit -m "refactor: extract banner.ts"`

### Task 11: zukan.ts（world より先に抽出＝world が import するため）

**Files:** Create `src/zukan.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/zukan.ts` を作る**

`updateZukanCount`（原本 line 454-458）、`zukanPageCount`（line 461）、`renderZukan`（line 462-485）を移す。配線（原本 line 486-490）は `initZukan()` に隔離。`cards` 要素は `renderZukan` 内でローカル取得（import時 null 参照を避ける）。`updateZukanCount` は null ガード。`renderZukan` 内の `sp.spr` / `sp.shadow` は optional なので `!` を付ける。

```ts
import { ZUKAN_PAGE_SIZE } from './constants';
import { SPECIES } from './species';
import { state } from './store';

let zukanPage = 0;

export function updateZukanCount(): void {
  const zcnt = document.getElementById('zcnt');
  const zcnt2 = document.getElementById('zcnt2');
  if (zcnt) zcnt.textContent = `${state.friends.size}/${SPECIES.length}`;
  if (zcnt2)
    zcnt2.textContent = `みかけた ${state.seen.size}/${SPECIES.length} ・ なかよし ${state.friends.size}/${SPECIES.length}`;
}

function zukanPageCount(): number {
  return Math.ceil(SPECIES.length / ZUKAN_PAGE_SIZE);
}

export function renderZukan(): void {
  const cards = document.getElementById('cards')!;
  cards.replaceChildren();
  for (const sp of SPECIES.slice(zukanPage * ZUKAN_PAGE_SIZE, (zukanPage + 1) * ZUKAN_PAGE_SIZE)) {
    const friend = state.friends.has(sp.id);
    const seen = state.seen.has(sp.id);
    const card = document.createElement('div');
    card.className = 'card' + (friend ? '' : seen ? ' seen' : ' unknown');
    const img = document.createElement('img');
    img.src = (seen ? sp.spr!['1'][0] : sp.shadow!).toDataURL();
    const rar = document.createElement('div');
    rar.className = 'rar';
    rar.textContent = '★'.repeat(sp.rarity);
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = friend ? sp.name : '？？？';
    const sk = document.createElement('div');
    sk.className = 'sk';
    sk.textContent = friend
      ? 'せいかく: ' + sp.seikaku
      : seen
        ? 'あいさつして なかよくなろう'
        : '…だれだろう';
    card.append(img, rar, nm, sk);
    cards.append(card);
  }
  document.getElementById('zPageNum')!.textContent = zukanPage + 1 + ' / ' + zukanPageCount();
  (document.getElementById('zPrev') as HTMLButtonElement).disabled = zukanPage === 0;
  (document.getElementById('zNext') as HTMLButtonElement).disabled = zukanPage >= zukanPageCount() - 1;
}

export function initZukan(): void {
  const zukan = document.getElementById('zukan')!;
  document.getElementById('openZukan')!.onclick = () => {
    zukanPage = 0;
    renderZukan();
    zukan.classList.add('open');
  };
  document.getElementById('closeZukan')!.onclick = () => zukan.classList.remove('open');
  document.getElementById('zPrev')!.onclick = () => {
    if (zukanPage > 0) {
      zukanPage--;
      renderZukan();
    }
  };
  document.getElementById('zNext')!.onclick = () => {
    if (zukanPage < zukanPageCount() - 1) {
      zukanPage++;
      renderZukan();
    }
  };
  zukan.addEventListener('pointerdown', (e) => {
    if (e.target === zukan) zukan.classList.remove('open');
  });
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `const zukan = ...`（line 452）、`const cards = ...`（line 453）、`updateZukanCount`（line 454-458）、`let zukanPage = 0;`（line 460）、`zukanPageCount`（line 461）、`renderZukan`（line 462-485）、および zukan 配線（line 486-490）を削除。冒頭 import と、起動配線に `initZukan()` 呼び出しを追加:
```ts
import { updateZukanCount, renderZukan, initZukan } from './zukan';
```
main.ts の初期化コード内（元 line 510 の `updateZukanCount();` があった付近）に `initZukan();` を1行追加する（`updateZukanCount();` の呼び出しは残す）。

- [ ] **Step 3: dev 確認** — ずかんの開閉・ページ送り・3状態・★・2進捗ヘッダが従来通り。

- [ ] **Step 4: Commit** — `git add src/zukan.ts src/main.ts && git commit -m "refactor: extract zukan.ts (wiring in initZukan)"`

### Task 12: world.ts

**Files:** Create `src/world.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/world.ts` を作る**

`sushis`/`hearts`（原本 line 293）、`pickSpecies`（line 295-300, **rng 注入可能に**）、`spawn`（line 301-313, count 更新を null ガード）、`markSeen`（line 315-326）、`visit`（line 327-333）、`leave`（line 334-339, count 更新 null ガード）、`tick`（line 341-364）を移す。

```ts
import type { Sushi, Heart, Species } from './types';
import { W, H, GROUND_TOP, MAX_SUSHI } from './constants';
import { SPECIES, RARITY_WEIGHT } from './species';
import { state, store } from './store';
import { showBanner } from './banner';
import { updateZukanCount } from './zukan';

export const sushis: Sushi[] = [];
export const hearts: Heart[] = [];

export function pickSpecies(rng: () => number = Math.random): Species {
  const total = SPECIES.reduce((a, s) => a + RARITY_WEIGHT[s.rarity], 0);
  let r = rng() * total;
  for (const s of SPECIES) {
    r -= RARITY_WEIGHT[s.rarity];
    if (r < 0) return s;
  }
  return SPECIES[SPECIES.length - 1];
}

export function spawn(x?: number, y?: number, sp?: Species): void {
  const species = sp || pickSpecies();
  sushis.push({
    sp: species,
    x: Math.max(2, Math.min(W - 18, x ?? Math.random() * (W - 20))),
    y: Math.max(GROUND_TOP, Math.min(H - 18, y ?? GROUND_TOP + Math.random() * (H - GROUND_TOP - 18))),
    dir: Math.random() < 0.5 ? 1 : -1,
    frame: Math.random() < 0.5 ? 0 : 1,
    timer: Math.random() * species.step,
    pause: 0,
  });
  const count = document.getElementById('count');
  if (count) count.textContent = String(sushis.length);
}

export function markSeen(sp: Species): void {
  if (state.seen.has(sp.id)) return;
  state.seen.add(sp.id);
  store.save(state);
  if (sp.rarity === 3) {
    showBanner('✨レアはっけん！！ ' + sp.name + '✨');
    for (let i = 0; i < 10; i++)
      hearts.push({ x: 30 + Math.random() * 100, y: GROUND_TOP + Math.random() * 80, life: 1 });
  } else {
    showBanner('みかけた！ ' + sp.name);
  }
  updateZukanCount();
}

export function visit(): boolean {
  if (sushis.length >= MAX_SUSHI) return false;
  const sp = pickSpecies();
  spawn(undefined, undefined, sp);
  markSeen(sp);
  return true;
}

export function leave(): void {
  if (sushis.length <= 3) return;
  const i = Math.floor(Math.random() * sushis.length);
  sushis.splice(i, 1);
  const count = document.getElementById('count');
  if (count) count.textContent = String(sushis.length);
}

export function tick(dt: number): void {
  // 原本 line 342-364 の中身をそのまま（for/for、s.sp を p として使う等）
}
```
（`tick` 本体は原本 line 342-364 をそのまま貼る。参照する `W`/`H`/`GROUND_TOP`/`hearts` は上で import/宣言済み）

- [ ] **Step 2: main.ts を修正**

main.ts から `const sushis = [], hearts = [];`（line 293）、`pickSpecies`（295-300）、`spawn`（301-313）、`markSeen`（315-326）、`visit`（327-333）、`leave`（334-339）、`tick`（341-364）を削除。冒頭 import 追加:
```ts
import { sushis, hearts, pickSpecies, spawn, markSeen, visit, leave, tick } from './world';
```
（main.ts に残る `cv`/`ctx`/`draw`/`loop`/greet/bell/schedule 系はまだ触らない。それらから `sushis`/`hearts`/`visit` 等は import 参照になる）

- [ ] **Step 3: dev 確認** — 歩行・ハート・来店/退店・満員14・タップで増えないこと等、ワールド挙動が従来通り。

- [ ] **Step 4: Commit** — `git add src/world.ts src/main.ts && git commit -m "refactor: extract world.ts (pickSpecies rng-injectable)"`

### Task 13: canvas.ts

**Files:** Create `src/canvas.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/canvas.ts` を作る**（原本 line 288-291。imageSmoothing を null ガード）

```ts
import { W, H } from './constants';

export const cv = document.getElementById('cv') as HTMLCanvasElement;
export const ctx = cv?.getContext('2d') as CanvasRenderingContext2D;
if (cv) {
  cv.width = W;
  cv.height = H;
}
if (ctx) ctx.imageSmoothingEnabled = false;
```

- [ ] **Step 2: main.ts を修正**

main.ts から `const cv = document.getElementById('cv');`（line 288）、`cv.width = W; cv.height = H;`（line 289）、`const ctx = cv.getContext('2d');`（line 290）、`ctx.imageSmoothingEnabled = false;`（line 291）を削除。冒頭 import 追加:
```ts
import { cv, ctx } from './canvas';
```

- [ ] **Step 3: dev 確認** — canvas 表示・ピクセル等倍描画が従来通り。

- [ ] **Step 4: Commit** — `git add src/canvas.ts src/main.ts && git commit -m "refactor: extract canvas.ts"`

### Task 14: render.ts

**Files:** Create `src/render.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/render.ts` を作る**（`drawHeart` 原本 line 366-372、`draw` line 373-388。`draw` 内 `currentWall()`→`currentWall(state.wall)`、`s.sp.spr`→`s.sp.spr!`）

```ts
import { W, H, GROUND_TOP } from './constants';
import { ctx } from './canvas';
import { sushis, hearts } from './world';
import { currentWall } from './walls';
import { state } from './store';

export function drawHeart(x: number, y: number, a: number): void {
  // 原本 line 367-372 の中身をそのまま（ctx は import 済み）
}

export function draw(): void {
  // 原本 line 374-388 の中身をそのまま。ただし:
  //   const cw = currentWall();      → const cw = currentWall(state.wall);
  //   s.sp.spr[String(s.dir)][...]   → s.sp.spr![String(s.dir)][...]
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `drawHeart`（line 366-372）と `draw`（line 373-388）を削除。冒頭 import 追加:
```ts
import { draw } from './render';
```
（`drawHeart` は render 内部で `draw` から呼ぶだけなので main では import 不要）。main.ts の `loop`（line 391-396）は `draw()` を import 参照で呼ぶ。

- [ ] **Step 3: dev 確認** — 壁/床/お寿司/ハート描画・奥行きソートが従来通り。

- [ ] **Step 4: Commit** — `git add src/render.ts src/main.ts && git commit -m "refactor: extract render.ts"`

### Task 15: wallModal.ts

**Files:** Create `src/wallModal.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/wallModal.ts` を作る**（`renderWalls` 原本 line 492-506、配線 line 491+507-509 を `initWallModal` へ）

```ts
import { WALLS } from './walls';
import { state, store } from './store';

export function renderWalls(): void {
  const el = document.getElementById('swatches')!;
  el.replaceChildren();
  for (const w of WALLS) {
    const s = document.createElement('div');
    s.className = 'swatch' + (w.id === state.wall ? ' on' : '');
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.style.background = w.wall;
    chip.style.borderBottom = '4px solid ' + w.base;
    const nm = document.createElement('div');
    nm.className = 'nm';
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
  const wallModal = document.getElementById('wallModal')!;
  document.getElementById('openWall')!.onclick = () => {
    renderWalls();
    wallModal.classList.add('open');
  };
  document.getElementById('closeWall')!.onclick = () => wallModal.classList.remove('open');
  wallModal.addEventListener('pointerdown', (e) => {
    if (e.target === wallModal) wallModal.classList.remove('open');
  });
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `const wallModal = ...`（line 491）、`renderWalls`（line 492-506）、配線（line 507-509）を削除。冒頭 import と起動配線に追加:
```ts
import { initWallModal } from './wallModal';
```
main.ts の初期化配線に `initWallModal();` を追加（`initZukan();` の近く）。

- [ ] **Step 3: dev 確認** — かべモーダルの開閉・スウォッチ選択・on 表示・保存が従来通り。

- [ ] **Step 4: Commit** — `git add src/wallModal.ts src/main.ts && git commit -m "refactor: extract wallModal.ts (wiring in initWallModal)"`

### Task 16: bell.ts

**Files:** Create `src/bell.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/bell.ts` を作る**（原本 line 435-449。配線+setInterval を `initBell` へ。`bellLeft` は関数内クロージャ）

```ts
import { BELL_CD } from './constants';
import { visit } from './world';

export function initBell(): void {
  const bell = document.getElementById('bell') as HTMLButtonElement;
  let bellLeft = 0;
  bell.addEventListener('click', () => {
    if (bellLeft > 0) return;
    bellLeft = BELL_CD;
    bell.disabled = true;
    setTimeout(() => {
      visit();
    }, 1500 + Math.random() * 2500);
  });
  setInterval(() => {
    if (bellLeft <= 0) return;
    bellLeft--;
    if (bellLeft > 0) {
      bell.textContent = `🔔 (${bellLeft})`;
    } else {
      bell.textContent = '🔔 よぶ';
      bell.disabled = false;
    }
  }, 1000);
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `const bell = ...`（line 435）、`const BELL_CD = 90;`（既に Task 4 で constants へ移動済みなら該当なし）、`let bellLeft = 0;`（line 437）、click 配線（line 438-443）、setInterval（line 444-449）を削除。冒頭 import と起動配線に追加:
```ts
import { initBell } from './bell';
```
main.ts の起動配線に `initBell();` を追加。

- [ ] **Step 3: dev 確認** — 🔔よぶ → disabled + `🔔 (n)` カウントダウン → 数秒後に1匹来店、CD 明けで復帰、が従来通り。

- [ ] **Step 4: Commit** — `git add src/bell.ts src/main.ts && git commit -m "refactor: extract bell.ts (wiring in initBell)"`

### Task 17: input.ts

**Files:** Create `src/input.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/input.ts` を作る**（`greet` 原本 line 407-423、canvas pointerdown 配線 line 425-432 を `initInput` へ）

```ts
import type { Sushi } from './types';
import { W, H } from './constants';
import { cv } from './canvas';
import { sushis, hearts } from './world';
import { state, store } from './store';
import { GREET_NEED } from './species';
import { showBanner } from './banner';
import { updateZukanCount } from './zukan';

export function greet(s: Sushi): void {
  const sp = s.sp;
  hearts.push({ x: s.x + 8, y: s.y - 2, life: 1 });
  if (state.friends.has(sp.id)) return;
  state.greet[sp.id] = (state.greet[sp.id] || 0) + 1;
  if (sp.seikaku === 'はずかしがりや') {
    s.dir *= -1;
    s.pause = 0;
    s.x = Math.max(2, Math.min(W - 18, s.x + 6 * s.dir));
  }
  if (state.greet[sp.id] >= GREET_NEED[sp.seikaku]) {
    state.friends.add(sp.id);
    showBanner('なかよしになった！ ' + sp.name);
    for (let i = 0; i < 6; i++)
      hearts.push({ x: s.x + 4 + Math.random() * 8, y: s.y - 2 - Math.random() * 4, life: 1 });
    updateZukanCount();
  }
  store.save(state);
}

export function initInput(): void {
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W,
      py = ((e.clientY - r.top) / r.height) * H;
    const sorted = [...sushis].sort((a, b) => b.y - a.y);
    for (const s of sorted) {
      if (px >= s.x && px < s.x + 16 && py >= s.y && py < s.y + 16) {
        greet(s);
        return;
      }
    }
  });
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `greet`（line 407-423）と `cv.addEventListener('pointerdown', ...)`（line 425-432）を削除。冒頭 import と起動配線に追加:
```ts
import { initInput } from './input';
```
main.ts の起動配線に `initInput();` を追加。

- [ ] **Step 3: dev 確認** — お寿司タップであいさつ→ハート、あまえんぼ2回/はずかしがりや6回でなかよし、はずかしがりやの逃げ、手前優先の当たり判定が従来通り。

- [ ] **Step 4: Commit** — `git add src/input.ts src/main.ts && git commit -m "refactor: extract input.ts (greet + initInput)"`

### Task 18: schedule.ts

**Files:** Create `src/schedule.ts` / Modify `src/main.ts`

- [ ] **Step 1: `src/schedule.ts` を作る**（`scheduleVisit`/`scheduleLeave` 原本 line 513-518、`welcomeBack` line 523-532、lastVisit 定期保存 line 534 + visibilitychange line 535-537 を `startLastVisitSave` へ）

```ts
import { AWAY_MS } from './constants';
import { visit, leave, sushis } from './world';
import { state, store } from './store';
import { showBanner } from './banner';

export function scheduleVisit(): void {
  setTimeout(
    () => {
      visit();
      scheduleVisit();
    },
    60000 + Math.random() * 60000,
  );
}

export function scheduleLeave(): void {
  setTimeout(
    () => {
      leave();
      scheduleLeave();
    },
    120000 + Math.random() * 120000,
  );
}

export function welcomeBack(): void {
  let arrivals = 0;
  if (state.lastVisit > 0) {
    arrivals = Math.min(5, Math.floor((Date.now() - state.lastVisit) / AWAY_MS));
  }
  for (let i = 0; i < arrivals; i++) visit();
  if (arrivals > 0) setTimeout(() => showBanner('るすのあいだに 来てたみたい'), 600);
  while (sushis.length < 3) visit();
}

export function startLastVisitSave(): void {
  setInterval(() => {
    state.lastVisit = Date.now();
    store.save(state);
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.lastVisit = Date.now();
      store.save(state);
    }
  });
}
```

- [ ] **Step 2: main.ts を修正**

main.ts から `scheduleVisit`（line 513-515）、`scheduleLeave`（line 516-518）、`scheduleVisit(); scheduleLeave();`（519-520）、`welcomeBack` IIFE（522-532）、lastVisit の `setInterval`（534）、`visibilitychange`（535-537）を削除。冒頭 import 追加:
```ts
import { scheduleVisit, scheduleLeave, welcomeBack, startLastVisitSave } from './schedule';
```
（起動での呼び出しは Task 19 で main を整える）

- [ ] **Step 3: dev 確認** — 起動時に最低3匹保証、留守中来店バナー、定期保存が従来通り（localStorage の lastVisit 更新を DevTools で確認）。

- [ ] **Step 4: Commit** — `git add src/schedule.ts src/main.ts && git commit -m "refactor: extract schedule.ts"`

### Task 19: main.ts を最終形に整え、`// @ts-nocheck` を外して `vp check` を green にする

**Files:** Modify `src/main.ts`

- [ ] **Step 1: main.ts を最終形に書き換える**

これまでの抽出で main.ts に残っているのは import 群 / `bakeAllSprites(SPECIES);` / rAF ループ / 各 init 呼び出し / `updateZukanCount();` / schedule 起動のはず。以下の最終形に整える（先頭の `// @ts-nocheck` は削除）:

```ts
import './style.css';
import { SPECIES } from './species';
import { bakeAllSprites } from './sprites';
import { draw } from './render';
import { tick } from './world';
import { updateZukanCount, initZukan } from './zukan';
import { initInput } from './input';
import { initBell } from './bell';
import { initWallModal } from './wallModal';
import { scheduleVisit, scheduleLeave, welcomeBack, startLastVisitSave } from './schedule';

bakeAllSprites(SPECIES);

initInput();
initBell();
initZukan();
initWallModal();

updateZukanCount();

let last = performance.now();
function loop(now: number): void {
  tick(Math.min((now || last) - last, 100));
  last = now || last;
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

scheduleVisit();
scheduleLeave();
startLastVisitSave();
welcomeBack();
```
（`canvas` は `render`/`input` が import した時点で副作用初期化されるため main で明示 import 不要。ただし念のため確実に初期化したい場合は `import './canvas';` を先頭付近に足してよい）

- [ ] **Step 2: 型チェック/Lint を通す**

Run: `vp check`（Task 1 で確定した型+lint コマンド）
Expected: エラー 0。残る型エラーがあれば、該当モジュールに最小限の型注釈/`!` を足して解消する（挙動は変えない）。

- [ ] **Step 3: dev で最終目視**

Run: `vp dev` — 全機能（歩行/来店/呼び鈴/あいさつ/ずかん/かべ/セーブ）が Task 3 時点と完全に同一であることを確認。

- [ ] **Step 4: Commit** — `git add src/main.ts && git commit -m "refactor: finalize main.ts and pass vp check (typed, no ts-nocheck)"`

---

## Stage C: テスト（Vitest・純粋関数に限定）

### Task 20: Vitest 導入 + 純粋関数テスト

**Files:**
- Modify: `package.json`（devDependencies に `vitest`, `jsdom`）
- Modify/Create: `vite.config.ts`（`test` ブロック）
- Create: `src/pickSpecies.test.ts`, `src/greet.test.ts`, `src/store.test.ts`, `src/walls.test.ts`

- [ ] **Step 1: 依存を追加して導入**

`package.json` の `devDependencies` に以下を追記（版は最新安定でよい。`vp install` が解決する）:
```json
"vitest": "^2.0.0",
"jsdom": "^25.0.0"
```
Run: `vp install`
（Task 1 で `vp add` が存在すると確定した場合は `vp add -D vitest jsdom` でも可）

- [ ] **Step 2: `vite.config.ts` に test ブロックを追加**

既存の `vite.config.ts` を以下に更新（雛形が空に近ければ全置換）:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
```

- [ ] **Step 3: `src/walls.test.ts`（純粋・依存最小）を書く**

```ts
import { describe, it, expect } from 'vitest';
import { currentWall, WALLS } from './walls';

describe('currentWall', () => {
  it('returns the matching wall by id', () => {
    expect(currentWall('yozora').id).toBe('yozora');
  });
  it('falls back to the first wall for an unknown id', () => {
    expect(currentWall('does-not-exist')).toBe(WALLS[0]);
  });
  it('the default first wall is sakura', () => {
    expect(WALLS[0].id).toBe('sakura');
  });
});
```

- [ ] **Step 4: `src/store.test.ts`（v1→v2 移行）を書く**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './store';

describe('store load & migration', () => {
  beforeEach(() => localStorage.clear());

  it('migrates v1 (osushi-zukan id array) into seen AND friends, and keeps the old key', () => {
    localStorage.setItem('osushi-zukan', JSON.stringify(['salmon', 'ikura']));
    const st = store.load();
    expect([...st.friends].sort()).toEqual(['ikura', 'salmon']);
    expect(st.seen.has('salmon') && st.seen.has('ikura')).toBe(true);
    expect(localStorage.getItem('osushi-zukan')).not.toBeNull();
    expect(st.wall).toBe('sakura');
  });

  it('loads v2 directly and it wins over v1', () => {
    localStorage.setItem('osushi-zukan', JSON.stringify(['salmon']));
    localStorage.setItem(
      'osushi-zukan-v2',
      JSON.stringify({ seen: ['toro'], friends: ['toro'], greet: { toro: 2 }, lastVisit: 123, wall: 'yozora' }),
    );
    const st = store.load();
    expect([...st.seen]).toEqual(['toro']);
    expect(st.lastVisit).toBe(123);
    expect(st.wall).toBe('yozora');
  });

  it('empty storage yields the sakura default', () => {
    const st = store.load();
    expect(st.wall).toBe('sakura');
    expect(st.seen.size).toBe(0);
  });
});
```

- [ ] **Step 5: `src/pickSpecies.test.ts`（重み付き抽選・rng 注入）を書く**

```ts
import { describe, it, expect } from 'vitest';
import { pickSpecies } from './world';
import { SPECIES } from './species';

describe('pickSpecies', () => {
  it('returns the first species when rng() is 0', () => {
    expect(pickSpecies(() => 0)).toBe(SPECIES[0]);
  });

  it('returns the last species when rng() is ~1', () => {
    expect(pickSpecies(() => 0.999999)).toBe(SPECIES[SPECIES.length - 1]);
  });

  it('can return every species across a deterministic sweep', () => {
    const seen = new Set<string>();
    let seed = 0;
    for (let i = 0; i < 100000; i++) {
      seed = (seed + 0.6180339887) % 1; // 低ディスクレパンシーで [0,1) を走査
      seen.add(pickSpecies(() => seed).id);
    }
    expect(seen.size).toBe(SPECIES.length);
  });

  it('favors common (rarity 1) over rare (rarity 3)', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const s = pickSpecies();
      counts[String(s.rarity)] = (counts[String(s.rarity)] || 0) + 1;
    }
    expect(counts['1']).toBeGreaterThan(counts['3']);
  });
});
```

- [ ] **Step 6: `src/greet.test.ts`（なつき閾値）を書く**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { greet } from './input';
import { SPECIES } from './species';
import { state } from './store';
import type { Sushi } from './types';

function makeSushi(id: string): Sushi {
  const sp = SPECIES.find((s) => s.id === id)!;
  return { sp, x: 50, y: 50, dir: 1, frame: 0, timer: 0, pause: 0 };
}

describe('greet threshold', () => {
  beforeEach(() => {
    state.friends.clear();
    state.greet = {};
  });

  it('tamago (あまえんぼ) becomes a friend after 2 greets', () => {
    const s = makeSushi('tamago');
    greet(s);
    expect(state.friends.has('tamago')).toBe(false);
    greet(s);
    expect(state.friends.has('tamago')).toBe(true);
  });

  it('ebi (はずかしがりや) needs 6 greets and flees (moves) when greeted', () => {
    const s = makeSushi('ebi');
    const x0 = s.x;
    for (let i = 0; i < 5; i++) greet(s);
    expect(state.friends.has('ebi')).toBe(false);
    expect(s.x).not.toBe(x0); // 逃げて位置が動く
    greet(s);
    expect(state.friends.has('ebi')).toBe(true);
  });
});
```
（`greet` は `showBanner`/`updateZukanCount` を呼ぶが、jsdom に該当要素が無くても null ガードで落ちない。`import './input'` は `canvas.ts` を辿るが、`#cv` 不在でも `cv?.getContext` で落ちない）

- [ ] **Step 7: テストを走らせて green を確認**

Run: `vp test run`（Task 1 で確定したテストコマンド）
Expected: 4 ファイル・全ケース PASS。

- [ ] **Step 8: Commit**

```bash
git add package.json vite.config.ts src/*.test.ts && \
git commit -m "test: add Vitest unit tests (pickSpecies/greet/store migration/currentWall)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Stage D: 挙動パリティ（ヘッドレススモーク）

### Task 21: build→preview に対して既存スモークを流し、現行と同一を実測

既存スモーク（`/Users/f/.workspace/osushi-smoke/check.js` / `check2.js`）は `URL = 'file:///Users/f/osushi-hakoniwa/index.html'` を対象にしている。移行版は `file://` で直接開けない（module + ビルド前提）ため、**preview サーバの URL に向けて**実行する。

**Files:** 一時的なコピー（`~/.workspace/osushi-smoke/` 配下。リポジトリには含めない）。`check.js`/`check2.js` 原本は変更しない。

- [ ] **Step 1: 本番相当のビルドを作り preview で配信**

Run: `cd /Users/f/osushi-hakoniwa && vp build`
Expected: `dist/` が生成される（出力先は Task 1 で確定した値。異なる場合は読み替え）。
Run（別ターミナル / バックグラウンド）: `cd /Users/f/osushi-hakoniwa && vp preview`
表示される URL（例 `http://localhost:4173/`）を控える。

- [ ] **Step 2: スモークを preview URL 向けに複製して実行**

原本を汚さないよう、`~/.workspace/osushi-smoke/` にコピーを作り URL 定数だけ差し替える:
```bash
cd /Users/f/.workspace/osushi-smoke && \
sed "s#file:///Users/f/osushi-hakoniwa/index.html#http://localhost:4173/#" check.js > check.preview.js && \
sed "s#file:///Users/f/osushi-hakoniwa/index.html#http://localhost:4173/#" check2.js > check2.preview.js
```
（ポートが 4173 でなければ実際の preview ポートに合わせる）
Run: `node /Users/f/.workspace/osushi-smoke/check.preview.js`
Run: `node /Users/f/.workspace/osushi-smoke/check2.preview.js`

- [ ] **Step 3: 出力を現行仕様の期待値と突き合わせる**

`check.preview.js` の期待値:
- `speciesCount` = 12 / `initialSushis` = 3 / `initialSeen` >= 1
- `tapNoSpawn` = true（空きタップで増えない）
- `fillToMax` = 14 / `visitAtMax` = false / `leaveWorks` = true
- `greetTamago` = `{ after1tap:false, after2taps:true }`
- `greetEbi` = `{ notFriendAt5:true, friendAt6:true }`（`fledMoved` truthy）
- `zukan.cardCount` = 12、`stars` に `★`〜`★★★` が並ぶ、`friendCard`/`seenCardMsg`/`unknownCardMsg`/`header` が現行同等
- `bellDisabled` = true、`bellLabel` に `🔔 (…)`、`bellVisited` = true
- `persistAfterReload` = true
- `migration` = `{ friends:'ikura,salmon', seenHasBoth:true, oldKeyKept:true }`
- `awaySushis` = 5
- `consoleErrors` = `[]`（**コンソールエラー 0**）

`check2.preview.js` の期待値:
- `migration.zukanShowsSalmonAsFriend` = true ほか上記移行と同じ
- `away.sushiCount` = 5
- `fresh.sushis` = 3、`seenLTE3` = true
- `errors` = `[]`

いずれかが不一致なら **Stage B の配線ミス**を疑い、該当モジュールを原本と突き合わせて修正 →（型が絡めば `vp check`）→ 再度 `vp build`→`vp preview`→スモーク再実行。全項目一致するまで繰り返す。

- [ ] **Step 4: スマホ幅の段組を目視/スクショで確認**

preview URL を Chrome の 375px 幅で開き、`.bar` が折り返し中央寄せ・図鑑2列が崩れないことを確認（既存 `~/.workspace/osushi-smoke/*.png` と見比べ）。

- [ ] **Step 5: Commit（修正があった場合のみ）**

```bash
cd /Users/f/osushi-hakoniwa && git add -A && \
git commit -m "fix: behavior parity fixes found via headless smoke on preview build

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
（修正が不要でスモーク一発 green なら、このタスクはコミットなしで可）

---

## Stage E: 自動デプロイ（Cloudflare Pages）

### Task 22: GitHub Actions で push→Cloudflare Pages 自動デプロイ + README 更新

**オーナーが一度だけ実施する前提作業（ブラウザ操作・エージェント代行不可。着手前に完了を確認する）:**
1. Cloudflare で Pages プロジェクト `osushi-hakoniwa` を作成（または `wrangler pages project create osushi-hakoniwa`）。
2. **Cloudflare API トークン**（Pages 編集権限）と **Account ID** を取得。
3. GitHub リポジトリ `fmzu/osushi-hakoniwa` の Settings → Secrets and variables → Actions に、`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録。

**Files:** Create `.github/workflows/deploy.yml` / Modify `README.md`

- [ ] **Step 1: `.github/workflows/deploy.yml` を作る**

```yaml
name: deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup vp
        uses: voidzero-dev/setup-vp@v1
      - name: Install deps
        run: vp install
      - name: Build
        run: vp build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name osushi-hakoniwa
```
（`voidzero-dev/setup-vp` の正式なアクション名/タグは着手時に GitHub で確認する。存在しない/名称が違う場合は、代替として `run: curl -fsSL https://vite.plus | bash` で vp を導入するステップに置き換える。`dist` は Task 1 で確定したビルド出力先に合わせる）

- [ ] **Step 2: README を更新**

`README.md` の「遊び方」「構成」を、ビルド前提に更新する（GH Pages は移行期間中は残す旨も明記）。追記/差し替え内容:
```markdown
## 開発

Vite+ (`vp`) + TypeScript 構成です。

```
vp install     # 依存導入
vp dev         # 開発サーバ
vp check       # 型 + Lint
vp test run    # ユニットテスト（Vitest）
vp build       # 本番ビルド（dist/）
vp preview     # ビルド成果物をローカル配信
```

`src/` にモジュール分割（constants/types/sprites/species/walls/store/banner/zukan/world/canvas/render/wallModal/bell/input/schedule/main）。挙動は素HTML版と同一。

## デプロイ

`main` への push で GitHub Actions が `vp build` → Cloudflare Pages へ自動デプロイします（`.github/workflows/deploy.yml`）。移行期間中は GitHub Pages 版も併存します。
```
（原本 README の「`index.html` をブラウザで開くだけ」という記述は、ビルド前提の説明に置き換える。`iso.html`・スプライト設計の記述は残す）

- [ ] **Step 3: Commit**

```bash
cd /Users/f/osushi-hakoniwa && git add .github/workflows/deploy.yml README.md && \
git commit -m "ci: auto-deploy to Cloudflare Pages on push to main + update README

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: push してデプロイ発火→本番確認**

主導者が push 可否を確認のうえ:
Run: `cd /Users/f/osushi-hakoniwa && git push origin main`
GitHub Actions の `deploy` ワークフローが成功（緑）することを確認。Cloudflare Pages の本番 URL を開き、preview と同じ挙動（歩行/来店/呼び鈴/あいさつ/ずかん/かべ/セーブ）・コンソールエラー0 を目視確認する。失敗時はログ（`vp install`/`vp build`/wrangler の各段）を見て原因を切り分ける。

---

## Self-Review 用チェックリスト

- [ ] **仕様カバレッジ**: 設計書①〜⑥を各タスクに対応づけ済み — ①ツールチェーン=Task1/2, ②モジュール分割=Task4-19, ③テスト=Task20, ④Cloudflare自動デプロイ=Task22, ⑤スモークで挙動担保=Task21, ⑥段階的進行=Stage A→E。
- [ ] **挙動不変**: 各抽出タスクに `vp dev` 目視ステップがあり、Stage D で既存スモークの全期待値（species=12/初期3/満員14/なつき2・6/図鑑3状態/移行/留守5/エラー0）を実測突合する。
- [ ] **プレースホルダ無し**: 「TBD/後で/〜と同様」を使っていない。データ大配列は「原本 line X-Y をそのまま」と明示（許可された単純移動）。
- [ ] **型・シグネチャ整合**: `pickSpecies(rng=Math.random)`（Task12=Task20で一致）/ `currentWall(wallId)`（Task8=Task14=Task20で一致）/ `Species.spr?`・`shadow?` optional に対し render・zukan で `!` 使用 / `Sushi.dir:number`・`frame:number`（`*= -1` に対応）/ `bakeAllSprites(species)` は sprites→species を import しない。
- [ ] **循環依存なし**: world→zukan は一方向、sprites↮species、walls↮store を確認。
- [ ] **テスト実行導線**: `import './input'`/`import './world'` が jsdom で import 時に落ちない（canvas・banner・zukan の DOM 参照は null ガード or init 隔離）。

## 未確定 / リスク

- **Vite+ はベータ（v0.2.2, 2026-07）**: サブコマンド名・テンプレート名・ビルド出力先・依存追加方法は **Task 1 で実物確定**する。想定と食い違えば実物を正とする。詰まる場合は設計書の保険どおり素の Vite に退避可能（TS コードは流用可）。
- **`voidzero-dev/setup-vp` アクション**: 名称/タグ/存在は Task 22 着手時に確認。無ければ `curl … | bash` 導入ステップで代替。
- **Cloudflare 前提作業はオーナーのブラウザ操作**: Pages プロジェクト作成 + `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` の Secrets 登録が未完だと Task 22 Step 4 のデプロイは失敗する（ここが唯一の外部ブロッカー）。
- **jsdom の canvas 非対応**: `getContext('2d')` は null を返すため、単体テストは canvas 描画に触れない純粋関数のみを対象にする（描画は Stage D のヘッドレスで担保）。`node-canvas` は導入しない。
- **push 判断**: Stage A–D の各 commit を push するかは主導者（メイン）判断。Stage E で初めて push を前提にする。
