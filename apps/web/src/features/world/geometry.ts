import type { InnovationTowerFloor, InteractiveNode, WorldDistrict } from '@kynetra/contracts';

/**
 * Shared spatial layout for every lens. The 2D map and the 3D city both read
 * from here, so a district occupies the same footprint in both — switching
 * lenses changes the projection, never the world.
 */

/** World units per district coordinate unit. */
export const WORLD_SCALE = 1 / 20;
export const DISTRICT_RADIUS = 5.5;
export const FLOOR_HEIGHT = 1.1;
export const PODIUM_HEIGHT = 0.3;
export const SLAB_THICKNESS = 0.14;
export const TOWER_WIDTH = 4.2;
/** Floors every tower renders even when fewer are programmed, so it reads as a tower. */
export const MIN_TOWER_LEVELS = 10;
/** Height a level is lifted by so the selected floor's interior is exposed. */
export const EXPLODE_LIFT = 2.4;
/** Keeps generated blocks clear of a district's landmark. */
const LANDMARK_CLEARANCE = 3.2;
const BLOCK_PITCH = 2.2;
const NODE_SCALE = 0.17;

export interface Block {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

export function districtCenter(district: Pick<WorldDistrict, 'coordinates'>): [number, number] {
  return [district.coordinates.x * WORLD_SCALE, district.coordinates.y * WORLD_SCALE];
}

/** Deterministic PRNG (mulberry32) so a district looks the same on every load and lens. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Buildings for a district, laid out on a street grid around its centre.
 * Districts under construction get lower massing so the state reads at a
 * glance; active districts keep their centre clear for the landmark.
 */
export function districtBlocks(
  district: Pick<WorldDistrict, 'id' | 'coordinates' | 'status'>,
): Block[] {
  const random = seededRandom(hashString(district.id));
  const [cx, cz] = districtCenter(district);
  const isActive = district.status === 'active';
  const heightScale = isActive ? 1 : 0.35;
  const blocks: Block[] = [];

  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      const x = gx * BLOCK_PITCH;
      const z = gz * BLOCK_PITCH;
      const distance = Math.hypot(x, z);
      if (distance > DISTRICT_RADIUS) continue;
      if (isActive && distance < LANDMARK_CLEARANCE) continue;
      if (random() < 0.18) continue; // leave room for plazas and courtyards
      blocks.push({
        x: cx + x + (random() - 0.5) * 0.4,
        z: cz + z + (random() - 0.5) * 0.4,
        width: 1.1 + random() * 0.6,
        depth: 1.1 + random() * 0.6,
        height: (0.6 + random() ** 2 * 3.4) * heightScale,
      });
    }
  }
  return blocks;
}

export interface TowerLevel {
  level: number;
  /** Base height of the slab before any explode offset. */
  y: number;
  /** The programmed floor at this level, if the World Engine defines one. */
  floor: InnovationTowerFloor | null;
}

export function towerLevels(floors: InnovationTowerFloor[]): TowerLevel[] {
  const top = Math.max(MIN_TOWER_LEVELS, ...floors.map((f) => f.floorNumber));
  return Array.from({ length: top }, (_, i) => {
    const level = i + 1;
    return {
      level,
      y: i * FLOOR_HEIGHT,
      floor: floors.find((f) => f.floorNumber === level) ?? null,
    };
  });
}

export function levelOffset(level: number, selectedFloor: number | null): number {
  return selectedFloor !== null && level > selectedFloor ? EXPLODE_LIFT : 0;
}

/** Maps a node's floorplan coordinates onto the tower footprint. */
export function nodeWorldPosition(
  node: Pick<InteractiveNode, 'position'>,
  floorNumber: number,
): [number, number, number] {
  const half = TOWER_WIDTH / 2 - 0.35;
  const clamp = (v: number) => Math.max(-half, Math.min(half, v));
  return [
    clamp(node.position.x * NODE_SCALE),
    PODIUM_HEIGHT + (floorNumber - 1) * FLOOR_HEIGHT + SLAB_THICKNESS,
    clamp(node.position.z * NODE_SCALE),
  ];
}

export type Vec3 = [number, number, number];

