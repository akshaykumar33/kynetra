import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3, type Group } from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import {
  deskById,
  isInsideRoom,
  nearbyIds,
  nextKnock,
  ROOM,
  step,
  WALK_SPEED,
  zoneAt,
  zones,
  type Person,
} from '@knovra/shared';
import { sampleAt } from '../realtime';
import { DEMO, player, positions, useOffice } from '../state';
import { Avatar } from './Avatar';

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
  const me = useOffice(s => s.me);
  const nearby = useOffice(s => s.nearby);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,button')) return;
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    return () => {
      removeEventListener('keydown', down);
      removeEventListener('keyup', up);
    };
  }, []);

  const fwd = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const move = useMemo(() => new Vector3(), []);

  useFrame((_, rawDt) => {
    // Long frames (slow devices, background tabs) are split into short sub-steps so walking speed
    // doesn't depend on frame rate and a big step can never jump through a wall.
    const frameDt = Math.min(rawDt, 0.5);
    const steps = Math.max(1, Math.ceil(frameDt / 0.05));
    const dt = frameDt / steps;
    const st = useOffice.getState();
    const doorOpen = st.knock === 'admitted';
    const k = keys.current;
    const p = player.pos;

    // keyboard moves relative to the camera
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.set(-fwd.z, 0, fwd.x);
    move.set(0, 0, 0);
    if (k.has('w') || k.has('arrowup')) move.add(fwd);
    if (k.has('s') || k.has('arrowdown')) move.sub(fwd);
    if (k.has('d') || k.has('arrowright')) move.add(right);
    if (k.has('a') || k.has('arrowleft')) move.sub(right);
    const byKeys = move.lengthSq() > 0;
    if (byKeys) {
      player.path = [];
      move.normalize();
    }

    const before = p.clone();
    for (let i = 0; i < steps; i++) {
      if (!byKeys) {
        // follow the route: drop waypoints as they are reached
        while (player.path.length && Math.hypot(player.path[0].x - p.x, player.path[0].z - p.z) < 0.15)
          player.path.shift();
        if (!player.path.length) break;
        move.set(player.path[0].x - p.x, 0, player.path[0].z - p.z).normalize();
      }
      const stride = Math.min(
        WALK_SPEED * dt,
        byKeys ? Infinity : Math.hypot(player.path[0].x - p.x, player.path[0].z - p.z),
      );
      const next = step(p, move.x * stride, move.z * stride, doorOpen);
      if (next.x === p.x && next.z === p.z) {
        player.path = []; // stuck: give up on the route
        break;
      }
      p.x = next.x;
      p.z = next.z;
    }

    const moved = p.distanceTo(before);
    const moving = moved / (WALK_SPEED * frameDt);
    if (moved > 0) {
      if (g.current) turnToward(g.current, p.x - before.x, p.z - before.z, frameDt);
      // keep the camera following
      const delta = p.clone().sub(before);
      camera.position.add(delta);
      controls.current?.target.add(delta);
    }
    speed.current += (moving - speed.current) * Math.min(1, frameDt * 12);
    g.current?.position.copy(p);
    if (g.current) player.ry = g.current.rotation.y;

    // where am I, who can hear me
    st.setInsideRoom(isInsideRoom(p.x, p.z));
    st.setZone(zoneAt(p.x, p.z)?.id ?? null);
    st.setNearby(nearbyIds(p, positions, st.statuses));
    st.setKnock(nextKnock(st.knock, p.x, p.z));
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
        <Avatar
          body={me?.body ?? '#2f6f8f'}
          skin={me?.skin ?? '#d6a07a'}
          hair={me?.hair ?? '#3a2416'}
          name="You"
          status={myStatus}
          speedRef={speed}
          talking={nearby.length > 0 && myStatus !== 'focus'}
          isMe
        />
      </group>
    </>
  );
}

// ---------- colleagues ----------
// Simple routines so the floor feels alive: people sit at desks, meetings sit in
// the room, and available people sometimes wander to the kitchen for coffee.
const COFFEE_SPOTS = [new Vector3(-16.4, 0, -11.4), new Vector3(-17.8, 0, -11.4), new Vector3(-9, 0, -7)];
const MEETING_SEATS = [
  new Vector3(ROOM.x - 0.4, 0, ROOM.z - 1.8),
  new Vector3(ROOM.x + 2.4, 0, ROOM.z - 1.8),
  new Vector3(ROOM.x + 1, 0, ROOM.z + 1),
];

/** Where someone spends their time: a meeting seat, or the chair at their desk. Null if they have neither. */
function homeFor(p: Person, meetingIndex: number) {
  if (p.status === 'meeting') return MEETING_SEATS[meetingIndex % MEETING_SEATS.length].clone();
  const d = deskById(p.desk);
  return d ? new Vector3(d.x, 0, d.z + d.facing * 0.85) : null;
}

