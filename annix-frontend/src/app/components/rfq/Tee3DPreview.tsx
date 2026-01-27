'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center, Text, Line } from '@react-three/drei';
import { log } from '@/app/lib/logger';
import * as THREE from 'three';
import {
  getSabs719TeeDimensions,
  getTeeHeight,
  getGussetSection,
  Sabs719TeeType
} from '@/app/lib/utils/sabs719TeeData';
import { FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs';

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

const SCALE_FACTOR = 100;
const PREVIEW_SCALE = 1.1;
const MIN_CAMERA_DISTANCE = 1.2;
const MAX_CAMERA_DISTANCE = 120;

// Flange type for rendering
type FlangeType = 'fixed' | 'loose' | 'rotating' | null;

interface Tee3DPreviewProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness?: number;
  teeType: Sabs719TeeType; // 'short' or 'gusset'
  branchNominalBore?: number; // For reducing tees (optional)
  branchOuterDiameter?: number;
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

// Standard Pipe OD Lookup Table (NB to OD in mm)
// Based on ASME B36.10M / ISO 4200 / SABS 719
const NB_TO_OD: { [key: number]: number } = {
  15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3, 65: 73.0, 80: 88.9,
  100: 114.3, 125: 139.7, 150: 168.3, 200: 219.1, 250: 273.0, 300: 323.9,
  350: 355.6, 400: 406.4, 450: 457.2, 500: 508.0, 550: 559.0, 600: 609.6,
  650: 660.4, 700: 711.2, 750: 762.0, 800: 812.8, 850: 863.6, 900: 914.4,
  1000: 1016.0, 1050: 1066.8, 1200: 1219.2
};

// Get pipe OD from NB using lookup table
const getOuterDiameter = (nb: number, providedOD: number = 0): number => {
  if (providedOD && providedOD > 0) return providedOD;
  if (NB_TO_OD[nb]) return NB_TO_OD[nb];
  const sizes = Object.keys(NB_TO_OD).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nb) closestSize = size;
    else break;
  }
  return NB_TO_OD[closestSize] || nb * 1.05;
};

// SABS 719 ERW Pipe Wall Thickness Table (Class B - Standard)
const SABS_719_WALL_THICKNESS: { [key: number]: number } = {
  200: 5.2, 250: 5.2, 300: 6.4, 350: 6.4, 400: 6.4, 450: 6.4, 500: 6.4,
  550: 6.4, 600: 6.4, 650: 8.0, 700: 8.0, 750: 8.0, 800: 8.0, 850: 9.5,
  900: 9.5, 1000: 9.5, 1050: 9.5, 1200: 12.7
};

// Get wall thickness for SABS 719 pipes
const getWallThickness = (nb: number, providedWT: number = 0): number => {
  if (providedWT && providedWT > 1) return providedWT;
  if (SABS_719_WALL_THICKNESS[nb]) return SABS_719_WALL_THICKNESS[nb];
  const sizes = Object.keys(SABS_719_WALL_THICKNESS).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nb) closestSize = size;
    else break;
  }
  return SABS_719_WALL_THICKNESS[closestSize] || 6.4;
};

