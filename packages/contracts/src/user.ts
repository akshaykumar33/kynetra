import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'guest',
  'developer',
  'mentor',
  'tech_lead',
  'sre_engineer',
  'admin',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  role: UserRoleSchema,
  xp: z.number().default(0),
  badges: z.array(z.string()).default([]),
  currentDistrictId: z.string().default('kynetra-central'),
  statusMessage: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
