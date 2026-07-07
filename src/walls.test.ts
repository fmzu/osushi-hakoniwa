import { describe, it, expect } from "vite-plus/test";
import { currentWall, WALLS } from "./walls";

describe("currentWall", () => {
  it("returns the matching wall by id", () => {
    expect(currentWall("yozora").id).toBe("yozora");
  });

  it("falls back to the first wall for an unknown id", () => {
    expect(currentWall("does-not-exist")).toBe(WALLS[0]);
  });

  it("falls back to the first wall for an empty id", () => {
    expect(currentWall("")).toBe(WALLS[0]);
  });

  it("the default first wall is sakura", () => {
    expect(WALLS[0].id).toBe("sakura");
  });
});
