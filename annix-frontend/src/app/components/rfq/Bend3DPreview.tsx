'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, Text, Line, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

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
}

//1. Helper: Estimate WT if exact mm is missing
const estimateWallThickness = (nb: number, schedule: string = '40', currentWt: number) => {
  //If we have a real value > 1mm, trust it.
  if (currentWt && currentWt > 1) return currentWt;

  //Otherwise estimate based on Schedule (simplified standards)
  const s = schedule.toUpperCase();
  const isSch80 = s.includes('80') || s.includes('XS');
  const isSch160 = s.includes('160') || s.includes('XXS');

  //Base thickness approx factor (NB * 0.05 is roughly Sch40)
  let factor = 0.055;
  if (isSch80) factor = 0.085;
  if (isSch160) factor = 0.12;

  return Math.max(2, nb * factor);
};

const getMaterialProps = (name: string = '') => {
  const n = name.toLowerCase();
  if (n.includes('sabs 62')) return { color: '#C0C0C0', metalness: 0.4, roughness: 0.5, name: 'Galvanized' };
  if (n.includes('stainless')) return { color: '#E0E0E0', metalness: 0.9, roughness: 0.15, name: 'Stainless' };
  if (n.includes('pvc')) return { color: '#E6F2FF', metalness: 0.1, roughness: 0.9, name: 'PVC' };
  return { color: '#4A4A4A', metalness: 0.6, roughness: 0.7, name: 'Carbon Steel' };
};

//CURVE & SHAPE LOGIC
class ArcCurve3 extends THREE.Curve<THREE.Vector3> {
  radius: number; startAngle: number; endAngle: number;
  constructor(radius: number, startAngle: number, endAngle: number) {
    super(); this.radius = radius || 1; this.startAngle = startAngle; this.endAngle = endAngle;
  }
  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    const angle = this.startAngle + t * (this.endAngle - this.startAngle);
    return optionalTarget.set(this.radius * Math.cos(angle), this.radius * Math.sin(angle), 0);
  }
}

const createRingShape = (outerRadius: number, innerRadius: number) => {
  const safeOuter = Math.max(0.002, outerRadius);
  const safeInner = Math.min(Math.max(0, innerRadius), safeOuter - 0.001);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, safeOuter, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, Math.max(0.0001, safeInner), 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
};

