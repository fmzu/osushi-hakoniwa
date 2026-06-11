# おすしのはこにわ v3 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 図鑑埋めゲームとしての v3 — ネタ12種・レアリティ3段階・2段階図鑑（みかけた/なかよし）・来店制+呼び鈴・えびのしっぽ・セーブ移行を実装する。

**Architecture:** 単一ファイル `index.html`（依存ゼロ）の中の各セクション（マスターデータ / ベイク / 保存 / ワールド / 図鑑）を順に拡張する。スプライトは文字列グリッド + パレット差し替え方式を維持し、えびのしっぽはオーバーレイグリッドで追加。自動テストは書かず、各タスク末尾の手動確認で検証する（docs/spec.md の方針）。

**Tech Stack:** HTML/CSS/JavaScript（バニラ・単一ファイル）、補助ツールは Python + Pillow。

**前提:**
- 仕様書: `docs/spec.md`（v3 詳細仕様）
- 全タスクは `~/osushi-hakoniwa` リポジトリの `main` で作業（小さいリポジトリのためブランチ不要、タスクごとにコミット）
- 動作確認は `open index.html`（ブラウザで file:// 直開き）。コンソールから `visit()` 等を直接呼んで時間系を即時検証する
- `iso.html` は触らない

---

### Task 1: マスターデータ拡張（rarity + 新ネタ6種 + あいさつ必要回数）

**Files:**
- Modify: `index.html:123-146`（SPECIES 周辺）、`index.html:199-204`（pickSpecies）

- [ ] **Step 1: SPECIES に rarity を導入し、新6種を追加**

`index.html` の SPECIES 定義（123〜146行）を以下に置き換える。`weight` フィールドは廃止し `rarity`（1=★/2=★★/3=★★★）に統一。新6種のせいかくは既存と同じ6種を2匹ずつに割り当て、挙動パラメータは同じせいかくの既存ネタからコピー:

