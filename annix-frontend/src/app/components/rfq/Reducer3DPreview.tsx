"use client";

import { Center, ContactShadows, Environment, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { BlankFlange, Flange, RetainingRing, RotatingFlange } from "@/app/components/rfq/3d";
import { FLANGE_DATA } from "@/app/lib/3d/flangeData";
import {
  FLANGE_MATERIALS,
  GEOMETRY_CONSTANTS,
  LIGHTING_CONFIG,
  outerDiameterFromNB,
  PIPE_MATERIALS,
  SCENE_CONSTANTS,
  WELD_MATERIALS,
  wallThicknessFromNB,
} from "@/app/lib/config/rfq/rendering3DStandards";

const SCALE_FACTOR = GEOMETRY_CONSTANTS.SCALE;
const PREVIEW_SCALE = SCENE_CONSTANTS.PREVIEW_SCALE;
const MIN_CAMERA_DISTANCE = SCENE_CONSTANTS.MIN_CAMERA_DISTANCE;
const MAX_CAMERA_DISTANCE = SCENE_CONSTANTS.MAX_CAMERA_DISTANCE;

const pipeOuterMat = PIPE_MATERIALS.outer;
const pipeInnerMat = PIPE_MATERIALS.inner;
const pipeEndMat = PIPE_MATERIALS.end;
const weldColor = WELD_MATERIALS.standard;
const flangeColor = FLANGE_MATERIALS.standard;

type ReducerType = "CONCENTRIC" | "ECCENTRIC";
type FlangeType = "fixed" | "loose" | "rotating" | null;

interface Reducer3DPreviewProps {
  largeNominalBore: number;
  smallNominalBore: number;
  largeDiameterMm?: number;
  smallDiameterMm?: number;
  lengthMm: number;
  wallThickness?: number;
  reducerType: ReducerType;
  hasLargeEndFlange?: boolean;
  hasSmallEndFlange?: boolean;
  largeEndFlangeType?: FlangeType;
  smallEndFlangeType?: FlangeType;
  hasBlankLargeEnd?: boolean;
  hasBlankSmallEnd?: boolean;
}

function ConcentricReducerGeometry({
  largeOuterRadius,
  smallOuterRadius,
  largeInnerRadius,
  smallInnerRadius,
  length,
}: {
  largeOuterRadius: number;
  smallOuterRadius: number;
  largeInnerRadius: number;
  smallInnerRadius: number;
  length: number;
}) {
  const outerGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(
      smallOuterRadius,
      largeOuterRadius,
      length,
      64,
      1,
      true,
    );
    return geometry;
  }, [largeOuterRadius, smallOuterRadius, length]);

  const innerGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(
      smallInnerRadius,
      largeInnerRadius,
      length,
      64,
      1,
      true,
    );
    return geometry;
  }, [largeInnerRadius, smallInnerRadius, length]);

  const largeEndCapGeometry = useMemo(() => {
    return new THREE.RingGeometry(largeInnerRadius, largeOuterRadius, 64);
  }, [largeInnerRadius, largeOuterRadius]);

  const smallEndCapGeometry = useMemo(() => {
    return new THREE.RingGeometry(smallInnerRadius, smallOuterRadius, 64);
  }, [smallInnerRadius, smallOuterRadius]);

  return (
    <group>
      <mesh geometry={outerGeometry} castShadow receiveShadow>
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={innerGeometry}>
        <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
      </mesh>
      <mesh
        geometry={largeEndCapGeometry}
        position={[0, -length / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={smallEndCapGeometry}
        position={[0, length / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function EccentricReducerGeometry({
  largeOuterRadius,
  smallOuterRadius,
  largeInnerRadius,
  smallInnerRadius,
  length,
}: {
  largeOuterRadius: number;
  smallOuterRadius: number;
  largeInnerRadius: number;
  smallInnerRadius: number;
  length: number;
}) {
  const offset = largeOuterRadius - smallOuterRadius;

  const outerGeometry = useMemo(() => {
    const segments = 64;
    const heightSegments = 1;

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    for (let h = 0; h <= heightSegments; h++) {
      const t = h / heightSegments;
      const y = -length / 2 + t * length;
      const radius = largeOuterRadius + (smallOuterRadius - largeOuterRadius) * t;
      const xOffset = t * offset;

      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const x = Math.cos(theta) * radius - xOffset;
        const z = Math.sin(theta) * radius;

        positions.push(x, y, z);

        const nx = Math.cos(theta);
        const nz = Math.sin(theta);
        const slopeAngle = Math.atan2(largeOuterRadius - smallOuterRadius, length);
        const ny = Math.sin(slopeAngle);
        const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
      }
    }

    for (let h = 0; h < heightSegments; h++) {
      for (let s = 0; s < segments; s++) {
        const a = h * (segments + 1) + s;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    return geometry;
  }, [largeOuterRadius, smallOuterRadius, length, offset]);

  const innerGeometry = useMemo(() => {
    const segments = 64;
    const heightSegments = 1;

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    for (let h = 0; h <= heightSegments; h++) {
      const t = h / heightSegments;
      const y = -length / 2 + t * length;
      const radius = largeInnerRadius + (smallInnerRadius - largeInnerRadius) * t;
      const xOffset = t * offset;

      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        const x = Math.cos(theta) * radius - xOffset;
        const z = Math.sin(theta) * radius;

        positions.push(x, y, z);

        const nx = -Math.cos(theta);
        const nz = -Math.sin(theta);
        normals.push(nx, 0, nz);
      }
    }

    for (let h = 0; h < heightSegments; h++) {
      for (let s = 0; s < segments; s++) {
        const a = h * (segments + 1) + s;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    return geometry;
  }, [largeInnerRadius, smallInnerRadius, length, offset]);

  const largeEndCapGeometry = useMemo(() => {
    return new THREE.RingGeometry(largeInnerRadius, largeOuterRadius, 64);
  }, [largeInnerRadius, largeOuterRadius]);

  const smallEndCapGeometry = useMemo(() => {
    return new THREE.RingGeometry(smallInnerRadius, smallOuterRadius, 64);
  }, [smallInnerRadius, smallOuterRadius]);

  return (
    <group>
      <mesh geometry={outerGeometry} castShadow receiveShadow>
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={innerGeometry}>
        <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
      </mesh>
      <mesh
        geometry={largeEndCapGeometry}
        position={[0, -length / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={smallEndCapGeometry}
        position={[-offset, length / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function ReducerScene({
  largeNominalBore,
  smallNominalBore,
  largeDiameterMm,
  smallDiameterMm,
  lengthMm,
  wallThickness,
  reducerType,
  hasLargeEndFlange = false,
  hasSmallEndFlange = false,
  largeEndFlangeType = "fixed",
  smallEndFlangeType = "fixed",
  hasBlankLargeEnd = false,
  hasBlankSmallEnd = false,
}: Reducer3DPreviewProps) {
  const largeOD = largeDiameterMm ?? outerDiameterFromNB(largeNominalBore);
  const smallOD = smallDiameterMm ?? outerDiameterFromNB(smallNominalBore);
  const wt = wallThickness ?? wallThicknessFromNB(largeNominalBore);

  const largeOuterRadius = largeOD / SCALE_FACTOR / 2;
  const smallOuterRadius = smallOD / SCALE_FACTOR / 2;
  const largeInnerRadius = (largeOD - 2 * wt) / SCALE_FACTOR / 2;
  const smallInnerRadius = (smallOD - 2 * wt) / SCALE_FACTOR / 2;
  const length = lengthMm / SCALE_FACTOR;

  const offset = reducerType === "ECCENTRIC" ? largeOuterRadius - smallOuterRadius : 0;

  const largeFlangeData = FLANGE_DATA[largeNominalBore] || FLANGE_DATA[200];
  const smallFlangeData = FLANGE_DATA[smallNominalBore] || FLANGE_DATA[200];
  const largeFlangeThickness = largeFlangeData.thickness / SCALE_FACTOR;
  const smallFlangeThickness = smallFlangeData.thickness / SCALE_FACTOR;

  const weldTubeRadius = largeOuterRadius * 0.06;

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {reducerType === "CONCENTRIC" ? (
        <ConcentricReducerGeometry
          largeOuterRadius={largeOuterRadius}
          smallOuterRadius={smallOuterRadius}
          largeInnerRadius={largeInnerRadius}
          smallInnerRadius={smallInnerRadius}
          length={length}
        />
      ) : (
        <EccentricReducerGeometry
          largeOuterRadius={largeOuterRadius}
          smallOuterRadius={smallOuterRadius}
          largeInnerRadius={largeInnerRadius}
          smallInnerRadius={smallInnerRadius}
          length={length}
        />
      )}

      {hasLargeEndFlange && largeEndFlangeType === "fixed" && (
        <Flange
          center={new THREE.Vector3(0, -length / 2 - largeFlangeThickness / 2, 0)}
          normal={new THREE.Vector3(0, -1, 0)}
          pipeR={largeOuterRadius}
          innerR={largeInnerRadius}
          nb={largeNominalBore}
        />
      )}

      {hasLargeEndFlange && largeEndFlangeType === "rotating" && (
        <>
          <RotatingFlange
            center={new THREE.Vector3(0, -length / 2 - largeFlangeThickness / 2, 0)}
            normal={new THREE.Vector3(0, -1, 0)}
            pipeR={largeOuterRadius}
            innerR={largeInnerRadius}
            nb={largeNominalBore}
          />
          <RetainingRing
            center={new THREE.Vector3(0, -length / 2 - 0.05, 0)}
            normal={new THREE.Vector3(0, -1, 0)}
            pipeR={largeOuterRadius}
            innerR={largeInnerRadius}
            wallThickness={wt / SCALE_FACTOR}
          />
        </>
      )}

      {hasBlankLargeEnd && (
        <BlankFlange
          center={new THREE.Vector3(0, -length / 2 - largeFlangeThickness - 0.02, 0)}
          normal={new THREE.Vector3(0, -1, 0)}
          pipeR={largeOuterRadius}
          nb={largeNominalBore}
        />
      )}

      {hasSmallEndFlange && smallEndFlangeType === "fixed" && (
        <Flange
          center={new THREE.Vector3(-offset, length / 2 + smallFlangeThickness / 2, 0)}
          normal={new THREE.Vector3(0, 1, 0)}
          pipeR={smallOuterRadius}
          innerR={smallInnerRadius}
          nb={smallNominalBore}
        />
      )}

      {hasSmallEndFlange && smallEndFlangeType === "rotating" && (
        <>
          <RotatingFlange
            center={new THREE.Vector3(-offset, length / 2 + smallFlangeThickness / 2, 0)}
            normal={new THREE.Vector3(0, 1, 0)}
            pipeR={smallOuterRadius}
            innerR={smallInnerRadius}
            nb={smallNominalBore}
          />
          <RetainingRing
            center={new THREE.Vector3(-offset, length / 2 + 0.05, 0)}
            normal={new THREE.Vector3(0, 1, 0)}
            pipeR={smallOuterRadius}
            innerR={smallInnerRadius}
            wallThickness={wt / SCALE_FACTOR}
          />
        </>
      )}

      {hasBlankSmallEnd && (
        <BlankFlange
          center={new THREE.Vector3(-offset, length / 2 + smallFlangeThickness + 0.02, 0)}
          normal={new THREE.Vector3(0, 1, 0)}
          pipeR={smallOuterRadius}
          nb={smallNominalBore}
        />
      )}

      <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[largeOuterRadius * 1.02, weldTubeRadius, 8, 64]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>

      <mesh position={[-offset, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[smallOuterRadius * 1.02, weldTubeRadius * 0.8, 8, 64]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
    </group>
  );
}

function DimensionLines({
  largeNominalBore,
  smallNominalBore,
  largeDiameterMm,
  smallDiameterMm,
  lengthMm,
  reducerType,
}: {
  largeNominalBore: number;
  smallNominalBore: number;
  largeDiameterMm?: number;
  smallDiameterMm?: number;
  lengthMm: number;
  reducerType: ReducerType;
}) {
  const largeOD = largeDiameterMm ?? outerDiameterFromNB(largeNominalBore);
  const smallOD = smallDiameterMm ?? outerDiameterFromNB(smallNominalBore);

  const largeOuterRadius = largeOD / SCALE_FACTOR / 2;
  const smallOuterRadius = smallOD / SCALE_FACTOR / 2;
  const length = lengthMm / SCALE_FACTOR;
  const offset = reducerType === "ECCENTRIC" ? largeOuterRadius - smallOuterRadius : 0;

  const labelOffset = 0.3;

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <Line
        points={[
          [-largeOuterRadius - labelOffset, -length / 2, 0],
          [-largeOuterRadius - labelOffset, length / 2, 0],
        ]}
        color="#3b82f6"
        lineWidth={2}
      />
      <Line
        points={[
          [-largeOuterRadius - labelOffset - 0.1, -length / 2, 0],
          [-largeOuterRadius - labelOffset + 0.1, -length / 2, 0],
        ]}
        color="#3b82f6"
        lineWidth={2}
      />
      <Line
        points={[
          [-largeOuterRadius - labelOffset - 0.1, length / 2, 0],
          [-largeOuterRadius - labelOffset + 0.1, length / 2, 0],
        ]}
        color="#3b82f6"
        lineWidth={2}
      />
      <Html
        position={[-largeOuterRadius - labelOffset - 0.2, 0, 0]}
        center
        style={{
          color: "#3b82f6",
          fontSize: "10px",
          fontWeight: "bold",
          whiteSpace: "nowrap",
          background: "rgba(255,255,255,0.8)",
          padding: "2px 4px",
          borderRadius: "2px",
        }}
      >
        L: {lengthMm}mm
      </Html>

      <Line
        points={[
          [0, -length / 2 - labelOffset, largeOuterRadius],
          [0, -length / 2 - labelOffset, -largeOuterRadius],
        ]}
        color="#22c55e"
        lineWidth={2}
      />
      <Html
        position={[0, -length / 2 - labelOffset - 0.15, 0]}
        center
        style={{
          color: "#22c55e",
          fontSize: "10px",
          fontWeight: "bold",
          whiteSpace: "nowrap",
          background: "rgba(255,255,255,0.8)",
          padding: "2px 4px",
          borderRadius: "2px",
        }}
      >
        ØL: {Math.round(largeOD)}mm
      </Html>

      <Line
        points={[
          [-offset, length / 2 + labelOffset, smallOuterRadius],
          [-offset, length / 2 + labelOffset, -smallOuterRadius],
        ]}
        color="#f59e0b"
        lineWidth={2}
      />
      <Html
        position={[-offset, length / 2 + labelOffset + 0.15, 0]}
        center
        style={{
          color: "#f59e0b",
          fontSize: "10px",
          fontWeight: "bold",
          whiteSpace: "nowrap",
          background: "rgba(255,255,255,0.8)",
          padding: "2px 4px",
          borderRadius: "2px",
        }}
      >
        Øs: {Math.round(smallOD)}mm
      </Html>
    </group>
  );
}

export default function Reducer3DPreview(props: Reducer3DPreviewProps) {
  const [showDimensions, setShowDimensions] = useState(true);
  const {
    largeNominalBore,
    smallNominalBore,
    largeDiameterMm,
    smallDiameterMm,
    lengthMm,
    reducerType,
  } = props;

  const largeOD = largeDiameterMm ?? outerDiameterFromNB(largeNominalBore);
  const cameraDistance = Math.max(5, (largeOD / SCALE_FACTOR) * 2.5);

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg overflow-hidden">
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-slate-700">
          {reducerType === "CONCENTRIC" ? "Concentric" : "Eccentric"} Reducer
        </span>
        <span className="bg-blue-500/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white">
          {largeNominalBore}NB → {smallNominalBore}NB
        </span>
      </div>

      <button
        onClick={() => setShowDimensions(!showDimensions)}
        className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-slate-700 hover:bg-white transition-colors"
      >
        {showDimensions ? "Hide" : "Show"} Dimensions
      </button>

      <Canvas
        shadows
        camera={{
          position: [cameraDistance, cameraDistance * 0.7, cameraDistance],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#f1f5f9"]} />

        <ambientLight intensity={LIGHTING_CONFIG.ambient.intensity} />
        <directionalLight
          position={LIGHTING_CONFIG.keyLight.position}
          intensity={LIGHTING_CONFIG.keyLight.intensity}
          castShadow
          shadow-mapSize-width={LIGHTING_CONFIG.shadowMapSize}
          shadow-mapSize-height={LIGHTING_CONFIG.shadowMapSize}
        />
        <pointLight
          position={LIGHTING_CONFIG.fillLight.position}
          intensity={LIGHTING_CONFIG.fillLight.intensity}
        />

        <Center>
          <group scale={PREVIEW_SCALE}>
            <ReducerScene {...props} />
            {showDimensions && (
              <DimensionLines
                largeNominalBore={largeNominalBore}
                smallNominalBore={smallNominalBore}
                largeDiameterMm={largeDiameterMm}
                smallDiameterMm={smallDiameterMm}
                lengthMm={lengthMm}
                reducerType={reducerType}
              />
            )}
          </group>
        </Center>

        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={20} blur={2} far={4} />

        <Environment preset="studio" />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={MIN_CAMERA_DISTANCE}
          maxDistance={MAX_CAMERA_DISTANCE}
          makeDefault
        />
      </Canvas>

      <div className="absolute bottom-2 left-2 z-10 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-600">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
