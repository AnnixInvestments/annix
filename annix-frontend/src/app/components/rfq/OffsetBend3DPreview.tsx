"use client";

import { Center, ContactShadows, Environment, Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";
import {
  Flange,
  HollowStraightPipe,
  RetainingRing,
  RotatingFlange,
  WeldRing,
} from "@/app/components/rfq/3d";
import { FLANGE_DATA } from "@/app/lib/3d/flangeData";
import {
  GEOMETRY_CONSTANTS,
  LIGHTING_CONFIG,
  outerDiameterFromNB,
  SCENE_CONSTANTS,
  wallThicknessFromNB,
} from "@/app/lib/config/rfq/rendering3DStandards";

const SCALE_FACTOR = GEOMETRY_CONSTANTS.SCALE;
const PREVIEW_SCALE = SCENE_CONSTANTS.PREVIEW_SCALE;
const MIN_CAMERA_DISTANCE = SCENE_CONSTANTS.MIN_CAMERA_DISTANCE;
const MAX_CAMERA_DISTANCE = SCENE_CONSTANTS.MAX_CAMERA_DISTANCE;

type FlangeType = "fixed" | "loose" | "rotating" | null;

interface OffsetBend3DPreviewProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness?: number;
  lengthA: number;
  lengthB: number;
  lengthC: number;
  offsetAngleDegrees: number;
  hasStartFlange?: boolean;
  hasEndFlange?: boolean;
  startFlangeType?: FlangeType;
  endFlangeType?: FlangeType;
  closureLengthMm?: number;
}

