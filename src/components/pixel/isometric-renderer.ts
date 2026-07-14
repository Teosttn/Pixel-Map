import {
  landmarkForTab,
  projectTile,
  type IsoMetrics,
  type Landmark,
  type MapTab,
  type Terrain,
  type WorldTile
} from "./isometric";

export type RenderedLandmark = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type DrawWorldOptions = {
  width: number;
  height: number;
  size: number;
  metrics: IsoMetrics;
  tabs: MapTab[];
  activeId: string | null;
  pointer: { x: number; y: number } | null;
  time: number;
  devicePixelRatio: number;
};

const terrainPalette: Record<Terrain, readonly [string, string, string]> = {
  grass: ["#7acb79", "#579b5c", "#3e7448"],
  water: ["#61c7d4", "#3e9eae", "#287786"],
  stone: ["#bec6c1", "#7e8988", "#596363"],
  path: ["#f2b84b", "#b88233", "#76541f"]
};

const landmarkPalette = ["#7acb79", "#61c7d4", "#f2b84b", "#e26773", "#8b7bd8", "#e7dfca"];
const terrainCache = new Map<string, HTMLCanvasElement>();

function colorForLandmark(index: number) {
  return landmarkPalette[index % landmarkPalette.length];
}

function diamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  context.beginPath();
  context.moveTo(x, y - height / 2);
  context.lineTo(x + width / 2, y);
  context.lineTo(x, y + height / 2);
  context.lineTo(x - width / 2, y);
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

function drawTile(
  context: CanvasRenderingContext2D,
  tile: WorldTile,
  metrics: IsoMetrics,
  neighbors: Map<string, WorldTile>
) {
  const point = projectTile(tile, metrics);
  const [top, left, right] = terrainPalette[tile.terrain];
  const west = neighbors.get(`${tile.x - 1}:${tile.y}`)?.elevation ?? 0;
  const north = neighbors.get(`${tile.x}:${tile.y - 1}`)?.elevation ?? 0;

  if (tile.elevation > west) {
    context.beginPath();
    context.moveTo(point.x - metrics.tileWidth / 2, point.y);
    context.lineTo(point.x, point.y + metrics.tileHeight / 2);
    context.lineTo(point.x, point.y + metrics.tileHeight / 2 + tile.elevation * metrics.levelHeight);
    context.lineTo(point.x - metrics.tileWidth / 2, point.y + tile.elevation * metrics.levelHeight);
    context.closePath();
    context.fillStyle = left;
    context.fill();
  }

  if (tile.elevation > north) {
    context.beginPath();
    context.moveTo(point.x, point.y + metrics.tileHeight / 2);
    context.lineTo(point.x + metrics.tileWidth / 2, point.y);
    context.lineTo(point.x + metrics.tileWidth / 2, point.y + tile.elevation * metrics.levelHeight);
    context.lineTo(point.x, point.y + metrics.tileHeight / 2 + tile.elevation * metrics.levelHeight);
    context.closePath();
    context.fillStyle = right;
    context.fill();
  }

  diamond(context, point.x, point.y, metrics.tileWidth, metrics.tileHeight, top);
}

function terrainLayer(world: WorldTile[], options: DrawWorldOptions) {
  const bucket = `${Math.round(options.width / 80)}:${Math.round(options.height / 80)}:${Math.round(
    options.width
  )}:${Math.round(options.height)}:${options.size}:${options.tabs.map((tab) => tab.id).join(",")}`;
  const cached = terrainCache.get(bucket);
  if (cached) return cached;

  const layer = document.createElement("canvas");
  const ratio = Math.min(options.devicePixelRatio || 1, 2);
  layer.width = Math.max(1, Math.floor(options.width * ratio));
  layer.height = Math.max(1, Math.floor(options.height * ratio));
  const context = layer.getContext("2d");
  if (!context) return layer;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const neighbors = new Map(world.map((tile) => [`${tile.x}:${tile.y}`, tile]));
  for (const tile of [...world].sort((a, b) => a.x + a.y - (b.x + b.y))) {
    drawTile(context, tile, options.metrics, neighbors);
  }
  terrainCache.set(bucket, layer);
  return layer;
}

