import { z } from 'zod';

export const SubscriptionTierSchema = z.enum(['free', 'pro', 'enterprise']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  domain: z.string().optional(),
  subscriptionTier: SubscriptionTierSchema.default('free'),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const TenantRoleSchema = z.enum(['owner', 'admin', 'member', 'guest']);
export type TenantRole = z.infer<typeof TenantRoleSchema>;

export const TenantMembershipSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string(),
  role: TenantRoleSchema.default('member'),
  joinedAt: z.string().datetime().optional(),
});
export type TenantMembership = z.infer<typeof TenantMembershipSchema>;
