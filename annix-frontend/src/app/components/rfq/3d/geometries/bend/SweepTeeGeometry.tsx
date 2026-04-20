"use client";

import { Text } from "@react-three/drei";
import * as THREE from "three";
import {
  AngularDimension,
  DimensionLine,
  Flange,
  HollowBendPipe,
  HollowStraightPipe,
  RetainingRing,
  RotatingFlange,
  SaddleWeld,
  SegmentedBendPipe,
} from "@/app/components/rfq/3d";
import { GEOMETRY_CONSTANTS } from "@/app/lib/config/rfq/rendering3DStandards";
import { SimpleLine as Line } from "./SimpleLine";

const SCALE = GEOMETRY_CONSTANTS.SCALE;

interface SweepTeeGeometryProps {
  pipeALength: number;
  outerR: number;
  innerR: number;
  bendR: number;
  closureLength: number;
  gapLength: number;
  flangeOffset: number;
  wtScaled: number;
  rotatingFlangeOffset: number;
  nominalBore: number;
  isSegmented: boolean;
  numberOfSegments: number | undefined;
  weldTube: number;
  fittingHasInletFlange: boolean;
  fittingHasOutletFlange: boolean;
  fittingHasBranchFlange: boolean;
  fittingHasLooseInletFlange: boolean;
  fittingHasLooseOutletFlange: boolean;
  fittingHasRotatingInletFlange: boolean;
  fittingHasRotatingOutletFlange: boolean;
  fittingHasRotatingBranchFlange: boolean;
  centerToFaceMm: number | undefined;
  effectivePipeALengthMm: number;
}

