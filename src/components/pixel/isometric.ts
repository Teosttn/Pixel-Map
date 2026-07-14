export type IsoMetrics = {
  originX: number;
  originY: number;
  tileWidth: number;
  tileHeight: number;
  levelHeight: number;
};

export type WorldPoint = { x: number; y: number; elevation: number };

export type ScreenPoint = { x: number; y: number };

export type Terrain = "grass" | "water" | "stone" | "path";

export type WorldTile = WorldPoint & {
  terrain: Terrain;
  colorIndex: number;
};

export type MapTab = {
  id: string;
  label: string;
  href: string;
  color: string;
  glyph: string;
  title: string;
  zhTitle: string;
  description: string;
  zhDescription: string;
};

export type LandmarkType = "library" | "tower" | "workshop" | "house" | "portal" | "page";

export type Landmark = {
  id: string;
  type: LandmarkType;
  x: number;
  y: number;
  elevation: number;
  color: string;
};

export function projectTile(point: WorldPoint, metrics: IsoMetrics): ScreenPoint {
  const screenX = metrics.originX + ((point.x - point.y) * metrics.tileWidth) / 2;
  const screenY =
    metrics.originY + ((point.x + point.y) * metrics.tileHeight) / 2 - point.elevation * metrics.levelHeight;
  return { x: screenX, y: screenY };
}

function noise(seed: number, x: number, y: number) {
  const value = Math.sin(seed * 0.0001 + x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function landmarkPoint(index: number, size: number) {
  const placements = [
    [0.27, 0.62],
    [0.7, 0.25],
    [0.64, 0.72],
    [0.8, 0.5],
    [0.34, 0.28],
    [0.5, 0.48]
  ];
  const [x, y] = placements[index % placements.length];
  return {
    x: Math.round(2 + x * (size - 5)),
    y: Math.round(2 + y * (size - 5))
  };
}

export function landmarkForTab(tab: MapTab, index: number, size: number): Landmark {
  const point = landmarkPoint(index, size);
  const types: LandmarkType[] = ["library", "tower", "workshop", "house", "portal", "page"];
  return {
    id: tab.id,
    type: types[index % types.length],
    x: point.x,
    y: point.y,
    elevation: 2,
    color: tab.color
  };
}

export function createWorld(seed: number, tabs: MapTab[], size: number): WorldTile[] {
  const landmarks = tabs.map((tab, index) => landmarkForTab(tab, index, size));
  const tiles: WorldTile[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = noise(seed, x, y);
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      const nearest = landmarks.reduce(
        (distance, landmark) => Math.min(distance, Math.abs(x - landmark.x) + Math.abs(y - landmark.y)),
        Number.POSITIVE_INFINITY
      );
      const onPath = landmarks.some((landmark) => x === landmark.x || y === landmark.y);
      let terrain: Terrain = edge < 1 || value < 0.13 ? "water" : value > 0.81 ? "stone" : "grass";
      let elevation = terrain === "water" ? 0 : value > 0.72 ? 3 : value > 0.43 ? 2 : 1;

      if (nearest <= 1) {
        terrain = "grass";
        elevation = 2;
      } else if (onPath && terrain !== "water" && nearest < size / 2) {
        terrain = "path";
        elevation = 1;
      }

      tiles.push({ x, y, elevation, terrain, colorIndex: Math.floor(value * 4) });
    }
  }

  return tiles;
}
