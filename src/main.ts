import "./style.css";
import { SPECIES } from "./species";
import { bakeAllSprites } from "./sprites";
import { draw } from "./render";
import { tick } from "./world";
import { updateZukanCount, initZukan } from "./zukan";
import { initInput } from "./input";
import { initBell } from "./bell";
import { initWallModal } from "./wallModal";
import { STORY_ONLY_SPECIES } from "./residents/residents";
import { spawnResidents } from "./residents/spawnResidents";
import { updateBubbles } from "./residents/updateBubbles";
import { scheduleVisit, scheduleLeave, welcomeBack, startLastVisitSave } from "./schedule";
if (import.meta.env.DEV) {
  const { initDebugExpose } = await import("./debugExpose");
  initDebugExpose();
}

bakeAllSprites([...SPECIES, ...STORY_ONLY_SPECIES]);

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
  updateBubbles();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

scheduleVisit();
scheduleLeave();
startLastVisitSave();
spawnResidents();
welcomeBack();
