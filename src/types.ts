export type Grid = string[];

export type Overlay = {
  stretch: Grid;
  scrunch: Grid;
};

export type Shape = {
  stretch: Grid;
  scrunch: Grid;
  band?: { stretch: [number, number]; scrunch: [number, number] };
};

export type Palette = Record<string, string>;

export type Species = {
  id: string;
  name: string;
  seikaku: string;
  shape: Shape;
  rarity: number;
  pal: Palette;
  overlay?: Overlay;
  step: number;
  pauseP: number;
  pauseLen: [number, number];
  heartP: number;
  flipP: number;
  driftP: number;
  spr?: Record<string, [HTMLCanvasElement, HTMLCanvasElement]>;
  shadow?: HTMLCanvasElement;
};

export type Wall = {
  id: string;
  name: string;
  wall: string;
  line: string;
  base: string;
};

export type Sushi = {
  sp: Species;
  x: number;
  y: number;
  dir: number;
  frame: number;
  timer: number;
  pause: number;
};

export type Heart = {
  x: number;
  y: number;
  life: number;
};

export type SaveState = {
  seen: Set<string>;
  friends: Set<string>;
  greet: Record<string, number>;
  lastVisit: number;
  wall: string;
};
