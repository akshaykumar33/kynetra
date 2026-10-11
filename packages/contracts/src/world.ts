import { z } from 'zod';

export const InteractiveNodeTypeSchema = z.enum([
  'terminal',
  'receptionist_npc',
  'whiteboard',
  'coding_pod',
  'cloud_lab_rack',
  'portal',
]);
export type InteractiveNodeType = z.infer<typeof InteractiveNodeTypeSchema>;

export const Coordinates3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Coordinates3D = z.infer<typeof Coordinates3DSchema>;

export const InteractiveNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: InteractiveNodeTypeSchema,
  position: Coordinates3DSchema,
  description: z.string(),
  activeSessionCount: z.number().default(0),
});
export type InteractiveNode = z.infer<typeof InteractiveNodeSchema>;

export const InnovationTowerFloorSchema = z.object({
  floorNumber: z.number(),
  name: z.string(),
  category: z.enum(['lobby', 'workspace', 'coding_arena', 'cloud_lab', 'cyber_range', 'executive']),
  description: z.string(),
  capacity: z.number(),
  currentOccupancy: z.number(),
  nodes: z.array(InteractiveNodeSchema),
});
export type InnovationTowerFloor = z.infer<typeof InnovationTowerFloorSchema>;

export const WorldDistrictSchema = z.object({
  id: z.string(),
  name: z.string(),
  theme: z.string(),
  description: z.string(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
  }),
  status: z.enum(['active', 'in_construction', 'planned']),
  activeUsers: z.number().default(0),
  keyLandmark: z.string(),
  floors: z.array(InnovationTowerFloorSchema).optional(),
});
export type WorldDistrict = z.infer<typeof WorldDistrictSchema>;

export const WorldDistrictsResponseSchema = z.object({
  districts: z.array(WorldDistrictSchema),
  totalActiveUsers: z.number().nonnegative(),
});
export type WorldDistrictsResponse = z.infer<typeof WorldDistrictsResponseSchema>;
