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

    let target = targets.iso;
    if (viewMode === "inlet") {
      target = targets.inlet;
    } else if (viewMode === "outlet") {
      target = targets.outlet;
    }
    const targetPos = target.pos;
    const targetLookAt = target.lookAt;

    camera.position.lerp(vec.set(targetPos[0], targetPos[1], targetPos[2]), 0.05);
    orbit.target.lerp(new THREE.Vector3(targetLookAt[0], targetLookAt[1], targetLookAt[2]), 0.05);

    // Optional per-view FOV (e.g. telephoto end views that keep
    // concentric rings at different depths in true relative size).
    // Only animate when the target specifies one.
    const targetFov = target.fov;
    if (targetFov != null && camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.05);
        camera.updateProjectionMatrix();
      }
    }

    orbit.update();
  });

  return null;
};
