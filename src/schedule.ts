import { AWAY_MS } from "./constants";
import { visit, leave, sushis } from "./world";
import { state, store } from "./store";
import { showBanner } from "./banner";

export function scheduleVisit(): void {
  setTimeout(
    () => {
      visit();
      scheduleVisit();
    },
    60000 + Math.random() * 60000,
  );
}

export function scheduleLeave(): void {
  setTimeout(
    () => {
      leave();
      scheduleLeave();
    },
    120000 + Math.random() * 120000,
  );
}

export function welcomeBack(): void {
  let arrivals = 0;
  if (state.lastVisit > 0) {
    arrivals = Math.min(5, Math.floor((Date.now() - state.lastVisit) / AWAY_MS));
  }
  for (let i = 0; i < arrivals; i++) visit();
  if (arrivals > 0) setTimeout(() => showBanner("るすのあいだに 来てたみたい"), 600);
  while (sushis.length < 3) visit();
}

export function startLastVisitSave(): void {
  setInterval(() => {
    state.lastVisit = Date.now();
    store.save(state);
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      state.lastVisit = Date.now();
      store.save(state);
    }
  });
}
