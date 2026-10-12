import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'admin',
  'architect',
  'employee',
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

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  handle: z.string(),
  displayName: z.string(),
  role: UserRoleSchema,
  xp: z.number().default(0),
  currentDistrictId: z.string().default('kynetra-central'),
  statusMessage: z.string().nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  handle: z.string().min(2).max(30),
  displayName: z.string().min(2).max(60),
  role: UserRoleSchema.default('employee'),
  password: z.string().min(6).optional(),
  xp: z.number().default(0),
  currentDistrictId: z.string().default('kynetra-central'),
  statusMessage: z.string().optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  role: UserRoleSchema.optional(),
  xp: z.number().optional(),
  currentDistrictId: z.string().optional(),
  statusMessage: z.string().optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

