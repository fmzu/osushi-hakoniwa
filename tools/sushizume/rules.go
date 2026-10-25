package main

// すしづめのルールと最短手数ソルバー。
//
// ルールの正は src/puzzle/core.ts。ここはそれを高速に解くための Go 実装で、
// ルールを変えたら必ず両方を同じに直すこと（README.md にルール一覧がある）。

import "strings"

// 駒の種類
const (
	Hero   = iota // 主人公（宇宙人）
	Target        // ターゲット（鯛）。動かない
	Mob           // 乗客（寿司）
	Heavy         // 納豆。動かすのに2手かかる。1×1の駒と入れ替われる
	Angry         // わさび。動かない。主人公が新たに隣に入ると手数+1
)

// 向き。添字は dirs / dirLetters と対応する
var (
	dirs       = [4][2]int{{0, -1}, {0, 1}, {-1, 0}, {1, 0}}
	dirNames   = [4]string{"up", "down", "left", "right"}
	dirLetters = [4]byte{'U', 'D', 'L', 'R'}
)

const (
	noArmed  = 255 // 納豆を拾い集めていない
	armingAt = -1  // Move.Dir の値。納豆を拾い集める手（向きは問わない）
)

// Piece は盤上の駒。ID は文字盤の文字
type Piece struct {
	ID         byte
	Kind       int
	X, Y, W, H int
}

// Level は文字盤を読んだ盤。Pieces は可動コマが先、固定コマ（ターゲット・わさび）が後
type Level struct {
	W, H   int
	Pieces []Piece
	NMov   int
}

// Move は1手。Piece は Level.Pieces の添字
type Move struct {
	Piece int
	Dir   int
}

// state は可動コマの (x,y) を並べたもの + 最後に、拾い集めている納豆の番号(noArmed=なし)
type state []byte

func kindOf(c byte) int {
	switch {
	case c == 'H':
		return Hero
	case c == 'T':
		return Target
	case c == 'W':
		return Heavy
	case c == 'A' || (c >= '0' && c <= '9'):
		return Angry
	}
	return Mob
}

// Parse は文字盤から盤を作る。H=主人公 T=ターゲット W=納豆 A か数字=わさび .=空き、
// その他の文字=乗客。同じ文字が隣接していれば1つの矩形駒
func Parse(rows []string) Level {
	h, w := len(rows), len(rows[0])
	done := map[byte]bool{}
	var mov, fix []Piece
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			c := rows[y][x]
			if c == '.' || done[c] {
				continue
			}
			pw := 0
			for x+pw < w && rows[y][x+pw] == c {
				pw++
			}
			ph := 0
		outer:
			for y+ph < h {
				for i := 0; i < pw; i++ {
					if rows[y+ph][x+i] != c {
						break outer
					}
				}
				ph++
			}
			p := Piece{c, kindOf(c), x, y, pw, ph}
			if p.Kind == Target || p.Kind == Angry {
				fix = append(fix, p)
			} else {
				mov = append(mov, p)
			}
			done[c] = true
		}
	}
	return Level{w, h, append(mov, fix...), len(mov)}
}

// ParseRows は "h.dpjT/nrfckk/..." の形の文字盤を読む
func ParseRows(s string) Level {
	return Parse(strings.Split(s, "/"))
}

func overlap(ax, ay, aw, ah, bx, by, bw, bh int) bool {
	return ax < bx+bw && bx < ax+aw && ay < by+bh && by < ay+ah
}

// adjacent は、重なっておらず辺で接しているか
func adjacent(ax, ay, aw, ah, bx, by, bw, bh int) bool {
	if overlap(ax, ay, aw, ah, bx, by, bw, bh) {
		return false
	}
	tX := ax+aw == bx || bx+bw == ax
	tY := ay+ah == by || by+bh == ay
	oX := ax < bx+bw && bx < ax+aw
	oY := ay < by+bh && by < ay+ah
	return (tX && oY) || (tY && oX)
}

