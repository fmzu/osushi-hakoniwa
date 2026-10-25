package main

import "testing"

// src/puzzle/core.test.ts と同じ観点のルール単体テスト。
// ルールの正は core.ts。ここが落ちたら、TS と Go のどちらかがずれている。

const (
	up = iota
	down
	left
	right
)

// board は盤と、いまの状態。1手ずつ動かして確かめるためのテスト用ヘルパー
type board struct {
	t *testing.T
	L Level
	s state
}

func newBoard(t *testing.T, rows string) *board {
	t.Helper()
	L := ParseRows(rows)
	return &board{t: t, L: L, s: L.start()}
}

func (b *board) index(id byte) int {
	b.t.Helper()
	for i, p := range b.L.Pieces {
		if p.ID == id {
			return i
		}
	}
	b.t.Fatalf("駒 %c がない", id)
	return -1
}

// move は駒を動かす。動けなければ ok=false で盤は変わらない
func (b *board) move(id byte, dir int) (cost int, ok bool) {
	b.t.Helper()
	ns, cost, _, ok := b.L.applyMove(b.s, b.L.grid(b.s), b.index(id), dir, false)
	if ok {
		b.s = ns
	}
	return cost, ok
}

func (b *board) pos(id byte) (int, int) {
	return b.L.at(b.s, b.index(id))
}

func (b *board) mustMove(id byte, dir, wantCost int) {
	b.t.Helper()
	cost, ok := b.move(id, dir)
	if !ok || cost != wantCost {
		b.t.Fatalf("%c を動かした結果 ok=%v cost=%d、期待は cost=%d", id, ok, cost, wantCost)
	}
}

func (b *board) mustBlock(id byte, dir int) {
	b.t.Helper()
	if _, ok := b.move(id, dir); ok {
		b.t.Fatalf("%c は動けないはずなのに動いた", id)
	}
}

func (b *board) mustBeAt(id byte, x, y int) {
	b.t.Helper()
	if px, py := b.pos(id); px != x || py != y {
		b.t.Fatalf("%c の位置は (%d,%d)、期待は (%d,%d)", id, px, py, x, y)
	}
}

func TestNormalMove(t *testing.T) {
	b := newBoard(t, "Ha./...")
	b.mustMove('H', down, 1)
	b.mustBeAt('H', 0, 1)
	b.mustBlock('H', left)   // 盤の外
	b.mustMove('a', left, 1) // 主人公が離れたあとの空きマスへ
	b.mustBeAt('a', 0, 0)
}

func TestMoveBlockedByPieceAndEdge(t *testing.T) {
	b := newBoard(t, "Ha")
	b.mustBlock('H', right) // 乗客がいる
	b.mustBlock('H', up)    // 盤の外
	b.mustBlock('a', right) // 盤の外
}

func TestLongPieceNeedsRoomForWholeBody(t *testing.T) {
	b := newBoard(t, "aa./H.b")
	b.mustBlock('a', down) // 下に主人公がいる
	b.mustMove('a', right, 1)
	b.mustBeAt('a', 1, 0)
}

func TestFixedPiecesNeverMove(t *testing.T) {
	b := newBoard(t, "T.A./H...")
	for d := range dirs {
		b.mustBlock('T', d)
		b.mustBlock('A', d)
	}
}

func TestNattoNeedsTwoMoves(t *testing.T) {
	b := newBoard(t, "HW.")
	b.mustMove('W', right, 1) // 1手目: 拾い集める。盤は変わらない
	b.mustBeAt('W', 1, 0)
	b.mustMove('W', right, 1) // 2手目: 動く
	b.mustBeAt('W', 2, 0)
	b.mustMove('W', left, 1) // 動いたあとはまた拾い集めるところから
	b.mustBeAt('W', 2, 0)
}

func TestNattoArmingIgnoresDirectionAndBlocking(t *testing.T) {
	b := newBoard(t, "HW")
	b.mustMove('W', up, 1) // 動けない向きでも、拾い集める手は成立する
	b.mustBeAt('W', 1, 0)
	b.mustBlock('W', up) // 2手目は動けない向きなら動けない
}

func TestNattoArmingIsCancelledWhenAnotherPieceMoves(t *testing.T) {
	b := newBoard(t, "HW./...")
	b.mustMove('W', right, 1) // 拾い集める
	b.mustMove('H', down, 1)  // 他を動かすと解除される
	b.mustMove('W', right, 1) // また1手目からやり直し
	b.mustBeAt('W', 1, 0)
	b.mustMove('W', right, 1)
	b.mustBeAt('W', 2, 0)
}

func TestNattoSwapsWithOneByOne(t *testing.T) {
	b := newBoard(t, "aWH")
	b.mustMove('W', left, 1)
	b.mustMove('W', left, 1) // 入れ替わる
	b.mustBeAt('W', 0, 0)
	b.mustBeAt('a', 1, 0)
}

