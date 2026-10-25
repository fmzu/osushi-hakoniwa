package main

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

const levelsJSON = "../../src/puzzle/levels.json"

func readJSON(t *testing.T, path string, v any) {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, v); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
}

// ゲームが実際に読む src/puzzle/levels.json の15面すべてで、Go の結果と TS 側の期待が一致する。
// ルールが TS とずれると、ここが落ちる。
func TestShippedLevelsAgreeWithSolver(t *testing.T) {
	var levels []outLevel
	readJSON(t, levelsJSON, &levels)
	if len(levels) != 15 {
		t.Fatalf("面の数は %d、期待は 15", len(levels))
	}
	for _, lv := range levels {
		name := lv.Who + " " + string(rune('0'+lv.Chapter)) + "-" + string(rune('0'+lv.N))
		t.Run(name, func(t *testing.T) {
			L := ParseRows(lv.Rows)
			r := Solve(L, Opts{MaxStates: 10_000_000, Limit: 99})
			if r == nil || r.Cost != lv.Best {
				t.Fatalf("Go の最短は %+v、levels.json の best は %d", r, lv.Best)
			}
			if lv.Limit != LimitFor(lv.Best, 1.3) {
				t.Errorf("limit=%d、期待は %d", lv.Limit, LimitFor(lv.Best, 1.3))
			}
			// levels.json に書かれた正解手順（文字列）を独立に読み直して再生する
			var ids, letters strings.Builder
			for _, m := range strings.Fields(lv.Sol) {
				ids.WriteByte(m[0])
				letters.WriteByte(m[1])
			}
			cost, won, ok := Replay(L, ids.String(), letters.String(), false)
			if !ok || !won || cost != lv.Best {
				t.Errorf("正解手順の再生: ok=%v won=%v cost=%d、期待は best=%d", ok, won, cost, lv.Best)
			}
		})
	}
}

// levels.src.json から計算し直した結果が levels.json と一致する（export し忘れの検出）
func TestShippedLevelsMatchSource(t *testing.T) {
	var src []srcLevel
	var shipped []outLevel
	readJSON(t, "levels.src.json", &src)
	readJSON(t, levelsJSON, &shipped)
	if len(src) != len(shipped) {
		t.Fatalf("元データ %d 面、levels.json %d 面", len(src), len(shipped))
	}
	for i, s := range src {
		got, err := BuildLevel(s, 1.3)
		if err != nil {
			t.Fatal(err)
		}
		if got != shipped[i] {
			t.Errorf("%d-%d が古い。go run . export をやり直してください\n got  %+v\n have %+v", s.Chapter, s.N, got, shipped[i])
		}
	}
}

func TestLimitFor(t *testing.T) {
	cases := []struct {
		best  int
		ratio float64
		want  int
	}{
		{10, 1.3, 13}, // 1.3*10 の浮動小数点誤差で14にならない
		{12, 1.3, 16},
		{20, 1.3, 26},
		{10, 1.0, 10},
		{10, 1.5, 15},
		{11, 1.5, 17},
	}
	for _, c := range cases {
		if got := LimitFor(c.best, c.ratio); got != c.want {
			t.Errorf("LimitFor(%d, %v)=%d、期待は %d", c.best, c.ratio, got, c.want)
		}
	}
}
