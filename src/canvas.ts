import { W, H } from "./constants";

export const cv = document.getElementById("cv") as HTMLCanvasElement;
export const ctx = cv?.getContext("2d") as CanvasRenderingContext2D;
if (cv) {
  cv.width = W;
  cv.height = H;
}
if (ctx) ctx.imageSmoothingEnabled = false;
