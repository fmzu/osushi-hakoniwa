package main

import (
	"encoding/json"
	"fmt"
)

// runSolve は盤（"h.dpjT/nrfckk/..." の形）を解いて、結果を1盤1行のJSONで出す。
// wall はわさびをただの壁にしたときの最短手数
func runSolve(args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("盤を指定してください（例: solve 'h.dpjT/nrfckk/tofgie/mbbaiH/m.qqsl'）")
	}
	for _, a := range args {
		L := ParseRows(a)
		o := Opts{MaxStates: 5_000_000, Limit: 99}
		r := Solve(L, o)
		if r == nil {
			return fmt.Errorf("解けない: %s", a)
		}
		o.NoPenalty = true
		w := Solve(L, o)
		var mv []map[string]string
		for _, m := range r.Moves {
			d := "up" // 納豆を拾い集める手は向きを問わない
			if m.Dir != armingAt {
				d = dirNames[m.Dir]
			}
			mv = append(mv, map[string]string{"id": string(L.Pieces[m.Piece].ID), "dir": d})
		}
		out := map[string]any{
			"rows": a, "cost": r.Cost, "states": r.States, "heavy": r.HeavyUsed,
			"sol": SolString(L, r.Moves), "moves": mv,
		}
		if w != nil {
			out["wall"] = w.Cost
		}
		b, _ := json.Marshal(out)
		fmt.Println(string(b))
	}
	return nil
}