func (L Level) heroIndex() int {
	for i, p := range L.Pieces {
		if p.Kind == Hero {
			return i
		}
	}
	return -1
}

func (L Level) start() state {
	s := make(state, L.NMov*2+1)
	for i := 0; i < L.NMov; i++ {
		s[i*2], s[i*2+1] = byte(L.Pieces[i].X), byte(L.Pieces[i].Y)
	}
	s[L.NMov*2] = noArmed
	return s
}

// at は駒 i の現在位置。固定コマは state を持たず初期位置のまま
func (L Level) at(s state, i int) (int, int) {
	if i < L.NMov {
		return int(s[i*2]), int(s[i*2+1])
	}
	return L.Pieces[i].X, L.Pieces[i].Y
}

// won は主人公がターゲットの隣に立っているか
func (L Level) won(s state) bool {
	hero := L.heroIndex()
	hp := L.Pieces[hero]
	hx, hy := L.at(s, hero)
	for _, t := range L.Pieces {
		if t.Kind == Target && adjacent(hx, hy, hp.W, hp.H, t.X, t.Y, t.W, t.H) {
			return true
		}
	}
	return false
}

// grid は各マスにいる駒の番号（空きは -1）
func (L Level) grid(s state) []int {
	g := make([]int, L.W*L.H)
	for i := range g {
		g[i] = -1
	}
	for i, p := range L.Pieces {
		px, py := L.at(s, i)
		for dy := 0; dy < p.H; dy++ {
			for dx := 0; dx < p.W; dx++ {
				g[(py+dy)*L.W+px+dx] = i
			}
		}
	}
	return g
}

// applyMove は駒 i を向き di に動かす。動けなければ ok=false。
// 納豆が拾い集めていなければ、向きに関わらず「拾い集める」手になる（盤は変わらず cost=1）。
// 主人公が動いたとき、新たに隣に入ったわさび1つにつき cost+1（noPenalty なら加算しない）
func (L Level) applyMove(s state, g []int, i, di int, noPenalty bool) (ns state, cost int, arming, ok bool) {
	n := L.NMov
	p := L.Pieces[i]
	if i >= n { // ターゲットとわさびは動かない
		return nil, 0, false, false
	}
	px, py := int(s[i*2]), int(s[i*2+1])
	if p.Kind == Heavy && int(s[n*2]) != i {
		ns = append(state(nil), s...)
		ns[n*2] = byte(i)
		return ns, 1, true, true
	}
	nx, ny := px+dirs[di][0], py+dirs[di][1]
	if nx < 0 || ny < 0 || nx+p.W > L.W || ny+p.H > L.H {
		return nil, 0, false, false
	}
	var hits []int
	for dy := 0; dy < p.H; dy++ {
		for dx := 0; dx < p.W; dx++ {
			h := g[(ny+dy)*L.W+nx+dx]
			if h < 0 || h == i {
				continue
			}
			dup := false
			for _, k := range hits {
				if k == h {
					dup = true
				}
			}
			if !dup {
				hits = append(hits, h)
			}
		}
	}
	hero := L.heroIndex()
	ns = append(state(nil), s...)
	ns[n*2] = noArmed
	heroMoved := false
	var heroBefore [2]int
	switch {
	case len(hits) == 0:
		ns[i*2], ns[i*2+1] = byte(nx), byte(ny)
		if i == hero {
			heroMoved, heroBefore = true, [2]int{px, py}
		}
	case p.Kind == Heavy && len(hits) == 1 && p.W == 1 && p.H == 1 && hits[0] < n:
		// 納豆は1×1の可動コマと入れ替われる
		v := L.Pieces[hits[0]]
		if v.W != 1 || v.H != 1 {
			return nil, 0, false, false
		}
		ns[i*2], ns[i*2+1] = byte(nx), byte(ny)
		ns[hits[0]*2], ns[hits[0]*2+1] = byte(px), byte(py)
		if hits[0] == hero {
			heroMoved, heroBefore = true, [2]int{nx, ny}
		}
	default:
		return nil, 0, false, false
	}
	cost = 1
	if heroMoved && !noPenalty {
		hp := L.Pieces[hero]
		ax, ay := int(ns[hero*2]), int(ns[hero*2+1])
		for _, a := range L.Pieces {
			if a.Kind != Angry {
				continue
			}
			if adjacent(ax, ay, hp.W, hp.H, a.X, a.Y, a.W, a.H) &&
				!adjacent(heroBefore[0], heroBefore[1], hp.W, hp.H, a.X, a.Y, a.W, a.H) {
				cost++
			}
		}
	}
	return ns, cost, false, true
}

