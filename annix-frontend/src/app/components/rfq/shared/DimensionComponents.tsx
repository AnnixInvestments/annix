"use client";

import { Html, Line, Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { DIMENSION_STANDARDS } from "@/app/lib/config/rfq/rendering3DStandards";

export type ArrowStyle = "open" | "filled" | "tick";
export type LineWeight = "thin" | "normal" | "bold";
export type LeaderAngle = 30 | 45 | 60;
export type DimensionMode = "chain" | "baseline";

const LINE_WIDTHS: Record<LineWeight, number> = {
  thin: DIMENSION_STANDARDS.extensionLineWeight,
  normal: DIMENSION_STANDARDS.dimensionLineWeight,
  bold: DIMENSION_STANDARDS.boldLineWeight,
};

const calculateArrowSize = (length: number): number =>
  Math.min(
    DIMENSION_STANDARDS.arrowMaxLength,
    Math.max(DIMENSION_STANDARDS.arrowMinLength, length * DIMENSION_STANDARDS.arrowLengthRatio),
  );

const createArrowPoints = (
  tip: THREE.Vector3,
  dir: THREE.Vector3,
  arrowSize: number,
): [number, number, number][] => {
  const arrowAngle = DIMENSION_STANDARDS.arrowAngle;
  const arrow1 = tip
    .clone()
    .add(
      new THREE.Vector3(
        dir.x * Math.cos(arrowAngle) - dir.z * Math.sin(arrowAngle),
        dir.y,
        dir.x * Math.sin(arrowAngle) + dir.z * Math.cos(arrowAngle),
      ).multiplyScalar(arrowSize),
    );
  const arrow2 = tip
    .clone()
    .add(
      new THREE.Vector3(
        dir.x * Math.cos(-arrowAngle) - dir.z * Math.sin(-arrowAngle),
        dir.y,
        dir.x * Math.sin(-arrowAngle) + dir.z * Math.cos(-arrowAngle),
      ).multiplyScalar(arrowSize),
    );
  return [
    [arrow1.x, arrow1.y, arrow1.z],
    [tip.x, tip.y, tip.z],
    [arrow2.x, arrow2.y, arrow2.z],
  ];
};

const createFilledArrowGeometry = (
  tip: THREE.Vector3,
  dir: THREE.Vector3,
  arrowSize: number,
): THREE.BufferGeometry => {
  const arrowWidth = arrowSize * DIMENSION_STANDARDS.arrowWidthRatio;
  const perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
  const base = tip.clone().add(dir.clone().multiplyScalar(arrowSize));
  const corner1 = base.clone().add(perpendicular.clone().multiplyScalar(arrowWidth));
  const corner2 = base.clone().sub(perpendicular.clone().multiplyScalar(arrowWidth));
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    tip.x,
    tip.y,
    tip.z,
    corner1.x,
    corner1.y,
    corner1.z,
    corner2.x,
    corner2.y,
    corner2.z,
  ]);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
};

const createTickPoints = (
  point: THREE.Vector3,
  perpDir: THREE.Vector3,
  arrowSize: number,
): [number, number, number][] => {
  const tickSize = arrowSize * 0.8;
  const tick1 = point.clone().add(perpDir.clone().multiplyScalar(tickSize));
  const tick2 = point.clone().sub(perpDir.clone().multiplyScalar(tickSize));
  return [
    [tick1.x, tick1.y, tick1.z],
    [tick2.x, tick2.y, tick2.z],
  ];
};

export interface LeaderLineProps {
  attachPoint: THREE.Vector3;
  label: string;
  leaderAngle?: LeaderAngle;
  leaderLength?: number;
  shelfLength?: number;
  color?: string;
  fontSize?: number;
  lineWeight?: LineWeight;
  arrowStyle?: ArrowStyle;
  textAlign?: "left" | "right";
  useHtml?: boolean;
}

