import { z } from 'zod';
import { UserProfileSchema } from './user.js';
import { TenantMembershipSchema } from './organization.js';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

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
