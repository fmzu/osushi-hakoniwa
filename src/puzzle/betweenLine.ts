import { BETWEEN } from "./story";

/** 「次の面へ」の前に暗い画面で出す一言。章の最後の面（3面目）には無い */
export function betweenLine(n: number): string | null {
  return n === 1 || n === 2 ? BETWEEN[n - 1] : null;
}
