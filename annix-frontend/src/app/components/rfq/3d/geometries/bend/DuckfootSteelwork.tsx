"use client";

import { Text } from "@react-three/drei";
import * as THREE from "three";
import { GEOMETRY_CONSTANTS } from "@/app/lib/config/rfq/rendering3DStandards";
import { SimpleLine as Line } from "./SimpleLine";

const SCALE = GEOMETRY_CONSTANTS.SCALE;

interface DuckfootSteelworkProps {
  nominalBore: number;
  bendR: number;
  outerR: number;
  wtMm: number;
  duckfootXOffset: number;
  duckfootYOffset: number;
  bendPositionAdjustY: number;
  bendPositionAdjustZ: number;
  duckfootBasePlateXMm: number | undefined;
  duckfootBasePlateYMm: number | undefined;
  duckfootPlateThicknessT1Mm: number | undefined;
  duckfootRibThicknessT2Mm: number | undefined;
  duckfootInletCentreHeightMm: number | undefined;
  duckfootGussetPointDDegrees: number | undefined;
  duckfootGussetPointCDegrees: number | undefined;
  duckfootGussetCount: number | undefined;
  duckfootGussetPlacement: "HEEL_ONLY" | "SYMMETRICAL" | "FULL_COVERAGE" | undefined;
  duckfootGussetThicknessMm: number | undefined;
  nbToOd: (nb: number) => number;
}

