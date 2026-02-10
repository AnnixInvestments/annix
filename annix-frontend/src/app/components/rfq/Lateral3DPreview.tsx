"use client";

import { Center, ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { FLANGE_DATA } from "@/app/lib/3d/flangeData";
import {
  FLANGE_MATERIALS,
  GEOMETRY_CONSTANTS,
  LIGHTING_CONFIG,
  PIPE_MATERIALS,
  SCENE_CONSTANTS,
  WELD_MATERIALS,
  nbToOd,
  outerDiameterFromNB,
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
  positionDegrees: number;
  endConfiguration?: "plain" | "flanged" | "rf";
  hasBlankFlange?: boolean;
}

interface Lateral3DPreviewProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness?: number;
  angleDegrees: number;
  angleRange?: LateralAngleRange;
  hasInletFlange?: boolean;
  hasOutletFlange?: boolean;
  hasBranchFlange?: boolean;
  stubs?: StubConfig[];
}

function FlangeComponent({
  position,
  rotation,
  outerRadius,
  innerRadius,
  thickness,
  pcdRadius,
  boltHoleRadius,
  boltCount,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  outerRadius: number;
  innerRadius: number;
  thickness: number;
  pcdRadius: number;
  boltHoleRadius: number;
  boltCount: number;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const x = Math.cos(angle) * pcdRadius;
      const y = Math.sin(angle) * pcdRadius;
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, boltHoleRadius, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    return new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: 48,
    });
  }, [outerRadius, innerRadius, thickness, pcdRadius, boltHoleRadius, boltCount]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial {...flangeColor} />
    </mesh>
  );
}

