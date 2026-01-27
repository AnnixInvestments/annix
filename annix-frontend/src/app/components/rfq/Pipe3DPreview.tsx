'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Text, Line as DreiLine, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { log } from '@/app/lib/logger';
import { FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs';

const Line = (props: React.ComponentProps<typeof DreiLine>) => {
  const { size } = useThree();
  return <DreiLine {...props} resolution={new THREE.Vector2(size.width, size.height)} />;
};

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

interface Pipe3DPreviewProps {
  length: number;
  outerDiameter: number;
  wallThickness: number;
  endConfiguration?: string;
  materialName?: string;
  closureLengthMm?: number;
  nominalBoreMm?: number;
  pressureClass?: string;
  addBlankFlange?: boolean;
  blankFlangeCount?: number;
  blankFlangePositions?: string[];
  savedCameraPosition?: [number, number, number];
  savedCameraTarget?: [number, number, number];
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
  selectedNotes?: string[];
  flangeSpecs?: FlangeSpecData | null;
  flangeStandardName?: string;
  pressureClassDesignation?: string;
  flangeTypeCode?: string;
}

// Standard flange dimensions based on SABS 1123 Table 1000/4 (PN16) - Slip-on flanges
// Bolt length calculated for: 2 x flange thickness + gasket (3mm) + nut + washer + thread engagement
// If apiSpecs are provided (from dynamic flange lookup), use those values instead
// Returns { specs, isFromApi } to indicate if data is from API or fallback
const getFlangeSpecs = (nominalBore: number, apiSpecs?: FlangeSpecData | null): { specs: { flangeOD: number; pcd: number; boltHoles: number; holeID: number; thickness: number; boltSize: number; boltLength: number }; isFromApi: boolean } => {
  // If API specs are provided, use them
  if (apiSpecs) {
    return {
      specs: {
        flangeOD: apiSpecs.flangeOdMm,
        pcd: apiSpecs.flangePcdMm,
        boltHoles: apiSpecs.flangeNumHoles,
        holeID: apiSpecs.flangeBoltHoleDiameterMm,
        thickness: apiSpecs.flangeThicknessMm,
        boltSize: apiSpecs.boltDiameterMm || 16,
        boltLength: apiSpecs.boltLengthMm || 70,
      },
      isFromApi: true,
    };
  }

  // Fall back to local lookup (SABS 1123 default data)
  const flangeData: { [key: number]: { flangeOD: number; pcd: number; boltHoles: number; holeID: number; thickness: number; boltSize: number; boltLength: number } } = {
    15: { flangeOD: 95, pcd: 65, boltHoles: 4, holeID: 14, thickness: 14, boltSize: 12, boltLength: 55 },
    20: { flangeOD: 105, pcd: 75, boltHoles: 4, holeID: 14, thickness: 14, boltSize: 12, boltLength: 55 },
    25: { flangeOD: 115, pcd: 85, boltHoles: 4, holeID: 14, thickness: 14, boltSize: 12, boltLength: 55 },
    32: { flangeOD: 140, pcd: 100, boltHoles: 4, holeID: 18, thickness: 16, boltSize: 16, boltLength: 65 },
    40: { flangeOD: 150, pcd: 110, boltHoles: 4, holeID: 18, thickness: 16, boltSize: 16, boltLength: 65 },
    50: { flangeOD: 165, pcd: 125, boltHoles: 4, holeID: 18, thickness: 18, boltSize: 16, boltLength: 70 },
    65: { flangeOD: 185, pcd: 145, boltHoles: 4, holeID: 18, thickness: 18, boltSize: 16, boltLength: 70 },
    80: { flangeOD: 200, pcd: 160, boltHoles: 8, holeID: 18, thickness: 18, boltSize: 16, boltLength: 70 },
    100: { flangeOD: 220, pcd: 180, boltHoles: 8, holeID: 18, thickness: 18, boltSize: 16, boltLength: 70 },
    125: { flangeOD: 250, pcd: 210, boltHoles: 8, holeID: 18, thickness: 20, boltSize: 16, boltLength: 75 },
    150: { flangeOD: 285, pcd: 240, boltHoles: 8, holeID: 22, thickness: 20, boltSize: 20, boltLength: 80 },
    200: { flangeOD: 340, pcd: 295, boltHoles: 12, holeID: 22, thickness: 22, boltSize: 20, boltLength: 85 },
    250: { flangeOD: 405, pcd: 355, boltHoles: 12, holeID: 26, thickness: 24, boltSize: 24, boltLength: 95 },
    300: { flangeOD: 460, pcd: 410, boltHoles: 12, holeID: 26, thickness: 24, boltSize: 24, boltLength: 95 },
    350: { flangeOD: 520, pcd: 470, boltHoles: 16, holeID: 26, thickness: 26, boltSize: 24, boltLength: 100 },
    400: { flangeOD: 580, pcd: 525, boltHoles: 16, holeID: 30, thickness: 28, boltSize: 27, boltLength: 110 },
    450: { flangeOD: 640, pcd: 585, boltHoles: 20, holeID: 30, thickness: 28, boltSize: 27, boltLength: 110 },
    500: { flangeOD: 670, pcd: 620, boltHoles: 20, holeID: 26, thickness: 32, boltSize: 24, boltLength: 115 },
    600: { flangeOD: 780, pcd: 725, boltHoles: 20, holeID: 30, thickness: 32, boltSize: 27, boltLength: 120 },
  };

  // Find closest match
  const sizes = Object.keys(flangeData).map(Number).sort((a, b) => a - b);
  let closestSize = sizes[0];
  for (const size of sizes) {
    if (size <= nominalBore) closestSize = size;
    else break;
  }

  return { specs: flangeData[closestSize] || flangeData[50], isFromApi: false };
};

const getMaterialProps = (name: string = '') => {
  const n = name.toLowerCase();
  if (n.includes('sabs 62')) return { color: '#C0C0C0', metalness: 0.4, roughness: 0.5, name: 'Galvanized Steel' };
  if (n.includes('stainless') || n.includes('304') || n.includes('316')) return { color: '#E0E0E0', metalness: 0.9, roughness: 0.15, name: 'Stainless Steel' };
  if (n.includes('pvc') || n.includes('plastic')) return { color: '#E6F2FF', metalness: 0.1, roughness: 0.9, name: 'PVC/Plastic' };
  return { color: '#1e3a5f', metalness: 0.6, roughness: 0.7, name: 'Carbon Steel' };
};

const WeldBead = ({ position, diameter }: { position: [number, number, number], diameter: number }) => {
  return (
    <mesh position={position} rotation={[0, Math.PI / 2, 0]}>
      <torusGeometry args={[diameter / 2, diameter * 0.02, 8, 32]} />
      <meshStandardMaterial color="#333" roughness={0.9} metalness={0.4} />
    </mesh>
  );
};

const SimpleFlange = ({ position, outerDiameter, holeDiameter, thickness }: { position: [number, number, number], outerDiameter: number, holeDiameter: number, thickness: number }) => {
  const flangeOD = outerDiameter * 1.6;
  const flangeRadius = flangeOD / 2;
  const boreRadius = holeDiameter / 2;

  const numHoles = outerDiameter < 0.1 ? 4 : outerDiameter < 0.25 ? 8 : 12;
  const boltCircleRadius = (flangeOD + outerDiameter) / 4;
  const boltHoleSize = thickness * 0.4;

  const boltHoles = useMemo(() => {
    const holes = [];
    for (let i = 0; i < numHoles; i++) {
      const angle = (i / numHoles) * Math.PI * 2;
      holes.push({ x: Math.cos(angle) * boltCircleRadius, z: Math.sin(angle) * boltCircleRadius });
    }
    return holes;
  }, [numHoles, boltCircleRadius]);

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[flangeRadius, flangeRadius, thickness, 32]} />
        <meshStandardMaterial color="#666" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[boreRadius, boreRadius, thickness + 0.01, 32]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, thickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boreRadius, flangeRadius, 32]} />
        <meshStandardMaterial color="#666" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -thickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boreRadius, flangeRadius, 32]} />
        <meshStandardMaterial color="#666" metalness={0.7} roughness={0.4} />
      </mesh>
      {boltHoles.map((hole, i) => (
        <mesh key={i} position={[hole.x, 0, hole.z]}>
          <cylinderGeometry args={[boltHoleSize, boltHoleSize, thickness + 0.02, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <mesh position={[0, thickness / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boreRadius * 1.1, boreRadius * 1.4, 32]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
};

// Retaining ring component for rotating flanges
const RetainingRing = ({ position, pipeOuterRadius, pipeInnerRadius, wallThickness }: {
  position: [number, number, number];
  pipeOuterRadius: number;
  pipeInnerRadius: number;
  wallThickness: number;
}) => {
  const ringOuterRadius = pipeOuterRadius * 1.15;
  const ringInnerRadius = pipeInnerRadius;
  const ringThickness = wallThickness;

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[ringOuterRadius, ringOuterRadius, ringThickness, 32]} />
        <meshStandardMaterial color="#b0b0b0" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[ringInnerRadius, ringInnerRadius, ringThickness + 0.01, 32]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

// Blank Flange component (solid disc with bolt holes, no center bore)
const BlankFlange = ({ position, outerDiameter, thickness }: { position: [number, number, number], outerDiameter: number, thickness: number }) => {
  const flangeOD = outerDiameter * 1.6;
  const flangeRadius = flangeOD / 2;
  const numHoles = outerDiameter < 0.1 ? 4 : outerDiameter < 0.25 ? 8 : 12;
  const boltCircleRadius = (flangeOD + outerDiameter) / 4;
  const boltHoleSize = thickness * 0.4;

  const boltHoles = useMemo(() => {
    const holes = [];
    for (let i = 0; i < numHoles; i++) {
      const angle = (i / numHoles) * Math.PI * 2;
      holes.push({ x: Math.cos(angle) * boltCircleRadius, z: Math.sin(angle) * boltCircleRadius });
    }
    return holes;
  }, [numHoles, boltCircleRadius]);

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[flangeRadius, flangeRadius, thickness, 32]} />
        <meshStandardMaterial color="#cc3300" metalness={0.6} roughness={0.4} />
      </mesh>
      {boltHoles.map((hole, i) => (
        <mesh key={i} position={[hole.x, 0, hole.z]}>
          <cylinderGeometry args={[boltHoleSize, boltHoleSize, thickness + 0.02, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
};

const DimensionLine = ({ start, end, label }: { start: [number, number, number], end: [number, number, number], label: string }) => {
  const p1 = new THREE.Vector3(...start);
  const p2 = new THREE.Vector3(...end);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  return (
    <group>
      <Line points={[p1, p2]} color="black" lineWidth={1} />
      <mesh position={p1} rotation={[0, 0, Math.PI / 2]}>
         <coneGeometry args={[0.04, 0.15, 8]} />
         <meshBasicMaterial color="black" />
      </mesh>
      <mesh position={p2} rotation={[0, 0, -Math.PI / 2]}>
         <coneGeometry args={[0.04, 0.15, 8]} />
         <meshBasicMaterial color="black" />
      </mesh>
      <Text position={[midX, midY + 0.15, 0]} fontSize={0.25} color="black" anchorX="center" anchorY="bottom" outlineWidth={0.01} outlineColor="white">
        {label}
      </Text>
    </group>
  );
};

const isValidNumber = (value: number): boolean => {
  return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value) && value > 0;
};

const HollowPipeScene = ({ length, outerDiameter, wallThickness, endConfiguration = 'PE', materialName, closureLengthMm = 0, addBlankFlange = false, blankFlangePositions = [] }: Pipe3DPreviewProps) => {
  const safeOD = isValidNumber(outerDiameter) ? outerDiameter : 100;
  const safeWT = isValidNumber(wallThickness) ? wallThickness : 5;
  const safeLen = isValidNumber(length) ? length : 1;

  const isInputMeters = safeLen < 50;
  const lengthSceneUnits = isInputMeters ? safeLen : safeLen / 1000;
  const safeLength = lengthSceneUnits || 1;
  const odSceneUnits = safeOD / 1000;
  const wtSceneUnits = safeWT / 1000;

  const idMm = safeOD - (2 * safeWT);
  const matProps = getMaterialProps(materialName);
  const configUpper = (endConfiguration || 'PE').toUpperCase();

  // Detect loose flanges from configuration
  // FOE_LF = Fixed End B (right) + Loose End A (left)
  // 2xLF = Loose both ends
  const hasLooseLeftFlange = configUpper === 'FOE_LF' || configUpper.includes('2xLF');
  const hasLooseRightFlange = configUpper.includes('2xLF');

  // Detect rotating flanges - R/F patterns
  // FOE_RF = Fixed End B (right) + Rotating End A (left)
  // 2X_RF = Rotating both ends
  const hasRotatingLeftFlange = configUpper === 'FOE_RF' || configUpper.includes('2X_RF');
  const hasRotatingRightFlange = configUpper.includes('2X_RF');

  // hasRightFlange = any configuration with flange on End B (right)
  // FOE, FBE, FOE_LF, FOE_RF, 2X_RF, 2xLF all have flange on right
  const hasRightFlange = configUpper.includes('FOE') || configUpper.includes('FBE') || configUpper.includes('2X_RF') || configUpper.includes('2xLF');
  // hasLeftFlange = any configuration with flange on End A (left)
  // FBE, FOE_LF, FOE_RF, 2X_RF, 2xLF all have flange on left
  const hasLeftFlange = configUpper.includes('FBE') || configUpper === 'FOE_LF' || configUpper === 'FOE_RF' || configUpper.includes('2X_RF') || configUpper.includes('2xLF');
  const flangeThickness = odSceneUnits * 0.15;

  // Closure and gap dimensions
  const closureLength = (closureLengthMm || 150) / 1000; // Convert mm to scene units
  const gapLength = 0.1; // 100mm in scene units (meters)

  const outerRadius = Math.max(0.01, odSceneUnits / 2);
  const rawInnerRadius = (odSceneUnits - (2 * wtSceneUnits)) / 2;
  const innerRadius = Math.max(0.001, Math.min(rawInnerRadius, outerRadius - 0.001));
  const halfLen = safeLength / 2;
  const offsetDist = outerRadius + 0.3;

  return (
    <group>
      {/* Hollow pipe - outer cylinder + inner bore + end caps */}
      <group rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        {/* Outer pipe surface */}
        <mesh>
          <cylinderGeometry args={[outerRadius, outerRadius, safeLength, 32, 1, true]} />
          <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} side={THREE.DoubleSide} />
        </mesh>
        {/* Inner bore - BackSide material to show dark interior */}
        <mesh>
          <cylinderGeometry args={[innerRadius, innerRadius, safeLength + 0.01, 32, 1, true]} />
          <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
        </mesh>
        {/* Left end cap ring - only if no left flange */}
        {!hasLeftFlange && (
          <mesh position={[0, -safeLength / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[innerRadius, outerRadius, 32]} />
            <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} />
          </mesh>
        )}
        {/* Right end cap ring - only if no right flange */}
        {!hasRightFlange && (
          <mesh position={[0, safeLength / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[innerRadius, outerRadius, 32]} />
            <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} />
          </mesh>
        )}
      </group>

      {/* Left flange */}
      {hasLeftFlange && (
        <>
          {hasLooseLeftFlange ? (
            <>
              {/* Hollow closure piece - simple geometry approach */}
              <group rotation={[0, 0, Math.PI / 2]} position={[-halfLen - closureLength / 2, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[outerRadius, outerRadius, closureLength, 32, 1, true]} />
                  <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry args={[innerRadius, innerRadius, closureLength + 0.01, 32, 1, true]} />
                  <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange positioned 100mm after closure piece */}
              <SimpleFlange position={[-halfLen - closureLength - gapLength, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits - (2 * wtSceneUnits)} thickness={flangeThickness} />
              {/* L/F dimension line */}
              <Line points={[[-halfLen, -outerRadius - 0.1, 0], [-halfLen - closureLength, -outerRadius - 0.1, 0]]} color="#2563eb" lineWidth={2} />
              <Line points={[[-halfLen, -outerRadius - 0.05, 0], [-halfLen, -outerRadius - 0.15, 0]]} color="#2563eb" lineWidth={1} />
              <Line points={[[-halfLen - closureLength, -outerRadius - 0.05, 0], [-halfLen - closureLength, -outerRadius - 0.15, 0]]} color="#2563eb" lineWidth={1} />
              <Text position={[-halfLen - closureLength / 2, -outerRadius - 0.22, 0]} fontSize={0.12} color="#2563eb" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap indicator */}
              <Line points={[[-halfLen - closureLength, -outerRadius - 0.25, 0], [-halfLen - closureLength - gapLength, -outerRadius - 0.25, 0]]} color="#9333ea" lineWidth={1} dashed />
              <Text position={[-halfLen - closureLength - gapLength / 2, -outerRadius - 0.35, 0]} fontSize={0.1} color="#9333ea" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
                100mm gap
              </Text>
            </>
          ) : hasRotatingLeftFlange ? (
            <>
              {/* Retaining ring welded to pipe end - prevents flange from sliding off */}
              <RetainingRing position={[-halfLen, 0, 0]} pipeOuterRadius={outerRadius} pipeInnerRadius={innerRadius} wallThickness={wtSceneUnits} />
              {/* Rotating flange positioned 80mm back from ring (on the pipe) - visible gap
                  Hole diameter is slightly larger than pipe OD to allow rotation */}
              <SimpleFlange position={[-halfLen + 0.08, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits * 1.05} thickness={flangeThickness} />
              {/* 80mm gap dimension line */}
              <Line points={[[-halfLen, -outerRadius - 0.1, 0], [-halfLen + 0.08, -outerRadius - 0.1, 0]]} color="#ea580c" lineWidth={2} />
              <Line points={[[-halfLen, -outerRadius - 0.05, 0], [-halfLen, -outerRadius - 0.15, 0]]} color="#ea580c" lineWidth={1} />
              <Line points={[[-halfLen + 0.08, -outerRadius - 0.05, 0], [-halfLen + 0.08, -outerRadius - 0.15, 0]]} color="#ea580c" lineWidth={1} />
              {/* R/F label with gap dimension */}
              <Text position={[-halfLen + 0.04, -outerRadius - 0.22, 0]} fontSize={0.1} color="#ea580c" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
                R/F
              </Text>
            </>
          ) : (
            <>
              <SimpleFlange position={[-halfLen, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits - (2 * wtSceneUnits)} thickness={flangeThickness} />
              <WeldBead position={[-halfLen + (flangeThickness/2) + 0.01, 0, 0]} diameter={odSceneUnits} />
            </>
          )}
        </>
      )}

      {/* Right flange */}
      {hasRightFlange && (
        <>
          {hasLooseRightFlange ? (
            <>
              {/* Hollow closure piece - simple geometry approach */}
              <group rotation={[0, 0, Math.PI / 2]} position={[halfLen + closureLength / 2, 0, 0]}>
                <mesh>
                  <cylinderGeometry args={[outerRadius, outerRadius, closureLength, 32, 1, true]} />
                  <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry args={[innerRadius, innerRadius, closureLength + 0.01, 32, 1, true]} />
                  <meshStandardMaterial color="#1a1a1a" side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange positioned 100mm after closure piece */}
              <SimpleFlange position={[halfLen + closureLength + gapLength, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits - (2 * wtSceneUnits)} thickness={flangeThickness} />
              {/* L/F dimension line */}
              <Line points={[[halfLen, -outerRadius - 0.1, 0], [halfLen + closureLength, -outerRadius - 0.1, 0]]} color="#2563eb" lineWidth={2} />
              <Line points={[[halfLen, -outerRadius - 0.05, 0], [halfLen, -outerRadius - 0.15, 0]]} color="#2563eb" lineWidth={1} />
              <Line points={[[halfLen + closureLength, -outerRadius - 0.05, 0], [halfLen + closureLength, -outerRadius - 0.15, 0]]} color="#2563eb" lineWidth={1} />
              <Text position={[halfLen + closureLength / 2, -outerRadius - 0.22, 0]} fontSize={0.12} color="#2563eb" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap indicator */}
              <Line points={[[halfLen + closureLength, -outerRadius - 0.25, 0], [halfLen + closureLength + gapLength, -outerRadius - 0.25, 0]]} color="#9333ea" lineWidth={1} dashed />
              <Text position={[halfLen + closureLength + gapLength / 2, -outerRadius - 0.35, 0]} fontSize={0.1} color="#9333ea" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
                100mm gap
              </Text>
            </>
          ) : hasRotatingRightFlange ? (
            <>
              {/* Retaining ring welded to pipe end - prevents flange from sliding off */}
              <RetainingRing position={[halfLen, 0, 0]} pipeOuterRadius={outerRadius} pipeInnerRadius={innerRadius} wallThickness={wtSceneUnits} />
              {/* Rotating flange positioned 80mm back from ring (on the pipe) - visible gap
                  Hole diameter is slightly larger than pipe OD to allow rotation */}
              <SimpleFlange position={[halfLen - 0.08, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits * 1.05} thickness={flangeThickness} />
              {/* 80mm gap dimension line */}
              <Line points={[[halfLen - 0.08, -outerRadius - 0.1, 0], [halfLen, -outerRadius - 0.1, 0]]} color="#ea580c" lineWidth={2} />
              <Line points={[[halfLen - 0.08, -outerRadius - 0.05, 0], [halfLen - 0.08, -outerRadius - 0.15, 0]]} color="#ea580c" lineWidth={1} />
              <Line points={[[halfLen, -outerRadius - 0.05, 0], [halfLen, -outerRadius - 0.15, 0]]} color="#ea580c" lineWidth={1} />
              {/* R/F label with gap dimension */}
              <Text position={[halfLen - 0.04, -outerRadius - 0.22, 0]} fontSize={0.1} color="#ea580c" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
                R/F
              </Text>
            </>
          ) : (
            <>
              <SimpleFlange position={[halfLen, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits - (2 * wtSceneUnits)} thickness={flangeThickness} />
              <WeldBead position={[halfLen - (flangeThickness/2) - 0.01, 0, 0]} diameter={odSceneUnits} />
            </>
          )}
        </>
      )}

      {/* Blank Flanges - positioned 50mm from the main flange */}
      {addBlankFlange && blankFlangePositions.includes('inlet') && hasLeftFlange && (
        <>
          <BlankFlange
            position={[-halfLen - flangeThickness - 0.1, 0, 0]}
            outerDiameter={odSceneUnits}
            thickness={flangeThickness}
          />
          <Text position={[-halfLen - flangeThickness - 0.05, -outerRadius - 0.15, 0]} fontSize={0.1} color="#cc3300" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
            BLANK
          </Text>
        </>
      )}
      {addBlankFlange && blankFlangePositions.includes('outlet') && hasRightFlange && (
        <>
          <BlankFlange
            position={[halfLen + flangeThickness + 0.1, 0, 0]}
            outerDiameter={odSceneUnits}
            thickness={flangeThickness}
          />
          <Text position={[halfLen + flangeThickness + 0.15, -outerRadius - 0.15, 0]} fontSize={0.1} color="#cc3300" anchorX="center" anchorY="top" outlineWidth={0.01} outlineColor="white">
            BLANK
          </Text>
        </>
      )}

      <DimensionLine start={[-halfLen, offsetDist, 0]} end={[halfLen, offsetDist, 0]} label={`${isInputMeters ? length : (length/1000).toFixed(2)}m`} />
      <Line points={[[-halfLen, 0, 0], [-halfLen, offsetDist, 0]]} color="#999" lineWidth={0.5} dashed dashScale={20} />
      <Line points={[[halfLen, 0, 0], [halfLen, offsetDist, 0]]} color="#999" lineWidth={0.5} dashed dashScale={20} />
    </group>
  );
};

const CameraRig = ({ viewMode, targets }: { viewMode: string, targets: any }) => {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();

  useFrame(() => {
    if (viewMode === 'free' || !controls) return;

    const orbit = controls as any;
    let targetPos = targets.iso.pos;
    let targetLookAt = targets.iso.lookAt;

    if (viewMode === 'inlet') {
      targetPos = targets.inlet.pos;
      targetLookAt = targets.inlet.lookAt;
    } else if (viewMode === 'outlet') {
      targetPos = targets.outlet.pos;
      targetLookAt = targets.outlet.lookAt;
    }

    camera.position.lerp(vec.set(targetPos[0], targetPos[1], targetPos[2]), 0.05);
    orbit.target.lerp(new THREE.Vector3(targetLookAt[0], targetLookAt[1], targetLookAt[2]), 0.05);
    orbit.update();
  });

  return null;
};

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
    log.debug('Pipe CameraTracker useEffect', JSON.stringify({
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
      log.debug('Pipe CameraTracker restoring camera position', JSON.stringify({
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
      log.debug('Pipe CameraTracker useFrame check', JSON.stringify({
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

          log.debug('Pipe CameraTracker setting timeout for', keyToSave);

          saveTimeoutRef.current = setTimeout(() => {
            log.debug('Pipe CameraTracker timeout fired, saving', JSON.stringify({
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

export default function Pipe3DPreview(props: Pipe3DPreviewProps) {
  const [viewMode, setViewMode] = useState(props.savedCameraPosition ? 'free' : 'iso'); //'iso', 'inlet', 'outlet', 'free'
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const debouncedProps = useDebouncedProps(props, 100);

  const isInputMeters = debouncedProps.length < 50;
  const lengthSceneUnits = isInputMeters ? debouncedProps.length : debouncedProps.length / 1000;
  const safeLen = lengthSceneUnits || 1;
  const halfLen = safeLen / 2;

  // Auto-calculate camera distance based on pipe length for better framing
  // Formula: camera distance = max(pipe length * 0.8, 2.5) to ensure good view of entire pipe
  const autoCameraDistance = Math.max(safeLen * 0.8, 2.5);
  const autoCameraHeight = autoCameraDistance * 0.4;

  const cameraTargets = {
    iso: {
      pos: [0, autoCameraHeight, autoCameraDistance],
      lookAt: [0, 0, 0]
    },
    inlet: {
      pos: [-halfLen - (safeLen * 0.3), 0, 0],
      lookAt: [-halfLen, 0, 0]
    },
    outlet: {
      pos: [halfLen + (safeLen * 0.3), 0, 0],
      lookAt: [halfLen, 0, 0]
    }
  };

  // Hidden state - show compact bar with show button
  if (isHidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border border-slate-200 px-3 py-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          3D Preview - Straight Pipe ({isInputMeters ? props.length : (props.length/1000).toFixed(2)}m)
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
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        <button
          onClick={() => setViewMode('iso')}
          className={`px-2 py-1 text-[10px] rounded border ${viewMode==='iso' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
        >
          Default View
        </button>
        <button
          onClick={() => setViewMode('inlet')}
          className={`px-2 py-1 text-[10px] rounded border ${viewMode==='inlet' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
        >
          View End A
        </button>
        <button
          onClick={() => setViewMode('outlet')}
          className={`px-2 py-1 text-[10px] rounded border ${viewMode==='outlet' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
        >
          View End B
        </button>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: cameraTargets.iso.pos as [number, number, number],
          fov: 45
        }}
      >
          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 5]} angle={0.5} penumbra={1} intensity={1} />
          <pointLight position={[-halfLen - 5, 0, 0]} intensity={0.5} />
          <pointLight position={[halfLen + 5, 0, 0]} intensity={0.5} />

          <Environment preset="sunset" />

          <HollowPipeScene {...debouncedProps} />

          <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000000" />

          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={0.5}
            maxDistance={20}
            onStart={() => setViewMode('free')}
          />

          <CameraRig viewMode={viewMode} targets={cameraTargets} />
          <CameraTracker
            onCameraChange={props.onCameraChange}
            savedPosition={props.savedCameraPosition}
            savedTarget={props.savedCameraTarget}
          />
      </Canvas>

      {/* HTML Info Box - top right corner */}
      {(() => {
          const idMm = props.outerDiameter - (2 * props.wallThickness);
          const matProps = getMaterialProps(props.materialName);
          const configUpper = (props.endConfiguration || 'PE').toUpperCase();
          const hasFlanges = configUpper !== 'PE';
          const flangeResult = hasFlanges && props.nominalBoreMm ? getFlangeSpecs(props.nominalBoreMm, props.flangeSpecs) : null;
          const flangeSpecs = flangeResult?.specs ?? null;
          const isFromApi = flangeResult?.isFromApi ?? false;

          // Check if using fallback data with non-SABS standard
          const standardName = props.flangeStandardName || 'SABS 1123';
          const isNonSabsStandard = !standardName.toLowerCase().includes('sabs') && !standardName.toLowerCase().includes('sans');
          const showFallbackWarning = hasFlanges && flangeSpecs && !isFromApi && isNonSabsStandard;

          // Check for R/F (rotating flange) or L/F (loose flange) configurations
          // These require longer bolts to accommodate the backing ring
          // Only R/F (rotating flange) configurations require backing rings
          const hasRotatingFlange = ['FOE_RF', '2X_RF'].includes(configUpper);
          const backingRingThickness = 10; // Standard backing ring thickness in mm
          const adjustedBoltLength = flangeSpecs ? flangeSpecs.boltLength + (hasRotatingFlange ? backingRingThickness : 0) : 0;

          // Calculate backing ring weight for R/F and L/F configurations
          // Ring: OD = Flange OD - 10mm, ID = Pipe OD, Thickness = 10mm
          const calculateBackingRingWeight = () => {
            if (!hasRotatingFlange || !flangeSpecs) return 0;
            const ringOD = flangeSpecs.flangeOD - 10; // mm
            const ringID = props.outerDiameter; // mm
            const ringThickness = backingRingThickness; // mm
            const steelDensity = 7.85; // kg/dm³ = g/cm³
            // Volume = π × (R²outer - R²inner) × thickness in cm³
            const volumeCm3 = Math.PI * (Math.pow(ringOD/20, 2) - Math.pow(ringID/20, 2)) * (ringThickness/10);
            return volumeCm3 * steelDensity / 1000; // kg
          };
          const backingRingWeight = calculateBackingRingWeight();

          // Count number of backing rings based on configuration
          const getBackingRingCount = () => {
            if (configUpper === 'FOE_RF') return 1;
            if (configUpper === '2X_RF') return 2;
            return 0;
          };
          const backingRingCount = getBackingRingCount();

          // Get flange config label
          const getFlangeConfigLabel = (config: string) => {
            switch (config) {
              case 'FOE': return 'Fixed One End';
              case 'FBE': return 'Flanged Both Ends';
              case 'FOE_LF': return 'Fixed + Loose Flange';
              case 'FOE_RF': return 'Fixed + Rotating Flange';
              case '2X_RF': return '2x Rotating Flanges';
              case '2xLF': return 'Loose Flanges Both Ends';
              default: return 'Plain Ended';
            }
          };

          return (
            <div className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md leading-snug border border-gray-200">
              <div className="font-bold text-blue-800 mb-0.5">PIPE</div>
              <div className="text-gray-900 font-medium">OD: {props.outerDiameter.toFixed(0)}mm | ID: {idMm.toFixed(0)}mm</div>
              <div className="text-gray-700">WT: {props.wallThickness}mm</div>
              <div className="text-blue-600 font-medium">{matProps.name}</div>

              {hasFlanges && (
                <>
                  <div className="font-bold text-blue-800 mt-1 mb-0.5">FLANGE ({configUpper})</div>
                  <div className="text-gray-600 text-[9px]">{getFlangeConfigLabel(configUpper)}</div>
                  {showFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {standardName} - showing SABS 1123 reference values
                    </div>
                  )}
                  {flangeSpecs && (
                    <>
                      <div className="text-gray-900 font-medium">OD: {flangeSpecs.flangeOD}mm | PCD: {flangeSpecs.pcd}mm</div>
                      <div className="text-gray-700">Holes: {flangeSpecs.boltHoles} × Ø{flangeSpecs.holeID}mm</div>
                      <div className="text-gray-700">Bolts: {flangeSpecs.boltHoles} × M{flangeSpecs.boltSize} × {adjustedBoltLength}mm</div>
                      <div className="text-gray-700">Thickness: {flangeSpecs.thickness}mm</div>
                      <div className={showFallbackWarning ? "text-orange-600 font-medium" : "text-green-700 font-medium"}>
                        {(() => {
                          const designation = props.pressureClassDesignation || '';
                          const flangeType = props.flangeTypeCode || '';
                          const pressureMatch = designation.match(/^(\d+)/);
                          const pressureValue = pressureMatch ? pressureMatch[1] : designation.replace(/\/\d+$/, '');
                          return `${standardName} T${pressureValue}${flangeType}`;
                        })()}
                      </div>
                      {backingRingCount > 0 && (
                        <div className="text-purple-700 font-medium mt-0.5">
                          Backing Ring: {backingRingCount} × {backingRingWeight.toFixed(2)}kg
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          );
      })()}

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

      {/* Expanded Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-slate-100 rounded-lg overflow-hidden">
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
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.5, 5], fov: 45 }}>
              <ambientLight intensity={0.8} />
              <spotLight position={[10, 10, 5]} angle={0.5} penumbra={1} intensity={1} />
              <pointLight position={[-halfLen - 5, 0, 0]} intensity={0.5} />
              <pointLight position={[halfLen + 5, 0, 0]} intensity={0.5} />
              <Environment preset="sunset" />
              <HollowPipeScene {...debouncedProps} />
              <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000000" />
              <OrbitControls makeDefault enablePan={true} minDistance={0.3} maxDistance={30} />
              <CameraTracker
                onCameraChange={props.onCameraChange}
                savedPosition={props.savedCameraPosition}
                savedTarget={props.savedCameraTarget}
              />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg">
              <div className="font-semibold text-gray-800 mb-1">Straight Pipe</div>
              <div className="text-gray-600">
                Length: {isInputMeters ? props.length : (props.length/1000).toFixed(2)}m | OD: {props.outerDiameter}mm | WT: {props.wallThickness}mm
              </div>
              <div className="text-gray-600 mt-1">
                Config: {props.endConfiguration || 'PE'}
              </div>
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
