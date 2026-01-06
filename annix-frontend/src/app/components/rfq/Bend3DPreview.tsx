"use client";

import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Environment, Line, ContactShadows, Text } from "@react-three/drei";
import * as THREE from "three";

interface StubData {
  nominalBoreMm?: number;
  length?: number;
  locationFromFlange?: number;
  hasFlangeOverride?: boolean;
}

interface Bend3DPreviewProps {
  nominalBore: number;
  outerDiameter: number;
  wallThickness: number;
  bendAngle: number;
  bendType: string;
  tangent1?: number;
  tangent2?: number;
  materialName?: string;
  schedule?: string;
  numberOfSegments?: number;
  isSegmented?: boolean;
  stubs?: StubData[];
  numberOfStubs?: number;
  flangeConfig?: string; // PE, FOE, FBE, FOE_LF, FOE_RF, 2X_RF
  closureLengthMm?: number; // Closure length for L/F configurations
  // Blank flange options
  addBlankFlange?: boolean;
  blankFlangeCount?: number;
  blankFlangePositions?: string[]; // ['inlet', 'outlet']
}

// SABS 719 ERW Pipe Wall Thickness Table (Class B - Standard)
// Based on SABS 719:2008 standard
const SABS_719_WALL_THICKNESS: { [key: number]: number } = {
  200: 5.2,
  250: 5.2,
  300: 6.4,
  350: 6.4,
  400: 6.4,
  450: 6.4,
  500: 6.4,
  550: 6.4,
  600: 6.4,
  650: 8.0,
  700: 8.0,
  750: 8.0,
  800: 8.0,
  850: 9.5,
  900: 9.5,
  1000: 9.5,
  1050: 9.5,
  1200: 12.7,
};

// ASTM/ASME Schedule-based Wall Thickness Table
// Based on ASME B36.10M
const SCHEDULE_WALL_THICKNESS: { [key: number]: { [key: string]: number } } = {
  200: { '10': 3.76, '20': 6.35, 'STD': 8.18, '40': 8.18, '60': 10.31, '80': 12.70, 'XS': 12.70 },
  250: { '10': 4.19, '20': 6.35, 'STD': 9.27, '30': 7.80, '40': 9.27, '60': 12.70, '80': 15.09, 'XS': 12.70 },
  300: { '10': 4.57, '20': 6.35, 'STD': 9.53, '30': 8.38, '40': 10.31, '60': 14.27, '80': 17.48, 'XS': 12.70 },
  350: { '10': 4.78, '20': 7.92, 'STD': 9.53, '30': 9.53, '40': 11.13, '60': 15.09, '80': 19.05, 'XS': 12.70 },
  400: { '10': 4.78, '20': 7.92, 'STD': 9.53, '30': 9.53, '40': 12.70, '60': 16.66, '80': 21.44, 'XS': 12.70 },
  450: { '10': 4.78, '20': 7.92, 'STD': 9.53, '30': 11.13, '40': 14.27, '60': 19.05, '80': 23.83, 'XS': 12.70 },
  500: { '10': 6.35, '20': 9.53, 'STD': 9.53, '30': 12.70, '40': 15.09, '60': 20.62, '80': 26.19, 'XS': 12.70 },
  600: { '10': 6.35, '20': 9.53, 'STD': 9.53, '30': 14.27, '40': 17.48, '60': 24.61, '80': 30.96, 'XS': 12.70 },
};

// Get wall thickness based on steel specification, NB, and schedule
const getWallThickness = (nb: number, schedule: string = "STD", materialName: string = "", currentWt: number = 0): number => {
  // If a valid wall thickness is already provided, use it
  if (currentWt && currentWt > 1) return currentWt;

  const material = materialName.toLowerCase();
  const sched = schedule.toUpperCase().replace(/SCH\s*/i, '').trim();

  // Check if SABS 719 ERW pipe
  if (material.includes('sabs 719') || material.includes('erw') || material.includes('719')) {
    // Use SABS 719 wall thickness table
    const sizes = Object.keys(SABS_719_WALL_THICKNESS).map(Number).sort((a, b) => a - b);
    let closestSize = sizes[0];
    for (const size of sizes) {
      if (size <= nb) closestSize = size;
      else break;
    }
    return SABS_719_WALL_THICKNESS[closestSize] || 6.4; // Default to 6.4mm for SABS 719
  }

  // For ASTM/ASME pipes, use schedule-based lookup
  if (SCHEDULE_WALL_THICKNESS[nb] && SCHEDULE_WALL_THICKNESS[nb][sched]) {
    return SCHEDULE_WALL_THICKNESS[nb][sched];
  }

  // Fallback estimation based on schedule
  const isSch80 = sched.includes("80") || sched.includes("XS");
  const isSch160 = sched.includes("160") || sched.includes("XXS");
  let factor = 0.055; // ~STD/Sch40
  if (isSch80) factor = 0.085;
  if (isSch160) factor = 0.12;
  return Math.max(2, nb * factor);
};

// Legacy function for backward compatibility
const estimateWallThickness = (nb: number, schedule: string = "40", currentWt: number) => {
  return getWallThickness(nb, schedule, "", currentWt);
};

const getMaterialProps = (name: string = "", isSegmented: boolean = false) => {
  const n = name.toLowerCase();
  if (n.includes("sabs 62") || n.includes("galv")) return { color: "#C0C0C0", metalness: 0.4, roughness: 0.5 };
  if (n.includes("stainless")) return { color: "#E0E0E0", metalness: 0.9, roughness: 0.15 };
  if (isSegmented || n.includes("sabs 719") || n.includes("erw")) return { color: "#228B22", metalness: 0.4, roughness: 0.6 };
  return { color: "#4A4A4A", metalness: 0.6, roughness: 0.7 };
};

// Standard flange dimensions based on SABS 1123 Table 1000/4 (PN16) - Slip-on flanges
const getFlangeSpecs = (nominalBore: number) => {
  const flangeData: { [key: number]: { flangeOD: number; pcd: number; boltHoles: number; holeID: number; thickness: number } } = {
    15: { flangeOD: 95, pcd: 65, boltHoles: 4, holeID: 14, thickness: 14 },
    20: { flangeOD: 105, pcd: 75, boltHoles: 4, holeID: 14, thickness: 14 },
    25: { flangeOD: 115, pcd: 85, boltHoles: 4, holeID: 14, thickness: 14 },
    32: { flangeOD: 140, pcd: 100, boltHoles: 4, holeID: 18, thickness: 16 },
    40: { flangeOD: 150, pcd: 110, boltHoles: 4, holeID: 18, thickness: 16 },
    50: { flangeOD: 165, pcd: 125, boltHoles: 4, holeID: 18, thickness: 18 },
    65: { flangeOD: 185, pcd: 145, boltHoles: 4, holeID: 18, thickness: 18 },
    80: { flangeOD: 200, pcd: 160, boltHoles: 8, holeID: 18, thickness: 18 },
    100: { flangeOD: 220, pcd: 180, boltHoles: 8, holeID: 18, thickness: 18 },
    125: { flangeOD: 250, pcd: 210, boltHoles: 8, holeID: 18, thickness: 20 },
    150: { flangeOD: 285, pcd: 240, boltHoles: 8, holeID: 22, thickness: 20 },
    200: { flangeOD: 340, pcd: 295, boltHoles: 12, holeID: 22, thickness: 22 },
    250: { flangeOD: 405, pcd: 355, boltHoles: 12, holeID: 26, thickness: 24 },
    300: { flangeOD: 460, pcd: 410, boltHoles: 12, holeID: 26, thickness: 24 },
    350: { flangeOD: 520, pcd: 470, boltHoles: 16, holeID: 26, thickness: 26 },
    400: { flangeOD: 580, pcd: 525, boltHoles: 16, holeID: 30, thickness: 28 },
    450: { flangeOD: 640, pcd: 585, boltHoles: 20, holeID: 30, thickness: 28 },
    500: { flangeOD: 670, pcd: 620, boltHoles: 20, holeID: 26, thickness: 32 },
    600: { flangeOD: 780, pcd: 725, boltHoles: 20, holeID: 30, thickness: 32 },
  };

  // Find closest match
  const sizes = Object.keys(flangeData).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nominalBore) closestSize = size;
    else break;
  }

  return flangeData[closestSize] || flangeData[50];
};

class ArcCurve3 extends THREE.Curve<THREE.Vector3> {
  radius: number; startAngle: number; endAngle: number;
  constructor(radius: number, startAngle: number, endAngle: number) {
    super(); this.radius = radius; this.startAngle = startAngle; this.endAngle = endAngle;
  }
  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    const angle = this.startAngle + t * (this.endAngle - this.startAngle);
    return optionalTarget.set(this.radius * Math.cos(angle), this.radius * Math.sin(angle), 0);
  }
}

