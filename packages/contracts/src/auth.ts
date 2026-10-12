import { z } from 'zod';
import { UserProfileSchema } from './user.js';
import { TenantMembershipSchema } from './organization.js';

export const LoginRequestSchema = z
  .object({
    identifier: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(1, 'Password is required').max(128),
  })
  .refine((data) => !!(data.identifier || data.email), {
    message: 'Either email or username identifier is required',
  })
  .transform((data) => ({
    ...data,
    identifier: data.identifier || data.email || '',
    email: data.email || (data.identifier?.includes('@') ? data.identifier : undefined),
  }));
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    handle: z.string(),
    displayName: z.string(),
    role: z.enum(['admin', 'architect', 'employee']),
    xp: z.number(),
    statusMessage: z.string().nullable().optional(),
    currentDistrictId: z.string().default('kynetra-central'),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().min(2).max(60),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const AuthSessionStateSchema = z.object({
  user: UserProfileSchema,
  activeOrganizationId: z.string().uuid().optional(),
  memberships: z.array(TenantMembershipSchema).default([]),
  expiresAt: z.string().datetime(),
});
export type AuthSessionState = z.infer<typeof AuthSessionStateSchema>;
