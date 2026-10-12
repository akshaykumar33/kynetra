export interface BoxCollider {
  type: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name?: string;
}

export interface CircleCollider {
  type: 'circle';
  x: number;
  z: number;
  radius: number;
  name?: string;
}

export type WorldCollider = BoxCollider | CircleCollider;

/**
 * Outdoor Environment Colliders
 * Prevents player from entering building walls, annex, kiosks, trees, planter islands, and boundary fences.
 */
export const OUTDOOR_COLLIDERS: WorldCollider[] = [
  // 1. Company Headquarters Building - Right Annex Wing (Solid dark teal structure)
  // Annex center: (8.5, -2.0), Box size: 9.5 x 9.5
  {
    type: 'box',
    name: 'building_annex_wing',
    minX: 3.75,
    maxX: 13.25,
    minZ: -6.75,
    maxZ: 2.75,
  },

  // 2. Company Headquarters Building - Main Pavilion Left Wall
  // Main wing spans x: [-9.5, 5.5], z: [-10.0, 2.0]
  // Central entrance doorway is at x: [-1.6, 1.6], z: 2.0
  {
    type: 'box',
    name: 'building_main_wing_left',
    minX: -9.5,
    maxX: -1.6,
    minZ: -10.0,
    maxZ: 2.1,
  },

  // 3. Company Headquarters Building - Main Pavilion Right Wall (flanking entrance)
  {
    type: 'box',
    name: 'building_main_wing_right',
    minX: 1.6,
    maxX: 4.0,
    minZ: -2.0,
    maxZ: 2.1,
  },

  // 4. Company Headquarters Building - West Perimeter Wall
  {
    type: 'box',
    name: 'building_main_wing_west',
    minX: -9.8,
    maxX: -9.2,
    minZ: -10.0,
    maxZ: 2.0,
  },

  // 5. Company Headquarters Building - North Perimeter Wall (Back of building)
  {
    type: 'box',
    name: 'building_main_wing_north_back',
    minX: -9.5,
    maxX: 13.25,
    minZ: -10.5,
    maxZ: -9.6,
  },

  // 6. Doorway interior backstop (prevents walking deeper than doorway threshold without transitioning)
  {
    type: 'box',
    name: 'building_entrance_backstop',
    minX: -1.8,
    maxX: 1.8,
    minZ: 0.8,
    maxZ: 1.6,
  },

  // 7. Canopy Entrance Support Pillars
  {
    type: 'circle',
    name: 'canopy_pillar_left',
    x: -2.4,
    z: 4.5,
    radius: 0.3,
  },
  {
    type: 'circle',
    name: 'canopy_pillar_right',
    x: 2.4,
    z: 4.5,
    radius: 0.3,
  },

  // 8. Campus Directory Signboard Kiosk & Group of Avatars
  {
    type: 'box',
    name: 'campus_directory_kiosk',
    minX: -7.2,
    maxX: -3.8,
    minZ: 4.6,
    maxZ: 7.2,
  },

  // 9. Plaza Landscaping Islands & Ornamental Conical Trees
  {
    type: 'box',
    name: 'plaza_island_left',
    minX: -12.4,
    maxX: -6.6,
    minZ: 2.1,
    maxZ: 6.9,
  },
  {
    type: 'box',
    name: 'plaza_island_right',
    minX: 6.6,
    maxX: 12.4,
    minZ: 2.1,
    maxZ: 6.9,
  },

  // 10. Roadside Trees along East-West & North-South Avenues
  ...[-46, -34, -22, 22, 34, 46].flatMap((x) => [
    { type: 'circle' as const, name: `tree_ew_south_${x}`, x, z: -6.8, radius: 0.45 },
    { type: 'circle' as const, name: `tree_ew_north_${x}`, x, z: 6.8, radius: 0.45 },
  ]),
  ...[-46, -34, -22, 22, 34, 46].flatMap((z) => [
    { type: 'circle' as const, name: `tree_ns_west_${z}`, x: -6.8, z, radius: 0.45 },
    { type: 'circle' as const, name: `tree_ns_east_${z}`, x: 6.8, z, radius: 0.45 },
  ]),

  // 11. Roadside Hedges
  {
    type: 'box',
    name: 'road_hedge_nw',
    minX: -39,
    maxX: -17,
    minZ: -5.95,
    maxZ: -5.25,
  },
  {
    type: 'box',
    name: 'road_hedge_sw',
    minX: -39,
    maxX: -17,
    minZ: 5.25,
    maxZ: 5.95,
  },
  {
    type: 'box',
    name: 'road_hedge_ne',
    minX: 17,
    maxX: 39,
    minZ: -5.95,
    maxZ: -5.25,
  },
  {
    type: 'box',
    name: 'road_hedge_se',
    minX: 17,
    maxX: 39,
    minZ: 5.25,
    maxZ: 5.95,
  },

  // 12. Plot 1 (Founder's Plot) Perimeter Fences with Gate Opening to Road
  // Plot 1 bounds: x: [-50, -6], z: [-42, -8]
  // Gate to road is at x: [-28, -20], z = -8
  {
    type: 'box',
    name: 'plot1_fence_north',
    minX: -50.2,
    maxX: -5.8,
    minZ: -42.2,
    maxZ: -41.6,
  },
  {
    type: 'box',
    name: 'plot1_fence_west',
    minX: -50.2,
    maxX: -49.6,
    minZ: -42.0,
    maxZ: -8.0,
  },
  {
    type: 'box',
    name: 'plot1_fence_east',
    minX: -6.4,
    maxX: -5.8,
    minZ: -42.0,
    maxZ: -8.0,
  },
  {
    type: 'box',
    name: 'plot1_fence_south_left',
    minX: -50.0,
    maxX: -28.0,
    minZ: -8.4,
    maxZ: -7.6,
  },
  {
    type: 'box',
    name: 'plot1_fence_south_right',
    minX: -20.0,
    maxX: -6.0,
    minZ: -8.4,
    maxZ: -7.6,
  },
];

