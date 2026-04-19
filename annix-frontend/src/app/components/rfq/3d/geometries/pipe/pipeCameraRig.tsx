"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { asOrbitControls } from "@/app/lib/3d";

export const CameraRig = ({ viewMode, targets }: { viewMode: string; targets: any }) => {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();

  useFrame(() => {
    const orbit = asOrbitControls(controls);
    if (viewMode === "free" || !orbit) return;

    let targetPos = targets.iso.pos;
    let targetLookAt = targets.iso.lookAt;

    if (viewMode === "inlet") {
      targetPos = targets.inlet.pos;
      targetLookAt = targets.inlet.lookAt;
    } else if (viewMode === "outlet") {
      targetPos = targets.outlet.pos;
      targetLookAt = targets.outlet.lookAt;
    }

    camera.position.lerp(vec.set(targetPos[0], targetPos[1], targetPos[2]), 0.05);
    orbit.target.lerp(new THREE.Vector3(targetLookAt[0], targetLookAt[1], targetLookAt[2]), 0.05);
    orbit.update();
  });

  return null;
};
