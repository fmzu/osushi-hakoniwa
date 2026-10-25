package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"sync"
	"time"
)

type Grid [][]byte

const letters = "abcdefghijklmnopqrstuvwxyz"

func (g Grid) clone() Grid {
	o := make(Grid, len(g))
	for i := range g {
		o[i] = append([]byte(nil), g[i]...)
	}
	return o
}
func (g Grid) rows() []string {
	r := make([]string, len(g))
	for i := range g {
		r[i] = string(g[i])
	}
	return r
}
func (g Grid) empties() [][2]int {
	var e [][2]int
	for y := range g {
		for x := range g[y] {
			if g[y][x] == '.' {
				e = append(e, [2]int{x, y})
			}
		}
	}
	return e
}
func (g Grid) fits(x, y, w, h int) bool {
	if x < 0 || y < 0 || y+h > len(g) || x+w > len(g[0]) {
		return false
	}
	for dy := 0; dy < h; dy++ {
		for dx := 0; dx < w; dx++ {
			if g[y+dy][x+dx] != '.' {
				return false
			}
		}
	}
	return true
}
func (g Grid) put(x, y, w, h int, c byte) {
	for dy := 0; dy < h; dy++ {
		for dx := 0; dx < w; dx++ {
			g[y+dy][x+dx] = c
		}
	}
}
func (g Grid) find(c byte) (int, int, int, int) {
	x0, y0, x1, y1 := 99, 99, -1, -1
	for y := range g {
		for x := range g[y] {
			if g[y][x] == c {
				x0, y0 = min(x0, x), min(y0, y)
				x1, y1 = max(x1, x), max(y1, y)
			}
		}
	}
	return x0, y0, x1 - x0 + 1, y1 - y0 + 1
}
func (g Grid) has(c byte) bool {
	for _, r := range g {
		for _, v := range r {
			if v == c {
				return true
			}
		}
	}
	return false
}
func (g Grid) freeLetter() byte {
	for i := 0; i < len(letters); i++ {
		if !g.has(letters[i]) {
			return letters[i]
		}
	}
	return 0
}
func (g Grid) ids() []byte {
	var out []byte
	seen := map[byte]bool{}
	for _, r := range g {
		for _, v := range r {
			if v != '.' && !seen[v] {
				seen[v] = true
				out = append(out, v)
			}
		}
	}
	return out
}

type Cfg struct {
	Ch, W, H, Lo, Hi, Natto, Was, Big, MinE int
}

func mutate(rng *rand.Rand, g0 Grid, c Cfg) Grid {
	g := g0.clone()
	switch rng.Intn(5) {
	case 0: // 空きを埋める
		e := g.empties()
		if len(e) <= c.MinE {
			return nil
		}
		l := g.freeLetter()
		if l == 0 {
			return nil
		}
		p := e[rng.Intn(len(e))]
		g[p[1]][p[0]] = l
		return g
	case 1, 2: // コマを別の場所へ
		ids := g.ids()
		id := ids[rng.Intn(len(ids))]
		x, y, w, h := g.find(id)
		g.put(x, y, w, h, '.')
		e := g.empties()
		for i := 0; i < 20; i++ {
			p := e[rng.Intn(len(e))]
			if g.fits(p[0], p[1], w, h) {
				g.put(p[0], p[1], w, h, id)
				return g
			}
		}
		return nil
	case 3: // 伸ばす・縮める
		ids := g.ids()
		id := ids[rng.Intn(len(ids))]
		if id < 'a' || id > 'z' {
			return nil
		}
		x, y, w, h := g.find(id)
		if w*h == 1 {
			g[y][x] = '.'
			nw, nh := 2, 1
			if rng.Intn(2) == 0 {
				nw, nh = 1, 2
			}
			if g.fits(x, y, nw, nh) {
				g.put(x, y, nw, nh, id)
				return g
			}
			return nil
		}
		if w*h == 2 {
			g.put(x, y, w, h, '.')
			g[y][x] = id
			return g
		}
		return nil
	default: // 乗客を1つ消す（空きが増える）
		ids := g.ids()
		id := ids[rng.Intn(len(ids))]
		if id < 'a' || id > 'z' {
			return nil
		}
		x, y, w, h := g.find(id)
		if w == 2 && h == 2 {
			return nil
		}
		g.put(x, y, w, h, '.')
		return g
	}
}

func seed(rng *rand.Rand, c Cfg) Grid {
	for {
		g := make(Grid, c.H)
		for y := range g {
			g[y] = []byte(strings.Repeat(".", c.W))
		}
		g[rng.Intn(2)][rng.Intn(c.W)] = 'T'
		for {
			x, y := rng.Intn(c.W), c.H-1-rng.Intn(2)
			if g[y][x] == '.' {
				g[y][x] = 'H'
				break
			}
		}
		place := func(ch byte, w, h int) bool {
			for i := 0; i < 50; i++ {
				e := g.empties()
				p := e[rng.Intn(len(e))]
				if g.fits(p[0], p[1], w, h) {
					g.put(p[0], p[1], w, h, ch)
					return true
				}
			}
			return false
		}
		ok := true
		if c.Natto > 0 {
			ok = ok && place('W', 1, 1)
		}
		for i := 0; i < c.Was; i++ {
			ok = ok && place(byte('1'+i), 1, 1)
		}
		li := 0
		for i := 0; i < c.Big; i++ {
			ok = ok && place(letters[li], 2, 2)
			li++
		}
		for len(g.empties()) > 9 && li < 20 {
			r := rng.Float64()
			w, h := 1, 1
			if r > 0.7 {
				w, h = 1, 2
			} else if r > 0.4 {
				w, h = 2, 1
			}
			place(letters[li], w, h)
			li++
		}
		if ok && Solve(Parse(g.rows()), Opts{MaxStates: 300000, Limit: c.Hi}) != nil {
			return g
		}
	}
}