export const LeaderLine = ({
  attachPoint,
  label,
  leaderAngle = 45,
  leaderLength = 0.4,
  shelfLength = 0.3,
  color = "#333333",
  fontSize = 0.12,
  lineWeight = "normal",
  arrowStyle = "open",
  textAlign = "right",
  useHtml = false,
}: LeaderLineProps) => {
  const angleRad = (leaderAngle * Math.PI) / 180;
  const direction = textAlign === "right" ? 1 : -1;

  const elbowPoint = useMemo(
    () =>
      new THREE.Vector3(
        attachPoint.x + direction * leaderLength * Math.cos(angleRad),
        attachPoint.y + leaderLength * Math.sin(angleRad),
        attachPoint.z,
      ),
    [attachPoint, leaderLength, angleRad, direction],
  );

  const shelfEnd = useMemo(
    () => new THREE.Vector3(elbowPoint.x + direction * shelfLength, elbowPoint.y, elbowPoint.z),
    [elbowPoint, shelfLength, direction],
  );

  const textPosition = useMemo(
    () => new THREE.Vector3(shelfEnd.x + direction * 0.05, shelfEnd.y, shelfEnd.z),
    [shelfEnd, direction],
  );

  const leaderDir = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(attachPoint, elbowPoint).normalize();
    return dir;
  }, [attachPoint, elbowPoint]);

  const dimLineWidth = LINE_WIDTHS[lineWeight];
  const arrowSize = calculateArrowSize(leaderLength);

  const arrowPoints = useMemo(
    () => createArrowPoints(attachPoint, leaderDir, arrowSize),
    [attachPoint, leaderDir, arrowSize],
  );

  const filledArrowGeometry = useMemo(
    () =>
      arrowStyle === "filled" ? createFilledArrowGeometry(attachPoint, leaderDir, arrowSize) : null,
    [attachPoint, leaderDir, arrowSize, arrowStyle],
  );

  return (
    <group>
      <Line
        points={[
          [attachPoint.x, attachPoint.y, attachPoint.z],
          [elbowPoint.x, elbowPoint.y, elbowPoint.z],
        ]}
        color={color}
        lineWidth={dimLineWidth}
      />

      <Line
        points={[
          [elbowPoint.x, elbowPoint.y, elbowPoint.z],
          [shelfEnd.x, shelfEnd.y, shelfEnd.z],
        ]}
        color={color}
        lineWidth={dimLineWidth}
      />

      {arrowStyle === "open" && (
        <Line points={arrowPoints} color={color} lineWidth={dimLineWidth} />
      )}

      {arrowStyle === "filled" && filledArrowGeometry && (
        <mesh geometry={filledArrowGeometry}>
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )}

      {useHtml ? (
        <Html position={[textPosition.x, textPosition.y, textPosition.z]} center>
          <div
            style={{
              color,
              fontSize: `${fontSize * 100}px`,
              fontWeight: "bold",
              fontFamily: "system-ui, sans-serif",
              whiteSpace: "nowrap",
              textAlign: textAlign,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {label}
          </div>
        </Html>
      ) : (
        <Text
          position={[textPosition.x, textPosition.y, textPosition.z]}
          fontSize={fontSize}
          color={color}
          anchorX={textAlign === "right" ? "left" : "right"}
          anchorY="middle"
          fontWeight="bold"
        >
          {label}
        </Text>
      )}
    </group>
  );
};

export interface DimensionPoint {
  position: THREE.Vector3;
  label?: string;
}

export interface ChainDimensionProps {
  points: DimensionPoint[];
  offset?: number;
  offsetDirection?: "x" | "y" | "z" | THREE.Vector3;
  color?: string;
  fontSize?: number;
  arrowStyle?: ArrowStyle;
  lineWeight?: LineWeight;
  showTotal?: boolean;
  totalLabel?: string;
  totalOffset?: number;
  useHtml?: boolean;
}

export const ChainDimension = ({
  points,
  offset = 0.5,
  offsetDirection = "y",
  color = "#333333",
  fontSize = 0.14,
  arrowStyle = "open",
  lineWeight = "normal",
  showTotal = false,
  totalLabel,
  totalOffset = 0.3,
  useHtml = false,
}: ChainDimensionProps) => {
  if (points.length < 2) return null;

  const offsetVector = useMemo(() => {
    if (offsetDirection instanceof THREE.Vector3) {
      return offsetDirection.clone().normalize().multiplyScalar(offset);
    }
    const vec = new THREE.Vector3();
    vec[offsetDirection] = offset;
    return vec;
  }, [offset, offsetDirection]);

  const segments = useMemo(() => {
    const result: Array<{
      start: THREE.Vector3;
      end: THREE.Vector3;
      startOffset: THREE.Vector3;
      endOffset: THREE.Vector3;
      label: string;
      length: number;
    }> = [];

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i].position;
      const end = points[i + 1].position;
      const length = start.distanceTo(end);
      const label = points[i + 1].label ?? `${Math.round(length * 1000)}mm`;

      result.push({
        start,
        end,
        startOffset: start.clone().add(offsetVector),
        endOffset: end.clone().add(offsetVector),
        label,
        length,
      });
    }
    return result;
  }, [points, offsetVector]);

  const dimLineWidth = LINE_WIDTHS[lineWeight];
  const extLineWidth = Math.max(1, dimLineWidth - 0.5);

  const totalLength = useMemo(() => segments.reduce((sum, seg) => sum + seg.length, 0), [segments]);

  const totalOffsetVector = useMemo(() => {
    if (offsetDirection instanceof THREE.Vector3) {
      return offsetDirection
        .clone()
        .normalize()
        .multiplyScalar(offset + totalOffset);
    }
    const vec = new THREE.Vector3();
    vec[offsetDirection] = offset + totalOffset;
    return vec;
  }, [offset, totalOffset, offsetDirection]);

  return (
    <group>
      {segments.map((seg, idx) => {
        const direction = new THREE.Vector3()
          .subVectors(seg.endOffset, seg.startOffset)
          .normalize();
        const midPoint = new THREE.Vector3().lerpVectors(seg.startOffset, seg.endOffset, 0.5);
        const arrowSize = calculateArrowSize(seg.length);
        const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);

        const leftArrowPoints = createArrowPoints(seg.startOffset, direction, arrowSize);
        const rightArrowPoints = createArrowPoints(
          seg.endOffset,
          direction.clone().negate(),
          arrowSize,
        );
        const leftTickPoints = createTickPoints(seg.startOffset, perpDir, arrowSize);
        const rightTickPoints = createTickPoints(seg.endOffset, perpDir, arrowSize);

        const extGapDir = offsetVector.clone().normalize();
        const extStartGap = seg.start
          .clone()
          .add(extGapDir.multiplyScalar(DIMENSION_STANDARDS.extensionGap * Math.sign(offset)));
        const extEndGap = seg.end
          .clone()
          .add(
            extGapDir.clone().multiplyScalar(DIMENSION_STANDARDS.extensionGap * Math.sign(offset)),
          );
        const extStartOvershoot = seg.startOffset
          .clone()
          .add(
            extGapDir
              .clone()
              .multiplyScalar(DIMENSION_STANDARDS.extensionOvershoot * Math.sign(offset)),
          );
        const extEndOvershoot = seg.endOffset
          .clone()
          .add(
            extGapDir
              .clone()
              .multiplyScalar(DIMENSION_STANDARDS.extensionOvershoot * Math.sign(offset)),
          );

        const showStartExt = idx === 0;
        const showEndExt = true;

        return (
          <group key={idx}>
            <Line
              points={[
                [seg.startOffset.x, seg.startOffset.y, seg.startOffset.z],
                [seg.endOffset.x, seg.endOffset.y, seg.endOffset.z],
              ]}
              color={color}
              lineWidth={dimLineWidth}
            />

            {arrowStyle === "open" && (
              <>
                <Line points={leftArrowPoints} color={color} lineWidth={dimLineWidth} />
                <Line points={rightArrowPoints} color={color} lineWidth={dimLineWidth} />
              </>
            )}

            {arrowStyle === "tick" && (
              <>
                <Line points={leftTickPoints} color={color} lineWidth={dimLineWidth} />
                <Line points={rightTickPoints} color={color} lineWidth={dimLineWidth} />
              </>
            )}

            {arrowStyle === "filled" && (
              <>
                <mesh
                  geometry={createFilledArrowGeometry(
                    seg.startOffset,
                    direction.clone().negate(),
                    arrowSize,
                  )}
                >
                  <meshBasicMaterial color={color} side={THREE.DoubleSide} />
                </mesh>
                <mesh geometry={createFilledArrowGeometry(seg.endOffset, direction, arrowSize)}>
                  <meshBasicMaterial color={color} side={THREE.DoubleSide} />
                </mesh>
              </>
            )}

            {showStartExt && (
              <Line
                points={[
                  [extStartGap.x, extStartGap.y, extStartGap.z],
                  [extStartOvershoot.x, extStartOvershoot.y, extStartOvershoot.z],
                ]}
                color={color}
                lineWidth={extLineWidth}
              />
            )}

            {showEndExt && (
              <Line
                points={[
                  [extEndGap.x, extEndGap.y, extEndGap.z],
                  [extEndOvershoot.x, extEndOvershoot.y, extEndOvershoot.z],
                ]}
                color={color}
                lineWidth={extLineWidth}
              />
            )}

            {useHtml ? (
              <Html
                position={[midPoint.x, midPoint.y + DIMENSION_STANDARDS.textOffset, midPoint.z]}
                center
              >
                <div
                  style={{
                    color,
                    fontSize: `${fontSize * 100}px`,
                    fontWeight: "bold",
                    fontFamily: "system-ui, sans-serif",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {seg.label}
                </div>
              </Html>
            ) : (
              <Text
                position={[midPoint.x, midPoint.y + DIMENSION_STANDARDS.textOffset, midPoint.z]}
                fontSize={fontSize}
                color={color}
                anchorX="center"
                anchorY="bottom"
                fontWeight="bold"
              >
                {seg.label}
              </Text>
            )}
          </group>
        );
      })}

      {showTotal && segments.length > 0 && (
        <group>
          {(() => {
            const firstStart = points[0].position;
            const lastEnd = points[points.length - 1].position;
            const totalStartOffset = firstStart.clone().add(totalOffsetVector);
            const totalEndOffset = lastEnd.clone().add(totalOffsetVector);
            const totalMidPoint = new THREE.Vector3().lerpVectors(
              totalStartOffset,
              totalEndOffset,
              0.5,
            );
            const totalDir = new THREE.Vector3()
              .subVectors(totalEndOffset, totalStartOffset)
              .normalize();
            const totalArrowSize = calculateArrowSize(totalLength);

            const label = totalLabel ?? `Total: ${Math.round(totalLength * 1000)}mm`;

            return (
              <>
                <Line
                  points={[
                    [totalStartOffset.x, totalStartOffset.y, totalStartOffset.z],
                    [totalEndOffset.x, totalEndOffset.y, totalEndOffset.z],
                  ]}
                  color={color}
                  lineWidth={dimLineWidth}
                />

                {arrowStyle === "open" && (
                  <>
                    <Line
                      points={createArrowPoints(totalStartOffset, totalDir, totalArrowSize)}
                      color={color}
                      lineWidth={dimLineWidth}
                    />
                    <Line
                      points={createArrowPoints(
                        totalEndOffset,
                        totalDir.clone().negate(),
                        totalArrowSize,
                      )}
                      color={color}
                      lineWidth={dimLineWidth}
                    />
                  </>
                )}

                {useHtml ? (
                  <Html
                    position={[
                      totalMidPoint.x,
                      totalMidPoint.y + DIMENSION_STANDARDS.textOffset,
                      totalMidPoint.z,
                    ]}
                    center
                  >
                    <div
                      style={{
                        color,
                        fontSize: `${fontSize * 100}px`,
                        fontWeight: "bold",
                        fontFamily: "system-ui, sans-serif",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    >
                      {label}
                    </div>
                  </Html>
                ) : (
                  <Text
                    position={[
                      totalMidPoint.x,
                      totalMidPoint.y + DIMENSION_STANDARDS.textOffset,
                      totalMidPoint.z,
                    ]}
                    fontSize={fontSize}
                    color={color}
                    anchorX="center"
                    anchorY="bottom"
                    fontWeight="bold"
                  >
                    {label}
                  </Text>
                )}
              </>
            );
          })()}
        </group>
      )}
    </group>
  );
};

export interface BaselineDimensionProps {
  baseline: THREE.Vector3;
  points: DimensionPoint[];
  baseOffset?: number;
  spacingIncrement?: number;
  offsetDirection?: "x" | "y" | "z" | THREE.Vector3;
  color?: string;
  fontSize?: number;
  arrowStyle?: ArrowStyle;
  lineWeight?: LineWeight;
  useHtml?: boolean;
}

export const BaselineDimension = ({
  baseline,
  points,
  baseOffset = 0.5,
  spacingIncrement = 0.25,
  offsetDirection = "y",
  color = "#333333",
  fontSize = 0.14,
  arrowStyle = "open",
  lineWeight = "normal",
  useHtml = false,
}: BaselineDimensionProps) => {
  if (points.length < 1) return null;

  const baseOffsetVector = useMemo(() => {
    if (offsetDirection instanceof THREE.Vector3) {
      return offsetDirection.clone().normalize();
    }
    const vec = new THREE.Vector3();
    vec[offsetDirection] = 1;
    return vec.normalize();
  }, [offsetDirection]);

  const dimLineWidth = LINE_WIDTHS[lineWeight];
  const extLineWidth = Math.max(1, dimLineWidth - 0.5);

  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => {
      const distA = baseline.distanceTo(a.position);
      const distB = baseline.distanceTo(b.position);
      return distA - distB;
    });
  }, [points, baseline]);

  return (
    <group>
      {sortedPoints.map((point, idx) => {
        const offset = baseOffset + idx * spacingIncrement;
        const offsetVec = baseOffsetVector.clone().multiplyScalar(offset);

        const startOffset = baseline.clone().add(offsetVec);
        const endOffset = point.position.clone().add(offsetVec);
        const length = baseline.distanceTo(point.position);
        const label = point.label ?? `${Math.round(length * 1000)}mm`;

        const direction = new THREE.Vector3().subVectors(endOffset, startOffset).normalize();
        const midPoint = new THREE.Vector3().lerpVectors(startOffset, endOffset, 0.5);
        const arrowSize = calculateArrowSize(length);
        const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);

        const extGapDir = baseOffsetVector.clone();
        const extBaselineGap = baseline
          .clone()
          .add(extGapDir.multiplyScalar(DIMENSION_STANDARDS.extensionGap));
        const extPointGap = point.position
          .clone()
          .add(extGapDir.clone().multiplyScalar(DIMENSION_STANDARDS.extensionGap));

        const maxOffset =
          baseOffset +
          (sortedPoints.length - 1) * spacingIncrement +
          DIMENSION_STANDARDS.extensionOvershoot;
        const extBaselineOvershoot = baseline
          .clone()
          .add(baseOffsetVector.clone().multiplyScalar(maxOffset));
        const extPointOvershoot = point.position
          .clone()
          .add(
            baseOffsetVector
              .clone()
              .multiplyScalar(offset + DIMENSION_STANDARDS.extensionOvershoot),
          );

        const showBaselineExt = idx === sortedPoints.length - 1;

        return (
          <group key={idx}>
            <Line
              points={[
                [startOffset.x, startOffset.y, startOffset.z],
                [endOffset.x, endOffset.y, endOffset.z],
              ]}
              color={color}
              lineWidth={dimLineWidth}
            />

            {arrowStyle === "open" && (
              <>
                <Line
                  points={createArrowPoints(startOffset, direction, arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
                <Line
                  points={createArrowPoints(endOffset, direction.clone().negate(), arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
              </>
            )}

            {arrowStyle === "tick" && (
              <>
                <Line
                  points={createTickPoints(startOffset, perpDir, arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
                <Line
                  points={createTickPoints(endOffset, perpDir, arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
              </>
            )}

            {arrowStyle === "filled" && (
              <>
                <mesh
                  geometry={createFilledArrowGeometry(
                    startOffset,
                    direction.clone().negate(),
                    arrowSize,
                  )}
                >
                  <meshBasicMaterial color={color} side={THREE.DoubleSide} />
                </mesh>
                <mesh geometry={createFilledArrowGeometry(endOffset, direction, arrowSize)}>
                  <meshBasicMaterial color={color} side={THREE.DoubleSide} />
                </mesh>
              </>
            )}

            {showBaselineExt && (
              <Line
                points={[
                  [extBaselineGap.x, extBaselineGap.y, extBaselineGap.z],
                  [extBaselineOvershoot.x, extBaselineOvershoot.y, extBaselineOvershoot.z],
                ]}
                color={color}
                lineWidth={extLineWidth}
              />
            )}

            <Line
              points={[
                [extPointGap.x, extPointGap.y, extPointGap.z],
                [extPointOvershoot.x, extPointOvershoot.y, extPointOvershoot.z],
              ]}
              color={color}
              lineWidth={extLineWidth}
            />

            {useHtml ? (
              <Html
                position={[midPoint.x, midPoint.y + DIMENSION_STANDARDS.textOffset, midPoint.z]}
                center
              >
                <div
                  style={{
                    color,
                    fontSize: `${fontSize * 100}px`,
                    fontWeight: "bold",
                    fontFamily: "system-ui, sans-serif",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {label}
                </div>
              </Html>
            ) : (
              <Text
                position={[midPoint.x, midPoint.y + DIMENSION_STANDARDS.textOffset, midPoint.z]}
                fontSize={fontSize}
                color={color}
                anchorX="center"
                anchorY="bottom"
                fontWeight="bold"
              >
                {label}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
};

export interface DimensionBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
}

export interface AutoSpacedDimension {
  start: THREE.Vector3;
  end: THREE.Vector3;
  label: string;
  calculatedOffset: number;
  direction: "x" | "y" | "z";
}

export interface AutoDimensionSpacingConfig {
  minSpacing: number;
  baseOffset: number;
  incrementStep: number;
  maxOffset: number;
}

const DEFAULT_SPACING_CONFIG: AutoDimensionSpacingConfig = {
  minSpacing: 0.15,
  baseOffset: 0.4,
  incrementStep: 0.2,
  maxOffset: 2.0,
};

export const calculateAutoSpacing = (
  dimensions: Array<{ start: THREE.Vector3; end: THREE.Vector3; label: string }>,
  offsetDirection: "x" | "y" | "z",
  config: Partial<AutoDimensionSpacingConfig> = {},
): AutoSpacedDimension[] => {
  const cfg = { ...DEFAULT_SPACING_CONFIG, ...config };

  const projectToAxis = (point: THREE.Vector3, axis: "x" | "y" | "z"): number => {
    const axes = ["x", "y", "z"].filter((a) => a !== axis);
    return point[axes[0] as keyof THREE.Vector3] as number;
  };

  const dimensionsWithRange = dimensions.map((dim) => {
    const startProj = projectToAxis(dim.start, offsetDirection);
    const endProj = projectToAxis(dim.end, offsetDirection);
    return {
      ...dim,
      rangeMin: Math.min(startProj, endProj),
      rangeMax: Math.max(startProj, endProj),
    };
  });

  const rangesOverlap = (
    a: { rangeMin: number; rangeMax: number },
    b: { rangeMin: number; rangeMax: number },
  ): boolean => {
    return a.rangeMin <= b.rangeMax + cfg.minSpacing && a.rangeMax >= b.rangeMin - cfg.minSpacing;
  };

  const result: AutoSpacedDimension[] = [];
  const offsetLevels: Array<{ rangeMin: number; rangeMax: number; offset: number }[]> = [[]];

  dimensionsWithRange.forEach((dim) => {
    let assignedLevel = -1;

    for (let level = 0; level < offsetLevels.length; level++) {
      const levelDims = offsetLevels[level];
      const hasOverlap = levelDims.some((existing) => rangesOverlap(dim, existing));

      if (!hasOverlap) {
        assignedLevel = level;
        break;
      }
    }

    if (assignedLevel === -1) {
      assignedLevel = offsetLevels.length;
      offsetLevels.push([]);
    }

    offsetLevels[assignedLevel].push({
      rangeMin: dim.rangeMin,
      rangeMax: dim.rangeMax,
      offset: cfg.baseOffset + assignedLevel * cfg.incrementStep,
    });

    const calculatedOffset = Math.min(
      cfg.maxOffset,
      cfg.baseOffset + assignedLevel * cfg.incrementStep,
    );

    result.push({
      start: dim.start,
      end: dim.end,
      label: dim.label,
      calculatedOffset,
      direction: offsetDirection,
    });
  });

  return result;
};

export interface AutoSpacedDimensionsProps {
  dimensions: Array<{ start: THREE.Vector3; end: THREE.Vector3; label: string }>;
  offsetDirection?: "x" | "y" | "z";
  spacingConfig?: Partial<AutoDimensionSpacingConfig>;
  color?: string;
  fontSize?: number;
  arrowStyle?: ArrowStyle;
  lineWeight?: LineWeight;
  useHtml?: boolean;
}

export const AutoSpacedDimensions = ({
  dimensions,
  offsetDirection = "y",
  spacingConfig,
  color = "#333333",
  fontSize = 0.14,
  arrowStyle = "open",
  lineWeight = "normal",
  useHtml = false,
}: AutoSpacedDimensionsProps) => {
  const spacedDimensions = useMemo(
    () => calculateAutoSpacing(dimensions, offsetDirection, spacingConfig),
    [dimensions, offsetDirection, spacingConfig],
  );

  const dimLineWidth = LINE_WIDTHS[lineWeight];
  const extLineWidth = Math.max(1, dimLineWidth - 0.5);

  return (
    <group>
      {spacedDimensions.map((dim, idx) => {
        const offsetVec = new THREE.Vector3();
        offsetVec[dim.direction] = dim.calculatedOffset;

        const startOffset = dim.start.clone().add(offsetVec);
        const endOffset = dim.end.clone().add(offsetVec);
        const length = dim.start.distanceTo(dim.end);

        const direction = new THREE.Vector3().subVectors(endOffset, startOffset);
        const dirLength = direction.length();
        if (dirLength < 0.001) return null;
        direction.normalize();

        const midPoint = new THREE.Vector3().lerpVectors(startOffset, endOffset, 0.5);
        const arrowSize = calculateArrowSize(length);
        const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);

        const extGapDir = offsetVec.clone().normalize();
        const sign = Math.sign(dim.calculatedOffset);
        const extStartGap = dim.start
          .clone()
          .add(extGapDir.clone().multiplyScalar(DIMENSION_STANDARDS.extensionGap * sign));
        const extEndGap = dim.end
          .clone()
          .add(extGapDir.clone().multiplyScalar(DIMENSION_STANDARDS.extensionGap * sign));
        const extStartOvershoot = startOffset
          .clone()
          .add(extGapDir.clone().multiplyScalar(DIMENSION_STANDARDS.extensionOvershoot * sign));
        const extEndOvershoot = endOffset
          .clone()
          .add(extGapDir.clone().multiplyScalar(DIMENSION_STANDARDS.extensionOvershoot * sign));

        return (
          <group key={idx}>
            <Line
              points={[
                [startOffset.x, startOffset.y, startOffset.z],
                [endOffset.x, endOffset.y, endOffset.z],
              ]}
              color={color}
              lineWidth={dimLineWidth}
            />

            {arrowStyle === "open" && (
              <>
                <Line
                  points={createArrowPoints(startOffset, direction, arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
                <Line
                  points={createArrowPoints(endOffset, direction.clone().negate(), arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
              </>
            )}

            {arrowStyle === "tick" && (
              <>
                <Line
                  points={createTickPoints(startOffset, perpDir, arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
                <Line
                  points={createTickPoints(endOffset, perpDir, arrowSize)}
                  color={color}
                  lineWidth={dimLineWidth}
                />
              </>
            )}

            {arrowStyle === "filled" && (
              <>
                <mesh
                  geometry={createFilledArrowGeometry(
                    startOffset,
                    direction.clone().negate(),
                    arrowSize,
                  )}
                >
                  <meshBasicMaterial color={color} side={THREE.DoubleSide} />
                </mesh>
                <mesh geometry={createFilledArrowGeometry(endOffset, direction, arrowSize)}>
                  <meshBasicMaterial color={color} side={THREE.DoubleSide} />
                </mesh>
              </>
            )}

            <Line
              points={[
                [extStartGap.x, extStartGap.y, extStartGap.z],
                [extStartOvershoot.x, extStartOvershoot.y, extStartOvershoot.z],
              ]}
              color={color}
              lineWidth={extLineWidth}
            />

            <Line
              points={[
                [extEndGap.x, extEndGap.y, extEndGap.z],
                [extEndOvershoot.x, extEndOvershoot.y, extEndOvershoot.z],
              ]}
              color={color}
              lineWidth={extLineWidth}
            />

            {useHtml ? (
              <Html
                position={[midPoint.x, midPoint.y + DIMENSION_STANDARDS.textOffset, midPoint.z]}
                center
              >
                <div
                  style={{
                    color,
                    fontSize: `${fontSize * 100}px`,
                    fontWeight: "bold",
                    fontFamily: "system-ui, sans-serif",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {dim.label}
                </div>
              </Html>
            ) : (
              <Text
                position={[midPoint.x, midPoint.y + DIMENSION_STANDARDS.textOffset, midPoint.z]}
                fontSize={fontSize}
                color={color}
                anchorX="center"
                anchorY="bottom"
                fontWeight="bold"
              >
                {dim.label}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
};

export interface HtmlDimensionLabelProps {
  position: THREE.Vector3;
  label: string;
  color?: string;
  fontSize?: number;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

export const HtmlDimensionLabel = ({
  position,
  label,
  color = "#333333",
  fontSize = 12,
  backgroundColor = "rgba(255, 255, 255, 0.9)",
  padding = 4,
  borderRadius = 3,
}: HtmlDimensionLabelProps) => {
  return (
    <Html position={[position.x, position.y, position.z]} center>
      <div
        style={{
          color,
          fontSize: `${fontSize}px`,
          fontWeight: "bold",
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor,
          padding: `${padding}px ${padding * 2}px`,
          borderRadius: `${borderRadius}px`,
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }}
      >
        {label}
      </div>
    </Html>
  );
};
