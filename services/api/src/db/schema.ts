import {
  pgTable,
  text,
  varchar,
  integer,
  doublePrecision,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  domain: varchar('domain', { length: 255 }),
  subscriptionTier: varchar('subscription_tier', { length: 20 }).notNull().default('free'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  handle: varchar('handle', { length: 30 }).notNull().unique(),
  displayName: varchar('display_name', { length: 60 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('employee'),
  xp: integer('xp').notNull().default(0),
  currentDistrictId: varchar('current_district_id', { length: 50 }).notNull().default('kynetra-central'),
  statusMessage: text('status_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tenantMemberships = pgTable('tenant_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
});

export const districts = pgTable('districts', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  theme: varchar('theme', { length: 100 }).notNull(),
  description: text('description').notNull(),
  coordX: integer('coord_x').notNull().default(0),
  coordY: integer('coord_y').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  activeUsers: integer('active_users').notNull().default(0),
  keyLandmark: varchar('key_landmark', { length: 100 }).notNull(),
});

export const buildings = pgTable('buildings', {
  id: varchar('id', { length: 50 }).primaryKey(),
  districtId: varchar('district_id', { length: 50 })
    .notNull()
    .references(() => districts.id, { onDelete: 'cascade' }),
  campusId: varchar('campus_id', { length: 50 }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  totalFloors: integer('total_floors').notNull().default(1),
});

export const floors = pgTable('floors', {
  id: varchar('id', { length: 50 }).primaryKey(),
  buildingId: varchar('building_id', { length: 50 })
    .notNull()
    .references(() => buildings.id, { onDelete: 'cascade' }),
  floorNumber: integer('floor_number').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  description: text('description').notNull(),
  capacity: integer('capacity').notNull().default(100),
  currentOccupancy: integer('current_occupancy').notNull().default(0),
});

export const interactiveNodes = pgTable('interactive_nodes', {
  id: varchar('id', { length: 50 }).primaryKey(),
  floorId: varchar('floor_id', { length: 50 })
    .notNull()
    .references(() => floors.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  nodeType: varchar('node_type', { length: 30 }).notNull(),
  posX: doublePrecision('pos_x').notNull().default(0),
  posY: doublePrecision('pos_y').notNull().default(0),
  posZ: doublePrecision('pos_z').notNull().default(0),
  description: text('description').notNull(),
  activeSessionCount: integer('active_session_count').notNull().default(0),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(tenantMemberships),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(tenantMemberships),
}));

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [tenantMemberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [tenantMemberships.userId],
    references: [users.id],
  }),
}));

export const districtsRelations = relations(districts, ({ many }) => ({
  buildings: many(buildings),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  district: one(districts, {
    fields: [buildings.districtId],
    references: [districts.id],
  }),
  floors: many(floors),
}));

export const floorsRelations = relations(floors, ({ one, many }) => ({
  building: one(buildings, {
    fields: [floors.buildingId],
    references: [buildings.id],
  }),
  nodes: many(interactiveNodes),
}));

export const interactiveNodesRelations = relations(interactiveNodes, ({ one }) => ({
  floor: one(floors, {
    fields: [interactiveNodes.floorId],
    references: [floors.id],
  }),
}));