function drawCuboid(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
) {
  diamond(context, x, y - height, width, width / 2, color);
  context.fillStyle = "#202429";
  context.fillRect(x - width / 2, y - height, width / 2, height);
  context.fillStyle = "#101214";
  context.fillRect(x, y - height, width / 2, height);
}

function drawLandmark(
  context: CanvasRenderingContext2D,
  landmark: Landmark,
  index: number,
  options: DrawWorldOptions
) {
  const point = projectTile(landmark, options.metrics);
  const active = options.activeId === landmark.id;
  const hovered = options.pointer
    ? Math.hypot(options.pointer.x - point.x, options.pointer.y - point.y) < options.metrics.tileWidth
    : false;
  const lift = active || hovered ? 5 : 0;
  const color = colorForLandmark(index);
  const baseY = point.y - landmark.elevation * options.metrics.levelHeight - lift;
  const heights: Record<Landmark["type"], number> = {
    library: 34,
    tower: 58,
    workshop: 28,
    house: 25,
    portal: 38,
    page: 24
  };
  const width = landmark.type === "tower" ? 21 : 28;

  drawCuboid(context, point.x, baseY, width, heights[landmark.type], color);
  if (landmark.type === "tower") drawCuboid(context, point.x, baseY - 38, 15, 24, color);
  if (landmark.type === "library") {
    context.fillStyle = "#e7dfca";
    context.fillRect(point.x - 9, baseY - 26, 18, 4);
  }
  if (landmark.type === "portal") {
    context.fillStyle = "#101214";
    context.fillRect(point.x - 6, baseY - 29, 12, 15);
  }
  if (landmark.type === "page") {
    context.fillStyle = "#e7dfca";
    context.fillRect(point.x - 7, baseY - 20, 14, 15);
    context.fillStyle = color;
    context.fillRect(point.x - 3, baseY - 16, 6, 2);
  }

  const lightOn = (Math.floor(options.time / 5000) + index * 3) % 7 === 0;
  if (lightOn) {
    context.fillStyle = "#f5eedb";
    context.fillRect(point.x - 3, baseY - Math.min(18, heights[landmark.type] - 8), 6, 5);
  }

  return {
    id: landmark.id,
    x: point.x,
    y: baseY - heights[landmark.type] / 2,
    width: Math.max(44, width + 24),
    height: Math.max(44, heights[landmark.type] + 30),
    color: landmark.color
  };
}

export function drawWorld(
  context: CanvasRenderingContext2D,
  world: WorldTile[],
  options: DrawWorldOptions
): RenderedLandmark[] {
  context.clearRect(0, 0, options.width, options.height);
  context.fillStyle = "#101214";
  context.fillRect(0, 0, options.width, options.height);

  const layer = terrainLayer(world, options);
  context.drawImage(layer, 0, 0, options.width, options.height);

  const landmarks = options.tabs.map((tab, index) => landmarkForTab(tab, index, options.size));
  const rendered = landmarks
    .map((landmark, index) => ({ landmark, index }))
    .sort((a, b) => a.landmark.x + a.landmark.y - (b.landmark.x + b.landmark.y))
    .map(({ landmark, index }) => drawLandmark(context, landmark, index, options));

  for (const tile of world) {
    if (tile.terrain !== "water" || (tile.x + tile.y) % 5 !== 0) continue;
    const point = projectTile(tile, options.metrics);
    const wave = Math.floor(options.time / 1800 + tile.x * 2 + tile.y) % 3 === 0;
    if (wave) {
      context.fillStyle = "#e7dfca";
      context.fillRect(point.x - 4, point.y - 1, 8, 2);
    }
  }

  return rendered;
}
