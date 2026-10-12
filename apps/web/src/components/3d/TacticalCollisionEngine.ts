export interface BoxCollider {
  type: 'box';
  name?: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CircleCollider {
  type: 'circle';
  name?: string;
  x: number;
  z: number;
  radius: number;
}

export type WorldCollider = BoxCollider | CircleCollider;

/**
 * TacticalCollisionEngine (LLD: Continuous Swept-Sphere & Tangent Sliding Physics)
 *
 * Implements industry-standard character controller physics:
 * 1. Continuous closest-point projection on AABB and Circle primitives.
 * 2. Velocity projection onto collision plane tangents (smooth sliding along walls).
 * 3. Prevention of corner-traps or multi-axis locking.
 */
export class TacticalCollisionEngine {
  private static readonly AGENT_RADIUS = 0.42;

  /**
   * Resolves collision for an agent moving from current position with a given velocity.
   * Returns updated position and velocity projected along contact tangents.
   */
  public static resolve(
    x: number,
    z: number,
    vx: number,
    vz: number,
    colliders: WorldCollider[]
  ): { x: number; z: number; vx: number; vz: number } {
    let px = x;
    let pz = z;
    let curVx = vx;
    let curVz = vz;
    const r = this.AGENT_RADIUS;

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < colliders.length; i++) {
        const col = colliders[i];

        if (col.type === 'box') {
          const { minX, maxX, minZ, maxZ } = col;

          // Closest point on AABB to circle center
          const cx = Math.max(minX, Math.min(maxX, px));
          const cz = Math.max(minZ, Math.min(maxZ, pz));

          const dx = px - cx;
          const dz = pz - cz;
          const distSq = dx * dx + dz * dz;

          if (distSq < r * r) {
            if (distSq > 0.000001) {
              // External contact
              const dist = Math.sqrt(distSq);
              const overlap = r - dist;
              const nx = dx / dist;
              const nz = dz / dist;

              px += nx * overlap;
              pz += nz * overlap;

              // Tangent sliding projection: remove velocity component into the wall
              const dot = curVx * nx + curVz * nz;
              if (dot < 0) {
                curVx -= dot * nx;
                curVz -= dot * nz;
              }
            } else {
              // Center is inside box: push out along minimal penetration axis
              const dLeft = px - minX;
              const dRight = maxX - px;
              const dTop = pz - minZ;
              const dBottom = maxZ - pz;
              const minPen = Math.min(dLeft, dRight, dTop, dBottom);

              if (minPen === dLeft) {
                px = minX - r;
                if (curVx > 0) curVx = 0;
              } else if (minPen === dRight) {
                px = maxX + r;
                if (curVx < 0) curVx = 0;
              } else if (minPen === dTop) {
                pz = minZ - r;
                if (curVz > 0) curVz = 0;
              } else {
                pz = maxZ + r;
                if (curVz < 0) curVz = 0;
              }
            }
          }
        } else if (col.type === 'circle') {
          const dx = px - col.x;
          const dz = pz - col.z;
          const distSq = dx * dx + dz * dz;
          const minDist = r + col.radius;

          if (distSq < minDist * minDist && distSq > 0.000001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const nx = dx / dist;
            const nz = dz / dist;

            px += nx * overlap;
            pz += nz * overlap;

            const dot = curVx * nx + curVz * nz;
            if (dot < 0) {
              curVx -= dot * nx;
              curVz -= dot * nz;
            }
          }
        }
      }
    }

    return { x: px, z: pz, vx: curVx, vz: curVz };
  }
}