const DuckfootSteelwork = (props: DuckfootSteelworkProps) => {
  const {
    nominalBore,
    bendR,
    outerR,
    wtMm,
    duckfootXOffset,
    duckfootYOffset,
    bendPositionAdjustY,
    bendPositionAdjustZ,
    duckfootBasePlateXMm,
    duckfootBasePlateYMm,
    duckfootPlateThicknessT1Mm,
    duckfootRibThicknessT2Mm,
    duckfootInletCentreHeightMm,
    duckfootGussetPointDDegrees,
    duckfootGussetPointCDegrees,
    duckfootGussetCount,
    duckfootGussetPlacement,
    duckfootGussetThicknessMm,
    nbToOd,
  } = props;

  const duckfootDefaults: Record<
    number,
    { x: number; y: number; t1: number; t2: number; inletH: number }
  > = {
    200: { x: 355, y: 230, t1: 6, t2: 10, inletH: 365 },
    250: { x: 405, y: 280, t1: 6, t2: 10, inletH: 417 },
    300: { x: 460, y: 330, t1: 6, t2: 10, inletH: 467 },
    350: { x: 510, y: 380, t1: 8, t2: 12, inletH: 519 },
    400: { x: 560, y: 430, t1: 8, t2: 12, inletH: 559 },
    450: { x: 610, y: 485, t1: 8, t2: 12, inletH: 633 },
    500: { x: 660, y: 535, t1: 10, t2: 14, inletH: 703 },
    550: { x: 710, y: 585, t1: 10, t2: 14, inletH: 752 },
    600: { x: 760, y: 635, t1: 10, t2: 14, inletH: 790 },
    650: { x: 815, y: 693, t1: 12, t2: 16, inletH: 847 },
    700: { x: 865, y: 733, t1: 12, t2: 16, inletH: 892 },
    750: { x: 915, y: 793, t1: 12, t2: 16, inletH: 940 },
    800: { x: 970, y: 833, t1: 14, t2: 18, inletH: 991 },
    850: { x: 1020, y: 883, t1: 14, t2: 18, inletH: 1016 },
    900: { x: 1070, y: 933, t1: 14, t2: 18, inletH: 1067 },
  };
  const rawNominalBore = duckfootDefaults[nominalBore];
  const defaults = rawNominalBore || {
    x: 500,
    y: 400,
    t1: 10,
    t2: 12,
    inletH: 500,
  };

  const basePlateXDim = (duckfootBasePlateXMm || defaults.x) / SCALE;
  const basePlateYDim = (duckfootBasePlateYMm || defaults.y) / SCALE;
  const ribThickness = (duckfootPlateThicknessT1Mm || defaults.t1) / SCALE;
  const plateThickness = (duckfootRibThicknessT2Mm || defaults.t2) / SCALE;

  const inletCentreHeightMm = duckfootInletCentreHeightMm || defaults.inletH;
  const outerDiameterMm = nominalBore ? nbToOd(nominalBore) : 200;
  const innerDiameterMm = outerDiameterMm - 2 * wtMm * SCALE;
  const ribHeightMm = inletCentreHeightMm - wtMm * SCALE - innerDiameterMm / 2;
  const ribHeightH = ribHeightMm / SCALE;

  const basePlateColor = {
    color: "#555555",
    metalness: 0.85,
    roughness: 0.2,
    envMapIntensity: 1.2,
  };
  const ribColor = {
    color: "#666666",
    metalness: 0.8,
    roughness: 0.25,
    envMapIntensity: 1.0,
  };

  const extradosR = bendR + outerR;
  const midAngle = Math.PI / 4;
  const bendMidpointX = -extradosR * Math.sin(midAngle);
  const bendMidpointY = bendR - extradosR * Math.cos(midAngle);
  const gussetRefX = bendMidpointX;

  const steelworkX = bendMidpointX - duckfootXOffset;
  const steelworkY = -ribHeightH - duckfootYOffset - bendPositionAdjustY;
  const steelworkZ = -bendPositionAdjustZ;
  const steelworkRotationY = -Math.PI;

  return (
    <group position={[steelworkX, steelworkY, steelworkZ]} rotation={[0, steelworkRotationY, 0]}>
      <mesh position={[0, -plateThickness / 2, 0]}>
        <boxGeometry args={[basePlateXDim, plateThickness, basePlateYDim]} />
        <meshStandardMaterial {...basePlateColor} />
      </mesh>
      <Text
        position={[0, 0.02, basePlateYDim / 2 + 0.1]}
        fontSize={0.3}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        rotation={[-Math.PI / 2, 0, 0]}
      >
        Y
      </Text>
      <Text
        position={[0, 0.02, -basePlateYDim / 2 - 0.1]}
        fontSize={0.3}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        rotation={[-Math.PI / 2, 0, Math.PI]}
      >
        W
      </Text>
      <Text
        position={[basePlateXDim / 2 + 0.1, 0.02, 0]}
        fontSize={0.3}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
      >
        X
      </Text>
      <Text
        position={[-basePlateXDim / 2 - 0.1, 0.02, 0]}
        fontSize={0.3}
        color="#000000"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
      >
        Z
      </Text>
      <mesh position={[0, ribHeightH / 2, 0]}>
        <boxGeometry args={[basePlateXDim, ribHeightH, ribThickness]} />
        <meshStandardMaterial {...ribColor} />
      </mesh>
      {(() => {
        const gusset2Shape = new THREE.Shape();
        const gusset2Width = basePlateYDim;

        const extradosR = bendR + outerR;
        const midAngleRad = Math.PI / 4;
        const extradosAt45Y =
          bendR - extradosR * Math.cos(midAngleRad) + duckfootYOffset - steelworkY;

        const cutoutRadius = outerR;
        const cutoutBottomY = extradosAt45Y - cutoutRadius / 2;
        const cutoutCenterY = cutoutBottomY + cutoutRadius;

        gusset2Shape.moveTo(-gusset2Width / 2, 0);
        gusset2Shape.lineTo(gusset2Width / 2, 0);
        gusset2Shape.lineTo(gusset2Width / 2, cutoutCenterY);

        const arcSegments = 24;
        Array.from({ length: arcSegments + 1 }).forEach((_, i) => {
          const angle = (i / arcSegments) * Math.PI;
          const arcX = cutoutRadius * Math.cos(angle);
          const arcY = cutoutCenterY - cutoutRadius * Math.sin(angle);
          gusset2Shape.lineTo(arcX, arcY);
        });

        gusset2Shape.lineTo(-gusset2Width / 2, 0);

        return (
          <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <extrudeGeometry args={[gusset2Shape, { depth: ribThickness, bevelEnabled: false }]} />
            <meshStandardMaterial
              color="#0066cc"
              metalness={0.8}
              roughness={0.25}
              envMapIntensity={1.0}
            />
          </mesh>
        );
      })()}
      {(() => {
        const yellowThickness = 30 / SCALE;
        const extradosR = bendR + outerR;

        const pointDAngleDegrees = duckfootGussetPointDDegrees || 75;
        const pointCAngleDegrees = duckfootGussetPointCDegrees || 15;

        const extradosLocalX = (angleDeg: number) => {
          const angleRad = (angleDeg * Math.PI) / 180;
          return -extradosR * Math.sin(angleRad) - gussetRefX;
        };
        const extradosLocalY = (angleDeg: number) => {
          const angleRad = (angleDeg * Math.PI) / 180;
          return bendR - extradosR * Math.cos(angleRad) + duckfootYOffset - steelworkY;
        };

        const pointDLocalX = extradosLocalX(pointDAngleDegrees);
        const pointDLocalY = extradosLocalY(pointDAngleDegrees);

        const pointCLocalX = extradosLocalX(pointCAngleDegrees);
        const pointCLocalY = extradosLocalY(pointCAngleDegrees);

        const halfPlateX = basePlateXDim / 2;
        const aBottomX = halfPlateX;
        const bBottomX = -halfPlateX;

        const yellowShape = new THREE.Shape();

        const cIsOnRight = pointCAngleDegrees < pointDAngleDegrees;
        const rightTopX = cIsOnRight ? pointCLocalX : pointDLocalX;
        const rightTopY = cIsOnRight ? pointCLocalY : pointDLocalY;
        const leftTopX = cIsOnRight ? pointDLocalX : pointCLocalX;
        const leftTopY = cIsOnRight ? pointDLocalY : pointCLocalY;
        const startAngle = cIsOnRight ? pointCAngleDegrees : pointDAngleDegrees;
        const endAngle = cIsOnRight ? pointDAngleDegrees : pointCAngleDegrees;

        yellowShape.moveTo(aBottomX, 0);

        yellowShape.lineTo(rightTopX, Math.max(0.1, rightTopY));

        const curveSegments = 16;
        const angleStep = (endAngle - startAngle) / curveSegments;
        Array.from({ length: curveSegments }).forEach((_, i) => {
          const angleDeg = startAngle + (i + 1) * angleStep;
          const localX = extradosLocalX(angleDeg);
          const localY = extradosLocalY(angleDeg);
          yellowShape.lineTo(localX, Math.max(0.1, localY));
        });

        yellowShape.lineTo(bBottomX, 0);

        yellowShape.closePath();

        const labelHeight = 0.15;

        return (
          <group>
            <mesh position={[0, 0, -yellowThickness / 2]}>
              <extrudeGeometry
                args={[yellowShape, { depth: yellowThickness, bevelEnabled: false }]}
              />
              <meshStandardMaterial
                color="#cc8800"
                metalness={0.8}
                roughness={0.25}
                envMapIntensity={1.0}
              />
            </mesh>
            <Text
              position={[aBottomX + 0.3, labelHeight, 0]}
              fontSize={0.4}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              A
            </Text>
            <Text
              position={[bBottomX - 0.3, labelHeight, 0]}
              fontSize={0.4}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              B
            </Text>
            <Text
              position={[pointDLocalX + 0.3, pointDLocalY + 0.3, 0]}
              fontSize={0.4}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              D
            </Text>
            <Text
              position={[pointCLocalX - 0.3, pointCLocalY + 0.3, 0]}
              fontSize={0.4}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              C
            </Text>
            {(() => {
              const mmInterval = 20 / SCALE;
              const rightEdgeStartX = aBottomX;
              const rightEdgeStartY = 0;
              const rightEdgeEndX = rightTopX;
              const rightEdgeEndY = rightTopY;
              const rightEdgeLength = Math.sqrt(
                (rightEdgeEndX - rightEdgeStartX) ** 2 + (rightEdgeEndY - rightEdgeStartY) ** 2,
              );
              const rightEdgeLengthMm = rightEdgeLength * SCALE;
              const numRightMarkers = Math.floor(rightEdgeLengthMm / 20);
              const rightDirX = (rightEdgeEndX - rightEdgeStartX) / rightEdgeLength;
              const rightDirY = (rightEdgeEndY - rightEdgeStartY) / rightEdgeLength;

              return Array.from({ length: numRightMarkers + 1 }).map((_, i) => {
                const dist = i * mmInterval;
                const markerX = rightEdgeStartX + rightDirX * dist;
                const markerY = rightEdgeStartY + rightDirY * dist;
                const tickOffsetX = rightDirY * 0.15;
                const tickOffsetY = -rightDirX * 0.15;
                const mmValue = i * 20;

                return (
                  <group key={`right-mm-${i}`}>
                    <Line
                      points={[
                        [markerX - tickOffsetX, markerY - tickOffsetY, 0.01],
                        [markerX + tickOffsetX, markerY + tickOffsetY, 0.01],
                      ]}
                      color="#000000"
                      lineWidth={2}
                    />
                    {i % 2 === 0 && (
                      <Text
                        position={[markerX + tickOffsetX * 2, markerY + tickOffsetY * 2, 0.01]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                      >
                        {mmValue}
                      </Text>
                    )}
                  </group>
                );
              });
            })()}
            {(() => {
              const mmInterval = 20 / SCALE;
              const leftEdgeStartX = bBottomX;
              const leftEdgeStartY = 0;
              const leftEdgeEndX = leftTopX;
              const leftEdgeEndY = leftTopY;
              const leftEdgeLength = Math.sqrt(
                (leftEdgeEndX - leftEdgeStartX) ** 2 + (leftEdgeEndY - leftEdgeStartY) ** 2,
              );
              const leftEdgeLengthMm = leftEdgeLength * SCALE;
              const numLeftMarkers = Math.floor(leftEdgeLengthMm / 20);
              const leftDirX = (leftEdgeEndX - leftEdgeStartX) / leftEdgeLength;
              const leftDirY = (leftEdgeEndY - leftEdgeStartY) / leftEdgeLength;

              return Array.from({ length: numLeftMarkers + 1 }).map((_, i) => {
                const dist = i * mmInterval;
                const markerX = leftEdgeStartX + leftDirX * dist;
                const markerY = leftEdgeStartY + leftDirY * dist;
                const tickOffsetX = -leftDirY * 0.15;
                const tickOffsetY = leftDirX * 0.15;
                const mmValue = i * 20;

                return (
                  <group key={`left-mm-${i}`}>
                    <Line
                      points={[
                        [markerX - tickOffsetX, markerY - tickOffsetY, 0.01],
                        [markerX + tickOffsetX, markerY + tickOffsetY, 0.01],
                      ]}
                      color="#000000"
                      lineWidth={2}
                    />
                    {i % 2 === 0 && (
                      <Text
                        position={[markerX + tickOffsetX * 2, markerY + tickOffsetY * 2, 0.01]}
                        fontSize={0.12}
                        color="#000000"
                        anchorX="center"
                        anchorY="middle"
                      >
                        {mmValue}
                      </Text>
                    )}
                  </group>
                );
              });
            })()}
          </group>
        );
      })()}
      {(() => {
        const gussetCount = duckfootGussetCount || 2;
        const gussetThickness = (duckfootGussetThicknessMm || 12) / SCALE;
        const placement = duckfootGussetPlacement || "HEEL_ONLY";

        if (gussetCount <= 2) return null;

        const additionalGussets = [];
        const gussetColors = ["#009933", "#990099", "#cc3300", "#006699"];

        if (gussetCount >= 4) {
          additionalGussets.push(
            <mesh
              key="gusset-3"
              position={[basePlateXDim / 4, ribHeightH / 3, basePlateYDim / 4]}
              rotation={[0, Math.PI / 4, 0]}
            >
              <boxGeometry args={[gussetThickness, ribHeightH / 1.5, basePlateYDim / 3]} />
              <meshStandardMaterial
                color={gussetColors[0]}
                metalness={0.8}
                roughness={0.25}
                envMapIntensity={1.0}
              />
            </mesh>,
            <mesh
              key="gusset-4"
              position={[-basePlateXDim / 4, ribHeightH / 3, -basePlateYDim / 4]}
              rotation={[0, Math.PI / 4, 0]}
            >
              <boxGeometry args={[gussetThickness, ribHeightH / 1.5, basePlateYDim / 3]} />
              <meshStandardMaterial
                color={gussetColors[1]}
                metalness={0.8}
                roughness={0.25}
                envMapIntensity={1.0}
              />
            </mesh>,
          );
        }

        if (gussetCount >= 6) {
          additionalGussets.push(
            <mesh
              key="gusset-5"
              position={[-basePlateXDim / 4, ribHeightH / 3, basePlateYDim / 4]}
              rotation={[0, -Math.PI / 4, 0]}
            >
              <boxGeometry args={[gussetThickness, ribHeightH / 1.5, basePlateYDim / 3]} />
              <meshStandardMaterial
                color={gussetColors[2]}
                metalness={0.8}
                roughness={0.25}
                envMapIntensity={1.0}
              />
            </mesh>,
            <mesh
              key="gusset-6"
              position={[basePlateXDim / 4, ribHeightH / 3, -basePlateYDim / 4]}
              rotation={[0, -Math.PI / 4, 0]}
            >
              <boxGeometry args={[gussetThickness, ribHeightH / 1.5, basePlateYDim / 3]} />
              <meshStandardMaterial
                color={gussetColors[3]}
                metalness={0.8}
                roughness={0.25}
                envMapIntensity={1.0}
              />
            </mesh>,
          );
        }

        return (
          <group>
            {additionalGussets}
            <Text
              position={[0, -plateThickness - 0.3, 0]}
              fontSize={0.2}
              color="#333333"
              anchorX="center"
              anchorY="middle"
              rotation={[-Math.PI / 2, 0, 0]}
            >
              {`${gussetCount} Gussets (${placement.replace(/_/g, " ")})`}
            </Text>
          </group>
        );
      })()}
      {(() => {
        const weldLineColor = "#000000";
        const weldLineWidth = 8;

        const extradosR = bendR + outerR;
        const midAngleRad = Math.PI / 4;
        const extradosAt45Y =
          bendR - extradosR * Math.cos(midAngleRad) + duckfootYOffset - steelworkY;
        const cutoutRadius = outerR;
        const cutoutBottomY = extradosAt45Y - cutoutRadius / 2;
        const cutoutCenterY = cutoutBottomY + cutoutRadius;
        const gussetIntersectionHeight = cutoutBottomY;

        const pointDAngleDegrees = duckfootGussetPointDDegrees || 75;
        const pointCAngleDegrees = duckfootGussetPointCDegrees || 15;

        const extradosLocalX = (angleDeg: number) => {
          const angleRad = (angleDeg * Math.PI) / 180;
          return -extradosR * Math.sin(angleRad) - gussetRefX;
        };
        const extradosLocalY = (angleDeg: number) => {
          const angleRad = (angleDeg * Math.PI) / 180;
          return bendR - extradosR * Math.cos(angleRad) + duckfootYOffset - steelworkY;
        };

        const halfPlateX = basePlateXDim / 2;
        const halfPlateY = basePlateYDim / 2;

        const arcSegments = 24;
        const blueGussetCutoutPoints: Array<[number, number, number]> = Array.from(
          { length: arcSegments + 1 },
          (_, i): [number, number, number] => {
            const angle = (i / arcSegments) * Math.PI;
            const arcZ = cutoutRadius * Math.cos(angle);
            const arcY = cutoutCenterY - cutoutRadius * Math.sin(angle);
            return [0, arcY, arcZ];
          },
        );

        const curveSegments = 16;
        const yellowGussetCurvePoints: Array<[number, number, number]> = Array.from(
          { length: curveSegments + 1 },
          (_, i): [number, number, number] => {
            const angleDeg =
              pointDAngleDegrees + (i / curveSegments) * (pointCAngleDegrees - pointDAngleDegrees);
            const localX = extradosLocalX(angleDeg);
            const localY = extradosLocalY(angleDeg);
            return [localX, Math.max(0.1, localY), 0];
          },
        );

        const weldOffset = 0.05;

        return (
          <group>
            <Line points={blueGussetCutoutPoints} color={weldLineColor} lineWidth={weldLineWidth} />

            <Line
              points={yellowGussetCurvePoints}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />

            <Line
              points={[
                [ribThickness / 2 + weldOffset, weldOffset, weldOffset],
                [ribThickness / 2 + weldOffset, gussetIntersectionHeight, weldOffset],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />
            <Line
              points={[
                [-ribThickness / 2 - weldOffset, weldOffset, weldOffset],
                [-ribThickness / 2 - weldOffset, gussetIntersectionHeight, weldOffset],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />
            <Line
              points={[
                [weldOffset, weldOffset, ribThickness / 2 + weldOffset],
                [weldOffset, gussetIntersectionHeight, ribThickness / 2 + weldOffset],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />
            <Line
              points={[
                [weldOffset, weldOffset, -ribThickness / 2 - weldOffset],
                [weldOffset, gussetIntersectionHeight, -ribThickness / 2 - weldOffset],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />

            <Line
              points={[
                [ribThickness / 2 + weldOffset, weldOffset, -halfPlateY],
                [ribThickness / 2 + weldOffset, weldOffset, halfPlateY],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />
            <Line
              points={[
                [-ribThickness / 2 - weldOffset, weldOffset, -halfPlateY],
                [-ribThickness / 2 - weldOffset, weldOffset, halfPlateY],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />

            <Line
              points={[
                [-halfPlateX, weldOffset, ribThickness / 2 + weldOffset],
                [halfPlateX, weldOffset, ribThickness / 2 + weldOffset],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />
            <Line
              points={[
                [-halfPlateX, weldOffset, -ribThickness / 2 - weldOffset],
                [halfPlateX, weldOffset, -ribThickness / 2 - weldOffset],
              ]}
              color={weldLineColor}
              lineWidth={weldLineWidth}
            />
          </group>
        );
      })()}
    </group>
  );
};

export { DuckfootSteelwork };
