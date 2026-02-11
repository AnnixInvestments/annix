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
import {
  getAngleRangeFromDegrees,
  getLateralDimensionsForAngle,
  LateralAngleRange,
} from "@/app/lib/utils/sabs719LateralData";

const SCALE_FACTOR = GEOMETRY_CONSTANTS.FITTING_SCALE;
const PREVIEW_SCALE = SCENE_CONSTANTS.PREVIEW_SCALE;
const MIN_CAMERA_DISTANCE = SCENE_CONSTANTS.MIN_CAMERA_DISTANCE;
const MAX_CAMERA_DISTANCE = SCENE_CONSTANTS.MAX_CAMERA_DISTANCE;

const pipeOuterMat = PIPE_MATERIALS.outer;
const pipeInnerMat = PIPE_MATERIALS.inner;
const pipeEndMat = PIPE_MATERIALS.end;
const weldColor = WELD_MATERIALS.standard;
const flangeColor = FLANGE_MATERIALS.standard;
const rotatingFlangeColor = {
  color: "#c0c0c0",
  metalness: 0.9,
  roughness: 0.15,
  envMapIntensity: 1.5,
};

const STUB_NB_TO_OD: { [key: number]: number } = {
  50: 60.3,
  65: 76.1,
  80: 88.9,
  100: 114.3,
};

const STUB_WALL_THICKNESS: { [key: number]: number } = {
  50: 3.9,
  65: 3.9,
  80: 4.0,
  100: 4.5,
};

const STUB_LENGTH_MM = 80;

interface StubConfig {
  outletLocation: "branch" | "mainA" | "mainB";
  steelSpecId?: number;
  nominalBoreMm: number;
  distanceFromOutletMm: number;
  stubLengthMm?: number;
  positionDegrees: number;
  endConfiguration?: "plain" | "flanged" | "rf";
  hasBlankFlange?: boolean;
}

type FlangeType = "fixed" | "loose" | "rotating" | null;

interface Lateral3DPreviewProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness?: number;
  angleDegrees: number;
  angleRange?: LateralAngleRange;
  hasInletFlange?: boolean;
  hasOutletFlange?: boolean;
  hasBranchFlange?: boolean;
  inletFlangeType?: FlangeType;
  outletFlangeType?: FlangeType;
  branchFlangeType?: FlangeType;
  hasBlankInlet?: boolean;
  hasBlankOutlet?: boolean;
  hasBlankBranch?: boolean;
  closureLengthMm?: number;
  stubs?: StubConfig[];
}

function StubComponent({
  position,
  rotation,
  stubNB,
  stubLengthMm = 150,
  hasFlange = false,
  isRotatingFlange = false,
  hasBlankFlange = false,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  stubNB: number;
  stubLengthMm?: number;
  hasFlange?: boolean;
  isRotatingFlange?: boolean;
  hasBlankFlange?: boolean;
}) {
  const stubOD = STUB_NB_TO_OD[stubNB] || 60.3;
  const stubWT = STUB_WALL_THICKNESS[stubNB] || 3.9;
  const stubID = stubOD - 2 * stubWT;
  const stubLength = stubLengthMm / SCALE_FACTOR;

  const outerRadius = stubOD / SCALE_FACTOR / 2;
  const innerRadius = stubID / SCALE_FACTOR / 2;
  const weldRadius = outerRadius * 0.08;

  const stubFlangeData = FLANGE_DATA[stubNB] || FLANGE_DATA[50];
  const flangeOD = stubFlangeData.flangeOD;
  const flangeOuterRadius = flangeOD / SCALE_FACTOR / 2;
  const flangePCD = stubFlangeData.pcd;
  const flangePcdRadius = flangePCD / SCALE_FACTOR / 2;
  const boltHoleRadius = stubFlangeData.holeID / 2 / SCALE_FACTOR;
  const boltCount = stubFlangeData.boltHoles;
  const flangeThickness = stubFlangeData.thickness / SCALE_FACTOR;

  const pipeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    return new THREE.ExtrudeGeometry(shape, {
      depth: stubLength,
      bevelEnabled: false,
      curveSegments: 32,
    });
  }, [outerRadius, innerRadius, stubLength]);

  const weldGeometry = useMemo(() => {
    return new THREE.TorusGeometry(outerRadius, weldRadius, 8, 32);
  }, [outerRadius, weldRadius]);

  const endCapGeometry = useMemo(() => {
    return new THREE.RingGeometry(innerRadius, outerRadius, 32);
  }, [innerRadius, outerRadius]);

  const retainingRingOuterR = outerRadius * 1.15;
  const retainingRingInnerR = outerRadius;
  const tubeRadius = (retainingRingOuterR - retainingRingInnerR) / 2;
  const torusRadius = retainingRingInnerR + tubeRadius;
  const rotatingFlangeOffset = 80 / SCALE_FACTOR;

  const flangeWithHolesGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeOuterRadius, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const x = Math.cos(angle) * flangePcdRadius;
      const y = Math.sin(angle) * flangePcdRadius;
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, boltHoleRadius, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    return new THREE.ExtrudeGeometry(shape, {
      depth: flangeThickness,
      bevelEnabled: false,
      curveSegments: 32,
    });
  }, [flangeOuterRadius, innerRadius, flangeThickness, flangePcdRadius, boltHoleRadius, boltCount]);

  const rotatingFlangeGeometry = useMemo(() => {
    const boreR = outerRadius * 1.05;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeOuterRadius, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const x = Math.cos(angle) * flangePcdRadius;
      const y = Math.sin(angle) * flangePcdRadius;
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, boltHoleRadius, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    return new THREE.ExtrudeGeometry(shape, {
      depth: flangeThickness,
      bevelEnabled: false,
      curveSegments: 32,
    });
  }, [flangeOuterRadius, outerRadius, flangeThickness, flangePcdRadius, boltHoleRadius, boltCount]);

  const blankFlangeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeOuterRadius, 0, Math.PI * 2, false);

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const x = Math.cos(angle) * flangePcdRadius;
      const y = Math.sin(angle) * flangePcdRadius;
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, boltHoleRadius, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    return new THREE.ExtrudeGeometry(shape, {
      depth: flangeThickness * 0.6,
      bevelEnabled: false,
      curveSegments: 32,
    });
  }, [flangeOuterRadius, flangeThickness, flangePcdRadius, boltHoleRadius, boltCount]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={pipeGeometry} castShadow receiveShadow>
        <meshStandardMaterial {...pipeOuterMat} />
      </mesh>
      <mesh geometry={weldGeometry} castShadow receiveShadow>
        <meshStandardMaterial {...weldColor} />
      </mesh>
      {!hasFlange && (
        <mesh geometry={endCapGeometry} position={[0, 0, stubLength]} castShadow receiveShadow>
          <meshStandardMaterial {...pipeEndMat} />
        </mesh>
      )}
      {hasFlange && !isRotatingFlange && (
        <mesh
          geometry={flangeWithHolesGeometry}
          position={[0, 0, stubLength]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial {...flangeColor} />
        </mesh>
      )}
      {hasFlange && isRotatingFlange && (
        <>
          <mesh position={[0, 0, stubLength]} castShadow receiveShadow>
            <torusGeometry args={[torusRadius, tubeRadius, 16, 32]} />
            <meshStandardMaterial
              color="#b0b0b0"
              metalness={0.9}
              roughness={0.15}
              envMapIntensity={1.3}
            />
          </mesh>
          <mesh
            geometry={rotatingFlangeGeometry}
            position={[0, 0, stubLength - rotatingFlangeOffset]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial {...rotatingFlangeColor} />
          </mesh>
        </>
      )}
      {hasFlange && hasBlankFlange && (
        <BlankFlange
          center={
            new THREE.Vector3(
              0,
              0,
              isRotatingFlange
                ? stubLength + tubeRadius * 2 + 50 / SCALE_FACTOR
                : stubLength + flangeThickness + 50 / SCALE_FACTOR,
            )
          }
          normal={new THREE.Vector3(0, 0, 1)}
          pipeR={outerRadius}
          nb={stubNB}
        />
      )}
    </group>
  );
}

