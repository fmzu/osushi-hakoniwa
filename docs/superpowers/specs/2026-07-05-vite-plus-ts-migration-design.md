# おすしのはこにわ Vite+ / TypeScript 移行 設計書

作成: 2026-07-05

## ゴール

現在「依存ゼロ・素のHTML 1枚」で書かれている osushi-hakoniwa を、**Vite+（`vp` コマンド）+ TypeScript** のプロジェクトに作り替える。ゲームの見た目・振る舞いは一切変えない**純粋移植**。

## 動機

- オーナーが TypeScript を学習中で、**好きな作品を題材に TS を実戦で書く**のが主目的
- 「Vite+ でビルド〜テスト → Cloudflare で公開」という、外部から勧められた構成を実際に体験する
- 学習効果: 型定義・モジュール分割（import/export）・ビルド工程・Vitest・CI自動デプロイ を一通り触る

## 非ゴール（やらないこと）

- **ゲーム内容の変更・新機能・リデザインはしない**（純粋移植。図鑑・壁着せ替え・来店制・セーブ移行など、現状の挙動を完全維持）
- 「1関数1ファイル」までの過剰分割はしない（意味のかたまり単位で分ける）
- 最初から凝ったCI最適化はしない（まず動く自動デプロイ、で十分）

## トレードオフ（承知の上で進める）

- osushi の「依存ゼロ・単一HTML・開けば動く」という身軽さは**失われる**（node_modules・ビルド工程が必要になる）。オーナー承認済み
- **Vite+ はベータ（v0.2.2・2026年7月）**。詰まりどころ・仕様変更の可能性あり。→ 保険: 生成される TS コードは素の Vite でも動くため、vp が扱いにくければ**素の Vite に退避可能**

## ① ツールチェーン（すべて vp）

| 用途 | コマンド | 備考 |
|---|---|---|
| CLI導入 | `curl -fsSL https://vite.plus \| bash` | `vp` バイナリが入る（npmではない）|
| 雛形作成 | `vp create vite -- --template vanilla-ts` | 素のTS。**着手時に `vp create --list` で名称確認** |
| 依存導入 | `vp install` | ロックファイルから自動検出、無ければpnpm |
| 開発サーバー | `vp dev` | |
| ビルド | `vp build` | 出力 `dist/`（Vite標準。要 `vp help` 確認）|
| プレビュー | `vp preview` | ビルド成果物のローカル配信 |
| テスト | `vp test run` | Vitest統合。設定は `vite.config.ts` の `test` ブロック |
| Lint+整形+型 | `vp check` | Oxlint/Oxfmt/型チェックを一括 |

**着手時に実物確認する項目（推測で進めない）**: `vanilla-ts` テンプレート名 / ビルド出力先 / `vp fmt` 単体構文。`vp create --list` と `vp help` で確定してから実装する。

出典: https://viteplus.dev/guide/ ・ https://github.com/voidzero-dev/vite-plus

## ② プロジェクト構成（純粋移植・意味のかたまりで分割）

現在の index.html（約490行、JS/CSSインライン）を以下へ分割:

```
index.html          # canvas・下部バー・図鑑/壁モーダルのマークアップのみ
src/main.ts         # エントリ: 全体の配線・ゲームループ（requestAnimationFrame）
src/types.ts        # 型定義: Species / State / Wall / Sushi / Heart など
src/species.ts      # SPECIES 12種・RARITY_WEIGHT・GREET_NEED
src/walls.ts        # WALLS プリセット6色・currentWall()
src/sprites.ts      # bake / silhouette / NIGIRI・GUNKAN グリッド・EBI_TAIL
src/store.ts        # セーブ load/save（v1→v2移行を含む）
src/world.ts        # spawn / visit / markSeen / leave / tick / pickSpecies
src/render.ts       # draw / drawHeart（壁・床・お寿司・ハート描画）
src/zukan.ts        # 図鑑モーダル（2ページ・3状態・★・2進捗）
src/wallModal.ts    # 壁着せ替えモーダル
src/style.css       # 分離したCSS
```

