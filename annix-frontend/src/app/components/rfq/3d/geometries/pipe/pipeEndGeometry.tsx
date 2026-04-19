"use client";

import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import {
  FLANGE_MATERIALS,
  PIPE_MATERIALS,
  WELD_MATERIALS,
} from "@/app/lib/config/rfq/rendering3DStandards";

const pipeInnerMat = PIPE_MATERIALS.inner;
const weldColor = WELD_MATERIALS.standard;
const blankFlangeColor = FLANGE_MATERIALS.blank;
const boltColor = FLANGE_MATERIALS.bolt;
const rotatingFlangeColor = {
  color: "#4a90d9",
  metalness: 0.85,
  roughness: 0.2,
  envMapIntensity: 1.2,
};

export const Spigot = ({
  position,
  mainPipeRadius,
  spigotOuterRadius,
  spigotInnerRadius,
  spigotLength,
  materialProps,
  label,
  flangeConfig = "PE",
  hasBlankFlange = false,
  spigotNb = 50,
}: {
  position: [number, number, number];
  mainPipeRadius: number;
  spigotOuterRadius: number;
  spigotInnerRadius: number;
  spigotLength: number;
  materialProps: { color: string; metalness: number; roughness: number };
  label: string;
  flangeConfig?: string;
  hasBlankFlange?: boolean;
  spigotNb?: number;
}) => {
  const hasFlanges = flangeConfig === "FAE" || flangeConfig === "RF";
  const isRotatingFlange = flangeConfig === "RF";

  const flangeOdRatio = 2.2;
  const flangeOd = spigotOuterRadius * flangeOdRatio;
  const flangeThickness = spigotOuterRadius * 0.3;
  const retainingRingThickness = spigotOuterRadius * 0.15;

  return (
    <group position={position}>
      <group position={[0, mainPipeRadius + spigotLength / 2, 0]}>
        <mesh>
          <cylinderGeometry
            args={[spigotOuterRadius, spigotOuterRadius, spigotLength, 24, 1, true]}
          />
          <meshStandardMaterial
            color={materialProps.color}
            metalness={materialProps.metalness}
            roughness={materialProps.roughness}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh>
          <cylinderGeometry
            args={[spigotInnerRadius, spigotInnerRadius, spigotLength + 0.01, 24, 1, true]}
          />
          <meshStandardMaterial {...pipeInnerMat} side={THREE.DoubleSide} />
        </mesh>
        {!hasFlanges && (
          <mesh position={[0, spigotLength / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[spigotInnerRadius, spigotOuterRadius, 24]} />
            <meshStandardMaterial
              color={materialProps.color}
              metalness={materialProps.metalness}
              roughness={materialProps.roughness}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        <mesh position={[0, -spigotLength / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[spigotInnerRadius, spigotOuterRadius, 24]} />
          <meshStandardMaterial
            color={materialProps.color}
            metalness={materialProps.metalness}
            roughness={materialProps.roughness}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {hasFlanges && (
        <group position={[0, mainPipeRadius + spigotLength + flangeThickness / 2, 0]}>
          {isRotatingFlange ? (
            <>
              <group position={[0, -flangeThickness / 2 - retainingRingThickness / 2, 0]}>
                <mesh>
                  <cylinderGeometry
                    args={[flangeOd * 0.65, flangeOd * 0.65, retainingRingThickness, 32, 1, true]}
                  />
                  <meshStandardMaterial
                    color={materialProps.color}
                    metalness={materialProps.metalness}
                    roughness={materialProps.roughness}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <mesh>
                  <cylinderGeometry
                    args={[
                      spigotOuterRadius,
                      spigotOuterRadius,
                      retainingRingThickness,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial
                    color={materialProps.color}
                    metalness={materialProps.metalness}
                    roughness={materialProps.roughness}
                    side={THREE.BackSide}
                  />
                </mesh>
              </group>
              <mesh>
                <cylinderGeometry args={[flangeOd, flangeOd, flangeThickness, 32, 1, true]} />
                <meshStandardMaterial {...rotatingFlangeColor} side={THREE.DoubleSide} />
              </mesh>
              <mesh>
                <cylinderGeometry
                  args={[spigotOuterRadius, spigotOuterRadius, flangeThickness, 32, 1, true]}
                />
                <meshStandardMaterial {...rotatingFlangeColor} side={THREE.BackSide} />
              </mesh>
              <mesh position={[0, flangeThickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[spigotOuterRadius, flangeOd, 32]} />
                <meshStandardMaterial {...rotatingFlangeColor} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, -flangeThickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[spigotOuterRadius, flangeOd, 32]} />
                <meshStandardMaterial {...rotatingFlangeColor} side={THREE.DoubleSide} />
              </mesh>
            </>
          ) : (
            <>
              <mesh>
                <cylinderGeometry args={[flangeOd, flangeOd, flangeThickness, 32, 1, true]} />
                <meshStandardMaterial
                  color={materialProps.color}
                  metalness={materialProps.metalness}
                  roughness={materialProps.roughness}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh>
                <cylinderGeometry
                  args={[spigotOuterRadius, spigotOuterRadius, flangeThickness, 32, 1, true]}
                />
                <meshStandardMaterial
                  color={materialProps.color}
                  metalness={materialProps.metalness}
                  roughness={materialProps.roughness}
                  side={THREE.BackSide}
                />
              </mesh>
              <mesh position={[0, flangeThickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[spigotOuterRadius, flangeOd, 32]} />
                <meshStandardMaterial
                  color={materialProps.color}
                  metalness={materialProps.metalness}
                  roughness={materialProps.roughness}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh position={[0, -flangeThickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[spigotOuterRadius, flangeOd, 32]} />
                <meshStandardMaterial
                  color={materialProps.color}
                  metalness={materialProps.metalness}
                  roughness={materialProps.roughness}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </>
          )}
          {Array.from({ length: 4 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 4;
            const boltX = Math.cos(angle) * flangeOd * 0.75;
            const boltZ = Math.sin(angle) * flangeOd * 0.75;
            return (
              <mesh key={`bolt-${i}`} position={[boltX, 0, boltZ]}>
                <cylinderGeometry
                  args={[flangeOd * 0.05, flangeOd * 0.05, flangeThickness + 0.01, 8]}
                />
                <meshStandardMaterial color="#111" />
              </mesh>
            );
          })}
        </group>
      )}

      {hasFlanges && hasBlankFlange && (
        <group
          position={[
            0,
            mainPipeRadius + spigotLength + flangeThickness + 0.005 + flangeThickness / 2,
            0,
          ]}
        >
          <mesh>
            <cylinderGeometry args={[flangeOd, flangeOd, flangeThickness, 32]} />
            <meshStandardMaterial {...blankFlangeColor} />
          </mesh>
          <Text
            position={[0, flangeThickness / 2 + 0.03, 0]}
            fontSize={0.05}
            color="#f97316"
            anchorX="center"
            anchorY="bottom"
            rotation={[-Math.PI / 2, 0, 0]}
          >
            BLANK
          </Text>
        </group>
      )}

      <mesh position={[0, mainPipeRadius, 0]}>
        <torusGeometry args={[spigotOuterRadius, spigotOuterRadius * 0.08, 8, 24]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
      <Text
        position={[
          0,
          mainPipeRadius + spigotLength + (hasFlanges ? flangeThickness * 2 : 0) + 0.08,
          0,
        ]}
        fontSize={0.08}
        color="#0d9488"
        anchorX="center"
        anchorY="bottom"
      >
        {label}
        {hasFlanges ? (isRotatingFlange ? " R/F" : " FAE") : ""}
      </Text>
    </group>
  );
};

export const PuddleFlange = ({
  position,
  pipeOuterRadius,
  flangeOdMm,
  flangePcdMm,
  holeCount,
  holeIdMm,
  thicknessMm,
}: {
  position: [number, number, number];
  pipeOuterRadius: number;
  flangeOdMm: number;
  flangePcdMm: number;
  holeCount: number;
  holeIdMm: number;
  thicknessMm: number;
}) => {
  const flangeOd = flangeOdMm / 1000;
  const flangePcd = flangePcdMm / 1000;
  const holeId = holeIdMm / 1000;
  const thickness = thicknessMm / 1000;

  const flangeOuterRadius = flangeOd / 2;
  const pcdRadius = flangePcd / 2;
  const holeRadius = holeId / 2;

  const boltHoles = useMemo(() => {
    return Array.from({ length: holeCount }, (_, i) => {
      const angle = (i / holeCount) * Math.PI * 2;
      return { y: Math.cos(angle) * pcdRadius, z: Math.sin(angle) * pcdRadius };
    });
  }, [holeCount, pcdRadius]);

  const puddleFlangeColor = "#b45309";
  const flangeFaceColor = "#d97706";

  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[flangeOuterRadius, flangeOuterRadius, thickness, 32, 1, true]} />
        <meshStandardMaterial
          color={puddleFlangeColor}
          metalness={0.6}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[pipeOuterRadius, pipeOuterRadius, thickness, 32, 1, true]} />
        <meshStandardMaterial
          color={puddleFlangeColor}
          metalness={0.6}
          roughness={0.4}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh position={[0, thickness / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[pipeOuterRadius, flangeOuterRadius, 32]} />
        <meshStandardMaterial
          color={flangeFaceColor}
          metalness={0.5}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -thickness / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[pipeOuterRadius, flangeOuterRadius, 32]} />
        <meshStandardMaterial
          color={flangeFaceColor}
          metalness={0.5}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {boltHoles.map((hole, i) => (
        <mesh key={i} position={[hole.y, 0, hole.z]}>
          <cylinderGeometry args={[holeRadius, holeRadius, thickness + 0.004, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <mesh position={[0, thickness / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pipeOuterRadius, pipeOuterRadius * 0.06, 8, 24]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
      <mesh position={[0, -thickness / 2 - 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pipeOuterRadius, pipeOuterRadius * 0.06, 8, 24]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
      <mesh position={[0, thickness / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[flangeOuterRadius - 0.002, 0.003, 8, 32]} />
        <meshStandardMaterial {...boltColor} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -thickness / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[flangeOuterRadius - 0.002, 0.003, 8, 32]} />
        <meshStandardMaterial {...boltColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
