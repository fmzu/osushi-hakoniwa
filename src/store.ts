import type { SaveState } from "./types";

export const store = {
  load(): SaveState {
    try {
      const v2 = JSON.parse(localStorage.getItem("osushi-zukan-v2") as string);
      if (v2)
        return {
          seen: new Set<string>(v2.seen || []),
          friends: new Set<string>(v2.friends || []),
          greet: v2.greet || {},
          lastVisit: v2.lastVisit || 0,
          wall: v2.wall || "sakura",
        };
      const v1 = JSON.parse(localStorage.getItem("osushi-zukan") || "[]");
      return {
        seen: new Set<string>(v1),
        friends: new Set<string>(v1),
        greet: {},
        lastVisit: 0,
        wall: "sakura",
      };
    } catch {
      return {
        seen: new Set<string>(),
        friends: new Set<string>(),
        greet: {},
        lastVisit: 0,
        wall: "sakura",
      };
    }
  },
  save(st: SaveState): void {
    try {
      localStorage.setItem(
        "osushi-zukan-v2",
        JSON.stringify({
          seen: [...st.seen],
          friends: [...st.friends],
          greet: st.greet,
          lastVisit: st.lastVisit,
          wall: st.wall,
        }),
      );
    } catch {
      // localStorage が使用できない環境では保存をスキップする
    }
  },
};

export const state: SaveState = store.load();