function LateralScene({
  nominalBore,
  outerDiameter,
  wallThickness,
  angleDegrees,
  angleRange,
  hasInletFlange = false,
  hasOutletFlange = false,
  hasBranchFlange = false,
  inletFlangeType = null,
  outletFlangeType = null,
  branchFlangeType = null,
  hasBlankInlet = false,
  hasBlankOutlet = false,
  hasBlankBranch = false,
  closureLengthMm = 150,
  stubs = [],
}: Lateral3DPreviewProps) {
  const effectiveAngleRange = angleRange || getAngleRangeFromDegrees(angleDegrees);
  const lateralDims = getLateralDimensionsForAngle(nominalBore, effectiveAngleRange);

  const od = outerDiameterFromNB(nominalBore, outerDiameter || lateralDims?.outsideDiameterMm || 0);
  const wt = wallThicknessFromNB(nominalBore, wallThickness || 0);
  const id = od - 2 * wt;

  const branchHeight = lateralDims?.heightMm || od * 2;
  const baseLength = lateralDims?.baseLengthMm || od * 3;

  const outerRadius = od / SCALE_FACTOR / 2;
  const innerRadius = Math.max(0.001, id / SCALE_FACTOR / 2);
  const heightScaled = branchHeight / SCALE_FACTOR;
  const halfRunLength = baseLength / SCALE_FACTOR / 2;

  const angleRad = (angleDegrees * Math.PI) / 180;

  const flangeData = FLANGE_DATA[nominalBore] || FLANGE_DATA[400];
  const flangeOD = flangeData.flangeOD;
  const flangeThickness = flangeData.thickness / SCALE_FACTOR;
  const flangePCD = flangeData.pcd;
  const boltHoleRadius = flangeData.holeID / 2 / SCALE_FACTOR;
  const boltCount = flangeData.boltHoles;
  const rotatingFlangeOffset = 80 / SCALE_FACTOR;
  const flangeThickScaled = flangeData.thickness / SCALE_FACTOR;
  const flangeOffset = (flangeThickScaled / 2) * 0.8;
  const closureLength = (closureLengthMm || 150) / SCALE_FACTOR;
  const gapLength = 100 / SCALE_FACTOR;
  const blankFlangeGap = 50 / SCALE_FACTOR;

  const closureMaterial = {
    color: "#2a2a2a",
    metalness: 0.6,
    roughness: 0.6,
    envMapIntensity: 0.5,
  };

  const createPipeGeometry = (outerR: number, innerR: number, length: number) => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    return new THREE.ExtrudeGeometry(shape, {
      depth: length,
      bevelEnabled: false,
      curveSegments: 48,
    });
  };

  const createRunPipeWithHoleGeometry = (
    runOuterR: number,
    runInnerR: number,
    runLength: number,
    branchOuterR: number,
    branchOffsetXVal: number,
    lateralAngle: number,
  ) => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const lengthSegments = 256;
    const radialSegments = 128;
    const halfLength = runLength / 2;

    const cotAngle = Math.cos(lateralAngle) / Math.sin(lateralAngle);

    const isInBranchHole = (x: number, angle: number): boolean => {
      const z = runOuterR * Math.sin(angle);
      const y = runOuterR * Math.cos(angle);
      if (y <= 0) return false;

      const holeMargin = branchOuterR * 0.15;
      const effectiveBranchR = branchOuterR - holeMargin;

      const zSq = z * z;
      const branchRSq = effectiveBranchR * effectiveBranchR;
      if (zSq >= branchRSq) return false;

      const xSaddleOffset = Math.sqrt(branchRSq - zSq);
      const angleExtension = y * cotAngle * 0.85;
      const xRelative = x - branchOffsetXVal;

      if (xRelative >= -xSaddleOffset && xRelative <= xSaddleOffset + angleExtension) {
        return true;
      }
      return false;
    };

    const vertexMap: Map<string, number> = new Map();
    const addVertex = (
      x: number,
      y: number,
      z: number,
      nx: number,
      ny: number,
      nz: number,
    ): number => {
      const key = `${x.toFixed(6)}_${y.toFixed(6)}_${z.toFixed(6)}`;
      if (vertexMap.has(key)) {
        return vertexMap.get(key)!;
      }
      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      normals.push(nx, ny, nz);
      vertexMap.set(key, idx);
      return idx;
    };

    for (let l = 0; l < lengthSegments; l++) {
      const x0 = -halfLength + (l / lengthSegments) * runLength;
      const x1 = -halfLength + ((l + 1) / lengthSegments) * runLength;

      for (let r = 0; r < radialSegments; r++) {
        const angle0 = (r / radialSegments) * Math.PI * 2;
        const angle1 = ((r + 1) / radialSegments) * Math.PI * 2;

        const inHole00 = isInBranchHole(x0, angle0);
        const inHole01 = isInBranchHole(x0, angle1);
        const inHole10 = isInBranchHole(x1, angle0);
        const inHole11 = isInBranchHole(x1, angle1);

        const y00 = runOuterR * Math.cos(angle0);
        const z00 = runOuterR * Math.sin(angle0);
        const y01 = runOuterR * Math.cos(angle1);
        const z01 = runOuterR * Math.sin(angle1);

        const idx00 = addVertex(x0, y00, z00, 0, Math.cos(angle0), Math.sin(angle0));
        const idx01 = addVertex(x0, y01, z01, 0, Math.cos(angle1), Math.sin(angle1));
        const idx10 = addVertex(x1, y00, z00, 0, Math.cos(angle0), Math.sin(angle0));
        const idx11 = addVertex(x1, y01, z01, 0, Math.cos(angle1), Math.sin(angle1));

        if (!(inHole00 && inHole10 && inHole01)) {
          indices.push(idx00, idx10, idx01);
        }
        if (!(inHole01 && inHole10 && inHole11)) {
          indices.push(idx01, idx10, idx11);
        }
      }
    }

    const innerStartIdx = vertices.length / 3;
    vertexMap.clear();

    for (let l = 0; l < lengthSegments; l++) {
      const x0 = -halfLength + (l / lengthSegments) * runLength;
      const x1 = -halfLength + ((l + 1) / lengthSegments) * runLength;

      for (let r = 0; r < radialSegments; r++) {
        const angle0 = (r / radialSegments) * Math.PI * 2;
        const angle1 = ((r + 1) / radialSegments) * Math.PI * 2;

        const inHole00 = isInBranchHole(x0, angle0);
        const inHole01 = isInBranchHole(x0, angle1);
        const inHole10 = isInBranchHole(x1, angle0);
        const inHole11 = isInBranchHole(x1, angle1);

        const y00 = runInnerR * Math.cos(angle0);
        const z00 = runInnerR * Math.sin(angle0);
        const y01 = runInnerR * Math.cos(angle1);
        const z01 = runInnerR * Math.sin(angle1);

        const idx00 = addVertex(x0, y00, z00, 0, -Math.cos(angle0), -Math.sin(angle0));
        const idx01 = addVertex(x0, y01, z01, 0, -Math.cos(angle1), -Math.sin(angle1));
        const idx10 = addVertex(x1, y00, z00, 0, -Math.cos(angle0), -Math.sin(angle0));
        const idx11 = addVertex(x1, y01, z01, 0, -Math.cos(angle1), -Math.sin(angle1));

        if (!(inHole00 && inHole10 && inHole01)) {
          indices.push(idx00, idx01, idx10);
        }
        if (!(inHole01 && inHole10 && inHole11)) {
          indices.push(idx01, idx11, idx10);
        }
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    return geometry;
  };

  const branchOffsetX = useMemo(() => {
    return halfRunLength - heightScaled;
  }, [halfRunLength, heightScaled]);

  const holeOffsetAdjustment = outerRadius * 0.5;

  const runPipeGeometry = useMemo(
    () =>
      createRunPipeWithHoleGeometry(
        outerRadius,
        innerRadius,
        halfRunLength * 2,
        outerRadius,
        branchOffsetX + holeOffsetAdjustment,
        angleRad,
      ),
    [outerRadius, innerRadius, halfRunLength, branchOffsetX, angleRad, holeOffsetAdjustment],
  );

  const branchPipeLength = heightScaled;

  const createSaddleCutBranchGeometry = (
    branchOuterR: number,
    branchInnerR: number,
    runOuterR: number,
    totalHeight: number,
    lateralAngle: number,
  ) => {
    const radialSegments = 48;
    const heightSegments = 24;
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    const cotAngle = Math.cos(lateralAngle) / Math.sin(lateralAngle);
    const cutPadding = runOuterR * 0.05;

    const saddleBottomZ = (phi: number, radius: number): number => {
      const localX = radius * Math.cos(phi);
      const localY = radius * Math.sin(phi);
      const yOnRun = Math.sqrt(Math.max(0, runOuterR * runOuterR - localY * localY));
      const angleOffset = -localX * cotAngle;
      return yOnRun + angleOffset + cutPadding;
    };

    for (let h = 0; h <= heightSegments; h++) {
      for (let r = 0; r <= radialSegments; r++) {
        const phi = (r / radialSegments) * Math.PI * 2;
        const x = branchOuterR * Math.cos(phi);
        const y = branchOuterR * Math.sin(phi);

        const bottomZ = saddleBottomZ(phi, branchOuterR);
        const z = bottomZ + (h / heightSegments) * (totalHeight - bottomZ);

        vertices.push(x, y, z);

        const nx = Math.cos(phi);
        const ny = Math.sin(phi);
        normals.push(nx, ny, 0);
      }
    }

    const outerVertexCount = vertices.length / 3;

    for (let h = 0; h <= heightSegments; h++) {
      for (let r = 0; r <= radialSegments; r++) {
        const phi = (r / radialSegments) * Math.PI * 2;
        const x = branchInnerR * Math.cos(phi);
        const y = branchInnerR * Math.sin(phi);

        const bottomZ = saddleBottomZ(phi, branchInnerR);
        const z = bottomZ + (h / heightSegments) * (totalHeight - bottomZ);

        vertices.push(x, y, z);

        const nx = -Math.cos(phi);
        const ny = -Math.sin(phi);
        normals.push(nx, ny, 0);
      }
    }

    for (let h = 0; h < heightSegments; h++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = h * (radialSegments + 1) + r;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    for (let h = 0; h < heightSegments; h++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = outerVertexCount + h * (radialSegments + 1) + r;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, c, b);
        indices.push(c, d, b);
      }
    }

    const topCapStartIdx = vertices.length / 3;
    for (let r = 0; r <= radialSegments; r++) {
      const phi = (r / radialSegments) * Math.PI * 2;
      vertices.push(branchOuterR * Math.cos(phi), branchOuterR * Math.sin(phi), totalHeight);
      normals.push(0, 0, 1);
      vertices.push(branchInnerR * Math.cos(phi), branchInnerR * Math.sin(phi), totalHeight);
      normals.push(0, 0, 1);
    }

    for (let r = 0; r < radialSegments; r++) {
      const outer1 = topCapStartIdx + r * 2;
      const inner1 = outer1 + 1;
      const outer2 = outer1 + 2;
      const inner2 = inner1 + 2;
      indices.push(outer1, inner1, outer2);
      indices.push(inner1, inner2, outer2);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  };

  const branchPipeGeometry = useMemo(
    () =>
      createSaddleCutBranchGeometry(
        outerRadius,
        innerRadius,
        outerRadius,
        branchPipeLength,
        angleRad,
      ),
    [outerRadius, innerRadius, branchPipeLength, angleRad],
  );

  const createSaddleWeldGeometry = useMemo(() => {
    const segments = 64;
    const weldRadius = outerRadius * 0.035;
    const runOuterR = outerRadius;
    const branchOuterR = outerRadius;

    const cotAngle = Math.cos(angleRad) / Math.sin(angleRad);
    const cutPadding = runOuterR * 0.39;

    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const phi = (i / segments) * Math.PI * 2;

      const localX = branchOuterR * Math.cos(phi);
      const localY = branchOuterR * Math.sin(phi);

      const yOnRun = Math.sqrt(Math.max(0, runOuterR * runOuterR - localY * localY));
      const angleOffset = -localX * cotAngle;
      const z = yOnRun + angleOffset + cutPadding;

      points.push(new THREE.Vector3(localX, localY, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, true);
    const geometry = new THREE.TubeGeometry(curve, segments * 2, weldRadius, 8, true);

    return geometry;
  }, [outerRadius, angleRad]);

  const branchStartY = 0;

  const branchEndPosition = useMemo(() => {
    const endX = branchOffsetX + Math.cos(angleRad) * branchPipeLength;
    const endY = branchStartY + Math.sin(angleRad) * branchPipeLength;
    return { x: endX, y: endY };
  }, [branchOffsetX, branchStartY, angleRad, branchPipeLength]);

  return (
    <Center>
      <group>
        <mesh geometry={runPipeGeometry} position={[0, 0, 0]} castShadow receiveShadow>
          <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
        </mesh>

        <group
          position={[branchOffsetX, branchStartY, 0]}
          rotation={[0, 0, Math.PI / 2 + angleRad]}
        >
          <mesh
            geometry={branchPipeGeometry}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial {...pipeOuterMat} />
          </mesh>

          <mesh
            geometry={createSaddleWeldGeometry}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial {...weldColor} />
          </mesh>

          {hasBranchFlange &&
            (branchFlangeType === "rotating" ? (
              <>
                <RetainingRing
                  center={new THREE.Vector3(0, -heightScaled, 0)}
                  normal={new THREE.Vector3(0, -1, 0)}
                  pipeR={outerRadius}
                  innerR={innerRadius}
                  wallThickness={outerRadius - innerRadius}
                />
                <RotatingFlange
                  center={new THREE.Vector3(0, -heightScaled + rotatingFlangeOffset, 0)}
                  normal={new THREE.Vector3(0, -1, 0)}
                  pipeR={outerRadius}
                  innerR={innerRadius}
                  nb={nominalBore}
                />
                {hasBlankBranch && (
                  <BlankFlange
                    center={
                      new THREE.Vector3(0, -heightScaled - flangeThickScaled - blankFlangeGap, 0)
                    }
                    normal={new THREE.Vector3(0, -1, 0)}
                    pipeR={outerRadius}
                    nb={nominalBore}
                  />
                )}
              </>
            ) : branchFlangeType === "loose" ? (
              <>
                {/* Closure piece (dark pipe) */}
                <mesh position={[0, -heightScaled - closureLength / 2, 0]}>
                  <cylinderGeometry args={[outerRadius, outerRadius, closureLength, 32, 1, true]} />
                  <meshStandardMaterial {...closureMaterial} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[0, -heightScaled - closureLength / 2, 0]}>
                  <cylinderGeometry
                    args={[innerRadius, innerRadius, closureLength + 0.01, 32, 1, true]}
                  />
                  <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                </mesh>
                {/* Loose flange after closure + gap */}
                <Flange
                  center={new THREE.Vector3(0, -heightScaled - closureLength - gapLength, 0)}
                  normal={new THREE.Vector3(0, -1, 0)}
                  pipeR={outerRadius}
                  innerR={innerRadius}
                  nb={nominalBore}
                />
                {hasBlankBranch && (
                  <BlankFlange
                    center={
                      new THREE.Vector3(
                        0,
                        -heightScaled -
                          closureLength -
                          gapLength -
                          flangeThickScaled -
                          blankFlangeGap,
                        0,
                      )
                    }
                    normal={new THREE.Vector3(0, -1, 0)}
                    pipeR={outerRadius}
                    nb={nominalBore}
                  />
                )}
              </>
            ) : (
              <>
                <Flange
                  center={new THREE.Vector3(0, -heightScaled - flangeOffset, 0)}
                  normal={new THREE.Vector3(0, -1, 0)}
                  pipeR={outerRadius}
                  innerR={innerRadius}
                  nb={nominalBore}
                />
                {hasBlankBranch && (
                  <BlankFlange
                    center={
                      new THREE.Vector3(
                        0,
                        -heightScaled - flangeOffset - flangeThickScaled - blankFlangeGap,
                        0,
                      )
                    }
                    normal={new THREE.Vector3(0, -1, 0)}
                    pipeR={outerRadius}
                    nb={nominalBore}
                  />
                )}
              </>
            ))}

          {stubs
            .filter((stub) => stub.outletLocation === "branch")
            .map((stub, idx) => {
              const stubDistanceScaled = stub.distanceFromOutletMm / SCALE_FACTOR;
              const positionRad = (stub.positionDegrees * Math.PI) / 180;
              const yPos = -heightScaled + stubDistanceScaled;
              const xOffset = outerRadius * Math.sin(positionRad);
              const zOffset = outerRadius * Math.cos(positionRad);
              const stubHasFlange =
                stub.endConfiguration === "flanged" || stub.endConfiguration === "rf";
              return (
                <StubComponent
                  key={`branch-stub-${idx}`}
                  position={[xOffset, yPos, zOffset]}
                  rotation={[0, -positionRad, 0]}
                  stubNB={stub.nominalBoreMm}
                  stubLengthMm={stub.stubLengthMm || 150}
                  hasFlange={stubHasFlange}
                  isRotatingFlange={stub.endConfiguration === "rf"}
                  hasBlankFlange={stubHasFlange && stub.hasBlankFlange}
                />
              );
            })}
        </group>

        {hasInletFlange &&
          (inletFlangeType === "rotating" ? (
            <>
              <RetainingRing
                center={new THREE.Vector3(-halfRunLength, 0, 0)}
                normal={new THREE.Vector3(-1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                wallThickness={outerRadius - innerRadius}
              />
              <RotatingFlange
                center={new THREE.Vector3(-halfRunLength + rotatingFlangeOffset, 0, 0)}
                normal={new THREE.Vector3(-1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              {hasBlankInlet && (
                <BlankFlange
                  center={
                    new THREE.Vector3(-halfRunLength - flangeThickScaled - blankFlangeGap, 0, 0)
                  }
                  normal={new THREE.Vector3(-1, 0, 0)}
                  pipeR={outerRadius}
                  nb={nominalBore}
                />
              )}
            </>
          ) : inletFlangeType === "loose" ? (
            <>
              {/* Closure piece (dark pipe) */}
              <mesh
                position={[-halfRunLength - closureLength / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[outerRadius, outerRadius, closureLength, 32, 1, true]} />
                <meshStandardMaterial {...closureMaterial} side={THREE.DoubleSide} />
              </mesh>
              <mesh
                position={[-halfRunLength - closureLength / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry
                  args={[innerRadius, innerRadius, closureLength + 0.01, 32, 1, true]}
                />
                <meshStandardMaterial color="#333333" side={THREE.BackSide} />
              </mesh>
              {/* Loose flange after closure + gap */}
              <Flange
                center={new THREE.Vector3(-halfRunLength - closureLength - gapLength, 0, 0)}
                normal={new THREE.Vector3(-1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              {hasBlankInlet && (
                <BlankFlange
                  center={
                    new THREE.Vector3(
                      -halfRunLength -
                        closureLength -
                        gapLength -
                        flangeThickScaled -
                        blankFlangeGap,
                      0,
                      0,
                    )
                  }
                  normal={new THREE.Vector3(-1, 0, 0)}
                  pipeR={outerRadius}
                  nb={nominalBore}
                />
              )}
            </>
          ) : (
            <>
              <Flange
                center={new THREE.Vector3(-halfRunLength - flangeOffset, 0, 0)}
                normal={new THREE.Vector3(-1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              {hasBlankInlet && (
                <BlankFlange
                  center={
                    new THREE.Vector3(
                      -halfRunLength - flangeOffset - flangeThickScaled - blankFlangeGap,
                      0,
                      0,
                    )
                  }
                  normal={new THREE.Vector3(-1, 0, 0)}
                  pipeR={outerRadius}
                  nb={nominalBore}
                />
              )}
            </>
          ))}

        {hasOutletFlange &&
          (outletFlangeType === "rotating" ? (
            <>
              <RetainingRing
                center={new THREE.Vector3(halfRunLength, 0, 0)}
                normal={new THREE.Vector3(1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                wallThickness={outerRadius - innerRadius}
              />
              <RotatingFlange
                center={new THREE.Vector3(halfRunLength - rotatingFlangeOffset, 0, 0)}
                normal={new THREE.Vector3(1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              {hasBlankOutlet && (
                <BlankFlange
                  center={
                    new THREE.Vector3(halfRunLength + flangeThickScaled + blankFlangeGap, 0, 0)
                  }
                  normal={new THREE.Vector3(1, 0, 0)}
                  pipeR={outerRadius}
                  nb={nominalBore}
                />
              )}
            </>
          ) : outletFlangeType === "loose" ? (
            <>
              {/* Closure piece (dark pipe) */}
              <mesh
                position={[halfRunLength + closureLength / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[outerRadius, outerRadius, closureLength, 32, 1, true]} />
                <meshStandardMaterial {...closureMaterial} side={THREE.DoubleSide} />
              </mesh>
              <mesh
                position={[halfRunLength + closureLength / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry
                  args={[innerRadius, innerRadius, closureLength + 0.01, 32, 1, true]}
                />
                <meshStandardMaterial color="#333333" side={THREE.BackSide} />
              </mesh>
              {/* Loose flange after closure + gap */}
              <Flange
                center={new THREE.Vector3(halfRunLength + closureLength + gapLength, 0, 0)}
                normal={new THREE.Vector3(1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              {hasBlankOutlet && (
                <BlankFlange
                  center={
                    new THREE.Vector3(
                      halfRunLength +
                        closureLength +
                        gapLength +
                        flangeThickScaled +
                        blankFlangeGap,
                      0,
                      0,
                    )
                  }
                  normal={new THREE.Vector3(1, 0, 0)}
                  pipeR={outerRadius}
                  nb={nominalBore}
                />
              )}
            </>
          ) : (
            <>
              <Flange
                center={new THREE.Vector3(halfRunLength + flangeOffset, 0, 0)}
                normal={new THREE.Vector3(1, 0, 0)}
                pipeR={outerRadius}
                innerR={innerRadius}
                nb={nominalBore}
              />
              {hasBlankOutlet && (
                <BlankFlange
                  center={
                    new THREE.Vector3(
                      halfRunLength + flangeOffset + flangeThickScaled + blankFlangeGap,
                      0,
                      0,
                    )
                  }
                  normal={new THREE.Vector3(1, 0, 0)}
                  pipeR={outerRadius}
                  nb={nominalBore}
                />
              )}
            </>
          ))}

        {stubs
          .filter((stub) => stub.outletLocation !== "branch")
          .map((stub, idx) => {
            const stubDistanceScaled = stub.distanceFromOutletMm / SCALE_FACTOR;
            const positionRad = (stub.positionDegrees * Math.PI) / 180;
            const stubHasFlange =
              stub.endConfiguration === "flanged" || stub.endConfiguration === "rf";

            if (stub.outletLocation === "mainA") {
              const xPos = -halfRunLength + stubDistanceScaled;
              const yPos = outerRadius * Math.sin(positionRad);
              const zPos = outerRadius * Math.cos(positionRad);
              return (
                <StubComponent
                  key={`mainA-stub-${idx}`}
                  position={[xPos, yPos, zPos]}
                  rotation={[-positionRad, 0, 0]}
                  stubNB={stub.nominalBoreMm}
                  stubLengthMm={stub.stubLengthMm || 150}
                  hasFlange={stubHasFlange}
                  isRotatingFlange={stub.endConfiguration === "rf"}
                  hasBlankFlange={stubHasFlange && stub.hasBlankFlange}
                />
              );
            }

            if (stub.outletLocation === "mainB") {
              const xPos = halfRunLength - stubDistanceScaled;
              const yPos = outerRadius * Math.sin(positionRad);
              const zPos = outerRadius * Math.cos(positionRad);
              return (
                <StubComponent
                  key={`mainB-stub-${idx}`}
                  position={[xPos, yPos, zPos]}
                  rotation={[-positionRad, 0, 0]}
                  stubNB={stub.nominalBoreMm}
                  stubLengthMm={stub.stubLengthMm || 150}
                  hasFlange={stubHasFlange}
                  isRotatingFlange={stub.endConfiguration === "rf"}
                  hasBlankFlange={stubHasFlange && stub.hasBlankFlange}
                />
              );
            }

            return null;
          })}

        <mesh
          position={[-halfRunLength, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <ringGeometry args={[innerRadius, outerRadius, 48]} />
          <meshStandardMaterial {...pipeEndMat} />
        </mesh>
        <mesh
          position={[halfRunLength, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <ringGeometry args={[innerRadius, outerRadius, 48]} />
          <meshStandardMaterial {...pipeEndMat} />
        </mesh>

        {/* Dimension Lines */}
        {(() => {
          const branchLengthMm = Math.round(heightScaled * SCALE_FACTOR);
          const baseMm = Math.round(halfRunLength * 2 * SCALE_FACTOR);

          // Branch dimension (B) - measured along the branch from junction to end
          // The branch starts at branchOffsetX on the run pipe and goes at angleRad
          const branchStartX = branchOffsetX;
          const branchStartY = 0;
          const branchEndX = branchOffsetX + Math.cos(angleRad) * heightScaled;
          const branchEndY = Math.sin(angleRad) * heightScaled;

          // C dimension - horizontal distance from outlet flange to branch junction
          // (from +halfRunLength to branchOffsetX along the run pipe)
          const outletToBranchMm = Math.round((halfRunLength - branchOffsetX) * SCALE_FACTOR);

          // Offset the branch dimension line perpendicular to the branch direction
          const perpAngle = angleRad + Math.PI / 2;
          const dimLineOffset = outerRadius * 1.5;
          const offsetX = Math.cos(perpAngle) * dimLineOffset;
          const offsetY = Math.sin(perpAngle) * dimLineOffset;

          // Y position for horizontal C dimension line - below the run pipe, above the A line
          const cDimY = -outerRadius * 1.25;

          return (
            <>
              {/* Dimension B - Branch length along the branch direction (orange) */}
              <Line
                points={[
                  [branchStartX + offsetX, branchStartY + offsetY, 0],
                  [branchEndX + offsetX, branchEndY + offsetY, 0],
                ]}
                color="#ff6600"
                lineWidth={3}
              />
              {/* Ticks perpendicular to the branch at start */}
              <Line
                points={[
                  [branchStartX + offsetX * 0.7, branchStartY + offsetY * 0.7, 0],
                  [branchStartX + offsetX * 1.3, branchStartY + offsetY * 1.3, 0],
                ]}
                color="#ff6600"
                lineWidth={3}
              />
              {/* Ticks perpendicular to the branch at end */}
              <Line
                points={[
                  [branchEndX + offsetX * 0.7, branchEndY + offsetY * 0.7, 0],
                  [branchEndX + offsetX * 1.3, branchEndY + offsetY * 1.3, 0],
                ]}
                color="#ff6600"
                lineWidth={3}
              />
              {/* Label for branch length B */}
              <Html
                position={[
                  (branchStartX + branchEndX) / 2 + offsetX * 1.5,
                  (branchStartY + branchEndY) / 2 + offsetY * 1.5,
                  0,
                ]}
                center
              >
                <div className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  B: {branchLengthMm}mm
                </div>
              </Html>

              {/* Dimension C - Horizontal from branch junction to outlet flange (yellow) */}
              <Line
                points={[
                  [branchOffsetX, cDimY, 0],
                  [halfRunLength, cDimY, 0],
                ]}
                color="#ffcc00"
                lineWidth={3}
              />
              {/* Vertical ticks for horizontal C line */}
              <Line
                points={[
                  [branchOffsetX, cDimY - 0.08, 0],
                  [branchOffsetX, cDimY + 0.08, 0],
                ]}
                color="#ffcc00"
                lineWidth={3}
              />
              <Line
                points={[
                  [halfRunLength, cDimY - 0.08, 0],
                  [halfRunLength, cDimY + 0.08, 0],
                ]}
                color="#ffcc00"
                lineWidth={3}
              />
              {/* Label for branch-to-outlet distance C */}
              <Html position={[(branchOffsetX + halfRunLength) / 2, cDimY - 0.1, 0]} center>
                <div className="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  C: {outletToBranchMm}mm
                </div>
              </Html>

              {/* Dimension A - Base length horizontal (blue) */}
              {/* Position below the run pipe */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius * 1.5, 0],
                  [halfRunLength, -outerRadius * 1.5, 0],
                ]}
                color="#0066ff"
                lineWidth={3}
              />
              {/* Vertical ticks for horizontal line */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius * 1.5 - 0.08, 0],
                  [-halfRunLength, -outerRadius * 1.5 + 0.08, 0],
                ]}
                color="#0066ff"
                lineWidth={3}
              />
              <Line
                points={[
                  [halfRunLength, -outerRadius * 1.5 - 0.08, 0],
                  [halfRunLength, -outerRadius * 1.5 + 0.08, 0],
                ]}
                color="#0066ff"
                lineWidth={3}
              />
              {/* Label for base length A */}
              <Html position={[0, -outerRadius * 1.5 - 0.2, 0]} center>
                <div className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-lg">
                  A: {baseMm}mm
                </div>
              </Html>
            </>
          );
        })()}
      </group>
    </Center>
  );
}

export default function Lateral3DPreview(props: Lateral3DPreviewProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const {
    nominalBore,
    outerDiameter,
    angleDegrees,
    angleRange,
    hasInletFlange = false,
    hasOutletFlange = false,
    hasBranchFlange = false,
    inletFlangeType = null,
    outletFlangeType = null,
    branchFlangeType = null,
    closureLengthMm = 150,
    stubs = [],
  } = props;

  const effectiveAngleRange = angleRange || getAngleRangeFromDegrees(angleDegrees);
  const lateralDims = getLateralDimensionsForAngle(nominalBore, effectiveAngleRange);

  const od = outerDiameterFromNB(nominalBore, outerDiameter || lateralDims?.outsideDiameterMm || 0);
  const wt = wallThicknessFromNB(nominalBore, props.wallThickness || 0);
  const id = od - 2 * wt;

  const flangeData = FLANGE_DATA[nominalBore] || FLANGE_DATA[400];
  const flangeCount = [hasInletFlange, hasOutletFlange, hasBranchFlange].filter(Boolean).length;

  const branchHeight = lateralDims?.heightMm || od * 2;
  const baseLength = lateralDims?.baseLengthMm || od * 3;

  const runExtent = (baseLength / SCALE_FACTOR) * PREVIEW_SCALE;
  const heightExtent = (branchHeight / SCALE_FACTOR) * PREVIEW_SCALE;
  const depthExtent = (od / SCALE_FACTOR) * PREVIEW_SCALE;

  const boundingRadius = Math.max(
    0.4,
    Math.sqrt((runExtent / 2) ** 2 + (heightExtent / 2) ** 2 + (depthExtent / 2) ** 2),
  );

  const computeDistance = (fov: number) => {
    const fovRad = (fov * Math.PI) / 180;
    const dist = boundingRadius / Math.sin(fovRad / 2);
    return Math.min(Math.max(dist * 1.15, MIN_CAMERA_DISTANCE), MAX_CAMERA_DISTANCE);
  };

  const defaultCameraDistance = computeDistance(50);

  const defaultCameraPosition = useMemo(
    () =>
      [defaultCameraDistance, defaultCameraDistance * 0.8, defaultCameraDistance] as [
        number,
        number,
        number,
      ],
    [defaultCameraDistance],
  );

  const defaultControls = useMemo(
    () => ({
      min: Math.max(defaultCameraDistance * 0.4, 0.8),
      max: Math.min(defaultCameraDistance * 4, MAX_CAMERA_DISTANCE * 1.5),
    }),
    [defaultCameraDistance],
  );

  if (isHidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border px-3 py-2 flex justify-between">
        <span className="text-sm text-gray-600">3D Preview</span>
        <button onClick={() => setIsHidden(false)} className="text-xs text-blue-600">
          Show
        </button>
      </div>
    );
  }

  const rotatingFlangeCount = [
    inletFlangeType === "rotating",
    outletFlangeType === "rotating",
    branchFlangeType === "rotating",
  ].filter(Boolean).length;

  const looseFlangeCount = [
    inletFlangeType === "loose",
    outletFlangeType === "loose",
    branchFlangeType === "loose",
  ].filter(Boolean).length;

  const flangeTypeLabel = (() => {
    if (rotatingFlangeCount > 0 && looseFlangeCount > 0) return "RF+LF";
    if (rotatingFlangeCount > 0) return "RF";
    if (looseFlangeCount > 0) return "LF";
    return "FAE";
  })();

  const getFlangeConfigLabel = () => {
    const parts: string[] = [];
    if (hasInletFlange) {
      const typeLabel =
        inletFlangeType === "rotating" ? "R/F" : inletFlangeType === "loose" ? "L/F" : "";
      parts.push(typeLabel ? `Inlet(${typeLabel})` : "Inlet");
    }
    if (hasOutletFlange) {
      const typeLabel =
        outletFlangeType === "rotating" ? "R/F" : outletFlangeType === "loose" ? "L/F" : "";
      parts.push(typeLabel ? `Outlet(${typeLabel})` : "Outlet");
    }
    if (hasBranchFlange) {
      const typeLabel =
        branchFlangeType === "rotating" ? "R/F" : branchFlangeType === "loose" ? "L/F" : "";
      parts.push(typeLabel ? `Branch(${typeLabel})` : "Branch");
    }
    return parts.join(" | ");
  };

  return (
    <>
      <div
        data-lateral-preview
        className="w-full bg-slate-50 rounded-md border overflow-hidden relative"
        style={{ height: "500px", minHeight: "500px" }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: defaultCameraPosition, fov: 50, near: 0.01, far: 50000 }}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        >
          <ambientLight intensity={LIGHTING_CONFIG.ambient.intensity} />
          <directionalLight
            position={LIGHTING_CONFIG.keyLight.position}
            intensity={LIGHTING_CONFIG.keyLight.intensity}
            castShadow
          />
          <directionalLight
            position={LIGHTING_CONFIG.fillLight.position}
            intensity={LIGHTING_CONFIG.fillLight.intensity}
          />
          <Environment
            preset={LIGHTING_CONFIG.environment.preset}
            background={LIGHTING_CONFIG.environment.background}
          />
          <group scale={PREVIEW_SCALE}>
            <LateralScene {...props} />
          </group>
          <ContactShadows position={[0, -3, 0]} opacity={0.4} scale={15} />
          <OrbitControls
            makeDefault
            enablePan
            minDistance={defaultControls.min}
            maxDistance={defaultControls.max}
          />
        </Canvas>

        <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded">
          <span className="text-purple-700 font-medium">Hollow Pipe Preview</span>
        </div>

        <div
          data-info-box
          className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-gray-200 leading-snug"
        >
          <div className="font-bold text-blue-800 mb-0.5">LATERAL</div>
          <div className="text-gray-900 font-medium">
            OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm
          </div>
          <div className="text-gray-700">
            WT: {wt.toFixed(1)}mm | {angleDegrees}°
          </div>
          {lateralDims && (
            <div className="text-gray-700">
              H: {lateralDims.heightMm}mm | B: {lateralDims.baseLengthMm}mm
            </div>
          )}
          {stubs.length > 0 && (
            <div className="text-gray-700">
              Stubs: {stubs.map((s) => `${s.nominalBoreMm}NB`).join(" | ")}
            </div>
          )}
          {flangeCount > 0 && (
            <>
              <div className="font-bold text-blue-800 mt-1 mb-0.5">
                FLANGE ({flangeCount > 1 ? `${flangeCount}X_` : ""}
                {flangeTypeLabel})
              </div>
              {looseFlangeCount > 0 && (
                <div className="text-gray-700">C1: {closureLengthMm || 150}mm</div>
              )}
              <div className="text-gray-700">
                OD: {flangeData.flangeOD}mm | PCD: {flangeData.pcd}mm
              </div>
              <div className="text-gray-700">
                Holes: {flangeData.boltHoles} × Ø{flangeData.holeID}mm
              </div>
              <div className="text-gray-700">
                Bolts: {flangeData.boltHoles} × M{flangeData.boltSize} × {flangeData.boltLength}mm
              </div>
              <div className="text-gray-700">Thickness: {flangeData.thickness}mm</div>
              <div className="text-blue-700 font-medium">SABS 1123 T1000/3</div>
              {stubs.length > 0 && (
                <div className="text-orange-700 font-medium">{stubs.length} stub(s)</div>
              )}
            </>
          )}
        </div>

        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {showDebug && (
            <div className="text-[10px] text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm font-mono">
              NB:{nominalBore} | Angle:{angleDegrees}° | Stubs:{stubs.length}
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
              const lateralAngle = angleDegrees;
              const odMm = od;
              const heightMm = lateralDims?.heightMm || odMm * 2;
              const baseMm = lateralDims?.baseLengthMm || odMm * 3;
              const dxfContent = `0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0\n20\n0\n11\n${baseMm}\n21\n0\n0\nLINE\n8\n0\n10\n${baseMm / 2}\n20\n0\n11\n${baseMm / 2 + heightMm * Math.cos((lateralAngle * Math.PI) / 180)}\n21\n${heightMm * Math.sin((lateralAngle * Math.PI) / 180)}\n0\nENDSEC\n0\nEOF`;
              const blob = new Blob([dxfContent], { type: "application/dxf" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `lateral_${nominalBore}NB_${lateralAngle}deg.dxf`;
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
            className="relative w-full h-full max-w-[95vw] max-h-[90vh] bg-slate-100 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-4 right-4 z-[10001] bg-white p-2 rounded-full shadow"
            >
              ✕
            </button>
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ position: defaultCameraPosition, fov: 50, near: 0.01, far: 50000 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ambientLight intensity={0.4} />
              <directionalLight
                position={[10, 15, 10]}
                intensity={2.5}
                castShadow
                shadow-mapSize={[1024, 1024]}
              />
              <directionalLight position={[-8, 10, -5]} intensity={1.5} />
              <pointLight position={[0, -5, 0]} intensity={0.8} />
              <Environment preset="warehouse" background={false} />
              <group scale={PREVIEW_SCALE}>
                <LateralScene {...props} />
              </group>
              <ContactShadows position={[0, -3, 0]} opacity={0.4} scale={15} />
              <OrbitControls
                makeDefault
                enablePan
                minDistance={defaultControls.min}
                maxDistance={defaultControls.max}
              />
            </Canvas>
          </div>
        </div>
      )}
    </>
  );
}
