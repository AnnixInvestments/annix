"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { FLANGE_MATERIALS } from "@/app/lib/config/rfq/rendering3DStandards";

const flangeColor = FLANGE_MATERIALS.standard;
const blankFlangeColor = FLANGE_MATERIALS.blank;

export function BlankFlangeComponent({
  position,
  rotation,
  outerDiameter,
  thickness,
  pcd,
  boltHoles,
  holeID,
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
    Array.from({ length: boltHoles }).forEach((_, i) => {
      const angle = (i / boltHoles) * Math.PI * 2;
      const x = Math.cos(angle) * (pcd / 2);
      const y = Math.sin(angle) * (pcd / 2);
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeID / 2, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    });

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [outerDiameter, thickness, pcd, boltHoles, holeID]);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={blankGeometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...blankFlangeColor} />
    </mesh>
  );
}

export function RetainingRingComponent({
  position,
  rotation,
  pipeOuterRadius,
  pipeInnerRadius,
  thickness,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  pipeOuterRadius: number;
  pipeInnerRadius: number;
  thickness: number;
}) {
  // Ring OD should be larger than pipe OD but smaller than the flange
  // 15% larger than pipe OD
  const ringOuterRadius = pipeOuterRadius * 1.15;

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
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...flangeColor} />
    </mesh>
  );
}

export function RotatingFlangeComponent({
  position,
  rotation,
  outerDiameter,
  pipeOuterDiameter,
  thickness,
  pcd,
  boltHoles,
  holeID,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  outerDiameter: number;
  // The flange hole must be larger than this
  pipeOuterDiameter: number;
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
    Array.from({ length: boltHoles }).forEach((_, i) => {
      const angle = (i / boltHoles) * Math.PI * 2;
      const x = Math.cos(angle) * (pcd / 2);
      const y = Math.sin(angle) * (pcd / 2);
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeID / 2, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    });

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [outerDiameter, holeDiameter, thickness, pcd, boltHoles, holeID]);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={flangeGeometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...flangeColor} />
    </mesh>
  );
}

export function FlangeComponent({
  position,
  rotation,
  outerDiameter,
  innerDiameter,
  thickness,
  pcd,
  boltHoles,
  holeID,
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
    Array.from({ length: boltHoles }).forEach((_, i) => {
      const angle = (i / boltHoles) * Math.PI * 2;
      const x = Math.cos(angle) * (pcd / 2);
      const y = Math.sin(angle) * (pcd / 2);
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeID / 2, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    });

    const extrudeSettings = { depth: thickness, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [outerDiameter, innerDiameter, thickness, pcd, boltHoles, holeID]);

  return (
    <mesh
      position={position}
      rotation={rotation || [0, 0, 0]}
      geometry={flangeGeometry}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial {...flangeColor} />
    </mesh>
  );
}
