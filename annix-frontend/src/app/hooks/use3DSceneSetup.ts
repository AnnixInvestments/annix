'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  GEOMETRY_CONSTANTS,
  nbToOd,
  calculateVisualWallThickness,
} from '@/app/lib/config/rfq/rendering3DStandards';
import { FLANGE_DATA, resolveFlangeData } from '@/app/lib/3d/flangeData';
import type { FlangeSpecData } from '@/app/lib/hooks/useFlangeSpecs';

const SCALE = GEOMETRY_CONSTANTS.SCALE;

type StubOrientation = 'top' | 'bottom' | 'inside' | 'outside';

export interface StubData {
  nominalBoreMm?: number;
  length?: number;
  locationFromFlange?: number;
  hasFlange?: boolean;
  orientation?: StubOrientation;
  angleDegrees?: number;
}

export interface Use3DSceneSetupProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness: number;
  bendAngle: number;
  tangent1?: number;
  tangent2?: number;
  numberOfSegments?: number;
  stubs?: StubData[];
  flangeConfig?: string;
  closureLengthMm?: number;
  bendRadiusMm?: number;
  bendItemType?: string;
  sweepTeePipeALengthMm?: number;
  flangeSpecs?: FlangeSpecData | null;
}

export interface ScaledDimensions {
  odMm: number;
  wtMm: number;
  outerR: number;
  innerR: number;
  bendR: number;
  angleRad: number;
  t1: number;
  t2: number;
  weldTube: number;
  closureLength: number;
  gapLength: number;
  flangeThickScaled: number;
  flangeOffset: number;
  rotatingFlangeOffset: number;
  wtScaled: number;
  pipeALength: number;
}

export interface FlangeConfiguration {
  hasInletFlange: boolean;
  hasOutletFlange: boolean;
  hasLooseInletFlange: boolean;
  hasLooseOutletFlange: boolean;
  hasRotatingInletFlange: boolean;
  hasRotatingOutletFlange: boolean;
  fittingHasInletFlange: boolean;
  fittingHasOutletFlange: boolean;
  fittingHasBranchFlange: boolean;
  fittingHasLooseInletFlange: boolean;
  fittingHasLooseOutletFlange: boolean;
  fittingHasRotatingInletFlange: boolean;
  fittingHasRotatingOutletFlange: boolean;
  fittingHasRotatingBranchFlange: boolean;
}

export interface BendTypeFlags {
  isDuckfoot: boolean;
  isSweepTee: boolean;
  isSBend: boolean;
  isSegmentedBend: boolean;
}

export interface BendPositions {
  inletStart: THREE.Vector3;
  inletEnd: THREE.Vector3;
  inletDir: THREE.Vector3;
  bendCenter: THREE.Vector3;
  bendStartAngle: number;
  bendEndAngle: number;
  bendEndPoint: THREE.Vector3;
  outletDir: THREE.Vector3;
  outletEnd: THREE.Vector3;
}

export interface DuckfootGeometry {
  extradosR: number;
  midAngle: number;
  duckfootExtradosMidX: number;
  duckfootExtradosMidY: number;
  duckfootXOffset: number;
  duckfootYOffset: number;
  bendPositionAdjustY: number;
  bendPositionAdjustZ: number;
  duckfootRotation: [number, number, number];
}

export interface ProcessedStubData {
  distFromFlange: number;
  outerR: number;
  innerR: number;
  length: number;
  nb: number;
  orientation: StubOrientation;
  angleDegrees: number;
  hasFlange: boolean;
}

export interface Use3DSceneSetupReturn {
  dimensions: ScaledDimensions;
  flangeConfig: FlangeConfiguration;
  bendFlags: BendTypeFlags;
  positions: BendPositions;
  duckfootGeometry: DuckfootGeometry;
  stubsData: ProcessedStubData[];
  flangeSpecs: {
    flangeOD: number;
    pcd: number;
    boltHoles: number;
    holeID: number;
    boltSize: number;
    boltLength: number;
    thickness: number;
  };
}

