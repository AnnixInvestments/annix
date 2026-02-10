"use client";

import {
  Center,
  ContactShadows,
  Line as DreiLine,
  Environment,
  OrbitControls,
  Text,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  FLANGE_MATERIALS,
  GEOMETRY_CONSTANTS,
  LIGHTING_CONFIG,
  PIPE_MATERIALS,
  SCENE_CONSTANTS,
  STEELWORK_MATERIALS,
  WELD_MATERIALS,
  outerDiameterFromNB,
  wallThicknessFromNB,
} from "@/app/lib/config/rfq/rendering3DStandards";
import { log } from "@/app/lib/logger";

const Line = (props: React.ComponentProps<typeof DreiLine>) => {
  const { size } = useThree();
  return <DreiLine {...props} resolution={new THREE.Vector2(size.width, size.height)} />;
};

function CaptureHelper({
  captureRef,
}: {
  captureRef: React.MutableRefObject<(() => string | null) | null>;
}) {
  const { gl, scene, camera } = useThree();

  React.useEffect(() => {
    captureRef.current = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, scene, camera, captureRef]);

  return null;
}

import { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";
import {
  getGussetSection,
  getSabs719TeeDimensions,
  getTeeHeight,
  Sabs719TeeType,
} from "@/app/lib/utils/sabs719TeeData";

const useDebouncedProps = <T extends Record<string, any>>(props: T, delay: number = 150): T => {
  const [debouncedProps, setDebouncedProps] = useState(props);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setDebouncedProps(props);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [props, delay]);

  return debouncedProps;
};

const SCALE_FACTOR = GEOMETRY_CONSTANTS.FITTING_SCALE;
const PREVIEW_SCALE = SCENE_CONSTANTS.PREVIEW_SCALE;
const MIN_CAMERA_DISTANCE = SCENE_CONSTANTS.MIN_CAMERA_DISTANCE;
const MAX_CAMERA_DISTANCE = SCENE_CONSTANTS.MAX_CAMERA_DISTANCE;

const pipeOuterMat = PIPE_MATERIALS.outer;
const pipeInnerMat = PIPE_MATERIALS.inner;
const pipeEndMat = PIPE_MATERIALS.end;
const weldColor = WELD_MATERIALS.standard;
const flangeColor = FLANGE_MATERIALS.standard;
const blankFlangeColor = FLANGE_MATERIALS.blank;
const closureColor = WELD_MATERIALS.closure;
const rotatingFlangeColor = FLANGE_MATERIALS.rotating;
const gussetColor = STEELWORK_MATERIALS.rib;

// Flange type for rendering
type FlangeType = "fixed" | "loose" | "rotating" | null;

interface Tee3DPreviewProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness?: number;
  teeType: Sabs719TeeType; // 'short' or 'gusset'
  branchNominalBore?: number; // For reducing tees (optional)
  branchOuterDiameter?: number;
  teeNominalBore?: number; // For unequal tees - branch pipe size
  teeFlangeSpecs?: FlangeSpecData | null; // For unequal tees - separate flange specs for tee
  runLength?: number; // Total length of run pipe (optional)
  branchPositionMm?: number; // Distance from left flange to center of branch (optional)
  materialName?: string;
  hasInletFlange?: boolean;
  hasOutletFlange?: boolean;
  hasBranchFlange?: boolean;
  // Flange types for each end
  inletFlangeType?: FlangeType;
  outletFlangeType?: FlangeType;
  branchFlangeType?: FlangeType;
  // Closure length for loose flanges (site weld extension)
  closureLengthMm?: number;
  // Blank flange options
  addBlankFlange?: boolean;
  blankFlangeCount?: number;
  blankFlangePositions?: string[]; // ['inlet', 'outlet', 'branch']
  // Camera persistence
  savedCameraPosition?: [number, number, number];
  savedCameraTarget?: [number, number, number];
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
  // Notes for display
  selectedNotes?: string[];
  // Dynamic flange specs from API
  flangeSpecs?: FlangeSpecData | null;
  // Dynamic flange spec display
  flangeStandardName?: string;
  pressureClassDesignation?: string;
  flangeTypeCode?: string;
}

const getOuterDiameter = outerDiameterFromNB;
const getWallThickness = wallThicknessFromNB;

// Flange lookup table based on nominal bore - SABS 1123 Table 1000/4 (PN16) Slip-on flanges
// Bolt length calculated for: 2 x flange thickness + gasket (3mm) + nut + washer + thread engagement
// Returns { specs, isFromApi } to indicate if data is from API or fallback
const getFlangeSpecs = (
  nb: number,
  apiSpecs?: FlangeSpecData | null,
): {
  specs: {
    flangeOD: number;
    pcd: number;
    thickness: number;
    boltHoles: number;
    holeID: number;
    boltSize: number;
    boltLength: number;
  };
  isFromApi: boolean;
} => {
  if (apiSpecs) {
    return {
      specs: {
        flangeOD: apiSpecs.flangeOdMm,
        pcd: apiSpecs.flangePcdMm,
        thickness: apiSpecs.flangeThicknessMm,
        boltHoles: apiSpecs.flangeNumHoles,
        holeID: apiSpecs.flangeBoltHoleDiameterMm,
        boltSize: apiSpecs.boltDiameterMm || 16,
        boltLength: apiSpecs.boltLengthMm || 70,
      },
      isFromApi: true,
    };
  }

  const flangeData: Record<
    number,
    {
      flangeOD: number;
      pcd: number;
      thickness: number;
      boltHoles: number;
      holeID: number;
      boltSize: number;
      boltLength: number;
    }
  > = {
    15: {
      flangeOD: 95,
      pcd: 65,
      thickness: 14,
      boltHoles: 4,
      holeID: 14,
      boltSize: 12,
      boltLength: 55,
    },
    20: {
      flangeOD: 105,
      pcd: 75,
      thickness: 14,
      boltHoles: 4,
      holeID: 14,
      boltSize: 12,
      boltLength: 55,
    },
    25: {
      flangeOD: 115,
      pcd: 85,
      thickness: 14,
      boltHoles: 4,
      holeID: 14,
      boltSize: 12,
      boltLength: 55,
    },
    32: {
      flangeOD: 140,
      pcd: 100,
      thickness: 16,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 65,
    },
    40: {
      flangeOD: 150,
      pcd: 110,
      thickness: 16,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 65,
    },
    50: {
      flangeOD: 165,
      pcd: 125,
      thickness: 18,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    65: {
      flangeOD: 185,
      pcd: 145,
      thickness: 18,
      boltHoles: 4,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    80: {
      flangeOD: 200,
      pcd: 160,
      thickness: 18,
      boltHoles: 8,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    100: {
      flangeOD: 220,
      pcd: 180,
      thickness: 18,
      boltHoles: 8,
      holeID: 18,
      boltSize: 16,
      boltLength: 70,
    },
    125: {
      flangeOD: 250,
      pcd: 210,
      thickness: 20,
      boltHoles: 8,
      holeID: 18,
      boltSize: 16,
      boltLength: 75,
    },
    150: {
      flangeOD: 285,
      pcd: 240,
      thickness: 20,
      boltHoles: 8,
      holeID: 22,
      boltSize: 20,
      boltLength: 80,
    },
    200: {
      flangeOD: 340,
      pcd: 295,
      thickness: 22,
      boltHoles: 12,
      holeID: 22,
      boltSize: 20,
      boltLength: 85,
    },
    250: {
      flangeOD: 405,
      pcd: 355,
      thickness: 24,
      boltHoles: 12,
      holeID: 26,
      boltSize: 24,
      boltLength: 95,
    },
    300: {
      flangeOD: 460,
      pcd: 410,
      thickness: 24,
      boltHoles: 12,
      holeID: 26,
      boltSize: 24,
      boltLength: 95,
    },
    350: {
      flangeOD: 520,
      pcd: 470,
      thickness: 26,
      boltHoles: 16,
      holeID: 26,
      boltSize: 24,
      boltLength: 100,
    },
    400: {
      flangeOD: 580,
      pcd: 525,
      thickness: 28,
      boltHoles: 16,
      holeID: 30,
      boltSize: 27,
      boltLength: 110,
    },
    450: {
      flangeOD: 640,
      pcd: 585,
      thickness: 28,
      boltHoles: 20,
      holeID: 30,
      boltSize: 27,
      boltLength: 110,
    },
    500: {
      flangeOD: 670,
      pcd: 620,
      thickness: 32,
      boltHoles: 20,
      holeID: 26,
      boltSize: 24,
      boltLength: 115,
    },
    600: {
      flangeOD: 780,
      pcd: 725,
      thickness: 32,
      boltHoles: 20,
      holeID: 30,
      boltSize: 27,
      boltLength: 120,
    },
    650: {
      flangeOD: 830,
      pcd: 775,
      thickness: 34,
      boltHoles: 20,
      holeID: 30,
      boltSize: 27,
      boltLength: 125,
    },
    700: {
      flangeOD: 885,
      pcd: 830,
      thickness: 34,
      boltHoles: 24,
      holeID: 30,
      boltSize: 27,
      boltLength: 125,
    },
    750: {
      flangeOD: 940,
      pcd: 880,
      thickness: 36,
      boltHoles: 24,
      holeID: 33,
      boltSize: 30,
      boltLength: 135,
    },
    800: {
      flangeOD: 1015,
      pcd: 950,
      thickness: 38,
      boltHoles: 24,
      holeID: 33,
      boltSize: 30,
      boltLength: 140,
    },
    850: {
      flangeOD: 1065,
      pcd: 1000,
      thickness: 38,
      boltHoles: 24,
      holeID: 33,
      boltSize: 30,
      boltLength: 140,
    },
    900: {
      flangeOD: 1115,
      pcd: 1050,
      thickness: 40,
      boltHoles: 28,
      holeID: 33,
      boltSize: 30,
      boltLength: 145,
    },
  };
  const sizes = Object.keys(flangeData)
    .map(Number)
    .sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nb) closestSize = size;
    else break;
  }
  return {
    specs: flangeData[closestSize] || {
      flangeOD: nb * 1.5,
      pcd: nb * 1.3,
      thickness: 26,
      boltHoles: 12,
      holeID: 22,
      boltSize: 20,
      boltLength: 90,
    },
    isFromApi: false,
  };
};

// Blank Flange component (solid disc with bolt holes, no center bore)
function BlankFlangeComponent({
  position,
  rotation,
  outerDiameter,
  thickness,
  pcd,
  boltHoles,
  holeID,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  outerDiameter: number;
  thickness: number;
  pcd: number;
  boltHoles: number;
  holeID: number;
}) {
  const blankGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerDiameter / 2, 0, Math.PI * 2, false);

    // Add bolt holes only (no center bore - it's a blank/blind flange)
    for (let i = 0; i < boltHoles; i++) {
      const angle = (i / boltHoles) * Math.PI * 2;
      const x = Math.cos(angle) * (pcd / 2);
      const y = Math.sin(angle) * (pcd / 2);
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeID / 2, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [outerDiameter, thickness, pcd, boltHoles, holeID]);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={blankGeometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...blankFlangeColor} />
    </mesh>
  );
}

