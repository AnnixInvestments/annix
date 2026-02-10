"use client";

import { Tube } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { ArcCurve, SaddleCurve } from "@/app/lib/3d/curves";
import { FLANGE_DATA } from "@/app/lib/3d/flangeData";
import {
  FLANGE_MATERIALS,
  GEOMETRY_CONSTANTS,
  PIPE_MATERIALS,
  WELD_MATERIALS,
} from "@/app/lib/config/rfq/rendering3DStandards";

const SCALE = GEOMETRY_CONSTANTS.SCALE;
const WELD_TUBE_RATIO = GEOMETRY_CONSTANTS.WELD_TUBE_RATIO;
const WELD_RING_OVERSIZE = GEOMETRY_CONSTANTS.WELD_RING_OVERSIZE;
const SADDLE_WELD_OVERSIZE = GEOMETRY_CONSTANTS.SADDLE_WELD_OVERSIZE;
const FLANGE_THICKNESS_RATIO = GEOMETRY_CONSTANTS.FLANGE_THICKNESS_RATIO;
const FLANGE_BORE_CLEARANCE = GEOMETRY_CONSTANTS.FLANGE_BORE_CLEARANCE;
const RETAINING_RING_RATIO = GEOMETRY_CONSTANTS.RETAINING_RING_RATIO;
const ROTATING_FLANGE_BORE_CLEARANCE = GEOMETRY_CONSTANTS.ROTATING_FLANGE_BORE_CLEARANCE;
const pipeOuterMat = PIPE_MATERIALS.outer;
const pipeInnerMat = PIPE_MATERIALS.inner;
const pipeEndMat = PIPE_MATERIALS.end;
const weldColor = WELD_MATERIALS.standard;
const flangeColor = FLANGE_MATERIALS.standard;
const blankFlangeColor = FLANGE_MATERIALS.blank;

function closestFlangeNb(nb: number): number {
  const availableNBs = Object.keys(FLANGE_DATA)
    .map(Number)
    .filter((k) => k <= nb);
  return availableNBs.pop() || 200;
}

export interface HollowStraightPipeProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  outerR: number;
  innerR: number;
  capStart?: boolean;
  capEnd?: boolean;
}

