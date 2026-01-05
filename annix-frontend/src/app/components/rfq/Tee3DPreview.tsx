'use client';

import React, { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  getSabs719TeeDimensions,
  getTeeHeight,
  getGussetSection,
  Sabs719TeeType
} from '@/app/lib/utils/sabs719TeeData';

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
}

// Flange lookup table based on nominal bore (simplified PN16)
const getFlangeSpecs = (nb: number) => {
  const flangeData: Record<number, { flangeOD: number; pcd: number; thickness: number; boltHoles: number; holeID: number }> = {
    200: { flangeOD: 340, pcd: 295, thickness: 24, boltHoles: 8, holeID: 22 },
    250: { flangeOD: 395, pcd: 350, thickness: 26, boltHoles: 12, holeID: 22 },
    300: { flangeOD: 445, pcd: 400, thickness: 26, boltHoles: 12, holeID: 22 },
    350: { flangeOD: 505, pcd: 460, thickness: 28, boltHoles: 16, holeID: 22 },
    400: { flangeOD: 565, pcd: 515, thickness: 28, boltHoles: 16, holeID: 26 },
    450: { flangeOD: 615, pcd: 565, thickness: 30, boltHoles: 20, holeID: 26 },
    500: { flangeOD: 670, pcd: 620, thickness: 30, boltHoles: 20, holeID: 26 },
    550: { flangeOD: 725, pcd: 670, thickness: 32, boltHoles: 20, holeID: 30 },
    600: { flangeOD: 780, pcd: 725, thickness: 32, boltHoles: 20, holeID: 30 },
    650: { flangeOD: 830, pcd: 775, thickness: 34, boltHoles: 20, holeID: 30 },
    700: { flangeOD: 885, pcd: 830, thickness: 34, boltHoles: 24, holeID: 30 },
    750: { flangeOD: 940, pcd: 880, thickness: 36, boltHoles: 24, holeID: 33 },
    800: { flangeOD: 1015, pcd: 950, thickness: 38, boltHoles: 24, holeID: 33 },
    850: { flangeOD: 1065, pcd: 1000, thickness: 38, boltHoles: 24, holeID: 33 },
    900: { flangeOD: 1115, pcd: 1050, thickness: 40, boltHoles: 28, holeID: 33 },
  };
  return flangeData[nb] || { flangeOD: nb * 1.5, pcd: nb * 1.3, thickness: 26, boltHoles: 12, holeID: 22 };
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

// Gusset plate component (triangular reinforcement)
function GussetPlate({
  position,
  rotation,
  size,
  thickness
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
  thickness: number;
}) {
  const geometry = useMemo(() => {
    // Create triangular shape for gusset
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(size, 0);
    shape.lineTo(0, size);
    shape.lineTo(0, 0);

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [size, thickness]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#7a7a7a" metalness={0.6} roughness={0.4} />
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

  // Calculate dimensions
  const od = outerDiameter || dims?.outsideDiameterMm || nominalBore * 1.1;
  const wt = wallThickness || Math.max(6, od * 0.03);
  const id = od - (2 * wt);
  // For reducing tees, use the branch NB dimensions; otherwise use same as run
  const branchOD = branchNominalBore
    ? (branchOuterDiameter || branchDims?.outsideDiameterMm || branchNominalBore * 1.1)
    : od; // Same as run for equal tee
  const branchWT = branchNominalBore ? Math.max(6, branchOD * 0.03) : wt;
  const branchID = branchOD - (2 * branchWT);

  // Scale factor for 3D scene (convert mm to scene units)
  const scaleFactor = 100;
  const outerRadius = (od / scaleFactor) / 2;
  const innerRadius = (id / scaleFactor) / 2;
  const branchOuterRadius = (branchOD / scaleFactor) / 2;
  const branchInnerRadius = (branchID / scaleFactor) / 2;
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
  const runFlangeSpecs = getFlangeSpecs(nominalBore);
  const branchFlangeSpecs = getFlangeSpecs(branchNominalBore || nominalBore);

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

        {/* Gusset plates for Gusset Tees */}
        {teeType === 'gusset' && gussetSize > 0 && (
          <>
            {/* Front gusset */}
            <GussetPlate
              position={[branchOffsetX + branchOuterRadius + gussetThickness / 2, outerRadius, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              size={gussetSize}
              thickness={gussetThickness}
            />
            {/* Back gusset */}
            <GussetPlate
              position={[branchOffsetX - branchOuterRadius - gussetThickness / 2, outerRadius, 0]}
              rotation={[0, Math.PI / 2, 0]}
              size={gussetSize}
              thickness={gussetThickness}
            />
            {/* Left gusset */}
            <GussetPlate
              position={[branchOffsetX, outerRadius, branchOuterRadius + gussetThickness / 2]}
              rotation={[0, Math.PI, 0]}
              size={gussetSize}
              thickness={gussetThickness}
            />
            {/* Right gusset */}
            <GussetPlate
              position={[branchOffsetX, outerRadius, -branchOuterRadius - gussetThickness / 2]}
              rotation={[0, 0, 0]}
              size={gussetSize}
              thickness={gussetThickness}
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
                {/* Closure pipe piece attached to tee end */}
                <mesh position={[-halfRunLength - (closureLengthMm / scaleFactor / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32]} />
                  <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Inner bore of closure pipe */}
                <mesh position={[-halfRunLength - (closureLengthMm / scaleFactor / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[innerRadius, innerRadius, closureLengthMm / scaleFactor + 0.01, 32]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
                {/* Loose flange floating 100mm (1.0 scene units) away from closure piece */}
                <FlangeComponent
                  position={[-halfRunLength - closureLengthMm / scaleFactor - 1.0, 0, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                  outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                  innerDiameter={id / scaleFactor}
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
                innerDiameter={id / scaleFactor}
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
                {/* Closure pipe piece attached to tee end */}
                <mesh position={[halfRunLength + (closureLengthMm / scaleFactor / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32]} />
                  <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Inner bore of closure pipe */}
                <mesh position={[halfRunLength + (closureLengthMm / scaleFactor / 2), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[innerRadius, innerRadius, closureLengthMm / scaleFactor + 0.01, 32]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
                {/* Loose flange floating 100mm (1.0 scene units) away from closure piece */}
                <FlangeComponent
                  position={[halfRunLength + closureLengthMm / scaleFactor + 1.0, 0, 0]}
                  rotation={[0, -Math.PI / 2, 0]}
                  outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                  innerDiameter={id / scaleFactor}
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
                innerDiameter={id / scaleFactor}
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
                {/* Closure pipe piece attached to branch top */}
                <mesh position={[branchOffsetX, height + (closureLengthMm / scaleFactor / 2), 0]}>
                  <cylinderGeometry args={[branchOuterRadius, branchOuterRadius, closureLengthMm / scaleFactor, 32]} />
                  <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.4} />
                </mesh>
                {/* Inner bore of closure pipe */}
                <mesh position={[branchOffsetX, height + (closureLengthMm / scaleFactor / 2), 0]}>
                  <cylinderGeometry args={[branchInnerRadius, branchInnerRadius, closureLengthMm / scaleFactor + 0.01, 32]} />
                  <meshStandardMaterial color="#1a1a1a" />
                </mesh>
                {/* Loose flange floating 100mm (1.0 scene units) above closure piece */}
                <FlangeComponent
                  position={[branchOffsetX, height + closureLengthMm / scaleFactor + 1.0, 0]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                  innerDiameter={branchID / scaleFactor}
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
                position={[branchOffsetX, height, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={branchID / scaleFactor}
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

        {/* Gusset dimension for gusset tees */}
        {teeType === 'gusset' && gussetSize > 0 && (
          <>
            <Line
              points={[
                [branchOffsetX + branchOuterRadius + gussetThickness, outerRadius, 0.3],
                [branchOffsetX + branchOuterRadius + gussetThickness + gussetSize, outerRadius, 0.3]
              ]}
              color="#0066cc"
              lineWidth={2}
            />
            <Text
              position={[branchOffsetX + branchOuterRadius + gussetThickness + gussetSize / 2, outerRadius - 0.15, 0.3]}
              fontSize={0.15}
              color="#0066cc"
              anchorX="center"
              anchorY="top"
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

// Main Preview component
export default function Tee3DPreview(props: Tee3DPreviewProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get dimensions
  const dims = getSabs719TeeDimensions(props.nominalBore);
  const branchDims = props.branchNominalBore ? getSabs719TeeDimensions(props.branchNominalBore) : null;
  const od = props.outerDiameter || dims?.outsideDiameterMm || props.nominalBore * 1.1;
  const wt = props.wallThickness || Math.max(6, od * 0.03);
  const id = od - (2 * wt);
  // Branch dimensions for reducing tees
  const branchOD = props.branchNominalBore
    ? (props.branchOuterDiameter || branchDims?.outsideDiameterMm || props.branchNominalBore * 1.1)
    : od;
  const branchWT = props.branchNominalBore ? Math.max(6, branchOD * 0.03) : wt;
  const branchID = branchOD - (2 * branchWT);
  const teeHeight = getTeeHeight(props.nominalBore, props.teeType);
  const gussetSection = props.teeType === 'gusset' ? getGussetSection(props.nominalBore) : 0;

  // Camera position based on size
  const cameraZ = Math.max(8, props.nominalBore / 80);

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
    <div className="h-64 w-full bg-slate-50 rounded-md border border-slate-200 overflow-hidden relative mb-4">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [cameraZ, cameraZ * 0.8, cameraZ], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} />
        <Environment preset="city" />
        <group scale={0.75}>
          <TeeScene {...props} />
        </group>
        <ContactShadows position={[0, -3, 0]} opacity={0.3} scale={20} blur={2} />
        <OrbitControls makeDefault enablePan={false} minDistance={2} maxDistance={30} />
      </Canvas>

      {/* Badge - top left */}
      <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded shadow-sm">
        <span className="text-purple-700" style={{ fontWeight: 500 }}>
          SABS 719 {props.teeType === 'gusset' ? 'Gusset' : 'Short'} Tee
        </span>
      </div>

      {/* Pipe & Tee Info - top right */}
      <div className="absolute top-2 right-2 text-[9px] bg-white/95 px-2 py-1.5 rounded shadow-sm leading-tight">
        <div className="font-semibold text-purple-700 mb-0.5">
          {props.branchNominalBore ? 'REDUCING TEE' : 'TEE'}
        </div>
        <div className="text-gray-700">Run: OD {od.toFixed(0)}mm | ID {id.toFixed(0)}mm</div>
        {props.branchNominalBore && (
          <div className="text-blue-700">Branch: OD {branchOD.toFixed(0)}mm | ID {branchID.toFixed(0)}mm</div>
        )}
        <div className="text-gray-700">Height: {teeHeight}mm</div>
        {props.teeType === 'gusset' && (
          <div className="text-gray-700">Gusset: {gussetSection}mm</div>
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

      {/* Expanded Modal */}
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
            <Canvas shadows dpr={[1, 2]} camera={{ position: [cameraZ * 1.2, cameraZ, cameraZ * 1.2], fov: 45 }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} />
              <Environment preset="city" />
              <group scale={0.75}>
                <TeeScene {...props} />
              </group>
              <ContactShadows position={[0, -3, 0]} opacity={0.3} scale={20} blur={2} />
              <OrbitControls makeDefault enablePan={true} minDistance={1} maxDistance={50} />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg">
              <div className="font-semibold text-gray-800 mb-1">
                SABS 719 {props.teeType === 'gusset' ? 'Gusset' : 'Short'} Tee
              </div>
              <div className="text-gray-600">
                {props.nominalBore}NB | OD: {od.toFixed(0)}mm | Height: {teeHeight}mm
              </div>
              {props.teeType === 'gusset' && (
                <div className="text-gray-600 mt-1">
                  Gusset Section: {gussetSection}mm
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
