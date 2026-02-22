"use client";

import { Center, ContactShadows, Environment, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import {
  BlankFlange,
  Flange,
  HollowStraightPipe,
  RetainingRing,
  RotatingFlange,
  WeldRing,
} from "@/app/components/rfq/3d";
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
  hasCenterStub?: boolean;
  stubNominalBore?: number;
  stubLocationMm?: number;
  stubAngleDegrees?: number;
  closureLengthMm?: number;
}

function PreviewBadge({
  children,
  color = "slate",
}: {
  children: React.ReactNode;
  color?: "slate" | "blue" | "orange" | "green" | "purple";
}) {
  const colorMap = {
    slate: "bg-white/90 text-slate-700",
    blue: "bg-blue-500/90 text-white",
    orange: "bg-orange-500/90 text-white",
    green: "bg-green-500/90 text-white",
    purple: "bg-purple-500/90 text-white",
  };
  return (
    <span className={`${colorMap[color]} backdrop-blur-sm px-2 py-1 rounded text-xs font-medium`}>
      {children}
    </span>
  );
}

function LooseFlange({
  center,
  normal,
  pipeR,
  innerR,
  nb,
  closureLength,
  wallThickness,
}: {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  pipeR: number;
  innerR: number;
  nb: number;
  closureLength: number;
  wallThickness: number;
}) {
  const gapLength = 0.1;
  const flangeData = FLANGE_DATA[nb] || FLANGE_DATA[200];
  const flangeThickness = flangeData.thickness / GEOMETRY_CONSTANTS.SCALE;

  const direction = normal.clone().normalize();
  const closureMidPoint = center.clone().add(direction.clone().multiplyScalar(closureLength / 2));
  const flangePosition = center
    .clone()
    .add(direction.clone().multiplyScalar(closureLength + gapLength + flangeThickness / 2));

  return (
    <group>
      <HollowStraightPipe
        start={center}
        end={center.clone().add(direction.clone().multiplyScalar(closureLength))}
        outerR={pipeR}
        innerR={innerR}
        capStart={false}
        capEnd={false}
      />
      <Flange center={flangePosition} normal={normal} pipeR={pipeR} innerR={innerR} nb={nb} />
    </group>
  );
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
  hasCenterStub = false,
  stubNominalBore = 50,
  stubLocationMm,
  stubAngleDegrees = 0,
  closureLengthMm = 150,
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

  const stubLocation = stubLocationMm ?? lengthMm / 2;
  const stubT = stubLocation / lengthMm;
  const stubY = -length / 2 + stubT * length;
  const stubOD = outerDiameterFromNB(stubNominalBore);
  const stubWT = wallThicknessFromNB(stubNominalBore);
  const stubOuterR = stubOD / SCALE_FACTOR / 2;
  const stubInnerR = (stubOD - 2 * stubWT) / SCALE_FACTOR / 2;
  const stubLength = 150 / SCALE_FACTOR;
  const stubFlangeData = FLANGE_DATA[stubNominalBore] || FLANGE_DATA[50];
  const stubFlangeThickness = stubFlangeData.thickness / SCALE_FACTOR;

  const reducerRadiusAtStub = largeOuterRadius + (smallOuterRadius - largeOuterRadius) * stubT;
  const reducerInnerRadiusAtStub = largeInnerRadius + (smallInnerRadius - largeInnerRadius) * stubT;
  const stubXOffset = reducerType === "ECCENTRIC" ? stubT * offset : 0;

  const closureLength = closureLengthMm / SCALE_FACTOR;
  const gapLength = 0.1;

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
        <>
          <Flange
            center={new THREE.Vector3(0, -length / 2 - largeFlangeThickness / 2, 0)}
            normal={new THREE.Vector3(0, -1, 0)}
            pipeR={largeOuterRadius}
            innerR={largeInnerRadius}
            nb={largeNominalBore}
          />
          <Html
            position={[largeOuterRadius + 0.15, -length / 2 - largeFlangeThickness / 2, 0]}
            center
          >
            <div className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
              S/O
            </div>
          </Html>
        </>
      )}

      {hasLargeEndFlange && largeEndFlangeType === "loose" && (
        <>
          <LooseFlange
            center={new THREE.Vector3(0, -length / 2, 0)}
            normal={new THREE.Vector3(0, -1, 0)}
            pipeR={largeOuterRadius}
            innerR={largeInnerRadius}
            nb={largeNominalBore}
            closureLength={closureLength}
            wallThickness={wt / SCALE_FACTOR}
          />
          <Html
            position={[largeOuterRadius + 0.15, -length / 2 - closureLength - gapLength, 0]}
            center
          >
            <div className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
              L/F {closureLengthMm}mm
            </div>
          </Html>
        </>
      )}

      {hasLargeEndFlange &&
        largeEndFlangeType === "rotating" &&
        (() => {
          const rfOffset = 0.05;
          const t = rfOffset / length;
          const rfOuterR = largeOuterRadius + (smallOuterRadius - largeOuterRadius) * t;
          const rfInnerR = largeInnerRadius + (smallInnerRadius - largeInnerRadius) * t;
          return (
            <>
              <RetainingRing
                center={new THREE.Vector3(0, -length / 2, 0)}
                normal={new THREE.Vector3(0, -1, 0)}
                pipeR={largeOuterRadius}
                innerR={largeInnerRadius}
                wallThickness={wt / SCALE_FACTOR}
              />
              <RotatingFlange
                center={new THREE.Vector3(0, -length / 2 + rfOffset, 0)}
                normal={new THREE.Vector3(0, -1, 0)}
                pipeR={rfOuterR}
                innerR={rfInnerR}
                nb={largeNominalBore}
              />
              <Html position={[rfOuterR + 0.15, -length / 2 + rfOffset, 0]} center>
                <div className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  R/F
                </div>
              </Html>
            </>
          );
        })()}

      {hasBlankLargeEnd && (
        <BlankFlange
          center={new THREE.Vector3(0, -length / 2 - largeFlangeThickness - 0.02, 0)}
          normal={new THREE.Vector3(0, -1, 0)}
          pipeR={largeOuterRadius}
          nb={largeNominalBore}
        />
      )}

      {hasSmallEndFlange && smallEndFlangeType === "fixed" && (
        <>
          <Flange
            center={new THREE.Vector3(-offset, length / 2 + smallFlangeThickness / 2, 0)}
            normal={new THREE.Vector3(0, 1, 0)}
            pipeR={smallOuterRadius}
            innerR={smallInnerRadius}
            nb={smallNominalBore}
          />
          <Html
            position={[-offset + smallOuterRadius + 0.15, length / 2 + smallFlangeThickness / 2, 0]}
            center
          >
            <div className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
              S/O
            </div>
          </Html>
        </>
      )}

      {hasSmallEndFlange && smallEndFlangeType === "loose" && (
        <>
          <LooseFlange
            center={new THREE.Vector3(-offset, length / 2, 0)}
            normal={new THREE.Vector3(0, 1, 0)}
            pipeR={smallOuterRadius}
            innerR={smallInnerRadius}
            nb={smallNominalBore}
            closureLength={closureLength}
            wallThickness={wt / SCALE_FACTOR}
          />
          <Html
            position={[
              -offset + smallOuterRadius + 0.15,
              length / 2 + closureLength + gapLength,
              0,
            ]}
            center
          >
            <div className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
              L/F {closureLengthMm}mm
            </div>
          </Html>
        </>
      )}

      {hasSmallEndFlange &&
        smallEndFlangeType === "rotating" &&
        (() => {
          const rfOffset = 0.05;
          const t = 1 - rfOffset / length;
          const rfOuterR = largeOuterRadius + (smallOuterRadius - largeOuterRadius) * t;
          const rfInnerR = largeInnerRadius + (smallInnerRadius - largeInnerRadius) * t;
          const rfXOffset = reducerType === "ECCENTRIC" ? t * offset : 0;
          return (
            <>
              <RetainingRing
                center={new THREE.Vector3(-offset, length / 2, 0)}
                normal={new THREE.Vector3(0, 1, 0)}
                pipeR={smallOuterRadius}
                innerR={smallInnerRadius}
                wallThickness={wt / SCALE_FACTOR}
              />
              <RotatingFlange
                center={new THREE.Vector3(-rfXOffset, length / 2 - rfOffset, 0)}
                normal={new THREE.Vector3(0, 1, 0)}
                pipeR={rfOuterR}
                innerR={rfInnerR}
                nb={smallNominalBore}
              />
              <Html position={[-rfXOffset + rfOuterR + 0.15, length / 2 - rfOffset, 0]} center>
                <div className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  R/F
                </div>
              </Html>
            </>
          );
        })()}

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

      {hasCenterStub && (
        <group
          position={[-stubXOffset, stubY, 0]}
          rotation={[0, (stubAngleDegrees * Math.PI) / 180, 0]}
        >
          <HollowStraightPipe
            start={new THREE.Vector3(0, 0, reducerRadiusAtStub)}
            end={new THREE.Vector3(0, 0, reducerRadiusAtStub + stubLength)}
            outerR={stubOuterR}
            innerR={stubInnerR}
            capStart={false}
            capEnd={false}
          />
          <WeldRing
            center={new THREE.Vector3(0, 0, reducerRadiusAtStub)}
            normal={new THREE.Vector3(0, 0, 1)}
            radius={stubOuterR * 1.05}
            tube={weldTubeRadius * 0.7}
          />
          <Flange
            center={
              new THREE.Vector3(0, 0, reducerRadiusAtStub + stubLength + stubFlangeThickness / 2)
            }
            normal={new THREE.Vector3(0, 0, 1)}
            pipeR={stubOuterR}
            innerR={stubInnerR}
            nb={stubNominalBore}
          />
        </group>
      )}
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

