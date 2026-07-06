import type { Wall } from "./types";

export const WALLS: Wall[] = [
  { id: "sakura", name: "さくら", wall: "#FFD0DE", line: "#EFA9C0", base: "#E59AAF" },
  { id: "woodL", name: "きの枠(明)", wall: "#D8B083", line: "#BE9560", base: "#9E7544" },
  { id: "woodD", name: "きの枠(暗)", wall: "#B5895A", line: "#9A6F44", base: "#7A5230" },
  { id: "mint", name: "ミント", wall: "#D9EEDC", line: "#B2DBBA", base: "#93C79E" },
  { id: "sora", name: "そら", wall: "#D6ECF7", line: "#AAD4EC", base: "#88BEDD" },
  { id: "yozora", name: "よぞら", wall: "#3A4668", line: "#2C3652", base: "#5A6788" },
];

export function currentWall(wallId: string): Wall {
  return WALLS.find((w) => w.id === wallId) || WALLS[0];
}
