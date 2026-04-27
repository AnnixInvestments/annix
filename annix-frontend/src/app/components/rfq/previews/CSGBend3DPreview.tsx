"use client";

import { Center, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  AngularDimension,
  BlankFlange,
  DimensionLine,
  Flange,
  HollowBendPipe,
  HollowStraightPipe,
  RetainingRing,
  RotatingFlange,
  SaddleWeld,
  SegmentedBendPipe,
  StubPipe,
  WeldRing,
} from "@/app/components/rfq/3d";
import {
  BendDimensions,
  DuckfootSteelwork,
  SimpleLine as Line,
  SBendGeometry,
} from "@/app/components/rfq/3d/geometries/bend";
import { type StubData } from "@/app/hooks/use3DSceneSetup";
import { resolveFlangeData } from "@/app/lib/3d";
import {
  calculateVisualWallThickness,
  FLANGE_MATERIALS,
  GEOMETRY_CONSTANTS,
  PIPE_MATERIALS,
  WELD_MATERIALS,
} from "@/app/lib/config/rfq/rendering3DStandards";
import { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";
import { log } from "@/app/lib/logger";
import { useNbToOdLookup } from "@/app/lib/query/hooks";
import { CameraTracker, SceneShell } from "./hooks";

interface Props {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness: number;
  bendAngle: number;
  bendType?: string;
  tangent1?: number;
  tangent2?: number;
  materialName?: string;
  numberOfSegments?: number;
  isSegmented?: boolean;
  stubs?: StubData[];
  flangeConfig?: string;
  closureLengthMm?: number;
  addBlankFlange?: boolean;
  blankFlangePositions?: string[];
  savedCameraPosition?: [number, number, number];
  savedCameraTarget?: [number, number, number];
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
  selectedNotes?: string[];
  flangeSpecs?: FlangeSpecData | null;
  flangeStandardName?: string;
  pressureClassDesignation?: string;
  flangeTypeCode?: string;
  centerToFaceMm?: number;
  bendRadiusMm?: number;
  bendItemType?: string;
  duckfootBasePlateXMm?: number;
  duckfootBasePlateYMm?: number;
  duckfootInletCentreHeightMm?: number;
  duckfootPlateThicknessT1Mm?: number;
  duckfootRibThicknessT2Mm?: number;
  duckfootGussetPointDDegrees?: number;
  duckfootGussetPointCDegrees?: number;
  duckfootGussetCount?: number;
  duckfootGussetPlacement?: "HEEL_ONLY" | "SYMMETRICAL" | "FULL_COVERAGE";
  duckfootGussetThicknessMm?: number;
  sweepTeePipeALengthMm?: number;
}

const SCALE = GEOMETRY_CONSTANTS.SCALE;
const pipeOuterMat = PIPE_MATERIALS.outer;
const pipeInnerMat = PIPE_MATERIALS.inner;
const pipeEndMat = PIPE_MATERIALS.end;
const weldColor = WELD_MATERIALS.standard;
const flangeColor = FLANGE_MATERIALS.standard;
const blankFlangeColor = FLANGE_MATERIALS.blank;

const Scene = (props: Props) => {
  const {
    nominalBore,
    outerDiameter,
    wallThickness,
    bendAngle,
    tangent1 = 0,
    tangent2 = 0,
    numberOfSegments,
    isSegmented = false,
    stubs = [],
    flangeConfig = "PE",
    addBlankFlange = false,
    blankFlangePositions = [],
    centerToFaceMm,
    bendRadiusMm,
    bendItemType,
    duckfootBasePlateXMm,
    duckfootBasePlateYMm,
    duckfootInletCentreHeightMm,
    duckfootPlateThicknessT1Mm,
    duckfootRibThicknessT2Mm,
    duckfootGussetPointDDegrees,
    duckfootGussetPointCDegrees,
    duckfootGussetCount,
    duckfootGussetPlacement,
    duckfootGussetThicknessMm,
    sweepTeePipeALengthMm,
    closureLengthMm = 0,
  } = props;

  const { nbToOd } = useNbToOdLookup();

  log.debug("CSGBend3DPreview Scene props", {
    nominalBore,
    outerDiameter,
    wallThickness,
    bendAngle,
    tangent1,
    tangent2,
    numberOfSegments,
    stubCount: stubs.length,
    flangeConfig,
  });

  const odMm = outerDiameter || nbToOd(nominalBore);
  const wtMm = calculateVisualWallThickness(odMm, wallThickness || 6);

  const outerR = odMm / SCALE / 2;
  const innerR = (odMm - 2 * wtMm) / SCALE / 2;
  // Use bendRadiusMm prop if provided, otherwise default to 1.5 * NB
  const bendR = (bendRadiusMm || nominalBore * 1.5) / SCALE;

  const angleRad = (bendAngle * Math.PI) / 180;

  const t1 = tangent1 / SCALE;
  const t2 = tangent2 / SCALE;

  const config = flangeConfig.toUpperCase();
  const hasInletFlange = ["FOE", "FBE", "FOE_LF", "FOE_RF", "2X_RF", "2XLF"].includes(config);
  const hasOutletFlange = ["FBE", "FOE_LF", "FOE_RF", "2X_RF", "2XLF"].includes(config);

  const hasLooseInletFlange = config === "FOE_LF" || config === "2XLF";
  const hasLooseOutletFlange = config === "2XLF";

  const hasRotatingInletFlange = config === "FOE_RF" || config === "2X_RF";
  const hasRotatingOutletFlange = config === "2X_RF";

  const rotatingFlangeOffset = 80 / SCALE;
  const wtScaled = (wallThickness || 6) / SCALE;

  const fittingHasInletFlange = ["FAE", "F2E", "F2E_LF", "F2E_RF", "3X_RF", "2X_RF_FOE"].includes(
    config,
  );
  const fittingHasOutletFlange = ["FAE", "F2E", "F2E_LF", "F2E_RF", "3X_RF", "2X_RF_FOE"].includes(
    config,
  );
  const fittingHasBranchFlange = ["FAE", "F2E_LF", "F2E_RF", "3X_RF", "2X_RF_FOE"].includes(config);

  const fittingHasLooseInletFlange = config === "F2E_LF";
  const fittingHasLooseOutletFlange = config === "F2E_LF";
  const fittingHasRotatingInletFlange = ["F2E_RF", "3X_RF", "2X_RF_FOE"].includes(config);
  const fittingHasRotatingOutletFlange = ["F2E_RF", "3X_RF", "2X_RF_FOE"].includes(config);
  const fittingHasRotatingBranchFlange = config === "3X_RF";

  const closureLength = (closureLengthMm || 150) / SCALE;
  const gapLength = 100 / SCALE;

  const { specs: flangeSpecs } = resolveFlangeData(nominalBore, props.flangeSpecs);
  const flangeThickScaled = (flangeSpecs.flangeOD / 2 / SCALE) * 0.18;
  const flangeOffset = (flangeThickScaled / 2) * 0.8;

  const weldTube = outerR * 0.05;
  const isSegmentedBend = numberOfSegments !== undefined && numberOfSegments > 1;

  const inletStart = new THREE.Vector3(0, 0, 0);
  const inletEnd = new THREE.Vector3(0, 0, t1);
  const inletDir = new THREE.Vector3(0, 0, 1);

  const bendCenter = new THREE.Vector3(-bendR, 0, t1);
  const bendStartAngle = 0;
  const bendEndAngle = angleRad;

  const bendEndPoint = new THREE.Vector3(
    bendCenter.x + bendR * Math.cos(bendEndAngle),
    0,
    bendCenter.z + bendR * Math.sin(bendEndAngle),
  );

  const outletDir = new THREE.Vector3(-Math.sin(angleRad), 0, Math.cos(angleRad));
  const outletEnd = bendEndPoint.clone().add(outletDir.clone().multiplyScalar(t2));

  const stubsData = useMemo(() => {
    return stubs
      .filter((s) => s.locationFromFlange != null && s.length != null && s.nominalBoreMm != null)
      .map((s) => {
        const sOd = nbToOd(s.nominalBoreMm!);
        const sWt = calculateVisualWallThickness(sOd, wtMm * 0.8);
        const distFromFlange = s.locationFromFlange! / SCALE;

        const rawOrientation = s.orientation;
        const rawAngleDegrees = s.angleDegrees;
        const rawTangent = s.tangent;

        return {
          distFromFlange,
          outerR: sOd / SCALE / 2,
          innerR: (sOd - 2 * sWt) / SCALE / 2,
          length: s.length! / SCALE,
          nb: s.nominalBoreMm!,
          orientation: rawOrientation || "outside",
          angleDegrees: rawAngleDegrees || 0,
          tangent: rawTangent || 1,
        };
      });
  }, [stubs, wtMm]);

  const isDuckfoot = bendItemType === "DUCKFOOT_BEND";
  const isSweepTee = bendItemType === "SWEEP_TEE";
  const isSBend = bendItemType === "S_BEND";
  const defaultPipeALengthMm = nominalBore * 3;
  const effectivePipeALengthMm = sweepTeePipeALengthMm || (isSweepTee ? defaultPipeALengthMm : 0);
  const pipeALength = effectivePipeALengthMm / SCALE;
  const bendTiltZ = 0.0;
  const duckfootRotation: [number, number, number] = isDuckfoot
    ? [-Math.PI / 2, Math.PI, -Math.PI + bendTiltZ]
    : [0, 0, 0];

  // Duckfoot geometry calculations based on actual bend dimensions
  // After rotation, the 90° bend sits with inlet horizontal and outlet vertical
  // The extrados at 45° (midpoint) is the reference for steelwork positioning
  const extradosR = bendR + outerR;
  // 45 degrees - midpoint of the 90° bend
  const midAngle = Math.PI / 4;
  // At 45°, the extrados point in rotated coordinates:
  // X offset: how far from origin the midpoint of the bend is horizontally
  const duckfootExtradosMidX = -extradosR * Math.sin(midAngle);
  // Y offset: height of extrados at 45° relative to bend center
  const duckfootExtradosMidY = bendR - extradosR * Math.cos(midAngle);

  // Position the bend group so the base plate sits at y=0 (ground level)
  // The base plate top should be where the steelwork meets the gussets
  const duckfootXOffset = isDuckfoot ? duckfootExtradosMidX : 0;
  const duckfootYOffset = isDuckfoot ? duckfootExtradosMidY : 0;
  const bendPositionAdjustY = isDuckfoot ? outerR * 0.5 : 0;
  const bendPositionAdjustZ = isDuckfoot ? -outerR * 0.8 : 0;

  return (
    <Center>
      <group
        rotation={duckfootRotation}
        position={[duckfootXOffset, duckfootYOffset + bendPositionAdjustY, bendPositionAdjustZ]}
      >
        {/* Inlet tangent section - hide for sweep tees, S-bends, and duckfoot bends */}
        {t1 > 0 && !isSweepTee && !isSBend && !isDuckfoot && (
          <>
            <HollowStraightPipe
              start={inletStart}
              end={inletEnd}
              outerR={outerR}
              innerR={innerR}
              capStart={!hasInletFlange}
              capEnd={false}
            />
            {!isSegmentedBend && (
              <WeldRing
                center={inletEnd}
                normal={inletDir}
                radius={outerR * 1.02}
                tube={weldTube}
              />
            )}
          </>
        )}

        {/* Standard bend - hide for sweep tees and S-bends which have their own geometry */}
        {!isSweepTee && !isSBend && (
          <HollowBendPipe
            bendCenter={bendCenter}
            bendRadius={bendR}
            startAngle={bendStartAngle}
            endAngle={bendEndAngle}
            outerR={outerR}
            innerR={innerR}
          />
        )}

        {/* Degree markers on extrados (outside radius) every 5 degrees - for duckfoot bends */}
        {isDuckfoot &&
          Array.from({ length: 19 }).map((_, i) => {
            const degrees = i * 5;
            const markerAngleRad = (degrees * Math.PI) / 180;

            if (markerAngleRad > angleRad) return null;

            const tickInnerR = bendR + outerR * 1.05;
            const tickOuterR = bendR + outerR * 1.25;
            const textR = bendR + outerR * 1.45;

            const tickInnerPos = new THREE.Vector3(
              bendCenter.x + tickInnerR * Math.cos(markerAngleRad),
              0,
              bendCenter.z + tickInnerR * Math.sin(markerAngleRad),
            );
            const tickOuterPos = new THREE.Vector3(
              bendCenter.x + tickOuterR * Math.cos(markerAngleRad),
              0,
              bendCenter.z + tickOuterR * Math.sin(markerAngleRad),
            );
            const textPos = new THREE.Vector3(
              bendCenter.x + textR * Math.cos(markerAngleRad),
              0,
              bendCenter.z + textR * Math.sin(markerAngleRad),
            );

            // Display inverted: 0° at inlet (bottom), 90° at outlet (top)
            const displayDegrees = 90 - degrees;

            return (
              <group key={`deg-${degrees}`}>
                <Line
                  points={[
                    [tickInnerPos.x, tickInnerPos.y, tickInnerPos.z],
                    [tickOuterPos.x, tickOuterPos.y, tickOuterPos.z],
                  ]}
                  color="#cc0000"
                  lineWidth={3}
                />
                <Text
                  position={[textPos.x, textPos.y, textPos.z]}
                  fontSize={0.18}
                  color="#cc0000"
                  anchorX="center"
                  anchorY="middle"
                  fontWeight="bold"
                  rotation={[Math.PI / 2, 0, markerAngleRad + Math.PI]}
                >
                  {displayDegrees}°
                </Text>
              </group>
            );
          })}

        {/* Segment welds - hide for sweep tees and S-bends */}
        {!isSweepTee &&
          !isSBend &&
          numberOfSegments &&
          numberOfSegments > 1 &&
          Array.from({ length: numberOfSegments - 1 }).map((_, i) => {
            const segAngle = angleRad / numberOfSegments;
            const weldAngle = (i + 1) * segAngle;
            const weldPos = new THREE.Vector3(
              bendCenter.x + bendR * Math.cos(weldAngle),
              0,
              bendCenter.z + bendR * Math.sin(weldAngle),
            );
            const tangentDir = new THREE.Vector3(
              -Math.sin(weldAngle),
              0,
              Math.cos(weldAngle),
            ).normalize();

            return (
              <WeldRing
                key={i}
                center={weldPos}
                normal={tangentDir}
                radius={outerR * 1.02}
                tube={weldTube}
              />
            );
          })}

        {/* Outlet weld - hide for sweep tees and S-bends */}
        {!isSweepTee && !isSBend && !isSegmentedBend && (
          <WeldRing
            center={bendEndPoint}
            normal={outletDir}
            radius={outerR * 1.02}
            tube={weldTube}
          />
        )}

        {/* Outlet tangent - hide for sweep tees, S-bends, and duckfoot bends */}
        {!isSweepTee && !isSBend && !isDuckfoot && t2 > 0 && (
          <HollowStraightPipe
            start={bendEndPoint}
            end={outletEnd}
            outerR={outerR}
            innerR={innerR}
            capStart={false}
            capEnd={!hasOutletFlange}
          />
        )}

        {/* ========== SWEEP TEE GEOMETRY ==========
            Based on MPS Technical Manual page 32:
            - Pipe A is the HORIZONTAL main run with FLANGES ON BOTH ENDS
            - The sweep/bend emerges from the TOP of Pipe A (saddle connection)
            - The EXTRADOS (outside of bend curve) connects to Pipe A for smooth material flow
            - The bend curves from horizontal (parallel to Pipe A) to vertical (pointing up)
            - The outlet flange is at the top, pointing straight up */}
        {isSweepTee &&
          (() => {
            const pipeAHalfLength = pipeALength / 2;
            const pipeALeftEnd = new THREE.Vector3(0, 0, -pipeAHalfLength);
            const pipeARightEnd = new THREE.Vector3(0, 0, pipeAHalfLength);

            // Bend geometry calculation:
            // HollowBendPipe creates bends in the XZ plane by default.
            // At angle 0: centerline at (bendR, 0, 0) from center, tangent +Z
            // At angle 90: centerline at (0, 0, bendR) from center, tangent -X
            //
            // We need a bend in the YZ plane: tangent +Z at start, tangent +Y at end
            // Rotating -90° around Z transforms: (x, y, z) → (y, -x, z)
            //
            // For a proper saddle connection where the bend MERGES into Pipe A:
            // - The extrados (outer curve) merges into the top of Pipe A
            // - The bend curves TOWARD the viewer (-Z direction)
            // - Adding 180° Y rotation flips the bend to curve in -Z direction
            //
            // Position the bend at the right end of Pipe A, against the flange
            const bendZOffset = pipeAHalfLength;
            //
            // For -90° Z rotation: local (x, y, z) → world (y, -x, z)
            const localBendCenter = new THREE.Vector3(-bendR, 0, 0);

            // End of bend position in world coordinates:
            // With 180° Y rotation, the bend curves toward -Z, so end is at z = bendZOffset - bendR
            const sweepEndPos = new THREE.Vector3(0, bendR, bendZOffset - bendR);
            const sweepEndDir = new THREE.Vector3(0, 1, 0);

            return (
              <>
                {/* Pipe A - horizontal main run along Z axis */}
                <HollowStraightPipe
                  start={pipeALeftEnd}
                  end={pipeARightEnd}
                  outerR={outerR}
                  innerR={innerR}
                  capStart={!fittingHasInletFlange}
                  capEnd={!fittingHasOutletFlange}
                />

                {/* Left flange on Pipe A (inlet) */}
                {fittingHasInletFlange &&
                  (fittingHasLooseInletFlange ? (
                    <>
                      {/* Black closure piece connected directly to pipe end */}
                      <mesh
                        position={[0, 0, -pipeAHalfLength - closureLength / 2]}
                        rotation={[Math.PI / 2, 0, 0]}
                      >
                        <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                        <meshStandardMaterial
                          color="#2a2a2a"
                          metalness={0.6}
                          roughness={0.6}
                          envMapIntensity={0.5}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                      <mesh
                        position={[0, 0, -pipeAHalfLength - closureLength / 2]}
                        rotation={[Math.PI / 2, 0, 0]}
                      >
                        <cylinderGeometry
                          args={[innerR, innerR, closureLength + 0.01, 32, 1, true]}
                        />
                        <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                      </mesh>
                      <Flange
                        center={
                          new THREE.Vector3(0, 0, -pipeAHalfLength - closureLength - gapLength)
                        }
                        normal={new THREE.Vector3(0, 0, -1)}
                        pipeR={outerR}
                        innerR={innerR}
                        nb={nominalBore}
                      />
                    </>
                  ) : fittingHasRotatingInletFlange ? (
                    <>
                      <RetainingRing
                        center={pipeALeftEnd}
                        normal={new THREE.Vector3(0, 0, -1)}
                        pipeR={outerR}
                        innerR={innerR}
                        wallThickness={wtScaled}
                      />
                      <RotatingFlange
                        center={pipeALeftEnd
                          .clone()
                          .add(new THREE.Vector3(0, 0, rotatingFlangeOffset))}
                        normal={new THREE.Vector3(0, 0, -1)}
                        pipeR={outerR}
                        innerR={innerR}
                        nb={nominalBore}
                      />
                    </>
                  ) : (
                    <Flange
                      center={pipeALeftEnd.clone().add(new THREE.Vector3(0, 0, -flangeOffset))}
                      normal={new THREE.Vector3(0, 0, -1)}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  ))}

                {/* Right flange on Pipe A (outlet) */}
                {fittingHasOutletFlange &&
                  (fittingHasLooseOutletFlange ? (
                    <>
                      {/* Black closure piece connected directly to pipe end */}
                      <mesh
                        position={[0, 0, pipeAHalfLength + closureLength / 2]}
                        rotation={[Math.PI / 2, 0, 0]}
                      >
                        <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                        <meshStandardMaterial
                          color="#2a2a2a"
                          metalness={0.6}
                          roughness={0.6}
                          envMapIntensity={0.5}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                      <mesh
                        position={[0, 0, pipeAHalfLength + closureLength / 2]}
                        rotation={[Math.PI / 2, 0, 0]}
                      >
                        <cylinderGeometry
                          args={[innerR, innerR, closureLength + 0.01, 32, 1, true]}
                        />
                        <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                      </mesh>
                      <Flange
                        center={
                          new THREE.Vector3(0, 0, pipeAHalfLength + closureLength + gapLength)
                        }
                        normal={new THREE.Vector3(0, 0, 1)}
                        pipeR={outerR}
                        innerR={innerR}
                        nb={nominalBore}
                      />
                    </>
                  ) : fittingHasRotatingOutletFlange ? (
                    <>
                      <RetainingRing
                        center={pipeARightEnd}
                        normal={new THREE.Vector3(0, 0, 1)}
                        pipeR={outerR}
                        innerR={innerR}
                        wallThickness={wtScaled}
                      />
                      <RotatingFlange
                        center={pipeARightEnd
                          .clone()
                          .add(new THREE.Vector3(0, 0, -rotatingFlangeOffset))}
                        normal={new THREE.Vector3(0, 0, 1)}
                        pipeR={outerR}
                        innerR={innerR}
                        nb={nominalBore}
                      />
                    </>
                  ) : (
                    <Flange
                      center={pipeARightEnd.clone().add(new THREE.Vector3(0, 0, flangeOffset))}
                      normal={new THREE.Vector3(0, 0, 1)}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  ))}

                {/* Sweep branch - 90° bend with extrados connecting to top of Pipe A */}
                {/* Position shifts bend right, 180° Y flips to curve toward viewer, -90° Z puts in YZ plane */}
                <group position={[0, 0, bendZOffset]} rotation={[0, Math.PI, -Math.PI / 2]}>
                  {isSegmented && numberOfSegments && numberOfSegments > 1 ? (
                    <SegmentedBendPipe
                      bendCenter={localBendCenter}
                      bendRadius={bendR}
                      startAngle={0}
                      endAngle={Math.PI / 2}
                      outerR={outerR}
                      innerR={innerR}
                      numberOfSegments={numberOfSegments}
                    />
                  ) : (
                    <HollowBendPipe
                      bendCenter={localBendCenter}
                      bendRadius={bendR}
                      startAngle={0}
                      endAngle={Math.PI / 2}
                      outerR={outerR}
                      innerR={innerR}
                    />
                  )}
                </group>

                {/* Branch flange at top of sweep - pointing straight up */}
                {fittingHasBranchFlange &&
                  (fittingHasRotatingBranchFlange ? (
                    <>
                      <RetainingRing
                        center={sweepEndPos}
                        normal={sweepEndDir}
                        pipeR={outerR}
                        innerR={innerR}
                        wallThickness={wtScaled}
                      />
                      <RotatingFlange
                        center={sweepEndPos
                          .clone()
                          .sub(sweepEndDir.clone().multiplyScalar(rotatingFlangeOffset))}
                        normal={sweepEndDir}
                        pipeR={outerR}
                        innerR={innerR}
                        nb={nominalBore}
                      />
                    </>
                  ) : (
                    <Flange
                      center={sweepEndPos
                        .clone()
                        .add(sweepEndDir.clone().multiplyScalar(flangeOffset))}
                      normal={sweepEndDir}
                      pipeR={outerR}
                      innerR={innerR}
                      nb={nominalBore}
                    />
                  ))}

                {/* Saddle weld at junction where sweep bend meets Pipe A
                  The Steinmetz curve weld wraps around the intersection where the bend
                  emerges from the top of Pipe A. Position at z=bendZOffset where the
                  bend joins, rotate 90° around Y so the curve wraps around Pipe A (Z axis). */}
                <group position={[0, outerR, bendZOffset]} rotation={[-Math.PI / 2, 0, 0]}>
                  <SaddleWeld
                    stubRadius={outerR}
                    mainPipeRadius={outerR}
                    useXAxis={false}
                    tube={weldTube}
                  />
                </group>

                {/* Dimension line for Pipe A length (B dimension in MPS table) */}
                <DimensionLine
                  start={pipeALeftEnd}
                  end={pipeARightEnd}
                  label={`B: ${effectivePipeALengthMm}mm`}
                  offset={outerR * 2.5}
                  color="#009900"
                />

                {/* Dimension lines - L-shape with horizontal at top and vertical on right */}
                {(() => {
                  const cfValue = centerToFaceMm || Math.round(bendR * SCALE);
                  const cfScaled = cfValue / SCALE;
                  const aLineZ = pipeAHalfLength + outerR * 1.2;
                  const aLineBottom = 0;
                  const aLineTop = cfScaled;
                  const cornerPos: [number, number, number] = [0, aLineBottom, aLineZ];
                  const arcRadius = 30;
                  const sweepAngleRad = Math.PI / 2;

                  return (
                    <>
                      {/* Horizontal line at top (from left flange to corner) */}
                      <Line
                        points={[
                          [0, aLineTop, -pipeAHalfLength],
                          [0, aLineTop, aLineZ],
                        ]}
                        color="#cc6600"
                        lineWidth={3}
                      />
                      {/* Vertical line on right (from corner to top) */}
                      <Line
                        points={[
                          [0, aLineBottom, aLineZ],
                          [0, aLineTop, aLineZ],
                        ]}
                        color="#cc6600"
                        lineWidth={3}
                      />
                      {/* C/F label on horizontal line */}
                      <Text
                        position={[outerR * 0.3, aLineTop, 0]}
                        fontSize={outerR * 0.35}
                        color="#cc6600"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        rotation={[0, -Math.PI / 2, 0]}
                      >
                        {`C/F: ${cfValue}mm`}
                      </Text>
                      {/* 3D 90° angle arc at corner */}
                      <AngularDimension
                        center={new THREE.Vector3(0, 0, aLineZ)}
                        radius={outerR * 0.8}
                        startAngle={0}
                        endAngle={Math.PI / 2}
                        plane="yz"
                        color="#cc6600"
                        fontSize={outerR * 0.4}
                        showArrows={false}
                        textRotation={[0, -Math.PI / 2, 0]}
                      />
                    </>
                  );
                })()}
              </>
            );
          })()}

        {/* S-Bend: two 90° butt-welded bends, dimensioned with R/2R triangle */}
        {isSBend && (
          <SBendGeometry
            bendR={bendR}
            outerR={outerR}
            innerR={innerR}
            weldTube={weldTube}
            hasInletFlange={hasInletFlange}
            hasOutletFlange={hasOutletFlange}
            hasLooseInletFlange={hasLooseInletFlange}
            hasLooseOutletFlange={hasLooseOutletFlange}
            hasRotatingInletFlange={hasRotatingInletFlange}
            hasRotatingOutletFlange={hasRotatingOutletFlange}
            closureLength={closureLength}
            gapLength={gapLength}
            flangeOffset={flangeOffset}
            wtScaled={wtScaled}
            rotatingFlangeOffset={rotatingFlangeOffset}
            nominalBore={nominalBore}
            closureLengthMm={closureLengthMm}
          />
        )}

        {/* Standard bend dimension lines (T1, T2, C/F + arc) — hide for sweep tees and S-bends */}
        {!isSweepTee && !isSBend && (
          <BendDimensions
            centerToFaceMm={centerToFaceMm}
            angleRad={angleRad}
            inletEnd={inletEnd}
            outletEnd={outletEnd}
            bendEndPoint={bendEndPoint}
            bendCenter={bendCenter}
            t1={t1}
            t2={t2}
            outerR={outerR}
            tangent1={tangent1}
            tangent2={tangent2}
            isDuckfoot={isDuckfoot}
          />
        )}

        {/* Stubs - hide for duckfoot bends and sweep tees (sweep tees have their own branch) */}
        {!isDuckfoot &&
          !isSweepTee &&
          stubsData.map((stub, i) => {
            const isOutletStub = stub.tangent === 2;
            const tangentLength = isOutletStub ? t2 : t1;

            if (tangentLength <= 0) return null;

            const tangentStart = isOutletStub ? bendEndPoint : inletStart;
            const tangentDir = isOutletStub ? outletDir : inletDir;
            const stubCenterOnAxis = tangentStart
              .clone()
              .add(tangentDir.clone().multiplyScalar(stub.distFromFlange));

            const orientationDir = (() => {
              const angleRad = ((stub.angleDegrees + 90) * Math.PI) / 180;

              const globalDown = new THREE.Vector3(0, -1, 0);
              const tangentDotDown = tangentDir.dot(globalDown);
              const tangentComponent = tangentDir.clone().multiplyScalar(tangentDotDown);
              const perpDown = globalDown.clone().sub(tangentComponent);

              if (perpDown.length() < 0.01) {
                perpDown.set(-1, 0, 0);
              } else {
                perpDown.normalize();
              }

              const perpHorizontal = new THREE.Vector3()
                .crossVectors(tangentDir, perpDown)
                .normalize();

              if (perpHorizontal.length() < 0.01) {
                perpHorizontal.set(1, 0, 0);
              }

              const rotatedDir = perpDown
                .clone()
                .multiplyScalar(Math.cos(angleRad))
                .add(perpHorizontal.clone().multiplyScalar(Math.sin(angleRad)))
                .normalize();

              return rotatedDir;
            })();

            const stubEnd = stubCenterOnAxis
              .clone()
              .add(orientationDir.clone().multiplyScalar(stub.length));
            const distFromFlangeScaled = stub.distFromFlange;
            const stubLengthMm = Math.round(stub.length * SCALE);
            const distFromFlangeMm = Math.round(distFromFlangeScaled * SCALE);

            const weldPoint = stubCenterOnAxis.clone();
            const flangePoint = stubEnd.clone();

            const stubRightOffset = new THREE.Vector3(stub.outerR + 0.05, 0, 0);
            const dimLineWeld = weldPoint.clone().add(stubRightOffset);
            const dimLineFlange = flangePoint.clone().add(stubRightOffset);

            const distLineY = weldPoint.y - outerR * 3;
            const distLineStart = new THREE.Vector3(tangentStart.x, distLineY, tangentStart.z);
            const distLineEnd = new THREE.Vector3(weldPoint.x, distLineY, weldPoint.z);

            const dimOffsetAmount = stub.outerR + outerR * 0.5;
            const stubLengthDimOffset = isOutletStub
              ? new THREE.Vector3(-tangentDir.z, 0, tangentDir.x)
                  .normalize()
                  .multiplyScalar(dimOffsetAmount)
              : new THREE.Vector3(-dimOffsetAmount, 0, 0);

            return (
              <group key={i}>
                <StubPipe
                  baseCenter={stubCenterOnAxis}
                  direction={orientationDir}
                  length={stub.length}
                  outerR={stub.outerR}
                  innerR={stub.innerR}
                  mainPipeOuterR={outerR}
                  mainPipeDirection={tangentDir}
                  stubAngleDegrees={stub.angleDegrees}
                  nb={stub.nb}
                />

                {/* Green L-bracket dimension for stub distance from flange */}
                {(() => {
                  const flangeEnd = isOutletStub ? outletEnd : inletStart;
                  const leftOffset = isOutletStub
                    ? new THREE.Vector3(-tangentDir.z, 0, tangentDir.x)
                        .normalize()
                        .multiplyScalar(-outerR * 1.5)
                    : new THREE.Vector3(-outerR * 1.5, 0, 0);
                  const dimLeftX = stubCenterOnAxis.x + leftOffset.x;
                  const dimLeftZ = stubCenterOnAxis.z + leftOffset.z;
                  const flangeLeftX = flangeEnd.x + leftOffset.x;
                  const flangeLeftZ = flangeEnd.z + leftOffset.z;
                  const bottomY = stubEnd.y - outerR * 0.5;

                  return (
                    <>
                      {/* Vertical line on left side of stub */}
                      <Line
                        points={[
                          [dimLeftX, stubCenterOnAxis.y, dimLeftZ],
                          [dimLeftX, bottomY, dimLeftZ],
                        ]}
                        color="#009900"
                        lineWidth={3}
                      />
                      {/* Horizontal line at bottom */}
                      <Line
                        points={[
                          [flangeLeftX, bottomY, flangeLeftZ],
                          [dimLeftX, bottomY, dimLeftZ],
                        ]}
                        color="#009900"
                        lineWidth={3}
                      />
                      {/* Vertical line from flange */}
                      <Line
                        points={[
                          [flangeLeftX, flangeEnd.y, flangeLeftZ],
                          [flangeLeftX, bottomY, flangeLeftZ],
                        ]}
                        color="#009900"
                        lineWidth={3}
                      />
                      {/* Upright text - distance from flange */}
                      <Text
                        position={[
                          dimLeftX - outerR * 0.3,
                          stubCenterOnAxis.y + outerR * 0.3,
                          dimLeftZ,
                        ]}
                        fontSize={0.18}
                        color="#009900"
                        anchorX="right"
                        anchorY="bottom"
                        fontWeight="bold"
                        rotation={[
                          0,
                          isOutletStub ? Math.atan2(leftOffset.x, leftOffset.z) + Math.PI : Math.PI,
                          0,
                        ]}
                      >
                        {`${distFromFlangeMm}mm`}
                      </Text>
                    </>
                  );
                })()}

                {/* Purple dimension for stub length */}
                {(() => {
                  const rightOffset = isOutletStub
                    ? new THREE.Vector3(-tangentDir.z, 0, tangentDir.x)
                        .normalize()
                        .multiplyScalar(outerR * 1.5)
                    : new THREE.Vector3(outerR * 1.5, 0, 0);
                  const dimRightX = stubCenterOnAxis.x + rightOffset.x;
                  const dimRightZ = stubCenterOnAxis.z + rightOffset.z;

                  return (
                    <>
                      {/* Vertical line beside stub */}
                      <Line
                        points={[
                          [dimRightX, stubCenterOnAxis.y, dimRightZ],
                          [dimRightX, stubEnd.y, dimRightZ],
                        ]}
                        color="#990099"
                        lineWidth={3}
                      />
                      {/* Horizontal connector at top */}
                      <Line
                        points={[
                          [stubCenterOnAxis.x, stubCenterOnAxis.y, stubCenterOnAxis.z],
                          [dimRightX, stubCenterOnAxis.y, dimRightZ],
                        ]}
                        color="#990099"
                        lineWidth={2}
                        dashed
                        dashSize={0.03}
                        gapSize={0.02}
                      />
                      {/* Horizontal connector at bottom */}
                      <Line
                        points={[
                          [stubEnd.x, stubEnd.y, stubEnd.z],
                          [dimRightX, stubEnd.y, dimRightZ],
                        ]}
                        color="#990099"
                        lineWidth={2}
                        dashed
                        dashSize={0.03}
                        gapSize={0.02}
                      />
                      {/* Upright text - stub length */}
                      <Text
                        position={[
                          dimRightX + rightOffset.x * 0.3,
                          (stubCenterOnAxis.y + stubEnd.y) / 2,
                          dimRightZ + rightOffset.z * 0.3,
                        ]}
                        fontSize={0.18}
                        color="#990099"
                        anchorX="left"
                        anchorY="middle"
                        fontWeight="bold"
                        rotation={[
                          0,
                          isOutletStub ? Math.atan2(rightOffset.x, rightOffset.z) : 0,
                          0,
                        ]}
                      >
                        {`${stubLengthMm}mm`}
                      </Text>
                    </>
                  );
                })()}
              </group>
            );
          })}

        {/* Inlet flange - hide for sweep tees (which have their own flanges) and S-bends (plain ends only) */}
        {hasInletFlange &&
          !isSweepTee &&
          !isSBend &&
          (() => {
            const inletFlangeZ = isDuckfoot ? t1 - flangeOffset : -flangeOffset;
            const inletFlangeCenter = new THREE.Vector3(0, 0, inletFlangeZ);
            const inletFlangeNormal = new THREE.Vector3(0, 0, -1);

            return hasLooseInletFlange ? (
              <>
                {/* Black closure piece connected directly to pipe end */}
                <mesh position={[0, 0, -closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                  <meshStandardMaterial
                    color="#2a2a2a"
                    metalness={0.6}
                    roughness={0.6}
                    envMapIntensity={0.5}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                <mesh position={[0, 0, -closureLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[innerR, innerR, closureLength + 0.01, 32, 1, true]} />
                  <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                </mesh>
                {/* Loose flange positioned after closure + 100mm gap */}
                <Flange
                  center={new THREE.Vector3(0, 0, -closureLength - gapLength)}
                  normal={new THREE.Vector3(0, 0, -1)}
                  pipeR={outerR}
                  innerR={innerR}
                  nb={nominalBore}
                />
                {/* L/F dimension lines - at bottom of pipe */}
                {(() => {
                  const dimX = -outerR - outerR * 0.3;
                  const dimXOuter = -outerR - outerR * 0.8;
                  const extGap = 0.02;
                  const extOvershoot = 0.04;
                  const arrowLen = Math.min(0.08, closureLength * 0.1);
                  const arrowWidth = arrowLen * 0.4;
                  return (
                    <>
                      {/* Extension lines - solid with gap and overshoot per ISO standards */}
                      <Line
                        points={[
                          [dimX + extGap, 0, 0],
                          [dimXOuter - extOvershoot, 0, 0],
                        ]}
                        color="#cc6600"
                        lineWidth={1.5}
                      />
                      <Line
                        points={[
                          [dimX + extGap, 0, -closureLength],
                          [dimXOuter - extOvershoot, 0, -closureLength],
                        ]}
                        color="#cc6600"
                        lineWidth={1.5}
                      />
                      {/* Dimension line connecting */}
                      <Line
                        points={[
                          [dimXOuter, 0, 0],
                          [dimXOuter, 0, -closureLength],
                        ]}
                        color="#cc6600"
                        lineWidth={2}
                      />
                      {/* Arrow heads - proportional */}
                      <Line
                        points={[
                          [dimXOuter + arrowWidth, 0, -arrowLen],
                          [dimXOuter, 0, 0],
                          [dimXOuter - arrowWidth, 0, -arrowLen],
                        ]}
                        color="#cc6600"
                        lineWidth={2}
                      />
                      <Line
                        points={[
                          [dimXOuter + arrowWidth, 0, -closureLength + arrowLen],
                          [dimXOuter, 0, -closureLength],
                          [dimXOuter - arrowWidth, 0, -closureLength + arrowLen],
                        ]}
                        color="#cc6600"
                        lineWidth={2}
                      />
                      {/* Closure length text - large font, rotated to align with pipe */}
                      <Text
                        position={[dimXOuter - outerR * 0.3, 0, -closureLength / 2]}
                        fontSize={Math.max(0.12, outerR * 0.4)}
                        color="#cc6600"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        rotation={[-Math.PI / 2, Math.PI, -Math.PI / 2]}
                      >
                        {`${closureLengthMm || 150}mm`}
                      </Text>
                    </>
                  );
                })()}
              </>
            ) : hasRotatingInletFlange ? (
              <>
                {/* Retaining ring welded to pipe end */}
                <RetainingRing
                  center={new THREE.Vector3(0, 0, 0)}
                  normal={new THREE.Vector3(0, 0, -1)}
                  pipeR={outerR}
                  innerR={innerR}
                  wallThickness={wtScaled}
                />
                {/* Rotating flange positioned 80mm back from ring (into the pipe) */}
                <RotatingFlange
                  center={new THREE.Vector3(0, 0, rotatingFlangeOffset)}
                  normal={new THREE.Vector3(0, 0, -1)}
                  pipeR={outerR}
                  innerR={innerR}
                  nb={nominalBore}
                />
                {/* R/F dimension line */}
                <Line
                  points={[
                    [0, -outerR - 0.15, 0],
                    [0, -outerR - 0.15, rotatingFlangeOffset],
                  ]}
                  color="#ea580c"
                  lineWidth={2}
                />
                <Line
                  points={[
                    [0, -outerR - 0.1, 0],
                    [0, -outerR - 0.2, 0],
                  ]}
                  color="#ea580c"
                  lineWidth={1}
                />
                <Line
                  points={[
                    [0, -outerR - 0.1, rotatingFlangeOffset],
                    [0, -outerR - 0.2, rotatingFlangeOffset],
                  ]}
                  color="#ea580c"
                  lineWidth={1}
                />
                <Text
                  position={[0, -outerR - 0.28, rotatingFlangeOffset / 2]}
                  fontSize={0.12}
                  color="#ea580c"
                  anchorX="center"
                  anchorY="top"
                >
                  R/F
                </Text>
              </>
            ) : (
              <Flange
                center={inletFlangeCenter}
                normal={inletFlangeNormal}
                pipeR={outerR}
                innerR={innerR}
                nb={nominalBore}
              />
            );
          })()}

        {/* Outlet flange - hide for sweep tees (which have their own flanges) and S-bends (plain ends only) */}
        {hasOutletFlange &&
          !isSweepTee &&
          !isSBend &&
          (() => {
            const outletBase = isDuckfoot ? bendEndPoint : t2 > 0 ? outletEnd : bendEndPoint;
            const outletFlangePos = outletBase
              .clone()
              .add(outletDir.clone().multiplyScalar(flangeOffset));

            return hasLooseOutletFlange ? (
              <>
                {/* Black closure piece connected directly to pipe end */}
                {(() => {
                  const closureCenterPos = outletBase
                    .clone()
                    .add(outletDir.clone().multiplyScalar(closureLength / 2));
                  const quaternion = new THREE.Quaternion();
                  quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    outletDir.clone().normalize(),
                  );
                  const euler = new THREE.Euler().setFromQuaternion(quaternion);
                  return (
                    <>
                      <mesh
                        position={closureCenterPos.toArray()}
                        rotation={[euler.x, euler.y, euler.z]}
                      >
                        <cylinderGeometry args={[outerR, outerR, closureLength, 32, 1, true]} />
                        <meshStandardMaterial
                          color="#2a2a2a"
                          metalness={0.6}
                          roughness={0.6}
                          envMapIntensity={0.5}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                      <mesh
                        position={closureCenterPos.toArray()}
                        rotation={[euler.x, euler.y, euler.z]}
                      >
                        <cylinderGeometry
                          args={[innerR, innerR, closureLength + 0.01, 32, 1, true]}
                        />
                        <meshStandardMaterial color="#333333" side={THREE.BackSide} />
                      </mesh>
                    </>
                  );
                })()}
                {/* Loose flange positioned after closure + 100mm gap */}
                <Flange
                  center={outletBase
                    .clone()
                    .add(outletDir.clone().multiplyScalar(closureLength + gapLength))}
                  normal={outletDir}
                  pipeR={outerR}
                  innerR={innerR}
                  nb={nominalBore}
                />
                {/* L/F dimension lines for outlet closure - C2 */}
                {(() => {
                  const perpDir = new THREE.Vector3(-outletDir.z, 0, outletDir.x).normalize();
                  const dimOffset = outerR + outerR * 0.3;
                  const dimOffsetOuter = outerR + outerR * 0.8;
                  const closureEnd = outletBase
                    .clone()
                    .add(outletDir.clone().multiplyScalar(closureLength));
                  return (
                    <>
                      {/* Extension line from pipe end */}
                      <Line
                        points={[
                          [
                            outletBase.x + perpDir.x * dimOffset,
                            outletBase.y,
                            outletBase.z + perpDir.z * dimOffset,
                          ],
                          [
                            outletBase.x + perpDir.x * dimOffsetOuter,
                            outletBase.y,
                            outletBase.z + perpDir.z * dimOffsetOuter,
                          ],
                        ]}
                        color="#cc6600"
                        lineWidth={2}
                      />
                      {/* Extension line from closure end */}
                      <Line
                        points={[
                          [
                            closureEnd.x + perpDir.x * dimOffset,
                            closureEnd.y,
                            closureEnd.z + perpDir.z * dimOffset,
                          ],
                          [
                            closureEnd.x + perpDir.x * dimOffsetOuter,
                            closureEnd.y,
                            closureEnd.z + perpDir.z * dimOffsetOuter,
                          ],
                        ]}
                        color="#cc6600"
                        lineWidth={2}
                      />
                      {/* Dimension line connecting */}
                      <Line
                        points={[
                          [
                            outletBase.x + perpDir.x * dimOffsetOuter,
                            outletBase.y,
                            outletBase.z + perpDir.z * dimOffsetOuter,
                          ],
                          [
                            closureEnd.x + perpDir.x * dimOffsetOuter,
                            closureEnd.y,
                            closureEnd.z + perpDir.z * dimOffsetOuter,
                          ],
                        ]}
                        color="#cc6600"
                        lineWidth={3}
                      />
                      {/* Closure length text */}
                      <Text
                        position={[
                          (outletBase.x + closureEnd.x) / 2 +
                            perpDir.x * (dimOffsetOuter + outerR * 0.3),
                          0.01,
                          (outletBase.z + closureEnd.z) / 2 +
                            perpDir.z * (dimOffsetOuter + outerR * 0.3),
                        ]}
                        fontSize={outerR * 0.35}
                        color="#cc6600"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        rotation={[-Math.PI / 2, Math.PI, Math.atan2(outletDir.x, outletDir.z)]}
                      >
                        {`${closureLengthMm || 150}mm`}
                      </Text>
                    </>
                  );
                })()}
              </>
            ) : hasRotatingOutletFlange ? (
              <>
                {/* Retaining ring welded to pipe end */}
                <RetainingRing
                  center={outletBase}
                  normal={outletDir}
                  pipeR={outerR}
                  innerR={innerR}
                  wallThickness={wtScaled}
                />
                {/* Rotating flange positioned 80mm back from ring (into the pipe) */}
                <RotatingFlange
                  center={outletBase
                    .clone()
                    .sub(outletDir.clone().multiplyScalar(rotatingFlangeOffset))}
                  normal={outletDir}
                  pipeR={outerR}
                  innerR={innerR}
                  nb={nominalBore}
                />
              </>
            ) : (
              <Flange
                center={outletFlangePos}
                normal={outletDir}
                pipeR={outerR}
                innerR={innerR}
                nb={nominalBore}
              />
            );
          })()}

        {addBlankFlange &&
          blankFlangePositions.includes("inlet") &&
          hasInletFlange &&
          (() => {
            const blankOffset = flangeOffset + flangeThickScaled * 2 + 0.05;
            return (
              <BlankFlange
                center={new THREE.Vector3(0, 0, -blankOffset)}
                normal={new THREE.Vector3(0, 0, -1)}
                pipeR={outerR}
                nb={nominalBore}
              />
            );
          })()}

        {addBlankFlange &&
          blankFlangePositions.includes("outlet") &&
          hasOutletFlange &&
          (() => {
            const blankOffset = flangeOffset + flangeThickScaled * 2 + 0.05;
            const basePoint = t2 > 0 ? outletEnd : bendEndPoint;
            return (
              <BlankFlange
                center={basePoint.clone().add(outletDir.clone().multiplyScalar(blankOffset))}
                normal={outletDir}
                pipeR={outerR}
                nb={nominalBore}
              />
            );
          })()}

        <axesHelper args={[1]} />
      </group>
      {/* Duckfoot Base Plate and Gusset Ribs - OUTSIDE rotation group to stay horizontal */}
      {isDuckfoot && (
        <DuckfootSteelwork
          nominalBore={nominalBore}
          bendR={bendR}
          outerR={outerR}
          wtMm={wtMm}
          duckfootXOffset={duckfootXOffset}
          duckfootYOffset={duckfootYOffset}
          bendPositionAdjustY={bendPositionAdjustY}
          bendPositionAdjustZ={bendPositionAdjustZ}
          duckfootBasePlateXMm={duckfootBasePlateXMm}
          duckfootBasePlateYMm={duckfootBasePlateYMm}
          duckfootPlateThicknessT1Mm={duckfootPlateThicknessT1Mm}
          duckfootRibThicknessT2Mm={duckfootRibThicknessT2Mm}
          duckfootInletCentreHeightMm={duckfootInletCentreHeightMm}
          duckfootGussetPointDDegrees={duckfootGussetPointDDegrees}
          duckfootGussetPointCDegrees={duckfootGussetPointCDegrees}
          duckfootGussetCount={duckfootGussetCount}
          duckfootGussetPlacement={duckfootGussetPlacement}
          duckfootGussetThicknessMm={duckfootGussetThicknessMm}
          nbToOd={nbToOd}
        />
      )}
    </Center>
  );
};

export default function CSGBend3DPreview(props: Props) {
  const [hidden, setHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(0);
  const [liveCamera, setLiveCamera] = useState<[number, number, number]>([0, 0, 0]);
  const captureRef = useRef<(() => string | null) | null>(null);
  const { nbToOd } = useNbToOdLookup();

  if (hidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border px-3 py-2 flex justify-between">
        <span className="text-sm text-gray-600">3D Preview</span>
        <button onClick={() => setHidden(false)} className="text-xs text-blue-600">
          Show
        </button>
      </div>
    );
  }

  const rawOuterDiameter = props.outerDiameter;

  const odMm = rawOuterDiameter || nbToOd(props.nominalBore);
  const rawBendRadiusMm = props.bendRadiusMm;
  const bendR = (rawBendRadiusMm || props.nominalBore * 1.5) / SCALE;
  const rawTangent1 = props.tangent1;
  const t1 = (rawTangent1 || 0) / SCALE;
  const rawTangent2 = props.tangent2;
  const t2 = (rawTangent2 || 0) / SCALE;
  const angleRad = (props.bendAngle * Math.PI) / 180;
  const isDuckfootBend = props.bendItemType === "DUCKFOOT_BEND";
  const isSweepTee = props.bendItemType === "SWEEP_TEE";
  const isSBend = props.bendItemType === "S_BEND";

  const bendEndX = -bendR + bendR * Math.cos(angleRad);
  const bendEndZ = t1 + bendR * Math.sin(angleRad);
  const outletEndZ = bendEndZ + Math.cos(angleRad) * t2;
  const outletEndX = bendEndX + -Math.sin(angleRad) * t2;

  const minX = Math.min(0, bendEndX, outletEndX, -bendR);
  const maxX = Math.max(0, bendEndX, outletEndX, odMm / SCALE);
  const minZ = Math.min(0, bendEndZ, outletEndZ);
  const maxZ = Math.max(t1, bendEndZ, outletEndZ);

  const boundingWidth = maxX - minX;
  const boundingDepth = maxZ - minZ;
  const diagonalExtent = Math.sqrt(boundingWidth ** 2 + boundingDepth ** 2);

  let autoCameraPosition: [number, number, number];
  let autoCameraTarget: [number, number, number];

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  if (isDuckfootBend) {
    const verticalExtent = boundingDepth + bendR;
    const horizontalExtent = Math.max(boundingWidth, bendR * 2);
    const extent = Math.sqrt(horizontalExtent ** 2 + verticalExtent ** 2);
    const autoCameraDistance = Math.max(extent * 2.5, 6);
    autoCameraPosition = [0.01, -extent * 1.5, autoCameraDistance];
    autoCameraTarget = [centerX, 0, centerZ];
  } else if (isSweepTee) {
    const autoCameraDistance = Math.max(diagonalExtent * 2.5, 6);
    autoCameraPosition = [
      autoCameraDistance * 0.3,
      autoCameraDistance * 1.2,
      autoCameraDistance * 0.3,
    ];
    autoCameraTarget = [centerX, 0, centerZ];
  } else if (isSBend) {
    const sBendExtent = bendR * 2 * Math.sqrt(2);
    const autoCameraDistance = Math.max(sBendExtent * 2.5, 6);
    autoCameraPosition = [
      autoCameraDistance * 0.5,
      autoCameraDistance * 0.6,
      autoCameraDistance * 0.8,
    ];
    autoCameraTarget = [-bendR, 0, bendR];
  } else {
    // Camera positioned for a good default view of the bend (rotated 90° right)
    const autoCameraDistance = Math.max(diagonalExtent * 1.2, 3);
    autoCameraPosition = [
      centerX + autoCameraDistance * 0.8,
      autoCameraDistance * 0.4,
      centerZ - autoCameraDistance * 0.3,
    ];
    autoCameraTarget = [centerX, 0, centerZ];
  }

  // Always use auto camera position for consistent default view
  const cameraPosition = autoCameraPosition;
  const cameraTarget = autoCameraTarget;

  const rawTangent12 = props.tangent1;
  const rawTangent22 = props.tangent2;
  const rawTangent13 = props.tangent1;
  const rawTangent23 = props.tangent2;
  const rawTangent14 = props.tangent1;
  const rawTangent16 = props.tangent1;
  const rawTangent25 = props.tangent2;
  const rawTangent17 = props.tangent1;
  const rawTangent26 = props.tangent2;
  const rawTangent18 = props.tangent1;

  return (
    <div
      data-bend-preview
      className="w-full bg-slate-50 rounded-md border overflow-hidden relative"
      style={{ height: "500px", minHeight: "500px" }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: cameraPosition, fov: 45, near: 0.01, far: 50000 }}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      >
        <SceneShell
          captureRef={captureRef}
          includeShadowMap
          includeRimLight
          scaleGroup={false}
          contactShadows={{ position: [0, -2, 0], opacity: 0.4, scale: 15 }}
          orbitControls={{ enablePan: true, target: cameraTarget }}
        >
          <Scene {...props} />
        </SceneShell>
        <CameraTracker
          label="CSGBend"
          onCameraChange={props.onCameraChange}
          onCameraUpdate={(pos, zoom) => {
            setLiveCamera(pos);
            setCurrentZoom(zoom);
          }}
          savedPosition={props.savedCameraPosition}
          savedTarget={props.savedCameraTarget}
        />
      </Canvas>
      <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded">
        <span className="text-purple-700 font-medium">Hollow Pipe Preview</span>
      </div>
      {props.numberOfSegments &&
        props.numberOfSegments > 1 &&
        (() => {
          const rawBendRadiusMm2 = props.bendRadiusMm;
          const bendRadius = rawBendRadiusMm2 || props.nominalBore * 1.5;
          const degreesPerSeg = props.bendAngle / props.numberOfSegments;
          const arcLengthPerSeg = (bendRadius * Math.PI * degreesPerSeg) / 180;
          const totalArcLength = (bendRadius * Math.PI * props.bendAngle) / 180;
          return (
            <div className="absolute top-10 left-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-orange-200 leading-snug max-w-[180px]">
              <div className="font-bold text-orange-800 mb-0.5">SEGMENTED BEND</div>
              <div className="text-gray-900 font-medium">
                Total: {props.bendAngle}° / {totalArcLength.toFixed(0)}mm arc
              </div>
              <div className="text-gray-700">Segments: {props.numberOfSegments}</div>
              <div className="text-gray-700">Per segment: {degreesPerSeg.toFixed(1)}°</div>
              <div className="text-gray-700">Seg length: {arcLengthPerSeg.toFixed(0)}mm</div>
              <div className="text-orange-700 font-medium mt-0.5">
                Mitre welds: {props.numberOfSegments - 1}
              </div>
            </div>
          );
        })()}
      <div
        data-info-box
        className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-gray-200 leading-snug"
      >
        <div className="font-bold text-blue-800 mb-0.5">BEND</div>
        <div className="text-gray-900 font-medium">
          OD: {odMm.toFixed(0)}mm | ID: {(odMm - 2 * props.wallThickness).toFixed(0)}mm
        </div>
        <div className="text-gray-700">
          WT: {props.wallThickness}mm | {props.bendAngle}°
        </div>
        {props.bendItemType !== "SWEEP_TEE" &&
          props.bendItemType !== "DUCKFOOT_BEND" &&
          ((rawTangent12 || 0) > 0 || (rawTangent22 || 0) > 0) && (
            <div className="text-gray-700">
              {(rawTangent13 || 0) > 0 && (rawTangent23 || 0) > 0
                ? `T1: ${props.tangent1}mm | T2: ${props.tangent2}mm`
                : (rawTangent14 || 0) > 0
                  ? `T1: ${props.tangent1}mm`
                  : `T2: ${props.tangent2}mm`}
            </div>
          )}
        {(() => {
          const rawFlangeConfig = props.flangeConfig;
          const config = (rawFlangeConfig || "PE").toUpperCase();
          const hasLooseInlet = config === "FOE_LF" || config === "2XLF";
          const hasLooseOutlet = config === "2XLF";
          if (!hasLooseInlet && !hasLooseOutlet) return null;
          const rawClosureLengthMm = props.closureLengthMm;
          const closureValue = rawClosureLengthMm || 150;
          return (
            <div className="text-gray-700">
              {hasLooseInlet && hasLooseOutlet
                ? `C1: ${closureValue}mm | C2: ${closureValue}mm`
                : `C1: ${closureValue}mm`}
            </div>
          );
        })()}
        {props.bendItemType === "SWEEP_TEE" && props.sweepTeePipeALengthMm && (
          <div className="text-gray-700">Pipe A: {props.sweepTeePipeALengthMm}mm</div>
        )}
        {props.stubs &&
          props.stubs.length > 0 &&
          props.bendItemType !== "DUCKFOOT_BEND" &&
          props.stubs.some((s) => s.length && s.length > 0) && (
            <div className="text-gray-700">
              Stubs:{" "}
              {props.stubs
                .filter((s) => s.length && s.length > 0)
                .map((stub) => `${stub.length}mm`)
                .join(" | ")}
            </div>
          )}
        {(() => {
          const rawFlangeConfig2 = props.flangeConfig;
          const config = (rawFlangeConfig2 || "PE").toUpperCase();
          const isSweepTee = props.bendItemType === "SWEEP_TEE";
          const validBendFlangeConfigs = ["FBE", "FOE", "FOE_LF", "FOE_RF", "2X_RF", "2XLF"];
          const validFittingFlangeConfigs = [
            "FAE",
            "F2E",
            "F2E_LF",
            "F2E_RF",
            "3X_RF",
            "2X_RF_FOE",
          ];
          const validConfigs = isSweepTee ? validFittingFlangeConfigs : validBendFlangeConfigs;
          const hasValidFlangeConfig = validConfigs.includes(config);
          if (!hasValidFlangeConfig) return null;
          const { specs: flangeSpecs, isFromApi } = resolveFlangeData(
            props.nominalBore,
            props.flangeSpecs,
          );
          const rawFlangeStandardName = props.flangeStandardName;
          const standardName = rawFlangeStandardName || "SABS 1123";
          const isNonSabsStandard =
            !standardName.toLowerCase().includes("sabs") &&
            !standardName.toLowerCase().includes("sans");
          const showFallbackWarning = !isFromApi && isNonSabsStandard;
          return (
            <>
              <div className="font-bold text-blue-800 mt-1 mb-0.5">FLANGE ({config})</div>
              {showFallbackWarning && (
                <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                  Data not available for {standardName} - showing SABS 1123 reference values
                </div>
              )}
              {flangeSpecs && (
                <>
                  <div className="text-gray-900 font-medium">
                    OD: {flangeSpecs.flangeOD}mm | PCD: {flangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {flangeSpecs.boltHoles} × Ø{flangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {flangeSpecs.boltHoles} × M{flangeSpecs.boltSize} ×{" "}
                    {flangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {flangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showFallbackWarning
                        ? "text-orange-600 font-medium"
                        : "text-green-700 font-medium"
                    }
                  >
                    {(() => {
                      const rawPressureClassDesignation = props.pressureClassDesignation;
                      const designation = rawPressureClassDesignation || "";
                      const rawFlangeTypeCode = props.flangeTypeCode;
                      const flangeType = rawFlangeTypeCode || "";
                      const pressureMatch = designation.match(/^(\d+)/);
                      const pressureValue = pressureMatch
                        ? pressureMatch[1]
                        : designation.replace(/\/\d+$/, "");
                      return `${standardName} T${pressureValue}${flangeType}`;
                    })()}
                  </div>
                </>
              )}
            </>
          );
        })()}
        {props.stubs && props.stubs.length > 0 && (
          <div className="text-purple-700 font-medium mt-0.5">{props.stubs.length} stub(s)</div>
        )}
      </div>
      {/* Notes Section - bottom left */}
      {props.selectedNotes && props.selectedNotes.length > 0 && (
        <div className="absolute bottom-2 left-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md border border-slate-200 max-w-[300px] max-h-[120px] overflow-y-auto">
          <div className="font-bold text-slate-700 mb-1">NOTES</div>
          <ol className="list-decimal list-inside space-y-0.5">
            {props.selectedNotes.map((note, i) => (
              <li key={i} className="text-gray-700 leading-tight">
                {note}
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {showDebug && (
          <div className="text-[10px] text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm font-mono">
            z:{currentZoom.toFixed(1)}, cam:[{liveCamera[0].toFixed(1)},{liveCamera[1].toFixed(1)},
            {liveCamera[2].toFixed(1)}], bbox:{boundingWidth.toFixed(1)}x{boundingDepth.toFixed(1)}
          </div>
        )}
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-[10px] text-slate-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-slate-100"
          title={showDebug ? "Hide debug info" : "Show debug info"}
        >
          dbg
        </button>
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] text-blue-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-blue-50 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Expand
        </button>
        <button
          onClick={() => {
            const container = document.querySelector("[data-bend-preview]");
            const infoBox = container?.querySelector("[data-info-box]");

            const dataUrl = captureRef.current ? captureRef.current() : null;
            if (dataUrl && infoBox) {
              const children = Array.from(infoBox.children);
              const sections: { title: string; content: string[] }[] = [];
              let currentSection: { title: string; content: string[] } | null = null;

              children.forEach((child) => {
                const el = child as HTMLElement;
                if (el.classList.contains("font-bold")) {
                  if (currentSection) sections.push(currentSection);
                  currentSection = { title: el.outerHTML, content: [] };
                } else if (currentSection) {
                  currentSection.content.push(el.outerHTML);
                }
              });
              if (currentSection) sections.push(currentSection);

              const midPoint = Math.ceil(sections.length / 2);
              const leftSections = sections.slice(0, midPoint);
              const rightSections = sections.slice(midPoint);

              const renderSections = (secs: typeof sections) =>
                secs.map((s) => `${s.title}${s.content.join("")}`).join("");

              const printWindow = window.open("", "_blank");
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>3D Bend Drawing</title>
                      <style>
                        body { margin: 15px; font-family: Arial, sans-serif; }
                        .drawing-section { width: 100%; margin-bottom: 15px; }
                        .drawing-section img { width: 100%; border: 1px solid #ccc; }
                        .info-container { display: flex; gap: 20px; }
                        .info-column { flex: 1; padding: 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; }
                        .info-column > div { margin-bottom: 3px; }
                        .font-bold { font-weight: bold; margin-top: 8px; }
                        .text-blue-800 { color: #1e40af; }
                        .text-orange-800 { color: #9a3412; }
                        .text-gray-900 { color: #111827; }
                        .text-gray-700 { color: #374151; }
                        .text-green-700 { color: #15803d; }
                        @media print { body { margin: 10px; } }
                      </style>
                    </head>
                    <body>
                      <div class="drawing-section">
                        <img src="${dataUrl}" />
                      </div>
                      <div class="info-container">
                        <div class="info-column">${renderSections(leftSections)}</div>
                        <div class="info-column">${renderSections(rightSections)}</div>
                      </div>
                      <script>
                        window.onload = function() { setTimeout(function() { window.print(); }, 100); };
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }
            }
          }}
          className="text-[10px] text-green-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-green-50 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print
        </button>
        <button
          onClick={() => {
            const bendAngle = props.bendAngle;
            const rawBendRadiusMm3 = props.bendRadiusMm;
            const bendRadius = rawBendRadiusMm3 || props.nominalBore * 1.5;
            const rawOuterDiameter2 = props.outerDiameter;
            const odMm = rawOuterDiameter2 || props.nominalBore * 1.1 + 6;
            const rawTangent15 = props.tangent1;
            const t1 = rawTangent15 || 0;
            const rawTangent24 = props.tangent2;
            const t2 = rawTangent24 || 0;
            const angleRad = (bendAngle * Math.PI) / 180;

            let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
            dxf += "0\nSECTION\n2\nENTITIES\n";

            const outerR = bendRadius + odMm / 2;
            const innerR = bendRadius - odMm / 2;

            dxf += `0\nARC\n8\nBEND_OUTER\n10\n0\n20\n0\n40\n${outerR}\n50\n0\n51\n${bendAngle}\n`;
            dxf += `0\nARC\n8\nBEND_INNER\n10\n0\n20\n0\n40\n${innerR}\n50\n0\n51\n${bendAngle}\n`;

            if (t1 > 0) {
              dxf += `0\nLINE\n8\nTANGENT\n62\n3\n10\n${outerR}\n20\n0\n11\n${outerR + t1}\n21\n0\n`;
              dxf += `0\nLINE\n8\nTANGENT\n62\n3\n10\n${innerR}\n20\n0\n11\n${innerR}\n21\n0\n`;
            }

            const endX = bendRadius - bendRadius * Math.cos(angleRad);
            const endY = bendRadius * Math.sin(angleRad);
            if (t2 > 0) {
              const t2DirX = Math.sin(angleRad);
              const t2DirY = Math.cos(angleRad);
              dxf += `0\nLINE\n8\nTANGENT\n62\n3\n10\n${endX + (outerR - bendRadius) * Math.cos(angleRad + Math.PI / 2)}\n20\n${endY + (outerR - bendRadius) * Math.sin(angleRad + Math.PI / 2)}\n11\n${endX + (outerR - bendRadius) * Math.cos(angleRad + Math.PI / 2) + t2 * t2DirX}\n21\n${endY + (outerR - bendRadius) * Math.sin(angleRad + Math.PI / 2) + t2 * t2DirY}\n`;
            }

            dxf += `0\nTEXT\n8\nDIMENSION\n10\n${bendRadius}\n20\n${-odMm - 30}\n40\n15\n1\n${bendAngle} DEG BEND\n`;
            dxf += `0\nTEXT\n8\nDIMENSION\n10\n${bendRadius}\n20\n${-odMm - 50}\n40\n12\n1\nR${bendRadius}mm | OD${odMm.toFixed(0)}mm\n`;

            dxf += "0\nENDSEC\n0\nEOF\n";

            const blob = new Blob([dxf], { type: "application/dxf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bend_${bendAngle}deg_${props.nominalBore}NB.dxf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="text-[10px] text-orange-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-orange-50 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export DXF
        </button>
        <div className="text-[10px] text-slate-400 bg-white/90 px-2 py-1 rounded shadow-sm">
          Drag to Rotate
        </div>
        <button
          onClick={() => setHidden(true)}
          className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-gray-100 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          Hide
        </button>
      </div>
      {expanded && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-full h-full max-w-[95vw] max-h-[90vh] bg-slate-100 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-4 right-4 z-[10001] bg-white p-2 rounded-full shadow"
            >
              ✕
            </button>
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ position: cameraPosition, fov: 40, near: 0.01, far: 50000 }}
              style={{ width: "100%", height: "100%" }}
            >
              <SceneShell
                includeShadowMap
                includeRimLight
                scaleGroup={false}
                contactShadows={{ position: [0, -2, 0], opacity: 0.4, scale: 15 }}
                orbitControls={{ enablePan: true, target: cameraTarget }}
              >
                <Scene {...props} />
              </SceneShell>
              <CameraTracker
                label="CSGBend"
                onCameraChange={props.onCameraChange}
                onCameraUpdate={(pos, zoom) => {
                  setLiveCamera(pos);
                  setCurrentZoom(zoom);
                }}
                savedPosition={props.savedCameraPosition}
                savedTarget={props.savedCameraTarget}
              />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg">
              <div className="font-bold text-blue-800 mb-1">BEND</div>
              <div className="text-gray-900 font-medium">
                OD: {odMm.toFixed(0)}mm | ID: {(odMm - 2 * props.wallThickness).toFixed(0)}mm
              </div>
              <div className="text-gray-700">
                WT: {props.wallThickness}mm | {props.bendAngle}°
              </div>
              {props.bendItemType !== "SWEEP_TEE" &&
                props.bendItemType !== "DUCKFOOT_BEND" &&
                ((rawTangent16 || 0) > 0 || (rawTangent25 || 0) > 0) && (
                  <div className="text-gray-700">
                    {(rawTangent17 || 0) > 0 && (rawTangent26 || 0) > 0
                      ? `T1: ${props.tangent1}mm | T2: ${props.tangent2}mm`
                      : (rawTangent18 || 0) > 0
                        ? `T1: ${props.tangent1}mm`
                        : `T2: ${props.tangent2}mm`}
                  </div>
                )}
              {(() => {
                const rawFlangeConfig3 = props.flangeConfig;
                const config = (rawFlangeConfig3 || "PE").toUpperCase();
                const hasLooseInlet = config === "FOE_LF" || config === "2XLF";
                const hasLooseOutlet = config === "2XLF";
                if (!hasLooseInlet && !hasLooseOutlet) return null;
                const rawClosureLengthMm2 = props.closureLengthMm;
                const closureValue = rawClosureLengthMm2 || 150;
                return (
                  <div className="text-gray-700">
                    {hasLooseInlet && hasLooseOutlet
                      ? `C1: ${closureValue}mm | C2: ${closureValue}mm`
                      : `C1: ${closureValue}mm`}
                  </div>
                );
              })()}
              {props.bendItemType === "SWEEP_TEE" && props.sweepTeePipeALengthMm && (
                <div className="text-gray-700">Pipe A: {props.sweepTeePipeALengthMm}mm</div>
              )}
              {props.stubs &&
                props.stubs.length > 0 &&
                props.bendItemType !== "DUCKFOOT_BEND" &&
                props.stubs.some((s) => s.length && s.length > 0) && (
                  <div className="text-gray-700">
                    Stubs:{" "}
                    {props.stubs
                      .filter((s) => s.length && s.length > 0)
                      .map((stub) => `${stub.length}mm`)
                      .join(" | ")}
                  </div>
                )}
              {(() => {
                const rawFlangeConfig4 = props.flangeConfig;
                const config = (rawFlangeConfig4 || "PE").toUpperCase();
                const isSweepTee = props.bendItemType === "SWEEP_TEE";
                const validBendFlangeConfigs = ["FBE", "FOE", "FOE_LF", "FOE_RF", "2X_RF", "2XLF"];
                const validFittingFlangeConfigs = [
                  "FAE",
                  "F2E",
                  "F2E_LF",
                  "F2E_RF",
                  "3X_RF",
                  "2X_RF_FOE",
                ];
                const validConfigs = isSweepTee
                  ? validFittingFlangeConfigs
                  : validBendFlangeConfigs;
                const hasValidFlangeConfig = validConfigs.includes(config);
                if (!hasValidFlangeConfig) return null;
                const { specs: flangeSpecs, isFromApi } = resolveFlangeData(
                  props.nominalBore,
                  props.flangeSpecs,
                );
                const rawFlangeStandardName2 = props.flangeStandardName;
                const standardName = rawFlangeStandardName2 || "SABS 1123";
                const isNonSabsStandard =
                  !standardName.toLowerCase().includes("sabs") &&
                  !standardName.toLowerCase().includes("sans");
                const showFallbackWarning = !isFromApi && isNonSabsStandard;
                return (
                  <>
                    <div className="font-bold text-blue-800 mt-2 mb-1">FLANGE ({config})</div>
                    {showFallbackWarning && (
                      <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                        Data not available for {standardName} - showing SABS 1123 reference values
                      </div>
                    )}
                    {flangeSpecs && (
                      <>
                        <div className="text-gray-900 font-medium">
                          OD: {flangeSpecs.flangeOD}mm | PCD: {flangeSpecs.pcd}mm
                        </div>
                        <div className="text-gray-700">
                          Holes: {flangeSpecs.boltHoles} × Ø{flangeSpecs.holeID}mm
                        </div>
                        <div className="text-gray-700">
                          Bolts: {flangeSpecs.boltHoles} × M{flangeSpecs.boltSize} ×{" "}
                          {flangeSpecs.boltLength}mm
                        </div>
                        <div className="text-gray-700">Thickness: {flangeSpecs.thickness}mm</div>
                        <div
                          className={
                            showFallbackWarning
                              ? "text-orange-600 font-medium"
                              : "text-green-700 font-medium"
                          }
                        >
                          {(() => {
                            const rawPressureClassDesignation2 = props.pressureClassDesignation;
                            const designation = rawPressureClassDesignation2 || "";
                            const rawFlangeTypeCode2 = props.flangeTypeCode;
                            const flangeType = rawFlangeTypeCode2 || "";
                            const pressureMatch = designation.match(/^(\d+)/);
                            const pressureValue = pressureMatch
                              ? pressureMatch[1]
                              : designation.replace(/\/\d+$/, "");
                            return `${standardName} T${pressureValue}${flangeType}`;
                          })()}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Segmented bend info in expanded view */}
            {props.numberOfSegments &&
              props.numberOfSegments > 1 &&
              (() => {
                const rawBendRadiusMm4 = props.bendRadiusMm;
                const bendRadius = rawBendRadiusMm4 || props.nominalBore * 1.5;
                const degreesPerSeg = props.bendAngle / props.numberOfSegments;
                const arcLengthPerSeg = (bendRadius * Math.PI * degreesPerSeg) / 180;
                const totalArcLength = (bendRadius * Math.PI * props.bendAngle) / 180;
                return (
                  <div className="absolute top-4 left-[280px] text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg border border-orange-200">
                    <div className="font-bold text-orange-800 mb-1">SEGMENTED BEND</div>
                    <div className="text-gray-900 font-medium">
                      Total: {props.bendAngle}° / {totalArcLength.toFixed(0)}mm arc
                    </div>
                    <div className="text-gray-700">Segments: {props.numberOfSegments}</div>
                    <div className="text-gray-700">Per segment: {degreesPerSeg.toFixed(1)}°</div>
                    <div className="text-gray-700">Seg length: {arcLengthPerSeg.toFixed(0)}mm</div>
                    <div className="text-orange-700 font-medium mt-1">
                      Mitre welds: {props.numberOfSegments - 1}
                    </div>
                  </div>
                );
              })()}

            {/* Controls hint */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-white/80 bg-black/50 px-4 py-2 rounded-full">
              Drag to rotate • Scroll to zoom • Right-click to pan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
