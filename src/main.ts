import "./style.css";
import { SPECIES } from "./species";
import { bakeAllSprites } from "./sprites";
import { draw } from "./render";
import { tick } from "./world";
import { updateZukanCount, initZukan } from "./zukan";
import { initInput } from "./input";
import { initBell } from "./bell";
import { initWallModal } from "./wallModal";
import { scheduleVisit, scheduleLeave, welcomeBack, startLastVisitSave } from "./schedule";
import { initDebugExpose } from "./debugExpose";

initDebugExpose();
bakeAllSprites(SPECIES);

initInput();
initBell();
initZukan();
initWallModal();

updateZukanCount();

let last = performance.now();
function loop(now: number): void {
  tick(Math.min((now || last) - last, 100));
  last = now || last;
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

scheduleVisit();
scheduleLeave();
startLastVisitSave();
welcomeBack();
