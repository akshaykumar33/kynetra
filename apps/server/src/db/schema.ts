import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
  real,
} from 'drizzle-orm/pg-core';
import type { FloorLayout } from '@knovra/shared';

const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`);
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum('role', ['owner', 'admin', 'member', 'guest']);
export const statusEnum = pgEnum('presence_status', ['available', 'meeting', 'focus', 'away']);
export const workModeEnum = pgEnum('work_mode', ['office', 'remote']);

export const organizations = pgTable('organization', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable(
  'user',
  {
    id: id(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    // identity from the sign-in provider, e.g. "google:1234"
    authSubject: text('auth_subject'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  t => [uniqueIndex('user_email_idx').on(t.email), uniqueIndex('user_auth_subject_idx').on(t.authSubject)],
);

export const sessions = pgTable(
  'session',
  {
    // sha-256 of the cookie token; the token itself is never stored
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  t => [index('session_user_idx').on(t.userId)],
);

export const teams = pgTable(
  'team',
  {
    id: id(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // matches the zone id of the team's area on the floor
    key: text('key').notNull(),
    name: text('name').notNull(),
    createdAt: createdAt(),
  },
  t => [uniqueIndex('team_org_key_idx').on(t.orgId, t.key)],
);

export const memberships = pgTable(
  'membership',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull().default('member'),
    title: text('title').notNull().default(''),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    // set only by the user; never inferred from activity
    status: statusEnum('status').notNull().default('available'),
    workMode: workModeEnum('work_mode').notNull().default('remote'),
    avatar: jsonb('avatar').$type<{ body: string; skin: string; hair: string }>(),
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [primaryKey({ columns: [t.orgId, t.userId] }), index('membership_user_idx').on(t.userId)],
);

export const buildings = pgTable('building', {
  id: id(),
  name: text('name').notNull(),
  // where the tower stands on the hub campus, in metres, and its footprint
  campusX: real('campus_x').notNull().default(0),
  campusZ: real('campus_z').notNull().default(0),
  width: real('width').notNull().default(24),
  depth: real('depth').notNull().default(24),
  levels: integer('levels').notNull().default(8),
  // facade colour, a #rrggbb hex
  color: text('color').notNull().default('#8fb3c9'),
  createdAt: createdAt(),
});

export const floors = pgTable(
  'floor',
  {
    id: id(),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => buildings.id, { onDelete: 'cascade' }),
    level: integer('level').notNull(),
    name: text('name').notNull(),
    // rentable area outline in floor metres, [[x, z], ...]
    rentableArea: jsonb('rentable_area').$type<[number, number][]>().notNull(),
    createdAt: createdAt(),
  },
  t => [uniqueIndex('floor_building_level_idx').on(t.buildingId, t.level)],
);

export const leases = pgTable(
  'lease',
  {
    id: id(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    floorId: uuid('floor_id')
      .notNull()
      .references(() => floors.id, { onDelete: 'cascade' }),
    area: jsonb('area').$type<[number, number][]>().notNull(),
    startsOn: timestamp('starts_on', { withTimezone: true }).notNull().defaultNow(),
    endsOn: timestamp('ends_on', { withTimezone: true }),
    createdAt: createdAt(),
  },
  t => [index('lease_org_idx').on(t.orgId), index('lease_floor_idx').on(t.floorId)],
);

export const floorLayouts = pgTable(
  'floor_layout',
  {
    id: id(),
    leaseId: uuid('lease_id')
      .notNull()
      .references(() => leases.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    layout: jsonb('layout').$type<FloorLayout>().notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  t => [uniqueIndex('floor_layout_lease_version_idx').on(t.leaseId, t.version)],
);

export const deskAssignments = pgTable(
  'desk_assignment',
  {
    leaseId: uuid('lease_id')
      .notNull()
      .references(() => leases.id, { onDelete: 'cascade' }),
    deskKey: text('desk_key').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  t => [
    primaryKey({ columns: [t.leaseId, t.deskKey] }),
    uniqueIndex('desk_assignment_lease_user_idx').on(t.leaseId, t.userId),
  ],
);

export const invites = pgTable(
  'invite',
  {
    id: id(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: roleEnum('role').notNull().default('member'),
    // sha-256 of the invite token sent in the magic link
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  t => [index('invite_org_idx').on(t.orgId)],
);
