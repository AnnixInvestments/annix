"use client";

import * as THREE from "three";
import { GEOMETRY_CONSTANTS } from "@/app/lib/config/rfq/rendering3DStandards";

const SCALE = GEOMETRY_CONSTANTS.SCALE;

interface DuckfootSteelworkProps {
  nominalBore: number;
  bendR: number;
  outerR: number;
  t1: number;
  duckfootBasePlateXMm: number | undefined;
  duckfootBasePlateYMm: number | undefined;
  duckfootPlateThicknessT1Mm: number | undefined;
  duckfootRibThicknessT2Mm: number | undefined;
  duckfootInletCentreHeightMm: number | undefined;
  duckfootGussetPointCDegrees: number | undefined;
  duckfootGussetPointDDegrees: number | undefined;
  duckfootGussetThicknessMm: number | undefined;
}

const DUCKFOOT_DEFAULTS: Record<
  number,
  { x: number; y: number; t1: number; t2: number; inletH: number }
> = {
  200: { x: 355, y: 230, t1: 6, t2: 10, inletH: 365 },
  250: { x: 405, y: 280, t1: 6, t2: 10, inletH: 417 },
  300: { x: 460, y: 330, t1: 6, t2: 10, inletH: 467 },
  350: { x: 510, y: 380, t1: 8, t2: 12, inletH: 519 },
  400: { x: 560, y: 430, t1: 8, t2: 12, inletH: 559 },
  450: { x: 610, y: 485, t1: 8, t2: 12, inletH: 633 },
  500: { x: 660, y: 535, t1: 10, t2: 14, inletH: 703 },
  550: { x: 710, y: 585, t1: 10, t2: 14, inletH: 752 },
  600: { x: 760, y: 635, t1: 10, t2: 14, inletH: 790 },
  650: { x: 815, y: 693, t1: 12, t2: 16, inletH: 847 },
  700: { x: 865, y: 733, t1: 12, t2: 16, inletH: 892 },
  750: { x: 915, y: 793, t1: 12, t2: 16, inletH: 940 },
  800: { x: 970, y: 833, t1: 14, t2: 18, inletH: 991 },
  850: { x: 1020, y: 883, t1: 14, t2: 18, inletH: 1016 },
  900: { x: 1070, y: 933, t1: 14, t2: 18, inletH: 1067 },
};

const PLATE_MATERIAL = {
  color: "#5a5a5a",
  metalness: 0.85,
  roughness: 0.25,
  envMapIntensity: 1.0,
};
const YELLOW_MATERIAL = {
  color: "#cc8800",
  metalness: 0.8,
  roughness: 0.3,
  envMapIntensity: 1.0,
};
const BLUE_MATERIAL = {
  color: "#0066cc",
  metalness: 0.8,
  roughness: 0.3,
  envMapIntensity: 1.0,
};

const DuckfootSteelwork = (props: DuckfootSteelworkProps) => {
  const {
    nominalBore,
    bendR,
    outerR,
    t1,
    duckfootBasePlateXMm,
    duckfootBasePlateYMm,
    duckfootPlateThicknessT1Mm,
    duckfootRibThicknessT2Mm,
    duckfootInletCentreHeightMm,
    duckfootGussetPointCDegrees,
    duckfootGussetPointDDegrees,
    duckfootGussetThicknessMm,
  } = props;

  const rawDefaults = DUCKFOOT_DEFAULTS[nominalBore];
  const defaults = rawDefaults || {
    x: 500,
    y: 400,
    t1: 10,
    t2: 12,
    inletH: 500,
  };

  const basePlateXMm = duckfootBasePlateXMm || defaults.x;
  const basePlateYMm = duckfootBasePlateYMm || defaults.y;
  const yellowThicknessMm = duckfootPlateThicknessT1Mm || defaults.t1;
  const plateThicknessMm = duckfootRibThicknessT2Mm || defaults.t2;
  const inletCentreHeightMm = duckfootInletCentreHeightMm || defaults.inletH;
  const ptCAngleDeg = duckfootGussetPointCDegrees ?? 15;
  const ptDAngleDeg = duckfootGussetPointDDegrees ?? 75;
  const blueThicknessMm = duckfootGussetThicknessMm || yellowThicknessMm;

  const basePlateX = basePlateXMm / SCALE;
  const basePlateY = basePlateYMm / SCALE;
  const plateThick = plateThicknessMm / SCALE;
  const yellowThick = yellowThicknessMm / SCALE;
  const blueThick = blueThicknessMm / SCALE;

  const extradosR = bendR + outerR;
  const bendBottomZ = t1 + extradosR;
  const inletCentreHeightZ = inletCentreHeightMm / SCALE;
  const floorZ = Math.max(inletCentreHeightZ, bendBottomZ + plateThick * 0.5);

  const ptCRad = (ptCAngleDeg * Math.PI) / 180;
  const ptDRad = (ptDAngleDeg * Math.PI) / 180;
  const startTheta = Math.min(ptCRad, ptDRad);
  const endTheta = Math.max(ptCRad, ptDRad);

  const heelXAt = (theta: number) => extradosR * Math.cos(theta) - bendR;
  const heelZAt = (theta: number) => t1 + extradosR * Math.sin(theta);

  const yellowShape = (() => {
    const shape = new THREE.Shape();
    shape.moveTo(basePlateX / 2, floorZ);
    shape.lineTo(heelXAt(startTheta), heelZAt(startTheta));

    const arcSegments = 32;
    Array.from({ length: arcSegments + 1 }).forEach((_, i) => {
      const theta = startTheta + (i / arcSegments) * (endTheta - startTheta);
      shape.lineTo(heelXAt(theta), heelZAt(theta));
    });

    shape.lineTo(-basePlateX / 2, floorZ);
    shape.lineTo(basePlateX / 2, floorZ);
    return shape;
  })();

  const blueTopZ = 0;

  const blueShape = (() => {
    const shape = new THREE.Shape();
    const halfWidth = basePlateY / 2 - blueThick;

    shape.moveTo(-halfWidth, blueTopZ);
    shape.lineTo(halfWidth, blueTopZ);
    shape.lineTo(halfWidth, floorZ);
    shape.lineTo(-halfWidth, floorZ);
    shape.closePath();
    return shape;
  })();

  return (
    <group>
      <mesh position={[0, 0, floorZ + plateThick / 2]}>
        <boxGeometry args={[basePlateX, basePlateY, plateThick]} />
        <meshStandardMaterial {...PLATE_MATERIAL} />
      </mesh>

      <mesh position={[0, yellowThick / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <extrudeGeometry args={[yellowShape, { depth: yellowThick, bevelEnabled: false }]} />
        <meshStandardMaterial {...YELLOW_MATERIAL} />
      </mesh>

      <mesh position={[-blueThick / 2, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <extrudeGeometry args={[blueShape, { depth: blueThick, bevelEnabled: false }]} />
        <meshStandardMaterial {...BLUE_MATERIAL} />
      </mesh>
    </group>
  );
};

export { DuckfootSteelwork };