- モジュール間は**明示的な import/export** でつなぐ。共有状態（`state`・`sushis`・`hearts`・canvas ctx）の受け渡し方は実装計画で具体化（過度なグローバル依存を避け、必要なものを引数/初期化で渡す）
- 型は「まず素直に付ける」方針（`Species` は SPECIES 要素の形、`State` は seen/friends/greet/lastVisit/wall）

## ③ テスト（vp test で少数・純粋関数に限定）

「壊れたら困る度合い」への保険＋学習として、純粋関数に絞って数本:

- `pickSpecies` … 重み付き抽選（レア★★★が出過ぎない範囲か・全種返り得るか）
- `greet` のなつき判定 … 閾値（あまえんぼ2回で友だち・はずかしがりや6回）
- `store.load` の移行 … 旧 `osushi-zukan`（ID配列）→ v2 で seen/friends 両方に引き継ぐ・旧キーを消さない
- `currentWall` … 不正idや未設定時に先頭（デフォルト）へフォールバック

DOM/canvas に依存する描画は単体テスト対象外（下記⑤のヘッドレスで担保）。

## ④ デプロイ（Cloudflare Pages・自動デプロイ）

**push したら自動で Cloudflare Pages に公開**する構成にする。

- GitHub Actions ワークフロー（`.github/workflows/deploy.yml`）:
  1. `voidzero-dev/setup-vp` で `vp` をセットアップ
  2. `vp install` → `vp build`（`dist/` 生成）
  3. `wrangler pages deploy dist --project-name osushi-hakoniwa` で Cloudflare Pages へ
- **オーナーが一度だけ行う前提作業（ブラウザ操作・私が代行不可）**:
  - Cloudflare で **Pages プロジェクト作成**（または `wrangler pages project create osushi-hakoniwa`）
  - **Cloudflare API トークン**（Pages編集権限）と **Account ID** を取得し、GitHub リポジトリの Secrets に `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` として登録
- 移行が固まるまで **GitHub Pages も残す**（両方に公開される状態）。安定したら GH Pages 側を停止するか判断
- 注意: Vite+ 自体にデプロイ専用コマンドは無い（`vp build` で生成 → wrangler で配信）

## ⑤ 「壊れていない」ことの担保

純粋移植なので、**既存のヘッドレス・スモークテスト**（`~/.workspace/osushi-smoke/check.js` ・ `check2.js`）を、**ビルド後（`vp build` → `vp preview` またはdist配信）の版に対して実行**し、以下が現行と同一に動くことを実測で確認する:

- 初期3匹来店・タップで増えない・満員14・呼び鈴CD
- あいさつ→なかよし（閾値・はずかしがりや逃げ）
- 図鑑（2ページ・3状態・★・2進捗）
- 壁着せ替え（デフォルトさくら・6色・保存・復元）
- 旧セーブからの移行・留守中来店
- コンソールエラー0・スマホ幅の段組

## ⑥ 進め方（段階的・各段でコミット）

一気に全変換せず、動作確認しながら段階実施:

1. `vp create` で雛形作成 → 現行 index.html を丸ごと移植して**まず今と同じ画面が出る**ことを確認
2. CSS を `style.css` に分離
3. JS を上記モジュールへ**1つずつ**移植（都度 `vp dev` で動作確認）
4. 型を付けて `vp check` を通す
5. Vitest を数本追加（`vp test run` green）
6. ヘッドレス・スモークで挙動同一を確認
7. GitHub Actions + Cloudflare 自動デプロイを設定・本番確認

## リスク・未確定事項

- **Vite+ ベータ**: 挙動不安定なら素Viteへ退避（TSコードは流用可）
- **vp コマンドの一部**（`vanilla-ts` 名・出力先・`vp fmt`）は着手時に実物確認して確定
- **Cloudflare Secrets 登録**はオーナーのブラウザ操作が必要（ここが止まると自動デプロイは完成しない）
- 純粋移植でも**分割時の配線ミス**でバグが入り得る → ⑤のスモークで検出

## 関連

- 現行仕様: `docs/spec.md`
- リポジトリ: https://github.com/fmzu/osushi-hakoniwa