/**
 * Workspace Interior Colliders
 * Prevents player from entering outer glass walls, desks, conference table, lounge sofa, etc.
 */
export const WORKSPACE_COLLIDERS: WorldCollider[] = [
  // 1. Perimeter Walls (roomSize = 36)
  // West Glass Wall
  {
    type: 'box',
    name: 'workspace_west_wall',
    minX: -18.5,
    maxX: -17.5,
    minZ: -18.2,
    maxZ: 14.5,
  },
  // East Glass Wall
  {
    type: 'box',
    name: 'workspace_east_wall',
    minX: 17.5,
    maxX: 18.5,
    minZ: -18.2,
    maxZ: 14.5,
  },
  // North Panoramic Window Wall
  {
    type: 'box',
    name: 'workspace_north_wall',
    minX: -18.2,
    maxX: 18.2,
    minZ: -18.5,
    maxZ: -17.5,
  },
  // South Wall Left (leaving doorway at x: [-2.5, 2.5])
  {
    type: 'box',
    name: 'workspace_south_wall_left',
    minX: -18.2,
    maxX: -2.5,
    minZ: 13.7,
    maxZ: 14.5,
  },
  // South Wall Right
  {
    type: 'box',
    name: 'workspace_south_wall_right',
    minX: 2.5,
    maxX: 18.2,
    minZ: 13.7,
    maxZ: 14.5,
  },

  // 2. Workstations & Terminal Desks
  // Desk 01: Full-Stack IDE Lab (x: -8, z: 2)
  {
    type: 'box',
    name: 'station_dev_desk_1',
    minX: -10.2,
    maxX: -5.8,
    minZ: 0.8,
    maxZ: 3.2,
  },
  // Desk 02: Cloud & SRE Incident NOC (x: 8, z: 2)
  {
    type: 'box',
    name: 'station_sre_noc',
    minX: 5.8,
    maxX: 10.2,
    minZ: 0.8,
    maxZ: 3.2,
  },
  // Battle Pod Alpha (x: -8, z: -5)
  {
    type: 'box',
    name: 'station_battle_pod_alpha',
    minX: -9.8,
    maxX: -6.2,
    minZ: -6.3,
    maxZ: -3.7,
  },
  // Battle Pod Beta (x: 8, z: -5)
  {
    type: 'box',
    name: 'station_battle_pod_beta',
    minX: 6.2,
    maxX: 9.8,
    minZ: -6.3,
    maxZ: -3.7,
  },
  // Executive Admin Master Terminal (x: 10, z: -9)
  {
    type: 'box',
    name: 'station_admin_console',
    minX: 8.4,
    maxX: 11.6,
    minZ: -10.6,
    maxZ: -7.4,
  },
  // System Architecture Whiteboard (x: -10, z: -9)
  {
    type: 'box',
    name: 'station_whiteboard',
    minX: -11.6,
    maxX: -8.4,
    minZ: -9.8,
    maxZ: -8.2,
  },
  // Aria AI Concierge Pod (x: 0, z: 6)
  {
    type: 'box',
    name: 'station_aria_reception',
    minX: -1.8,
    maxX: 1.8,
    minZ: 5.2,
    maxZ: 6.8,
  },

  // 3. All-Hands Round Conference Table (x: -7.5, z: -6.5)
  {
    type: 'circle',
    name: 'conference_table',
    x: -7.5,
    z: -6.5,
    radius: 1.9,
  },

  // 4. Break Lounge Furniture
  // Birch & Wool Sofa (x: -1, z: -12)
  {
    type: 'box',
    name: 'lounge_sofa',
    minX: -2.8,
    maxX: 0.8,
    minZ: -12.7,
    maxZ: -11.3,
  },
  // Coffee Table & Espresso Brewer (x: -1, z: -13.2)
  {
    type: 'box',
    name: 'lounge_coffee_table',
    minX: -2.0,
    maxX: 0.0,
    minZ: -13.8,
    maxZ: -12.6,
  },
  // Potted Bush
  {
    type: 'circle',
    name: 'lounge_bush',
    x: -3.2,
    z: -10.8,
    radius: 0.7,
  },
];
