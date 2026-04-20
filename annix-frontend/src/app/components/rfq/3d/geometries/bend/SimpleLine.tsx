"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface SimpleLineProps {
  points: Array<[number, number, number]>;
  color?: string;
  lineWidth?: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
}

export const SimpleLine = ({
  points,
  color = "#000000",
  lineWidth = 1,
  dashed = false,
  dashSize = 0.1,
  gapSize = 0.1,
}: SimpleLineProps) => {
  const tubeGeo = useMemo(() => {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      false,
      "catmullrom",
      0,
    );
    const tubeRadius = lineWidth * 0.01;
    return new THREE.TubeGeometry(curve, Math.max(points.length * 4, 8), tubeRadius, 6, false);
  }, [points, lineWidth]);

  if (!tubeGeo) return null;

  return (
    <mesh geometry={tubeGeo} renderOrder={999}>
      <meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  );
};
