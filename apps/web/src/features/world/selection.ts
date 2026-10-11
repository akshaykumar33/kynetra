import type { InnovationTowerFloor, InteractiveNode, WorldDistrict } from '@kynetra/contracts';

export interface SelectionIds {
  districtId: string | null;
  floorNumber: number | null;
  nodeId: string | null;
}

export interface ResolvedSelection {
  district: WorldDistrict | null;
  floor: InnovationTowerFloor | null;
  node: InteractiveNode | null;
}

/**
 * Turns stored ids into live objects against the latest server data.
 * Ids that no longer resolve (the world changed underneath the user) fall
 * back gracefully: an unknown district falls back to the first one, while an
 * unknown floor or node simply clears rather than jumping somewhere unasked.
 */
export function resolveSelection(districts: WorldDistrict[], ids: SelectionIds): ResolvedSelection {
  const district = districts.find((d) => d.id === ids.districtId) ?? districts[0] ?? null;
  const floor =
    ids.floorNumber === null
      ? null
      : (district?.floors?.find((f) => f.floorNumber === ids.floorNumber) ?? null);
  const node = floor?.nodes.find((n) => n.id === ids.nodeId) ?? null;
  return { district, floor, node };
}

export interface WorldSummary {
  onlineNow: number;
  districtsOperational: number;
  districtsTotal: number;
  liveSessions: number;
}

export function summarizeWorld(districts: WorldDistrict[], totalActiveUsers: number): WorldSummary {
  const liveSessions = districts
    .flatMap((d) => d.floors ?? [])
    .flatMap((f) => f.nodes)
    .reduce((sum, n) => sum + n.activeSessionCount, 0);
  return {
    onlineNow: totalActiveUsers,
    districtsOperational: districts.filter((d) => d.status === 'active').length,
    districtsTotal: districts.length,
    liveSessions,
  };
}

/** Occupancy as a 0–1 ratio, clamped so bad data never draws past the bar. */
export function occupancyRatio(
  floor: Pick<InnovationTowerFloor, 'capacity' | 'currentOccupancy'>,
): number {
  if (floor.capacity <= 0) return 0;
  return Math.min(1, Math.max(0, floor.currentOccupancy / floor.capacity));
}