export interface CameraShot {
  position: Vec3;
  target: Vec3;
}

/**
 * Where the 3D camera frames a selection: the whole district, the tower, a
 * single exposed floor, or one workstation on it. Offsets keep the same
 * south-east viewing angle at every scale so moves read as a zoom, not a cut.
 */
export function cameraShot(selection: {
  district: Pick<WorldDistrict, 'coordinates' | 'floors'> | null;
  floor: Pick<InnovationTowerFloor, 'floorNumber'> | null;
  node: Pick<InteractiveNode, 'position'> | null;
}): CameraShot {
  const { district, floor, node } = selection;
  if (!district) return { position: [30, 26, 36], target: [0, 0, 0] };

  const [cx, cz] = districtCenter(district);
  if (floor) {
    const floorY = PODIUM_HEIGHT + (floor.floorNumber - 1) * FLOOR_HEIGHT;
    if (node) {
      const [nx, ny, nz] = nodeWorldPosition(node, floor.floorNumber);
      const target: Vec3 = [cx + nx, ny + 0.3, cz + nz];
      return { position: [target[0] + 4.5, target[1] + 3.6, target[2] + 5.5], target };
    }
    return { position: [cx + 8, floorY + 6.5, cz + 10], target: [cx, floorY + 0.4, cz] };
  }
  if (district.floors && district.floors.length > 0) {
    return { position: [cx + 17, 13, cz + 21], target: [cx, 4, cz] };
  }
  return { position: [cx + 13, 12, cz + 16], target: [cx, 0.5, cz] };
}

export const ROAD_WIDTH = 1.1;
const PLAZA_EDGE = DISTRICT_RADIUS + 0.6;

export interface RoadSegment {
  id: string;
  from: [number, number];
  to: [number, number];
  length: number;
  /** Unit direction from → to. */
  dir: [number, number];
}

/**
 * Avenues from the civic centre (world origin) to each outlying district,
 * trimmed to run between plaza edges rather than through the plazas.
 */
export function roadSegments(districts: Pick<WorldDistrict, 'id' | 'coordinates'>[]) {
  return districts
    .filter((d) => d.coordinates.x !== 0 || d.coordinates.y !== 0)
    .map((d): RoadSegment => {
      const [x, z] = districtCenter(d);
      const full = Math.hypot(x, z);
      const dir: [number, number] = [x / full, z / full];
      const from: [number, number] = [dir[0] * PLAZA_EDGE, dir[1] * PLAZA_EDGE];
      const to: [number, number] = [x - dir[0] * PLAZA_EDGE, z - dir[1] * PLAZA_EDGE];
      return { id: d.id, from, to, length: full - PLAZA_EDGE * 2, dir };
    })
    .filter((road) => road.length > 0);
}

/** Street trees along both kerbs of every avenue, evenly spaced. */
export function treePositions(roads: RoadSegment[], spacing = 1.6): [number, number][] {
  const trees: [number, number][] = [];
  const kerb = ROAD_WIDTH / 2 + 0.45;
  for (const road of roads) {
    const normal: [number, number] = [-road.dir[1], road.dir[0]];
    const count = Math.floor(road.length / spacing);
    for (let i = 1; i < count; i++) {
      const t = i * spacing;
      for (const side of [-1, 1]) {
        trees.push([
          road.from[0] + road.dir[0] * t + normal[0] * kerb * side,
          road.from[1] + road.dir[1] * t + normal[1] * kerb * side,
        ]);
      }
    }
  }
  return trees;
}

/** Bounds of all districts in world units, padded, for framing the 2D map. */
export function worldBounds(districts: Pick<WorldDistrict, 'coordinates'>[]) {
  const pad = DISTRICT_RADIUS + 2;
  const xs = districts.map((d) => districtCenter(d)[0]);
  const zs = districts.map((d) => districtCenter(d)[1]);
  const minX = Math.min(0, ...xs) - pad;
  const maxX = Math.max(0, ...xs) + pad;
  const minZ = Math.min(0, ...zs) - pad;
  const maxZ = Math.max(0, ...zs) + pad;
  return { minX, minZ, width: maxX - minX, height: maxZ - minZ };
}
