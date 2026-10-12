import * as THREE from 'three';
import type { WorldPlot, InteractiveNode } from '@kynetra/contracts';

// Helper: Create 3D Billboard Sprite with Canvas
export function createPlotFloatingSprite(
  text: string,
  icon: string,
  status: string,
  yPos = 3.0,
  accentColor = '#f59e0b'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(16, 16, 480, 96);

    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.strokeRect(16, 16, 480, 96);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${icon} ${text}`, 256, 55);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 19px monospace';
    ctx.fillText(status, 256, 92);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.position.y = yPos;
  sprite.scale.set(3.4, 0.85, 1);
  return sprite;
}

// Helper: Create Surveyor Dimensions Badge
export function createSurveyorBadge(
  title: string,
  dimensions: string,
  area: string,
  yPos = 4.2
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.fillRect(16, 16, 480, 96);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(16, 16, 480, 96);

    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`📐 ${title}`, 256, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${dimensions} • ${area}`, 256, 88);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.position.y = yPos;
  sprite.scale.set(3.6, 0.9, 1);
  return sprite;
}

// Build the outdoor environment: Grass terrain, roads, 6 fenced plots, flags, and trees
export function buildPlotsAndRoads(
  plots: WorldPlot[],
  isSurveyorActive = false,
  onPlotClick?: (plot: WorldPlot) => void
): THREE.Group {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'plots_and_roads_root';

  const terrainSize = 130;

  // 1. Lush Green Estate Lawn Terrain
  const lawnGeo = new THREE.PlaneGeometry(terrainSize, terrainSize);
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x5a9e2d, // Vibrant grass green like the reference artwork
    roughness: 0.85,
    metalness: 0.05,
  });
  const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
  lawnMesh.rotation.x = -Math.PI / 2;
  lawnMesh.position.y = -0.01;
  lawnMesh.receiveShadow = true;
  rootGroup.add(lawnMesh);

  // Subtle isometric terrain grid lines matching the drawing
  const terrainGrid = new THREE.GridHelper(terrainSize, 65, 0x4d7c0f, 0x70a83b);
  terrainGrid.position.y = 0.005;
  rootGroup.add(terrainGrid);

  // 2. Asphalt Road Network matching the reference image layout
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x242d38, roughness: 0.7 });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.75 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Main East-West Avenue
  const roadEW = new THREE.Mesh(new THREE.BoxGeometry(terrainSize, 0.06, 8.5), roadMat);
  roadEW.position.set(0, 0.03, 0);
  roadEW.receiveShadow = true;
  rootGroup.add(roadEW);

  // North-South Avenue
  const roadNS = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.06, terrainSize), roadMat);
  roadNS.position.set(0, 0.03, 0);
  roadNS.receiveShadow = true;
  rootGroup.add(roadNS);

  // Curbs & Sidewalks along EW Avenue
  [-4.6, 4.6].forEach((offsetZ) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(terrainSize, 0.16, 0.4), curbMat);
    curb.position.set(0, 0.08, offsetZ);
    rootGroup.add(curb);

    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(terrainSize, 0.08, 2.4), sidewalkMat);
    sidewalk.position.set(0, 0.04, offsetZ + (offsetZ > 0 ? 1.4 : -1.4));
    sidewalk.receiveShadow = true;
    rootGroup.add(sidewalk);
  });

  // Curbs & Sidewalks along NS Avenue
  [-4.6, 4.6].forEach((offsetX) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, terrainSize), curbMat);
    curb.position.set(offsetX, 0.08, 0);
    rootGroup.add(curb);

    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, terrainSize), sidewalkMat);
    sidewalk.position.set(offsetX + (offsetX > 0 ? 1.4 : -1.4), 0.04, 0);
    sidewalk.receiveShadow = true;
    rootGroup.add(sidewalk);
  });

  // White Dashed Lane Dividers (EW & NS)
  for (let s = -55; s <= 55; s += 5) {
    if (Math.abs(s) > 5) {
      // EW stripes
      const stripeEW = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.28), stripeMat);
      stripeEW.rotation.x = -Math.PI / 2;
      stripeEW.position.set(s, 0.065, 0);
      rootGroup.add(stripeEW);

      // NS stripes
      const stripeNS = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 2.5), stripeMat);
      stripeNS.rotation.x = -Math.PI / 2;
      stripeNS.position.set(0, 0.065, s);
      rootGroup.add(stripeNS);
    }
  }

  // 3. Roadside Manicured Conical Trees and Hedges (matching the art style!)
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.9 });
  const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 });
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

  const createConicalTree = (x: number, z: number) => {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.2, 8), treeTrunkMat);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    tree.add(trunk);

    // Conical Foliage
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 8), treeFoliageMat);
    cone1.position.y = 2.2;
    cone1.castShadow = true;
    tree.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 8), treeFoliageMat);
    cone2.position.y = 3.2;
    cone2.castShadow = true;
    tree.add(cone2);

    return tree;
  };

  // Add trees along roadsides
  [-22, -34, -46, 22, 34, 46].forEach((xPos) => {
    rootGroup.add(createConicalTree(xPos, -6.8));
    rootGroup.add(createConicalTree(xPos, 6.8));
  });
  [-22, -34, -46, 22, 34, 46].forEach((zPos) => {
    rootGroup.add(createConicalTree(-6.8, zPos));
    rootGroup.add(createConicalTree(6.8, zPos));
  });

  // Roadside neat green hedges
  [-28, 28].forEach((hx) => {
    const hedge1 = new THREE.Mesh(new THREE.BoxGeometry(22, 0.65, 0.6), hedgeMat);
    hedge1.position.set(hx, 0.35, -5.6);
    rootGroup.add(hedge1);

    const hedge2 = new THREE.Mesh(new THREE.BoxGeometry(22, 0.65, 0.6), hedgeMat);
    hedge2.position.set(hx, 0.35, 5.6);
    rootGroup.add(hedge2);
  });

  // 4. Six Marked Land Plots (Parcels) matching the image
  const defaultPlots: WorldPlot[] =
    plots.length > 0
      ? plots
      : [
          {
            id: 'plot-01',
            plotNumber: 1,
            name: "Founder's Innovation Plot",
            status: 'occupied',
            dimensions: { width: 44, depth: 34 },
            coordinates: { x: -28, z: -25 },
            ownerName: 'Admin (Founder)',
            zoningType: 'Innovation Lab',
            assignedBuilding: 'Kynetra Tech Campus HQ',
            deedId: 'DEED-KYN-001-A',
            areaSquareMeters: 1496,
          },
          {
            id: 'plot-02',
            plotNumber: 2,
            name: 'North-East Greenfield Sandbox',
            status: 'available',
            dimensions: { width: 44, depth: 34 },
            coordinates: { x: 28, z: -25 },
            ownerName: 'Unassigned (Open for Claim)',
            zoningType: 'Greenfield Parcel',
            deedId: 'DEED-KYN-002-B',
            areaSquareMeters: 1496,
          },
          {
            id: 'plot-03',
            plotNumber: 3,
            name: 'Developer Guild Parcel Alpha',
            status: 'reserved',
            dimensions: { width: 44, depth: 34 },
            coordinates: { x: -28, z: 25 },
            ownerName: 'Open Source Maintainers Guild',
            zoningType: 'Commercial Enterprise',
            deedId: 'DEED-KYN-003-C',
            areaSquareMeters: 1496,
          },
          {
            id: 'plot-04',
            plotNumber: 4,
            name: 'Enterprise Cloud Datacenter Plot',
            status: 'occupied',
            dimensions: { width: 44, depth: 34 },
            coordinates: { x: 28, z: 25 },
            ownerName: 'Cloud Infrastructure SRE Team',
            zoningType: 'Cloud Data Facility',
            assignedBuilding: 'Kubernetes Edge Data Center',
            deedId: 'DEED-KYN-004-D',
            areaSquareMeters: 1496,
          },
          {
            id: 'plot-05',
            plotNumber: 5,
            name: 'South Parkway Tech Reserve',
            status: 'available',
            dimensions: { width: 34, depth: 26 },
            coordinates: { x: 0, z: 44 },
            ownerName: 'Kynetra Municipal Land Registry',
            zoningType: 'Greenfield Parcel',
            deedId: 'DEED-KYN-005-E',
            areaSquareMeters: 884,
          },
          {
            id: 'plot-06',
            plotNumber: 6,
            name: 'Algorithmic Coding Arena Grounds',
            status: 'occupied',
            dimensions: { width: 34, depth: 26 },
            coordinates: { x: 0, z: -44 },
            ownerName: 'Competitive Programming League',
            zoningType: 'Commercial Enterprise',
            assignedBuilding: 'Esports Coding Colosseum',
            deedId: 'DEED-KYN-006-F',
            areaSquareMeters: 884,
          },
        ];

  const fencePostMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
  const fenceCapMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });
  const fenceRailMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 }); // Bright orange triangular flag

  defaultPlots.forEach((plot) => {
    const plotGroup = new THREE.Group();
    plotGroup.position.set(plot.coordinates.x, 0, plot.coordinates.z);
    plotGroup.userData = { plotData: plot };

    const halfW = plot.dimensions.width / 2;
    const halfD = plot.dimensions.depth / 2;

    // Grass Parcel Inlay (slightly elevated vibrant parcel)
    const parcelGeo = new THREE.PlaneGeometry(plot.dimensions.width, plot.dimensions.depth);
    const parcelMat = new THREE.MeshStandardMaterial({
      color: plot.plotNumber === 1 ? 0x65a30d : 0x4d7c0f,
      roughness: 0.7,
    });
    const parcel = new THREE.Mesh(parcelGeo, parcelMat);
    parcel.rotation.x = -Math.PI / 2;
    parcel.position.y = 0.02;
    parcel.receiveShadow = true;
    plotGroup.add(parcel);

    // Parcel border curb
    const plotBorder = new THREE.Mesh(
      new THREE.BoxGeometry(plot.dimensions.width, 0.12, plot.dimensions.depth),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
    );
    plotBorder.position.y = 0.06;
    plotGroup.add(plotBorder);

    // 4 Corner Boundary Posts with Metal Caps
    [
      [-halfW, -halfD],
      [halfW, -halfD],
      [-halfW, halfD],
      [halfW, halfD],
    ].forEach(([cx, cz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.4, 0.32), fencePostMat);
      post.position.set(cx, 0.7, cz);
      post.castShadow = true;
      plotGroup.add(post);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.38), fenceCapMat);
      cap.position.set(cx, 1.45, cz);
      plotGroup.add(cap);
    });

    // Perimeter Fence Rails
    // Top & Bottom rails
    const hRailGeo = new THREE.BoxGeometry(plot.dimensions.width - 0.4, 0.08, 0.08);
    const vRailGeo = new THREE.BoxGeometry(0.08, 0.08, plot.dimensions.depth - 0.4);

    [0.45, 0.95].forEach((ry) => {
      const rNorth = new THREE.Mesh(hRailGeo, fenceRailMat);
      rNorth.position.set(0, ry, -halfD);
      plotGroup.add(rNorth);

      const rSouth = new THREE.Mesh(hRailGeo, fenceRailMat);
      rSouth.position.set(0, ry, halfD);
      plotGroup.add(rSouth);

      const rWest = new THREE.Mesh(vRailGeo, fenceRailMat);
      rWest.position.set(-halfW, ry, 0);
      plotGroup.add(rWest);

      const rEast = new THREE.Mesh(vRailGeo, fenceRailMat);
      rEast.position.set(halfW, ry, 0);
      plotGroup.add(rEast);
    });

    // Orange Triangular Surveyor Flag on Pole (matching the flag in the image!)
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), flagPoleMat);
    flagPole.position.set(halfW * 0.4, 1.6, halfD * 0.4);
    flagPole.castShadow = true;
    plotGroup.add(flagPole);

    // Triangular flag geometry
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(1.2, 0.4);
    flagShape.lineTo(0, 0.8);
    flagShape.closePath();

    const flagMesh = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), flagMat);
    flagMesh.position.set(halfW * 0.4 + 0.05, 2.3, halfD * 0.4);
    plotGroup.add(flagMesh);

    // Plot Number Voxel Marker Block
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const markerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), markerMat);
    markerBlock.position.set(halfW * 0.8, 0.15, halfD * 0.8);
    plotGroup.add(markerBlock);

    // Special Plot 1 (Founder's Plot / SPAWN POINT) Features
    if (plot.plotNumber === 1) {
      // Glowing Spawn Platform Pad
      const spawnRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
      const spawnRing = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.08, 24), spawnRingMat);
      spawnRing.position.set(4, 0.05, 4);
      plotGroup.add(spawnRing);

      const spawnInnerMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.6,
      });
      const spawnInner = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.06, 24), spawnInnerMat);
      spawnInner.position.set(4, 0.04, 4);
      plotGroup.add(spawnInner);

      const spawnSprite = createPlotFloatingSprite(
        "FOUNDER'S PLOT #01",
        '📍',
        'PRIMARY USER SPAWN POINT',
        3.6,
        '#38bdf8'
      );
      spawnSprite.position.set(4, 3.6, 4);
      plotGroup.add(spawnSprite);
    } else {
      const plotSprite = createPlotFloatingSprite(
        `PLOT #${plot.plotNumber}: ${plot.name}`,
        plot.status === 'occupied' ? '🏢' : plot.status === 'reserved' ? '🛠️' : '🌱',
        `STATUS: ${plot.status.toUpperCase()} • CLICK FOR DEED`,
        3.2,
        plot.status === 'occupied' ? '#10b981' : plot.status === 'reserved' ? '#f59e0b' : '#38bdf8'
      );
      plotGroup.add(plotSprite);
    }

    // Surveyor Measurement Badges (when active)
    if (isSurveyorActive) {
      const surveyorBadge = createSurveyorBadge(
        `Plot ${plot.plotNumber} (${plot.zoningType})`,
        `${plot.dimensions.width}m × ${plot.dimensions.depth}m`,
        `Area: ${plot.areaSquareMeters || plot.dimensions.width * plot.dimensions.depth} m²`,
        4.4
      );
      plotGroup.add(surveyorBadge);
    }

    rootGroup.add(plotGroup);
  });

  return rootGroup;
}

