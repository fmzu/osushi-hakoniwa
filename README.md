# おすしのはこにわ 🍣

ドット絵のお寿司たちがイモムシみたいにむにむに歩き回る箱庭。Vite+ + TypeScript で構築しています。

## 遊び方

デプロイ済みの本番URL（下記「デプロイ」参照）を開くか、ローカルでは `vp dev`（「開発」参照）で起動します。お寿司たちは自分のペースでふらっと遊びに来ます（🔔で呼ぶことも）。
住人は12種・レアリティ3段階（★〜★★★）。来ると図鑑に「みかけた」が記録され、
タップであいさつを重ねると「なかよし」になってプロフィール（なまえ・せいかく）が解放されます。
せいかくによってなつきやすさが違います（あまえんぼはすぐ、はずかしがりやはなかなか）。
発見状況は localStorage に保存されます。

`iso.html` はアイソメトリック版。ひし形タイルの床を斜めに移動します（保管版・標準は正面版、依存ゼロの単体HTMLのままブラウザで直接開けます）。

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

`main` への push で GitHub Actions が `vp check` → `vp test run` → `vp build` → Cloudflare Pages へ自動デプロイします（`.github/workflows/deploy.yml`）。移行期間中は GitHub Pages 版も併存します。

## 構成

```
index.html                  正面ビュー版（標準、Vite エントリ）
iso.html                    アイソメトリック版（単体HTML・ビルド不要）
src/                        正面ビュー版の TypeScript ソース
tools/generate_sprites.py   スプライト一括生成スクリプト
assets/sheets/              スプライトシートPNG（16x16 / 32x32, 2フレーム）
assets/previews/            アニメーションプレビューGIF
```

HTML内のスプライトは文字列グリッド（正面）／ボクセルモデル（アイソメ）として埋め込まれていて、起動時にオフスクリーンcanvasへベイクされます。`assets/` のPNG・GIFは同じデータから `tools/generate_sprites.py` で生成したもので、HTMLの動作には不要です（他用途・確認用）。

```
pip install pillow
python3 tools/generate_sprites.py
```

## スプライト設計

正面ビューは16x16・2フレーム（190ms/フレーム）。移動は尺取り虫方式で、「縮み（後端が前に寄る・背中が盛り上がる）→伸び」の切り替わり時に前端側へ2px進みます。縮みフレームは前端固定で描いてあるため、左右反転スプライトでもこの規則がそのまま成立します。

ネタは共通グリッド＋パレット差し替えで増やせます（`NETA` に4色追加するだけ）。玉子の海苔のように装飾が必要なネタは、グリッドを変えずに帯列を上書きするオーバーレイで表現します。アウトラインは使わず、素材ごとの濃色を輪郭に置くselout方式です。

アイソメ版はシャリ8x4x5・ネタ10x6x5（全周1ボクセルはみ出し）のボクセルモデルを `sx = 2(x−y), sy = (x+y)−z` で投影しています。ワールド座標はボクセル単位の (u, v) で、奥行きソートは u+v 比較。

## License

MIT