```js
// ============ 住人図鑑(マスターデータ) ============
// せいかくは挙動パラメータに直結:
//   step=歩くテンポms / pauseP=ひとやすみ率 / pauseLen=休憩長 /
//   heartP=♡率 / flipP=Uターン率 / driftP=奥行きふらふら率
// rarity: 1=★ふつう / 2=★★めずらしい / 3=★★★とってもレア
const SPECIES = [
 { id:'salmon', name:'サーモン', seikaku:'のんびりや', shape:NIGIRI, rarity:1,
   pal:{S:'#FF8C5F',L:'#FFC9A1',H:'#FFE6D2',E:'#E06A3C'},
   step:240, pauseP:.06, pauseLen:[1500,3500], heartP:.012, flipP:.03, driftP:.35 },
 { id:'maguro', name:'まぐろ', seikaku:'せっかち', shape:NIGIRI, rarity:1,
   pal:{S:'#E64A5E',L:'#F2858F',H:'#FAB4BB',E:'#B83648'},
   step:135, pauseP:0, pauseLen:[0,0], heartP:.01, flipP:.02, driftP:.35 },
 { id:'tamago', name:'たまご', seikaku:'あまえんぼ', shape:NIGIRI, rarity:1,
   pal:{S:'#FFD24A',L:'#FFE285',H:'#FFF2BC',E:'#E8A23E',band:'#414F44'},
   step:190, pauseP:.03, pauseLen:[800,2300], heartP:.07, flipP:.03, driftP:.35 },
 { id:'tako', name:'たこ', seikaku:'こうきしんおうせい', shape:NIGIRI, rarity:1,
   pal:{S:'#FAEDF2',L:'#C9608A',H:'#FFFFFF',E:'#B4527A'},
   step:170, pauseP:.02, pauseLen:[800,2300], heartP:.015, flipP:.08, driftP:.5 },
 { id:'natto', name:'なっとう', seikaku:'ねぼすけ', shape:GUNKAN, rarity:1,
   pal:{N:'#3E4A40',n:'#5C6B5E',O:'#C9A86A',P:'#E8CD92',Q:'#A8854A'},
   step:210, pauseP:.06, pauseLen:[2500,6000], heartP:.01, flipP:.03, driftP:.35 },
 { id:'ebi', name:'えび', seikaku:'はずかしがりや', shape:NIGIRI, rarity:2,
   pal:{S:'#FFF0E8',L:'#FF8662',H:'#FFFAF6',E:'#EE9476',T:'#FF8662',U:'#EE9476'},
   overlay:EBI_TAIL,
   step:190, pauseP:.03, pauseLen:[800,2300], heartP:.01, flipP:.14, driftP:.35 },
 { id:'ika', name:'いか', seikaku:'ねぼすけ', shape:NIGIRI, rarity:2,
   pal:{S:'#F3F2F7',L:'#FFFFFF',H:'#FFFFFF',E:'#CFCBDC'},
   step:210, pauseP:.06, pauseLen:[2500,6000], heartP:.01, flipP:.03, driftP:.35 },
 { id:'ikura', name:'いくら', seikaku:'こうきしんおうせい', shape:GUNKAN, rarity:2,
   pal:{N:'#414F44',n:'#5E6E60',O:'#FF7436',P:'#FFC18E',Q:'#E0522A'},
   step:170, pauseP:.02, pauseLen:[800,2300], heartP:.015, flipP:.08, driftP:.8 },
 { id:'anago', name:'あなご', seikaku:'のんびりや', shape:NIGIRI, rarity:2,
   pal:{S:'#C08A5A',L:'#9C6B40',H:'#E0B383',E:'#8A5A34'},
   step:240, pauseP:.06, pauseLen:[1500,3500], heartP:.012, flipP:.03, driftP:.35 },
 { id:'engawa', name:'えんがわ', seikaku:'はずかしがりや', shape:NIGIRI, rarity:2,
   pal:{S:'#FBF2E0',L:'#F2D9A4',H:'#FFFFFF',E:'#E3BC78'},
   step:190, pauseP:.03, pauseLen:[800,2300], heartP:.01, flipP:.14, driftP:.35 },
 { id:'uni', name:'うに', seikaku:'せっかち', shape:GUNKAN, rarity:3,
   pal:{N:'#414F44',n:'#5E6E60',O:'#F2A23E',P:'#FFD089',Q:'#D27E1E'},
   step:135, pauseP:0, pauseLen:[0,0], heartP:.01, flipP:.02, driftP:.35 },
 { id:'toro', name:'とろ', seikaku:'あまえんぼ', shape:NIGIRI, rarity:3,
   pal:{S:'#F8B5B0',L:'#FFE8E4',H:'#FFF5F3',E:'#E08B86'},
   step:190, pauseP:.03, pauseLen:[800,2300], heartP:.07, flipP:.03, driftP:.35 },
];
// レアリティ → 出現の重み / あいさつ必要回数（せいかく連動）
const RARITY_WEIGHT = { 1:6, 2:3, 3:1 };
const GREET_NEED = {
  'あまえんぼ':2, 'のんびりや':3, 'こうきしんおうせい':3,
  'せっかち':4, 'ねぼすけ':4, 'はずかしがりや':6
};
```

注意: `overlay:EBI_TAIL` は Task 2 で定義する定数を参照する。**Task 1 の時点では ebi の行から `pal` の `T`/`U` と `overlay:EBI_TAIL,` を入れずにおき、Task 2 で追加してもよい**（コミットを分ける場合）。一括で進めるなら Task 2 を先に読んで EBI_TAIL 定義も同時に入れる。

- [ ] **Step 2: pickSpecies を rarity 重みに変更**

`index.html` の pickSpecies（199〜204行）を置き換え:

```js
function pickSpecies(){
  const total = SPECIES.reduce((a,s)=>a+RARITY_WEIGHT[s.rarity],0);
  let r = Math.random()*total;
  for (const s of SPECIES){ r -= RARITY_WEIGHT[s.rarity]; if (r<0) return s; }
  return SPECIES[0];
}
```

- [ ] **Step 3: 動作確認**

`open index.html` でブラウザを開き、コンソールにエラーがないこと・新ネタ（たこ・なっとう・あなご・えんがわ）が歩いて出てくることを確認。コンソールで `SPECIES.length` → `12`。出現確認を早めるため `for(let i=0;i<10;i++) spawn()` を実行して見た目をチェック（うに・とろは低確率なので `spawn(undefined,undefined,SPECIES.find(s=>s.id==='uni'))` で強制出現させて配色確認）。

- [ ] **Step 4: コミット**

```bash
git add index.html
git commit -m "v3: ネタ6種追加とレアリティ3段階（重み付き抽選）"
```

---

