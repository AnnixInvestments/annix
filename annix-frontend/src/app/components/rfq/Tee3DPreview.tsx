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

interface Tee3DPreviewProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness?: number;
  teeType: Sabs719TeeType; // 'short' or 'gusset'
  branchNominalBore?: number; // For reducing tees (optional)
  branchOuterDiameter?: number;
  runLength?: number; // Total length of run pipe (optional)
  materialName?: string;
  hasInletFlange?: boolean;
  hasOutletFlange?: boolean;
  hasBranchFlange?: boolean;
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
    hasInletFlange = false,
    hasOutletFlange = false,
    hasBranchFlange = false,
  } = props;

  // Get dimensions from SABS 719 data
  const dims = getSabs719TeeDimensions(nominalBore);
  const teeHeight = getTeeHeight(nominalBore, teeType);
  const gussetSection = teeType === 'gusset' ? getGussetSection(nominalBore) : 0;

  // Calculate dimensions
  const od = outerDiameter || dims?.outsideDiameterMm || nominalBore * 1.1;
  const wt = wallThickness || Math.max(6, od * 0.03);
  const id = od - (2 * wt);
  const branchOD = branchOuterDiameter || od; // Same as run for equal tee
  const branchID = branchOD - (2 * wt);

  // Scale factor for 3D scene (convert mm to scene units)
  const scaleFactor = 100;
  const outerRadius = (od / scaleFactor) / 2;
  const innerRadius = (id / scaleFactor) / 2;
  const branchOuterRadius = (branchOD / scaleFactor) / 2;
  const branchInnerRadius = (branchID / scaleFactor) / 2;
  const height = teeHeight / scaleFactor;
  const gussetSize = gussetSection / scaleFactor;

  // Run pipe length (default to 3x the OD)
  const halfRunLength = (runLength || od * 3) / scaleFactor / 2;

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

        {/* Branch pipe (vertical, going up) */}
        <mesh
          position={[0, outerRadius, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <primitive object={createPipeGeometry(branchOuterRadius, branchInnerRadius, height - outerRadius)} attach="geometry" />
          <meshStandardMaterial color="#b0b0b0" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Reinforcement collar at branch junction */}
        <mesh position={[0, outerRadius - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[branchOuterRadius + 0.02, 0.05, 16, 32]} />
          <meshStandardMaterial color="#808080" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Gusset plates for Gusset Tees */}
        {teeType === 'gusset' && gussetSize > 0 && (
          <>
            {/* Front gusset */}
            <GussetPlate
              position={[branchOuterRadius + gussetThickness / 2, outerRadius, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              size={gussetSize}
              thickness={gussetThickness}
            />
            {/* Back gusset */}
            <GussetPlate
              position={[-branchOuterRadius - gussetThickness / 2, outerRadius, 0]}
              rotation={[0, Math.PI / 2, 0]}
              size={gussetSize}
              thickness={gussetThickness}
            />
            {/* Left gusset */}
            <GussetPlate
              position={[0, outerRadius, branchOuterRadius + gussetThickness / 2]}
              rotation={[0, Math.PI, 0]}
              size={gussetSize}
              thickness={gussetThickness}
            />
            {/* Right gusset */}
            <GussetPlate
              position={[0, outerRadius, -branchOuterRadius - gussetThickness / 2]}
              rotation={[0, 0, 0]}
              size={gussetSize}
              thickness={gussetThickness}
            />
          </>
        )}

        {/* Inlet flange (left side of run) */}
        {hasInletFlange && (
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

        {/* Outlet flange (right side of run) */}
        {hasOutletFlange && (
          <FlangeComponent
            position={[halfRunLength, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
            innerDiameter={id / scaleFactor}
            thickness={runFlangeSpecs.thickness / scaleFactor}
            pcd={runFlangeSpecs.pcd / scaleFactor}
            boltHoles={runFlangeSpecs.boltHoles}
            holeID={runFlangeSpecs.holeID / scaleFactor}
          />
        )}

        {/* Branch flange (top of branch) */}
        {hasBranchFlange && (
          <FlangeComponent
            position={[0, height, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
            innerDiameter={branchID / scaleFactor}
            thickness={branchFlangeSpecs.thickness / scaleFactor}
            pcd={branchFlangeSpecs.pcd / scaleFactor}
            boltHoles={branchFlangeSpecs.boltHoles}
            holeID={branchFlangeSpecs.holeID / scaleFactor}
          />
        )}

        {/* Dimension lines */}
        {/* Height dimension (vertical) */}
        <Line
          points={[[halfRunLength + 0.5, 0, 0], [halfRunLength + 0.5, height, 0]]}
          color="#dc2626"
          lineWidth={2}
        />
        <Line
          points={[[halfRunLength + 0.3, 0, 0], [halfRunLength + 0.6, 0, 0]]}
          color="#dc2626"
          lineWidth={1}
        />
        <Line
          points={[[halfRunLength + 0.3, height, 0], [halfRunLength + 0.6, height, 0]]}
          color="#dc2626"
          lineWidth={1}
        />
        <Text
          position={[halfRunLength + 0.7, height / 2, 0]}
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

        {/* Gusset dimension for gusset tees */}
        {teeType === 'gusset' && gussetSize > 0 && (
          <>
            <Line
              points={[
                [branchOuterRadius + gussetThickness, outerRadius, 0.3],
                [branchOuterRadius + gussetThickness + gussetSize, outerRadius, 0.3]
              ]}
              color="#0066cc"
              lineWidth={2}
            />
            <Text
              position={[branchOuterRadius + gussetThickness + gussetSize / 2, outerRadius - 0.15, 0.3]}
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
  const od = props.outerDiameter || dims?.outsideDiameterMm || props.nominalBore * 1.1;
  const wt = props.wallThickness || Math.max(6, od * 0.03);
  const id = od - (2 * wt);
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
        <div className="font-semibold text-purple-700 mb-0.5">TEE</div>
        <div className="text-gray-700">OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm</div>
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
