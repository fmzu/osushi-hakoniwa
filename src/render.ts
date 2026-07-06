import { W, H, GROUND_TOP } from "./constants";
import { ctx } from "./canvas";
import { sushis, hearts } from "./world";
import { currentWall } from "./walls";
import { state } from "./store";

export function drawHeart(x: number, y: number, a: number): void {
  ctx.globalAlpha = a;
  ctx.fillStyle = "#F783A1";
  const px = [
    [1, 0],
    [3, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [2, 3],
  ];
  for (const [dx, dy] of px) ctx.fillRect(Math.round(x) + dx - 2, Math.round(y) + dy - 2, 1, 1);
  ctx.globalAlpha = 1;
}
export function draw(): void {
  ctx.fillStyle = "#FFEAF1";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FBD3E0";
  for (let y = 4; y < H; y += 12)
    for (let x = (y / 12) % 2 ? 10 : 4; x < W; x += 12) ctx.fillRect(x, y, 1, 1);
  const cw = currentWall(state.wall);
  ctx.fillStyle = cw.wall;
  ctx.fillRect(0, 0, W, GROUND_TOP - 2);
  ctx.fillStyle = cw.line;
  for (let x = 8; x < W; x += 16) ctx.fillRect(x, 0, 1, GROUND_TOP - 2);
  ctx.fillStyle = cw.base;
  ctx.fillRect(0, GROUND_TOP - 2, W, 1);
  const sorted = [...sushis].sort((a, b) => a.y - b.y);
  for (const s of sorted) {
    ctx.drawImage(
      s.sp.spr![String(s.dir)][s.pause > 0 ? 0 : s.frame],
      Math.round(s.x),
      Math.round(s.y),
    );
  }
  for (const h of hearts) drawHeart(h.x, h.y, Math.max(0, h.life));
}