const SweepTeeGeometry = (props: SweepTeeGeometryProps) => {
  const {
    pipeALength,
    outerR,
    innerR,
    bendR,
    closureLength,
    gapLength,
    flangeOffset,
    wtScaled,
    rotatingFlangeOffset,
    nominalBore,
    isSegmented,
    numberOfSegments,
    weldTube,
    fittingHasInletFlange,
    fittingHasOutletFlange,
    fittingHasBranchFlange,
    fittingHasLooseInletFlange,
    fittingHasLooseOutletFlange,
    fittingHasRotatingInletFlange,
    fittingHasRotatingOutletFlange,
    fittingHasRotatingBranchFlange,
    centerToFaceMm,
    effectivePipeALengthMm,
  } = props;

  const pipeAHalfLength = pipeALength / 2;
  const pipeALeftEnd = new THREE.Vector3(0, 0, -pipeAHalfLength);
  const pipeARightEnd = new THREE.Vector3(0, 0, pipeAHalfLength);

  const bendZOffset = pipeAHalfLength;
  const localBendCenter = new THREE.Vector3(-bendR, 0, 0);

  const sweepEndPos = new THREE.Vector3(0, bendR, bendZOffset - bendR);
  const sweepEndDir = new THREE.Vector3(0, 1, 0);

  return (
    <>
      <HollowStraightPipe
        start={pipeALeftEnd}
        end={pipeARightEnd}
        outerR={outerR}
        innerR={innerR}
        capStart={!fittingHasInletFlange}
        capEnd={!fittingHasOutletFlange}
      />

      {fittingHasInletFlange &&
        (fittingHasLooseInletFlange ? (
          <>
            <mesh
              position={[0, 0, -pipeAHalfLength - closureLength / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
              <meshStandardMaterial
                color="#2a2a2a"
                metalness={0.6}
                roughness={0.6}
                envMapIntensity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh
              position={[0, 0, -pipeAHalfLength - closureLength / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
              <meshStandardMaterial color="#333333" side={THREE.BackSide} />
            </mesh>
            <Flange
              center={new THREE.Vector3(0, 0, -pipeAHalfLength - closureLength - gapLength)}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
          </>
        ) : fittingHasRotatingInletFlange ? (
          <>
            <RetainingRing
              center={pipeALeftEnd}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              innerR={innerR}
              wallThickness={wtScaled}
            />
            <RotatingFlange
              center={pipeALeftEnd.clone().add(new THREE.Vector3(0, 0, rotatingFlangeOffset))}
              normal={new THREE.Vector3(0, 0, -1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
          </>
        ) : (
          <Flange
            center={pipeALeftEnd.clone().add(new THREE.Vector3(0, 0, -flangeOffset))}
            normal={new THREE.Vector3(0, 0, -1)}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        ))}

      {fittingHasOutletFlange &&
        (fittingHasLooseOutletFlange ? (
          <>
            <mesh
              position={[0, 0, pipeAHalfLength + closureLength / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
              <meshStandardMaterial
                color="#2a2a2a"
                metalness={0.6}
                roughness={0.6}
                envMapIntensity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh
              position={[0, 0, pipeAHalfLength + closureLength / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
              <meshStandardMaterial color="#333333" side={THREE.BackSide} />
            </mesh>
            <Flange
              center={new THREE.Vector3(0, 0, pipeAHalfLength + closureLength + gapLength)}
              normal={new THREE.Vector3(0, 0, 1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
          </>
        ) : fittingHasRotatingOutletFlange ? (
          <>
            <RetainingRing
              center={pipeARightEnd}
              normal={new THREE.Vector3(0, 0, 1)}
              pipeR={outerR}
              innerR={innerR}
              wallThickness={wtScaled}
            />
            <RotatingFlange
              center={pipeARightEnd.clone().add(new THREE.Vector3(0, 0, -rotatingFlangeOffset))}
              normal={new THREE.Vector3(0, 0, 1)}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
          </>
        ) : (
          <Flange
            center={pipeARightEnd.clone().add(new THREE.Vector3(0, 0, flangeOffset))}
            normal={new THREE.Vector3(0, 0, 1)}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        ))}

      <group position={[0, 0, bendZOffset]} rotation={[0, Math.PI, -Math.PI / 2]}>
        {isSegmented && numberOfSegments && numberOfSegments > 1 ? (
          <SegmentedBendPipe
            bendCenter={localBendCenter}
            bendRadius={bendR}
            startAngle={0}
            endAngle={Math.PI / 2}
            outerR={outerR}
            innerR={innerR}
            numberOfSegments={numberOfSegments}
          />
        ) : (
          <HollowBendPipe
            bendCenter={localBendCenter}
            bendRadius={bendR}
            startAngle={0}
            endAngle={Math.PI / 2}
            outerR={outerR}
            innerR={innerR}
          />
        )}
      </group>

      {fittingHasBranchFlange &&
        (fittingHasRotatingBranchFlange ? (
          <>
            <RetainingRing
              center={sweepEndPos}
              normal={sweepEndDir}
              pipeR={outerR}
              innerR={innerR}
              wallThickness={wtScaled}
            />
            <RotatingFlange
              center={sweepEndPos
                .clone()
                .sub(sweepEndDir.clone().multiplyScalar(rotatingFlangeOffset))}
              normal={sweepEndDir}
              pipeR={outerR}
              innerR={innerR}
              nb={nominalBore}
            />
          </>
        ) : (
          <Flange
            center={sweepEndPos.clone().add(sweepEndDir.clone().multiplyScalar(flangeOffset))}
            normal={sweepEndDir}
            pipeR={outerR}
            innerR={innerR}
            nb={nominalBore}
          />
        ))}

      <group position={[0, outerR, bendZOffset]} rotation={[-Math.PI / 2, 0, 0]}>
        <SaddleWeld stubRadius={outerR} mainPipeRadius={outerR} useXAxis={false} tube={weldTube} />
      </group>

      <DimensionLine
        start={pipeALeftEnd}
        end={pipeARightEnd}
        label={`B: ${effectivePipeALengthMm}mm`}
        offset={outerR * 2.5}
        color="#009900"
      />

      {(() => {
        const cfValue = centerToFaceMm || Math.round(bendR * SCALE);
        const cfScaled = cfValue / SCALE;
        const aLineZ = pipeAHalfLength + outerR * 1.2;
        const aLineBottom = 0;
        const aLineTop = cfScaled;

        return (
          <>
            <Line
              points={[
                [0, aLineTop, -pipeAHalfLength],
                [0, aLineTop, aLineZ],
              ]}
              color="#cc6600"
              lineWidth={3}
            />
            <Line
              points={[
                [0, aLineBottom, aLineZ],
                [0, aLineTop, aLineZ],
              ]}
              color="#cc6600"
              lineWidth={3}
            />
            <Text
              position={[outerR * 0.3, aLineTop, 0]}
              fontSize={outerR * 0.35}
              color="#cc6600"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
              rotation={[0, -Math.PI / 2, 0]}
            >
              {`C/F: ${cfValue}mm`}
            </Text>
            <AngularDimension
              center={new THREE.Vector3(0, 0, aLineZ)}
              radius={outerR * 0.8}
              startAngle={0}
              endAngle={Math.PI / 2}
              plane="yz"
              color="#cc6600"
              fontSize={outerR * 0.4}
              showArrows={false}
              textRotation={[0, -Math.PI / 2, 0]}
            />
          </>
        );
      })()}
    </>
  );
};

export { SweepTeeGeometry };
