"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import type { ReactNode } from "react";
import { LIGHTING_CONFIG, SCENE_CONSTANTS } from "@/app/lib/config/rfq/rendering3DStandards";
import { CaptureHelper } from "../shared";

const PREVIEW_SCALE = SCENE_CONSTANTS.PREVIEW_SCALE;

interface ContactShadowsConfig {
  position?: [number, number, number];
  opacity?: number;
  scale?: number;
  blur?: number;
  far?: number;
}

interface OrbitControlsConfig {
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  minDistance?: number;
  maxDistance?: number;
  target?: [number, number, number];
  onStart?: () => void;
}

interface SceneShellProps {
  children: ReactNode;
  captureRef?: React.MutableRefObject<(() => string | null) | null>;
  contactShadows?: ContactShadowsConfig;
  orbitControls?: OrbitControlsConfig;
  scaleGroup?: number | false;
  includeShadowMap?: boolean;
  includeRimLight?: boolean;
  environmentPreset?: "warehouse" | "studio";
  backgroundColor?: string;
}

export function SceneShell(props: SceneShellProps) {
  const {
    children,
    captureRef,
    contactShadows,
    orbitControls,
    scaleGroup = PREVIEW_SCALE,
    includeShadowMap = false,
    includeRimLight = false,
    environmentPreset,
    backgroundColor,
  } = props;

  const shadowConfig = contactShadows || {
    position: [0, -2, 0] as [number, number, number],
    opacity: 0.4,
    scale: 15,
  };

  const controlsConfig = orbitControls || {
    enablePan: true,
  };

  const envPreset = environmentPreset || LIGHTING_CONFIG.environment.preset;

  return (
    <>
      {captureRef && <CaptureHelper captureRef={captureRef} />}
      {backgroundColor && <color attach="background" args={[backgroundColor]} />}
      <ambientLight intensity={LIGHTING_CONFIG.ambient.intensity} />
      <directionalLight
        position={LIGHTING_CONFIG.keyLight.position}
        intensity={LIGHTING_CONFIG.keyLight.intensity}
        castShadow
        {...(includeShadowMap
          ? { "shadow-mapSize": [LIGHTING_CONFIG.shadowMapSize, LIGHTING_CONFIG.shadowMapSize] }
          : {})}
      />
      <directionalLight
        position={LIGHTING_CONFIG.fillLight.position}
        intensity={LIGHTING_CONFIG.fillLight.intensity}
      />
      {includeRimLight && (
        <pointLight
          position={LIGHTING_CONFIG.rimLight.position}
          intensity={LIGHTING_CONFIG.rimLight.intensity}
        />
      )}
      <Environment preset={envPreset} background={LIGHTING_CONFIG.environment.background} />
      {scaleGroup !== false ? <group scale={scaleGroup}>{children}</group> : children}
      <ContactShadows
        position={shadowConfig.position}
        opacity={shadowConfig.opacity}
        scale={shadowConfig.scale}
        blur={shadowConfig.blur}
        far={shadowConfig.far}
      />
      <OrbitControls
        makeDefault
        enablePan={controlsConfig.enablePan}
        enableZoom={controlsConfig.enableZoom}
        enableRotate={controlsConfig.enableRotate}
        minDistance={controlsConfig.minDistance}
        maxDistance={controlsConfig.maxDistance}
        target={controlsConfig.target}
        onStart={controlsConfig.onStart}
      />
    </>
  );
}
