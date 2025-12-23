'use client';

import React, { useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Text, Line, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Pipe3DPreviewProps {
  length: number;
  outerDiameter: number;
  wallThickness: number;
  endConfiguration?: string;
  materialName?: string;
}

const getMaterialProps = (name: string = '') => {
  const n = name.toLowerCase();
  if (n.includes('sabs 62')) return { color: '#C0C0C0', metalness: 0.4, roughness: 0.5, name: 'Galvanized Steel' };
  if (n.includes('stainless') || n.includes('304') || n.includes('316')) return { color: '#E0E0E0', metalness: 0.9, roughness: 0.15, name: 'Stainless Steel' };
  if (n.includes('pvc') || n.includes('plastic')) return { color: '#E6F2FF', metalness: 0.1, roughness: 0.9, name: 'PVC/Plastic' };
  return { color: '#4A4A4A', metalness: 0.6, roughness: 0.7, name: 'Carbon Steel' };
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

  //Calculate simulated bolt holes
  //Heuristic: 4 holes for small pipes, 8 for medium, 12 for large
  const numHoles = outerDiameter < 0.1 ? 4 : outerDiameter < 0.25 ? 8 : 12;
  const boltCircleRadius = (flangeOD + outerDiameter) / 4; //Midpoint between OD and Pipe OD
  const boltHoleSize = thickness * 0.4;

  // Generate Hole Positions
  const holes = useMemo(() => {
    const holeMeshes = [];
    for (let i = 0; i < numHoles; i++) {
      const angle = (i / numHoles) * Math.PI * 2;
      const x = Math.cos(angle) * boltCircleRadius;
      const y = Math.sin(angle) * boltCircleRadius;
      holeMeshes.push(
        <mesh key={i} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
           {/* Cylinder representing the hole (colored dark grey to look empty) */}
           <cylinderGeometry args={[boltHoleSize, boltHoleSize, thickness * 1.05, 8]} />
           <meshBasicMaterial color="#222" />
        </mesh>
      );
    }
    return holeMeshes;
  }, [numHoles, boltCircleRadius, boltHoleSize, thickness]);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeOD / 2, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, holeDiameter / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const extrudeSettings = { depth: thickness, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, curveSegments: 32 };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.center();
    return geo;
  }, [flangeOD, holeDiameter, thickness]);

  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      {/* The Flange Disk */}
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#666" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* The Simulated Bolt Holes */}
      {holes}
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