const createRingShape = (outerRadius: number, innerRadius: number) => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
};

// Flange component with bolt holes
const Flange = ({ position, rotation, outerRadius, pipeRadius, nominalBore, material }: any) => {
  // Flange dimensions based on pipe size
  const flangeRadius = outerRadius * 2.2;
  const flangeThickness = outerRadius * 0.4;
  const boltCircleRadius = outerRadius * 1.6;
  const boltHoleRadius = outerRadius * 0.15;

  // Number of bolt holes based on nominal bore
  const getBoltCount = (nb: number) => {
    if (nb <= 25) return 4;
    if (nb <= 50) return 4;
    if (nb <= 80) return 4;
    if (nb <= 100) return 8;
    if (nb <= 150) return 8;
    if (nb <= 200) return 8;
    if (nb <= 250) return 12;
    if (nb <= 300) return 12;
    if (nb <= 350) return 12;
    if (nb <= 400) return 16;
    if (nb <= 450) return 16;
    if (nb <= 500) return 20;
    if (nb <= 600) return 20;
    return 24;
  };

  const boltCount = getBoltCount(nominalBore);
  const boltHoles = [];

  for (let i = 0; i < boltCount; i++) {
    const angle = (i / boltCount) * Math.PI * 2;
    const x = Math.cos(angle) * boltCircleRadius;
    const y = Math.sin(angle) * boltCircleRadius;
    boltHoles.push({ x, y, angle });
  }

  // Center bore radius - slightly larger than pipe OD for slip-on flange
  const centerBoreRadius = outerRadius * 1.05;

  return (
    <group position={position} rotation={rotation}>
      {/* Flange body - outer cylinder */}
      <mesh>
        <cylinderGeometry args={[flangeRadius, flangeRadius, flangeThickness, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>

      {/* Center bore - inner cylinder (cut through flange) */}
      <mesh>
        <cylinderGeometry args={[centerBoreRadius, centerBoreRadius, flangeThickness + 0.02, 32]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>

      {/* Raised face ring on outer face */}
      <mesh position={[0, flangeThickness / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[pipeRadius * 1.1, outerRadius * 1.4, 32]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Top annular face of flange (ring showing wall thickness) */}
      <mesh position={[0, flangeThickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[centerBoreRadius, flangeRadius, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>

      {/* Bottom annular face of flange (ring showing wall thickness) */}
      <mesh position={[0, -flangeThickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[centerBoreRadius, flangeRadius, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>

      {/* Bolt holes - visible circles on flange face */}
      {boltHoles.map((hole, i) => (
        <group key={i} position={[hole.x, 0, hole.y]}>
          {/* Hole through flange - dark cylinder */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[boltHoleRadius, boltHoleRadius, flangeThickness * 1.5, 16]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Visible hole circle on top face */}
          <mesh position={[0, flangeThickness / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[boltHoleRadius * 1.2, 16]} />
            <meshStandardMaterial color="#000" />
          </mesh>
          {/* Visible hole circle on bottom face */}
          <mesh position={[0, -flangeThickness / 2 - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[boltHoleRadius * 1.2, 16]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        </group>
      ))}

    </group>
  );
};

// Blank Flange component (solid disc with bolt holes, no center bore)
const BlankFlange = ({ position, rotation, outerRadius, nominalBore }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  outerRadius: number;
  nominalBore: number;
}) => {
  const flangeRadius = outerRadius * 2.2;
  const flangeThickness = outerRadius * 0.4;
  const boltCircleRadius = outerRadius * 1.6;
  const boltHoleRadius = outerRadius * 0.15;

  const getBoltCount = (nb: number) => {
    if (nb <= 25) return 4;
    if (nb <= 50) return 4;
    if (nb <= 80) return 4;
    if (nb <= 100) return 8;
    if (nb <= 150) return 8;
    if (nb <= 200) return 8;
    if (nb <= 250) return 12;
    if (nb <= 300) return 12;
    if (nb <= 350) return 12;
    if (nb <= 400) return 16;
    if (nb <= 450) return 16;
    if (nb <= 500) return 20;
    if (nb <= 600) return 20;
    return 24;
  };

  const boltCount = getBoltCount(nominalBore);
  const boltHoles = [];

  for (let i = 0; i < boltCount; i++) {
    const angle = (i / boltCount) * Math.PI * 2;
    const x = Math.cos(angle) * boltCircleRadius;
    const y = Math.sin(angle) * boltCircleRadius;
    boltHoles.push({ x, y, angle });
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Blank flange face - solid cylinder (no center hole) */}
      <mesh>
        <cylinderGeometry args={[flangeRadius, flangeRadius, flangeThickness, 32]} />
        <meshStandardMaterial color="#cc3300" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Bolt holes */}
      {boltHoles.map((hole, i) => (
        <group key={i} position={[hole.x, 0, hole.y]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[boltHoleRadius, boltHoleRadius, flangeThickness * 1.5, 16]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, flangeThickness / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[boltHoleRadius * 1.2, 16]} />
            <meshStandardMaterial color="#000" />
          </mesh>
          <mesh position={[0, -flangeThickness / 2 - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[boltHoleRadius * 1.2, 16]} />
            <meshStandardMaterial color="#000" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Retaining ring component for rotating flanges
// This ring is welded to the pipe end to prevent the rotating flange from sliding off
const RetainingRing = ({
  position,
  rotation,
  pipeOuterRadius,
  pipeInnerRadius,
  wallThickness,
  flangeRadius
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  pipeOuterRadius: number;
  pipeInnerRadius: number;
  wallThickness: number;
  flangeRadius: number;
}) => {
  // Ring OD should be larger than pipe OD but smaller than the flange
  // to not interfere with bolt holes
  const ringOuterRadius = Math.min(
    pipeOuterRadius * 1.15, // 15% larger than pipe OD
    flangeRadius * 0.7 // But must clear the bolt holes
  );
  const ringInnerRadius = pipeInnerRadius; // Same ID as pipe (same wall thickness)
  const ringThickness = wallThickness; // Same thickness as pipe wall

  return (
    <group position={position} rotation={rotation}>
      {/* Ring body */}
      <mesh>
        <cylinderGeometry args={[ringOuterRadius, ringOuterRadius, ringThickness, 32]} />
        <meshStandardMaterial color="#606060" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Inner bore of ring */}
      <mesh>
        <cylinderGeometry args={[ringInnerRadius, ringInnerRadius, ringThickness + 0.01, 32]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
};

// Stub pipe component - a small pipe coming out perpendicular to the main pipe
const StubPipe = ({
  position,
  rotation,
  length,
  outerRadius,
  innerRadius,
  material,
  stubNB,
  hasFlange = false
}: any) => {
  if (!length || length <= 0) return null;

  const scaleFactor = 100;

  // Stub dimensions based on NB
  const stubNBValue = stubNB || 25;
  const stubOD = (stubNBValue * 1.1) / scaleFactor;
  const stubOuterR = stubOD / 2;
  const stubInnerR = stubOuterR * 0.85;
  const stubLength = length / scaleFactor;

  // Get proper flange specs for stub
  const stubFlangeSpecs = getFlangeSpecs(stubNBValue);
  const stubFlangeRadius = (stubFlangeSpecs.flangeOD / 2) / scaleFactor;
  const stubPcdRadius = (stubFlangeSpecs.pcd / 2) / scaleFactor;
  const stubBoltHoleRadius = (stubFlangeSpecs.holeID / 2) / scaleFactor;
  const stubFlangeThickness = stubFlangeSpecs.thickness / scaleFactor;

  return (
    <group position={position} rotation={rotation}>
      {/* Stub pipe body */}
      <mesh>
        <cylinderGeometry args={[stubOuterR, stubOuterR, stubLength, 24, 1, false]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {/* Inner bore */}
      <mesh>
        <cylinderGeometry args={[stubInnerR, stubInnerR, stubLength - 0.02, 24, 1, false]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
      {/* Weld ring at base (connection to main pipe) */}
      <mesh position={[0, -stubLength / 2 + 0.01, 0]}>
        <torusGeometry args={[stubOuterR * 1.05, stubOuterR * 0.1, 8, 24]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
      </mesh>
      {/* Stub flange at end - using proper SABS 1123 specs */}
      {hasFlange && (
        <group position={[0, stubLength / 2 + stubFlangeThickness / 2, 0]}>
          {/* Flange body - outer cylinder */}
          <mesh>
            <cylinderGeometry args={[stubFlangeRadius, stubFlangeRadius, stubFlangeThickness, 32]} />
            <meshStandardMaterial {...material} />
          </mesh>
          {/* Center bore - inner cylinder (slip-on flange hole) */}
          <mesh>
            <cylinderGeometry args={[stubOuterR * 1.05, stubOuterR * 1.05, stubFlangeThickness + 0.01, 32]} />
            <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
          </mesh>
          {/* Top annular face */}
          <mesh position={[0, stubFlangeThickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[stubOuterR * 1.05, stubFlangeRadius, 32]} />
            <meshStandardMaterial {...material} />
          </mesh>
          {/* Bottom annular face */}
          <mesh position={[0, -stubFlangeThickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[stubOuterR * 1.05, stubFlangeRadius, 32]} />
            <meshStandardMaterial {...material} />
          </mesh>
          {/* Raised face */}
          <mesh position={[0, stubFlangeThickness / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[stubInnerR * 1.1, stubOuterR * 1.3, 32]} />
            <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Bolt holes - correct number based on NB */}
          {Array.from({ length: stubFlangeSpecs.boltHoles }).map((_, i) => {
            const angle = (i / stubFlangeSpecs.boltHoles) * Math.PI * 2;
            const boltX = Math.cos(angle) * stubPcdRadius;
            const boltZ = Math.sin(angle) * stubPcdRadius;
            return (
              <group key={i}>
                {/* Hole through flange */}
                <mesh position={[boltX, 0, boltZ]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[stubBoltHoleRadius, stubBoltHoleRadius, stubFlangeThickness * 1.2, 12]} />
                  <meshStandardMaterial color="#111" />
                </mesh>
                {/* Hole circle on face */}
                <mesh position={[boltX, stubFlangeThickness / 2 + 0.01, boltZ]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[stubBoltHoleRadius * 1.1, 12]} />
                  <meshStandardMaterial color="#000" />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

// Pulled Bend Arc (SABS 62)
const HollowBendArc = ({ bendRadius, outerRadius, innerRadius, angleRad, material }: any) => {
  const geometry = useMemo(() => {
    if (!bendRadius || bendRadius <= 0) return null;
    const path = new ArcCurve3(bendRadius, 0, angleRad);
    const shape = createRingShape(outerRadius, innerRadius);
    return new THREE.ExtrudeGeometry(shape, { steps: 32, curveSegments: 32, extrudePath: path, bevelEnabled: false });
  }, [bendRadius, outerRadius, innerRadius, angleRad]);
  if (!geometry) return null;
  return <mesh geometry={geometry}><meshStandardMaterial {...material} /></mesh>;
};

// Straight vertical tangent pipe (for inlet - goes DOWN)
const VerticalTangentPipe = ({ length, outerRadius, innerRadius, material, startX, startY }: any) => {
  if (!length || length < 0.01) return null;

  // Pipe center is at startY - length/2 (going down from startY)
  const centerY = startY - length / 2;

  return (
    <group position={[startX, centerY, 0]}>
      {/* Outer cylinder - solid closed ends */}
      <mesh>
        <cylinderGeometry args={[outerRadius, outerRadius, length, 32, 1, false]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {/* Inner bore - slightly shorter to not poke through */}
      <mesh>
        <cylinderGeometry args={[innerRadius, innerRadius, length - 0.02, 32, 1, false]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
      {/* End cap rings to show pipe wall thickness */}
      <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
};

// Straight horizontal tangent pipe (for outlet - goes in tangent direction)
const HorizontalTangentPipe = ({ length, outerRadius, innerRadius, material, startX, startY, angleRad }: any) => {
  if (!length || length < 0.01) return null;

  // For outlet tangent: perpendicular to radius at angleRad
  // Direction: (-sin(angleRad), cos(angleRad))
  const dirX = -Math.sin(angleRad);
  const dirY = Math.cos(angleRad);

  // Pipe center is at start + direction * length/2
  const centerX = startX + dirX * length / 2;
  const centerY = startY + dirY * length / 2;

  // Rotation: cylinder default is Y-axis (0,1,0)
  // To rotate to direction (-sin(angleRad), cos(angleRad), 0), rotate Z by angleRad
  const rotZ = angleRad;

  return (
    <group position={[centerX, centerY, 0]} rotation={[0, 0, rotZ]}>
      {/* Outer cylinder - solid closed ends */}
      <mesh>
        <cylinderGeometry args={[outerRadius, outerRadius, length, 32, 1, false]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {/* Inner bore - slightly shorter to not poke through */}
      <mesh>
        <cylinderGeometry args={[innerRadius, innerRadius, length - 0.02, 32, 1, false]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
      {/* End cap rings to show pipe wall thickness */}
      <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRadius, outerRadius, 32]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
};

// Mitered pipe segment for segmented bends
const MiteredSegment = ({ position, tangentAngle, length, outerRadius, innerRadius, miterAngle, material }: any) => {
  const tangentDir = new THREE.Vector3(-Math.sin(tangentAngle), Math.cos(tangentAngle), 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangentDir);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <cylinderGeometry args={[outerRadius, outerRadius, length, 24, 1, true]} />
        <meshStandardMaterial {...material} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[innerRadius, innerRadius, length, 24, 1, true]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
      <group position={[0, length/2, 0]} rotation={[miterAngle, 0, 0]}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[innerRadius, outerRadius, 24]} />
          <meshStandardMaterial {...material} />
        </mesh>
      </group>
      <group position={[0, -length/2, 0]} rotation={[-miterAngle, 0, 0]}>
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[innerRadius, outerRadius, 24]} />
          <meshStandardMaterial {...material} />
        </mesh>
      </group>
    </group>
  );
};

// Weld ring at miter joints
const WeldRing = ({ position, tangentAngle, outerRadius }: any) => {
  const tangentDir = new THREE.Vector3(-Math.sin(tangentAngle), Math.cos(tangentAngle), 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangentDir);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <torusGeometry args={[outerRadius * 1.01, outerRadius * 0.07, 8, 32]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.9} />
      </mesh>
    </group>
  );
};

// SABS 719 Segmented Bend
const SegmentedBend = ({
  bendRadius,
  outerRadius,
  innerRadius,
  angleRad,
  numberOfSegments,
  material
}: any) => {
  const { segments, welds, miterAngle } = useMemo(() => {
    const numSegs = Math.max(2, numberOfSegments || 2);
    // For n segments, divide the total angle by n to get each segment's arc span
    const segmentArcAngle = angleRad / numSegs;
    // Miter angle is half the angle change at each joint
    const miter = segmentArcAngle / 2;

    const segs: Array<{ position: THREE.Vector3; tangentAngle: number; length: number }> = [];
    const weldList: Array<{ position: THREE.Vector3; tangentAngle: number }> = [];

    for (let i = 0; i < numSegs; i++) {
      // Each segment spans from i*segmentArcAngle to (i+1)*segmentArcAngle
      const startAngle = i * segmentArcAngle;
      const endAngle = (i + 1) * segmentArcAngle;
      const midAngle = (startAngle + endAngle) / 2;

      const posX = bendRadius * Math.cos(midAngle);
      const posY = bendRadius * Math.sin(midAngle);
      // Segment length based on the arc span
      const halfLen = bendRadius * Math.tan(segmentArcAngle / 2);

      segs.push({
        position: new THREE.Vector3(posX, posY, 0),
        tangentAngle: midAngle,
        length: halfLen * 2
      });

      // Add weld ring between segments (not after the last one)
      if (i < numSegs - 1) {
        const weldAngle = (i + 1) * segmentArcAngle;
        weldList.push({
          position: new THREE.Vector3(bendRadius * Math.cos(weldAngle), bendRadius * Math.sin(weldAngle), 0),
          tangentAngle: weldAngle
        });
      }
    }

    return { segments: segs, welds: weldList, miterAngle: miter };
  }, [bendRadius, angleRad, numberOfSegments]);

  return (
    <group>
      {segments.map((seg, i) => (
        <MiteredSegment
          key={i}
          position={seg.position}
          tangentAngle={seg.tangentAngle}
          length={seg.length}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          miterAngle={miterAngle}
          material={material}
        />
      ))}
      {welds.map((weld, i) => (
        <WeldRing
          key={`weld-${i}`}
          position={weld.position}
          tangentAngle={weld.tangentAngle}
          outerRadius={outerRadius}
        />
      ))}
    </group>
  );
};

const BendScene = ({
  nominalBore, outerDiameter, wallThickness, bendAngle, bendType,
  tangent1 = 0, tangent2 = 0, materialName, schedule = "40",
  numberOfSegments = 0, isSegmented = false, stubs, numberOfStubs = 0,
  flangeConfig = 'PE', closureLengthMm = 0,
  addBlankFlange = false, blankFlangePositions = []
}: Bend3DPreviewProps) => {
  const scaleFactor = 100;

  // Safe stubs array
  const safeStubs = stubs || [];
  const stub1 = safeStubs[0] || null;
  const stub2 = safeStubs[1] || null;

  // Determine which flanges to show based on config
  // FOE = Flanged One End (fixed flange at inlet/bottom)
  // FBE = Flanged Both Ends
  // PE = Plain End (no flanges)
  // FOE_LF = Fixed flange at bottom (inlet), Loose flange at top (outlet) with closure extension
  // LF_BE = Loose flanges both ends (both with closure extensions, same length)
  const configUpper = (flangeConfig || 'PE').toUpperCase();

  // For FOE_LF: Fixed flange at bottom (inlet), Loose flange at top (outlet)
  // For LF_BE: Loose flanges at both ends with same closure length
  // For FOE: Only one fixed flange at inlet (bottom)
  // For FBE: Fixed flanges at both ends
  const isLooseFlangeOutlet = configUpper === 'FOE_LF' || configUpper === 'LF_BE';
  const isLooseFlangeInlet = configUpper === 'LF_BE';
  // Rotating flange detection - FOE_RF has rotating at outlet, 2X_RF has rotating at both ends
  const isRotatingFlangeOutlet = configUpper === 'FOE_RF' || configUpper === '2X_RF';
  const isRotatingFlangeInlet = configUpper === '2X_RF';
  const showInletFlange = ['FOE', 'FBE', 'FOE_LF', 'LF_BE', 'FOE_RF', '2X_RF'].includes(configUpper); // Flange at bottom (inlet)
  const showOutletFlange = ['FBE', 'FOE_LF', 'LF_BE', 'FOE_RF', '2X_RF'].includes(configUpper); // Flange at top (outlet)

  // Debug logging
  console.log('BendScene:', { flangeConfig, showOutletFlange, showInletFlange, isLooseFlangeOutlet, isLooseFlangeInlet, closureLengthMm, numberOfStubs, stubs: safeStubs });

  const isSABS719 = Boolean(isSegmented ||
    materialName?.toLowerCase().includes("sabs 719") ||
    materialName?.toLowerCase().includes("erw") ||
    (numberOfSegments && numberOfSegments >= 2));

  const nb = (nominalBore || 50) / scaleFactor;
  const calculatedWt = getWallThickness(nominalBore, schedule || 'STD', materialName || '', wallThickness || 0);
  const odRaw = outerDiameter || (nominalBore * 1.1) || 60;
  const od = odRaw / scaleFactor;
  const wt = calculatedWt / scaleFactor;
  const idRaw = odRaw - 2 * calculatedWt;

  const outerRadius = od / 2;
  const innerRadius = Math.max(0.01, (od - 2 * wt) / 2);
  const angleRad = ((bendAngle || 90) * Math.PI) / 180;

  let multiplier = 1.5;
  const bt = (bendType || "").toLowerCase();
  if (bt.includes("short") || bt.includes("elbow")) multiplier = 1;
  else if (bt.includes("medium") || bt.includes("1.5")) multiplier = 1.5;
  else if (bt.includes("long") || bt.includes("2d")) multiplier = 2;
  else if (bt.includes("3d")) multiplier = 3;
  else if (bt.includes("5d")) multiplier = 5;

  const bendRadius = Math.max(nb * multiplier, outerRadius + 0.05);
  const matProps = getMaterialProps(materialName, isSABS719);

  // Scale tangent lengths (mm to scene units)
  // Swap so longer tangent is always horizontal (outlet/top), shorter is vertical (inlet/bottom)
  const rawT1 = (tangent1 || 0) / scaleFactor;
  const rawT2 = (tangent2 || 0) / scaleFactor;
  const verticalTangent = Math.min(rawT1, rawT2); // Shorter one goes vertical (down)
  const horizontalTangent = Math.max(rawT1, rawT2); // Longer one goes horizontal (top)
  const verticalLabel = rawT1 <= rawT2 ? tangent1 : tangent2;
  const horizontalLabel = rawT1 > rawT2 ? tangent1 : tangent2;

  // Inlet position (start of bend)
  const inletX = bendRadius;
  const inletY = 0;

  // Outlet position (end of bend)
  const outletX = bendRadius * Math.cos(angleRad);
  const outletY = bendRadius * Math.sin(angleRad);

  return (
    <Center>
      <group>
        {/* The bend itself */}
        {isSABS719 && numberOfSegments >= 2 ? (
          <SegmentedBend
            bendRadius={bendRadius}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            angleRad={angleRad}
            numberOfSegments={numberOfSegments}
            material={matProps}
          />
        ) : (
          <HollowBendArc
            bendRadius={bendRadius}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            angleRad={angleRad}
            material={matProps}
          />
        )}

        {/* Vertical tangent (shorter): Straight DOWN from inlet */}
        {verticalTangent > 0 && (
          <>
            <VerticalTangentPipe
              length={verticalTangent}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              material={matProps}
              startX={inletX}
              startY={inletY}
            />
            {/* Buttweld ring at tangent-to-bend connection - perpendicular to vertical pipe */}
            <WeldRing
              position={new THREE.Vector3(inletX, inletY, 0)}
              tangentAngle={0}
              outerRadius={outerRadius}
            />
          </>
        )}

        {/* Horizontal tangent (longer): Straight out from outlet */}
        {horizontalTangent > 0 && (
          <>
            <HorizontalTangentPipe
              length={horizontalTangent}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              material={matProps}
              startX={outletX}
              startY={outletY}
              angleRad={angleRad}
            />
            {/* Buttweld ring at tangent-to-bend connection - perpendicular to angled pipe */}
            <WeldRing
              position={new THREE.Vector3(outletX, outletY, 0)}
              tangentAngle={angleRad}
              outerRadius={outerRadius}
            />
          </>
        )}

        {/* Outlet flange - at end of horizontal tangent, or at bend outlet if no tangent */}
        {showOutletFlange && (() => {
          // Calculate pipe end position at end of horizontal tangent (or bend outlet if no tangent)
          const pipeEndX = horizontalTangent > 0
            ? outletX + (-Math.sin(angleRad)) * horizontalTangent
            : outletX;
          const pipeEndY = horizontalTangent > 0
            ? outletY + Math.cos(angleRad) * horizontalTangent
            : outletY;

          // Direction for horizontal extension (perpendicular to outlet angle)
          const dirX = -Math.sin(angleRad);
          const dirY = Math.cos(angleRad);

          // Flange thickness for offset calculations
          const flangeThickness = outerRadius * 0.4;

          // Closure length in scene units
          const closureLength = (closureLengthMm || 150) / scaleFactor;

          // 100mm gap in scene units
          const gapLength = 100 / scaleFactor;

          return (
            <>
              {/* For loose flanges: Closure piece first, then 100mm gap, then flange floating */}
              {isLooseFlangeOutlet && closureLengthMm > 0 ? (
                <>
                  {/* Closure piece (attached to pipe end) */}
                  <group
                    position={[
                      pipeEndX + dirX * (closureLength / 2),
                      pipeEndY + dirY * (closureLength / 2),
                      0
                    ]}
                    rotation={[0, 0, angleRad]}
                  >
                    {/* Outer pipe cylinder */}
                    <mesh>
                      <cylinderGeometry args={[outerRadius, outerRadius, closureLength, 32, 1, false]} />
                      <meshStandardMaterial {...matProps} />
                    </mesh>
                    {/* Inner bore */}
                    <mesh>
                      <cylinderGeometry args={[innerRadius, innerRadius, closureLength - 0.02, 32, 1, false]} />
                      <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
                    </mesh>
                    {/* End cap ring to show pipe wall thickness */}
                    <mesh position={[0, closureLength / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[innerRadius, outerRadius, 32]} />
                      <meshStandardMaterial {...matProps} />
                    </mesh>
                  </group>

                  {/* Loose flange positioned 100mm after closure piece */}
                  <Flange
                    position={[
                      pipeEndX + dirX * (closureLength + gapLength),
                      pipeEndY + dirY * (closureLength + gapLength),
                      0
                    ]}
                    rotation={[0, 0, angleRad]}
                    outerRadius={outerRadius}
                    pipeRadius={innerRadius}
                    nominalBore={nominalBore}
                    material={matProps}
                  />

                  {/* L/F Label next to the closure piece */}
                  <Text
                    position={[
                      pipeEndX + dirX * (closureLength / 2) - dirY * (outerRadius * 2.5 + 0.3),
                      pipeEndY + dirY * (closureLength / 2) + dirX * (outerRadius * 2.5 + 0.3),
                      0
                    ]}
                    fontSize={0.2}
                    color="#2563eb"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="white"
                    fontWeight="bold"
                  >
                    L/F
                  </Text>

                  {/* Closure length dimension line */}
                  {(() => {
                    const dimOffset = outerRadius + 0.35;
                    // Start at pipe end
                    const startX = pipeEndX;
                    const startY = pipeEndY;
                    // End at end of closure pipe
                    const endX = pipeEndX + dirX * closureLength;
                    const endY = pipeEndY + dirY * closureLength;
                    // Offset perpendicular to the pipe direction
                    const offsetX = -dirY * dimOffset;
                    const offsetY = dirX * dimOffset;
                    // Midpoint for text
                    const midX = (startX + endX) / 2 + offsetX;
                    const midY = (startY + endY) / 2 + offsetY;

                    return (
                      <group>
                        {/* Main dimension line */}
                        <Line
                          points={[
                            [startX + offsetX, startY + offsetY, 0],
                            [endX + offsetX, endY + offsetY, 0]
                          ]}
                          color="#2563eb"
                          lineWidth={2}
                        />
                        {/* Leader at start */}
                        <Line
                          points={[
                            [startX, startY - outerRadius, 0],
                            [startX + offsetX, startY + offsetY, 0]
                          ]}
                          color="#2563eb"
                          lineWidth={1}
                        />
                        {/* Leader at end */}
                        <Line
                          points={[
                            [endX, endY - outerRadius, 0],
                            [endX + offsetX, endY + offsetY, 0]
                          ]}
                          color="#2563eb"
                          lineWidth={1}
                        />
                        {/* Dimension text */}
                        <Text
                          position={[midX, midY - 0.15, 0]}
                          fontSize={0.18}
                          color="#2563eb"
                          anchorX="center"
                          anchorY="top"
                          outlineWidth={0.02}
                          outlineColor="white"
                          fontWeight="bold"
                        >
                          {`L/F ${closureLengthMm}mm`}
                        </Text>
                      </group>
                    );
                  })()}

                  {/* 100mm gap indicator */}
                  {(() => {
                    const dimOffset = outerRadius + 0.55;
                    const gapStartX = pipeEndX + dirX * closureLength;
                    const gapStartY = pipeEndY + dirY * closureLength;
                    const gapEndX = pipeEndX + dirX * (closureLength + gapLength);
                    const gapEndY = pipeEndY + dirY * (closureLength + gapLength);
                    const offsetX = -dirY * dimOffset;
                    const offsetY = dirX * dimOffset;
                    const midX = (gapStartX + gapEndX) / 2 + offsetX;
                    const midY = (gapStartY + gapEndY) / 2 + offsetY;

                    return (
                      <group>
                        <Line
                          points={[
                            [gapStartX + offsetX, gapStartY + offsetY, 0],
                            [gapEndX + offsetX, gapEndY + offsetY, 0]
                          ]}
                          color="#9333ea"
                          lineWidth={1}
                          dashed
                        />
                        <Text
                          position={[midX, midY - 0.12, 0]}
                          fontSize={0.12}
                          color="#9333ea"
                          anchorX="center"
                          anchorY="top"
                          outlineWidth={0.02}
                          outlineColor="white"
                        >
                          100mm gap
                        </Text>
                      </group>
                    );
                  })()}
                </>
              ) : isRotatingFlangeOutlet ? (
                /* Rotating flange - retaining ring welded to pipe end, flange sits on pipe 50mm back */
                <>
                  {/* Retaining ring welded to pipe end - positioned flush with pipe outlet */}
                  <RetainingRing
                    position={[pipeEndX, pipeEndY, 0]}
                    rotation={[angleRad - Math.PI / 2, 0, 0]}
                    pipeOuterRadius={outerRadius}
                    pipeInnerRadius={innerRadius}
                    wallThickness={wt}
                    flangeRadius={outerRadius * 2.2}
                  />
                  {/* Rotating flange positioned 50mm back from ring (on the pipe, towards bend) */}
                  <Flange
                    position={[
                      pipeEndX - dirX * (50 / scaleFactor),
                      pipeEndY - dirY * (50 / scaleFactor),
                      0
                    ]}
                    rotation={[0, 0, angleRad]}
                    outerRadius={outerRadius}
                    pipeRadius={innerRadius}
                    nominalBore={nominalBore}
                    material={matProps}
                  />
                  {/* R/F label */}
                  <Text
                    position={[
                      pipeEndX - dirX * (25 / scaleFactor) - dirY * (outerRadius * 2.5 + 0.3),
                      pipeEndY - dirY * (25 / scaleFactor) + dirX * (outerRadius * 2.5 + 0.3),
                      0
                    ]}
                    fontSize={0.2}
                    color="#ea580c"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="white"
                    fontWeight="bold"
                  >
                    R/F
                  </Text>
                </>
              ) : (
                /* Fixed flange - directly on pipe end */
                <Flange
                  position={[pipeEndX, pipeEndY, 0]}
                  rotation={[0, 0, angleRad]}
                  outerRadius={outerRadius}
                  pipeRadius={innerRadius}
                  nominalBore={nominalBore}
                  material={matProps}
                />
              )}
            </>
          );
        })()}

        {/* Inlet flange - at end of vertical tangent, or at bend inlet if no tangent */}
        {showInletFlange && (() => {
          // Calculate pipe end position at end of vertical tangent (or bend inlet if no tangent)
          const pipeEndX = inletX;
          const pipeEndY = verticalTangent > 0 ? inletY - verticalTangent : inletY;

          // Flange thickness for offset calculations
          const flangeThickness = outerRadius * 0.4;

          // Closure length in scene units
          const closureLength = (closureLengthMm || 150) / scaleFactor;

          // 100mm gap in scene units
          const gapLength = 100 / scaleFactor;

          return (
            <>
              {/* For loose flanges: Closure piece first, then 100mm gap, then flange floating */}
              {isLooseFlangeInlet && closureLengthMm > 0 ? (
                <>
                  {/* Closure piece (attached to pipe end) - extends downward */}
                  <group position={[pipeEndX, pipeEndY - closureLength / 2, 0]}>
                    {/* Outer pipe cylinder */}
                    <mesh>
                      <cylinderGeometry args={[outerRadius, outerRadius, closureLength, 32, 1, false]} />
                      <meshStandardMaterial {...matProps} />
                    </mesh>
                    {/* Inner bore */}
                    <mesh>
                      <cylinderGeometry args={[innerRadius, innerRadius, closureLength - 0.02, 32, 1, false]} />
                      <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
                    </mesh>
                    {/* End cap ring to show pipe wall thickness */}
                    <mesh position={[0, -closureLength / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[innerRadius, outerRadius, 32]} />
                      <meshStandardMaterial {...matProps} />
                    </mesh>
                  </group>

                  {/* Loose flange positioned 100mm after closure piece */}
                  <Flange
                    position={[pipeEndX, pipeEndY - closureLength - gapLength, 0]}
                    rotation={[0, 0, 0]}
                    outerRadius={outerRadius}
                    pipeRadius={innerRadius}
                    nominalBore={nominalBore}
                    material={matProps}
                  />

                  {/* L/F Label next to the closure piece */}
                  <Text
                    position={[pipeEndX + outerRadius * 2.5 + 0.3, pipeEndY - closureLength / 2, 0]}
                    fontSize={0.2}
                    color="#2563eb"
                    anchorX="left"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="white"
                    fontWeight="bold"
                  >
                    L/F
                  </Text>

                  {/* Closure length dimension line for inlet */}
                  {(() => {
                    const dimOffset = outerRadius + 0.35;
                    // Start at pipe end
                    const startY = pipeEndY;
                    // End at end of closure pipe
                    const endY = pipeEndY - closureLength;
                    // Offset to the right of the pipe
                    const dimX = pipeEndX + dimOffset;
                    // Midpoint for text
                    const midY = (startY + endY) / 2;

                    return (
                      <group>
                        {/* Main dimension line */}
                        <Line
                          points={[[dimX, startY, 0], [dimX, endY, 0]]}
                          color="#2563eb"
                          lineWidth={2}
                        />
                        {/* Leader at start */}
                        <Line
                          points={[[pipeEndX + outerRadius, startY, 0], [dimX + 0.1, startY, 0]]}
                          color="#2563eb"
                          lineWidth={1}
                        />
                        {/* Leader at end */}
                        <Line
                          points={[[pipeEndX + outerRadius, endY, 0], [dimX + 0.1, endY, 0]]}
                          color="#2563eb"
                          lineWidth={1}
                        />
                        {/* Dimension text */}
                        <Text
                          position={[dimX + 0.15, midY, 0]}
                          fontSize={0.18}
                          color="#2563eb"
                          anchorX="left"
                          anchorY="middle"
                          outlineWidth={0.02}
                          outlineColor="white"
                          fontWeight="bold"
                        >
                          {`L/F ${closureLengthMm}mm`}
                        </Text>
                      </group>
                    );
                  })()}

                  {/* 100mm gap indicator */}
                  {(() => {
                    const dimOffset = outerRadius + 0.55;
                    const gapStartY = pipeEndY - closureLength;
                    const gapEndY = pipeEndY - closureLength - gapLength;
                    const dimX = pipeEndX + dimOffset;
                    const midY = (gapStartY + gapEndY) / 2;

                    return (
                      <group>
                        <Line
                          points={[[dimX, gapStartY, 0], [dimX, gapEndY, 0]]}
                          color="#9333ea"
                          lineWidth={1}
                          dashed
                        />
                        <Text
                          position={[dimX + 0.15, midY, 0]}
                          fontSize={0.12}
                          color="#9333ea"
                          anchorX="left"
                          anchorY="middle"
                          outlineWidth={0.02}
                          outlineColor="white"
                        >
                          100mm gap
                        </Text>
                      </group>
                    );
                  })()}
                </>
              ) : isRotatingFlangeInlet ? (
                /* Rotating flange - retaining ring welded to pipe end, flange sits on pipe 50mm up */
                <>
                  {/* Retaining ring welded to pipe end - positioned flush with pipe outlet */}
                  <RetainingRing
                    position={[pipeEndX, pipeEndY, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    pipeOuterRadius={outerRadius}
                    pipeInnerRadius={innerRadius}
                    wallThickness={wt}
                    flangeRadius={outerRadius * 2.2}
                  />
                  {/* Rotating flange positioned 50mm up from ring (on the pipe, towards bend) */}
                  <Flange
                    position={[pipeEndX, pipeEndY + (50 / scaleFactor), 0]}
                    rotation={[0, 0, 0]}
                    outerRadius={outerRadius}
                    pipeRadius={innerRadius}
                    nominalBore={nominalBore}
                    material={matProps}
                  />
                  {/* R/F label */}
                  <Text
                    position={[pipeEndX + outerRadius * 2.5 + 0.3, pipeEndY + (25 / scaleFactor), 0]}
                    fontSize={0.2}
                    color="#ea580c"
                    anchorX="left"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="white"
                    fontWeight="bold"
                  >
                    R/F
                  </Text>
                </>
              ) : (
                /* Fixed flange - directly on pipe end */
                <Flange
                  position={[pipeEndX, pipeEndY, 0]}
                  rotation={[0, 0, 0]}
                  outerRadius={outerRadius}
                  pipeRadius={innerRadius}
                  nominalBore={nominalBore}
                  material={matProps}
                />
              )}
            </>
          );
        })()}

        {/* Blank Flanges - positioned 50mm from the main flange */}
        {addBlankFlange && blankFlangePositions.includes('outlet') && showOutletFlange && (() => {
          const angleRad = (bendAngle * Math.PI) / 180;
          const flangeThickness = outerRadius * 0.4;
          const pipeEndX = outletX + (-Math.sin(angleRad)) * horizontalTangent;
          const pipeEndY = outletY + Math.cos(angleRad) * horizontalTangent;
          const blankOffset = flangeThickness + 0.1; // 100mm gap in scene units
          const blankX = pipeEndX + (-Math.sin(angleRad)) * blankOffset;
          const blankY = pipeEndY + Math.cos(angleRad) * blankOffset;
          return (
            <>
              <BlankFlange
                position={[blankX, blankY, 0]}
                rotation={[0, 0, angleRad]}
                outerRadius={outerRadius}
                nominalBore={nominalBore}
              />
              <Text
                position={[blankX + 0.3, blankY, 0]}
                fontSize={0.15}
                color="#cc3300"
                anchorX="left"
                anchorY="middle"
              >
                BLANK
              </Text>
            </>
          );
        })()}
        {addBlankFlange && blankFlangePositions.includes('inlet') && showInletFlange && (() => {
          const flangeThickness = outerRadius * 0.4;
          const pipeEndY = verticalTangent > 0 ? inletY - verticalTangent : inletY;
          const blankOffset = flangeThickness + 0.1; // 100mm gap in scene units
          const blankY = pipeEndY - blankOffset;
          return (
            <>
              <BlankFlange
                position={[inletX, blankY, 0]}
                rotation={[0, 0, 0]}
                outerRadius={outerRadius}
                nominalBore={nominalBore}
              />
              <Text
                position={[inletX + outerRadius * 2.5, blankY, 0]}
                fontSize={0.15}
                color="#cc3300"
                anchorX="left"
                anchorY="middle"
              >
                BLANK
              </Text>
            </>
          );
        })()}

        {/* Stub 1: On horizontal tangent (longer), comes out vertically upward (+Y direction) */}
        {numberOfStubs >= 1 && stub1 && stub1.length && stub1.length > 0 && horizontalTangent > 0 && (() => {
          // Location from flange face along the tangent
          const stubLocation = stub1.locationFromFlange ? (stub1.locationFromFlange / scaleFactor) : (horizontalTangent / 2);
          const flangeX = outletX + (-Math.sin(angleRad)) * horizontalTangent;
          const flangeY = outletY + Math.cos(angleRad) * horizontalTangent;
          // Position stub along tangent, measuring from flange
          const stubX = flangeX - (-Math.sin(angleRad)) * stubLocation;
          const stubY = flangeY - Math.cos(angleRad) * stubLocation;
          // Stub length in scene units
          const stubLen = (stub1.length || 100) / scaleFactor;

          console.log('Rendering Stub 1:', { stubX, stubY, stubLocation, stubLen, outerRadius });

          return (
            <StubPipe
              position={[stubX, stubY + outerRadius + stubLen / 2, 0]}
              rotation={[0, 0, 0]}
              length={stub1.length}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              material={matProps}
              stubNB={stub1.nominalBoreMm}
              hasFlange={true}
            />
          );
        })()}

        {/* Stub 2: On vertical tangent (shorter), comes out horizontally (+X direction) */}
        {numberOfStubs >= 2 && stub2 && stub2.length && stub2.length > 0 && verticalTangent > 0 && (() => {
          // Location from flange face along the tangent
          const stubLocation = stub2.locationFromFlange ? (stub2.locationFromFlange / scaleFactor) : (verticalTangent / 2);
          const flangeY = inletY - verticalTangent;
          const stubY = flangeY + stubLocation;
          // Stub length in scene units
          const stubLen = (stub2.length || 100) / scaleFactor;

          console.log('Rendering Stub 2:', { stubY, stubLocation, stubLen, outerRadius });

          return (
            <StubPipe
              position={[inletX + outerRadius + stubLen / 2, stubY, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              length={stub2.length}
              outerRadius={outerRadius}
              innerRadius={innerRadius}
              material={matProps}
              stubNB={stub2.nominalBoreMm}
              hasFlange={true}
            />
          );
        })()}

        {/* Horizontal tangent dimension line with text label */}
        {horizontalTangent > 0 && (() => {
          const dimOffset = outerRadius + 0.4;
          const startX = outletX;
          const startY = outletY;
          const endX = outletX + (-Math.sin(angleRad)) * horizontalTangent;
          const endY = outletY + Math.cos(angleRad) * horizontalTangent;
          // Dimension line below the pipe
          const dimY = startY - dimOffset;
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2 - dimOffset;

          return (
            <group>
              {/* Main dimension line */}
              <Line
                points={[[startX, dimY, 0], [endX, endY - dimOffset, 0]]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* Vertical leader at start */}
              <Line
                points={[[startX, startY - outerRadius, 0], [startX, dimY - 0.1, 0]]}
                color="#dc2626"
                lineWidth={1}
              />
              {/* Vertical leader at end */}
              <Line
                points={[[endX, endY - outerRadius, 0], [endX, endY - dimOffset - 0.1, 0]]}
                color="#dc2626"
                lineWidth={1}
              />
              {/* Arrow tick at start */}
              <Line
                points={[[startX - 0.06, dimY - 0.12, 0], [startX + 0.06, dimY + 0.12, 0]]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* Arrow tick at end */}
              <Line
                points={[[endX - 0.06, endY - dimOffset - 0.12, 0], [endX + 0.06, endY - dimOffset + 0.12, 0]]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* Dimension text */}
              <Text
                position={[midX, midY - 0.15, 0]}
                fontSize={0.22}
                color="#dc2626"
                anchorX="center"
                anchorY="top"
                outlineWidth={0.02}
                outlineColor="white"
                fontWeight="bold"
              >
                {`${horizontalLabel}mm`}
              </Text>
            </group>
          );
        })()}

        {/* Vertical tangent dimension line with text label */}
        {verticalTangent > 0 && (() => {
          const dimOffset = outerRadius + 0.4;
          const startY = inletY;
          const endY = inletY - verticalTangent;
          const dimX = inletX + dimOffset;
          const midY = (startY + endY) / 2;

          return (
            <group>
              {/* Main dimension line */}
              <Line
                points={[[dimX, startY, 0], [dimX, endY, 0]]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* Horizontal leader at start */}
              <Line
                points={[[inletX + outerRadius, startY, 0], [dimX + 0.1, startY, 0]]}
                color="#dc2626"
                lineWidth={1}
              />
              {/* Horizontal leader at end */}
              <Line
                points={[[inletX + outerRadius, endY, 0], [dimX + 0.1, endY, 0]]}
                color="#dc2626"
                lineWidth={1}
              />
              {/* Arrow tick at start */}
              <Line
                points={[[dimX - 0.12, startY - 0.06, 0], [dimX + 0.12, startY + 0.06, 0]]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* Arrow tick at end */}
              <Line
                points={[[dimX - 0.12, endY - 0.06, 0], [dimX + 0.12, endY + 0.06, 0]]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* Dimension text */}
              <Text
                position={[dimX + 0.2, midY, 0]}
                fontSize={0.22}
                color="#dc2626"
                anchorX="left"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="white"
                fontWeight="bold"
              >
                {`${verticalLabel}mm`}
              </Text>
            </group>
          );
        })()}

        {/* Center-to-Face (C/F) dimension on the bend */}
        {(() => {
          // C/F is measured from the center of the bend arc to the face of the outlet
          const cfDimension = bendRadius; // In scene units
          const cfMm = Math.round(cfDimension * 100); // Convert back to mm

          // Draw arc showing the radius/C/F
          const arcMidAngle = angleRad / 2;
          const arcMidX = bendRadius * Math.cos(arcMidAngle) * 0.5;
          const arcMidY = bendRadius * Math.sin(arcMidAngle) * 0.5;

          // Corner point at bottom-left (below inlet, left of outlet direction)
          const cornerX = -bendRadius;
          const cornerY = -bendRadius;

          return (
            <group>
              {/* Vertical C/F line - from corner UP to inlet face */}
              <Line
                points={[[cornerX, cornerY, 0], [cornerX, 0, 0]]}
                color="#dc2626"
                lineWidth={2}
                dashed
                dashSize={0.05}
                gapSize={0.08}
              />
              {/* Horizontal C/F line - from corner RIGHT to below outlet */}
              <Line
                points={[[cornerX, cornerY, 0], [0, cornerY, 0]]}
                color="#dc2626"
                lineWidth={2}
                dashed
                dashSize={0.05}
                gapSize={0.08}
              />
              {/* Small marker at corner point */}
              <mesh position={[cornerX, cornerY, 0]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshBasicMaterial color="#dc2626" />
              </mesh>
              {/* Arrow at top of vertical line (inlet face) */}
              <mesh position={[cornerX, -0.1, 0]} rotation={[0, 0, 0]}>
                <coneGeometry args={[0.06, 0.15, 8]} />
                <meshBasicMaterial color="#dc2626" />
              </mesh>
              {/* Arrow at end of horizontal line */}
              <mesh position={[-0.1, cornerY, 0]} rotation={[0, 0, -Math.PI/2]}>
                <coneGeometry args={[0.06, 0.15, 8]} />
                <meshBasicMaterial color="#dc2626" />
              </mesh>
              {/* C/F label on vertical line */}
              <Text
                position={[cornerX - 0.15, -bendRadius / 2, 0]}
                fontSize={0.22}
                color="#dc2626"
                anchorX="right"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="white"
                fontWeight="bold"
              >
                {`C/F: ${cfMm}mm`}
              </Text>
              {/* C/F label on horizontal line */}
              <Text
                position={[-bendRadius / 2, cornerY - 0.15, 0]}
                fontSize={0.22}
                color="#dc2626"
                anchorX="center"
                anchorY="top"
                outlineWidth={0.02}
                outlineColor="white"
                fontWeight="bold"
              >
                {`C/F: ${cfMm}mm`}
              </Text>
            </group>
          );
        })()}

        {/* Angle label with pointer line at top of bend */}
        {(() => {
          // Position the angle label above the midpoint of the bend arc
          const midAngle = angleRad / 2;
          const arcMidX = bendRadius * Math.cos(midAngle);
          const arcMidY = bendRadius * Math.sin(midAngle);
          // Label position above the arc
          const labelY = arcMidY + bendRadius * 0.8;
          const labelX = arcMidX;

          return (
            <group>
              {/* Pointer line from label to bend arc */}
              <Line
                points={[[labelX, labelY, 0], [arcMidX, arcMidY, 0]]}
                color="#dc2626"
                lineWidth={1.5}
              />
              {/* Arrow at the arc end */}
              <mesh position={[arcMidX, arcMidY + 0.1, 0]} rotation={[0, 0, 0]}>
                <coneGeometry args={[0.05, 0.12, 8]} />
                <meshBasicMaterial color="#dc2626" />
              </mesh>
              {/* Angle text */}
              <Text
                position={[labelX, labelY + 0.15, 0]}
                fontSize={0.28}
                color="#dc2626"
                anchorX="center"
                anchorY="bottom"
                outlineWidth={0.03}
                outlineColor="white"
                fontWeight="bold"
              >
                {`${bendAngle}°`}
              </Text>
            </group>
          );
        })()}

        {/* Stub 1 location dimension - horizontal line above stub with vertical leaders */}
        {numberOfStubs >= 1 && stub1 && stub1.length && stub1.locationFromFlange && horizontalTangent > 0 && (() => {
          const stubLocation = (stub1.locationFromFlange || 0) / scaleFactor;
          const stubLen = (stub1.length || 100) / scaleFactor;
          const flangeX = outletX + (-Math.sin(angleRad)) * horizontalTangent;
          const flangeY = outletY + Math.cos(angleRad) * horizontalTangent;
          const stubX = flangeX - (-Math.sin(angleRad)) * stubLocation;
          const stubY = flangeY - Math.cos(angleRad) * stubLocation;

          // Dimension line height - above the stub
          const dimLineY = stubY + outerRadius + stubLen + 0.4;
          // Flange face Y position (top of tangent pipe)
          const flangeFaceY = flangeY;
          // Stub center Y position
          const stubCenterY = stubY + outerRadius + stubLen / 2;

          // Center point for the dimension text
          const textX = (flangeX + stubX) / 2;
          const textY = dimLineY + 0.15;

          return (
            <group>
              {/* Horizontal dimension line at top */}
              <Line
                points={[[flangeX, dimLineY, 0], [stubX, dimLineY, 0]]}
                color="#0066cc"
                lineWidth={1.5}
              />
              {/* Vertical leader from flange face up to dimension line */}
              <Line
                points={[[flangeX, flangeFaceY, 0], [flangeX, dimLineY, 0]]}
                color="#0066cc"
                lineWidth={1}
              />
              {/* Vertical leader from stub center up to dimension line */}
              <Line
                points={[[stubX, stubCenterY, 0], [stubX, dimLineY, 0]]}
                color="#0066cc"
                lineWidth={1}
              />
              {/* Small tick marks at ends of horizontal line */}
              <Line
                points={[[flangeX - 0.05, dimLineY - 0.08, 0], [flangeX + 0.05, dimLineY + 0.08, 0]]}
                color="#0066cc"
                lineWidth={1.5}
              />
              <Line
                points={[[stubX - 0.05, dimLineY - 0.08, 0], [stubX + 0.05, dimLineY + 0.08, 0]]}
                color="#0066cc"
                lineWidth={1.5}
              />
              {/* Dimension text above the line */}
              <Text
                position={[textX, textY, 0]}
                fontSize={0.24}
                color="#0066cc"
                anchorX="center"
                anchorY="bottom"
                outlineWidth={0.02}
                outlineColor="white"
                fontWeight="bold"
              >
                {`${stub1.locationFromFlange}mm`}
              </Text>
            </group>
          );
        })()}

        {/* Stub 2 location dimension - similar treatment */}
        {numberOfStubs >= 2 && stub2 && stub2.length && stub2.locationFromFlange && verticalTangent > 0 && (() => {
          const stubLocation = (stub2.locationFromFlange || 0) / scaleFactor;
          const stubLen = (stub2.length || 100) / scaleFactor;
          const flangeY = inletY - verticalTangent;
          const stubY = flangeY + stubLocation;

          // Dimension line X position - to the left of stub
          const dimLineX = inletX + outerRadius + stubLen + 0.4;

          // Center point for the dimension text
          const textX = dimLineX + 0.15;
          const textY = (flangeY + stubY) / 2;

          return (
            <group>
              {/* Vertical dimension line */}
              <Line
                points={[[dimLineX, flangeY, 0], [dimLineX, stubY, 0]]}
                color="#0066cc"
                lineWidth={1.5}
              />
              {/* Horizontal leader from flange face to dimension line */}
              <Line
                points={[[inletX, flangeY, 0], [dimLineX, flangeY, 0]]}
                color="#0066cc"
                lineWidth={1}
              />
              {/* Horizontal leader from stub center to dimension line */}
              <Line
                points={[[inletX + outerRadius + stubLen / 2, stubY, 0], [dimLineX, stubY, 0]]}
                color="#0066cc"
                lineWidth={1}
              />
              {/* Dimension text next to the line */}
              <Text
                position={[textX, textY, 0]}
                fontSize={0.24}
                color="#0066cc"
                anchorX="left"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="white"
                fontWeight="bold"
              >
                {`${stub2.locationFromFlange}mm`}
              </Text>
            </group>
          );
        })()}

        {/* Info labels and angle are now HTML overlays in the main component */}
      </group>
    </Center>
  );
};

export default function Bend3DPreview(props: Bend3DPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Only SABS 719 bends are segmented - SABS 62 are always pulled bends
  const isSegmentedBend = props.isSegmented ||
    props.materialName?.toLowerCase().includes("sabs 719");

  // Calculate camera distance to fit entire model with dimension lines
  const scaleFactor = 100;
  const t1 = (props.tangent1 || 0) / scaleFactor;
  const t2 = (props.tangent2 || 0) / scaleFactor;
  const bendSize = (props.nominalBore || 50) / scaleFactor * 2;
  const maxExtent = Math.max(t1, t2, bendSize, 1);
  const cameraZ = Math.max(12, maxExtent * 3 + 8);

  // Calculate pipe dimensions for info display using proper wall thickness lookup
  const odRaw = props.outerDiameter || (props.nominalBore * 1.1) || 60;
  const wallThicknessDisplay = getWallThickness(
    props.nominalBore,
    props.schedule || 'STD',
    props.materialName || '',
    props.wallThickness || 0
  );
  const idRaw = odRaw - 2 * wallThicknessDisplay;
  const flangeSpecs = getFlangeSpecs(props.nominalBore);

  // Tangent labels (longer one horizontal, shorter vertical)
  const longerTangent = Math.max(props.tangent1 || 0, props.tangent2 || 0);
  const shorterTangent = Math.min(props.tangent1 || 0, props.tangent2 || 0);

  // Hidden state - show compact bar with show button
  if (isHidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border border-slate-200 px-3 py-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          3D Preview - {isSegmentedBend ? "SABS 719 Segmented" : `SABS 62 ${props.bendType || ''} Pulled Bend`} ({props.bendAngle}°)
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
    <div className="h-64 w-full bg-slate-50 rounded-md border border-slate-200 overflow-hidden relative mb-4">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, cameraZ], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} />
        <Environment preset="city" />
        <group scale={0.75}>
          <BendScene {...props} />
        </group>
        <ContactShadows position={[0, -5, 0]} opacity={0.3} scale={20} blur={2} />
        <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={30} />
      </Canvas>

      {/* Badge - top left */}
      <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded shadow-sm">
        <div className={isSegmentedBend ? "text-purple-700" : "text-blue-700"} style={{fontWeight: 500}}>
          <div>{props.materialName || (isSegmentedBend ? "SABS 719" : "SABS 62")}</div>
          <div className="text-[9px] opacity-80">
            {isSegmentedBend
              ? `${props.numberOfSegments || 2}-Segment Bend`
              : "Pulled Bend"}
          </div>
          {isSegmentedBend && props.numberOfSegments && (
            <div className="text-[9px] text-purple-600 font-medium">
              {props.numberOfSegments - 1} weld{props.numberOfSegments - 1 !== 1 ? 's' : ''} @ {(props.bendAngle / props.numberOfSegments).toFixed(1)}° each
            </div>
          )}
        </div>
      </div>

      {/* Pipe & Flange Info - top right */}
      <div className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md leading-snug border border-gray-200">
        <div className="font-bold text-blue-800 mb-0.5">PIPE</div>
        <div className="text-gray-900 font-medium">OD: {odRaw.toFixed(0)}mm | ID: {idRaw.toFixed(0)}mm</div>
        <div className="text-gray-700">WT: {wallThicknessDisplay.toFixed(1)}mm</div>
        {/* Only show flange info if flanges have been allocated (not PE - Plain End) */}
        {(props.flangeConfig || 'PE').toUpperCase() !== 'PE' && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">FLANGE ({(props.flangeConfig || 'PE').toUpperCase()})</div>
            <div className="text-gray-900 font-medium">OD: {flangeSpecs.flangeOD}mm | PCD: {flangeSpecs.pcd}mm</div>
            <div className="text-gray-900 font-medium">THK: {flangeSpecs.thickness}mm | {flangeSpecs.boltHoles} x Ø{flangeSpecs.holeID}mm</div>
            {/* Show flange type description */}
            {(props.flangeConfig || '').toUpperCase() === 'FOE_LF' && (
              <div className="text-blue-600 font-semibold mt-0.5">L/F = Loose Flange</div>
            )}
            {(props.flangeConfig || '').toUpperCase() === 'FOE_RF' && (
              <div className="text-orange-600 font-semibold mt-0.5">R/F = Rotating Flange</div>
            )}
            {(props.flangeConfig || '').toUpperCase() === '2X_RF' && (
              <div className="text-orange-600 font-semibold mt-0.5">2x R/F = Both Rotating</div>
            )}
            {(props.flangeConfig || '').toUpperCase() === 'LF_BE' && (
              <div className="text-blue-600 font-semibold mt-0.5">L/F BE = Loose Both Ends</div>
            )}
          </>
        )}
      </div>


      {/* Bottom-left info container - Stubs and Tangent lengths */}
      <div className="absolute bottom-2 left-2 flex flex-col gap-1">
        {/* Stub info with flange details - yellow background like in image */}
        {props.numberOfStubs && props.numberOfStubs > 0 && props.stubs && (
          <div className="text-[10px] bg-yellow-100 px-2 py-1.5 rounded shadow-md border border-yellow-400">
            <div className="font-bold text-black mb-1">STUBS</div>
            {props.stubs[0] && props.stubs[0].nominalBoreMm && (() => {
              const stub1Flange = getFlangeSpecs(props.stubs[0].nominalBoreMm);
              return (
                <div className="text-black mb-1">
                  <div className="font-bold">S1: {props.stubs[0].nominalBoreMm}NB x {props.stubs[0].length || 0}mm @ {props.stubs[0].locationFromFlange || 0}mm</div>
                  <div className="font-medium pl-2">OD: {stub1Flange.flangeOD}mm | THK: {stub1Flange.thickness}mm</div>
                  <div className="font-medium pl-2">PCD: {stub1Flange.pcd}mm | {stub1Flange.boltHoles} x Ø{stub1Flange.holeID}mm</div>
                </div>
              );
            })()}
            {props.stubs[1] && props.stubs[1].nominalBoreMm && (() => {
              const stub2Flange = getFlangeSpecs(props.stubs[1].nominalBoreMm);
              return (
                <div className="text-black">
                  <div className="font-bold">S2: {props.stubs[1].nominalBoreMm}NB x {props.stubs[1].length || 0}mm @ {props.stubs[1].locationFromFlange || 0}mm</div>
                  <div className="font-medium pl-2">OD: {stub2Flange.flangeOD}mm | THK: {stub2Flange.thickness}mm</div>
                  <div className="font-medium pl-2">PCD: {stub2Flange.pcd}mm | {stub2Flange.boltHoles} x Ø{stub2Flange.holeID}mm</div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Tangent lengths - below stubs */}
        {((props.tangent1 || 0) > 0 || (props.tangent2 || 0) > 0) && (
          <div className="text-[9px] bg-orange-50/95 px-2 py-1 rounded shadow-sm border border-orange-200">
            {(props.tangent1 || 0) > 0 && <div className="text-orange-700 font-medium">Tangent 1: {props.tangent1}mm</div>}
            {(props.tangent2 || 0) > 0 && <div className="text-orange-700 font-medium">Tangent 2: {props.tangent2}mm</div>}
          </div>
        )}
      </div>

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

      {/* Expanded Modal - positioned above bottom toolbar */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-4 pb-24">
          <div className="relative w-full h-full max-w-6xl max-h-[calc(100vh-120px)] bg-slate-100 rounded-lg overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Expanded Canvas */}
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, cameraZ * 1.2], fov: 45 }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} />
              <Environment preset="city" />
              <group scale={0.75}>
                <BendScene {...props} />
              </group>
              <ContactShadows position={[0, -5, 0]} opacity={0.3} scale={20} blur={2} />
              <OrbitControls makeDefault enablePan={true} minDistance={1} maxDistance={50} />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg">
              <div className="font-semibold text-gray-800 mb-1">
                {isSegmentedBend ? "SABS 719 Segmented Bend" : `SABS 62 ${props.bendType || ''} Pulled Bend`}
              </div>
              <div className="text-gray-600">
                {props.bendAngle}° | {props.nominalBore}NB | OD: {odRaw.toFixed(0)}mm
              </div>
              {((props.tangent1 || 0) > 0 || (props.tangent2 || 0) > 0) && (
                <div className="text-gray-600 mt-1">
                  {(props.tangent1 || 0) > 0 && <span>Tangent 1: {props.tangent1}mm</span>}
                  {(props.tangent1 || 0) > 0 && (props.tangent2 || 0) > 0 && <span> | </span>}
                  {(props.tangent2 || 0) > 0 && <span>Tangent 2: {props.tangent2}mm</span>}
                </div>
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
