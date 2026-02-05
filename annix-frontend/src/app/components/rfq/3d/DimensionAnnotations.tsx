'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface SimpleLineProps {
  points: Array<[number, number, number]>;
  color?: string;
  lineWidth?: number;
}

const Line = ({
  points,
  color = '#000000',
  lineWidth = 1,
}: SimpleLineProps) => {
  const tubeGeo = useMemo(() => {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      false,
      'catmullrom',
      0
    );
    const tubeRadius = lineWidth * 0.01;
    return new THREE.TubeGeometry(
      curve,
      Math.max(points.length * 4, 8),
      tubeRadius,
      6,
      false
    );
  }, [points, lineWidth]);

  if (!tubeGeo) return null;

  return (
    <mesh geometry={tubeGeo} renderOrder={999}>
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  );
};

export interface DimensionLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  label: string;
  offset?: number;
  offsetDirection?: 'y' | 'x' | 'z' | THREE.Vector3;
  color?: string;
  hideStartExtension?: boolean;
  hideEndExtension?: boolean;
  textAbove?: boolean;
  fontSize?: number;
  arrowStyle?: 'open' | 'filled' | 'tick';
  lineWeight?: 'thin' | 'normal' | 'bold';
}

export const DimensionLine = ({
  start,
  end,
  label,
  offset = 0.5,
  offsetDirection = 'y',
  color = '#333333',
  hideStartExtension = false,
  hideEndExtension = false,
  textAbove = true,
  fontSize = 0.16,
  arrowStyle = 'open',
  lineWeight = 'normal',
}: DimensionLineProps) => {
  const offsetVector = useMemo(() => {
    if (offsetDirection instanceof THREE.Vector3) {
      return offsetDirection.clone().normalize().multiplyScalar(offset);
    }
    const vec = new THREE.Vector3();
    vec[offsetDirection] = offset;
    return vec;
  }, [offset, offsetDirection]);

  const startOffset = useMemo(
    () => start.clone().add(offsetVector),
    [start, offsetVector]
  );
  const endOffset = useMemo(
    () => end.clone().add(offsetVector),
    [end, offsetVector]
  );

  const midPoint = useMemo(
    () => new THREE.Vector3().lerpVectors(startOffset, endOffset, 0.5),
    [startOffset, endOffset]
  );
  const direction = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(endOffset, startOffset);
    const len = dir.length();
    return len > 0.001 ? dir.normalize() : new THREE.Vector3(1, 0, 0);
  }, [startOffset, endOffset]);
  const length = useMemo(
    () => new THREE.Vector3().subVectors(endOffset, startOffset).length(),
    [startOffset, endOffset]
  );

  if (length < 0.01) return null;

  const textRotationY = -Math.atan2(direction.z, direction.x);

  const lineWidths = { thin: 1.5, normal: 2, bold: 3 };
  const dimLineWidth = lineWidths[lineWeight];
  const extLineWidth = Math.max(1, dimLineWidth - 0.5);

  const arrowSize = Math.min(0.1, Math.max(0.04, length * 0.08));
  const arrowAngle = Math.PI * 0.89;

  const extensionGap = 0.02;
  const extensionOvershoot = 0.04;

  const extStartGap = useMemo(() => {
    const gapDir = offsetVector.clone().normalize();
    return start
      .clone()
      .add(gapDir.multiplyScalar(extensionGap * Math.sign(offset)));
  }, [start, offsetVector, offset]);

  const extEndGap = useMemo(() => {
    const gapDir = offsetVector.clone().normalize();
    return end
      .clone()
      .add(gapDir.multiplyScalar(extensionGap * Math.sign(offset)));
  }, [end, offsetVector, offset]);

  const extStartOvershoot = useMemo(() => {
    const overshootDir = offsetVector.clone().normalize();
    return startOffset
      .clone()
      .add(overshootDir.multiplyScalar(extensionOvershoot * Math.sign(offset)));
  }, [startOffset, offsetVector, offset]);

  const extEndOvershoot = useMemo(() => {
    const overshootDir = offsetVector.clone().normalize();
    return endOffset
      .clone()
      .add(overshootDir.multiplyScalar(extensionOvershoot * Math.sign(offset)));
  }, [endOffset, offsetVector, offset]);

  const createArrowPoints = (
    tip: THREE.Vector3,
    dir: THREE.Vector3
  ): [number, number, number][] => {
    const arrow1 = tip.clone().add(
      new THREE.Vector3(
        dir.x * Math.cos(arrowAngle) - dir.z * Math.sin(arrowAngle),
        0,
        dir.x * Math.sin(arrowAngle) + dir.z * Math.cos(arrowAngle)
      ).multiplyScalar(arrowSize)
    );
    const arrow2 = tip.clone().add(
      new THREE.Vector3(
        dir.x * Math.cos(-arrowAngle) - dir.z * Math.sin(-arrowAngle),
        0,
        dir.x * Math.sin(-arrowAngle) + dir.z * Math.cos(-arrowAngle)
      ).multiplyScalar(arrowSize)
    );
    return [
      [arrow1.x, arrow1.y, arrow1.z],
      [tip.x, tip.y, tip.z],
      [arrow2.x, arrow2.y, arrow2.z],
    ];
  };

  const createTickPoints = (
    point: THREE.Vector3,
    perpDir: THREE.Vector3
  ): [number, number, number][] => {
    const tickSize = arrowSize * 0.8;
    const tick1 = point.clone().add(perpDir.clone().multiplyScalar(tickSize));
    const tick2 = point.clone().sub(perpDir.clone().multiplyScalar(tickSize));
    return [
      [tick1.x, tick1.y, tick1.z],
      [tick2.x, tick2.y, tick2.z],
    ];
  };

  const createFilledArrowGeometry = (
    tip: THREE.Vector3,
    dir: THREE.Vector3
  ): THREE.BufferGeometry => {
    const arrowWidth = arrowSize * 0.4;
    const perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
    const base = tip.clone().add(dir.clone().multiplyScalar(arrowSize));
    const corner1 = base
      .clone()
      .add(perpendicular.clone().multiplyScalar(arrowWidth));
    const corner2 = base
      .clone()
      .sub(perpendicular.clone().multiplyScalar(arrowWidth));
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
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  };

  const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);
  const leftArrowPoints = createArrowPoints(startOffset, direction);
  const rightArrowPoints = createArrowPoints(
    endOffset,
    direction.clone().negate()
  );
  const leftTickPoints = createTickPoints(startOffset, perpDir);
  const rightTickPoints = createTickPoints(endOffset, perpDir);

  const textOffset = textAbove ? 0.12 : -0.12;

  return (
    <group>
      <Line
        points={[
          [startOffset.x, startOffset.y, startOffset.z],
          [endOffset.x, endOffset.y, endOffset.z],
        ]}
        color={color}
        lineWidth={dimLineWidth}
      />

      {arrowStyle === 'open' && (
        <>
          <Line points={leftArrowPoints} color={color} lineWidth={dimLineWidth} />
          <Line
            points={rightArrowPoints}
            color={color}
            lineWidth={dimLineWidth}
          />
        </>
      )}

      {arrowStyle === 'tick' && (
        <>
          <Line points={leftTickPoints} color={color} lineWidth={dimLineWidth} />
          <Line points={rightTickPoints} color={color} lineWidth={dimLineWidth} />
        </>
      )}

      {arrowStyle === 'filled' && (
        <>
          <mesh
            geometry={createFilledArrowGeometry(
              startOffset,
              direction.clone().negate()
            )}
          >
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={createFilledArrowGeometry(endOffset, direction)}>
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {!hideStartExtension && (
        <Line
          points={[
            [extStartGap.x, extStartGap.y, extStartGap.z],
            [extStartOvershoot.x, extStartOvershoot.y, extStartOvershoot.z],
          ]}
          color={color}
          lineWidth={extLineWidth}
        />
      )}
      {!hideEndExtension && (
        <Line
          points={[
            [extEndGap.x, extEndGap.y, extEndGap.z],
            [extEndOvershoot.x, extEndOvershoot.y, extEndOvershoot.z],
          ]}
          color={color}
          lineWidth={extLineWidth}
        />
      )}

      <Text
        position={[midPoint.x, midPoint.y + textOffset, midPoint.z]}
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY={textAbove ? 'bottom' : 'top'}
        fontWeight="bold"
        rotation={[0, textRotationY, 0]}
      >
        {label}
      </Text>
    </group>
  );
};

export interface AngularDimensionProps {
  center: THREE.Vector3;
  radius: number;
  startAngle: number;
  endAngle: number;
  plane?: 'xy' | 'xz' | 'yz';
  color?: string;
  fontSize?: number;
  showArrows?: boolean;
  arrowStyle?: 'open' | 'filled';
  lineWeight?: number;
  label?: string;
  textRotation?: [number, number, number];
}

export const AngularDimension = ({
  center,
  radius,
  startAngle,
  endAngle,
  plane = 'xz',
  color = '#cc6600',
  fontSize = 0.1,
  showArrows = true,
  arrowStyle = 'open',
  lineWeight = 2,
  label,
  textRotation = [0, 0, 0],
}: AngularDimensionProps) => {
  const arcSegments = 32;
  const angleDiff = endAngle - startAngle;
  const angleDegrees = Math.round(Math.abs(angleDiff) * (180 / Math.PI));
  const displayLabel = label ?? `${angleDegrees}°`;

  const arcPoints = useMemo(() => {
    const points: [number, number, number][] = [];
    for (let i = 0; i <= arcSegments; i++) {
      const t = i / arcSegments;
      const angle = startAngle + t * angleDiff;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      if (plane === 'xy') {
        points.push([
          center.x + radius * cos,
          center.y + radius * sin,
          center.z,
        ]);
      } else if (plane === 'xz') {
        points.push([
          center.x + radius * cos,
          center.y,
          center.z + radius * sin,
        ]);
      } else {
        points.push([
          center.x,
          center.y + radius * cos,
          center.z + radius * sin,
        ]);
      }
    }
    return points;
  }, [center, radius, startAngle, endAngle, plane, angleDiff]);

  const midAngle = startAngle + angleDiff / 2;
  const textPosition = useMemo(() => {
    const cos = Math.cos(midAngle);
    const sin = Math.sin(midAngle);
    const textRadius = radius * 0.65;
    if (plane === 'xy') {
      return new THREE.Vector3(
        center.x + textRadius * cos,
        center.y + textRadius * sin,
        center.z
      );
    } else if (plane === 'xz') {
      return new THREE.Vector3(
        center.x + textRadius * cos,
        center.y,
        center.z + textRadius * sin
      );
    } else {
      return new THREE.Vector3(
        center.x,
        center.y + textRadius * cos,
        center.z + textRadius * sin
      );
    }
  }, [center, radius, midAngle, plane]);

  const arrowSize = Math.min(0.08, radius * 0.15);

  const startArrowGeometry = useMemo(() => {
    if (!showArrows || arrowStyle !== 'filled') return null;
    const startCos = Math.cos(startAngle);
    const startSin = Math.sin(startAngle);
    const tangentAngle =
      startAngle + Math.PI / 2 + (angleDiff > 0 ? 0 : Math.PI);
    const tangentCos = Math.cos(tangentAngle);
    const tangentSin = Math.sin(tangentAngle);
    let tip: THREE.Vector3, dir: THREE.Vector3;
    if (plane === 'xy') {
      tip = new THREE.Vector3(
        center.x + radius * startCos,
        center.y + radius * startSin,
        center.z
      );
      dir = new THREE.Vector3(tangentCos, tangentSin, 0);
    } else if (plane === 'xz') {
      tip = new THREE.Vector3(
        center.x + radius * startCos,
        center.y,
        center.z + radius * startSin
      );
      dir = new THREE.Vector3(tangentCos, 0, tangentSin);
    } else {
      tip = new THREE.Vector3(
        center.x,
        center.y + radius * startCos,
        center.z + radius * startSin
      );
      dir = new THREE.Vector3(0, tangentCos, tangentSin);
    }
    const base = tip.clone().add(dir.clone().multiplyScalar(arrowSize));
    let perpendicular: THREE.Vector3;
    if (plane === 'xy') perpendicular = new THREE.Vector3(-dir.y, dir.x, 0);
    else if (plane === 'xz') perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
    else perpendicular = new THREE.Vector3(0, -dir.z, dir.y);
    const width = arrowSize * 0.4;
    const corner1 = base
      .clone()
      .add(perpendicular.clone().multiplyScalar(width));
    const corner2 = base
      .clone()
      .sub(perpendicular.clone().multiplyScalar(width));
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
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [center, radius, startAngle, plane, showArrows, arrowStyle, arrowSize, angleDiff]);

  const endArrowGeometry = useMemo(() => {
    if (!showArrows || arrowStyle !== 'filled') return null;
    const endCos = Math.cos(endAngle);
    const endSin = Math.sin(endAngle);
    const tangentAngle = endAngle - Math.PI / 2 + (angleDiff > 0 ? 0 : Math.PI);
    const tangentCos = Math.cos(tangentAngle);
    const tangentSin = Math.sin(tangentAngle);
    let tip: THREE.Vector3, dir: THREE.Vector3;
    if (plane === 'xy') {
      tip = new THREE.Vector3(
        center.x + radius * endCos,
        center.y + radius * endSin,
        center.z
      );
      dir = new THREE.Vector3(tangentCos, tangentSin, 0);
    } else if (plane === 'xz') {
      tip = new THREE.Vector3(
        center.x + radius * endCos,
        center.y,
        center.z + radius * endSin
      );
      dir = new THREE.Vector3(tangentCos, 0, tangentSin);
    } else {
      tip = new THREE.Vector3(
        center.x,
        center.y + radius * endCos,
        center.z + radius * endSin
      );
      dir = new THREE.Vector3(0, tangentCos, tangentSin);
    }
    const base = tip.clone().add(dir.clone().multiplyScalar(arrowSize));
    let perpendicular: THREE.Vector3;
    if (plane === 'xy') perpendicular = new THREE.Vector3(-dir.y, dir.x, 0);
    else if (plane === 'xz') perpendicular = new THREE.Vector3(-dir.z, 0, dir.x);
    else perpendicular = new THREE.Vector3(0, -dir.z, dir.y);
    const width = arrowSize * 0.4;
    const corner1 = base
      .clone()
      .add(perpendicular.clone().multiplyScalar(width));
    const corner2 = base
      .clone()
      .sub(perpendicular.clone().multiplyScalar(width));
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
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [center, radius, endAngle, plane, showArrows, arrowStyle, arrowSize, angleDiff]);

  const openArrowPoints = useMemo(() => {
    if (!showArrows || arrowStyle !== 'open')
      return { start: null, end: null };
    const startCos = Math.cos(startAngle);
    const startSin = Math.sin(startAngle);
    const endCos = Math.cos(endAngle);
    const endSin = Math.sin(endAngle);
    const startTangentAngle =
      startAngle + Math.PI / 2 + (angleDiff > 0 ? 0 : Math.PI);
    const endTangentAngle =
      endAngle - Math.PI / 2 + (angleDiff > 0 ? 0 : Math.PI);
    let startTip: THREE.Vector3,
      endTip: THREE.Vector3,
      startDir: THREE.Vector3,
      endDir: THREE.Vector3;
    if (plane === 'xy') {
      startTip = new THREE.Vector3(
        center.x + radius * startCos,
        center.y + radius * startSin,
        center.z
      );
      endTip = new THREE.Vector3(
        center.x + radius * endCos,
        center.y + radius * endSin,
        center.z
      );
      startDir = new THREE.Vector3(
        Math.cos(startTangentAngle),
        Math.sin(startTangentAngle),
        0
      );
      endDir = new THREE.Vector3(
        Math.cos(endTangentAngle),
        Math.sin(endTangentAngle),
        0
      );
    } else if (plane === 'xz') {
      startTip = new THREE.Vector3(
        center.x + radius * startCos,
        center.y,
        center.z + radius * startSin
      );
      endTip = new THREE.Vector3(
        center.x + radius * endCos,
        center.y,
        center.z + radius * endSin
      );
      startDir = new THREE.Vector3(
        Math.cos(startTangentAngle),
        0,
        Math.sin(startTangentAngle)
      );
      endDir = new THREE.Vector3(
        Math.cos(endTangentAngle),
        0,
        Math.sin(endTangentAngle)
      );
    } else {
      startTip = new THREE.Vector3(
        center.x,
        center.y + radius * startCos,
        center.z + radius * startSin
      );
      endTip = new THREE.Vector3(
        center.x,
        center.y + radius * endCos,
        center.z + radius * endSin
      );
      startDir = new THREE.Vector3(
        0,
        Math.cos(startTangentAngle),
        Math.sin(startTangentAngle)
      );
      endDir = new THREE.Vector3(
        0,
        Math.cos(endTangentAngle),
        Math.sin(endTangentAngle)
      );
    }
    const arrowAngle = Math.PI * 0.89;
    const createOpenArrow = (
      tip: THREE.Vector3,
      dir: THREE.Vector3
    ): [number, number, number][] => {
      const rotated1 = new THREE.Vector3(
        dir.x * Math.cos(arrowAngle) - dir.y * Math.sin(arrowAngle),
        dir.x * Math.sin(arrowAngle) + dir.y * Math.cos(arrowAngle),
        dir.z
      ).multiplyScalar(arrowSize);
      const rotated2 = new THREE.Vector3(
        dir.x * Math.cos(-arrowAngle) - dir.y * Math.sin(-arrowAngle),
        dir.x * Math.sin(-arrowAngle) + dir.y * Math.cos(-arrowAngle),
        dir.z
      ).multiplyScalar(arrowSize);
      const p1 = tip.clone().add(rotated1);
      const p2 = tip.clone().add(rotated2);
      return [
        [p1.x, p1.y, p1.z],
        [tip.x, tip.y, tip.z],
        [p2.x, p2.y, p2.z],
      ];
    };
    return {
      start: createOpenArrow(startTip, startDir),
      end: createOpenArrow(endTip, endDir),
    };
  }, [
    center,
    radius,
    startAngle,
    endAngle,
    plane,
    showArrows,
    arrowStyle,
    arrowSize,
    angleDiff,
  ]);

  return (
    <group>
      <Line points={arcPoints} color={color} lineWidth={lineWeight} />

      {showArrows && arrowStyle === 'filled' && startArrowGeometry && (
        <mesh geometry={startArrowGeometry}>
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showArrows && arrowStyle === 'filled' && endArrowGeometry && (
        <mesh geometry={endArrowGeometry}>
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )}
      {showArrows && arrowStyle === 'open' && openArrowPoints.start && (
        <Line
          points={openArrowPoints.start}
          color={color}
          lineWidth={lineWeight}
        />
      )}
      {showArrows && arrowStyle === 'open' && openArrowPoints.end && (
        <Line points={openArrowPoints.end} color={color} lineWidth={lineWeight} />
      )}

      <Text
        position={[textPosition.x, textPosition.y, textPosition.z]}
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        rotation={textRotation}
      >
        {displayLabel}
      </Text>
    </group>
  );
};
