import { FLOOR } from './layout';
import { blocked } from './movement';

export interface Point {
  x: number;
  z: number;
}

const CELL = 0.5;
const COLS = Math.round(FLOOR.w / CELL);
const ROWS = Math.round(FLOOR.d / CELL) + 6; // reception rug extends past the south wall line
const toCol = (x: number) => Math.round((x + FLOOR.w / 2) / CELL);
const toRow = (z: number) => Math.round((z + FLOOR.d / 2) / CELL);
const toX = (c: number) => c * CELL - FLOOR.w / 2;
const toZ = (r: number) => r * CELL - FLOOR.d / 2;

/** True when a straight walk between two points never touches an obstacle. */
export function clearLine(a: Point, b: Point, doorOpen: boolean): boolean {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (CELL / 2));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, doorOpen)) return false;
  }
  return true;
}

/**
 * Shortest walkable route from `from` to `to` on a 0.5 m grid (A*, 8 directions), smoothed so
 * the avatar walks in straight lines between corners. If `to` is inside furniture, the route ends
 * at the nearest free spot. Returns waypoints excluding the start, or [] when unreachable.
 */
export function findPath(from: Point, to: Point, doorOpen: boolean): Point[] {
  if (clearLine(from, to, doorOpen) && !blocked(to.x, to.z, doorOpen)) return [to];

  const free = (c: number, r: number) =>
    c >= 0 && r >= 0 && c <= COLS && r <= ROWS && !blocked(toX(c), toZ(r), doorOpen);
  const start = [toCol(from.x), toRow(from.z)] as const;
  let goal = [toCol(to.x), toRow(to.z)] as const;
  if (!free(...goal)) {
    // nearest free cell to the requested spot, searched in growing rings
    let found: readonly [number, number] | null = null;
    for (let ring = 1; ring < 8 && !found; ring++) {
      for (let dc = -ring; dc <= ring && !found; dc++)
        for (let dr = -ring; dr <= ring && !found; dr++)
          if (Math.max(Math.abs(dc), Math.abs(dr)) === ring && free(goal[0] + dc, goal[1] + dr))
            found = [goal[0] + dc, goal[1] + dr];
    }
    if (!found) return [];
    goal = found;
  }

  const key = (c: number, r: number) => r * (COLS + 1) + c;
  const g = new Map<number, number>([[key(...start), 0]]);
  const came = new Map<number, number>();
  const open: [number, number, number][] = [[0, ...start]]; // [f, col, row]
  const h = (c: number, r: number) => Math.hypot(c - goal[0], r - goal[1]);
  const goalKey = key(...goal);

  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [, c, r] = open.shift()!;
    const k = key(c, r);
    if (k === goalKey) {
      const cells: Point[] = [];
      for (let cur: number | undefined = k; cur !== undefined; cur = came.get(cur))
        cells.unshift({ x: toX(cur % (COLS + 1)), z: toZ(Math.floor(cur / (COLS + 1))) });
      return smooth(from, cells.slice(1), doorOpen);
    }
    for (let dc = -1; dc <= 1; dc++)
      for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        const nc = c + dc,
          nr = r + dr;
        // no corner cutting: diagonal moves need both side cells free
        if (!free(nc, nr) || (dc && dr && (!free(c + dc, r) || !free(c, r + dr)))) continue;
        const cost = g.get(k)! + (dc && dr ? Math.SQRT2 : 1);
        const nk = key(nc, nr);
        if (cost < (g.get(nk) ?? Infinity)) {
          g.set(nk, cost);
          came.set(nk, k);
          open.push([cost + h(nc, nr), nc, nr]);
        }
      }
  }
  return [];
}

/** Drops waypoints that can be skipped with a clear straight line. */
function smooth(from: Point, cells: Point[], doorOpen: boolean): Point[] {
  const out: Point[] = [];
  let anchor = from;
  for (let i = 0; i < cells.length; i++) {
    const next = cells[i + 1];
    if (!next || !clearLine(anchor, next, doorOpen)) {
      out.push(cells[i]);
      anchor = cells[i];
    }
  }
  return out;
}