// Flange lookup table based on nominal bore - SABS 1123 Table 1000/4 (PN16) Slip-on flanges
// Bolt length calculated for: 2 x flange thickness + gasket (3mm) + nut + washer + thread engagement
// Returns { specs, isFromApi } to indicate if data is from API or fallback
const getFlangeSpecs = (nb: number, apiSpecs?: FlangeSpecData | null): { specs: { flangeOD: number; pcd: number; thickness: number; boltHoles: number; holeID: number; boltSize: number; boltLength: number }; isFromApi: boolean } => {
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

  const flangeData: Record<number, { flangeOD: number; pcd: number; thickness: number; boltHoles: number; holeID: number; boltSize: number; boltLength: number }> = {
    15: { flangeOD: 95, pcd: 65, thickness: 14, boltHoles: 4, holeID: 14, boltSize: 12, boltLength: 55 },
    20: { flangeOD: 105, pcd: 75, thickness: 14, boltHoles: 4, holeID: 14, boltSize: 12, boltLength: 55 },
    25: { flangeOD: 115, pcd: 85, thickness: 14, boltHoles: 4, holeID: 14, boltSize: 12, boltLength: 55 },
    32: { flangeOD: 140, pcd: 100, thickness: 16, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 65 },
    40: { flangeOD: 150, pcd: 110, thickness: 16, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 65 },
    50: { flangeOD: 165, pcd: 125, thickness: 18, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 70 },
    65: { flangeOD: 185, pcd: 145, thickness: 18, boltHoles: 4, holeID: 18, boltSize: 16, boltLength: 70 },
    80: { flangeOD: 200, pcd: 160, thickness: 18, boltHoles: 8, holeID: 18, boltSize: 16, boltLength: 70 },
    100: { flangeOD: 220, pcd: 180, thickness: 18, boltHoles: 8, holeID: 18, boltSize: 16, boltLength: 70 },
    125: { flangeOD: 250, pcd: 210, thickness: 20, boltHoles: 8, holeID: 18, boltSize: 16, boltLength: 75 },
    150: { flangeOD: 285, pcd: 240, thickness: 20, boltHoles: 8, holeID: 22, boltSize: 20, boltLength: 80 },
    200: { flangeOD: 340, pcd: 295, thickness: 22, boltHoles: 12, holeID: 22, boltSize: 20, boltLength: 85 },
    250: { flangeOD: 405, pcd: 355, thickness: 24, boltHoles: 12, holeID: 26, boltSize: 24, boltLength: 95 },
    300: { flangeOD: 460, pcd: 410, thickness: 24, boltHoles: 12, holeID: 26, boltSize: 24, boltLength: 95 },
    350: { flangeOD: 520, pcd: 470, thickness: 26, boltHoles: 16, holeID: 26, boltSize: 24, boltLength: 100 },
    400: { flangeOD: 580, pcd: 525, thickness: 28, boltHoles: 16, holeID: 30, boltSize: 27, boltLength: 110 },
    450: { flangeOD: 640, pcd: 585, thickness: 28, boltHoles: 20, holeID: 30, boltSize: 27, boltLength: 110 },
    500: { flangeOD: 670, pcd: 620, thickness: 32, boltHoles: 20, holeID: 26, boltSize: 24, boltLength: 115 },
    600: { flangeOD: 780, pcd: 725, thickness: 32, boltHoles: 20, holeID: 30, boltSize: 27, boltLength: 120 },
    650: { flangeOD: 830, pcd: 775, thickness: 34, boltHoles: 20, holeID: 30, boltSize: 27, boltLength: 125 },
    700: { flangeOD: 885, pcd: 830, thickness: 34, boltHoles: 24, holeID: 30, boltSize: 27, boltLength: 125 },
    750: { flangeOD: 940, pcd: 880, thickness: 36, boltHoles: 24, holeID: 33, boltSize: 30, boltLength: 135 },
    800: { flangeOD: 1015, pcd: 950, thickness: 38, boltHoles: 24, holeID: 33, boltSize: 30, boltLength: 140 },
    850: { flangeOD: 1065, pcd: 1000, thickness: 38, boltHoles: 24, holeID: 33, boltSize: 30, boltLength: 140 },
    900: { flangeOD: 1115, pcd: 1050, thickness: 40, boltHoles: 28, holeID: 33, boltSize: 30, boltLength: 145 },
  };
  const sizes = Object.keys(flangeData).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nb) closestSize = size;
    else break;
  }
  return {
    specs: flangeData[closestSize] || { flangeOD: nb * 1.5, pcd: nb * 1.3, thickness: 26, boltHoles: 12, holeID: 22, boltSize: 20, boltLength: 90 },
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
  holeID
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
    <mesh position={position} rotation={rotation || [0, 0, 0]} geometry={blankGeometry} castShadow receiveShadow>
      <meshStandardMaterial color="#cc3300" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

// Retaining Ring component for rotating flanges
function RetainingRingComponent({
  position,
  rotation,
  pipeOuterRadius,
  pipeInnerRadius,
  thickness
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
    <mesh position={position} rotation={rotation || [0, 0, 0]} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#606060" metalness={0.6} roughness={0.4} />
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
  holeID
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
    <mesh position={position} rotation={rotation || [0, 0, 0]} geometry={flangeGeometry} castShadow receiveShadow>
      <meshStandardMaterial color="#404040" metalness={0.7} roughness={0.3} />
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
  holeID
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
    <mesh position={position} rotation={rotation || [0, 0, 0]} geometry={flangeGeometry} castShadow receiveShadow>
      <meshStandardMaterial color="#404040" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

// Realistic gusset plate component - isoceles right triangle at 45° as per SABS 719
// Per the technical drawing, gussets are triangular plates with both legs equal to dimension C
// The gusset extends from the branch pipe at 45° down to the run pipe
function GussetPlate({
  runRadius,
  branchRadius,
  gussetLength, // This is dimension C - both legs of the 45° triangle
  thickness,
  side, // 'left' or 'right' - which side of the branch (along run axis)
  branchOffsetX,
}: {
  runRadius: number;
  branchRadius: number;
  gussetLength: number;
  thickness: number;
  side: 'left' | 'right';
  branchOffsetX: number;
}) {
  const geometry = useMemo(() => {
    // Create an isoceles right triangle at 45° angle
    // The triangle has:
    // - One vertical leg along the branch pipe (length = C)
    // - One horizontal leg along the run pipe (length = C)
    // - Hypotenuse at 45° connecting them
    const halfThick = thickness / 2;
    const dir = side === 'left' ? -1 : 1;

    // Triangle vertices (looking from front, +Z direction):
    // Bottom corner: at branch edge on run pipe surface
    // Top corner: up the branch by gussetLength
    // Outer corner: outward along run pipe by gussetLength

    const bottomX = branchOffsetX + dir * branchRadius;
    const bottomY = runRadius;

    const topX = branchOffsetX + dir * branchRadius;
    const topY = runRadius + gussetLength;

    const outerX = branchOffsetX + dir * (branchRadius + gussetLength);
    const outerY = runRadius;

    const positions = new Float32Array([
      // Front face (z = +halfThick)
      bottomX, bottomY, halfThick,  // 0
      topX, topY, halfThick,        // 1
      outerX, outerY, halfThick,    // 2
      // Back face (z = -halfThick)
      bottomX, bottomY, -halfThick, // 3
      topX, topY, -halfThick,       // 4
      outerX, outerY, -halfThick,   // 5
    ]);

    // Indices for all faces
    const indices = [
      // Front face
      0, 1, 2,
      // Back face (reversed winding)
      3, 5, 4,
      // Top edge (vertical leg)
      0, 3, 1,
      1, 3, 4,
      // Bottom edge (horizontal leg)
      0, 2, 3,
      2, 5, 3,
      // Hypotenuse edge (45° diagonal)
      1, 4, 2,
      2, 4, 5,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [runRadius, branchRadius, gussetLength, thickness, side, branchOffsetX]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#4a7c4e"
        metalness={0.6}
        roughness={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Weld bead component for gusset edges
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
  side: 'left' | 'right';
  branchOffsetX: number;
}) {
  const weldRadius = gussetLength * 0.03;
  const dir = side === 'left' ? -1 : 1;

  // Create weld beads along the edges
  const points: THREE.Vector3[] = [];
  const segments = 12;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = branchOffsetX + dir * (branchRadius + t * gussetLength);
    const y = runRadius + t * gussetLength * 0.85;
    points.push(new THREE.Vector3(x, y, 0));
  }

  const curve = new THREE.CatmullRomCurve3(points);

  return (
    <mesh>
      <tubeGeometry args={[curve, 16, weldRadius, 8, false]} />
      <meshStandardMaterial color="#2a2a2a" metalness={0.3} roughness={0.8} />
    </mesh>
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
    runLength,
    branchPositionMm,
    hasInletFlange = false,
    hasOutletFlange = false,
    hasBranchFlange = false,
    inletFlangeType = 'fixed',
    outletFlangeType = 'fixed',
    branchFlangeType = 'fixed',
    closureLengthMm = 150,
    addBlankFlange = false,
    blankFlangePositions = [],
  } = props;

  // Determine which positions have blank flanges (can be used with any flange type: fixed, loose, or rotating)
  const hasBlankInlet = addBlankFlange && blankFlangePositions.includes('inlet') && hasInletFlange;
  const hasBlankOutlet = addBlankFlange && blankFlangePositions.includes('outlet') && hasOutletFlange;
  const hasBlankBranch = addBlankFlange && blankFlangePositions.includes('branch') && hasBranchFlange;

  // Get dimensions from SABS 719 data
  const dims = getSabs719TeeDimensions(nominalBore);
  const branchDims = branchNominalBore ? getSabs719TeeDimensions(branchNominalBore) : null;
  const teeHeight = getTeeHeight(nominalBore, teeType);
  const gussetSection = teeType === 'gusset' ? getGussetSection(nominalBore) : 0;

  // Calculate dimensions using proper lookup tables
  const od = getOuterDiameter(nominalBore, outerDiameter || dims?.outsideDiameterMm || 0);
  const wt = getWallThickness(nominalBore, wallThickness || 0);
  const id = od - (2 * wt);
  // For reducing tees, use the branch NB dimensions; otherwise use same as run
  const branchOD = branchNominalBore
    ? getOuterDiameter(branchNominalBore, branchOuterDiameter || branchDims?.outsideDiameterMm || 0)
    : od; // Same as run for equal tee
  const branchWT = branchNominalBore ? getWallThickness(branchNominalBore) : wt;
  const branchID = branchOD - (2 * branchWT);

  // Scale factor for 3D scene (convert mm to scene units)
  const scaleFactor = SCALE_FACTOR;
  const outerRadius = Math.max(0.01, (od / scaleFactor) / 2);
  const rawInnerRadius = (id / scaleFactor) / 2;
  const innerRadius = Math.max(0.001, Math.min(rawInnerRadius, outerRadius - 0.001));
  const branchOuterRadius = Math.max(0.01, (branchOD / scaleFactor) / 2);
  const rawBranchInnerRadius = (branchID / scaleFactor) / 2;
  const branchInnerRadius = Math.max(0.001, Math.min(rawBranchInnerRadius, branchOuterRadius - 0.001));
  const height = teeHeight / scaleFactor;
  const gussetSize = gussetSection / scaleFactor;

  // Run pipe length (default to 3x the OD)
  const totalRunLength = runLength || od * 3;
  const halfRunLength = totalRunLength / scaleFactor / 2;

  // Branch position offset from center
  // branchPositionMm is distance from left flange to center of branch
  // Convert to offset from center: offset = branchPositionMm - (totalRunLength / 2)
  const branchOffsetX = branchPositionMm !== undefined
    ? (branchPositionMm - (totalRunLength / 2)) / scaleFactor
    : 0; // Default to center if not specified

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

  // Flange specs
  const { specs: runFlangeSpecs } = getFlangeSpecs(nominalBore, props.flangeSpecs);
  const { specs: branchFlangeSpecs } = getFlangeSpecs(branchNominalBore || nominalBore, props.flangeSpecs);

  // Gusset plate thickness (estimated based on size)
  const gussetThickness = nominalBore <= 400 ? 0.1 : 0.14;

  return (
    <Center>
      <group>
        {/* Run pipe (horizontal) */}
        <mesh
          position={[-halfRunLength, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <primitive object={createPipeGeometry(outerRadius, innerRadius, halfRunLength * 2)} attach="geometry" />
          <meshStandardMaterial color="#b0b0b0" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Branch pipe (vertical, going up) - positioned based on branchPositionMm */}
        <mesh
          position={[branchOffsetX, outerRadius, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <primitive object={createPipeGeometry(branchOuterRadius, branchInnerRadius, height - outerRadius)} attach="geometry" />
          <meshStandardMaterial color="#b0b0b0" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Reinforcement collar at branch junction */}
        <mesh position={[branchOffsetX, outerRadius - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[branchOuterRadius + 0.02, 0.05, 16, 32]} />
          <meshStandardMaterial color="#808080" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Gusset plates for Gusset Tees - curved reinforcement plates on both sides of branch */}
        {teeType === 'gusset' && gussetSize > 0 && (
          <>
            {/* Left gusset (-X side) - extends from run pipe up along branch */}
            <GussetPlate
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              thickness={gussetThickness}
              side="left"
              branchOffsetX={branchOffsetX}
            />
            {/* Left gusset weld */}
            <GussetWeld
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              side="left"
              branchOffsetX={branchOffsetX}
            />
            {/* Right gusset (+X side) */}
            <GussetPlate
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              thickness={gussetThickness}
              side="right"
              branchOffsetX={branchOffsetX}
            />
            {/* Right gusset weld */}
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
        {hasInletFlange && (
          <>
            {inletFlangeType === 'rotating' ? (
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
                  points={[[-halfRunLength, -outerRadius - 0.15, 0], [-halfRunLength + 0.5, -outerRadius - 0.15, 0]]}
                  color="#ea580c"
                  lineWidth={2}
                />
                <Line points={[[-halfRunLength, -outerRadius - 0.1, 0], [-halfRunLength, -outerRadius - 0.2, 0]]} color="#ea580c" lineWidth={1} />
                <Line points={[[-halfRunLength + 0.5, -outerRadius - 0.1, 0], [-halfRunLength + 0.5, -outerRadius - 0.2, 0]]} color="#ea580c" lineWidth={1} />
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
            ) : inletFlangeType === 'loose' ? (
              <>
                {/* Loose flange: Closure piece attached to tee, then 100mm gap, then flange floating */}
                {/* Hollow closure pipe piece - simple geometry approach */}
                <group position={[-halfRunLength - (closureLengthMm / scaleFactor / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <mesh>
                    <cylinderGeometry args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32, 1, true]} />
                    <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
                  </mesh>
                  <mesh>
                    <cylinderGeometry args={[innerRadius, innerRadius, closureLengthMm / scaleFactor + 0.01, 32, 1, true]} />
                    <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
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
                    [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.15, 0]
                  ]}
                  color="#2563eb"
                  lineWidth={2}
                />
                <Line points={[[-halfRunLength, -outerRadius - 0.1, 0], [-halfRunLength, -outerRadius - 0.2, 0]]} color="#2563eb" lineWidth={1} />
                <Line points={[[-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.1, 0], [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.2, 0]]} color="#2563eb" lineWidth={1} />
                {/* L/F label with closure length */}
                <Text
                  position={[-halfRunLength - (closureLengthMm / scaleFactor / 2), -outerRadius - 0.35, 0]}
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
                    [-halfRunLength - closureLengthMm / scaleFactor - 1.0, -outerRadius - 0.5, 0]
                  ]}
                  color="#9333ea"
                  lineWidth={1}
                  dashed
                />
                <Text
                  position={[-halfRunLength - closureLengthMm / scaleFactor - 0.5, -outerRadius - 0.65, 0]}
                  fontSize={0.12}
                  color="#9333ea"
                  anchorX="center"
                  anchorY="middle"
                >
                  100mm gap
                </Text>
              </>
            ) : (
              <FlangeComponent
                position={[-halfRunLength - runFlangeSpecs.thickness / scaleFactor, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(od + 3) / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
            )}
          </>
        )}

        {/* Outlet flange (right side of run) */}
        {hasOutletFlange && (
          <>
            {outletFlangeType === 'rotating' ? (
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
                  points={[[halfRunLength - 0.5, -outerRadius - 0.15, 0], [halfRunLength, -outerRadius - 0.15, 0]]}
                  color="#ea580c"
                  lineWidth={2}
                />
                <Line points={[[halfRunLength - 0.5, -outerRadius - 0.1, 0], [halfRunLength - 0.5, -outerRadius - 0.2, 0]]} color="#ea580c" lineWidth={1} />
                <Line points={[[halfRunLength, -outerRadius - 0.1, 0], [halfRunLength, -outerRadius - 0.2, 0]]} color="#ea580c" lineWidth={1} />
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
            ) : outletFlangeType === 'loose' ? (
              <>
                {/* Loose flange: Closure piece attached to tee, then 100mm gap, then flange floating */}
                {/* Hollow closure pipe piece - simple geometry approach */}
                <group position={[halfRunLength + (closureLengthMm / scaleFactor / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <mesh>
                    <cylinderGeometry args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32, 1, true]} />
                    <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
                  </mesh>
                  <mesh>
                    <cylinderGeometry args={[innerRadius, innerRadius, closureLengthMm / scaleFactor + 0.01, 32, 1, true]} />
                    <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
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
                    [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.15, 0]
                  ]}
                  color="#2563eb"
                  lineWidth={2}
                />
                <Line points={[[halfRunLength, -outerRadius - 0.1, 0], [halfRunLength, -outerRadius - 0.2, 0]]} color="#2563eb" lineWidth={1} />
                <Line points={[[halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.1, 0], [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.2, 0]]} color="#2563eb" lineWidth={1} />
                {/* L/F label with closure length */}
                <Text
                  position={[halfRunLength + (closureLengthMm / scaleFactor / 2), -outerRadius - 0.35, 0]}
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
                    [halfRunLength + closureLengthMm / scaleFactor + 1.0, -outerRadius - 0.5, 0]
                  ]}
                  color="#9333ea"
                  lineWidth={1}
                  dashed
                />
                <Text
                  position={[halfRunLength + closureLengthMm / scaleFactor + 0.5, -outerRadius - 0.65, 0]}
                  fontSize={0.12}
                  color="#9333ea"
                  anchorX="center"
                  anchorY="middle"
                >
                  100mm gap
                </Text>
              </>
            ) : (
              <FlangeComponent
                position={[halfRunLength + runFlangeSpecs.thickness / scaleFactor, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(od + 3) / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
            )}
          </>
        )}

        {/* Branch flange (top of branch) */}
        {hasBranchFlange && (
          <>
            {branchFlangeType === 'rotating' ? (
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
                  points={[[branchOffsetX + branchOuterRadius + 0.15, height - 0.5, 0], [branchOffsetX + branchOuterRadius + 0.15, height, 0]]}
                  color="#ea580c"
                  lineWidth={2}
                />
                <Line points={[[branchOffsetX + branchOuterRadius + 0.1, height - 0.5, 0], [branchOffsetX + branchOuterRadius + 0.2, height - 0.5, 0]]} color="#ea580c" lineWidth={1} />
                <Line points={[[branchOffsetX + branchOuterRadius + 0.1, height, 0], [branchOffsetX + branchOuterRadius + 0.2, height, 0]]} color="#ea580c" lineWidth={1} />
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
            ) : branchFlangeType === 'loose' ? (
              <>
                {/* Loose flange: Closure piece attached to branch, then 100mm gap, then flange floating */}
                {/* Hollow closure pipe piece - simple geometry approach */}
                <group position={[branchOffsetX, height + (closureLengthMm / scaleFactor / 2), 0]}>
                  <mesh>
                    <cylinderGeometry args={[branchOuterRadius, branchOuterRadius, closureLengthMm / scaleFactor, 32, 1, true]} />
                    <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} />
                  </mesh>
                  <mesh>
                    <cylinderGeometry args={[branchInnerRadius, branchInnerRadius, closureLengthMm / scaleFactor + 0.01, 32, 1, true]} />
                    <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
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
                    [branchOffsetX + branchOuterRadius + 0.15, height + closureLengthMm / scaleFactor, 0]
                  ]}
                  color="#2563eb"
                  lineWidth={2}
                />
                <Line points={[[branchOffsetX + branchOuterRadius + 0.1, height, 0], [branchOffsetX + branchOuterRadius + 0.2, height, 0]]} color="#2563eb" lineWidth={1} />
                <Line points={[[branchOffsetX + branchOuterRadius + 0.1, height + closureLengthMm / scaleFactor, 0], [branchOffsetX + branchOuterRadius + 0.2, height + closureLengthMm / scaleFactor, 0]]} color="#2563eb" lineWidth={1} />
                {/* L/F label */}
                <Text
                  position={[branchOffsetX + branchOuterRadius + 0.35, height + (closureLengthMm / scaleFactor / 2), 0]}
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
                    [branchOffsetX + branchOuterRadius + 0.4, height + closureLengthMm / scaleFactor, 0],
                    [branchOffsetX + branchOuterRadius + 0.4, height + closureLengthMm / scaleFactor + 1.0, 0]
                  ]}
                  color="#9333ea"
                  lineWidth={1}
                  dashed
                />
                <Text
                  position={[branchOffsetX + branchOuterRadius + 0.6, height + closureLengthMm / scaleFactor + 0.5, 0]}
                  fontSize={0.12}
                  color="#9333ea"
                  anchorX="left"
                  anchorY="middle"
                >
                  100mm gap
                </Text>
              </>
            ) : (
              <FlangeComponent
                position={[branchOffsetX, height + branchFlangeSpecs.thickness / scaleFactor, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(branchOD + 3) / scaleFactor}
                thickness={branchFlangeSpecs.thickness / scaleFactor}
                pcd={branchFlangeSpecs.pcd / scaleFactor}
                boltHoles={branchFlangeSpecs.boltHoles}
                holeID={branchFlangeSpecs.holeID / scaleFactor}
              />
            )}
          </>
        )}

        {/* Blank Flanges - solid disc flanges positioned 50mm from fixed flanges */}
        {/* Blank flange gap distance: 50mm = 0.5 in scene units (50/100) */}
        {hasBlankInlet && (
          <>
            <BlankFlangeComponent
              position={[-halfRunLength - (2 * runFlangeSpecs.thickness / scaleFactor) - 0.5, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
              thickness={runFlangeSpecs.thickness / scaleFactor}
              pcd={runFlangeSpecs.pcd / scaleFactor}
              boltHoles={runFlangeSpecs.boltHoles}
              holeID={runFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[-halfRunLength - (2 * runFlangeSpecs.thickness / scaleFactor) - 0.25, -outerRadius - 0.2, 0]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="center"
              anchorY="top"
              outlineWidth={0.015}
              outlineColor="white"
            >
              BLANK
            </Text>
          </>
        )}
        {hasBlankOutlet && (
          <>
            <BlankFlangeComponent
              position={[halfRunLength + (2 * runFlangeSpecs.thickness / scaleFactor) + 0.5, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
              thickness={runFlangeSpecs.thickness / scaleFactor}
              pcd={runFlangeSpecs.pcd / scaleFactor}
              boltHoles={runFlangeSpecs.boltHoles}
              holeID={runFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[halfRunLength + (2 * runFlangeSpecs.thickness / scaleFactor) + 0.75, -outerRadius - 0.2, 0]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="center"
              anchorY="top"
              outlineWidth={0.015}
              outlineColor="white"
            >
              BLANK
            </Text>
          </>
        )}
        {hasBlankBranch && (
          <>
            <BlankFlangeComponent
              position={[branchOffsetX, height + (2 * branchFlangeSpecs.thickness / scaleFactor) + 0.5, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
              thickness={branchFlangeSpecs.thickness / scaleFactor}
              pcd={branchFlangeSpecs.pcd / scaleFactor}
              boltHoles={branchFlangeSpecs.boltHoles}
              holeID={branchFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[branchOffsetX - branchOuterRadius - 0.3, height + (2 * branchFlangeSpecs.thickness / scaleFactor) + 0.5, 0]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="right"
              anchorY="middle"
              outlineWidth={0.015}
              outlineColor="white"
            >
              BLANK
            </Text>
          </>
        )}

        {/* Dimension lines */}
        {/* Height dimension (vertical) - positioned at branch location */}
        <Line
          points={[[branchOffsetX + branchOuterRadius + 0.3, 0, 0], [branchOffsetX + branchOuterRadius + 0.3, height, 0]]}
          color="#dc2626"
          lineWidth={2}
        />
        <Line
          points={[[branchOffsetX + branchOuterRadius + 0.1, 0, 0], [branchOffsetX + branchOuterRadius + 0.4, 0, 0]]}
          color="#dc2626"
          lineWidth={1}
        />
        <Line
          points={[[branchOffsetX + branchOuterRadius + 0.1, height, 0], [branchOffsetX + branchOuterRadius + 0.4, height, 0]]}
          color="#dc2626"
          lineWidth={1}
        />
        <Text
          position={[branchOffsetX + branchOuterRadius + 0.5, height / 2, 0]}
          fontSize={0.2}
          color="#dc2626"
          anchorX="left"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="white"
          fontWeight="bold"
        >
          {`${teeHeight}mm`}
        </Text>

        {/* Branch position dimension line (horizontal from left flange to branch center) */}
        {branchPositionMm !== undefined && (
          <>
            <Line
              points={[[-halfRunLength, -outerRadius - 0.3, 0], [branchOffsetX, -outerRadius - 0.3, 0]]}
              color="#16a34a"
              lineWidth={2}
            />
            <Line
              points={[[-halfRunLength, -outerRadius - 0.15, 0], [-halfRunLength, -outerRadius - 0.45, 0]]}
              color="#16a34a"
              lineWidth={1}
            />
            <Line
              points={[[branchOffsetX, -outerRadius - 0.15, 0], [branchOffsetX, -outerRadius - 0.45, 0]]}
              color="#16a34a"
              lineWidth={1}
            />
            <Text
              position={[(-halfRunLength + branchOffsetX) / 2, -outerRadius - 0.55, 0]}
              fontSize={0.18}
              color="#16a34a"
              anchorX="center"
              anchorY="top"
              outlineWidth={0.02}
              outlineColor="white"
              fontWeight="bold"
            >
              {`${branchPositionMm}mm`}
            </Text>
          </>
        )}

        {/* Gusset dimension for gusset tees - shows vertical gusset length */}
        {teeType === 'gusset' && gussetSize > 0 && (
          <>
            <Line
              points={[
                [branchOffsetX + branchOuterRadius + gussetSize + 0.1, outerRadius, 0.3],
                [branchOffsetX + branchOuterRadius + gussetSize + 0.1, outerRadius + gussetSize * 0.85, 0.3]
              ]}
              color="#0066cc"
              lineWidth={2}
            />
            <Text
              position={[branchOffsetX + branchOuterRadius + gussetSize + 0.25, outerRadius + gussetSize * 0.4, 0.3]}
              fontSize={0.12}
              color="#0066cc"
              anchorX="left"
              anchorY="middle"
              outlineWidth={0.015}
              outlineColor="white"
              fontWeight="bold"
            >
              {`C: ${gussetSection}mm`}
            </Text>
          </>
        )}
      </group>
    </Center>
  );
}

const CameraTracker = ({
  onCameraChange,
  savedPosition,
  savedTarget
}: {
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void
  savedPosition?: [number, number, number]
  savedTarget?: [number, number, number]
}) => {
  const { camera, controls } = useThree();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const pendingSaveKeyRef = useRef<string>('');
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    log.debug('Tee CameraTracker useEffect', JSON.stringify({
      savedPosition,
      savedTarget,
      hasRestored: hasRestoredRef.current,
      hasControls: !!controls
    }));
    const hasValidPosition = savedPosition &&
      typeof savedPosition[0] === 'number' &&
      typeof savedPosition[1] === 'number' &&
      typeof savedPosition[2] === 'number';
    if (hasValidPosition && controls && !hasRestoredRef.current) {
      log.debug('Tee CameraTracker restoring camera position', JSON.stringify({
        position: savedPosition,
        target: savedTarget
      }));
      camera.position.set(savedPosition[0], savedPosition[1], savedPosition[2]);
      if (savedTarget && typeof savedTarget[0] === 'number' && typeof savedTarget[1] === 'number' && typeof savedTarget[2] === 'number') {
        const orbitControls = controls as any;
        if (orbitControls.target) {
          orbitControls.target.set(savedTarget[0], savedTarget[1], savedTarget[2]);
          orbitControls.update();
        }
      }
      hasRestoredRef.current = true;
      const restoredKey = `${savedPosition[0].toFixed(2)},${savedPosition[1].toFixed(2)},${savedPosition[2].toFixed(2)}`;
      lastSavedRef.current = restoredKey;
      pendingSaveKeyRef.current = '';
    }
  }, [camera, controls, savedPosition, savedTarget]);

  const frameCountRef = useRef(0);

  useFrame(() => {
    frameCountRef.current++;
    if (frameCountRef.current % 60 === 0) {
      log.debug('Tee CameraTracker useFrame check', JSON.stringify({
        hasOnCameraChange: !!onCameraChange,
        hasControls: !!controls,
        cameraPos: [camera.position.x.toFixed(2), camera.position.y.toFixed(2), camera.position.z.toFixed(2)],
        lastSaved: lastSavedRef.current
      }));
    }

    if (onCameraChange && controls) {
      const target = (controls as any).target;
      if (target) {
        const currentKey = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;

        const needsNewSave = currentKey !== lastSavedRef.current && currentKey !== pendingSaveKeyRef.current;

        if (needsNewSave) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }

          const posToSave = [camera.position.x, camera.position.y, camera.position.z] as [number, number, number];
          const targetToSave = [target.x, target.y, target.z] as [number, number, number];
          const keyToSave = currentKey;
          pendingSaveKeyRef.current = keyToSave;

          log.debug('Tee CameraTracker setting timeout for', keyToSave);

          saveTimeoutRef.current = setTimeout(() => {
            log.debug('Tee CameraTracker timeout fired, saving', JSON.stringify({
              position: posToSave,
              target: targetToSave,
              key: keyToSave
            }));
            lastSavedRef.current = keyToSave;
            pendingSaveKeyRef.current = '';
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

  const debouncedProps = useDebouncedProps(props, 100);

  // Handle escape key to close expanded modal
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  // Get dimensions using proper lookup tables
  const dims = getSabs719TeeDimensions(debouncedProps.nominalBore);
  const branchDims = debouncedProps.branchNominalBore ? getSabs719TeeDimensions(debouncedProps.branchNominalBore) : null;
  const od = getOuterDiameter(debouncedProps.nominalBore, debouncedProps.outerDiameter || dims?.outsideDiameterMm || 0);
  const wt = getWallThickness(debouncedProps.nominalBore, debouncedProps.wallThickness || 0);
  const id = od - (2 * wt);
  // Branch dimensions for reducing tees
  const branchOD = debouncedProps.branchNominalBore
    ? getOuterDiameter(debouncedProps.branchNominalBore, debouncedProps.branchOuterDiameter || branchDims?.outsideDiameterMm || 0)
    : od;
  const branchWT = debouncedProps.branchNominalBore ? getWallThickness(debouncedProps.branchNominalBore) : wt;
  const branchID = branchOD - (2 * branchWT);
  const teeHeight = getTeeHeight(debouncedProps.nominalBore, debouncedProps.teeType);
  const gussetSection = debouncedProps.teeType === 'gusset' ? getGussetSection(debouncedProps.nominalBore) : 0;
  // Get flange specs for display
  const { specs: runFlangeSpecs, isFromApi: runIsFromApi } = getFlangeSpecs(debouncedProps.nominalBore, debouncedProps.flangeSpecs);
  const { specs: branchFlangeSpecs, isFromApi: branchIsFromApi } = getFlangeSpecs(debouncedProps.branchNominalBore || debouncedProps.nominalBore, debouncedProps.flangeSpecs);
  const flangeStandardName = debouncedProps.flangeStandardName || 'SABS 1123';
  const isNonSabsStandard = !flangeStandardName.toLowerCase().includes('sabs') && !flangeStandardName.toLowerCase().includes('sans');
  const showRunFallbackWarning = !runIsFromApi && isNonSabsStandard;
  const showBranchFallbackWarning = !branchIsFromApi && isNonSabsStandard;
  const closureLength = debouncedProps.closureLengthMm ?? 150;
  const baseRunLengthMm = debouncedProps.runLength || od * 3;
  const runLengthMm = baseRunLengthMm + (debouncedProps.hasInletFlange ? closureLength : 0) + (debouncedProps.hasOutletFlange ? closureLength : 0);
  const branchHeightMm = teeHeight + (debouncedProps.hasBranchFlange ? closureLength : 0);
  const depthMm = od + ((debouncedProps.hasInletFlange || debouncedProps.hasOutletFlange) ? runFlangeSpecs.thickness : 0);
  const runExtent = (runLengthMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const heightExtent = (branchHeightMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const depthExtent = (depthMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const boundingRadius = Math.max(
    0.4,
    Math.sqrt(
      (runExtent / 2) ** 2 +
      (heightExtent / 2) ** 2 +
      (depthExtent / 2) ** 2
    )
  );
  const computeDistance = (fov: number) => {
    const fovRad = (fov * Math.PI) / 180;
    const dist = boundingRadius / Math.sin(fovRad / 2);
    return Math.min(Math.max(dist * 1.15, MIN_CAMERA_DISTANCE), MAX_CAMERA_DISTANCE);
  };
  const defaultCameraDistance = computeDistance(50);
  const expandedCameraDistance = computeDistance(45);
  const defaultCameraPosition = useMemo(
    () => [defaultCameraDistance, defaultCameraDistance * 0.8, defaultCameraDistance] as [number, number, number],
    [defaultCameraDistance]
  );
  const expandedCameraPosition = useMemo(
    () => [expandedCameraDistance, expandedCameraDistance * 0.85, expandedCameraDistance] as [number, number, number],
    [expandedCameraDistance]
  );
  const defaultControls = useMemo(
    () => ({
      min: Math.max(defaultCameraDistance * 0.4, 0.8),
      max: Math.min(defaultCameraDistance * 4, MAX_CAMERA_DISTANCE * 1.5)
    }),
    [defaultCameraDistance]
  );
  const expandedControls = useMemo(
    () => ({
      min: Math.max(expandedCameraDistance * 0.35, 0.8),
      max: Math.min(expandedCameraDistance * 4, MAX_CAMERA_DISTANCE * 2)
    }),
    [expandedCameraDistance]
  );

  // Hidden state
  if (isHidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border border-slate-200 px-3 py-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          3D Preview - SABS 719 {props.teeType === 'gusset' ? 'Gusset' : 'Short'} Tee ({props.nominalBore}NB)
        </span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-[10px] text-blue-600 bg-white px-2 py-1 rounded shadow-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Show Drawing
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] bg-slate-50 rounded-md border border-slate-200 overflow-hidden relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: defaultCameraPosition, fov: 50 }} style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} />
        <Environment preset="sunset" />
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
          SABS 719 {props.teeType === 'gusset' ? 'Gusset' : 'Short'} Tee
        </span>
      </div>

      {/* Pipe & Tee Info - top right */}
      <div className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md leading-snug border border-gray-200">
        <div className="font-bold text-blue-800 mb-0.5">RUN PIPE ({props.nominalBore}NB)</div>
        <div className="text-gray-900 font-medium">OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm</div>
        <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
        {props.branchNominalBore && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">BRANCH ({props.branchNominalBore}NB)</div>
            <div className="text-gray-900 font-medium">OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm</div>
            <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
          </>
        )}
        <div className="text-gray-700 mt-1">Height: {teeHeight}mm</div>
        {props.teeType === 'gusset' && (
          <div className="text-gray-700">Gusset: {gussetSection}mm</div>
        )}
        {/* Run Flange details */}
        {(props.hasInletFlange || props.hasOutletFlange) && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">RUN FLANGE</div>
            {showRunFallbackWarning && (
              <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                Data not available for {flangeStandardName} - showing SABS 1123 reference values
              </div>
            )}
            <div className="text-gray-900 font-medium">OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm</div>
            <div className="text-gray-700">Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm</div>
            <div className="text-gray-700">Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} × {runFlangeSpecs.boltLength}mm</div>
            <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
            <div className={showRunFallbackWarning ? "text-orange-600 font-medium text-[9px]" : "text-green-700 font-medium text-[9px]"}>
              {(() => {
                const designation = props.pressureClassDesignation || '';
                const flangeType = props.flangeTypeCode || '';
                const pressureMatch = designation.match(/^(\d+)/);
                const pressureValue = pressureMatch ? pressureMatch[1] : designation.replace(/\/\d+$/, '');
                return `${flangeStandardName} T${pressureValue}${flangeType}`;
              })()}
            </div>
          </>
        )}
        {/* Branch Flange details */}
        {props.hasBranchFlange && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">BRANCH FLANGE</div>
            {showBranchFallbackWarning && (
              <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                Data not available for {flangeStandardName} - showing SABS 1123 reference values
              </div>
            )}
            <div className="text-gray-900 font-medium">OD: {branchFlangeSpecs.flangeOD}mm | PCD: {branchFlangeSpecs.pcd}mm</div>
            <div className="text-gray-700">Holes: {branchFlangeSpecs.boltHoles} × Ø{branchFlangeSpecs.holeID}mm</div>
            <div className="text-gray-700">Bolts: {branchFlangeSpecs.boltHoles} × M{branchFlangeSpecs.boltSize} × {branchFlangeSpecs.boltLength}mm</div>
            <div className="text-gray-700">Thickness: {branchFlangeSpecs.thickness}mm</div>
            <div className={showBranchFallbackWarning ? "text-orange-600 font-medium text-[9px]" : "text-green-700 font-medium text-[9px]"}>
              {(() => {
                const designation = props.pressureClassDesignation || '';
                const flangeType = props.flangeTypeCode || '';
                const pressureMatch = designation.match(/^(\d+)/);
                const pressureValue = pressureMatch ? pressureMatch[1] : designation.replace(/\/\d+$/, '');
                return `${flangeStandardName} T${pressureValue}${flangeType}`;
              })()}
            </div>
          </>
        )}
      </div>

      {/* Notes Section - bottom left */}
      {props.selectedNotes && props.selectedNotes.length > 0 && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-slate-200 max-w-[300px] max-h-[120px] overflow-y-auto">
          <div className="font-bold text-slate-700 mb-1">NOTES</div>
          <ol className="list-decimal list-inside space-y-0.5">
            {props.selectedNotes.map((note, i) => (
              <li key={i} className="text-gray-700 leading-tight">{note}</li>
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          Expand
        </button>
        <div className="text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded shadow-sm">
          Drag to Rotate
        </div>
        <button
          onClick={() => setIsHidden(true)}
          className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Expanded Canvas */}
            <Canvas shadows dpr={[1, 2]} camera={{ position: expandedCameraPosition, fov: 45 }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} />
              <Environment preset="sunset" />
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
              <div className="text-gray-900 font-medium">OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm</div>
              <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
              {props.branchNominalBore && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">BRANCH ({props.branchNominalBore}NB)</div>
                  <div className="text-gray-900 font-medium">OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm</div>
                  <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
                </>
              )}
              <div className="text-gray-700 mt-2">Height: {teeHeight}mm</div>
              {props.teeType === 'gusset' && (
                <div className="text-gray-700">Gusset: {gussetSection}mm</div>
              )}
              {(props.hasInletFlange || props.hasOutletFlange) && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">RUN FLANGE</div>
                  {showRunFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm</div>
                  <div className="text-gray-700">Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm</div>
                  <div className="text-gray-700">Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} × {runFlangeSpecs.boltLength}mm</div>
                  <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
                  <div className={showRunFallbackWarning ? "text-orange-600 font-medium" : "text-green-700 font-medium"}>
                    {(() => {
                      const designation = props.pressureClassDesignation || '';
                      const flangeType = props.flangeTypeCode || '';
                      const pressureMatch = designation.match(/^(\d+)/);
                      const pressureValue = pressureMatch ? pressureMatch[1] : designation.replace(/\/\d+$/, '');
                      return `${flangeStandardName} T${pressureValue}${flangeType}`;
                    })()}
                  </div>
                </>
              )}
              {props.hasBranchFlange && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">BRANCH FLANGE</div>
                  {showBranchFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">OD: {branchFlangeSpecs.flangeOD}mm | PCD: {branchFlangeSpecs.pcd}mm</div>
                  <div className="text-gray-700">Holes: {branchFlangeSpecs.boltHoles} × Ø{branchFlangeSpecs.holeID}mm</div>
                  <div className="text-gray-700">Bolts: {branchFlangeSpecs.boltHoles} × M{branchFlangeSpecs.boltSize} × {branchFlangeSpecs.boltLength}mm</div>
                  <div className="text-gray-700">Thickness: {branchFlangeSpecs.thickness}mm</div>
                  <div className={showBranchFallbackWarning ? "text-orange-600 font-medium" : "text-green-700 font-medium"}>
                    {(() => {
                      const designation = props.pressureClassDesignation || '';
                      const flangeType = props.flangeTypeCode || '';
                      const pressureMatch = designation.match(/^(\d+)/);
                      const pressureValue = pressureMatch ? pressureMatch[1] : designation.replace(/\/\d+$/, '');
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
