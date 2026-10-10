import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3, type Group } from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { player, positions, useOffice, VOICE_RANGE } from '../state';
import { Avatar } from './Avatar';
import {
  deskById, FLOOR, inRect, ME, obstacles, people, ROOM, ROOM_DOOR, zoneAt, type Person, type Rect, zones,
} from './layout';

const BODY_RADIUS = 0.35;
const WALK_SPEED = 3.4;
const doorBlock: Rect = { x: ROOM_DOOR.x, z: ROOM_DOOR.z, w: ROOM_DOOR.w, d: 0.2 };
const roomInterior: Rect = { x: ROOM.x, z: ROOM.z, w: ROOM.w - 0.3, d: ROOM.d - 0.3 };

function blocked(x: number, z: number, doorOpen: boolean) {
  if (Math.abs(x) > FLOOR.w / 2 - 0.5 || z < -FLOOR.d / 2 + 0.5 || z > FLOOR.d / 2 + 3) return true;
  if (!doorOpen && inRect(x, z, doorBlock, BODY_RADIUS)) return true;
  return obstacles.some(o => inRect(x, z, o, BODY_RADIUS));
}

function turnToward(g: Group, dx: number, dz: number, dt: number) {
  const goal = Math.atan2(dx, dz);
  let diff = goal - g.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  g.rotation.y += diff * Math.min(1, dt * 10);
}

// ---------- the player ----------
export function Player() {
  const g = useRef<Group>(null);
  const speed = useRef(0);
  const keys = useRef(new Set<string>());
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  const myStatus = useOffice(s => s.myStatus);
  const nearby = useOffice(s => s.nearby);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,button')) return;
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, []);

  const fwd = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const move = useMemo(() => new Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useOffice.getState();
    const doorOpen = st.knock === 'admitted';
    const k = keys.current;
    const p = player.pos;

    // keyboard moves relative to the camera
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    right.set(-fwd.z, 0, fwd.x);
    move.set(0, 0, 0);
    if (k.has('w') || k.has('arrowup')) move.add(fwd);
    if (k.has('s') || k.has('arrowdown')) move.sub(fwd);
    if (k.has('d') || k.has('arrowright')) move.add(right);
    if (k.has('a') || k.has('arrowleft')) move.sub(right);
    if (move.lengthSq() > 0) player.target = null;
    else if (player.target) {
      move.subVectors(player.target, p); move.y = 0;
      if (move.length() < 0.15) { player.target = null; move.set(0, 0, 0); }
    }

    let moving = 0;
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(WALK_SPEED * dt);
      // slide along obstacles: try each axis separately
      const nx = p.x + move.x, nz = p.z + move.z;
      const before = p.clone();
      if (!blocked(nx, p.z, doorOpen)) p.x = nx;
      if (!blocked(p.x, nz, doorOpen)) p.z = nz;
      const moved = p.distanceTo(before);
      if (moved < 1e-4 && player.target) player.target = null; // stuck: give up on the click target
      moving = moved / (WALK_SPEED * dt);
      if (g.current && moved > 0) turnToward(g.current, p.x - before.x, p.z - before.z, dt);
      // keep the camera following
      camera.position.add(p.clone().sub(before));
      if (controls.current) controls.current.target.add(p.clone().sub(before));
    }
    speed.current += (moving - speed.current) * Math.min(1, dt * 12);
    g.current?.position.copy(p);

    // where am I, who can hear me
    const inside = inRect(p.x, p.z, roomInterior);
    st.setInsideRoom(inside);
    st.setZone(zoneAt(p.x, p.z)?.id ?? null);
    const near: string[] = [];
    positions.forEach((pos, id) => {
      if (st.statuses[id] === 'away') return;
      const theirInside = inRect(pos.x, pos.z, roomInterior);
      if (theirInside === inside && pos.distanceTo(p) < VOICE_RANGE) near.push(id);
    });
    near.sort();
    st.setNearby(near);

    // knocking: offered when standing at the closed door from outside
    const atDoor = !inside && Math.abs(p.x - ROOM_DOOR.x) < 1.8 && p.z > ROOM_DOOR.z && p.z - ROOM_DOOR.z < 2.2;
    if (st.knock === 'none' && atDoor) st.setKnock('available');
    else if (st.knock === 'available' && !atDoor) st.setKnock('none');
    else if ((st.knock === 'admitted' || st.knock === 'declined') && !inside && p.distanceTo(new Vector3(ROOM_DOOR.x, 0, ROOM_DOOR.z)) > 5) {
      st.setKnock('none');
    }
  });

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        target={[player.pos.x, 0.8, player.pos.z - 2]}
        enablePan={false}
        minDistance={6}
        maxDistance={34}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        enableDamping
      />
      <group ref={g} position={player.pos.toArray()} rotation-y={Math.PI}>
        <Avatar {...ME} name="You" status={myStatus} speedRef={speed} talking={nearby.length > 0 && myStatus !== 'focus'} isMe />
      </group>
    </>
  );
}

