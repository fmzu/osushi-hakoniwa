// すしづめの面づくり用ツール。ゲーム本体には含まれない。使い方は README.md
package main

import (
	"fmt"
	"os"
)

const usage = `使い方: go run . <コマンド> [引数]

  export   levels.src.json から src/puzzle/levels.json を書き出す（-ratio で制限倍率）
  solve    盤を解いて最短手数と正解手順を出す
  gen      山登りで面を生成する
`

func main() {
	if len(os.Args) < 2 {
		fmt.Fprint(os.Stderr, usage)
		os.Exit(2)
	}
	cmds := map[string]func([]string) error{
		"export": runExport,
		"solve":  runSolve,
		"gen":    runGen,
	}
	run, ok := cmds[os.Args[1]]
	if !ok {
		fmt.Fprint(os.Stderr, usage)
		os.Exit(2)
	}
	if err := run(os.Args[2:]); err != nil {
		fmt.Fprintln(os.Stderr, "エラー:", err)
		os.Exit(1)
	}
}
