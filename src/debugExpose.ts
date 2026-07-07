import { SPECIES } from "./species";
import { sushis, spawn, visit, leave } from "./world";
import { state, store } from "./store";
import { greet } from "./input";
import { renderZukan } from "./zukan";

// 移行前(素のスクリプト)では SPECIES/sushis/state/spawn/visit/leave/greet/renderZukan 等の
// トップレベル変数・関数がグローバルスコープからそのまま参照できた(devtoolsコンソールや
// ヘッドレススモークテストが直接呼べた)。ESモジュール化するとこれらはモジュールスコープに
// 閉じるため、この関数で同じ参照可能性を window に復元し、挙動パリティ検証を可能にする。
export function initDebugExpose(): void {
  Object.assign(window as unknown as Record<string, unknown>, {
    SPECIES,
    sushis,
    state,
    store,
    spawn,
    visit,
    leave,
    greet,
    renderZukan,
  });
}