// ---------- colleagues ----------
// Simple routines so the floor feels alive: people sit at desks, meetings sit in
// the room, and available people sometimes wander to the kitchen for coffee.
const COFFEE_SPOTS = [new Vector3(-16.4, 0, -11.4), new Vector3(-17.8, 0, -11.4), new Vector3(-9, 0, -7)];
const MEETING_SEATS = [new Vector3(ROOM.x - 0.4, 0, ROOM.z - 1.8), new Vector3(ROOM.x + 2.4, 0, ROOM.z - 1.8), new Vector3(ROOM.x + 1, 0, ROOM.z + 1)];

function homeFor(p: Person) {
  if (p.status === 'meeting') return MEETING_SEATS[people.filter(q => q.status === 'meeting').indexOf(p) % MEETING_SEATS.length].clone();
  const d = deskById(p.desk);
  return new Vector3(d.x, 0, d.z + d.facing * 0.85);
}

function Colleague({ person }: { person: Person }) {
  const g = useRef<Group>(null);
  const speed = useRef(0);
  const status = useOffice(s => s.statuses[person.id]);
  const talking = useOffice(s => s.nearby.includes(person.id) && s.myStatus !== 'focus' && s.statuses[person.id] !== 'focus');
  const home = useMemo(() => homeFor(person), [person]);
  const pos = useMemo(() => home.clone(), [home]);
  const route = useRef<Vector3[]>([]);
  const nextTrip = useRef(8 + Math.random() * 30);
  const waitUntil = useRef(0);

  useEffect(() => { positions.set(person.id, pos); return () => { positions.delete(person.id); }; }, [person.id, pos]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    if (!g.current) return;

    // plan a coffee trip now and then
    if (status === 'available' && route.current.length === 0 && t > nextTrip.current && !talking) {
      const spot = COFFEE_SPOTS[Math.floor(Math.random() * COFFEE_SPOTS.length)];
      // walk out to the main aisle first, then across, so routes avoid desk pods
      const cx = zones.find(z => z.id === person.team)!.x;
      const edge = new Vector3(cx + (home.x < cx ? -3.4 : 3.4), 0, home.z);
      route.current = [edge, new Vector3(edge.x, 0, 4.8), new Vector3(-6, 0, 4.8), new Vector3(-6, 0, -6), spot,
        new Vector3(-6, 0, -6), new Vector3(-6, 0, 4.8), new Vector3(edge.x, 0, 4.8), edge.clone(), home.clone()];
      nextTrip.current = t + 45 + Math.random() * 60;
    }

    let moving = 0;
    const next = route.current[0];
    if (next && t > waitUntil.current) {
      const dx = next.x - pos.x, dz = next.z - pos.z, dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        route.current.shift();
        if (COFFEE_SPOTS.includes(next)) waitUntil.current = t + 6; // chat at the machine
      } else {
        const step = Math.min(dist, 2.6 * dt);
        pos.x += (dx / dist) * step; pos.z += (dz / dist) * step;
        turnToward(g.current, dx, dz, dt);
        moving = 1;
      }
    } else if (talking) {
      turnToward(g.current, player.pos.x - pos.x, player.pos.z - pos.z, dt); // face the visitor
    } else if (!next) {
      if (person.status === 'meeting') turnToward(g.current, ROOM.x + 1 - pos.x, ROOM.z - 0.4 - pos.z, dt);
      else { const d = deskById(person.desk); turnToward(g.current, 0, -d.facing, dt); }
    }
    speed.current += (moving - speed.current) * Math.min(1, dt * 10);
    g.current.position.copy(pos);
  });

  if (status === 'away') return null;
  return (
    <group ref={g} position={pos.toArray()}>
      <Avatar name={person.name.split(' ')[0]} body={person.body} skin={person.skin} hair={person.hair}
        status={status} remote={person.where === 'remote'} speedRef={speed} talking={talking} />
    </group>
  );
}

export function Colleagues() {
  return <>{people.map(p => <Colleague key={p.id} person={p} />)}</>;
}
