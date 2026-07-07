import { describe, it, expect, beforeEach } from "vite-plus/test";
import { store } from "./store";

describe("store.load", () => {
  beforeEach(() => localStorage.clear());

  it("migrates v1 (osushi-zukan id array) into seen AND friends, and keeps the old key", () => {
    localStorage.setItem("osushi-zukan", JSON.stringify(["salmon", "ikura"]));
    const st = store.load();
    expect([...st.friends].sort()).toEqual(["ikura", "salmon"]);
    expect(st.seen.has("salmon") && st.seen.has("ikura")).toBe(true);
    expect(localStorage.getItem("osushi-zukan")).not.toBeNull();
    expect(st.wall).toBe("sakura");
  });

  it("loads v2 directly and it wins over v1", () => {
    localStorage.setItem("osushi-zukan", JSON.stringify(["salmon"]));
    localStorage.setItem(
      "osushi-zukan-v2",
      JSON.stringify({
        seen: ["toro"],
        friends: ["toro"],
        greet: { toro: 2 },
        lastVisit: 123,
        wall: "yozora",
      }),
    );
    const st = store.load();
    expect([...st.seen]).toEqual(["toro"]);
    expect(st.lastVisit).toBe(123);
    expect(st.wall).toBe("yozora");
  });

  it("empty storage yields the sakura default", () => {
    const st = store.load();
    expect(st.wall).toBe("sakura");
    expect(st.seen.size).toBe(0);
    expect(st.friends.size).toBe(0);
    expect(st.greet).toEqual({});
    expect(st.lastVisit).toBe(0);
  });

  it("falls back to defaults when v2 JSON is corrupted", () => {
    localStorage.setItem("osushi-zukan-v2", "{not valid json");
    const st = store.load();
    expect(st.wall).toBe("sakura");
    expect(st.seen.size).toBe(0);
    expect(st.friends.size).toBe(0);
  });

  it("falls back to defaults when v1 JSON is corrupted and there is no v2", () => {
    localStorage.setItem("osushi-zukan", "{not valid json");
    const st = store.load();
    expect(st.wall).toBe("sakura");
    expect(st.seen.size).toBe(0);
  });
});

describe("store.save / store.load round trip", () => {
  beforeEach(() => localStorage.clear());

  it("persists seen/friends/greet/lastVisit/wall through save then load", () => {
    store.save({
      seen: new Set(["salmon", "toro"]),
      friends: new Set(["salmon"]),
      greet: { salmon: 2, toro: 1 },
      lastVisit: 999,
      wall: "mint",
    });
    const st = store.load();
    expect([...st.seen].sort()).toEqual(["salmon", "toro"]);
    expect([...st.friends]).toEqual(["salmon"]);
    expect(st.greet).toEqual({ salmon: 2, toro: 1 });
    expect(st.lastVisit).toBe(999);
    expect(st.wall).toBe("mint");
  });
});