### Task 2: えびのしっぽ（オーバーレイ機構）

**Files:**
- Modify: `index.html`（形状グリッドの直後に EBI_TAIL 追加、bake 関数、ベイクループ、ebi の SPECIES 行）

- [ ] **Step 1: EBI_TAIL 定数を追加**

`RICE` 定義（121行付近）の直後に追加。ブラウザモックアップで選定した「おうぎ尾」。T=しっぽ本体(#FF8662) / U=濃い縁・先端(#EE9476)（色は ebi の pal に追加済みの T/U を使う）:

```js
// えびのしっぽ(おうぎ尾) : ネタ後端から斜め上に開く。縮みはネタに合わせ右上へシフト
const EBI_TAIL = {
  stretch: [
"................","UTU.............","TT..............",".TT.............",
"..U.............","................","................","................",
"................","................","................","................",
"................","................","................","................"],
  scrunch: [
"..UTU...........","..TT............","...TT...........","....U...........",
"................","................","................","................",
"................","................","................","................",
"................","................","................","................"]
};
```

- [ ] **Step 2: bake にオーバーレイ対応を追加**

bake 関数（149〜161行）を置き換え:

```js
function bake(grid, flip, pal, bandCols, overlay){
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const put = (row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = (bandCols && bandCols.includes(x)) ? pal.band : pal[ch];
    g.fillRect(flip ? 15 - x : x, y, 1, 1);
  });
  grid.forEach(put);
  if (overlay) overlay.forEach(put);
  return c;
}
```

※ band 判定はオーバーレイには不要だが、オーバーレイグリッドの該当列に band 文字は現れないため共通の put で問題ない。

- [ ] **Step 3: ベイクループでオーバーレイを渡す**

ベイクループ（172〜181行）を置き換え:

```js
for (const sp of SPECIES){
  const pal = { ...RICE, ...sp.pal };
  const bS = sp.pal.band ? sp.shape.band.stretch : null;
  const bC = sp.pal.band ? sp.shape.band.scrunch : null;
  const oS = sp.overlay ? sp.overlay.stretch : null;
  const oC = sp.overlay ? sp.overlay.scrunch : null;
  sp.spr = {
    '1':  [bake(sp.shape.stretch,false,pal,bS,oS), bake(sp.shape.scrunch,false,pal,bC,oC)],
    '-1': [bake(sp.shape.stretch,true,pal,bS,oS),  bake(sp.shape.scrunch,true,pal,bC,oC)]
  };
  sp.shadow = silhouette(sp.spr['1'][0]);
}
```

- [ ] **Step 4: ebi の SPECIES 行にしっぽを接続**

Task 1 で保留した場合はここで ebi の行に `T:'#FF8662',U:'#EE9476'` を pal に、`overlay:EBI_TAIL,` をフィールドに追加する（Task 1 の Step 1 のコード参照）。EBI_TAIL の定義は SPECIES より前に置くこと。

- [ ] **Step 5: 動作確認**

ブラウザ更新 → コンソールで `spawn(60,60,SPECIES.find(s=>s.id==='ebi'))`。えびの左上にオレンジのおうぎ尾が見え、歩行（伸び⇄縮み）でしっぽが体についてくること・左右反転時も自然なことを確認。

- [ ] **Step 6: コミット**

```bash
git add index.html
git commit -m "v3: えびにおうぎ尾を追加（スプライトオーバーレイ機構）"
```

---

### Task 3: セーブデータ v2 + 旧データ移行

**Files:**
- Modify: `index.html:183-188`（store / discovered）

- [ ] **Step 1: store を v2 形式に置き換え**

183〜188行の store / discovered を以下に置き換え。**旧 `osushi-zukan`（発見ID配列）があれば seen と friends の両方に引き継ぐ。旧キーは消さない**:

```js
// ============ 保存(localStorage / 失敗時はメモリのみ) ============
// v2形式: { seen:[id], friends:[id], greet:{id:回数}, lastVisit:エポックms }
// 旧v1(osushi-zukan: 発見ID配列)は seen/friends 両方へ移行（発見済み=なかよし扱い）
const store = {
  load(){
    try {
      const v2 = JSON.parse(localStorage.getItem('osushi-zukan-v2'));
      if (v2) return { seen:new Set(v2.seen||[]), friends:new Set(v2.friends||[]),
                       greet:v2.greet||{}, lastVisit:v2.lastVisit||0 };
      const v1 = JSON.parse(localStorage.getItem('osushi-zukan')||'[]');
      return { seen:new Set(v1), friends:new Set(v1), greet:{}, lastVisit:0 };
    } catch(e){ return { seen:new Set(), friends:new Set(), greet:{}, lastVisit:0 }; }
  },
  save(st){
    try {
      localStorage.setItem('osushi-zukan-v2', JSON.stringify({
        seen:[...st.seen], friends:[...st.friends], greet:st.greet, lastVisit:st.lastVisit
      }));
    } catch(e){}
  }
};
const state = store.load();
```

- [ ] **Step 2: 旧 `discovered` 参照を一時的に動くようにする**

この時点でファイル内の `discovered` 参照（discover 関数・pointerdown・updateZukanCount・renderZukan）はエラーになるため、**Task 3 ではまず機械的に `discovered` → `state.friends` に置換**して動作を維持する（Task 5・7 で正式に書き換える）。`store.save(discovered)` は `store.save(state)` に置換。

- [ ] **Step 3: 移行の動作確認**

1. DevTools コンソールで `localStorage.clear(); localStorage.setItem('osushi-zukan', JSON.stringify(['salmon','ebi']))` → リロード
2. `[...state.friends]` が `['salmon','ebi']`、`[...state.seen]` も同じであること
3. `localStorage.getItem('osushi-zukan')` が残っていること（消えていない）
4. リロード後 `localStorage.getItem('osushi-zukan-v2')` は保存タイミング前なら null でもよい（次の保存で書かれる）

- [ ] **Step 4: コミット**

```bash
git add index.html
git commit -m "v3: セーブデータをv2形式に移行（seen/friends/greet/lastVisit）"
```

---

### Task 4: 来店制（タップスポーン廃止・自然来店・退店・留守中来店）

**Files:**
- Modify: `index.html`（spawn 周辺、272〜274行の setInterval、305行のタップスポーン）

- [ ] **Step 1: 定数と visit / markSeen / leave を追加**

spawn 関数の直後に追加。`MAX_SUSHI = 14`（満員）:

```js
const MAX_SUSHI = 14;
function markSeen(sp){
  if (state.seen.has(sp.id)) return;
  state.seen.add(sp.id);
  store.save(state);
  if (sp.rarity === 3){
    showBanner('✨レアはっけん！！ ' + sp.name + '✨');
    for (let i=0;i<10;i++) hearts.push({x:30+Math.random()*100, y:GROUND_TOP+Math.random()*80, life:1});
  } else {
    showBanner('みかけた！ ' + sp.name);
  }
  updateZukanCount();
}
function visit(){
  if (sushis.length >= MAX_SUSHI) return false;
  const sp = pickSpecies();
  spawn(undefined, undefined, sp);
  markSeen(sp);
  return true;
}
function leave(){
  if (sushis.length <= 3) return;
  const i = Math.floor(Math.random()*sushis.length);
  sushis.splice(i, 1);
  document.getElementById('count').textContent = sushis.length;
}
```

- [ ] **Step 2: 来店・退店のスケジューラを設置**

272〜274行の `setInterval(...8000)` と `spawn(); spawn(); spawn();` を**削除**し、以下を**スクリプト最下部（`updateZukanCount();` の呼び出しの後）に追加**する。

⚠️ 旧spawn位置（272行）に置くと、`showBanner` が参照する `const banner`（277行）の初期化前に `welcomeBack` が実行されて TDZ（Temporal Dead Zone）エラーになる。必ず最下部に置くこと:

```js
// ============ 来店・退店(タイマー) ============
function scheduleVisit(){
  setTimeout(()=>{ visit(); scheduleVisit(); }, 60000 + Math.random()*60000);   // 60〜120秒
}
function scheduleLeave(){
  setTimeout(()=>{ leave(); scheduleLeave(); }, 120000 + Math.random()*120000); // 2〜4分
}
scheduleVisit();
scheduleLeave();

// ============ 留守中の来店 + 初回 ============
(function welcomeBack(){
  const AWAY_MS = 20*60*1000; // 20分に1匹
  let arrivals = 0;
  if (state.lastVisit > 0){
    arrivals = Math.min(5, Math.floor((Date.now()-state.lastVisit)/AWAY_MS));
  }
  for (let i=0;i<arrivals;i++) visit();
  if (arrivals > 0) setTimeout(()=>showBanner('るすのあいだに 来てたみたい'), 600);
  while (sushis.length < 3) visit();  // 初回・過疎時の最低保証
})();
// 最終訪問時刻を定期保存
setInterval(()=>{ state.lastVisit = Date.now(); store.save(state); }, 30000);
document.addEventListener('visibilitychange', ()=>{
  if (document.hidden){ state.lastVisit = Date.now(); store.save(state); }
});
```

※ `visit`/`markSeen`/`leave`（Step 1）は関数宣言なのでどこからでも呼べるが、**実行ブロック（scheduleVisit 起動〜welcomeBack）は banner などの const 初期化後＝最下部**でなければならない。

- [ ] **Step 3: タップスポーンを削除**

pointerdown ハンドラ内（305行）の以下の行を削除する:

```js
  if (sushis.length < 12 && py > GROUND_TOP) spawn(px-8, py-8);
```

ヘッダー下の説明文（75行）も更新:

```html
<div class="sub">おすしに あいさつして なかよくなろう ♡</div>
```

- [ ] **Step 4: 動作確認**

1. `localStorage.clear()` → リロード → 3匹で開始すること。新種なら「みかけた！」バナーが出ること
2. 空きスペースをタップしても増えないこと
3. コンソールで `visit()` を連打 → 14匹で `false` が返り増えないこと
4. `leave()` で1匹減ること（3匹以下では減らない）
5. 留守中来店: `state.lastVisit = Date.now()-60*60*1000; store.save(state)` → リロード → 3匹（60分÷20分）増えて「るすのあいだに来てたみたい」が出ること

- [ ] **Step 5: コミット**

```bash
git add index.html
git commit -m "v3: 来店制に変更（タップスポーン廃止・留守中来店・退店）"
```

---

### Task 5: あいさつ → なかよし（2段階図鑑のコアロジック）

**Files:**
- Modify: `index.html`（discover 関数と pointerdown ハンドラ）

- [ ] **Step 1: discover を greet に置き換え**

discover 関数（285〜291行）を削除し、以下に置き換え:

```js
function greet(s){
  const sp = s.sp;
  hearts.push({x:s.x+8, y:s.y-2, life:1});
  if (state.friends.has(sp.id)) return;
  state.greet[sp.id] = (state.greet[sp.id]||0) + 1;
  if (sp.seikaku === 'はずかしがりや'){           // 逃げる素振り
    s.dir *= -1; s.pause = 0;
    s.x = Math.max(2, Math.min(W-18, s.x + 6*s.dir));
  }
  if (state.greet[sp.id] >= GREET_NEED[sp.seikaku]){
    state.friends.add(sp.id);
    showBanner('なかよしになった！ ' + sp.name);
    for (let i=0;i<6;i++) hearts.push({x:s.x+4+Math.random()*8, y:s.y-2-Math.random()*4, life:1});
    updateZukanCount();
  }
  store.save(state);
}
```

- [ ] **Step 2: pointerdown を greet 呼び出しに変更**

pointerdown ハンドラ（293〜306行）を置き換え（タップスポーン行は Task 4 で削除済み）:

```js
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect();
  const px = (e.clientX-r.left)/r.width*W, py = (e.clientY-r.top)/r.height*H;
  const sorted = [...sushis].sort((a,b)=>b.y-a.y);  // 手前のコから当たり判定
  for (const s of sorted){
    if (px>=s.x && px<s.x+16 && py>=s.y && py<s.y+16){ greet(s); return; }
  }
});
```

- [ ] **Step 3: 動作確認**

1. `localStorage.clear()` → リロード
2. たまご（あまえんぼ）かサーモン（のんびりや）をタップ → ♡が出る。規定回数（2〜3回）で「なかよしになった！」バナー
3. えび／えんがわ（はずかしがりや）をタップ → 向きを変えて逃げる素振り。6回で なかよし
4. なかよし後のタップは♡だけ出てカウントが増えないこと（`state.greet` をコンソールで確認）
5. リロード後も `state.friends` が保持されていること

- [ ] **Step 4: コミット**

```bash
git add index.html
git commit -m "v3: あいさつ→なかよしの2段階登録（せいかく連動・はずかしがりやは逃げる）"
```

---

### Task 6: 呼び鈴ボタン🔔

**Files:**
- Modify: `index.html`（80〜83行の .bar、スクリプト末尾）

- [ ] **Step 1: ボタンを追加**

.bar（80〜83行）を置き換え:

```html
<div class="bar">
  <span>おすし: <b id="count">0</b> かん</span>
  <button id="bell">🔔 よぶ</button>
  <button id="openZukan">ずかん <b id="zcnt"></b></button>
</div>
```

- [ ] **Step 2: クールダウン付きロジックを追加**

スクリプトの図鑑セクションの手前に追加:

```js
// ============ 呼び鈴 ============
const bell = document.getElementById('bell');
const BELL_CD = 90;            // クールダウン秒
let bellLeft = 0;
bell.addEventListener('click', ()=>{
  if (bellLeft > 0) return;
  bellLeft = BELL_CD;
  bell.disabled = true;
  setTimeout(()=>{ visit(); }, 1500 + Math.random()*2500);  // 少し間を置いて来店
});
setInterval(()=>{
  if (bellLeft <= 0) return;
  bellLeft--;
  if (bellLeft > 0){ bell.textContent = `🔔 (${bellLeft})`; }
  else { bell.textContent = '🔔 よぶ'; bell.disabled = false; }
}, 1000);
```

- [ ] **Step 3: 動作確認**

1. 🔔 よぶ をタップ → ボタンが `🔔 (89)` のカウントダウン表示になり、1.5〜4秒後に1匹来店
2. クールダウン中は再タップ無効。90秒後に「🔔 よぶ」へ戻り再度押せること
3. 満員（14匹）時に押す → クールダウンは始まるが増えない（仕様通り。気になれば後で調整）

- [ ] **Step 4: コミット**

```bash
git add index.html
git commit -m "v3: 呼び鈴ボタンを追加（クールダウン90秒）"
```

---

### Task 7: 図鑑UI（3状態・★・2進捗）

**Files:**
- Modify: `index.html`（CSS .card 周辺、updateZukanCount、renderZukan）

- [ ] **Step 1: CSS に seen 状態と★を追加**

`.card.unknown .nm,.card.unknown .sk{color:#D9A8B5}`（69行）の直後に追加:

```css
  .card.seen .nm,.card.seen .sk{color:#C98A96}
  .card .rar{color:#E8B23E;font-size:11px;letter-spacing:1px}
```

- [ ] **Step 2: updateZukanCount を2進捗に変更**

updateZukanCount（311〜315行）を置き換え:

```js
function updateZukanCount(){
  document.getElementById('zcnt').textContent = `${state.friends.size}/${SPECIES.length}`;
  document.getElementById('zcnt2').textContent =
    `みかけた ${state.seen.size}/${SPECIES.length} ・ なかよし ${state.friends.size}/${SPECIES.length}`;
}
```

- [ ] **Step 3: renderZukan を3状態+★に変更**

renderZukan（316〜331行）を置き換え。3状態 = 未見（シルエット+？？？）/ みかけた（姿が見える・プロフィール？？？）/ なかよし（全解放）。クリアは `replaceChildren()` を使う:

```js
function renderZukan(){
  cards.replaceChildren();
  for (const sp of SPECIES){
    const friend = state.friends.has(sp.id);
    const seen = state.seen.has(sp.id);
    const card = document.createElement('div');
    card.className = 'card' + (friend ? '' : seen ? ' seen' : ' unknown');
    const img = document.createElement('img');
    img.src = (seen ? sp.spr['1'][0] : sp.shadow).toDataURL();
    const rar = document.createElement('div'); rar.className = 'rar';
    rar.textContent = '★'.repeat(sp.rarity);
    const nm = document.createElement('div'); nm.className = 'nm';
    nm.textContent = friend ? sp.name : '？？？';
    const sk = document.createElement('div'); sk.className = 'sk';
    sk.textContent = friend ? 'せいかく: ' + sp.seikaku
                   : seen   ? 'あいさつして なかよくなろう'
                   :          '…だれだろう';
    card.append(img, rar, nm, sk);
    cards.append(card);
  }
}
```

- [ ] **Step 4: 動作確認**

1. `localStorage.clear()` → リロード → ずかんを開く: 来店済みの子は姿+「？？？」+「あいさつして なかよくなろう」、未来店はシルエット+「…だれだろう」。全カードに★表示
2. ヘッダーが「みかけた n/12 ・ なかよし n/12」になっている。バーのずかんボタンは なかよし数
3. あいさつでなかよしにした子は名前とせいかくが解放される
4. 旧データ移行確認: `localStorage.clear(); localStorage.setItem('osushi-zukan', JSON.stringify(['salmon']))` → リロード → ずかんでサーモンが「なかよし」状態であること

- [ ] **Step 5: コミット**

```bash
git add index.html
git commit -m "v3: 図鑑を3状態表示に（シルエット/みかけた/なかよし + ★ + 2進捗）"
```

---

### Task 8: generate_sprites.py に新ネタ + えびしっぽを反映

**Files:**
- Modify: `tools/generate_sprites.py`

- [ ] **Step 1: NETA_FRONT に新にぎり4種 + えびオーバーレイを追加**

`NETA_FRONT`（56〜63行）を置き換え:

```python
NETA_FRONT = {
    "salmon": {"S": (255,140,95), "L": (255,201,161), "H": (255,230,210), "E": (224,106,60)},
    "maguro": {"S": (230,74,94),  "L": (242,133,143), "H": (250,180,187), "E": (184,54,72)},
    "tamago": {"S": (255,210,74), "L": (255,226,133), "H": (255,242,188), "E": (232,162,62),
               "band": (65,79,68)},
    "ebi":    {"S": (255,240,232), "L": (255,134,98), "H": (255,250,246), "E": (238,148,118),
               "T": (255,134,98), "U": (238,148,118)},
    "ika":    {"S": (243,242,247), "L": (255,255,255), "H": (255,255,255), "E": (207,203,220)},
    "tako":   {"S": (250,237,242), "L": (201,96,138), "H": (255,255,255), "E": (180,82,122)},
    "anago":  {"S": (192,138,90),  "L": (156,107,64), "H": (224,179,131), "E": (138,90,52)},
    "engawa": {"S": (251,242,224), "L": (242,217,164), "H": (255,255,255), "E": (227,188,120)},
    "toro":   {"S": (248,181,176), "L": (255,232,228), "H": (255,245,243), "E": (224,139,134)},
}

# えびのしっぽ(おうぎ尾)オーバーレイ
TAIL_STRETCH = [
"................","UTU.............","TT..............",".TT.............",
"..U.............","................","................","................",
"................","................","................","................",
"................","................","................","................"]
TAIL_SCRUNCH = [
"..UTU...........","..TT............","...TT...........","....U...........",
"................","................","................","................",
"................","................","................","................",
"................","................","................","................"]
OVERLAYS = {"ebi": {"stretch": TAIL_STRETCH, "scrunch": TAIL_SCRUNCH}}
```

- [ ] **Step 2: 軍艦を辞書化（いくら・なっとう・うに）**

`IKURA`（91〜92行）を置き換え:

```python
NETA_GUNKAN = {
    "ikura": {"N": (65,79,68), "n": (94,110,96), "O": (255,116,54),
              "P": (255,193,142), "Q": (224,82,42)},
    "natto": {"N": (62,74,64), "n": (92,107,94), "O": (201,168,106),
              "P": (232,205,146), "Q": (168,133,74)},
    "uni":   {"N": (65,79,68), "n": (94,110,96), "O": (242,162,62),
              "P": (255,208,137), "Q": (210,126,30)},
}
```

- [ ] **Step 3: render_front にオーバーレイ対応を追加**

render_front（94〜105行）を置き換え:

```python
def render_front(grid, neta, band_cols=None, overlay=None):
    pal = {**RICE, **{k: v for k, v in neta.items() if k != "band"}}
    im = Image.new("RGBA", (16, 16))
    def put_grid(g, use_band):
        for y, row in enumerate(g):
            for x, ch in enumerate(row):
                if ch == ".":
                    continue
                if use_band and band_cols and x in band_cols:
                    im.putpixel((x, y), neta["band"] + (255,))
                else:
                    im.putpixel((x, y), pal[ch] + (255,))
    put_grid(grid, True)
    if overlay:
        put_grid(overlay, False)
    return im
```

- [ ] **Step 4: main の出力ループを更新**

main 内（172〜185行）のフロント出力部を置き換え:

```python
    for name, neta in NETA_FRONT.items():
        has_band = "band" in neta
        ov = OVERLAYS.get(name)
        frames = [
            render_front(GRID_STRETCH, neta, BAND_COLS["stretch"] if has_band else None,
                         ov["stretch"] if ov else None),
            render_front(GRID_SCRUNCH, neta, BAND_COLS["scrunch"] if has_band else None,
                         ov["scrunch"] if ov else None),
        ]
        save_sheet(frames, SHEETS / f"{name}-front.png")
        save_gif(frames, PREVIEWS / f"{name}-front.gif", scale=15)
    for name, neta in NETA_GUNKAN.items():
        frames = [
            render_front(GRID_GUNKAN_STRETCH, neta),
            render_front(GRID_GUNKAN_SCRUNCH, neta),
        ]
        save_sheet(frames, SHEETS / f"{name}-front.png")
        save_gif(frames, PREVIEWS / f"{name}-front.gif", scale=15)
```

- [ ] **Step 5: 実行して生成確認**

```bash
python3 -c "import PIL" 2>/dev/null || pip3 install pillow
python3 tools/generate_sprites.py
ls assets/sheets assets/previews
```

期待: `tako/natto/anago/engawa/uni/toro` の `-front.png` / `-front.gif` が新規生成され、`ebi-front.*` がしっぽ付きに更新される。GIFをプレビューで開いて目視確認。

- [ ] **Step 6: コミット**

```bash
git add tools/generate_sprites.py assets/
git commit -m "v3: スプライト生成ツールに新6種とえびのしっぽを反映"
```

---

### Task 9: README更新・手動チェックリスト・公開

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README の「遊び方」を v3 内容に更新**

README.md の遊び方セクション（7〜10行）を置き換え:

```markdown
## 遊び方

`index.html` をブラウザで開くだけ。お寿司たちは自分のペースでふらっと遊びに来ます（🔔で呼ぶことも）。
住人は12種・レアリティ3段階（★〜★★★）。来ると図鑑に「みかけた」が記録され、
タップであいさつを重ねると「なかよし」になってプロフィール（なまえ・せいかく）が解放されます。
せいかくによってなつきやすさが違います（あまえんぼはすぐ、はずかしがりやはなかなか）。
発見状況は localStorage に保存されます。

`iso.html` はアイソメトリック版。ひし形タイルの床を斜めに移動します（保管版・標準は正面版）。
```

- [ ] **Step 2: 手動チェックリスト（最終確認）**

`localStorage.clear()` した状態と、旧データ `localStorage.setItem('osushi-zukan', JSON.stringify(['salmon','ebi']))` を入れた状態の両方で:

- [ ] 初回3匹で開始、来店バナー「みかけた！」が出る
- [ ] 空きスペースタップで増えない / 🔔で1匹来てクールダウンが効く
- [ ] あいさつ→なかよし（あまえんぼ2回・はずかしがりや6回+逃げ素振り）
- [ ] 図鑑: シルエット→姿→プロフィール解放の3状態、★表示、2進捗
- [ ] リロードで進捗保持 / 旧データは「なかよし」として移行され旧キーも残る
- [ ] 留守中来店（lastVisit を1時間前に書き換え→リロードで3匹+バナー）
- [ ] スマホ幅（DevTools レスポンシブモード）で崩れない
- [ ] コンソールにエラーなし

- [ ] **Step 3: コミット & Push**

```bash
git add README.md
git commit -m "v3: README を図鑑ゲーム仕様に更新"
git push origin main
```

- [ ] **Step 4: GitHub Pages 反映確認**

```bash
gh api repos/fmzu/osushi-hakoniwa/pages/builds/latest --jq '.status'
```

`built` になったら https://fmzu.github.io/osushi-hakoniwa/ を開き、本番でも初回フローを一通り確認する。

---

## 補足: 数値調整ポイント（実装後に遊んで決める）

| 定数 | 初期値 | 意味 |
|---|---|---|
| RARITY_WEIGHT | 6/3/1 | ★/★★/★★★ の出現重み（★★★は1匹あたり約2%） |
| 来店間隔 | 60〜120秒 | 開いている間の自然来店 |
| 退店間隔 | 2〜4分 | 3匹以下では退店しない |
| AWAY_MS | 20分/匹・上限5 | 留守中来店 |
| BELL_CD | 90秒 | 呼び鈴クールダウン |
| GREET_NEED | 2〜6回 | せいかく別なつき回数 |
