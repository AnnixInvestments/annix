"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { isNumber } from "es-toolkit/compat";
import { useEffect, useRef } from "react";
import { asOrbitControls } from "@/app/lib/3d";
import { log } from "@/app/lib/logger";

type Vec3 = [number, number, number];

interface CameraTrackerProps {
  onCameraChange?: (position: Vec3, target: Vec3) => void;
  onCameraUpdate?: (position: Vec3, zoom: number) => void;
  savedPosition?: Vec3;
  savedTarget?: Vec3;
  label?: string;
}

export function CameraTracker(props: CameraTrackerProps) {
  const { onCameraChange, onCameraUpdate, savedPosition, savedTarget, label = "Shared" } = props;

  const { camera, controls } = useThree();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const pendingSaveKeyRef = useRef<string>("");
  const hasRestoredRef = useRef(false);
  const frameCountRef = useRef(0);

  useEffect(() => {
    log.debug(
      `${label} CameraTracker useEffect`,
      JSON.stringify({
        savedPosition,
        savedTarget,
        hasRestored: hasRestoredRef.current,
        hasControls: !!controls,
      }),
    );
    const hasValidPosition =
      savedPosition &&
      isNumber(savedPosition[0]) &&
      isNumber(savedPosition[1]) &&
      isNumber(savedPosition[2]);
    if (hasValidPosition && controls && !hasRestoredRef.current) {
      log.debug(
        `${label} CameraTracker restoring camera position`,
        JSON.stringify({
          position: savedPosition,
          target: savedTarget,
        }),
      );
      camera.position.set(savedPosition[0], savedPosition[1], savedPosition[2]);
      if (
        savedTarget &&
        isNumber(savedTarget[0]) &&
        isNumber(savedTarget[1]) &&
        isNumber(savedTarget[2])
      ) {
        const orbitControls = asOrbitControls(controls);
        if (orbitControls) {
          orbitControls.target.set(savedTarget[0], savedTarget[1], savedTarget[2]);
          orbitControls.update();
        }
      }
      hasRestoredRef.current = true;
      const restoredKey = `${savedPosition[0].toFixed(2)},${savedPosition[1].toFixed(2)},${savedPosition[2].toFixed(2)}`;
      lastSavedRef.current = restoredKey;
      pendingSaveKeyRef.current = "";
    }
  }, [camera, controls, savedPosition, savedTarget, label]);

  useFrame(() => {
    const distance = camera.position.length();
    if (onCameraUpdate) {
      onCameraUpdate([camera.position.x, camera.position.y, camera.position.z], distance);
    }

    frameCountRef.current++;
    if (frameCountRef.current % 60 === 0) {
      log.debug(
        `${label} CameraTracker useFrame check`,
        JSON.stringify({
          hasOnCameraChange: !!onCameraChange,
          hasControls: !!controls,
          cameraPos: [
            camera.position.x.toFixed(2),
            camera.position.y.toFixed(2),
            camera.position.z.toFixed(2),
          ],
          lastSaved: lastSavedRef.current,
        }),
      );
    }

    const orbitControls = asOrbitControls(controls);
    if (onCameraChange && orbitControls) {
      const target = orbitControls.target;
      const currentKey = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
      const needsNewSave =
        currentKey !== lastSavedRef.current && currentKey !== pendingSaveKeyRef.current;

      if (needsNewSave) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        const posToSave = [camera.position.x, camera.position.y, camera.position.z] as Vec3;
        const targetToSave = [target.x, target.y, target.z] as Vec3;
        const keyToSave = currentKey;
        pendingSaveKeyRef.current = keyToSave;

        log.debug(`${label} CameraTracker setting timeout for`, keyToSave);

        saveTimeoutRef.current = setTimeout(() => {
          log.debug(
            `${label} CameraTracker timeout fired, saving`,
            JSON.stringify({
              position: posToSave,
              target: targetToSave,
              key: keyToSave,
            }),
          );
          lastSavedRef.current = keyToSave;
          pendingSaveKeyRef.current = "";
          onCameraChange(posToSave, targetToSave);
        }, 500);
      }
    }
  });

  return null;
}
