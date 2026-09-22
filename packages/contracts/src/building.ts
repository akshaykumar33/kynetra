import { z } from 'zod';
import { InnovationTowerFloorSchema } from './world.js';

export const CampusSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100),
  districtId: z.string(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
  }),
  isPrivateTenant: z.boolean().default(false),
  organizationId: z.string().uuid().optional(),
});
export type Campus = z.infer<typeof CampusSchema>;

export const BuildingSchema = z.object({
  id: z.string(),
  districtId: z.string(),
  campusId: z.string().optional(),
  name: z.string().min(2).max(100),
  code: z.string().max(10),
  totalFloors: z.number().int().positive(),
  floors: z.array(InnovationTowerFloorSchema).optional(),
});
export type Building = z.infer<typeof BuildingSchema>;

export const FloorplanGridSchema = z.object({
  floorId: z.string(),
  dimensions: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  gridResolution: z.number().default(1),
  walkableZones: z.array(z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  })),
});
export type FloorplanGrid = z.infer<typeof FloorplanGridSchema>;