// Retaining Ring component for rotating flanges
function RetainingRingComponent({
  position,
  rotation,
  pipeOuterRadius,
  pipeInnerRadius,
  thickness,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  pipeOuterRadius: number;
  pipeInnerRadius: number;
  thickness: number;
}) {
  // Ring OD should be larger than pipe OD but smaller than the flange
  const ringOuterRadius = pipeOuterRadius * 1.15; // 15% larger than pipe OD

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, ringOuterRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, pipeInnerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const extrudeSettings = { depth: thickness, bevelEnabled: false, curveSegments: 32 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [ringOuterRadius, pipeInnerRadius, thickness]);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...flangeColor} />
    </mesh>
  );
}

// Rotating Flange component (hole larger than pipe OD to allow rotation)
function RotatingFlangeComponent({
  position,
  rotation,
  outerDiameter,
  pipeOuterDiameter,
  thickness,
  pcd,
  boltHoles,
  holeID,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  outerDiameter: number;
  pipeOuterDiameter: number; // The flange hole must be larger than this
  thickness: number;
  pcd: number;
  boltHoles: number;
  holeID: number;
}) {
  // Hole is 5% larger than pipe OD to allow rotation
  const holeDiameter = pipeOuterDiameter * 1.05;

  const flangeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerDiameter / 2, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, holeDiameter / 2, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    // Add bolt holes
    for (let i = 0; i < boltHoles; i++) {
      const angle = (i / boltHoles) * Math.PI * 2;
      const x = Math.cos(angle) * (pcd / 2);
      const y = Math.sin(angle) * (pcd / 2);
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeID / 2, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [outerDiameter, holeDiameter, thickness, pcd, boltHoles, holeID]);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={flangeGeometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...flangeColor} />
    </mesh>
  );
}

// Flange component
function FlangeComponent({
  position,
  rotation,
  outerDiameter,
  innerDiameter,
  thickness,
  pcd,
  boltHoles,
  holeID,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  outerDiameter: number;
  innerDiameter: number;
  thickness: number;
  pcd: number;
  boltHoles: number;
  holeID: number;
}) {
  const flangeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerDiameter / 2, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerDiameter / 2, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    // Add bolt holes
    for (let i = 0; i < boltHoles; i++) {
      const angle = (i / boltHoles) * Math.PI * 2;
      const x = Math.cos(angle) * (pcd / 2);
      const y = Math.sin(angle) * (pcd / 2);
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeID / 2, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [outerDiameter, innerDiameter, thickness, pcd, boltHoles, holeID]);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={flangeGeometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...flangeColor} />
    </mesh>
  );
}

