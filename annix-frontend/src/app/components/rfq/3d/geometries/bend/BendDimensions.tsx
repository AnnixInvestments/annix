"use client";

import { Text } from "@react-three/drei";
import * as THREE from "three";
import { SimpleLine as Line } from "./SimpleLine";

interface BendDimensionsProps {
  centerToFaceMm: number | undefined;
  angleRad: number;
  inletEnd: THREE.Vector3;
  outletEnd: THREE.Vector3;
  bendEndPoint: THREE.Vector3;
  bendCenter: THREE.Vector3;
  t1: number;
  t2: number;
  outerR: number;
  tangent1: number;
  tangent2: number;
  isDuckfoot: boolean;
}

const BendDimensions = (props: BendDimensionsProps) => {
  const {
    centerToFaceMm,
    angleRad,
    inletEnd,
    outletEnd,
    bendEndPoint,
    bendCenter,
    t1,
    t2,
    outerR,
    tangent1,
    tangent2,
    isDuckfoot,
  } = props;

  const cfMm = centerToFaceMm || 0;
  const bendDegrees = Math.round((angleRad * 180) / Math.PI);

  const insideCorner = new THREE.Vector3(bendCenter.x, 0, t1);

  return (
    <>
      {!isDuckfoot &&
        t1 > 0 &&
        (() => {
          const dimX = -outerR - outerR * 0.5;
          const extGap = 0.02;
          const extOvershoot = 0.04;
          const arrowLen = Math.min(0.1, t1 * 0.12);
          const arrowWidth = arrowLen * 0.4;
          return (
            <group>
              <Line
                points={[
                  [-outerR - extGap, 0, 0],
                  [dimX - extOvershoot, 0, 0],
                ]}
                color="#0066cc"
                lineWidth={1.5}
              />
              <Line
                points={[
                  [-outerR - extGap, 0, t1],
                  [dimX - extOvershoot, 0, t1],
                ]}
                color="#0066cc"
                lineWidth={1.5}
              />
              <Line
                points={[
                  [dimX, 0, 0],
                  [dimX, 0, t1],
                ]}
                color="#0066cc"
                lineWidth={2}
              />
              <Line
                points={[
                  [dimX + arrowWidth, 0, arrowLen],
                  [dimX, 0, 0],
                  [dimX - arrowWidth, 0, arrowLen],
                ]}
                color="#0066cc"
                lineWidth={2}
              />
              <Line
                points={[
                  [dimX + arrowWidth, 0, t1 - arrowLen],
                  [dimX, 0, t1],
                  [dimX - arrowWidth, 0, t1 - arrowLen],
                ]}
                color="#0066cc"
                lineWidth={2}
              />
              <Text
                position={[dimX - outerR * 0.3, 0, t1 / 2]}
                fontSize={Math.max(0.12, outerR * 0.35)}
                color="#0066cc"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
              >
                {`T1: ${tangent1}mm`}
              </Text>
            </group>
          );
        })()}

      {!isDuckfoot &&
        t2 > 0 &&
        (() => {
          const dimOffset = outerR * 1.5;
          const extGap = 0.02;
          const extOvershoot = 0.04;
          const t2Dir = new THREE.Vector3().subVectors(outletEnd, bendEndPoint).normalize();
          const perpDir = new THREE.Vector3(-t2Dir.z, 0, t2Dir.x);
          const perpDirScaled = perpDir.clone().multiplyScalar(dimOffset);
          const dimStart = bendEndPoint.clone().add(perpDirScaled);
          const dimEnd = outletEnd.clone().add(perpDirScaled);
          const extStartGap = bendEndPoint.clone().add(perpDir.clone().multiplyScalar(extGap));
          const extEndGap = outletEnd.clone().add(perpDir.clone().multiplyScalar(extGap));
          const extStartOver = dimStart.clone().add(perpDir.clone().multiplyScalar(extOvershoot));
          const extEndOver = dimEnd.clone().add(perpDir.clone().multiplyScalar(extOvershoot));
          const dimLen = dimStart.distanceTo(dimEnd);
          const arrowLen = Math.min(0.1, dimLen * 0.12);
          const arrowWidth = arrowLen * 0.4;
          const arrowPerpOffset = perpDir.clone().multiplyScalar(arrowWidth);
          return (
            <group>
              <Line
                points={[
                  [extStartGap.x, extStartGap.y, extStartGap.z],
                  [extStartOver.x, extStartOver.y, extStartOver.z],
                ]}
                color="#cc0000"
                lineWidth={1.5}
              />
              <Line
                points={[
                  [extEndGap.x, extEndGap.y, extEndGap.z],
                  [extEndOver.x, extEndOver.y, extEndOver.z],
                ]}
                color="#cc0000"
                lineWidth={1.5}
              />
              <Line
                points={[
                  [dimStart.x, dimStart.y, dimStart.z],
                  [dimEnd.x, dimEnd.y, dimEnd.z],
                ]}
                color="#cc0000"
                lineWidth={2}
              />
              <Line
                points={[
                  [
                    dimStart.x + t2Dir.x * arrowLen + arrowPerpOffset.x,
                    0,
                    dimStart.z + t2Dir.z * arrowLen + arrowPerpOffset.z,
                  ],
                  [dimStart.x, dimStart.y, dimStart.z],
                  [
                    dimStart.x + t2Dir.x * arrowLen - arrowPerpOffset.x,
                    0,
                    dimStart.z + t2Dir.z * arrowLen - arrowPerpOffset.z,
                  ],
                ]}
                color="#cc0000"
                lineWidth={2}
              />
              <Line
                points={[
                  [
                    dimEnd.x - t2Dir.x * arrowLen + arrowPerpOffset.x,
                    0,
                    dimEnd.z - t2Dir.z * arrowLen + arrowPerpOffset.z,
                  ],
                  [dimEnd.x, dimEnd.y, dimEnd.z],
                  [
                    dimEnd.x - t2Dir.x * arrowLen - arrowPerpOffset.x,
                    0,
                    dimEnd.z - t2Dir.z * arrowLen - arrowPerpOffset.z,
                  ],
                ]}
                color="#cc0000"
                lineWidth={2}
              />
              <Text
                position={[
                  (dimStart.x + dimEnd.x) / 2 + perpDir.x * outerR * 0.25,
                  0.01,
                  (dimStart.z + dimEnd.z) / 2 + perpDir.z * outerR * 0.25,
                ]}
                fontSize={Math.max(0.12, outerR * 0.35)}
                color="#cc0000"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                rotation={[-Math.PI / 2, Math.PI, Math.atan2(t2Dir.x, t2Dir.z)]}
              >
                {`T2: ${tangent2}mm`}
              </Text>
            </group>
          );
        })()}

      {cfMm > 0 && (
        <>
          <Line
            points={[
              [inletEnd.x, inletEnd.y, inletEnd.z],
              [insideCorner.x, insideCorner.y, insideCorner.z],
            ]}
            color="#cc6600"
            lineWidth={3}
          />
          <Line
            points={[
              [insideCorner.x, insideCorner.y, insideCorner.z],
              [bendEndPoint.x, bendEndPoint.y, bendEndPoint.z],
            ]}
            color="#cc6600"
            lineWidth={3}
          />
          {(() => {
            const cfLineDir = new THREE.Vector3()
              .subVectors(bendEndPoint, insideCorner)
              .normalize();
            const cfLineAngle = Math.atan2(cfLineDir.x, cfLineDir.z);
            const labelOffset = new THREE.Vector3(-cfLineDir.z, 0, cfLineDir.x).multiplyScalar(
              outerR * 0.4,
            );
            return (
              <Text
                position={[
                  (insideCorner.x + bendEndPoint.x) / 2 + labelOffset.x,
                  0.01,
                  (insideCorner.z + bendEndPoint.z) / 2 + labelOffset.z,
                ]}
                fontSize={outerR * 0.35}
                color="#cc6600"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                rotation={[-Math.PI / 2, Math.PI, cfLineAngle - Math.PI / 2]}
              >
                {`C/F: ${cfMm}mm`}
              </Text>
            );
          })()}
          {(() => {
            const arcRadius3D = outerR * 0.8;
            const arcSegments = 32;
            const arcPoints: [number, number, number][] = Array.from(
              { length: arcSegments + 1 },
              (_, i): [number, number, number] => {
                const t = i / arcSegments;
                const currentAngle = t * angleRad;
                return [
                  insideCorner.x + arcRadius3D * Math.sin(currentAngle),
                  0,
                  insideCorner.z + arcRadius3D * Math.cos(currentAngle),
                ];
              },
            );

            const midAngle = angleRad / 2;
            const textRadius = arcRadius3D * 0.6;
            const textPos = new THREE.Vector3(
              insideCorner.x + textRadius * Math.sin(midAngle),
              0,
              insideCorner.z + textRadius * Math.cos(midAngle),
            );

            return (
              <>
                <Line points={arcPoints} color="#cc6600" lineWidth={2} />
                <Text
                  position={[textPos.x, textPos.y + 0.01, textPos.z]}
                  fontSize={outerR * 0.4}
                  color="#cc6600"
                  anchorX="center"
                  anchorY="middle"
                  fontWeight="bold"
                  rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
                >
                  {bendDegrees}°
                </Text>
              </>
            );
          })()}
        </>
      )}
    </>
  );
};

export { BendDimensions };
