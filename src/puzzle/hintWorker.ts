// ヒントの探索を画面とは別のスレッドで回す。外れた局面では数秒かかることがあり、
// 画面と同じスレッドで回すとスワイプも描画も止まってしまうため
import type { Move, State } from "./core";
import { findHint } from "./hintMove";
import type { Hint } from "./hintMove";

export type HintRequest = { id: number; state: State; sol: Move[] };
export type HintResponse = { id: number; hint: Hint };

self.onmessage = (e: MessageEvent<HintRequest>) => {
  const { id, state, sol } = e.data;
  const res: HintResponse = { id, hint: findHint(state, sol) };
  self.postMessage(res);
};