export function use3DSceneSetup({
  nominalBore,
  outerDiameter,
  wallThickness,
  bendAngle,
  tangent1 = 0,
  tangent2 = 0,
  numberOfSegments,
  stubs = [],
  flangeConfig = 'PE',
  closureLengthMm = 0,
  bendRadiusMm,
  bendItemType,
  sweepTeePipeALengthMm,
  flangeSpecs: apiFlangeSpecs,
}: Use3DSceneSetupProps): Use3DSceneSetupReturn {
  const odMm = outerDiameter || nbToOd(nominalBore);
  const wtMm = calculateVisualWallThickness(odMm, wallThickness || 6);

  const outerR = odMm / SCALE / 2;
  const innerR = (odMm - 2 * wtMm) / SCALE / 2;
  const bendR = (bendRadiusMm || nominalBore * 1.5) / SCALE;
  const angleRad = (bendAngle * Math.PI) / 180;
  const t1 = tangent1 / SCALE;
  const t2 = tangent2 / SCALE;

  const config = flangeConfig.toUpperCase();

  const { specs: flangeSpecs } = resolveFlangeData(nominalBore, apiFlangeSpecs);
  const flangeThickScaled = (flangeSpecs.flangeOD / 2 / SCALE) * 0.18;
  const flangeOffset = (flangeThickScaled / 2) * 0.8;
  const rotatingFlangeOffset = 80 / SCALE;
  const wtScaled = (wallThickness || 6) / SCALE;

  const closureLength = (closureLengthMm || 150) / SCALE;
  const gapLength = 100 / SCALE;
  const weldTube = outerR * 0.05;

  const isDuckfoot = bendItemType === 'DUCKFOOT_BEND';
  const isSweepTee = bendItemType === 'SWEEP_TEE';
  const isSBend = bendItemType === 'S_BEND';
  const isSegmentedBend = numberOfSegments !== undefined && numberOfSegments > 1;

  const defaultPipeALengthMm = nominalBore * 3;
  const effectivePipeALengthMm =
    sweepTeePipeALengthMm || (isSweepTee ? defaultPipeALengthMm : 0);
  const pipeALength = effectivePipeALengthMm / SCALE;

  const dimensions: ScaledDimensions = {
    odMm,
    wtMm,
    outerR,
    innerR,
    bendR,
    angleRad,
    t1,
    t2,
    weldTube,
    closureLength,
    gapLength,
    flangeThickScaled,
    flangeOffset,
    rotatingFlangeOffset,
    wtScaled,
    pipeALength,
  };

  const flangeConfiguration: FlangeConfiguration = {
    hasInletFlange: ['FOE', 'FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(
      config
    ),
    hasOutletFlange: ['FBE', 'FOE_LF', 'FOE_RF', '2X_RF', '2XLF'].includes(config),
    hasLooseInletFlange: config === 'FOE_LF' || config === '2XLF',
    hasLooseOutletFlange: config === '2XLF',
    hasRotatingInletFlange: config === 'FOE_RF' || config === '2X_RF',
    hasRotatingOutletFlange: config === '2X_RF',
    fittingHasInletFlange: [
      'FAE',
      'F2E',
      'F2E_LF',
      'F2E_RF',
      '3X_RF',
      '2X_RF_FOE',
    ].includes(config),
    fittingHasOutletFlange: [
      'FAE',
      'F2E',
      'F2E_LF',
      'F2E_RF',
      '3X_RF',
      '2X_RF_FOE',
    ].includes(config),
    fittingHasBranchFlange: [
      'FAE',
      'F2E_LF',
      'F2E_RF',
      '3X_RF',
      '2X_RF_FOE',
    ].includes(config),
    fittingHasLooseInletFlange: config === 'F2E_LF',
    fittingHasLooseOutletFlange: config === 'F2E_LF',
    fittingHasRotatingInletFlange: ['F2E_RF', '3X_RF', '2X_RF_FOE'].includes(
      config
    ),
    fittingHasRotatingOutletFlange: ['F2E_RF', '3X_RF', '2X_RF_FOE'].includes(
      config
    ),
    fittingHasRotatingBranchFlange: config === '3X_RF',
  };

  const bendFlags: BendTypeFlags = {
    isDuckfoot,
    isSweepTee,
    isSBend,
    isSegmentedBend,
  };

  const inletStart = new THREE.Vector3(0, 0, 0);
  const inletEnd = new THREE.Vector3(0, 0, t1);
  const inletDir = new THREE.Vector3(0, 0, 1);

  const bendCenter = new THREE.Vector3(-bendR, 0, t1);
  const bendStartAngle = 0;
  const bendEndAngle = angleRad;

  const bendEndPoint = new THREE.Vector3(
    bendCenter.x + bendR * Math.cos(bendEndAngle),
    0,
    bendCenter.z + bendR * Math.sin(bendEndAngle)
  );

  const outletDir = new THREE.Vector3(-Math.sin(angleRad), 0, Math.cos(angleRad));
  const outletEnd = bendEndPoint
    .clone()
    .add(outletDir.clone().multiplyScalar(t2));

  const positions: BendPositions = {
    inletStart,
    inletEnd,
    inletDir,
    bendCenter,
    bendStartAngle,
    bendEndAngle,
    bendEndPoint,
    outletDir,
    outletEnd,
  };

  const extradosR = bendR + outerR;
  const midAngle = Math.PI / 4;
  const duckfootExtradosMidX = -extradosR * Math.sin(midAngle);
  const duckfootExtradosMidY = bendR - extradosR * Math.cos(midAngle);

  const duckfootXOffset = isDuckfoot ? duckfootExtradosMidX : 0;
  const duckfootYOffset = isDuckfoot ? duckfootExtradosMidY : 0;
  const bendPositionAdjustY = isDuckfoot ? outerR * 0.5 : 0;
  const bendPositionAdjustZ = isDuckfoot ? -outerR * 0.8 : 0;
  const bendTiltZ = 0.0;
  const duckfootRotation: [number, number, number] = isDuckfoot
    ? [-Math.PI / 2, Math.PI, -Math.PI + bendTiltZ]
    : [0, 0, 0];

  const duckfootGeometry: DuckfootGeometry = {
    extradosR,
    midAngle,
    duckfootExtradosMidX,
    duckfootExtradosMidY,
    duckfootXOffset,
    duckfootYOffset,
    bendPositionAdjustY,
    bendPositionAdjustZ,
    duckfootRotation,
  };

  const stubsData = useMemo(() => {
    return stubs
      .filter(
        (s) =>
          s.locationFromFlange != null &&
          s.length != null &&
          s.nominalBoreMm != null
      )
      .map((s) => {
        const sOd = nbToOd(s.nominalBoreMm!);
        const sWt = calculateVisualWallThickness(sOd, wtMm * 0.8);
        const distFromFlange = s.locationFromFlange! / SCALE;

        return {
          distFromFlange,
          outerR: sOd / SCALE / 2,
          innerR: (sOd - 2 * sWt) / SCALE / 2,
          length: s.length! / SCALE,
          nb: s.nominalBoreMm!,
          orientation: s.orientation || ('outside' as StubOrientation),
          angleDegrees: s.angleDegrees ?? 0,
          hasFlange: s.hasFlange ?? true,
        };
      });
  }, [stubs, wtMm]);

  return {
    dimensions,
    flangeConfig: flangeConfiguration,
    bendFlags,
    positions,
    duckfootGeometry,
    stubsData,
    flangeSpecs,
  };
}
