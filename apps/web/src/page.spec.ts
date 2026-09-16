import { describe, it, expect } from 'vitest';
import { WorldDistrictSchema } from '@kynetra/contracts';

describe('Web Console Domain & Contract Integration', () => {
  it('ensures district definitions in web console adhere to WorldDistrict schema', () => {
    const kynetraCentral = {
      id: 'kynetra-central',
      name: 'Kynetra Central',
      theme: 'Civic & Headquarters',
      description: 'The civic core of Kynetra. Features Central Plaza, civic forums, and the Innovation Tower.',
      coordinates: { x: 0, y: 0 },
      status: 'active',
      activeUsers: 342,
      keyLandmark: 'Innovation Tower',
    };

    const parsed = WorldDistrictSchema.safeParse(kynetraCentral);
    expect(parsed.success).toBe(true);
  });
});