const HollowPipeScene = ({ length, outerDiameter, wallThickness, endConfiguration = 'PE', materialName }: Pipe3DPreviewProps) => {
  const isInputMeters = length < 50;
  const lengthSceneUnits = isInputMeters ? length : length / 1000;
  const safeLength = lengthSceneUnits || 1;
  const odSceneUnits = (outerDiameter || 100) / 1000;
  const wtSceneUnits = (wallThickness || 5) / 1000;

  const idMm = outerDiameter - (2 * wallThickness);
  const matProps = getMaterialProps(materialName);
  const configUpper = (endConfiguration || 'PE').toUpperCase();
  const hasRightFlange = configUpper.includes('FOE') || configUpper.includes('FBE') || configUpper.includes('2') || configUpper.includes('R/F');
  const hasLeftFlange = configUpper.includes('FBE') || configUpper.includes('2') || configUpper.includes('+');
  const flangeThickness = odSceneUnits * 0.15;

  const geometry = useMemo(() => {
    const outerRadius = odSceneUnits / 2;
    const innerRadius = Math.max(0, (odSceneUnits - (2 * wtSceneUnits)) / 2);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, Math.max(0.0001, innerRadius), 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: safeLength, bevelEnabled: false, curveSegments: 32 });
  }, [safeLength, odSceneUnits, wtSceneUnits]);

  const halfLen = safeLength / 2;
  const radius = odSceneUnits / 2;
  const offsetDist = radius + 0.3;

  return (
    <group>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfLen, 0, 0]} geometry={geometry}>
        <meshStandardMaterial color={matProps.color} metalness={matProps.metalness} roughness={matProps.roughness} />
      </mesh>

      {hasLeftFlange && (
        <>
          <SimpleFlange position={[-halfLen, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits - (2 * wtSceneUnits)} thickness={flangeThickness} />
          <WeldBead position={[-halfLen + (flangeThickness/2) + 0.01, 0, 0]} diameter={odSceneUnits} />
        </>
      )}

      {hasRightFlange && (
        <>
          <SimpleFlange position={[halfLen, 0, 0]} outerDiameter={odSceneUnits} holeDiameter={odSceneUnits - (2 * wtSceneUnits)} thickness={flangeThickness} />
          <WeldBead position={[halfLen - (flangeThickness/2) - 0.01, 0, 0]} diameter={odSceneUnits} />
        </>
      )}

      <DimensionLine start={[-halfLen, offsetDist, 0]} end={[halfLen, offsetDist, 0]} label={`${isInputMeters ? length : (length/1000).toFixed(2)}m`} />
      <Line points={[[-halfLen, 0, 0], [-halfLen, offsetDist, 0]]} color="#999" lineWidth={0.5} dashed dashScale={20} />
      <Line points={[[halfLen, 0, 0], [halfLen, offsetDist, 0]]} color="#999" lineWidth={0.5} dashed dashScale={20} />

      <group position={[halfLen + 0.1, 0, 0]}>
          <Text position={[0, radius + 0.05, 0]} fontSize={0.18} color="#444" anchorX="left" anchorY="bottom">{`OD: ${outerDiameter}mm`}</Text>
          <Text position={[0, -radius - 0.05, 0]} fontSize={0.18} color="#444" anchorX="left" anchorY="top">{`ID: ${idMm.toFixed(1)}mm`}</Text>
          <Text position={[0, -radius - 0.25, 0]} fontSize={0.15} color="#666" anchorX="left" anchorY="top">{`WT: ${wallThickness}mm`}</Text>
          <Text position={[0, -radius - 0.45, 0]} fontSize={0.15} color="#0066cc" anchorX="left" anchorY="top">{matProps.name}</Text>
      </group>
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

    camera.position.lerp(vec.set(...targetPos), 0.05);
    orbit.target.lerp(new THREE.Vector3(...targetLookAt), 0.05);
    orbit.update();
  });

  return null;
};

export default function Pipe3DPreview(props: Pipe3DPreviewProps) {
  const [viewMode, setViewMode] = useState('iso'); //'iso', 'inlet', 'outlet', 'free'

  const isInputMeters = props.length < 50;
  const lengthSceneUnits = isInputMeters ? props.length : props.length / 1000;
  const safeLen = lengthSceneUnits || 1;
  const halfLen = safeLen / 2;

  const cameraTargets = {
    iso: { pos: [0, 1.5, 5], lookAt: [0, 0, 0] },
    inlet: {
      //adjust - val or default zoom level
      pos: [-halfLen - 0, 0, 0],
      lookAt: [-halfLen, 0, 0]
    },
    outlet: {
      //adjust - val or default zoom level
      pos: [halfLen + 0, 0, 0],
      lookAt: [halfLen, 0, 0]
    }
  };

  return (
    <div className="relative w-full mb-4">
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

      <div className="h-64 w-full bg-slate-50 rounded-md border border-slate-200 overflow-hidden relative">
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.5, 5], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 5]} angle={0.5} penumbra={1} intensity={1} />
          <pointLight position={[-halfLen - 5, 0, 0]} intensity={0.5} />
          <pointLight position={[halfLen + 5, 0, 0]} intensity={0.5} />

          <Environment preset="city" />

          <HollowPipeScene {...props} />

          <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000000" />

          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={0.5}
            maxDistance={20}
            onStart={() => setViewMode('free')}
          />

          <CameraRig viewMode={viewMode} targets={cameraTargets} />
        </Canvas>

        <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded shadow-sm">
          Drag to Rotate
        </div>
      </div>
    </div>
  );
}
