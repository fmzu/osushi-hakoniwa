package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"math"
	"os"
)

// srcLevel は levels.src.json の1面。人が編集する元データ
type srcLevel struct {
	Chapter int    `json:"chapter"`
	Who     string `json:"who"`
	N       int    `json:"n"`
	Rows    string `json:"rows"`
}

// outLevel は src/puzzle/levels.json の1面。srcLevel に計算結果を足したもの
type outLevel struct {
	Chapter int    `json:"chapter"`
	Who     string `json:"who"`
	N       int    `json:"n"`
	Rows    string `json:"rows"`
	Best    int    `json:"best"`
	Limit   int    `json:"limit"`
	Sol     string `json:"sol"`
}

// LimitFor は最短手数 best に倍率 ratio をかけて切り上げた制限手数。
// 1.3 * 10 のような浮動小数点の誤差で 1 ずれないよう、ごく小さい値を引いてから切り上げる
func LimitFor(best int, ratio float64) int {
	return int(math.Ceil(float64(best)*ratio - 1e-9))
}

// SolString は手順を "dL pL cU ..."（駒の文字+向きU/D/L/R）の文字列にする。
// 納豆を拾い集める手は向きを問わないので U にする
func SolString(L Level, moves []Move) string {
	var b bytes.Buffer
	for i, m := range moves {
		if i > 0 {
			b.WriteByte(' ')
		}
		d := m.Dir
		if d == armingAt {
			d = 0
		}
		b.WriteByte(L.Pieces[m.Piece].ID)
		b.WriteByte(dirLetters[d])
	}
	return b.String()
}

// BuildLevel は元データ1面から、最短手数・制限・正解手順を計算する
func BuildLevel(s srcLevel, ratio float64) (outLevel, error) {
	L := ParseRows(s.Rows)
	r := Solve(L, Opts{MaxStates: 10_000_000, Limit: 99})
	if r == nil {
		return outLevel{}, fmt.Errorf("%d-%d: 解けない（rows=%s）", s.Chapter, s.N, s.Rows)
	}
	return outLevel{
		Chapter: s.Chapter, Who: s.Who, N: s.N, Rows: s.Rows,
		Best: r.Cost, Limit: LimitFor(r.Cost, ratio), Sol: SolString(L, r.Moves),
	}, nil
}

// runExport は levels.src.json を読み、levels.json を書き出す
func runExport(args []string) error {
	fs := flag.NewFlagSet("export", flag.ContinueOnError)
	src := fs.String("src", "levels.src.json", "面の元データ")
	out := fs.String("out", "../../src/puzzle/levels.json", "書き出す先")
	ratio := fs.Float64("ratio", 1.3, "制限手数 = ceil(最短手数 × ratio)")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *ratio < 1 {
		return errors.New("ratio は 1 以上にしてください")
	}
	raw, err := os.ReadFile(*src)
	if err != nil {
		return err
	}
	var in []srcLevel
	if err := json.Unmarshal(raw, &in); err != nil {
		return fmt.Errorf("%s: %w", *src, err)
	}
	res := make([]outLevel, 0, len(in))
	for _, s := range in {
		o, err := BuildLevel(s, *ratio)
		if err != nil {
			return err
		}
		res = append(res, o)
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	if err := enc.Encode(res); err != nil {
		return err
	}
	return os.WriteFile(*out, buf.Bytes(), 0o644)
}
