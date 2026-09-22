import { describe, it, expect } from 'vitest';
import {
  OrganizationSchema,
  TenantMembershipSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  CampusSchema,
  BuildingSchema,
} from './index.js';

describe('Organization and Auth Contracts Validation', () => {
  it('validates a valid Organization entity', () => {
    const org = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Acme Robotics',
      slug: 'acme-robotics',
      subscriptionTier: 'pro',
    };

    const parsed = OrganizationSchema.parse(org);
    expect(parsed.name).toBe('Acme Robotics');
    expect(parsed.subscriptionTier).toBe('pro');
  });

  it('rejects an invalid organization slug', () => {
    const invalidOrg = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Invalid Org',
      slug: 'Invalid Slug With Spaces!',
    };

    expect(() => OrganizationSchema.parse(invalidOrg)).toThrow();
  });

  it('validates TenantMembership', () => {
    const membership = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'user-001',
      role: 'admin',
    };

    const parsed = TenantMembershipSchema.parse(membership);
    expect(parsed.role).toBe('admin');
  });

  it('validates LoginRequest and RegisterRequest', () => {
    const login = {
      email: 'dev@kynetra.dev',
      password: 'StrongPassword123!',
    };
    expect(LoginRequestSchema.parse(login).email).toBe('dev@kynetra.dev');

    const register = {
      email: 'newdev@kynetra.dev',
      password: 'StrongPassword123!',
      handle: 'hyper_coder',
      displayName: 'Hyper Coder',
    };
    expect(RegisterRequestSchema.parse(register).handle).toBe('hyper_coder');
  });

  it('validates Campus and Building models', () => {
    const campus = {
      id: 'campus-central',
      name: 'Kynetra Central Campus',
      districtId: 'kynetra-central',
      coordinates: { x: 0, y: 0 },
      isPrivateTenant: false,
    };
    expect(CampusSchema.parse(campus).name).toBe('Kynetra Central Campus');

    const building = {
      id: 'bldg-innovation-tower',
      districtId: 'kynetra-central',
      name: 'Innovation Tower',
      code: 'IT-01',
      totalFloors: 12,
    };
    expect(BuildingSchema.parse(building).totalFloors).toBe(12);
  });
});