function flangeTypeLabel(type: FlangeType | undefined): string {
  if (type === "loose") return "L/F";
  if (type === "rotating") return "R/F";
  if (type === "fixed") return "S/O";
  return "";
}

export default function Reducer3DPreview(props: Reducer3DPreviewProps) {
  const [showDimensions, setShowDimensions] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const {
    largeNominalBore,
    smallNominalBore,
    largeDiameterMm,
    smallDiameterMm,
    lengthMm,
    wallThickness,
    reducerType,
    hasCenterStub,
    stubNominalBore,
    hasLargeEndFlange,
    hasSmallEndFlange,
    largeEndFlangeType,
    smallEndFlangeType,
    closureLengthMm = 150,
  } = props;

  const largeOD = largeDiameterMm ?? outerDiameterFromNB(largeNominalBore);
  const smallOD = smallDiameterMm ?? outerDiameterFromNB(smallNominalBore);
  const wt = wallThickness ?? wallThicknessFromNB(largeNominalBore);
  const largeID = largeOD - 2 * wt;
  const smallID = smallOD - 2 * wt;
  const cameraDistance = Math.max(5, (largeOD / SCALE_FACTOR) * 2.5);

  const largeFlangeLabel = hasLargeEndFlange ? flangeTypeLabel(largeEndFlangeType) : "";
  const smallFlangeLabel = hasSmallEndFlange ? flangeTypeLabel(smallEndFlangeType) : "";

  const largeFlangeData = FLANGE_DATA[largeNominalBore] || FLANGE_DATA[200];
  const flangeCount = [hasLargeEndFlange, hasSmallEndFlange].filter(Boolean).length;
  const looseFlangeCount = [
    hasLargeEndFlange && largeEndFlangeType === "loose",
    hasSmallEndFlange && smallEndFlangeType === "loose",
  ].filter(Boolean).length;

  const flangeTypeDisplay =
    largeFlangeLabel && smallFlangeLabel && largeFlangeLabel !== smallFlangeLabel
      ? `${largeFlangeLabel}/${smallFlangeLabel}`
      : largeFlangeLabel || smallFlangeLabel || "S/O";

  if (isHidden) {
    return (
      <div className="relative h-full w-full bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
        <button
          onClick={() => setIsHidden(false)}
          className="text-sm text-blue-600 bg-white px-4 py-2 rounded shadow hover:bg-blue-50"
        >
          Show 3D Preview
        </button>
      </div>
    );
  }

  const renderCanvas = (isExpanded = false) => (
    <Canvas
      shadows
      camera={{
        position: [cameraDistance, cameraDistance * 0.7, cameraDistance],
        fov: 45,
        near: 0.1,
        far: 1000,
      }}
      gl={{ antialias: true }}
      style={isExpanded ? { background: "#1e293b" } : undefined}
    >
      <color attach="background" args={[isExpanded ? "#1e293b" : "#f1f5f9"]} />

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
        <group scale={isExpanded ? PREVIEW_SCALE * 1.5 : PREVIEW_SCALE}>
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
  );

  return (
    <>
      <div className="relative h-full w-full bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg overflow-hidden">
        <div className="absolute top-2 left-2 z-10 text-[10px] bg-white/90 px-2 py-1 rounded">
          <span className="text-purple-700 font-medium">
            {reducerType === "CONCENTRIC" ? "Concentric" : "Eccentric"} Reducer
          </span>
        </div>

        <div
          data-info-box
          className="absolute top-2 right-2 z-10 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-gray-200 leading-snug"
        >
          <div className="font-bold text-blue-800 mb-0.5">REDUCER</div>
          <div className="text-gray-900 font-medium">
            {largeNominalBore}NB → {smallNominalBore}NB
          </div>
          <div className="text-gray-700">
            ØL: {largeOD.toFixed(0)}mm | Øs: {smallOD.toFixed(0)}mm
          </div>
          <div className="text-gray-700">
            IDL: {largeID.toFixed(0)}mm | IDs: {smallID.toFixed(0)}mm
          </div>
          <div className="text-gray-700">
            WT: {wt.toFixed(1)}mm | L: {lengthMm}mm
          </div>
          {hasCenterStub && (
            <div className="text-orange-700 font-medium">Stub: {stubNominalBore || 50}NB</div>
          )}
          {flangeCount > 0 && (
            <>
              <div className="font-bold text-blue-800 mt-1 mb-0.5">
                FLANGE ({flangeCount > 1 ? `${flangeCount}X_` : ""}
                {flangeTypeDisplay})
              </div>
              {looseFlangeCount > 0 && <div className="text-gray-700">C1: {closureLengthMm}mm</div>}
              <div className="text-gray-700">
                OD: {largeFlangeData.flangeOD}mm | PCD: {largeFlangeData.pcd}mm
              </div>
              <div className="text-gray-700">
                Holes: {largeFlangeData.boltHoles} × Ø{largeFlangeData.holeID}mm
              </div>
              <div className="text-gray-700">
                Bolts: {largeFlangeData.boltHoles} × M{largeFlangeData.boltSize} ×{" "}
                {largeFlangeData.boltLength}mm
              </div>
              <div className="text-gray-700">Thickness: {largeFlangeData.thickness}mm</div>
              <div className="text-blue-700 font-medium">SABS 1123 T1000/3</div>
            </>
          )}
        </div>

        {renderCanvas(false)}

        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2">
          {showDebug && (
            <div className="text-[10px] text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm font-mono">
              L:{largeNominalBore} | S:{smallNominalBore} | {reducerType.slice(0, 3)}
            </div>
          )}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] text-slate-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-slate-100"
            title={showDebug ? "Hide debug info" : "Show debug info"}
          >
            dbg
          </button>
          <button
            onClick={() => setExpanded(true)}
            className="text-[10px] text-blue-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-blue-50 flex items-center gap-1"
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
            onClick={() => window.print()}
            className="text-[10px] text-blue-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-blue-50 flex items-center gap-1"
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
              const dxfContent = `0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0\n20\n0\n11\n${lengthMm}\n21\n0\n0\nCIRCLE\n8\n0\n10\n0\n20\n0\n40\n${largeOD / 2}\n0\nCIRCLE\n8\n0\n10\n${lengthMm}\n20\n0\n40\n${smallOD / 2}\n0\nENDSEC\n0\nEOF`;
              const blob = new Blob([dxfContent], { type: "application/dxf" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `reducer_${largeNominalBore}x${smallNominalBore}NB_${reducerType.toLowerCase()}.dxf`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-[10px] text-blue-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-blue-50 flex items-center gap-1"
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
            className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-gray-100 flex items-center gap-1"
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
            Hide
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full max-w-6xl h-[80vh] bg-slate-800 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-4 right-4 z-10 text-white bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-sm"
            >
              Close
            </button>
            <div className="absolute top-4 left-4 z-10 text-white text-sm font-medium">
              {reducerType === "CONCENTRIC" ? "Concentric" : "Eccentric"} Reducer {largeNominalBore}
              NB → {smallNominalBore}NB
            </div>
            {renderCanvas(true)}
          </div>
        </div>
      )}
    </>
  );
}