function LooseFlange({
  center,
  normal,
  pipeR,
  innerR,
  nb,
  closureLength,
}: {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  pipeR: number;
  innerR: number;
  nb: number;
  closureLength: number;
}) {
  const gapLength = 0.1;
  const flangeData = FLANGE_DATA[nb] || FLANGE_DATA[200];
  const flangeThicknessScaled = flangeData.thickness / SCALE_FACTOR;

  const direction = normal.clone().normalize();
  const flangePosition = center
    .clone()
    .add(direction.clone().multiplyScalar(closureLength + gapLength + flangeThicknessScaled / 2));

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

function OffsetBendScene({
  nominalBore,
  outerDiameter,
  wallThickness,
  lengthA,
  lengthB,
  lengthC,
  offsetAngleDegrees,
  hasStartFlange = false,
  hasEndFlange = false,
  startFlangeType = "fixed",
  endFlangeType = "fixed",
  closureLengthMm = 150,
}: OffsetBend3DPreviewProps) {
  const od = outerDiameter ?? outerDiameterFromNB(nominalBore);
  const wt = wallThickness ?? wallThicknessFromNB(nominalBore);
  const id = od - 2 * wt;

  const outerRadius = od / SCALE_FACTOR / 2;
  const innerRadius = Math.max(0.001, id / SCALE_FACTOR / 2);

  const lenA = lengthA / SCALE_FACTOR;
  const lenB = lengthB / SCALE_FACTOR;
  const lenC = lengthC / SCALE_FACTOR;
  const closureLength = closureLengthMm / SCALE_FACTOR;

  const angleRad = (offsetAngleDegrees * Math.PI) / 180;

  const weldTubeRadius = outerRadius * 0.06;

  const flangeData = FLANGE_DATA[nominalBore] || FLANGE_DATA[200];
  const flangeThickness = flangeData.thickness / SCALE_FACTOR;

  const startA = new THREE.Vector3(0, 0, 0);
  const endA = new THREE.Vector3(lenA, 0, 0);

  const dirB = new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0);
  const endB = endA.clone().add(dirB.clone().multiplyScalar(lenB));

  const dirC = new THREE.Vector3(1, 0, 0);
  const endC = endB.clone().add(dirC.clone().multiplyScalar(lenC));

  const offsetY = lenB * Math.sin(angleRad);

  const mitreExtension = outerRadius * Math.tan(angleRad / 2);

  return (
    <group>
      <HollowStraightPipe
        start={startA}
        end={new THREE.Vector3(endA.x + mitreExtension, endA.y, endA.z)}
        outerR={outerRadius}
        innerR={innerRadius}
        capStart={!hasStartFlange}
        capEnd={false}
      />

      <WeldRing
        center={endA}
        normal={new THREE.Vector3(Math.cos(angleRad / 2), Math.sin(angleRad / 2), 0)}
        radius={outerRadius * 1.02}
        tube={weldTubeRadius}
      />

      <group position={[endA.x, endA.y, endA.z]}>
        <group rotation={[0, 0, angleRad]}>
          <HollowStraightPipe
            start={new THREE.Vector3(-mitreExtension, 0, 0)}
            end={new THREE.Vector3(lenB + mitreExtension, 0, 0)}
            outerR={outerRadius}
            innerR={innerRadius}
            capStart={false}
            capEnd={false}
          />
        </group>
      </group>

      <WeldRing
        center={endB}
        normal={new THREE.Vector3(Math.cos(angleRad / 2), Math.sin(angleRad / 2), 0)}
        radius={outerRadius * 1.02}
        tube={weldTubeRadius}
      />

      <HollowStraightPipe
        start={new THREE.Vector3(endB.x - mitreExtension, endB.y, endB.z)}
        end={endC}
        outerR={outerRadius}
        innerR={innerRadius}
        capStart={false}
        capEnd={!hasEndFlange}
      />

      {hasStartFlange && startFlangeType === "fixed" && (
        <>
          <Flange
            center={new THREE.Vector3(-flangeThickness / 2, 0, 0)}
            normal={new THREE.Vector3(-1, 0, 0)}
            pipeR={outerRadius}
            innerR={innerRadius}
            nb={nominalBore}
          />
          <Html position={[-flangeThickness / 2, outerRadius + 0.15, 0]} center>
            <div className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
              S/O
            </div>
          </Html>
        </>
      )}

      {hasStartFlange && startFlangeType === "loose" && (
        <>
          <LooseFlange
            center={new THREE.Vector3(0, 0, 0)}
            normal={new THREE.Vector3(-1, 0, 0)}
            pipeR={outerRadius}
            innerR={innerRadius}
            nb={nominalBore}
            closureLength={closureLength}
          />
          <Html
            position={[-closureLength - 0.1 - flangeThickness / 2, outerRadius + 0.15, 0]}
            center
          >
            <div className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
              L/F {closureLengthMm}mm
            </div>
          </Html>
        </>
      )}

      {hasStartFlange &&
        startFlangeType === "rotating" &&
        (() => {
          const rfOffset = 80 / SCALE_FACTOR;
          return (
            <>
              <RetainingRing
                center={new THREE.Vector3(0, 0, 0)}
                normal={new THREE.Vector3(-1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                wallThickness={wt / SCALE_FACTOR}
              />
              <RotatingFlange
                center={new THREE.Vector3(rfOffset, 0, 0)}
                normal={new THREE.Vector3(-1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              <Html position={[rfOffset, -outerRadius - 0.15, 0]} center>
                <div className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  R/F
                </div>
              </Html>
            </>
          );
        })()}

      {hasEndFlange && endFlangeType === "fixed" && (
        <>
          <Flange
            center={new THREE.Vector3(endC.x + flangeThickness / 2, endC.y, endC.z)}
            normal={new THREE.Vector3(1, 0, 0)}
            pipeR={outerRadius}
            innerR={innerRadius}
            nb={nominalBore}
          />
          <Html position={[endC.x + flangeThickness / 2, endC.y + outerRadius + 0.15, 0]} center>
            <div className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
              S/O
            </div>
          </Html>
        </>
      )}

      {hasEndFlange && endFlangeType === "loose" && (
        <>
          <LooseFlange
            center={new THREE.Vector3(endC.x, endC.y, endC.z)}
            normal={new THREE.Vector3(1, 0, 0)}
            pipeR={outerRadius}
            innerR={innerRadius}
            nb={nominalBore}
            closureLength={closureLength}
          />
          <Html
            position={[
              endC.x + closureLength + 0.1 + flangeThickness / 2,
              endC.y + outerRadius + 0.15,
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

      {hasEndFlange &&
        endFlangeType === "rotating" &&
        (() => {
          const rfOffset = 80 / SCALE_FACTOR;
          return (
            <>
              <RetainingRing
                center={new THREE.Vector3(endC.x, endC.y, endC.z)}
                normal={new THREE.Vector3(1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                wallThickness={wt / SCALE_FACTOR}
              />
              <RotatingFlange
                center={new THREE.Vector3(endC.x - rfOffset, endC.y, endC.z)}
                normal={new THREE.Vector3(1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              <Html position={[endC.x - rfOffset, endC.y - outerRadius - 0.15, 0]} center>
                <div className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  R/F
                </div>
              </Html>
            </>
          );
        })()}

      <Html position={[lenA / 2, -outerRadius - 0.15, 0]} center>
        <div className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
          A: {lengthA}mm
        </div>
      </Html>

      <Html
        position={[
          endA.x + (endB.x - endA.x) / 2,
          endA.y + (endB.y - endA.y) / 2 + outerRadius + 0.15,
          0,
        ]}
        center
      >
        <div className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
          B: {lengthB}mm
        </div>
      </Html>

      <Html position={[endB.x + lenC / 2, endB.y + outerRadius + 0.15, 0]} center>
        <div className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
          C: {lengthC}mm
        </div>
      </Html>

      <Html position={[endA.x + 0.1, endA.y + 0.1, 0]} center>
        <div className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
          {offsetAngleDegrees}°
        </div>
      </Html>

      <Line
        points={[
          [0, -outerRadius - 0.1, 0],
          [lenA, -outerRadius - 0.1, 0],
        ]}
        color="#3b82f6"
        lineWidth={2}
      />

      <Line
        points={[
          [endA.x, endA.y, 0],
          [endB.x, endB.y, 0],
        ]}
        color="#f97316"
        lineWidth={2}
        dashed
        dashSize={0.02}
        gapSize={0.01}
      />

      <Line
        points={[
          [endB.x, endB.y + outerRadius + 0.1, 0],
          [endC.x, endC.y + outerRadius + 0.1, 0],
        ]}
        color="#22c55e"
        lineWidth={2}
      />

      <Line
        points={[
          [0, -outerRadius - 0.2, 0],
          [endC.x, -outerRadius - 0.2, 0],
        ]}
        color="#6366f1"
        lineWidth={1}
        dashed
        dashSize={0.03}
        gapSize={0.02}
      />
      <Html position={[endC.x / 2, -outerRadius - 0.3, 0]} center>
        <div className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
          F/F: {Math.round(endC.x * SCALE_FACTOR)}mm
        </div>
      </Html>

      <Line
        points={[
          [endC.x + 0.1, 0, 0],
          [endC.x + 0.1, offsetY, 0],
        ]}
        color="#ec4899"
        lineWidth={2}
      />
      <Html position={[endC.x + 0.2, offsetY / 2, 0]} center>
        <div className="bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
          Offset: {Math.round(offsetY * SCALE_FACTOR)}mm
        </div>
      </Html>
    </group>
  );
}

export default function OffsetBend3DPreview(props: OffsetBend3DPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const {
    nominalBore,
    outerDiameter,
    wallThickness,
    lengthA,
    lengthB,
    lengthC,
    offsetAngleDegrees,
    hasStartFlange,
    hasEndFlange,
    startFlangeType = "fixed",
    endFlangeType = "fixed",
    closureLengthMm = 150,
  } = props;

  const od = outerDiameter ?? outerDiameterFromNB(nominalBore);
  const wt = wallThickness ?? wallThicknessFromNB(nominalBore);
  const id = od - 2 * wt;

  const totalLength = lengthA + lengthB + lengthC;
  const cameraDistance = Math.max(5, (totalLength / SCALE_FACTOR) * 1.5);

  const angleRad = (offsetAngleDegrees * Math.PI) / 180;
  const offsetHeight = Math.round(lengthB * Math.sin(angleRad));
  const flangeFaceDistance = Math.round(lengthA + lengthB * Math.cos(angleRad) + lengthC);

  const flangeCount = [hasStartFlange, hasEndFlange].filter(Boolean).length;
  const flangeData = FLANGE_DATA[nominalBore] || FLANGE_DATA[200];

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
        position: [cameraDistance * 0.5, cameraDistance * 0.5, cameraDistance],
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
          <OffsetBendScene {...props} />
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
          <span className="text-purple-700 font-medium">Offset Bend</span>
        </div>

        <div
          data-info-box
          className="absolute top-2 right-2 z-10 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-gray-200 leading-snug"
        >
          <div className="font-bold text-blue-800 mb-0.5">OFFSET BEND</div>
          <div className="text-gray-900 font-medium">{nominalBore}NB</div>
          <div className="text-gray-700">
            OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm
          </div>
          <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
          <div className="text-gray-700 mt-1">
            A: {lengthA}mm | B: {lengthB}mm | C: {lengthC}mm
          </div>
          <div className="text-gray-700">
            Angle: {offsetAngleDegrees}° | Offset: {offsetHeight}mm
          </div>
          <div className="text-gray-700">Pipe Total: {totalLength}mm</div>
          <div className="text-gray-700">F/F: {flangeFaceDistance}mm</div>
          <div className="font-bold text-orange-700 mt-1">2 Mitre Welds</div>
          {flangeCount > 0 &&
            (() => {
              const flangeTypeLabel =
                startFlangeType === "rotating"
                  ? "R/F"
                  : startFlangeType === "loose"
                    ? "L/F"
                    : "S/O";
              return (
                <>
                  <div className="font-bold text-blue-800 mt-1 mb-0.5">
                    FLANGE ({flangeCount}X {flangeTypeLabel})
                  </div>
                  <div className="text-gray-700">
                    OD: {flangeData.flangeOD}mm | PCD: {flangeData.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {flangeData.boltHoles} × Ø{flangeData.holeID}mm
                  </div>
                  <div className="text-gray-700">Thickness: {flangeData.thickness}mm</div>
                  {startFlangeType === "loose" && (
                    <div className="text-gray-700">Closure: {closureLengthMm}mm</div>
                  )}
                  <div className="text-blue-700 font-medium">SABS 1123 T1000/3</div>
                </>
              );
            })()}
        </div>

        {renderCanvas(false)}

        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2">
          {showDebug && (
            <div className="text-[10px] text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm font-mono">
              NB:{nominalBore} | A:{lengthA} | B:{lengthB} | C:{lengthC} | θ:{offsetAngleDegrees}°
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
              const dxfContent = `0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0\n20\n0\n11\n${lengthA}\n21\n0\n0\nLINE\n8\n0\n10\n${lengthA}\n20\n0\n11\n${lengthA + lengthB * Math.cos(angleRad)}\n21\n${lengthB * Math.sin(angleRad)}\n0\nLINE\n8\n0\n10\n${lengthA + lengthB * Math.cos(angleRad)}\n20\n${lengthB * Math.sin(angleRad)}\n11\n${lengthA + lengthB * Math.cos(angleRad) + lengthC}\n21\n${lengthB * Math.sin(angleRad)}\n0\nENDSEC\n0\nEOF`;
              const blob = new Blob([dxfContent], { type: "application/dxf" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `offset_bend_${nominalBore}NB_${offsetAngleDegrees}deg.dxf`;
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
              Offset Bend {nominalBore}NB - {offsetAngleDegrees}°
            </div>
            {renderCanvas(true)}
          </div>
        </div>
      )}
    </>
  );
}