// Gusset piece component - diamond-shaped reinforcement plate that spans
// over the top of the run pipe, connecting the front and back V-weld points.
// There are TWO gussets - one on each side (left/right) of the branch.
// The gusset is widest at the center (top of run) and tapers to points at
// the front and back V-welds. It follows the curvature of the run pipe.
function GussetPlate({
  runRadius,
  branchRadius,
  gussetLength,
  thickness,
  side,
  branchOffsetX,
}: {
  runRadius: number;
  branchRadius: number;
  gussetLength: number;
  thickness: number;
  side: "left" | "right";
  branchOffsetX: number;
}) {
  const geometry = useMemo(() => {
    const segments = 48; // Higher resolution for smooth gusset shape
    const vertices: number[] = [];
    const indices: number[] = [];

    const xDir = side === "left" ? -1 : 1;
    const halfWidth = gussetLength / 2;

    // The gusset spans from front V-point (Z = +branchRadius) to back V-point (Z = -branchRadius)
    // At each Z position, it has a width that varies from 0 at the V-points to maximum at center
    // The outer edge follows the saddle curve, the inner edge extends toward the run center

    // Extend slightly beyond branchRadius to ensure gusset reaches V-weld points
    const zExtent = branchRadius * 1.02;

    for (let ui = 0; ui <= segments; ui++) {
      const u = ui / segments;
      // Z goes from front V-weld to back V-weld
      const z = zExtent * (1 - 2 * u);

      // Clamp Z to branchRadius for saddle curve calculations
      const zClamped = Math.max(-branchRadius, Math.min(branchRadius, z));

      // Y position on run pipe surface - follows the saddle/V-weld curve
      const yOnRun = Math.sqrt(Math.max(0, runRadius * runRadius - zClamped * zClamped));

      // Width at this Z position - diamond shape, widest at center (z=0)
      // At the V-points, width = 0, so gusset comes to a point
      const zNormalized = Math.max(-1, Math.min(1, zClamped / branchRadius));
      const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
      const currentHalfWidth = halfWidth * widthFraction;

      // X position at saddle curve (where branch meets run on this side)
      const xSaddleOffset = Math.sqrt(
        Math.max(0, branchRadius * branchRadius - zClamped * zClamped),
      );
      const xAtSaddle = branchOffsetX + xDir * xSaddleOffset;

      for (let vi = 0; vi <= segments; vi++) {
        const v = vi / segments;

        // v=0: inner edge (at saddle, where gusset meets branch) - higher up
        // v=1: outer edge (on run pipe surface) - at run surface level
        const xInner = xAtSaddle;
        const xOuter = xAtSaddle + xDir * currentHalfWidth;

        // Linear interpolation for X (edge to edge)
        const x = xInner * (1 - v) + xOuter * v;

        // Y creates 45-degree angle from inner to outer
        // Inner edge is elevated by currentHalfWidth (so tan(45°) = rise/run = 1)
        // Outer edge is on run pipe surface
        // At V-points (z = ±branchRadius), currentHalfWidth = 0, so both edges
        // meet at the V-weld position: Y = yOnRun = sqrt(runRadius² - branchRadius²)
        const yInner = yOnRun + currentHalfWidth;
        const yOuter = yOnRun;
        const y = yInner * (1 - v) + yOuter * v;

        vertices.push(x, y, z);
      }
    }

    // Generate triangle indices
    const vertsPerRow = segments + 1;
    for (let ui = 0; ui < segments; ui++) {
      for (let vi = 0; vi < segments; vi++) {
        const a = ui * vertsPerRow + vi;
        const b = a + 1;
        const c = a + vertsPerRow;
        const d = c + 1;

        if (xDir > 0) {
          indices.push(a, b, c);
          indices.push(b, d, c);
        } else {
          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [runRadius, branchRadius, gussetLength, thickness, side, branchOffsetX]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial {...gussetColor} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Weld bead component for gusset - welds along the inner and outer edges
function GussetWeld({
  runRadius,
  branchRadius,
  gussetLength,
  side,
  branchOffsetX,
}: {
  runRadius: number;
  branchRadius: number;
  gussetLength: number;
  side: "left" | "right";
  branchOffsetX: number;
}) {
  const weldRadius = gussetLength * 0.015;
  const xDir = side === "left" ? -1 : 1;
  const segments = 32; // Higher resolution for smooth weld curve
  const halfWidth = gussetLength / 2;

  // Extend slightly beyond branchRadius to reach V-weld points
  const zExtent = branchRadius * 1.02;

  // Inner edge: elevated at 45 degrees, meeting V-weld at the endpoints
  const innerEdgePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const z = zExtent * (1 - 2 * u);
    const zClamped = Math.max(-branchRadius, Math.min(branchRadius, z));
    const yOnRun = Math.sqrt(Math.max(0, runRadius * runRadius - zClamped * zClamped));
    const zNormalized = Math.max(-1, Math.min(1, zClamped / branchRadius));
    const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
    const currentHalfWidth = halfWidth * widthFraction;
    const xSaddleOffset = Math.sqrt(Math.max(0, branchRadius * branchRadius - zClamped * zClamped));
    const x = branchOffsetX + xDir * xSaddleOffset;
    const y = yOnRun + currentHalfWidth;
    innerEdgePoints.push(new THREE.Vector3(x, y, z));
  }
  const innerEdgeCurve = new THREE.CatmullRomCurve3(innerEdgePoints);

  // Outer edge: follows the diamond shape outline on run pipe surface
  const outerEdgePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const z = zExtent * (1 - 2 * u);
    const zClamped = Math.max(-branchRadius, Math.min(branchRadius, z));
    const yOnRun = Math.sqrt(Math.max(0, runRadius * runRadius - zClamped * zClamped));
    const zNormalized = Math.max(-1, Math.min(1, zClamped / branchRadius));
    const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
    const currentHalfWidth = halfWidth * widthFraction;
    const xSaddleOffset = Math.sqrt(Math.max(0, branchRadius * branchRadius - zClamped * zClamped));
    const x = branchOffsetX + xDir * (xSaddleOffset + currentHalfWidth);
    outerEdgePoints.push(new THREE.Vector3(x, yOnRun, z));
  }
  const outerEdgeCurve = new THREE.CatmullRomCurve3(outerEdgePoints);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[innerEdgeCurve, 32, weldRadius, 8, false]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
      <mesh>
        <tubeGeometry args={[outerEdgeCurve, 32, weldRadius, 8, false]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
    </group>
  );
}

// Saddle weld component - V-groove weld where branch meets run pipe
// This follows the Steinmetz curve (intersection of two cylinders)
function SaddleWeld({
  runRadius,
  branchRadius,
  branchOffsetX,
  weldThickness = 0.04,
}: {
  runRadius: number;
  branchRadius: number;
  branchOffsetX: number;
  weldThickness?: number;
}) {
  const geometry = useMemo(() => {
    // Create the saddle curve - the intersection of branch cylinder with run cylinder
    // Parametric: for angle θ around branch (0 to 2π):
    // - x offset along run = branchRadius * cos(θ)
    // - y (height) = runRadius + small offset for weld sitting on top
    // - z offset = branchRadius * sin(θ) adjusted for run surface curvature
    const segments = 64;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      // The saddle curve follows the intersection of two cylinders
      // For a branch of radius r meeting a run of radius R:
      // The height varies as the branch wraps around the curved run surface
      const x = branchOffsetX + branchRadius * Math.cos(theta);
      const z = branchRadius * Math.sin(theta);
      // Y position follows the run pipe's curved surface
      // At the top (theta=0, z=0), y = runRadius
      // As we go around, the weld dips down following the cylinder curvature
      const y = Math.sqrt(Math.max(0, runRadius * runRadius - z * z));
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, true); // true = closed curve

    // Create a custom weld bead cross-section (V-groove fillet profile)
    // This gives the characteristic welding bead appearance
    const weldProfile = new THREE.Shape();
    const w = weldThickness;
    const h = weldThickness * 1.2; // Height slightly more than width for V profile

    // Create a rounded triangular profile for the fillet weld
    weldProfile.moveTo(0, -h * 0.3);
    weldProfile.quadraticCurveTo(w * 0.6, 0, w * 0.3, h * 0.5);
    weldProfile.quadraticCurveTo(0, h * 0.7, -w * 0.3, h * 0.5);
    weldProfile.quadraticCurveTo(-w * 0.6, 0, 0, -h * 0.3);

    const extrudeSettings = {
      steps: segments,
      bevelEnabled: false,
      extrudePath: curve,
    };

    return new THREE.ExtrudeGeometry(weldProfile, extrudeSettings);
  }, [runRadius, branchRadius, branchOffsetX, weldThickness]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial {...weldColor} />
    </mesh>
  );
}

// Flange weld component - shows outer and inner weld beads at pipe-to-flange connection
function FlangeWeldRing({
  position,
  rotation,
  pipeOuterRadius,
  pipeInnerRadius,
  weldThickness = 0.03,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  pipeOuterRadius: number;
  pipeInnerRadius: number;
  weldThickness?: number;
}) {
  // Outer weld bead - fillet weld on outside of pipe where it meets flange
  const outerWeldGeometry = useMemo(() => {
    const segments = 64;
    const w = weldThickness;
    const torusRadius = pipeOuterRadius + w * 0.4;
    const tubeRadius = w * 0.5;
    return new THREE.TorusGeometry(torusRadius, tubeRadius, 16, segments);
  }, [pipeOuterRadius, weldThickness]);

  // Inner weld bead - fillet weld on inside of pipe bore where it meets flange
  const innerWeldGeometry = useMemo(() => {
    const segments = 64;
    const w = weldThickness * 0.8;
    const torusRadius = pipeInnerRadius - w * 0.3;
    const tubeRadius = w * 0.4;
    return new THREE.TorusGeometry(torusRadius, tubeRadius, 16, segments);
  }, [pipeInnerRadius, weldThickness]);

  // Offset for inner weld - position it inside the pipe, not on the flange face
  const innerWeldOffset = weldThickness * 0.6;

  return (
    <group position={position} rotation={rotation}>
      {/* Outer weld bead - visible bronze weld ring on outside */}
      <mesh geometry={outerWeldGeometry} castShadow receiveShadow>
        <meshStandardMaterial {...weldColor} />
      </mesh>
      {/* Inner weld bead - positioned inside the pipe bore */}
      <mesh
        geometry={innerWeldGeometry}
        position={[0, 0, innerWeldOffset]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...weldColor} />
      </mesh>
    </group>
  );
}

// Main Tee Scene component
function TeeScene(props: Tee3DPreviewProps) {
  const {
    nominalBore,
    outerDiameter,
    wallThickness,
    teeType,
    branchNominalBore,
    branchOuterDiameter,
    teeNominalBore,
    runLength,
    branchPositionMm,
    hasInletFlange = false,
    hasOutletFlange = false,
    hasBranchFlange = false,
    inletFlangeType = "fixed",
    outletFlangeType = "fixed",
    branchFlangeType = "fixed",
    closureLengthMm = 150,
    addBlankFlange = false,
    blankFlangePositions = [],
  } = props;

  // Determine which positions have blank flanges (can be used with any flange type: fixed, loose, or rotating)
  const hasBlankInlet = addBlankFlange && blankFlangePositions.includes("inlet") && hasInletFlange;
  const hasBlankOutlet =
    addBlankFlange && blankFlangePositions.includes("outlet") && hasOutletFlange;
  const hasBlankBranch =
    addBlankFlange && blankFlangePositions.includes("branch") && hasBranchFlange;

  // Get dimensions from SABS 719 data
  const dims = getSabs719TeeDimensions(nominalBore);
  // Effective branch NB - either reducing tee (branchNominalBore) or unequal tee (teeNominalBore)
  const effectiveBranchNB = branchNominalBore || teeNominalBore;
  const branchDims = effectiveBranchNB ? getSabs719TeeDimensions(effectiveBranchNB) : null;
  const teeHeight = getTeeHeight(nominalBore, teeType);
  const gussetSection = teeType === "gusset" ? getGussetSection(nominalBore) : 0;

  // Calculate dimensions using proper lookup tables
  const od = getOuterDiameter(nominalBore, outerDiameter || dims?.outsideDiameterMm || 0);
  const wt = getWallThickness(nominalBore, wallThickness || 0);
  const id = od - 2 * wt;
  // For reducing/unequal tees, use the effective branch NB dimensions; otherwise use same as run
  const branchOD = effectiveBranchNB
    ? getOuterDiameter(effectiveBranchNB, branchOuterDiameter || branchDims?.outsideDiameterMm || 0)
    : od; // Same as run for equal tee
  const branchWT = effectiveBranchNB ? getWallThickness(effectiveBranchNB) : wt;
  const branchID = branchOD - 2 * branchWT;

  // Scale factor for 3D scene (convert mm to scene units)
  const scaleFactor = SCALE_FACTOR;
  const outerRadius = Math.max(0.01, od / scaleFactor / 2);
  const rawInnerRadius = id / scaleFactor / 2;
  const innerRadius = Math.max(0.001, Math.min(rawInnerRadius, outerRadius - 0.001));
  const branchOuterRadius = Math.max(0.01, branchOD / scaleFactor / 2);
  const rawBranchInnerRadius = branchID / scaleFactor / 2;
  const branchInnerRadius = Math.max(
    0.001,
    Math.min(rawBranchInnerRadius, branchOuterRadius - 0.001),
  );
  const height = teeHeight / scaleFactor;
  const gussetSize = gussetSection / scaleFactor;

  // Run pipe length (default to 3x the OD)
  const totalRunLength = runLength || od * 3;
  const halfRunLength = totalRunLength / scaleFactor / 2;

  // Branch position offset from center
  // branchPositionMm is distance from left flange to center of branch
  // Convert to offset from center: offset = branchPositionMm - (totalRunLength / 2)
  const branchOffsetX =
    branchPositionMm !== undefined ? (branchPositionMm - totalRunLength / 2) / scaleFactor : 0; // Default to center if not specified

  // Create pipe geometry (cylinder with hole)
  const createPipeGeometry = (outerR: number, innerR: number, length: number) => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    const extrudeSettings = { depth: length, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  };

  // Create saddle-cut branch pipe geometry
  // The bottom of the branch pipe is cut to follow the curve of the run pipe (Steinmetz intersection)
  // For gusset tees, the bottom follows the gusset inner edge (V-shape)
  const createSaddleCutBranchGeometry = (
    branchOuterR: number,
    branchInnerR: number,
    runOuterR: number,
    totalHeight: number,
    gussetHalfWidth?: number,
  ) => {
    const radialSegments = 48;
    const heightSegments = 24;
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    // Calculate saddle cut depth at each angle
    // For a branch meeting a run at 90°, the bottom follows: y = sqrt(R² - z²) where R is run radius
    // For gusset tees, the bottom follows the gusset inner edge (V-shaped curve)
    const saddleBottomY = (angle: number): number => {
      const z = branchOuterR * Math.sin(angle);
      // The bottom of the saddle where branch meets run surface
      const saddleY = Math.sqrt(Math.max(0, runOuterR * runOuterR - z * z));

      if (gussetHalfWidth === undefined) return saddleY;

      // For gusset tees, follow the gusset inner edge V-shape
      // The gusset inner edge Y = yOnRun + currentHalfWidth
      // where currentHalfWidth varies from max at z=0 to 0 at z=±branchRadius
      const zNormalized = Math.max(-1, Math.min(1, z / branchOuterR));
      const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
      const gussetInnerY = saddleY + gussetHalfWidth * widthFraction;

      return gussetInnerY;
    };

    // Generate outer surface vertices
    for (let h = 0; h <= heightSegments; h++) {
      for (let r = 0; r <= radialSegments; r++) {
        const angle = (r / radialSegments) * Math.PI * 2;
        const x = branchOuterR * Math.cos(angle);
        const z = branchOuterR * Math.sin(angle);

        // Bottom varies with saddle curve, top is flat at totalHeight
        const bottomY = saddleBottomY(angle);
        const y = bottomY + (h / heightSegments) * (totalHeight - bottomY);

        vertices.push(x, y, z);

        // Normal points outward radially
        const nx = Math.cos(angle);
        const nz = Math.sin(angle);
        normals.push(nx, 0, nz);
      }
    }

    // Store outer vertex count for indexing inner surface
    const outerVertexCount = vertices.length / 3;

    // Generate inner surface vertices (same pattern but with inner radius)
    const saddleBottomYInner = (angle: number): number => {
      const z = branchInnerR * Math.sin(angle);
      // Inner surface follows a slightly different curve
      const innerRunR = runOuterR - (branchOuterR - branchInnerR);
      const saddleY = Math.sqrt(Math.max(0, innerRunR * innerRunR - z * z));

      if (gussetHalfWidth === undefined) return saddleY;

      // For gusset tees, follow the gusset inner edge V-shape
      const zNormalized = Math.max(-1, Math.min(1, z / branchInnerR));
      const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
      const gussetInnerY = saddleY + gussetHalfWidth * widthFraction;

      return gussetInnerY;
    };

    for (let h = 0; h <= heightSegments; h++) {
      for (let r = 0; r <= radialSegments; r++) {
        const angle = (r / radialSegments) * Math.PI * 2;
        const x = branchInnerR * Math.cos(angle);
        const z = branchInnerR * Math.sin(angle);

        const bottomY = saddleBottomYInner(angle);
        const y = bottomY + (h / heightSegments) * (totalHeight - bottomY);

        vertices.push(x, y, z);

        // Normal points inward
        const nx = -Math.cos(angle);
        const nz = -Math.sin(angle);
        normals.push(nx, 0, nz);
      }
    }

    // Generate indices for outer surface
    for (let h = 0; h < heightSegments; h++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = h * (radialSegments + 1) + r;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    // Generate indices for inner surface (reversed winding for correct normals)
    for (let h = 0; h < heightSegments; h++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = outerVertexCount + h * (radialSegments + 1) + r;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, c, b);
        indices.push(c, d, b);
      }
    }

    // Add top cap (annular ring at top of pipe)
    const topCapStartIdx = vertices.length / 3;
    for (let r = 0; r <= radialSegments; r++) {
      const angle = (r / radialSegments) * Math.PI * 2;
      // Outer edge at top
      vertices.push(branchOuterR * Math.cos(angle), totalHeight, branchOuterR * Math.sin(angle));
      normals.push(0, 1, 0);
      // Inner edge at top
      vertices.push(branchInnerR * Math.cos(angle), totalHeight, branchInnerR * Math.sin(angle));
      normals.push(0, 1, 0);
    }

    // Top cap indices
    for (let r = 0; r < radialSegments; r++) {
      const outer1 = topCapStartIdx + r * 2;
      const inner1 = outer1 + 1;
      const outer2 = outer1 + 2;
      const inner2 = inner1 + 2;

      indices.push(outer1, inner1, outer2);
      indices.push(inner1, inner2, outer2);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  };

  // Create run pipe with hole cut where branch enters
  // This creates a realistic pipe with proper inner/outer surfaces and end caps
  // For gusset tees, holeExtension makes the hole larger to show gusset interior
  const createRunPipeWithHoleGeometry = (
    runOuterR: number,
    runInnerR: number,
    runLength: number,
    branchOuterR: number,
    branchInnerR: number,
    branchOffsetXVal: number,
    holeExtension: number = 0,
  ) => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const lengthSegments = 512; // Very high resolution for smooth gusset hole edge
    const radialSegments = 512;
    const halfLength = runLength / 2;

    // Cut a hole where the branch intersects the run pipe (Steinmetz curve)
    // For gusset tees, the hole follows the gusset outer edge (diamond shape)
    const isInBranchHole = (x: number, angle: number, radius: number): boolean => {
      const z = radius * Math.sin(angle);
      const y = radius * Math.cos(angle);
      if (y <= 0) return false; // Only cut hole on top half of run pipe

      const zSq = z * z;
      const branchRSq = branchOuterR * branchOuterR;

      if (holeExtension > 0) {
        // For gusset tees: hole follows the gusset outer edge shape
        // The gusset outer edge X distance from branch center is:
        // xSaddleOffset + currentHalfWidth
        // where xSaddleOffset = sqrt(branchR² - z²) and currentHalfWidth varies with z
        if (zSq >= branchRSq) return false;

        const xSaddleOffset = Math.sqrt(branchRSq - zSq);
        const zNormalized = Math.abs(z) / branchOuterR;
        const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
        const gussetHalfWidth = holeExtension * widthFraction;
        const holeHalfWidth = xSaddleOffset + gussetHalfWidth;

        const xDist = Math.abs(x - branchOffsetXVal);
        return xDist < holeHalfWidth;
      } else {
        // Standard branch hole (cylinder intersection)
        if (zSq >= branchRSq) return false;
        const xDist = Math.abs(x - branchOffsetXVal);
        const holeHalfWidth = Math.sqrt(branchRSq - zSq);
        return xDist < holeHalfWidth;
      }
    };

    const isInBranchInnerHole = (x: number, angle: number): boolean => {
      const z = runInnerR * Math.sin(angle);
      const y = runInnerR * Math.cos(angle);
      if (y <= 0) return false;

      const zSq = z * z;
      const branchInnerRSq = branchInnerR * branchInnerR;

      if (holeExtension > 0) {
        // For gusset tees: hole follows gusset outer edge shape
        if (zSq >= branchInnerRSq) return false;

        const xSaddleOffset = Math.sqrt(branchInnerRSq - zSq);
        const zNormalized = Math.abs(z) / branchInnerR;
        const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
        const gussetHalfWidth = holeExtension * widthFraction;
        const holeHalfWidth = xSaddleOffset + gussetHalfWidth;

        const xDist = Math.abs(x - branchOffsetXVal);
        return xDist < holeHalfWidth;
      } else {
        // Standard branch hole
        if (zSq >= branchInnerRSq) return false;
        const xDist = Math.abs(x - branchOffsetXVal);
        const holeHalfWidth = Math.sqrt(branchInnerRSq - zSq);
        return xDist < holeHalfWidth;
      }
    };

    // Generate outer surface with hole
    const outerVertices: Map<string, number> = new Map();
    const getOuterVertexIndex = (li: number, ri: number): number => {
      const key = `o_${li}_${ri}`;
      if (outerVertices.has(key)) return outerVertices.get(key)!;

      const x = -halfLength + (li / lengthSegments) * runLength;
      const angle = (ri / radialSegments) * Math.PI * 2;

      if (isInBranchHole(x, angle, runOuterR)) return -1; // Skip vertices in hole

      const y = runOuterR * Math.cos(angle);
      const z = runOuterR * Math.sin(angle);

      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      normals.push(0, Math.cos(angle), Math.sin(angle));
      outerVertices.set(key, idx);
      return idx;
    };

    // Generate inner surface with hole
    const innerVertices: Map<string, number> = new Map();
    const getInnerVertexIndex = (li: number, ri: number): number => {
      const key = `i_${li}_${ri}`;
      if (innerVertices.has(key)) return innerVertices.get(key)!;

      const x = -halfLength + (li / lengthSegments) * runLength;
      const angle = (ri / radialSegments) * Math.PI * 2;

      if (isInBranchInnerHole(x, angle)) return -1;

      const y = runInnerR * Math.cos(angle);
      const z = runInnerR * Math.sin(angle);

      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      normals.push(0, -Math.cos(angle), -Math.sin(angle));
      innerVertices.set(key, idx);
      return idx;
    };

    // Build outer surface triangles
    for (let li = 0; li < lengthSegments; li++) {
      for (let ri = 0; ri < radialSegments; ri++) {
        const a = getOuterVertexIndex(li, ri);
        const b = getOuterVertexIndex(li + 1, ri);
        const c = getOuterVertexIndex(li, ri + 1);
        const d = getOuterVertexIndex(li + 1, ri + 1);

        if (a >= 0 && b >= 0 && c >= 0) indices.push(a, c, b);
        if (b >= 0 && c >= 0 && d >= 0) indices.push(b, c, d);
      }
    }

    // Build inner surface triangles (reversed winding)
    for (let li = 0; li < lengthSegments; li++) {
      for (let ri = 0; ri < radialSegments; ri++) {
        const a = getInnerVertexIndex(li, ri);
        const b = getInnerVertexIndex(li + 1, ri);
        const c = getInnerVertexIndex(li, ri + 1);
        const d = getInnerVertexIndex(li + 1, ri + 1);

        if (a >= 0 && b >= 0 && c >= 0) indices.push(a, b, c);
        if (b >= 0 && c >= 0 && d >= 0) indices.push(b, d, c);
      }
    }

    // Add end caps (annular rings at both ends)
    const addEndCap = (xPos: number, normalX: number) => {
      const capStart = vertices.length / 3;
      for (let ri = 0; ri <= radialSegments; ri++) {
        const angle = (ri / radialSegments) * Math.PI * 2;
        const y = Math.cos(angle);
        const z = Math.sin(angle);

        // Outer edge
        vertices.push(xPos, runOuterR * y, runOuterR * z);
        normals.push(normalX, 0, 0);
        // Inner edge
        vertices.push(xPos, runInnerR * y, runInnerR * z);
        normals.push(normalX, 0, 0);
      }

      for (let ri = 0; ri < radialSegments; ri++) {
        const o1 = capStart + ri * 2;
        const i1 = o1 + 1;
        const o2 = o1 + 2;
        const i2 = i1 + 2;

        if (normalX < 0) {
          indices.push(o1, o2, i1);
          indices.push(i1, o2, i2);
        } else {
          indices.push(o1, i1, o2);
          indices.push(i1, i2, o2);
        }
      }
    };

    addEndCap(-halfLength, -1); // Left end
    addEndCap(halfLength, 1); // Right end

    // Hole edge surface is covered by the branch pipe's saddle-cut geometry
    // The saddle weld visually covers any minor gap at the junction

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  };

  // Flange specs
  const { specs: runFlangeSpecs } = getFlangeSpecs(nominalBore, props.flangeSpecs);
  // For branch flange, use teeFlangeSpecs if provided (unequal tees), otherwise use main flangeSpecs
  const branchFlangeData = props.teeFlangeSpecs || props.flangeSpecs;
  const { specs: branchFlangeSpecs } = getFlangeSpecs(
    effectiveBranchNB || nominalBore,
    branchFlangeData,
  );

  // Gusset plate thickness (estimated based on size)
  const gussetThickness = nominalBore <= 400 ? 0.1 : 0.14;

  return (
    <Center>
      <group>
        {/* Run pipe (horizontal) with hole cut where branch enters */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <primitive
            object={createRunPipeWithHoleGeometry(
              outerRadius,
              innerRadius,
              halfRunLength * 2,
              branchOuterRadius,
              branchInnerRadius,
              branchOffsetX,
              teeType === "gusset" ? gussetSize / 2 : 0,
            )}
            attach="geometry"
          />
          <meshStandardMaterial {...gussetColor} />
        </mesh>

        {/* Branch pipe (vertical) - saddle-cut bottom fits into run pipe curve */}
        {/* For gusset tees, branch bottom follows the gusset inner edge V-shape */}
        <mesh position={[branchOffsetX, 0, 0]} castShadow receiveShadow>
          <primitive
            object={createSaddleCutBranchGeometry(
              branchOuterRadius,
              branchInnerRadius,
              outerRadius,
              height,
              teeType === "gusset" ? gussetSize / 2 : undefined,
            )}
            attach="geometry"
          />
          <meshStandardMaterial {...gussetColor} />
        </mesh>

        {/* V-groove saddle weld at branch junction - only for non-gusset tees */}
        {/* For gusset tees, the gusset welds replace the saddle weld */}
        {teeType !== "gusset" && (
          <SaddleWeld
            runRadius={outerRadius}
            branchRadius={branchOuterRadius}
            branchOffsetX={branchOffsetX}
            weldThickness={0.12}
          />
        )}

        {/* Gusset plates for Gusset Tees - flat triangular reinforcement plates on front and back of branch */}
        {teeType === "gusset" && gussetSize > 0 && (
          <>
            {/* Left gusset (-X side) - diamond shape over run pipe */}
            <GussetPlate
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              thickness={gussetThickness}
              side="left"
              branchOffsetX={branchOffsetX}
            />
            <GussetWeld
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              side="left"
              branchOffsetX={branchOffsetX}
            />
            {/* Right gusset (+X side) - diamond shape over run pipe */}
            <GussetPlate
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              thickness={gussetThickness}
              side="right"
              branchOffsetX={branchOffsetX}
            />
            <GussetWeld
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              side="right"
              branchOffsetX={branchOffsetX}
            />
          </>
        )}

        {/* Inlet flange (left side of run) */}
        {hasInletFlange &&
          (inletFlangeType === "rotating" ? (
            <>
              {/* Retaining ring welded at pipe end */}
              <RetainingRingComponent
                position={[-halfRunLength - 0.02, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                thickness={0.02}
              />
              {/* Rotating flange positioned 50mm (0.5 scene units) back from ring */}
              <RotatingFlangeComponent
                position={[-halfRunLength + 0.5, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                pipeOuterDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* R/F dimension line */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.15, 0],
                  [-halfRunLength + 0.5, -outerRadius - 0.15, 0],
                ]}
                color="#ea580c"
                lineWidth={2}
              />
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.1, 0],
                  [-halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Line
                points={[
                  [-halfRunLength + 0.5, -outerRadius - 0.1, 0],
                  [-halfRunLength + 0.5, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Text
                position={[-halfRunLength + 0.25, -outerRadius - 0.35, 0]}
                fontSize={0.15}
                color="#ea580c"
                anchorX="center"
                anchorY="middle"
              >
                R/F 50mm
              </Text>
            </>
          ) : inletFlangeType === "loose" ? (
            <>
              {/* Loose flange: Closure piece attached to tee, then 100mm gap, then flange floating */}
              {/* Hollow closure pipe piece - simple geometry approach */}
              <group
                position={[-halfRunLength - closureLengthMm / scaleFactor / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <mesh>
                  <cylinderGeometry
                    args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32, 1, true]}
                  />
                  <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry
                    args={[
                      innerRadius,
                      innerRadius,
                      closureLengthMm / scaleFactor + 0.01,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange floating 100mm (1.0 scene units) away from closure piece */}
              <FlangeComponent
                position={[-halfRunLength - closureLengthMm / scaleFactor - 1.0, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(od + 3) / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Closure length dimension line */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.15, 0],
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.15, 0],
                ]}
                color="#2563eb"
                lineWidth={2}
              />
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.1, 0],
                  [-halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              <Line
                points={[
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.1, 0],
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              {/* L/F label with closure length */}
              <Text
                position={[
                  -halfRunLength - closureLengthMm / scaleFactor / 2,
                  -outerRadius - 0.35,
                  0,
                ]}
                fontSize={0.15}
                color="#2563eb"
                anchorX="center"
                anchorY="middle"
              >
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap dimension line */}
              <Line
                points={[
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.5, 0],
                  [-halfRunLength - closureLengthMm / scaleFactor - 1.0, -outerRadius - 0.5, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
              />
              <Text
                position={[
                  -halfRunLength - closureLengthMm / scaleFactor - 0.5,
                  -outerRadius - 0.65,
                  0,
                ]}
                fontSize={0.12}
                color="#9333ea"
                anchorX="center"
                anchorY="middle"
              >
                100mm gap
              </Text>
            </>
          ) : (
            <>
              <FlangeComponent
                position={[-halfRunLength - runFlangeSpecs.thickness / scaleFactor, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Flange welds - inside and outside */}
              <FlangeWeldRing
                position={[-halfRunLength, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                weldThickness={0.08}
              />
            </>
          ))}

        {/* Outlet flange (right side of run) */}
        {hasOutletFlange &&
          (outletFlangeType === "rotating" ? (
            <>
              {/* Retaining ring welded at pipe end */}
              <RetainingRingComponent
                position={[halfRunLength + 0.02, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                thickness={0.02}
              />
              {/* Rotating flange positioned 50mm (0.5 scene units) back from ring */}
              <RotatingFlangeComponent
                position={[halfRunLength - 0.5, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                pipeOuterDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* R/F dimension line */}
              <Line
                points={[
                  [halfRunLength - 0.5, -outerRadius - 0.15, 0],
                  [halfRunLength, -outerRadius - 0.15, 0],
                ]}
                color="#ea580c"
                lineWidth={2}
              />
              <Line
                points={[
                  [halfRunLength - 0.5, -outerRadius - 0.1, 0],
                  [halfRunLength - 0.5, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.1, 0],
                  [halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Text
                position={[halfRunLength - 0.25, -outerRadius - 0.35, 0]}
                fontSize={0.15}
                color="#ea580c"
                anchorX="center"
                anchorY="middle"
              >
                R/F 50mm
              </Text>
            </>
          ) : outletFlangeType === "loose" ? (
            <>
              {/* Loose flange: Closure piece attached to tee, then 100mm gap, then flange floating */}
              {/* Hollow closure pipe piece - simple geometry approach */}
              <group
                position={[halfRunLength + closureLengthMm / scaleFactor / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <mesh>
                  <cylinderGeometry
                    args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32, 1, true]}
                  />
                  <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry
                    args={[
                      innerRadius,
                      innerRadius,
                      closureLengthMm / scaleFactor + 0.01,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange floating 100mm (1.0 scene units) away from closure piece */}
              <FlangeComponent
                position={[halfRunLength + closureLengthMm / scaleFactor + 1.0, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(od + 3) / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Closure length dimension line */}
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.15, 0],
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.15, 0],
                ]}
                color="#2563eb"
                lineWidth={2}
              />
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.1, 0],
                  [halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              <Line
                points={[
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.1, 0],
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              {/* L/F label with closure length */}
              <Text
                position={[
                  halfRunLength + closureLengthMm / scaleFactor / 2,
                  -outerRadius - 0.35,
                  0,
                ]}
                fontSize={0.15}
                color="#2563eb"
                anchorX="center"
                anchorY="middle"
              >
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap dimension line */}
              <Line
                points={[
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.5, 0],
                  [halfRunLength + closureLengthMm / scaleFactor + 1.0, -outerRadius - 0.5, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
              />
              <Text
                position={[
                  halfRunLength + closureLengthMm / scaleFactor + 0.5,
                  -outerRadius - 0.65,
                  0,
                ]}
                fontSize={0.12}
                color="#9333ea"
                anchorX="center"
                anchorY="middle"
              >
                100mm gap
              </Text>
            </>
          ) : (
            <>
              <FlangeComponent
                position={[halfRunLength + runFlangeSpecs.thickness / scaleFactor, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Flange welds - inside and outside */}
              <FlangeWeldRing
                position={[halfRunLength, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                weldThickness={0.08}
              />
            </>
          ))}

        {/* Branch flange (top of branch) */}
        {hasBranchFlange &&
          (branchFlangeType === "rotating" ? (
            <>
              {/* Retaining ring welded at pipe end (top of branch) */}
              <RetainingRingComponent
                position={[branchOffsetX, height + 0.02, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                pipeOuterRadius={branchOuterRadius}
                pipeInnerRadius={branchInnerRadius}
                thickness={0.02}
              />
              {/* Rotating flange positioned 50mm (0.5 scene units) down from ring */}
              <RotatingFlangeComponent
                position={[branchOffsetX, height - 0.5, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                pipeOuterDiameter={branchOD / scaleFactor}
                thickness={branchFlangeSpecs.thickness / scaleFactor}
                pcd={branchFlangeSpecs.pcd / scaleFactor}
                boltHoles={branchFlangeSpecs.boltHoles}
                holeID={branchFlangeSpecs.holeID / scaleFactor}
              />
              {/* R/F dimension line (vertical, on the side of branch) */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.15, height - 0.5, 0],
                  [branchOffsetX + branchOuterRadius + 0.15, height, 0],
                ]}
                color="#ea580c"
                lineWidth={2}
              />
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.1, height - 0.5, 0],
                  [branchOffsetX + branchOuterRadius + 0.2, height - 0.5, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.1, height, 0],
                  [branchOffsetX + branchOuterRadius + 0.2, height, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Text
                position={[branchOffsetX + branchOuterRadius + 0.35, height - 0.25, 0]}
                fontSize={0.15}
                color="#ea580c"
                anchorX="left"
                anchorY="middle"
              >
                R/F 50mm
              </Text>
            </>
          ) : branchFlangeType === "loose" ? (
            <>
              {/* Loose flange: Closure piece attached to branch, then 100mm gap, then flange floating */}
              {/* Hollow closure pipe piece - simple geometry approach */}
              <group position={[branchOffsetX, height + closureLengthMm / scaleFactor / 2, 0]}>
                <mesh>
                  <cylinderGeometry
                    args={[
                      branchOuterRadius,
                      branchOuterRadius,
                      closureLengthMm / scaleFactor,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry
                    args={[
                      branchInnerRadius,
                      branchInnerRadius,
                      closureLengthMm / scaleFactor + 0.01,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange floating 100mm (1.0 scene units) above closure piece */}
              <FlangeComponent
                position={[branchOffsetX, height + closureLengthMm / scaleFactor + 1.0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(branchOD + 3) / scaleFactor}
                thickness={branchFlangeSpecs.thickness / scaleFactor}
                pcd={branchFlangeSpecs.pcd / scaleFactor}
                boltHoles={branchFlangeSpecs.boltHoles}
                holeID={branchFlangeSpecs.holeID / scaleFactor}
              />
              {/* Closure length dimension line */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.15, height, 0],
                  [
                    branchOffsetX + branchOuterRadius + 0.15,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                ]}
                color="#2563eb"
                lineWidth={2}
              />
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.1, height, 0],
                  [branchOffsetX + branchOuterRadius + 0.2, height, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              <Line
                points={[
                  [
                    branchOffsetX + branchOuterRadius + 0.1,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                  [
                    branchOffsetX + branchOuterRadius + 0.2,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              {/* L/F label */}
              <Text
                position={[
                  branchOffsetX + branchOuterRadius + 0.35,
                  height + closureLengthMm / scaleFactor / 2,
                  0,
                ]}
                fontSize={0.15}
                color="#2563eb"
                anchorX="left"
                anchorY="middle"
              >
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap dimension line */}
              <Line
                points={[
                  [
                    branchOffsetX + branchOuterRadius + 0.4,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                  [
                    branchOffsetX + branchOuterRadius + 0.4,
                    height + closureLengthMm / scaleFactor + 1.0,
                    0,
                  ],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
              />
              <Text
                position={[
                  branchOffsetX + branchOuterRadius + 0.6,
                  height + closureLengthMm / scaleFactor + 0.5,
                  0,
                ]}
                fontSize={0.12}
                color="#9333ea"
                anchorX="left"
                anchorY="middle"
              >
                100mm gap
              </Text>
            </>
          ) : (
            <>
              <FlangeComponent
                position={[branchOffsetX, height + branchFlangeSpecs.thickness / scaleFactor, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={branchOD / scaleFactor}
                thickness={branchFlangeSpecs.thickness / scaleFactor}
                pcd={branchFlangeSpecs.pcd / scaleFactor}
                boltHoles={branchFlangeSpecs.boltHoles}
                holeID={branchFlangeSpecs.holeID / scaleFactor}
              />
              {/* Flange welds - inside and outside */}
              <FlangeWeldRing
                position={[branchOffsetX, height, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                pipeOuterRadius={branchOuterRadius}
                pipeInnerRadius={branchInnerRadius}
                weldThickness={0.08}
              />
            </>
          ))}

        {/* Blank Flanges - solid disc flanges positioned 50mm from fixed flanges */}
        {/* Blank flange gap distance: 50mm = 0.5 in scene units (50/100) */}
        {hasBlankInlet && (
          <>
            <BlankFlangeComponent
              position={[-halfRunLength - (2 * runFlangeSpecs.thickness) / scaleFactor - 0.5, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
              thickness={runFlangeSpecs.thickness / scaleFactor}
              pcd={runFlangeSpecs.pcd / scaleFactor}
              boltHoles={runFlangeSpecs.boltHoles}
              holeID={runFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[
                -halfRunLength - (2 * runFlangeSpecs.thickness) / scaleFactor - 0.25,
                -outerRadius - 0.2,
                0,
              ]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="center"
              anchorY="top"
            >
              BLANK
            </Text>
          </>
        )}
        {hasBlankOutlet && (
          <>
            <BlankFlangeComponent
              position={[halfRunLength + (2 * runFlangeSpecs.thickness) / scaleFactor + 0.5, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
              thickness={runFlangeSpecs.thickness / scaleFactor}
              pcd={runFlangeSpecs.pcd / scaleFactor}
              boltHoles={runFlangeSpecs.boltHoles}
              holeID={runFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[
                halfRunLength + (2 * runFlangeSpecs.thickness) / scaleFactor + 0.75,
                -outerRadius - 0.2,
                0,
              ]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="center"
              anchorY="top"
            >
              BLANK
            </Text>
          </>
        )}
        {hasBlankBranch && (
          <>
            <BlankFlangeComponent
              position={[
                branchOffsetX,
                height + (2 * branchFlangeSpecs.thickness) / scaleFactor + 0.5,
                0,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
              outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
              thickness={branchFlangeSpecs.thickness / scaleFactor}
              pcd={branchFlangeSpecs.pcd / scaleFactor}
              boltHoles={branchFlangeSpecs.boltHoles}
              holeID={branchFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[
                branchOffsetX - branchOuterRadius - 0.3,
                height + (2 * branchFlangeSpecs.thickness) / scaleFactor + 0.5,
                0,
              ]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="right"
              anchorY="middle"
            >
              BLANK
            </Text>
          </>
        )}

        {/* Dimension lines */}
        {/* Branch C/F dimension (vertical) - from top of main pipe to branch top/flange face */}
        {/* Positioned away from model with dotted extension lines */}
        {(() => {
          const dimOffset = 0.25; // Offset from branch edge for dimension line
          const dimX = branchOffsetX + branchOuterRadius + dimOffset;
          const extendX = branchOffsetX + branchOuterRadius + dimOffset + 0.15;
          const branchCF = teeHeight - od / 2 / (scaleFactor / 2); // C/F is from run OD to branch top
          return (
            <>
              {/* Main dimension line - from top of run pipe to top of branch */}
              <Line
                points={[
                  [dimX, outerRadius, 0],
                  [dimX, height, 0],
                ]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* End caps */}
              <Line
                points={[
                  [dimX - 0.08, outerRadius, 0],
                  [dimX + 0.08, outerRadius, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
              />
              <Line
                points={[
                  [dimX - 0.08, height, 0],
                  [dimX + 0.08, height, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
              />
              {/* Dotted extension line from run pipe surface to dimension */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.02, outerRadius, 0],
                  [dimX, outerRadius, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Dotted extension line from branch top/flange to dimension */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.02, height, 0],
                  [dimX, height, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Dotted line showing pipe center reference */}
              <Line
                points={[
                  [branchOffsetX, 0, 0],
                  [extendX, 0, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Label */}
              <Text
                position={[extendX + 0.05, (outerRadius + height) / 2, 0]}
                fontSize={0.15}
                color="#dc2626"
                anchorX="left"
                anchorY="middle"
                fontWeight="bold"
              >
                {`C/F: ${Math.round(teeHeight - od / 2)}mm`}
              </Text>
            </>
          );
        })()}

        {/* Total run pipe length dimension - at bottom of main pipe */}
        {(() => {
          const dimOffset = 0.25; // Offset below pipe
          const dimY = -outerRadius - dimOffset;
          return (
            <>
              {/* Main dimension line */}
              <Line
                points={[
                  [-halfRunLength, dimY, 0],
                  [halfRunLength, dimY, 0],
                ]}
                color="#9333ea"
                lineWidth={2}
              />
              {/* End caps */}
              <Line
                points={[
                  [-halfRunLength, dimY - 0.08, 0],
                  [-halfRunLength, dimY + 0.08, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
              />
              <Line
                points={[
                  [halfRunLength, dimY - 0.08, 0],
                  [halfRunLength, dimY + 0.08, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
              />
              {/* Dotted extension lines from pipe ends to dimension */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.02, 0],
                  [-halfRunLength, dimY, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.02, 0],
                  [halfRunLength, dimY, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Label */}
              <Text
                position={[0, dimY - 0.12, 0]}
                fontSize={0.15}
                color="#9333ea"
                anchorX="center"
                anchorY="top"
                fontWeight="bold"
              >
                {`L: ${totalRunLength}mm`}
              </Text>
            </>
          );
        })()}

        {/* Branch position dimension line (horizontal from left end to branch center) */}
        {branchPositionMm !== undefined &&
          (() => {
            const dimOffset = 0.4; // Offset below pipe (below the length dimension)
            const dimY = -outerRadius - dimOffset;
            return (
              <>
                {/* Main dimension line */}
                <Line
                  points={[
                    [-halfRunLength, dimY, 0],
                    [branchOffsetX, dimY, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={2}
                />
                {/* End caps */}
                <Line
                  points={[
                    [-halfRunLength, dimY - 0.06, 0],
                    [-halfRunLength, dimY + 0.06, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                />
                <Line
                  points={[
                    [branchOffsetX, dimY - 0.06, 0],
                    [branchOffsetX, dimY + 0.06, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                />
                {/* Dotted extension line from left pipe end */}
                <Line
                  points={[
                    [-halfRunLength, -outerRadius - 0.27, 0],
                    [-halfRunLength, dimY, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                  dashed
                  dashSize={0.03}
                  gapSize={0.02}
                />
                {/* Dotted extension line to branch center */}
                <Line
                  points={[
                    [branchOffsetX, 0, 0],
                    [branchOffsetX, dimY, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                  dashed
                  dashSize={0.03}
                  gapSize={0.02}
                />
                {/* Label */}
                <Text
                  position={[(-halfRunLength + branchOffsetX) / 2, dimY - 0.1, 0]}
                  fontSize={0.12}
                  color="#16a34a"
                  anchorX="center"
                  anchorY="top"
                  fontWeight="bold"
                >
                  {`Branch pos: ${branchPositionMm}mm`}
                </Text>
              </>
            );
          })()}

        {/* Gusset dimension for gusset tees - shows width across the gusset plate */}
        {/* Positioned away from gusset with dotted extension lines */}
        {teeType === "gusset" &&
          gussetSize > 0 &&
          (() => {
            const dimOffset = 0.15; // Offset from gusset surface (150mm scaled)
            // Gusset inner edge at z=0: X = branchOffsetX + branchOuterRadius, Y = outerRadius + gussetSize/2
            // Gusset outer edge at z=0: X = branchOffsetX + branchOuterRadius + gussetSize/2, Y = outerRadius
            const innerX = branchOffsetX + branchOuterRadius;
            const innerY = outerRadius + gussetSize / 2;
            const outerX = branchOffsetX + branchOuterRadius + gussetSize / 2;
            const outerY = outerRadius;
            // Offset dimension line perpendicular to the gusset surface (45 degrees, so offset in both X and Y)
            const offsetDir = Math.SQRT1_2; // 1/sqrt(2) for 45 degree offset
            const dimInnerX = innerX + dimOffset * offsetDir;
            const dimInnerY = innerY + dimOffset * offsetDir;
            const dimOuterX = outerX + dimOffset * offsetDir;
            const dimOuterY = outerY + dimOffset * offsetDir;
            return (
              <>
                {/* Main dimension line - offset from gusset surface */}
                <Line
                  points={[
                    [dimInnerX, dimInnerY, 0.02],
                    [dimOuterX, dimOuterY, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={2}
                />
                {/* End caps perpendicular to the 45-degree line */}
                <Line
                  points={[
                    [dimInnerX - 0.04, dimInnerY + 0.04, 0.02],
                    [dimInnerX + 0.04, dimInnerY - 0.04, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                />
                <Line
                  points={[
                    [dimOuterX - 0.04, dimOuterY + 0.04, 0.02],
                    [dimOuterX + 0.04, dimOuterY - 0.04, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                />
                {/* Dotted extension line from gusset inner edge to dimension */}
                <Line
                  points={[
                    [innerX, innerY, 0.02],
                    [dimInnerX, dimInnerY, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                  dashed
                  dashSize={0.02}
                  gapSize={0.015}
                />
                {/* Dotted extension line from gusset outer edge to dimension */}
                <Line
                  points={[
                    [outerX, outerY, 0.02],
                    [dimOuterX, dimOuterY, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                  dashed
                  dashSize={0.02}
                  gapSize={0.015}
                />
                {/* Label */}
                <Text
                  position={[
                    (dimInnerX + dimOuterX) / 2 + 0.1,
                    (dimInnerY + dimOuterY) / 2 + 0.1,
                    0.02,
                  ]}
                  fontSize={0.12}
                  color="#0066cc"
                  anchorX="left"
                  anchorY="bottom"
                  fontWeight="bold"
                >
                  {`C: ${gussetSection}mm`}
                </Text>
              </>
            );
          })()}
      </group>
    </Center>
  );
}

const CameraTracker = ({
  onCameraChange,
  savedPosition,
  savedTarget,
}: {
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
  savedPosition?: [number, number, number];
  savedTarget?: [number, number, number];
}) => {
  const { camera, controls } = useThree();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const pendingSaveKeyRef = useRef<string>("");
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    log.debug(
      "Tee CameraTracker useEffect",
      JSON.stringify({
        savedPosition,
        savedTarget,
        hasRestored: hasRestoredRef.current,
        hasControls: !!controls,
      }),
    );
    const hasValidPosition =
      savedPosition &&
      typeof savedPosition[0] === "number" &&
      typeof savedPosition[1] === "number" &&
      typeof savedPosition[2] === "number";
    if (hasValidPosition && controls && !hasRestoredRef.current) {
      log.debug(
        "Tee CameraTracker restoring camera position",
        JSON.stringify({
          position: savedPosition,
          target: savedTarget,
        }),
      );
      camera.position.set(savedPosition[0], savedPosition[1], savedPosition[2]);
      if (
        savedTarget &&
        typeof savedTarget[0] === "number" &&
        typeof savedTarget[1] === "number" &&
        typeof savedTarget[2] === "number"
      ) {
        const orbitControls = controls as any;
        if (orbitControls.target) {
          orbitControls.target.set(savedTarget[0], savedTarget[1], savedTarget[2]);
          orbitControls.update();
        }
      }
      hasRestoredRef.current = true;
      const restoredKey = `${savedPosition[0].toFixed(2)},${savedPosition[1].toFixed(2)},${savedPosition[2].toFixed(2)}`;
      lastSavedRef.current = restoredKey;
      pendingSaveKeyRef.current = "";
    }
  }, [camera, controls, savedPosition, savedTarget]);

  const frameCountRef = useRef(0);

  useFrame(() => {
    frameCountRef.current++;
    if (frameCountRef.current % 60 === 0) {
      log.debug(
        "Tee CameraTracker useFrame check",
        JSON.stringify({
          hasOnCameraChange: !!onCameraChange,
          hasControls: !!controls,
          cameraPos: [
            camera.position.x.toFixed(2),
            camera.position.y.toFixed(2),
            camera.position.z.toFixed(2),
          ],
          lastSaved: lastSavedRef.current,
        }),
      );
    }

    if (onCameraChange && controls) {
      const target = (controls as any).target;
      if (target) {
        const currentKey = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;

        const needsNewSave =
          currentKey !== lastSavedRef.current && currentKey !== pendingSaveKeyRef.current;

        if (needsNewSave) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }

          const posToSave = [camera.position.x, camera.position.y, camera.position.z] as [
            number,
            number,
            number,
          ];
          const targetToSave = [target.x, target.y, target.z] as [number, number, number];
          const keyToSave = currentKey;
          pendingSaveKeyRef.current = keyToSave;

          log.debug("Tee CameraTracker setting timeout for", keyToSave);

          saveTimeoutRef.current = setTimeout(() => {
            log.debug(
              "Tee CameraTracker timeout fired, saving",
              JSON.stringify({
                position: posToSave,
                target: targetToSave,
                key: keyToSave,
              }),
            );
            lastSavedRef.current = keyToSave;
            pendingSaveKeyRef.current = "";
            onCameraChange(posToSave, targetToSave);
          }, 500);
        }
      }
    }
  });

  return null;
};

// Main Preview component
export default function Tee3DPreview(props: Tee3DPreviewProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const captureRef = useRef<(() => string | null) | null>(null);

  const debouncedProps = useDebouncedProps(props, 100);

  // Handle escape key to close expanded modal
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  // Get dimensions using proper lookup tables
  const dims = getSabs719TeeDimensions(debouncedProps.nominalBore);
  // Effective branch NB - either reducing tee (branchNominalBore) or unequal tee (teeNominalBore)
  const effectiveBranchNB = debouncedProps.branchNominalBore || debouncedProps.teeNominalBore;
  const branchDims = effectiveBranchNB ? getSabs719TeeDimensions(effectiveBranchNB) : null;
  const od = getOuterDiameter(
    debouncedProps.nominalBore,
    debouncedProps.outerDiameter || dims?.outsideDiameterMm || 0,
  );
  const wt = getWallThickness(debouncedProps.nominalBore, debouncedProps.wallThickness || 0);
  const id = od - 2 * wt;
  // Branch dimensions for reducing/unequal tees
  const branchOD = effectiveBranchNB
    ? getOuterDiameter(
        effectiveBranchNB,
        debouncedProps.branchOuterDiameter || branchDims?.outsideDiameterMm || 0,
      )
    : od;
  const branchWT = effectiveBranchNB ? getWallThickness(effectiveBranchNB) : wt;
  const branchID = branchOD - 2 * branchWT;
  const teeHeight = getTeeHeight(debouncedProps.nominalBore, debouncedProps.teeType);
  const gussetSection =
    debouncedProps.teeType === "gusset" ? getGussetSection(debouncedProps.nominalBore) : 0;
  // Get flange specs for display
  const { specs: runFlangeSpecs, isFromApi: runIsFromApi } = getFlangeSpecs(
    debouncedProps.nominalBore,
    debouncedProps.flangeSpecs,
  );
  // For branch/tee flange, use teeFlangeSpecs if provided (unequal tees), otherwise use main flangeSpecs
  const branchFlangeData = debouncedProps.teeFlangeSpecs || debouncedProps.flangeSpecs;
  const { specs: branchFlangeSpecs, isFromApi: branchIsFromApi } = getFlangeSpecs(
    effectiveBranchNB || debouncedProps.nominalBore,
    branchFlangeData,
  );
  const flangeStandardName = debouncedProps.flangeStandardName || "SABS 1123";
  const isNonSabsStandard =
    !flangeStandardName.toLowerCase().includes("sabs") &&
    !flangeStandardName.toLowerCase().includes("sans");
  const showRunFallbackWarning = !runIsFromApi && isNonSabsStandard;
  const showBranchFallbackWarning = !branchIsFromApi && isNonSabsStandard;
  const closureLength = debouncedProps.closureLengthMm ?? 150;
  const baseRunLengthMm = debouncedProps.runLength || od * 3;
  const runLengthMm =
    baseRunLengthMm +
    (debouncedProps.hasInletFlange ? closureLength : 0) +
    (debouncedProps.hasOutletFlange ? closureLength : 0);
  const branchHeightMm = teeHeight + (debouncedProps.hasBranchFlange ? closureLength : 0);
  const depthMm =
    od +
    (debouncedProps.hasInletFlange || debouncedProps.hasOutletFlange
      ? runFlangeSpecs.thickness
      : 0);
  const runExtent = (runLengthMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const heightExtent = (branchHeightMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const depthExtent = (depthMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const boundingRadius = Math.max(
    0.4,
    Math.sqrt((runExtent / 2) ** 2 + (heightExtent / 2) ** 2 + (depthExtent / 2) ** 2),
  );
  const computeDistance = (fov: number) => {
    const fovRad = (fov * Math.PI) / 180;
    const dist = boundingRadius / Math.sin(fovRad / 2);
    return Math.min(Math.max(dist * 1.15, MIN_CAMERA_DISTANCE), MAX_CAMERA_DISTANCE);
  };
  const defaultCameraDistance = computeDistance(50);
  const expandedCameraDistance = computeDistance(45);
  const defaultCameraPosition = useMemo(
    () =>
      [defaultCameraDistance, defaultCameraDistance * 0.8, defaultCameraDistance] as [
        number,
        number,
        number,
      ],
    [defaultCameraDistance],
  );
  const expandedCameraPosition = useMemo(
    () =>
      [expandedCameraDistance, expandedCameraDistance * 0.85, expandedCameraDistance] as [
        number,
        number,
        number,
      ],
    [expandedCameraDistance],
  );
  const defaultControls = useMemo(
    () => ({
      min: Math.max(defaultCameraDistance * 0.4, 0.8),
      max: Math.min(defaultCameraDistance * 4, MAX_CAMERA_DISTANCE * 1.5),
    }),
    [defaultCameraDistance],
  );
  const expandedControls = useMemo(
    () => ({
      min: Math.max(expandedCameraDistance * 0.35, 0.8),
      max: Math.min(expandedCameraDistance * 4, MAX_CAMERA_DISTANCE * 2),
    }),
    [expandedCameraDistance],
  );

  // Hidden state
  if (isHidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border border-slate-200 px-3 py-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          3D Preview - SABS 719 {props.teeType === "gusset" ? "Gusset" : "Short"} Tee (
          {props.nominalBore}NB)
        </span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-[10px] text-blue-600 bg-white px-2 py-1 rounded shadow-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Show Drawing
        </button>
      </div>
    );
  }

  return (
    <div
      data-tee-preview
      className="w-full h-full min-h-[500px] bg-slate-50 rounded-md border border-slate-200 overflow-hidden relative"
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: defaultCameraPosition, fov: 50, near: 0.01, far: 50000 }}
        style={{ width: "100%", height: "100%" }}
      >
        <CaptureHelper captureRef={captureRef} />
        <ambientLight intensity={LIGHTING_CONFIG.ambient.intensity} />
        <directionalLight
          position={LIGHTING_CONFIG.keyLight.position}
          intensity={LIGHTING_CONFIG.keyLight.intensity}
          castShadow
        />
        <directionalLight position={LIGHTING_CONFIG.fillLight.position} intensity={LIGHTING_CONFIG.fillLight.intensity} />
        <Environment preset={LIGHTING_CONFIG.environment.preset} background={LIGHTING_CONFIG.environment.background} />
        <group scale={PREVIEW_SCALE}>
          <TeeScene {...debouncedProps} />
        </group>
        <ContactShadows position={[0, -3, 0]} opacity={0.3} scale={20} blur={2} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={defaultControls.min}
          maxDistance={defaultControls.max}
        />
        <CameraTracker
          onCameraChange={props.onCameraChange}
          savedPosition={props.savedCameraPosition}
          savedTarget={props.savedCameraTarget}
        />
      </Canvas>

      {/* Badge - top left */}
      <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded shadow-sm">
        <span className="text-purple-700" style={{ fontWeight: 500 }}>
          SABS 719 {props.teeType === "gusset" ? "Gusset" : "Short"} Tee
        </span>
      </div>

      {/* Pipe & Tee Info - top right */}
      <div
        data-info-box
        className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md leading-snug border border-gray-200"
      >
        <div className="font-bold text-blue-800 mb-0.5">RUN PIPE ({props.nominalBore}NB)</div>
        <div className="text-gray-900 font-medium">
          OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm
        </div>
        <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
        {props.branchNominalBore && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">
              BRANCH ({props.branchNominalBore}NB)
            </div>
            <div className="text-gray-900 font-medium">
              OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
            </div>
            <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
          </>
        )}
        {props.teeNominalBore && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">
              TEE PIPE ({props.teeNominalBore}NB)
            </div>
            <div className="text-gray-900 font-medium">
              OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
            </div>
            <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
          </>
        )}
        <div className="text-gray-700 mt-1">Height: {teeHeight}mm</div>
        {props.teeType === "gusset" && (
          <div className="text-gray-700">Gusset: {gussetSection}mm</div>
        )}
        {/* Flange details - show once for equal tees, separate for reducing/unequal tees */}
        {(() => {
          const hasAnyFlange =
            props.hasInletFlange || props.hasOutletFlange || props.hasBranchFlange;
          const isEqualTee = !props.branchNominalBore && !props.teeNominalBore;
          const flangeDesignation = (() => {
            const designation = props.pressureClassDesignation || "";
            const flangeType = props.flangeTypeCode || "";
            const pressureMatch = designation.match(/^(\d+)/);
            const pressureValue = pressureMatch
              ? pressureMatch[1]
              : designation.replace(/\/\d+$/, "");
            return `${flangeStandardName} T${pressureValue}${flangeType}`;
          })();

          if (!hasAnyFlange) return null;

          if (isEqualTee) {
            return (
              <>
                <div className="font-bold text-blue-800 mt-1 mb-0.5">FLANGE (ALL OUTLETS)</div>
                {showRunFallbackWarning && (
                  <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                    Data not available for {flangeStandardName} - showing SABS 1123 reference values
                  </div>
                )}
                <div className="text-gray-900 font-medium">
                  OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm
                </div>
                <div className="text-gray-700">
                  Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm
                </div>
                <div className="text-gray-700">
                  Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} ×{" "}
                  {runFlangeSpecs.boltLength}mm
                </div>
                <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
                <div
                  className={
                    showRunFallbackWarning
                      ? "text-orange-600 font-medium text-[9px]"
                      : "text-green-700 font-medium text-[9px]"
                  }
                >
                  {flangeDesignation}
                </div>
              </>
            );
          }

          return (
            <>
              {(props.hasInletFlange || props.hasOutletFlange) && (
                <>
                  <div className="font-bold text-blue-800 mt-1 mb-0.5">RUN FLANGE</div>
                  {showRunFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} ×{" "}
                    {runFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showRunFallbackWarning
                        ? "text-orange-600 font-medium text-[9px]"
                        : "text-green-700 font-medium text-[9px]"
                    }
                  >
                    {flangeDesignation}
                  </div>
                </>
              )}
              {props.hasBranchFlange && (
                <>
                  <div className="font-bold text-blue-800 mt-1 mb-0.5">
                    {props.teeNominalBore ? "TEE FLANGE" : "BRANCH FLANGE"}
                  </div>
                  {showBranchFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {branchFlangeSpecs.flangeOD}mm | PCD: {branchFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {branchFlangeSpecs.boltHoles} × Ø{branchFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {branchFlangeSpecs.boltHoles} × M{branchFlangeSpecs.boltSize} ×{" "}
                    {branchFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {branchFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showBranchFallbackWarning
                        ? "text-orange-600 font-medium text-[9px]"
                        : "text-green-700 font-medium text-[9px]"
                    }
                  >
                    {flangeDesignation}
                  </div>
                </>
              )}
            </>
          );
        })()}
      </div>

      {/* Notes Section - bottom left */}
      {props.selectedNotes && props.selectedNotes.length > 0 && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-slate-200 max-w-[300px] max-h-[120px] overflow-y-auto">
          <div className="font-bold text-slate-700 mb-1">NOTES</div>
          <ol className="list-decimal list-inside space-y-0.5">
            {props.selectedNotes.map((note, i) => (
              <li key={i} className="text-gray-700 leading-tight">
                {note}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Bottom toolbar - Expand, Drag hint, and Hide button in horizontal row */}
      <div className="absolute bottom-2 right-2 flex flex-row items-center gap-2">
        <button
          onClick={() => setIsExpanded(true)}
          className="text-[10px] text-blue-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Expand
        </button>
        <button
          onClick={() => {
            const container = document.querySelector("[data-tee-preview]");
            const infoBox = container?.querySelector("[data-info-box]");

            const dataUrl = captureRef.current ? captureRef.current() : null;
            if (dataUrl && infoBox) {
              const children = Array.from(infoBox.children);
              const sections: { title: string; content: string[] }[] = [];
              let currentSection: { title: string; content: string[] } | null = null;

              children.forEach((child) => {
                const el = child as HTMLElement;
                if (el.classList.contains("font-bold")) {
                  if (currentSection) sections.push(currentSection);
                  currentSection = { title: el.outerHTML, content: [] };
                } else if (currentSection) {
                  currentSection.content.push(el.outerHTML);
                }
              });
              if (currentSection) sections.push(currentSection);

              const midPoint = Math.ceil(sections.length / 2);
              const leftSections = sections.slice(0, midPoint);
              const rightSections = sections.slice(midPoint);

              const renderSections = (secs: typeof sections) =>
                secs.map((s) => `${s.title}${s.content.join("")}`).join("");

              const printWindow = window.open("", "_blank");
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>3D Tee Drawing</title>
                      <style>
                        body { margin: 15px; font-family: Arial, sans-serif; }
                        .drawing-section { width: 100%; margin-bottom: 15px; }
                        .drawing-section img { width: 100%; border: 1px solid #ccc; }
                        .info-container { display: flex; gap: 20px; }
                        .info-column { flex: 1; padding: 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; }
                        .info-column > div { margin-bottom: 3px; }
                        .font-bold { font-weight: bold; margin-top: 8px; }
                        .text-blue-800 { color: #1e40af; }
                        .text-gray-900 { color: #111827; }
                        .text-gray-700 { color: #374151; }
                        .text-green-700 { color: #15803d; }
                        @media print { body { margin: 10px; } }
                      </style>
                    </head>
                    <body>
                      <div class="drawing-section">
                        <img src="${dataUrl}" />
                      </div>
                      <div class="info-container">
                        <div class="info-column">${renderSections(leftSections)}</div>
                        <div class="info-column">${renderSections(rightSections)}</div>
                      </div>
                      <script>
                        window.onload = function() { setTimeout(function() { window.print(); }, 100); };
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }
            }
          }}
          className="text-[10px] text-green-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print
        </button>
        <button
          onClick={() => {
            const runOd = od;
            const branchOdVal = branchOD;
            const height = teeHeight;

            let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
            dxf += "0\nSECTION\n2\nENTITIES\n";

            const runTop = runOd / 2;
            const runBottom = -runOd / 2;
            const runLength = runOd * 3;

            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${-runLength / 2}\n20\n${runTop}\n11\n${runLength / 2}\n21\n${runTop}\n`;
            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${-runLength / 2}\n20\n${runBottom}\n11\n${runLength / 2}\n21\n${runBottom}\n`;

            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${-runLength / 2}\n20\n${runTop}\n11\n${-runLength / 2}\n21\n${runBottom}\n`;
            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${runLength / 2}\n20\n${runTop}\n11\n${runLength / 2}\n21\n${runBottom}\n`;

            const branchLeft = -branchOdVal / 2;
            const branchRight = branchOdVal / 2;
            dxf += `0\nLINE\n8\nBRANCH\n62\n3\n10\n${branchLeft}\n20\n${runTop}\n11\n${branchLeft}\n21\n${runTop + height}\n`;
            dxf += `0\nLINE\n8\nBRANCH\n62\n3\n10\n${branchRight}\n20\n${runTop}\n11\n${branchRight}\n21\n${runTop + height}\n`;
            dxf += `0\nLINE\n8\nBRANCH\n62\n3\n10\n${branchLeft}\n20\n${runTop + height}\n11\n${branchRight}\n21\n${runTop + height}\n`;

            dxf += `0\nTEXT\n8\nDIMENSION\n10\n0\n20\n${runBottom - 30}\n40\n15\n1\nSABS 719 ${props.teeType === "gusset" ? "GUSSET" : "SHORT"} TEE\n72\n1\n11\n0\n21\n${runBottom - 30}\n`;
            dxf += `0\nTEXT\n8\nDIMENSION\n10\n0\n20\n${runBottom - 50}\n40\n12\n1\nRun: ${props.nominalBore}NB | Branch: ${props.branchNominalBore}NB\n72\n1\n11\n0\n21\n${runBottom - 50}\n`;

            dxf += "0\nENDSEC\n0\nEOF\n";

            const blob = new Blob([dxf], { type: "application/dxf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tee_${props.nominalBore}x${props.branchNominalBore}NB.dxf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="text-[10px] text-orange-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export DXF
        </button>
        <div className="text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded shadow-sm">
          Drag to Rotate
        </div>
        <button
          onClick={() => setIsHidden(true)}
          className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          Hide Drawing
        </button>
      </div>

      {/* Expanded Modal - centered in viewport */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative w-full h-full max-w-6xl max-h-[90vh] bg-slate-100 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 z-50 bg-white hover:bg-white text-gray-700 p-3 rounded-full shadow-xl transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Expanded Canvas */}
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ position: expandedCameraPosition, fov: 45, near: 0.01, far: 50000 }}
            >
              <ambientLight intensity={LIGHTING_CONFIG.ambient.intensity} />
              <directionalLight
                position={LIGHTING_CONFIG.keyLight.position}
                intensity={LIGHTING_CONFIG.keyLight.intensity}
                castShadow
              />
              <directionalLight position={LIGHTING_CONFIG.fillLight.position} intensity={LIGHTING_CONFIG.fillLight.intensity} />
              <Environment preset={LIGHTING_CONFIG.environment.preset} background={LIGHTING_CONFIG.environment.background} />
              <group scale={PREVIEW_SCALE}>
                <TeeScene {...debouncedProps} />
              </group>
              <ContactShadows position={[0, -3, 0]} opacity={0.3} scale={20} blur={2} />
              <OrbitControls
                makeDefault
                enablePan
                minDistance={expandedControls.min}
                maxDistance={expandedControls.max}
              />
              <CameraTracker
                onCameraChange={props.onCameraChange}
                savedPosition={props.savedCameraPosition}
                savedTarget={props.savedCameraTarget}
              />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg border border-gray-200">
              <div className="font-bold text-blue-800 mb-1">RUN PIPE ({props.nominalBore}NB)</div>
              <div className="text-gray-900 font-medium">
                OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm
              </div>
              <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
              {props.branchNominalBore && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">
                    BRANCH ({props.branchNominalBore}NB)
                  </div>
                  <div className="text-gray-900 font-medium">
                    OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
                  </div>
                  <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
                </>
              )}
              {props.teeNominalBore && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">
                    TEE PIPE ({props.teeNominalBore}NB)
                  </div>
                  <div className="text-gray-900 font-medium">
                    OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
                  </div>
                  <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
                </>
              )}
              <div className="text-gray-700 mt-2">Height: {teeHeight}mm</div>
              {props.teeType === "gusset" && (
                <div className="text-gray-700">Gusset: {gussetSection}mm</div>
              )}
              {(props.hasInletFlange || props.hasOutletFlange) && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">RUN FLANGE</div>
                  {showRunFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} ×{" "}
                    {runFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showRunFallbackWarning
                        ? "text-orange-600 font-medium"
                        : "text-green-700 font-medium"
                    }
                  >
                    {(() => {
                      const designation = props.pressureClassDesignation || "";
                      const flangeType = props.flangeTypeCode || "";
                      const pressureMatch = designation.match(/^(\d+)/);
                      const pressureValue = pressureMatch
                        ? pressureMatch[1]
                        : designation.replace(/\/\d+$/, "");
                      return `${flangeStandardName} T${pressureValue}${flangeType}`;
                    })()}
                  </div>
                </>
              )}
              {props.hasBranchFlange && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">
                    {props.teeNominalBore ? "TEE FLANGE" : "BRANCH FLANGE"}
                  </div>
                  {showBranchFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {branchFlangeSpecs.flangeOD}mm | PCD: {branchFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {branchFlangeSpecs.boltHoles} × Ø{branchFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {branchFlangeSpecs.boltHoles} × M{branchFlangeSpecs.boltSize} ×{" "}
                    {branchFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {branchFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showBranchFallbackWarning
                        ? "text-orange-600 font-medium"
                        : "text-green-700 font-medium"
                    }
                  >
                    {(() => {
                      const designation = props.pressureClassDesignation || "";
                      const flangeType = props.flangeTypeCode || "";
                      const pressureMatch = designation.match(/^(\d+)/);
                      const pressureValue = pressureMatch
                        ? pressureMatch[1]
                        : designation.replace(/\/\d+$/, "");
                      return `${flangeStandardName} T${pressureValue}${flangeType}`;
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Controls hint */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-white/80 bg-black/50 px-4 py-2 rounded-full">
              Drag to rotate • Scroll to zoom • Right-click to pan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