//GEOMETRY COMPONENTS
const HollowBendArc = ({ bendRadius, outerRadius, innerRadius, angleRad, material }: any) => {
  const geometry = useMemo(() => {
    if (!bendRadius || bendRadius <= 0) return null;
    const path = new ArcCurve3(bendRadius, 0, angleRad);
    const shape = createRingShape(outerRadius, innerRadius);
    const extrudeSettings = { steps: 24, curveSegments: 24, extrudePath: path, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [bendRadius, outerRadius, innerRadius, angleRad]);

  if (!geometry) return null;
  return <mesh geometry={geometry}><meshStandardMaterial {...material} /></mesh>;
};

const HollowTangentPipe = ({ length, outerRadius, innerRadius, material }: any) => {
  const geometry = useMemo(() => {
    if (!length || length < 0.01 || isNaN(length)) return null;
    const shape = createRingShape(outerRadius, innerRadius);
    const extrudeSettings = { depth: length, bevelEnabled: false, curveSegments: 24 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [length, outerRadius, innerRadius]);

  if (!geometry) return null;
  return <mesh geometry={geometry}><meshStandardMaterial {...material} /></mesh>;
};

//--- DIMENSION LINES ---
const DimensionLine = ({ start, end, label, color = "black" }: any) => {
  const p1 = new THREE.Vector3(...start);
  const p2 = new THREE.Vector3(...end);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  return (
    <group>
      <Line points={[p1, p2]} color={color} lineWidth={1} />
      <Text position={[midX, midY, 0]} fontSize={0.2} color={color} anchorX="center" anchorY="center" outlineWidth={0.02} outlineColor="white">
        {label}
      </Text>
    </group>
  );
};

//main scene
const BendScene = ({ nominalBore, outerDiameter, wallThickness, bendAngle, bendType, tangent1 = 0, tangent2 = 0, materialName, schedule = '40' }: Bend3DPreviewProps) => {
  const scaleFactor = 100;

  //1. Calculate Dimensions
  const nb = (nominalBore || 50) / scaleFactor;
  //Estimate WT instantly based on schedule if exact mm is missing
  const estimatedWt = estimateWallThickness(nominalBore, schedule, wallThickness);

  const odRaw = outerDiameter || (nominalBore * 1.1) || 60;
  const od = odRaw / scaleFactor;
  const wt = estimatedWt / scaleFactor;
  const idRaw = odRaw - (2 * estimatedWt);

  const outerRadius = od / 2;
  const innerRadius = (od - (2 * wt)) / 2;
  const angleRad = ((bendAngle || 90) * Math.PI) / 180;

  //Bend Radius (R)
  let multiplier = 1.5;
  if (bendType?.includes('2D')) multiplier = 2;
  if (bendType?.includes('3D')) multiplier = 3;
  if (bendType?.includes('5D')) multiplier = 5;
  const bendRadius = Math.max(nb * multiplier, outerRadius + 0.01);

  const matProps = getMaterialProps(materialName);
  const t1 = (tangent1 || 0) / scaleFactor;
  const t2 = (tangent2 || 0) / scaleFactor;

  //Coordinates for endpoints
  //Start Point (P1) -> Bend Start (P2) -> Bend End (P3) -> End Point (P4)
  //We assume Bend Start is at (bendRadius, 0, 0) relative to pivot

  //Tangent 1 Length vector (downwards/backwards from start)
  const tan1Start = new THREE.Vector3(bendRadius, -t1, 0);
  const bendStart = new THREE.Vector3(bendRadius, 0, 0);

  const bendEnd = new THREE.Vector3(bendRadius * Math.cos(angleRad), bendRadius * Math.sin(angleRad), 0);
  const t2Vec = new THREE.Vector3(-Math.sin(angleRad), Math.cos(angleRad), 0).multiplyScalar(t2);
  const finalEnd = bendEnd.clone().add(t2Vec);

  const halfAngle = angleRad / 2;
  const labelDistance = Math.max(0, bendRadius - outerRadius - 0.5);

  const labelPos = new THREE.Vector3(
    labelDistance * Math.cos(halfAngle),
    labelDistance * Math.sin(halfAngle),
    0
  );

  return (
    <Center>
      <group>
        <HollowBendArc bendRadius={bendRadius} outerRadius={outerRadius} innerRadius={innerRadius} angleRad={angleRad} material={matProps} />

        {t1 > 0 && (
          <group position={[bendRadius, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
             <HollowTangentPipe length={t1} outerRadius={outerRadius} innerRadius={innerRadius} material={matProps} />
          </group>
        )}

        {t2 > 0 && (
          <group position={[bendEnd.x, bendEnd.y, 0]} rotation={[0, 0, angleRad]}>
             <group rotation={[-Math.PI / 2, 0, 0]}>
                 <HollowTangentPipe length={t2} outerRadius={outerRadius} innerRadius={innerRadius} material={matProps} />
             </group>
          </group>
        )}

        <Text
          position={labelPos}
          fontSize={0.25}
          color="#0066cc"
          anchorX="center"
          anchorY="middle"
        >
             {`R = ${multiplier}D`}
        </Text>

        <group position={[bendRadius - outerRadius - 0.8, -0.2, 0]}>
           <Text position={[0, 0, 0]} fontSize={0.18} color="#333" anchorX="right" anchorY="bottom">{`OD: ${odRaw.toFixed(1)}`}</Text>
           <Text position={[0, -0.25, 0]} fontSize={0.18} color="#333" anchorX="right" anchorY="bottom">{`ID: ${idRaw.toFixed(1)}`}</Text>
           <Text position={[0, -0.5, 0]} fontSize={0.18} color={schedule !== '40' ? "#d97706" : "#666"} anchorX="right" anchorY="bottom">{`${schedule} (${estimatedWt.toFixed(1)}mm)`}</Text>
        </group>

        {/* Centerlines */}
        <Line points={[[0,0,0], [bendRadius, 0, 0]]} color="#ccc" lineWidth={0.5} dashed dashScale={5} />
        <Line points={[[0,0,0], [bendEnd.x, bendEnd.y, 0]]} color="#ccc" lineWidth={0.5} dashed dashScale={5} />

        {/* Tangent Labels */}
        {t1 > 0 && (
           <Text position={[bendRadius + outerRadius + 0.5, -t1/2, 0]} fontSize={0.2} color="#666" rotation={[0,0,Math.PI/2]}>
             {`${(tangent1||0).toFixed(0)}mm`}
           </Text>
        )}
        {t2 > 0 && (
           <Text position={[finalEnd.x, finalEnd.y + 0.5, 0]} fontSize={0.2} color="#666">
             {`${(tangent2||0).toFixed(0)}mm`}
           </Text>
        )}

      </group>
    </Center>
  );
};

export default function Bend3DPreview(props: Bend3DPreviewProps) {
  return (
    <div className="h-64 w-full bg-slate-50 rounded-md border border-slate-200 overflow-hidden relative mb-4">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={1} />
        <Environment preset="city" />
        <BendScene {...props} />
        <ContactShadows position={[0, -6, 0]} opacity={0.3} scale={30} blur={2.5} far={10} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={2}
          maxDistance={40}
        />
      </Canvas>
      <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded shadow-sm">
        Drag to Rotate
      </div>
    </div>
  );
}
