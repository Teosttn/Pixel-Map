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
  pointer: { x: number; y: number; activeAt?: number } | null;
  time: number;
  devicePixelRatio: number;
};

const terrainPalette: Record<Terrain, readonly [string, string, string]> = {
  grass: ["122, 203, 121", "87, 155, 92", "62, 116, 72"],
  water: ["97, 199, 212", "62, 158, 174", "40, 119, 134"],
  stone: ["190, 198, 193", "126, 137, 136", "89, 99, 99"],
  path: ["242, 184, 75", "184, 130, 51", "118, 84, 31"]
};

const pixelPalette = [
  "122, 203, 121",
  "97, 199, 212",
  "242, 184, 75",
  "226, 103, 115",
  "139, 123, 216",
  "231, 223, 202"
];

function rgba(rgb: string, alpha: number) {
  return `rgba(${rgb}, ${Math.min(alpha, 0.7)})`;
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

function pointerPulse(point: { x: number; y: number }, options: DrawWorldOptions) {
  if (!options.pointer || options.time - (options.pointer.activeAt ?? options.time) > 1400) return 0;
  return Math.max(0, 1 - Math.hypot(options.pointer.x - point.x, options.pointer.y - point.y) / 210);
}

function drawPixelField(context: CanvasRenderingContext2D, options: DrawWorldOptions) {
  const tile = options.width < 700 ? 18 : 26;
  for (let y = 0; y < options.height; y += tile) {
    for (let x = 0; x < options.width; x += tile) {
      const hoverPulse = pointerPulse({ x, y }, options);
      const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const rareBlink = Math.sin(options.time * 0.00072 + seed * 18) > 0.997;
      const paletteIndex = Math.abs(Math.floor((x / tile) * 3 + (y / tile) * 5 + seed * pixelPalette.length)) % pixelPalette.length;
      const alpha = 0.025 + hoverPulse * 0.16 + Number(rareBlink) * 0.18;
      const block = Math.max(3, tile * (rareBlink ? 0.48 : hoverPulse > 0.1 ? 0.42 : 0.28));
      context.fillStyle = rgba(pixelPalette[paletteIndex], alpha);
      context.fillRect(x, y, block, block);
    }
  }
}

function drawTile(
  context: CanvasRenderingContext2D,
  tile: WorldTile,
  metrics: IsoMetrics,
  neighbors: Map<string, WorldTile>,
  options: DrawWorldOptions
) {
  const point = projectTile(tile, metrics);
  const [top, left, right] = terrainPalette[tile.terrain];
  const west = neighbors.get(`${tile.x - 1}:${tile.y}`)?.elevation ?? 0;
  const north = neighbors.get(`${tile.x}:${tile.y - 1}`)?.elevation ?? 0;
  const pulse = pointerPulse(point, options);

  if (tile.elevation > west) {
    context.beginPath();
    context.moveTo(point.x - metrics.tileWidth / 2, point.y);
    context.lineTo(point.x, point.y + metrics.tileHeight / 2);
    context.lineTo(point.x, point.y + metrics.tileHeight / 2 + tile.elevation * metrics.levelHeight);
    context.lineTo(point.x - metrics.tileWidth / 2, point.y + tile.elevation * metrics.levelHeight);
    context.closePath();
    context.fillStyle = rgba(left, 0.09 + pulse * 0.14);
    context.fill();
  }

  if (tile.elevation > north) {
    context.beginPath();
    context.moveTo(point.x, point.y + metrics.tileHeight / 2);
    context.lineTo(point.x + metrics.tileWidth / 2, point.y);
    context.lineTo(point.x + metrics.tileWidth / 2, point.y + tile.elevation * metrics.levelHeight);
    context.lineTo(point.x, point.y + metrics.tileHeight / 2 + tile.elevation * metrics.levelHeight);
    context.closePath();
    context.fillStyle = rgba(right, 0.07 + pulse * 0.12);
    context.fill();
  }

  diamond(context, point.x, point.y, metrics.tileWidth, metrics.tileHeight, rgba(top, 0.13 + pulse * 0.18));
}

function drawTerrain(context: CanvasRenderingContext2D, world: WorldTile[], options: DrawWorldOptions) {
  const neighbors = new Map(world.map((tile) => [`${tile.x}:${tile.y}`, tile]));
  for (const tile of [...world].sort((a, b) => a.x + a.y - (b.x + b.y))) {
    drawTile(context, tile, options.metrics, neighbors, options);
  }

  for (const tile of world) {
    if (tile.terrain !== "water" || (tile.x + tile.y) % 5 !== 0) continue;
    const point = projectTile(tile, options.metrics);
    const wave = Math.floor(options.time / 1800 + tile.x * 2 + tile.y) % 3 === 0;
    if (wave) {
      context.fillStyle = rgba("231, 223, 202", 0.24 + pointerPulse(point, options) * 0.2);
      context.fillRect(point.x - 4, point.y - 1, 8, 2);
    }
  }
}

function landmarkColor(index: number) {
  return pixelPalette[index % pixelPalette.length];
}

function drawColumn(
  context: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  width: number,
  height: number,
  rgb: string,
  emphasis: number
) {
  const topY = baseY - height;
  const halfHeight = width / 4;
  diamond(context, x, topY, width, width / 2, rgba(rgb, 0.32 + emphasis * 0.24));

  context.beginPath();
  context.moveTo(x - width / 2, topY);
  context.lineTo(x, topY + halfHeight);
  context.lineTo(x, baseY + halfHeight);
  context.lineTo(x - width / 2, baseY);
  context.closePath();
  context.fillStyle = rgba(rgb, 0.13 + emphasis * 0.13);
  context.fill();

  context.beginPath();
  context.moveTo(x, topY + halfHeight);
  context.lineTo(x + width / 2, topY);
  context.lineTo(x + width / 2, baseY);
  context.lineTo(x, baseY + halfHeight);
  context.closePath();
  context.fillStyle = rgba(rgb, 0.09 + emphasis * 0.1);
  context.fill();
}

function drawLandmark(
  context: CanvasRenderingContext2D,
  landmark: Landmark,
  index: number,
  options: DrawWorldOptions
) {
  const point = projectTile(landmark, options.metrics);
  const active = options.activeId === landmark.id;
  const pulse = pointerPulse(point, options);
  const lift = active || pulse > 0.12 ? 5 + pulse * 4 : 0;
  const baseY = point.y - landmark.elevation * options.metrics.levelHeight - lift;
  const heights: Record<Landmark["type"], number> = {
    library: 52,
    tower: 76,
    workshop: 44,
    house: 40,
    portal: 62,
    page: 38
  };
  const height = heights[landmark.type];
  const width = landmark.type === "tower" ? 18 : 22;
  const emphasis = Math.max(Number(active), pulse);
  drawColumn(context, point.x, baseY, width, height, landmarkColor(index), emphasis);

  return {
    id: landmark.id,
    x: point.x,
    y: baseY - height,
    width: 42,
    height: 42,
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

  drawPixelField(context, options);
  drawTerrain(context, world, options);

  const landmarks = options.tabs.map((tab, index) => landmarkForTab(tab, index, options.size));
  return landmarks
    .map((landmark, index) => ({ landmark, index }))
    .sort((a, b) => a.landmark.x + a.landmark.y - (b.landmark.x + b.landmark.y))
    .map(({ landmark, index }) => drawLandmark(context, landmark, index, options));
}