function StubComponent({
  position,
  rotation,
  stubNB,
  hasFlange = false,
  hasBlankFlange = false,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  stubNB: number;
  hasFlange?: boolean;
  hasBlankFlange?: boolean;
}) {
  const stubOD = STUB_NB_TO_OD[stubNB] || 60.3;
  const stubWT = STUB_WALL_THICKNESS[stubNB] || 3.9;
  const stubID = stubOD - 2 * stubWT;
  const stubLength = STUB_LENGTH_MM / SCALE_FACTOR;

  const outerRadius = stubOD / SCALE_FACTOR / 2;
  const innerRadius = stubID / SCALE_FACTOR / 2;
  const weldRadius = outerRadius * 0.08;

  const flangeOD = stubOD * 1.8;
  const flangeOuterRadius = flangeOD / SCALE_FACTOR / 2;
  const flangeThickness = 0.12;

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

  const flangeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeOuterRadius, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    return new THREE.ExtrudeGeometry(shape, {
      depth: flangeThickness,
      bevelEnabled: false,
      curveSegments: 32,
    });
  }, [flangeOuterRadius, innerRadius, flangeThickness]);

  const blankFlangeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeOuterRadius, 0, Math.PI * 2, false);
    return new THREE.ExtrudeGeometry(shape, {
      depth: flangeThickness * 0.6,
      bevelEnabled: false,
      curveSegments: 32,
    });
  }, [flangeOuterRadius, flangeThickness]);

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
      {hasFlange && (
        <mesh geometry={flangeGeometry} position={[0, 0, stubLength]} castShadow receiveShadow>
          <meshStandardMaterial {...flangeColor} />
        </mesh>
      )}
      {hasFlange && hasBlankFlange && (
        <mesh
          geometry={blankFlangeGeometry}
          position={[0, 0, stubLength + flangeThickness + 0.02]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial {...flangeColor} />
        </mesh>
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

          {hasBranchFlange && (
            <FlangeComponent
              position={[0, -heightScaled, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              outerRadius={flangeOD / SCALE_FACTOR / 2}
              innerRadius={innerRadius}
              thickness={flangeThickness}
              pcdRadius={flangePCD / SCALE_FACTOR / 2}
              boltHoleRadius={boltHoleRadius}
              boltCount={boltCount}
            />
          )}

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
                  hasFlange={stubHasFlange}
                  hasBlankFlange={stubHasFlange && stub.hasBlankFlange}
                />
              );
            })}
        </group>

        {hasInletFlange && (
          <FlangeComponent
            position={[-halfRunLength - flangeThickness, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            outerRadius={flangeOD / SCALE_FACTOR / 2}
            innerRadius={innerRadius}
            thickness={flangeThickness}
            pcdRadius={flangePCD / SCALE_FACTOR / 2}
            boltHoleRadius={boltHoleRadius}
            boltCount={boltCount}
          />
        )}

        {hasOutletFlange && (
          <FlangeComponent
            position={[halfRunLength, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            outerRadius={flangeOD / SCALE_FACTOR / 2}
            innerRadius={innerRadius}
            thickness={flangeThickness}
            pcdRadius={flangePCD / SCALE_FACTOR / 2}
            boltHoleRadius={boltHoleRadius}
            boltCount={boltCount}
          />
        )}

        {stubs
          .filter((stub) => stub.outletLocation !== "branch")
          .map((stub, idx) => {
            const stubDistanceScaled = stub.distanceFromOutletMm / SCALE_FACTOR;
            const positionRad = (stub.positionDegrees * Math.PI) / 180;
            const stubHasFlange =
              stub.endConfiguration === "flanged" || stub.endConfiguration === "rf";

            if (stub.outletLocation === "mainA") {
              const xPos = -halfRunLength + stubDistanceScaled;
              const yPos = outerRadius * Math.cos(positionRad);
              const zPos = outerRadius * Math.sin(positionRad);
              return (
                <StubComponent
                  key={`mainA-stub-${idx}`}
                  position={[xPos, yPos, zPos]}
                  rotation={[0, -Math.PI / 2, -positionRad]}
                  stubNB={stub.nominalBoreMm}
                  hasFlange={stubHasFlange}
                  hasBlankFlange={stubHasFlange && stub.hasBlankFlange}
                />
              );
            }

            if (stub.outletLocation === "mainB") {
              const xPos = halfRunLength - stubDistanceScaled;
              const yPos = outerRadius * Math.cos(positionRad);
              const zPos = outerRadius * Math.sin(positionRad);
              return (
                <StubComponent
                  key={`mainB-stub-${idx}`}
                  position={[xPos, yPos, zPos]}
                  rotation={[0, Math.PI / 2, positionRad]}
                  stubNB={stub.nominalBoreMm}
                  hasFlange={stubHasFlange}
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
      </group>
    </Center>
  );
}

export default function Lateral3DPreview(props: Lateral3DPreviewProps) {
  const [isHidden, setIsHidden] = useState(false);

  const {
    nominalBore,
    outerDiameter,
    angleDegrees,
    angleRange,
    hasInletFlange = false,
    hasOutletFlange = false,
    hasBranchFlange = false,
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
      <div className="w-full bg-slate-100 rounded-md border border-slate-200 px-3 py-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          3D Preview - SABS 719 Lateral ({nominalBore}NB @ {angleDegrees}°)
        </span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-[10px] text-blue-600 bg-white px-2 py-1 rounded shadow-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          Show Drawing
        </button>
      </div>
    );
  }

  return (
    <div className="relative mb-4">
      <div className="absolute top-2 left-2 z-10 text-[10px] bg-white/90 px-2 py-1 rounded shadow-sm border border-slate-200">
        SABS 719 Lateral
      </div>

      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <div className="text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded shadow-sm">
          Drag to Rotate
        </div>
        <button
          onClick={() => setIsHidden(true)}
          className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          Hide
        </button>
      </div>

      <div className="w-full h-[400px] bg-gradient-to-b from-slate-200 to-slate-300 rounded-lg overflow-hidden border border-slate-300">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: defaultCameraPosition, fov: 50, near: 0.01, far: 50000 }}
        >
          <ambientLight intensity={LIGHTING_CONFIG.ambient.intensity} />
          <directionalLight
            position={LIGHTING_CONFIG.keyLight.position}
            intensity={LIGHTING_CONFIG.keyLight.intensity}
            castShadow
          />
          <directionalLight position={LIGHTING_CONFIG.fillLight.position} intensity={LIGHTING_CONFIG.fillLight.intensity} />
          <Environment preset={LIGHTING_CONFIG.environment.preset} background={LIGHTING_CONFIG.environment.background} />
          <group scale={PREVIEW_SCALE}>
            <LateralScene {...props} />
          </group>
          <ContactShadows position={[0, -3, 0]} opacity={0.3} scale={20} blur={2} />
          <OrbitControls
            makeDefault
            enablePan
            minDistance={defaultControls.min}
            maxDistance={defaultControls.max}
          />
        </Canvas>
      </div>

      <div className="absolute bottom-2 right-2 z-10 text-xs bg-white/95 px-3 py-2 rounded-lg shadow-lg border border-gray-200">
        <div className="font-bold text-blue-800 mb-1">RUN PIPE ({nominalBore}NB)</div>
        <div className="text-gray-900 font-medium">
          OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm
        </div>
        <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
        <div className="text-gray-700 mt-1">
          Angle: {angleDegrees}° ({effectiveAngleRange})
        </div>
        {lateralDims && (
          <>
            <div className="text-gray-700">Height: {lateralDims.heightMm}mm</div>
            <div className="text-gray-700">Base: {lateralDims.baseLengthMm}mm</div>
          </>
        )}
        {flangeCount > 0 && (
          <>
            <div className="font-bold text-blue-800 mt-2 mb-1">
              FLANGES ({flangeCount}x SABS 1123)
            </div>
            <div className="text-gray-700">
              OD: {flangeData.flangeOD}mm | PCD: {flangeData.pcd}mm
            </div>
            <div className="text-gray-700">
              Bolts: {flangeData.boltHoles}x M{flangeData.boltSize} | Thickness:{" "}
              {flangeData.thickness}mm
            </div>
            <div className="text-gray-600 text-[10px] mt-1">
              {hasInletFlange && "Inlet"}
              {hasInletFlange && (hasOutletFlange || hasBranchFlange) && " | "}
              {hasOutletFlange && "Outlet"}
              {hasOutletFlange && hasBranchFlange && " | "}
              {hasBranchFlange && "Branch"}
            </div>
          </>
        )}
        {stubs.length > 0 && (
          <>
            <div className="font-bold text-orange-700 mt-2 mb-1">STUBS ({stubs.length}x)</div>
            {stubs.map((stub, idx) => {
              const locationLabel =
                stub.outletLocation === "branch"
                  ? "Branch"
                  : stub.outletLocation === "mainA"
                    ? "Main A"
                    : "Main B";
              const hasStubFlange =
                stub.endConfiguration === "flanged" || stub.endConfiguration === "rf";
              const configLabel = hasStubFlange
                ? stub.endConfiguration === "rf"
                  ? "R/F"
                  : "Flanged"
                : "Plain";
              return (
                <div key={idx} className="text-gray-700 text-[10px]">
                  {idx + 1}. {stub.nominalBoreMm}NB @ {locationLabel} ({stub.positionDegrees}°,{" "}
                  {stub.distanceFromOutletMm}mm) - {configLabel}
                  {stub.hasBlankFlange && " +Blank"}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