// Opts は Solve の設定
type Opts struct {
	NoPenalty bool // わさびのペナルティなし（ただの壁として扱う）
	MaxStates int  // 探索する状態数の上限
	Limit     int  // これを超える手数は探さない
}

// Result は Solve の結果
type Result struct {
	Cost      int
	States    int
	HeavyUsed bool
	Moves     []Move
}

// Solve は最小コストの手順を返す。Limit 以内で解けなければ nil
func Solve(L Level, o Opts) *Result {
	type node struct {
		parent int
		move   Move
	}
	start := L.start()
	idx := map[string]int{string(start): 0}
	states := []state{start}
	nodes := []node{{-1, Move{}}}
	dist := []int{0}
	buckets := make([][]int, o.Limit+3)
	buckets[0] = []int{0}
	push := func(ns state, d, from int, m Move) {
		k := string(ns)
		if j, ok := idx[k]; ok {
			if d < dist[j] {
				dist[j] = d
				nodes[j] = node{from, m}
				buckets[d] = append(buckets[d], j)
			}
			return
		}
		j := len(states)
		idx[k] = j
		states = append(states, ns)
		nodes = append(nodes, node{from, m})
		dist = append(dist, d)
		buckets[d] = append(buckets[d], j)
	}
	for d := 0; d <= o.Limit; d++ {
		for bi := 0; bi < len(buckets[d]); bi++ {
			cur := buckets[d][bi]
			if dist[cur] != d {
				continue
			}
			s := states[cur]
			if L.won(s) {
				r := &Result{Cost: d, States: len(states)}
				for c := cur; nodes[c].parent >= 0; c = nodes[c].parent {
					r.Moves = append([]Move{nodes[c].move}, r.Moves...)
					if L.Pieces[nodes[c].move.Piece].Kind == Heavy {
						r.HeavyUsed = true
					}
				}
				return r
			}
			if len(states) > o.MaxStates {
				return nil
			}
			g := L.grid(s)
			for i := 0; i < L.NMov; i++ {
				for di := range dirs {
					ns, cost, arming, ok := L.applyMove(s, g, i, di, o.NoPenalty)
					if !ok {
						continue
					}
					if d+cost <= o.Limit {
						m := Move{i, di}
						if arming {
							m.Dir = armingAt
						}
						push(ns, d+cost, cur, m)
					}
					if arming {
						break // 向きを問わないので1回で足りる
					}
				}
			}
		}
	}
	return nil
}

// Replay は手順を最初から再生し、総コストと、最後に勝っているかを返す。
// 動けない手が混じっていたら ok=false。ids は駒の文字、letters は U/D/L/R
func Replay(L Level, ids, letters string, noPenalty bool) (cost int, won, ok bool) {
	s := L.start()
	for k := 0; k < len(ids); k++ {
		piece := -1
		for i, p := range L.Pieces {
			if p.ID == ids[k] {
				piece = i
			}
		}
		di := -1
		for d, l := range dirLetters {
			if l == letters[k] {
				di = d
			}
		}
		if piece < 0 || di < 0 {
			return 0, false, false
		}
		ns, c, _, moved := L.applyMove(s, L.grid(s), piece, di, noPenalty)
		if !moved {
			return 0, false, false
		}
		s, cost = ns, cost+c
	}
	return cost, L.won(s), true
}