function Colleague({ person, home }: { person: Person; home: Vector3 }) {
  const g = useRef<Group>(null);
  const speed = useRef(0);
  const status = useOffice(s => s.statuses[person.id]);
  const talking = useOffice(
    s => s.nearby.includes(person.id) && s.myStatus !== 'focus' && s.statuses[person.id] !== 'focus',
  );
  const pos = useMemo(() => home.clone(), [home]);
  const route = useRef<Vector3[]>([]);
  const nextTrip = useRef(8 + Math.random() * 30);
  const waitUntil = useRef(0);

  useEffect(() => {
    positions.set(person.id, pos);
    return () => {
      positions.delete(person.id);
    };
  }, [person.id, pos]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.5);
    const t = clock.elapsedTime;
    if (!g.current) return;

    // plan a coffee trip now and then
    if (status === 'available' && route.current.length === 0 && t > nextTrip.current && !talking) {
      const spot = COFFEE_SPOTS[Math.floor(Math.random() * COFFEE_SPOTS.length)];
      // walk out to the main aisle first, then across, so routes avoid desk pods
      const cx = zones.find(z => z.id === person.team)!.x;
      const edge = new Vector3(cx + (home.x < cx ? -3.4 : 3.4), 0, home.z);
      route.current = [
        edge,
        new Vector3(edge.x, 0, 4.8),
        new Vector3(-6, 0, 4.8),
        new Vector3(-6, 0, -6),
        spot,
        new Vector3(-6, 0, -6),
        new Vector3(-6, 0, 4.8),
        new Vector3(edge.x, 0, 4.8),
        edge.clone(),
        home.clone(),
      ];
      nextTrip.current = t + 45 + Math.random() * 60;
    }

    let moving = 0;
    const next = route.current[0];
    if (next && t > waitUntil.current) {
      const dx = next.x - pos.x,
        dz = next.z - pos.z,
        dist = Math.hypot(dx, dz);
      if (dist < 0.1) {
        route.current.shift();
        if (COFFEE_SPOTS.includes(next)) waitUntil.current = t + 6; // chat at the machine
      } else {
        const stride = Math.min(dist, 2.6 * dt);
        pos.x += (dx / dist) * stride;
        pos.z += (dz / dist) * stride;
        turnToward(g.current, dx, dz, dt);
        moving = 1;
      }
    } else if (talking) {
      turnToward(g.current, player.pos.x - pos.x, player.pos.z - pos.z, dt); // face the visitor
    } else if (!next) {
      if (person.status === 'meeting') turnToward(g.current, ROOM.x + 1 - pos.x, ROOM.z - 0.4 - pos.z, dt);
      else turnToward(g.current, 0, -(deskById(person.desk)?.facing ?? 1), dt);
    }
    speed.current += (moving - speed.current) * Math.min(1, dt * 10);
    g.current.position.copy(pos);
  });

  if (status === 'away') return null;
  return (
    <group ref={g} position={pos.toArray()}>
      <Avatar
        name={person.name.split(' ')[0]}
        body={person.body}
        skin={person.skin}
        hair={person.hair}
        status={status}
        remote={person.where === 'remote'}
        speedRef={speed}
        talking={talking}
      />
    </group>
  );
}

/** A colleague who is connected: drawn where the server says they are, slightly in the past. */
function RemoteColleague({ person }: { person: Person }) {
  const g = useRef<Group>(null);
  const speed = useRef(0);
  const status = useOffice(s => s.statuses[person.id] ?? person.status);
  const talking = useOffice(
    s => s.nearby.includes(person.id) && s.myStatus !== 'focus' && s.statuses[person.id] !== 'focus',
  );
  const pos = useMemo(() => new Vector3(), []);
  const at = useMemo(() => ({ x: 0, z: 0, ry: 0 }), []);

  useEffect(() => {
    positions.set(person.id, pos);
    return () => {
      positions.delete(person.id);
    };
  }, [person.id, pos]);

  useFrame((_, rawDt) => {
    if (!g.current || !sampleAt(person.id, performance.now(), at)) return;
    const dt = Math.min(rawDt, 0.5);
    const moved = Math.hypot(at.x - pos.x, at.z - pos.z);
    pos.set(at.x, 0, at.z);
    g.current.position.copy(pos);
    g.current.rotation.y = at.ry;
    const moving = dt > 0 ? Math.min(1, moved / (WALK_SPEED * dt)) : 0;
    speed.current += (moving - speed.current) * Math.min(1, dt * 10);
  });

  return (
    <group ref={g}>
      <Avatar
        name={person.name.split(' ')[0]}
        body={person.body}
        skin={person.skin}
        hair={person.hair}
        status={status}
        remote={person.where === 'remote'}
        speedRef={speed}
        talking={talking}
      />
    </group>
  );
}

export function Colleagues() {
  return DEMO ? <SimulatedColleagues /> : <LiveColleagues />;
}

function LiveColleagues() {
  const people = useOffice(s => s.people);
  const online = useOffice(s => s.online);
  return (
    <>
      {people
        .filter(p => online[p.id])
        .map(p => (
          <RemoteColleague key={p.id} person={p} />
        ))}
    </>
  );
}

/** ?demo=1: everyone sits at their desk and wanders for coffee, as in the prototype. */
function SimulatedColleagues() {
  const people = useOffice(s => s.people);
  const placed = useMemo(() => {
    const inMeeting = people.filter(p => p.status === 'meeting');
    return people.flatMap(p => {
      const home = homeFor(p, inMeeting.indexOf(p));
      return home ? [{ person: p, home }] : [];
    });
  }, [people]);
  return (
    <>
      {placed.map(({ person, home }) => (
        <Colleague key={person.id} person={person} home={home} />
      ))}
    </>
  );
}