// Rec は条件を満たした面の記録。rows は levels.src.json にそのまま貼れる形
type Rec struct {
	Ch     int    `json:"ch"`
	Rows   string `json:"rows"`
	Cost   int    `json:"c"`
	States int    `json:"states"`
	DW     int    `json:"dW,omitempty"`
	DA     int    `json:"dA,omitempty"`
	Wk     int    `json:"w"`
}

// evaluate: 手数が多いほど、仕掛けが効いているほど高い。rec は条件を満たしたときだけ
func evaluate(g Grid, c Cfg) (int, *Rec) {
	rows := g.rows()
	L := Parse(rows)
	r := Solve(L, Opts{MaxStates: 120_000, Limit: c.Hi})
	if r == nil {
		return -1, nil
	}
	rec := &Rec{Ch: c.Ch, Rows: strings.Join(rows, "/"), Cost: r.Cost, States: r.States}
	score := r.Cost
	ok := r.Cost >= c.Lo
	if r.Cost < c.Lo-8 {
		return score, nil
	}
	if c.Natto > 0 {
		M := Parse(rows)
		for i := range M.Pieces {
			if M.Pieces[i].Kind == Heavy {
				M.Pieces[i].Kind = Mob
			}
		}
		m := Solve(M, Opts{MaxStates: 120_000, Limit: c.Hi + 12})
		rec.DW = 12
		if m != nil {
			rec.DW = m.Cost - r.Cost
		}
		if !r.HeavyUsed {
			rec.DW = min(rec.DW, 0)
		}
		score += 2 * min(max(rec.DW, -2), 3)
		ok = ok && rec.DW >= 2
	}
	if c.Was > 0 {
		w := Solve(L, Opts{MaxStates: 120_000, Limit: c.Hi, NoPenalty: true})
		if w == nil { // 比較用の計算が上限を超えた盤は評価しない
			return -1, nil
		}
		rec.DA = r.Cost - w.Cost
		score += 2 * min(rec.DA, 3)
		ok = ok && rec.DA >= 2
	}
	if !ok {
		return score, nil
	}
	return score, rec
}

// runGen は山登りで面を生成する。条件を満たした面を1行1JSONで標準出力に流す
func runGen(args []string) error {
	fs := flag.NewFlagSet("gen", flag.ContinueOnError)
	secs := fs.Int("secs", 600, "探索する秒数")
	workers := fs.Int("workers", 1, "並列数")
	var c Cfg
	fs.IntVar(&c.Ch, "ch", 1, "章の番号（出力に付くだけ）")
	fs.IntVar(&c.W, "w", 6, "盤の幅")
	fs.IntVar(&c.H, "h", 5, "盤の高さ")
	fs.IntVar(&c.Lo, "lo", 10, "最短手数の下限")
	fs.IntVar(&c.Hi, "hi", 14, "最短手数の上限（探索の打ち切り）")
	fs.IntVar(&c.Natto, "natto", 0, "納豆の数（1以上なら、納豆を普通の乗客にすると2手以上増えることを要求）")
	fs.IntVar(&c.Was, "was", 0, "わさびの数（1以上なら、わさびをただの壁にすると2手以上減ることを要求）")
	fs.IntVar(&c.Big, "big", 0, "2×2の太巻きの数")
	fs.IntVar(&c.MinE, "mine", 2, "空きマスの最小数")
	if err := fs.Parse(args); err != nil {
		return err
	}
	var mu sync.Mutex
	seen := map[string]bool{}
	var wg sync.WaitGroup
	deadline := time.Now().Add(time.Duration(*secs) * time.Second)
	for wi := 0; wi < *workers; wi++ {
		wg.Add(1)
		go func(wi int) {
			defer wg.Done()
			rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(wi)*7919))
			cur := seed(rng, c)
			curC, _ := evaluate(cur, c)
			stall := 0
			evals, best := 0, 0
			hist := map[int]int{}
			defer func() { fmt.Fprintf(os.Stderr, "w%d evals=%d best=%d hist=%v\n", wi, evals, best, hist) }()
			for time.Now().Before(deadline) {
				g := mutate(rng, cur, c)
				if g == nil {
					continue
				}
				sc, rec := evaluate(g, c)
				evals++
				if sc >= 0 {
					hist[sc/4*4]++
					best = max(best, sc)
				}
				if sc < 0 {
					stall++
				} else if sc >= curC {
					if sc > curC {
						stall = 0
					} else {
						stall++
					}
					cur, curC = g, sc
				} else {
					stall++
				}
				if stall > 300 {
					cur = seed(rng, c)
					curC, _ = evaluate(cur, c)
					stall = 0
				}
				if rec != nil {
					rec.Wk = wi
					k := rec.Rows
					mu.Lock()
					if !seen[k] {
						seen[k] = true
						b, _ := json.Marshal(rec)
						fmt.Println(string(b))
					}
					mu.Unlock()
				}
			}
		}(wi)
	}
	wg.Wait()
	return nil
}
