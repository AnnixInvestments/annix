"use client";

import { Line as DreiLine, Text } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React from "react";
import * as THREE from "three";

const Line = (props: React.ComponentProps<typeof DreiLine>) => {
  const { size } = useThree();
  return <DreiLine {...props} resolution={new THREE.Vector2(size.width, size.height)} />;
};

export const DimensionLine = ({
  start,
  end,
  label,
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
}) => {
  const p1 = new THREE.Vector3(...start);
  const p2 = new THREE.Vector3(...end);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  return (
    <group>
      <Line points={[p1, p2]} color="black" lineWidth={1} />
      <mesh position={p1} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.15, 8]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh position={p2} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.15, 8]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <Text
        position={[midX, midY + 0.12, 0]}
        fontSize={0.28}
        color="black"
        anchorX="center"
        anchorY="bottom"
        fontWeight="bold"
      >
        {label}
      </Text>
    </group>
  );
};