// Build the Central Company Headquarters Campus Building matching the reference artwork
export function buildCompanyBuilding(): THREE.Group {
  const companyGroup = new THREE.Group();
  companyGroup.name = 'company_hq_building';
  companyGroup.position.set(0, 0, -2);

  // 1. Campus Paved Plaza Platform
  const plazaGeo = new THREE.BoxGeometry(34, 0.16, 26);
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.set(0, 0.08, 0);
  plaza.receiveShadow = true;
  companyGroup.add(plaza);

  // Plaza curb border
  const plazaCurb = new THREE.Mesh(
    new THREE.BoxGeometry(34.4, 0.22, 26.4),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
  );
  plazaCurb.position.set(0, 0.07, 0);
  companyGroup.add(plazaCurb);

  // 2. Main Building Pavilion (Teal / Blue-Green Walls matching reference image)
  const tealMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488, // Modern architectural teal
    roughness: 0.35,
    metalness: 0.15,
  });
  const darkTealMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.4,
  });

  const mainWing = new THREE.Mesh(new THREE.BoxGeometry(15, 6.8, 12), tealMat);
  mainWing.position.set(-2, 3.4, -2);
  mainWing.castShadow = true;
  mainWing.receiveShadow = true;
  companyGroup.add(mainWing);

  // White architectural band / accents
  const whiteBand = new THREE.Mesh(
    new THREE.BoxGeometry(15.2, 0.3, 12.2),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
  );
  whiteBand.position.set(-2, 3.2, -2);
  companyGroup.add(whiteBand);

  // 3. Modern Angled Shed Roof (Blue Roofing matching reference artwork!)
  const roofShedMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8, // Vibrant modern blue shed roof
    roughness: 0.25,
    metalness: 0.3,
  });

  const shedRoofGeo = new THREE.BoxGeometry(16.5, 0.45, 13.5);
  const shedRoof = new THREE.Mesh(shedRoofGeo, roofShedMat);
  shedRoof.position.set(-2, 7.2, -2);
  shedRoof.rotation.z = -0.16; // Angled modern slope matching drawing
  shedRoof.castShadow = true;
  companyGroup.add(shedRoof);

  // White fascia soffit under roof
  const roofFascia = new THREE.Mesh(
    new THREE.BoxGeometry(16.8, 0.18, 13.8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  );
  roofFascia.position.set(-2, 7.0, -2);
  roofFascia.rotation.z = -0.16;
  companyGroup.add(roofFascia);

  // Rooftop HVAC ventilation condensers
  [-4, 0].forEach((rx) => {
    const hvac = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
    );
    hvac.position.set(rx, 7.7, -3);
    companyGroup.add(hvac);
  });

  // 4. Right Annex Wing (Lower Flat Roof matching the image!)
  const annex = new THREE.Mesh(new THREE.BoxGeometry(9.5, 5.0, 9.5), darkTealMat);
  annex.position.set(8.5, 2.5, 0);
  annex.castShadow = true;
  companyGroup.add(annex);

  const annexRoof = new THREE.Mesh(
    new THREE.BoxGeometry(9.8, 0.3, 9.8),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
  );
  annexRoof.position.set(8.5, 5.15, 0);
  companyGroup.add(annexRoof);

  // Rooftop AC units on annex
  const annexHvac = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.8, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5 })
  );
  annexHvac.position.set(8.5, 5.65, 0);
  companyGroup.add(annexHvac);

  // 5. Floor-to-ceiling Glass Facade & Windows
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.8,
  });

  // Main Entrance Glass Windows
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(11, 4.2, 0.1), glassMat);
  frontGlass.position.set(-2, 2.4, 4.05);
  companyGroup.add(frontGlass);

  // Annex front window
  const annexGlass = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.2, 0.1), glassMat);
  annexGlass.position.set(8.5, 2.2, 4.8);
  companyGroup.add(annexGlass);

  // Window mullions (dark aluminum frames)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
  [-5, -2, 1].forEach((fx) => {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.2, 0.14), frameMat);
    mullion.position.set(fx, 2.4, 4.08);
    companyGroup.add(mullion);
  });

  // 6. Front Entrance Canopy Awning & Porch Steps (matching the artwork)
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 3.2), canopyMat);
  canopy.position.set(0, 3.8, 5.2);
  companyGroup.add(canopy);

  // Canopy support pillars
  [-2.4, 2.4].forEach((px) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 })
    );
    pillar.position.set(px, 1.85, 6.5);
    companyGroup.add(pillar);
  });

  // Entrance Porch Steps
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.2, 2.0), stepMat);
  step1.position.set(0, 0.1, 5.8);
  companyGroup.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 1.6), stepMat);
  step2.position.set(0, 0.25, 4.8);
  companyGroup.add(step2);

  // 7. Outdoor Campus Directory Signboard & Avatars (matching the drawing where people stand around the board!)
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(-5.5, 0, 7.5);

  // Wood / metal signboard easel
  const easelMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 0.8 });
  const easelPostL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), easelMat);
  easelPostL.position.set(-1.4, 1.2, 0);
  kioskGroup.add(easelPostL);

  const easelPostR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), easelMat);
  easelPostR.position.set(1.4, 1.2, 0);
  kioskGroup.add(easelPostR);

  // Directory Canvas Board
  const boardGeo = new THREE.BoxGeometry(2.8, 1.6, 0.08);
  const boardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, 1.6, 0);
  kioskGroup.add(board);

  // Canvas map content texture
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 384;
  mapCanvas.height = 220;
  const mapCtx = mapCanvas.getContext('2d');
  if (mapCtx) {
    mapCtx.fillStyle = '#0f172a';
    mapCtx.fillRect(0, 0, 384, 220);

    mapCtx.fillStyle = '#f59e0b';
    mapCtx.font = 'bold 20px monospace';
    mapCtx.fillText('CAMPUS PLOTS DIRECTORY', 24, 34);

    mapCtx.fillStyle = '#38bdf8';
    mapCtx.font = 'bold 15px monospace';
    mapCtx.fillText('KYNETRA HEADQUARTERS MAP', 24, 60);

    // Draw miniature plot boxes
    mapCtx.fillStyle = '#10b981';
    mapCtx.fillRect(24, 78, 65, 45);
    mapCtx.fillRect(100, 78, 65, 45);
    mapCtx.fillStyle = '#0d9488';
    mapCtx.fillRect(175, 78, 90, 45); // Central HQ
    mapCtx.fillStyle = '#3b82f6';
    mapCtx.fillRect(275, 78, 65, 45);

    mapCtx.fillStyle = '#cbd5e1';
    mapCtx.font = 'bold 13px monospace';
    mapCtx.fillText('Plots: 1-6 • Company HQ • Workspace', 24, 155);
    mapCtx.fillText('Click or [E] to Inspect Deeds', 24, 185);
  }
  const mapTex = new THREE.CanvasTexture(mapCanvas);
  const mapDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(2.65, 1.45),
    new THREE.MeshBasicMaterial({ map: mapTex })
  );
  mapDisplay.position.set(0, 1.6, 0.05);
  kioskGroup.add(mapDisplay);

  // Stylized avatars gathered around the board (matching the artwork figures!)
  const figureColors = [0x0284c7, 0x10b981, 0xf59e0b, 0x8b5cf6];
  figureColors.forEach((fCol, idx) => {
    const fGroup = new THREE.Group();
    const fx = -1.2 + idx * 0.8;
    const fz = 1.0 + (idx % 2 === 0 ? 0.3 : -0.2);
    fGroup.position.set(fx, 0, fz);

    const fSkin = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xe0a98b })
    );
    fSkin.position.y = 1.35;
    fGroup.add(fSkin);

    const fTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.55, 0.24),
      new THREE.MeshStandardMaterial({ color: fCol })
    );
    fTorso.position.y = 0.9;
    fGroup.add(fTorso);

    const fPants = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.6, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    fPants.position.y = 0.35;
    fGroup.add(fPants);

    kioskGroup.add(fGroup);
  });

  companyGroup.add(kioskGroup);

  // 8. Plaza Landscaping Islands & Trees
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
  const island1 = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.2, 4.5), islandMat);
  island1.position.set(-9.5, 0.12, 6.5);
  companyGroup.add(island1);

  const island2 = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.2, 4.5), islandMat);
  island2.position.set(9.5, 0.12, 6.5);
  companyGroup.add(island2);

  // Conical ornamental trees on islands
  const createOrnamentalTree = (tx: number, tz: number) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0.2, tz);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3219 })
    );
    trunk.position.y = 0.4;
    tGroup.add(trunk);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 })
    );
    cone.position.y = 1.8;
    cone.castShadow = true;
    tGroup.add(cone);

    return tGroup;
  };

  companyGroup.add(createOrnamentalTree(-9.5, 6.5));
  companyGroup.add(createOrnamentalTree(9.5, 6.5));

  // 9. Floating Company Billboard Header
  const companySign = createPlotFloatingSprite(
    'KYNETRA TECH HQ • ENTERPRISE CAMPUS',
    '🏢',
    'STAGE 2: COMPANY ➔ ENTER WORKSPACE [E]',
    8.2,
    '#38bdf8'
  );
  companySign.position.set(0, 8.2, 0);
  companyGroup.add(companySign);

  return companyGroup;
}