func TestNattoCannotSwapWithLongPieces(t *testing.T) {
	for _, rows := range []string{"aaWH", "aW/aH", "aa/WH"} {
		b := newBoard(t, rows)
		b.mustMove('W', left, 1)
		if rows == "aa/WH" {
			b.mustBlock('W', up)
		} else {
			b.mustBlock('W', left)
		}
	}
}

func TestNattoCannotSwapWithTargetOrWasabi(t *testing.T) {
	for _, rows := range []string{"TWH", "AWH"} {
		b := newBoard(t, rows)
		b.mustMove('W', left, 1)
		b.mustBlock('W', left)
	}
}

func TestWasabiCostsWhenHeroNewlyArrivesNextToIt(t *testing.T) {
	b := newBoard(t, "H.A")
	b.mustMove('H', right, 2) // 1手 + ツーン1
}

func TestWasabiTwiceBetweenTwo(t *testing.T) {
	b := newBoard(t, "A.2/.H.")
	b.mustMove('H', up, 3) // 2つの間に入ると -2
}

func TestWasabiDoesNotCostForOtherPieces(t *testing.T) {
	b := newBoard(t, "A.a./H...")
	b.mustMove('a', left, 1) // 乗客がわさびの隣に入っても減らない
	b.mustBeAt('a', 1, 0)
}

func TestWasabiDoesNotRepeatWhileStayingAdjacent(t *testing.T) {
	b := newBoard(t, "AA/H.")
	b.mustMove('H', right, 1) // (0,1) から (1,1) へ。ずっとわさびの下にいる
	b.mustMove('H', left, 1)
}

func TestWasabiCostsAgainWhenHeroComesBack(t *testing.T) {
	b := newBoard(t, "A./H.")
	b.mustMove('H', right, 1) // 斜めになるので離れる
	b.mustMove('H', left, 2)  // 戻ってくるとまたツーン
}

func TestWasabiCostsWhenNattoSwapMovesHero(t *testing.T) {
	b := newBoard(t, "HW/.A")
	b.mustMove('W', left, 1)
	b.mustMove('W', left, 2) // 入れ替わりで主人公がわさびの隣に動いたので主人公扱い
	b.mustBeAt('H', 1, 0)
}

func TestWinWhenHeroTouchesTarget(t *testing.T) {
	cases := []struct {
		rows string
		want bool
	}{
		{"HT", true},
		{"H.T", false},
		{"T/H", true},
		{"T./.H", false}, // 斜めは隣ではない
		{"HaT", false},
	}
	for _, c := range cases {
		L := ParseRows(c.rows)
		if got := L.won(L.start()); got != c.want {
			t.Errorf("%s: won=%v、期待は %v", c.rows, got, c.want)
		}
	}
}

func TestSolveSimple(t *testing.T) {
	L := ParseRows("H.T")
	r := Solve(L, Opts{MaxStates: 1000, Limit: 10})
	if r == nil || r.Cost != 1 || len(r.Moves) != 1 {
		t.Fatalf("結果 %+v", r)
	}
}

func TestSolveReturnsNilWhenImpossible(t *testing.T) {
	if r := Solve(ParseRows("HaT"), Opts{MaxStates: 1000, Limit: 10}); r != nil {
		t.Fatalf("解けないはずが %+v", r)
	}
}

func TestSolveUsesNattoWhereNothingElseMoves(t *testing.T) {
	r := Solve(ParseRows("HWT"), Opts{MaxStates: 1000, Limit: 10})
	if r == nil || r.Cost != 2 || !r.HeavyUsed {
		t.Fatalf("結果 %+v", r)
	}
	if Solve(ParseRows("HaT"), Opts{MaxStates: 1000, Limit: 10}) != nil {
		t.Fatal("納豆でなければ解けないはず")
	}
}

func TestSolveWasabiPenaltyAndNoPenalty(t *testing.T) {
	L := ParseRows("H.T/.A.")
	with := Solve(L, Opts{MaxStates: 1000, Limit: 10})
	wall := Solve(L, Opts{MaxStates: 1000, Limit: 10, NoPenalty: true})
	if with == nil || wall == nil || with.Cost != 2 || wall.Cost != 1 {
		t.Fatalf("with=%+v wall=%+v", with, wall)
	}
}

func TestSolveRespectsLimit(t *testing.T) {
	if r := Solve(ParseRows("H..T"), Opts{MaxStates: 1000, Limit: 1}); r != nil {
		t.Fatalf("上限1では解けないはずが %+v", r)
	}
}

func TestReplay(t *testing.T) {
	L := ParseRows("HWT")
	if cost, won, ok := Replay(L, "WW", "UL", false); !ok || !won || cost != 2 {
		t.Fatalf("cost=%d won=%v ok=%v", cost, won, ok)
	}
	if _, _, ok := Replay(L, "H", "R", false); ok {
		t.Fatal("動けない手は失敗にする")
	}
}
