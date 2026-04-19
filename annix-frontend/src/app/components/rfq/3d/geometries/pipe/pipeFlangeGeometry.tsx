"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { FLANGE_MATERIALS, WELD_MATERIALS } from "@/app/lib/config/rfq/rendering3DStandards";

const weldColor = WELD_MATERIALS.standard;
const flangeColor = FLANGE_MATERIALS.standard;
const blankFlangeColor = FLANGE_MATERIALS.blank;

export const WeldBead = ({
  position,
  diameter,
}: {
  position: [number, number, number];
  diameter: number;
}) => {
  return (
    <mesh position={position} rotation={[0, Math.PI / 2, 0]}>
      <torusGeometry args={[diameter / 2, diameter * 0.02, 8, 32]} />
      <meshStandardMaterial {...weldColor} />
    </mesh>
  );
};

export const SimpleFlange = ({
  position,
  outerDiameter,
  holeDiameter,
  thickness,
  actualFlangeOdMm,
  actualFlangePcdMm,
  actualHoleCount,
  actualHoleIdMm,
}: {
  position: [number, number, number];
  outerDiameter: number;
  holeDiameter: number;
  thickness: number;
  actualFlangeOdMm?: number;
  actualFlangePcdMm?: number;
  actualHoleCount?: number;
  actualHoleIdMm?: number;
}) => {
  const flangeOD = actualFlangeOdMm ? actualFlangeOdMm / 1000 : outerDiameter * 1.6;
  const flangeRadius = flangeOD / 2;
  const boreRadius = outerDiameter / 2;

  const numHoles = actualHoleCount || (outerDiameter < 0.1 ? 4 : outerDiameter < 0.25 ? 8 : 12);
  const boltCircleRadius = actualFlangePcdMm
    ? actualFlangePcdMm / 1000 / 2
    : (flangeOD + outerDiameter) / 4;
  const boltHoleSize = actualHoleIdMm ? actualHoleIdMm / 1000 / 2 : thickness * 0.4;

  const boltHoles = useMemo(() => {
    return Array.from({ length: numHoles }, (_, i) => {
      const angle = (i / numHoles) * Math.PI * 2;
      return {
        x: Math.cos(angle) * boltCircleRadius,
        z: Math.sin(angle) * boltCircleRadius,
      };
    });
  }, [numHoles, boltCircleRadius]);

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[flangeRadius, flangeRadius, thickness, 32, 1, true]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[boreRadius, boreRadius, thickness, 32, 1, true]} />
        <meshStandardMaterial {...flangeColor} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, thickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boreRadius, flangeRadius, 32]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -thickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boreRadius, flangeRadius, 32]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      {boltHoles.map((hole, i) => (
        <mesh key={i} position={[hole.x, 0, hole.z]}>
          <cylinderGeometry args={[boltHoleSize, boltHoleSize, thickness + 0.02, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <mesh position={[0, thickness / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boreRadius * 1.1, boreRadius * 1.4, 32]} />
        <meshStandardMaterial {...flangeColor} />
      </mesh>
    </group>
  );
};

export const RetainingRing = ({
  position,
  pipeOuterRadius,
  pipeInnerRadius,
  wallThickness,
}: {
  position: [number, number, number];
  pipeOuterRadius: number;
  pipeInnerRadius: number;
  wallThickness: number;
}) => {
  const ringOuterRadius = pipeOuterRadius * 1.15;
  const ringThickness = wallThickness;

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[ringOuterRadius, ringOuterRadius, ringThickness, 32, 1, true]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[pipeOuterRadius, pipeOuterRadius, ringThickness, 32, 1, true]} />
        <meshStandardMaterial {...flangeColor} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, ringThickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[pipeOuterRadius, ringOuterRadius, 32]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -ringThickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[pipeOuterRadius, ringOuterRadius, 32]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const BlankFlange = ({
  position,
  outerDiameter,
  thickness,
}: {
  position: [number, number, number];
  outerDiameter: number;
  thickness: number;
}) => {
  const flangeOD = outerDiameter * 1.6;
  const flangeRadius = flangeOD / 2;
  const numHoles = outerDiameter < 0.1 ? 4 : outerDiameter < 0.25 ? 8 : 12;
  const boltCircleRadius = (flangeOD + outerDiameter) / 4;
  const boltHoleSize = thickness * 0.4;

  const boltHoles = useMemo(() => {
    return Array.from({ length: numHoles }, (_, i) => {
      const angle = (i / numHoles) * Math.PI * 2;
      return {
        x: Math.cos(angle) * boltCircleRadius,
        z: Math.sin(angle) * boltCircleRadius,
      };
    });
  }, [numHoles, boltCircleRadius]);

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[flangeRadius, flangeRadius, thickness, 32]} />
        <meshStandardMaterial {...blankFlangeColor} />
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