export const HollowStraightPipe = ({
  start,
  end,
  outerR,
  innerR,
  capStart = true,
  capEnd = true,
}: HollowStraightPipeProps) => {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const dir = direction.clone().normalize();

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir.x, dir.y, dir.z]);

  const euler = useMemo(() => new THREE.Euler().setFromQuaternion(quaternion), [quaternion]);

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <cylinderGeometry args={[outerR, outerR, length, 32, 1, true]} />
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[innerR, innerR, length, 32, 1, true]} />
        <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
      </mesh>
      {capEnd && (
        <mesh position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[innerR, outerR, 32]} />
          <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
        </mesh>
      )}
      {capStart && (
        <mesh position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[innerR, outerR, 32]} />
          <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export interface HollowBendPipeProps {
  bendCenter: THREE.Vector3;
  bendRadius: number;
  startAngle: number;
  endAngle: number;
  outerR: number;
  innerR: number;
}

export const HollowBendPipe = ({
  bendCenter,
  bendRadius,
  startAngle,
  endAngle,
  outerR,
  innerR,
}: HollowBendPipeProps) => {
  const outerCurve = useMemo(() => {
    return new ArcCurve(bendCenter, bendRadius, startAngle, endAngle);
  }, [bendCenter, bendRadius, startAngle, endAngle]);

  const innerCurve = useMemo(() => {
    return new ArcCurve(bendCenter, bendRadius, startAngle, endAngle);
  }, [bendCenter, bendRadius, startAngle, endAngle]);

  const segments = 64;

  return (
    <group>
      <Tube args={[outerCurve, segments, outerR, 32, false]}>
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </Tube>
      <Tube args={[innerCurve, segments, innerR, 32, false]}>
        <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
      </Tube>
    </group>
  );
};

export interface SegmentedBendPipeProps {
  bendCenter: THREE.Vector3;
  bendRadius: number;
  startAngle: number;
  endAngle: number;
  outerR: number;
  innerR: number;
  numberOfSegments: number;
}

export const SegmentedBendPipe = ({
  bendCenter,
  bendRadius,
  startAngle,
  endAngle,
  outerR,
  innerR,
  numberOfSegments,
}: SegmentedBendPipeProps) => {
  const weldTube = outerR * WELD_TUBE_RATIO;

  const segmentsData = useMemo(() => {
    const totalAngle = endAngle - startAngle;
    const segmentAngle = totalAngle / numberOfSegments;
    const data: Array<{
      startPos: THREE.Vector3;
      endPos: THREE.Vector3;
      midAngle: number;
      weldPos?: THREE.Vector3;
      weldNormal?: THREE.Vector3;
    }> = [];

    for (let i = 0; i < numberOfSegments; i++) {
      const segStart = startAngle + i * segmentAngle;
      const segEnd = startAngle + (i + 1) * segmentAngle;
      const segMid = (segStart + segEnd) / 2;

      const startPos = new THREE.Vector3(
        bendCenter.x + bendRadius * Math.cos(segStart),
        bendCenter.y,
        bendCenter.z + bendRadius * Math.sin(segStart),
      );
      const endPos = new THREE.Vector3(
        bendCenter.x + bendRadius * Math.cos(segEnd),
        bendCenter.y,
        bendCenter.z + bendRadius * Math.sin(segEnd),
      );

      const segment: {
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        midAngle: number;
        weldPos?: THREE.Vector3;
        weldNormal?: THREE.Vector3;
      } = { startPos, endPos, midAngle: segMid };

      if (i < numberOfSegments - 1) {
        segment.weldPos = endPos.clone();
        const weldAngle = segEnd;
        segment.weldNormal = new THREE.Vector3(
          -Math.sin(weldAngle),
          0,
          Math.cos(weldAngle),
        ).normalize();
      }

      data.push(segment);
    }

    return data;
  }, [bendCenter, bendRadius, startAngle, endAngle, numberOfSegments]);

  return (
    <group>
      {segmentsData.map((seg, i) => {
        const direction = seg.endPos.clone().sub(seg.startPos);
        const length = direction.length();
        const midPoint = seg.startPos.clone().add(direction.clone().multiplyScalar(0.5));

        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

        const weldQuaternion = seg.weldNormal
          ? (() => {
              const q = new THREE.Quaternion();
              q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), seg.weldNormal);
              return q;
            })()
          : undefined;

        return (
          <group key={i}>
            <mesh position={[midPoint.x, midPoint.y, midPoint.z]} quaternion={quaternion}>
              <cylinderGeometry args={[outerR, outerR, length, 32, 1, true]} />
              <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[midPoint.x, midPoint.y, midPoint.z]} quaternion={quaternion}>
              <cylinderGeometry args={[innerR, innerR, length, 32, 1, true]} />
              <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
            </mesh>
            {seg.weldPos && seg.weldNormal && weldQuaternion && (
              <mesh
                position={[seg.weldPos.x, seg.weldPos.y, seg.weldPos.z]}
                quaternion={weldQuaternion}
              >
                <torusGeometry args={[outerR * WELD_RING_OVERSIZE, weldTube, 12, 32]} />
                <meshStandardMaterial {...weldColor} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

export interface WeldRingProps {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  radius: number;
  tube: number;
}

export const WeldRing = ({ center, normal, radius, tube }: WeldRingProps) => {
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    return q;
  }, [normal.x, normal.y, normal.z]);

  return (
    <mesh position={[center.x, center.y, center.z]} quaternion={quaternion}>
      <torusGeometry args={[radius, tube, 12, 32]} />
      <meshStandardMaterial {...weldColor} />
    </mesh>
  );
};

export interface SaddleWeldProps {
  stubRadius: number;
  mainPipeRadius: number;
  useXAxis: boolean;
  tube: number;
}

export const SaddleWeld = ({ stubRadius, mainPipeRadius, useXAxis, tube }: SaddleWeldProps) => {
  const curve = useMemo(() => {
    return new SaddleCurve(stubRadius * SADDLE_WELD_OVERSIZE, mainPipeRadius, useXAxis);
  }, [stubRadius, mainPipeRadius, useXAxis]);

  return (
    <Tube args={[curve, 64, tube, 8, true]}>
      <meshStandardMaterial {...weldColor} />
    </Tube>
  );
};

export interface FlangeProps {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  pipeR: number;
  innerR: number;
  nb: number;
}

export const Flange = ({ center, normal, pipeR, innerR, nb }: FlangeProps) => {
  const flangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[closestFlangeNb(nb)];
  const flangeR = flangeSpecs.flangeOD / 2 / SCALE;
  const thick = flangeR * FLANGE_THICKNESS_RATIO;
  const boltR = flangeSpecs.pcd / 2 / SCALE;
  const holeR = flangeSpecs.holeID / 2 / SCALE;
  const boltCount = flangeSpecs.boltHoles;
  const boreR = innerR * FLANGE_BORE_CLEARANCE;
  const weldTube = pipeR * WELD_TUBE_RATIO;

  const faceGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeR, 0, Math.PI * 2, false);

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const x = Math.cos(angle) * boltR;
      const y = Math.sin(angle) * boltR;
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeR, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    return new THREE.ShapeGeometry(shape, 32);
  }, [flangeR, boreR, boltR, holeR, boltCount]);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
    return q;
  }, [normal.x, normal.y, normal.z]);

  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <cylinderGeometry args={[flangeR, flangeR, thick, 32, 1, true]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[boreR, boreR, thick, 32, 1, true]} />
        <meshStandardMaterial color="#555" side={THREE.BackSide} />
      </mesh>
      {Array.from({ length: boltCount }).map((_, i) => {
        const angle = (i / boltCount) * Math.PI * 2;
        const hx = Math.cos(angle) * boltR;
        const hz = Math.sin(angle) * boltR;
        return (
          <mesh key={i} position={[hx, 0, hz]}>
            <cylinderGeometry args={[holeR, holeR, thick * 1.02, 16, 1, true]} />
            <meshStandardMaterial color="#000" side={THREE.BackSide} />
          </mesh>
        );
      })}
      <mesh
        geometry={faceGeometry}
        position={[0, thick / 2 + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={faceGeometry}
        position={[0, -thick / 2 - 0.001, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -thick / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pipeR * WELD_RING_OVERSIZE, weldTube, 12, 32]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
      <mesh position={[0, -thick / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[innerR * (2 - WELD_RING_OVERSIZE), weldTube, 12, 32]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
    </group>
  );
};

export interface SaddleCutStubPipeProps {
  baseCenter: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  outerR: number;
  innerR: number;
  mainPipeOuterR: number;
  mainPipeDirection?: THREE.Vector3;
  stubAngleDegrees?: number;
  nb: number;
  hasFlange?: boolean;
}

export const SaddleCutStubPipe = ({
  baseCenter,
  direction,
  length,
  outerR,
  innerR,
  mainPipeOuterR,
  stubAngleDegrees = 0,
  nb,
  hasFlange = true,
}: SaddleCutStubPipeProps) => {
  const dir = direction.clone().normalize();
  const weldTube = outerR * WELD_TUBE_RATIO;
  const stubFlangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[closestFlangeNb(nb)];
  const stubFlangeThick = (stubFlangeSpecs.flangeOD / 2 / SCALE) * FLANGE_THICKNESS_RATIO;
  const flangeOffset = stubFlangeThick / 2;

  const saddleAxis = useMemo(() => {
    const normalizedAngle = ((stubAngleDegrees % 360) + 360) % 360;
    const isNear0or180 =
      normalizedAngle < 22.5 ||
      normalizedAngle > 337.5 ||
      (normalizedAngle > 157.5 && normalizedAngle < 202.5);
    const isNear90or270 =
      (normalizedAngle > 67.5 && normalizedAngle < 112.5) ||
      (normalizedAngle > 247.5 && normalizedAngle < 292.5);
    if (isNear0or180) return "x";
    if (isNear90or270) return "x";
    return "x";
  }, [stubAngleDegrees]);

  const outerTubeGeom = useMemo(() => {
    const segments = 32;
    const radialSegments = 32;
    const positions: number[] = [];
    const indices: number[] = [];

    const endZ = mainPipeOuterR + length;

    for (let i = 0; i <= segments; i++) {
      const v = i / segments;

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const x = outerR * Math.cos(theta);
        const y = outerR * Math.sin(theta);

        const saddleCoord = saddleAxis === "x" ? y : x;
        const baseSaddleZ = Math.sqrt(
          Math.max(0, mainPipeOuterR * mainPipeOuterR - saddleCoord * saddleCoord),
        );
        const z = baseSaddleZ + v * (endZ - baseSaddleZ);

        positions.push(x, y, z);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, [outerR, mainPipeOuterR, length, saddleAxis]);

  const innerTubeGeom = useMemo(() => {
    const segments = 32;
    const radialSegments = 32;
    const positions: number[] = [];
    const indices: number[] = [];

    const endZ = mainPipeOuterR + length;

    for (let i = 0; i <= segments; i++) {
      const v = i / segments;

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const x = innerR * Math.cos(theta);
        const y = innerR * Math.sin(theta);

        const saddleCoord = saddleAxis === "x" ? y : x;
        const baseSaddleZ = Math.sqrt(
          Math.max(0, mainPipeOuterR * mainPipeOuterR - saddleCoord * saddleCoord),
        );
        const z = baseSaddleZ + v * (endZ - baseSaddleZ);

        positions.push(x, y, z);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, [innerR, mainPipeOuterR, length, saddleAxis]);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    return q;
  }, [dir.x, dir.y, dir.z]);

  return (
    <group position={[baseCenter.x, baseCenter.y, baseCenter.z]} quaternion={quaternion}>
      <mesh geometry={outerTubeGeom}>
        <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={innerTubeGeom}>
        <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
      </mesh>
      <SaddleWeld
        stubRadius={outerR}
        mainPipeRadius={mainPipeOuterR}
        useXAxis={saddleAxis === "x"}
        tube={weldTube}
      />
      {hasFlange && (
        <Flange
          center={new THREE.Vector3(0, 0, mainPipeOuterR + length + flangeOffset)}
          normal={new THREE.Vector3(0, 0, 1)}
          pipeR={outerR}
          innerR={innerR}
          nb={nb}
        />
      )}
      {!hasFlange && (
        <mesh position={[0, 0, mainPipeOuterR + length]} rotation={[0, 0, 0]}>
          <ringGeometry args={[innerR, outerR, 32]} />
          <meshStandardMaterial {...pipeEndMat} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export interface StubPipeProps {
  baseCenter: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  outerR: number;
  innerR: number;
  mainPipeOuterR?: number;
  mainPipeDirection?: THREE.Vector3;
  stubAngleDegrees?: number;
  nb: number;
  hasFlange?: boolean;
}

export const StubPipe = ({
  baseCenter,
  direction,
  length,
  outerR,
  innerR,
  mainPipeOuterR,
  mainPipeDirection,
  stubAngleDegrees = 0,
  nb,
  hasFlange = true,
}: StubPipeProps) => {
  if (mainPipeOuterR) {
    return (
      <SaddleCutStubPipe
        baseCenter={baseCenter}
        direction={direction}
        length={length}
        outerR={outerR}
        innerR={innerR}
        mainPipeOuterR={mainPipeOuterR}
        mainPipeDirection={mainPipeDirection}
        stubAngleDegrees={stubAngleDegrees}
        nb={nb}
        hasFlange={hasFlange}
      />
    );
  }

  const dir = direction.clone().normalize();
  const endCenter = baseCenter.clone().add(dir.clone().multiplyScalar(length));
  const weldTube = outerR * WELD_TUBE_RATIO;
  const stubFlangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[closestFlangeNb(nb)];
  const stubFlangeThick = (stubFlangeSpecs.flangeOD / 2 / SCALE) * FLANGE_THICKNESS_RATIO;
  const flangeOffset = stubFlangeThick / 2;

  return (
    <>
      <HollowStraightPipe
        start={baseCenter}
        end={endCenter}
        outerR={outerR}
        innerR={innerR}
        capStart={false}
        capEnd={!hasFlange}
      />
      <WeldRing center={baseCenter} normal={dir} radius={outerR * SADDLE_WELD_OVERSIZE} tube={weldTube} />
      {hasFlange && (
        <Flange
          center={endCenter.clone().add(dir.clone().multiplyScalar(flangeOffset))}
          normal={dir}
          pipeR={outerR}
          innerR={innerR}
          nb={nb}
        />
      )}
    </>
  );
};

export interface BlankFlangeProps {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  pipeR: number;
  nb: number;
}

export const BlankFlange = ({ center, normal, pipeR, nb }: BlankFlangeProps) => {
  const flangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[closestFlangeNb(nb)];
  const flangeR = flangeSpecs.flangeOD / 2 / SCALE;
  const thick = flangeR * FLANGE_THICKNESS_RATIO;
  const boltR = flangeSpecs.pcd / 2 / SCALE;
  const holeR = flangeSpecs.holeID / 2 / SCALE;
  const boltCount = flangeSpecs.boltHoles;

  const faceGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeR, 0, Math.PI * 2, false);

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const x = Math.cos(angle) * boltR;
      const y = Math.sin(angle) * boltR;
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeR, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    return new THREE.ShapeGeometry(shape, 32);
  }, [flangeR, boltR, holeR, boltCount]);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
    return q;
  }, [normal.x, normal.y, normal.z]);

  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <cylinderGeometry args={[flangeR, flangeR, thick, 32, 1, true]} />
        <meshStandardMaterial {...blankFlangeColor} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: boltCount }).map((_, i) => {
        const angle = (i / boltCount) * Math.PI * 2;
        const hx = Math.cos(angle) * boltR;
        const hz = Math.sin(angle) * boltR;
        return (
          <mesh key={i} position={[hx, 0, hz]}>
            <cylinderGeometry args={[holeR, holeR, thick * 1.02, 16, 1, true]} />
            <meshStandardMaterial color="#000" side={THREE.BackSide} />
          </mesh>
        );
      })}
      <mesh
        geometry={faceGeometry}
        position={[0, thick / 2 + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...blankFlangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={faceGeometry}
        position={[0, -thick / 2 - 0.001, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...blankFlangeColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export interface RetainingRingProps {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  pipeR: number;
  innerR: number;
  wallThickness: number;
}

export const RetainingRing = ({ center, normal, pipeR, wallThickness }: RetainingRingProps) => {
  const ringOuterR = pipeR * RETAINING_RING_RATIO;
  const ringInnerR = pipeR;
  const tubeRadius = (ringOuterR - ringInnerR) / 2;
  const torusRadius = ringInnerR + tubeRadius;

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    return q;
  }, [normal.x, normal.y, normal.z]);

  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <torusGeometry args={[torusRadius, tubeRadius, 16, 32]} />
        <meshStandardMaterial
          {...FLANGE_MATERIALS.bolt}
        />
      </mesh>
    </group>
  );
};

export interface RotatingFlangeProps {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  pipeR: number;
  innerR: number;
  nb: number;
}

export const RotatingFlange = ({ center, normal, pipeR, innerR, nb }: RotatingFlangeProps) => {
  const flangeSpecs = FLANGE_DATA[nb] || FLANGE_DATA[closestFlangeNb(nb)];
  const flangeR = flangeSpecs.flangeOD / 2 / SCALE;
  const thick = flangeR * FLANGE_THICKNESS_RATIO;
  const boltR = flangeSpecs.pcd / 2 / SCALE;
  const holeR = flangeSpecs.holeID / 2 / SCALE;
  const boltCount = flangeSpecs.boltHoles;
  const boreR = innerR * ROTATING_FLANGE_BORE_CLEARANCE;

  const faceGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, flangeR, 0, Math.PI * 2, false);

    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);

    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const x = Math.cos(angle) * boltR;
      const y = Math.sin(angle) * boltR;
      const boltHole = new THREE.Path();
      boltHole.absarc(x, y, holeR, 0, Math.PI * 2, true);
      shape.holes.push(boltHole);
    }

    return new THREE.ShapeGeometry(shape, 32);
  }, [flangeR, boltR, holeR, boltCount, boreR]);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
    return q;
  }, [normal.x, normal.y, normal.z]);

  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  return (
    <group position={[center.x, center.y, center.z]} rotation={[euler.x, euler.y, euler.z]}>
      <mesh>
        <cylinderGeometry args={[flangeR, flangeR, thick, 32, 1, true]} />
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: boltCount }).map((_, i) => {
        const angle = (i / boltCount) * Math.PI * 2;
        const hx = Math.cos(angle) * boltR;
        const hz = Math.sin(angle) * boltR;
        return (
          <mesh key={i} position={[hx, 0, hz]}>
            <cylinderGeometry args={[holeR, holeR, thick * 1.02, 16, 1, true]} />
            <meshStandardMaterial color="#000" side={THREE.BackSide} />
          </mesh>
        );
      })}
      <mesh
        geometry={faceGeometry}
        position={[0, thick / 2 + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        geometry={faceGeometry}
        position={[0, -thick / 2 - 0.001, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial {...flangeColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
