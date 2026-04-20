"use client";

import { Center, Line as DreiLine, Text } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  FLANGE_MATERIALS,
  GEOMETRY_CONSTANTS,
  PIPE_MATERIALS,
  SCENE_CONSTANTS,
  STEELWORK_MATERIALS,
  WELD_MATERIALS,
  wallThicknessFromNB,
} from "@/app/lib/config/rfq/rendering3DStandards";
import { useNbToOdLookup } from "@/app/lib/query/hooks";
import { CameraTracker, SceneShell } from "./hooks";
import { useDebouncedProps } from "./shared";

const Line = (props: React.ComponentProps<typeof DreiLine>) => {
  const { size } = useThree();
  return <DreiLine {...props} resolution={new THREE.Vector2(size.width, size.height)} />;
};

import {
  BlankFlangeComponent,
  FlangeComponent,
  FlangeWeldRing,
  GussetPlate,
  GussetWeld,
  getFlangeSpecs,
  RetainingRingComponent,
  RotatingFlangeComponent,
  SaddleWeld,
} from "@/app/components/rfq/3d/geometries/tee";
import { FlangeSpecData } from "@/app/lib/hooks/useFlangeSpecs";
import {
  getGussetSection,
  getSabs719TeeDimensions,
  getTeeHeight,
  Sabs719TeeType,
} from "@/app/lib/utils/sabs719TeeData";

const SCALE_FACTOR = GEOMETRY_CONSTANTS.FITTING_SCALE;
const PREVIEW_SCALE = SCENE_CONSTANTS.PREVIEW_SCALE;
const MIN_CAMERA_DISTANCE = SCENE_CONSTANTS.MIN_CAMERA_DISTANCE;
const MAX_CAMERA_DISTANCE = SCENE_CONSTANTS.MAX_CAMERA_DISTANCE;

const pipeOuterMat = PIPE_MATERIALS.outer;
const pipeInnerMat = PIPE_MATERIALS.inner;
const pipeEndMat = PIPE_MATERIALS.end;
const weldColor = WELD_MATERIALS.standard;
const flangeColor = FLANGE_MATERIALS.standard;
const blankFlangeColor = FLANGE_MATERIALS.blank;
const closureColor = WELD_MATERIALS.closure;
const rotatingFlangeColor = FLANGE_MATERIALS.rotating;
const gussetColor = STEELWORK_MATERIALS.rib;

// Flange type for rendering
type FlangeType = "fixed" | "loose" | "rotating" | null;

interface Tee3DPreviewProps {
  nominalBore: number;
  outerDiameter?: number;
  wallThickness?: number;
  // 'short' or 'gusset'
  teeType: Sabs719TeeType;
  // For reducing tees (optional)
  branchNominalBore?: number;
  branchOuterDiameter?: number;
  // For unequal tees - branch pipe size
  teeNominalBore?: number;
  // For unequal tees - separate flange specs for tee
  teeFlangeSpecs?: FlangeSpecData | null;
  // Total length of run pipe (optional)
  runLength?: number;
  // Distance from left flange to center of branch (optional)
  branchPositionMm?: number;
  materialName?: string;
  hasInletFlange?: boolean;
  hasOutletFlange?: boolean;
  hasBranchFlange?: boolean;
  // Flange types for each end
  inletFlangeType?: FlangeType;
  outletFlangeType?: FlangeType;
  branchFlangeType?: FlangeType;
  // Closure length for loose flanges (site weld extension)
  closureLengthMm?: number;
  // Blank flange options
  addBlankFlange?: boolean;
  blankFlangeCount?: number;
  // ['inlet', 'outlet', 'branch']
  blankFlangePositions?: string[];
  // Camera persistence
  savedCameraPosition?: [number, number, number];
  savedCameraTarget?: [number, number, number];
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
  // Notes for display
  selectedNotes?: string[];
  // Dynamic flange specs from API
  flangeSpecs?: FlangeSpecData | null;
  // Dynamic flange spec display
  flangeStandardName?: string;
  pressureClassDesignation?: string;
  flangeTypeCode?: string;
}

const getWallThickness = wallThicknessFromNB;

// Main Tee Scene component
function TeeScene(props: Tee3DPreviewProps) {
  const { outerDiameterFromNB: getOuterDiameter } = useNbToOdLookup();
  const {
    nominalBore,
    outerDiameter,
    wallThickness,
    teeType,
    branchNominalBore,
    branchOuterDiameter,
    teeNominalBore,
    runLength,
    branchPositionMm,
    hasInletFlange = false,
    hasOutletFlange = false,
    hasBranchFlange = false,
    inletFlangeType = "fixed",
    outletFlangeType = "fixed",
    branchFlangeType = "fixed",
    closureLengthMm = 150,
    addBlankFlange = false,
    blankFlangePositions = [],
  } = props;

  // Determine which positions have blank flanges (can be used with any flange type: fixed, loose, or rotating)
  const hasBlankInlet = addBlankFlange && blankFlangePositions.includes("inlet") && hasInletFlange;
  const hasBlankOutlet =
    addBlankFlange && blankFlangePositions.includes("outlet") && hasOutletFlange;
  const hasBlankBranch =
    addBlankFlange && blankFlangePositions.includes("branch") && hasBranchFlange;

  // Get dimensions from SABS 719 data
  const dims = getSabs719TeeDimensions(nominalBore);
  // Effective branch NB - either reducing tee (branchNominalBore) or unequal tee (teeNominalBore)
  const effectiveBranchNB = branchNominalBore || teeNominalBore;
  const branchDims = effectiveBranchNB ? getSabs719TeeDimensions(effectiveBranchNB) : null;
  const teeHeight = getTeeHeight(nominalBore, teeType);
  const gussetSection = teeType === "gusset" ? getGussetSection(nominalBore) : 0;

  // Calculate dimensions using proper lookup tables
  const dimsOuterDiameterMm = dims?.outsideDiameterMm;
  const branchDimsOuterDiameterMm = branchDims?.outsideDiameterMm;
  const od = getOuterDiameter(nominalBore, outerDiameter || dimsOuterDiameterMm || 0);
  const wt = getWallThickness(nominalBore, wallThickness || 0);
  const id = od - 2 * wt;
  // For reducing/unequal tees, use the effective branch NB dimensions; otherwise use same as run
  const branchOD = effectiveBranchNB
    ? getOuterDiameter(effectiveBranchNB, branchOuterDiameter || branchDimsOuterDiameterMm || 0)
    : od;
  const branchWT = effectiveBranchNB ? getWallThickness(effectiveBranchNB) : wt;
  const branchID = branchOD - 2 * branchWT;

  // Scale factor for 3D scene (convert mm to scene units)
  const scaleFactor = SCALE_FACTOR;
  const outerRadius = Math.max(0.01, od / scaleFactor / 2);
  const rawInnerRadius = id / scaleFactor / 2;
  const innerRadius = Math.max(0.001, Math.min(rawInnerRadius, outerRadius - 0.001));
  const branchOuterRadius = Math.max(0.01, branchOD / scaleFactor / 2);
  const rawBranchInnerRadius = branchID / scaleFactor / 2;
  const branchInnerRadius = Math.max(
    0.001,
    Math.min(rawBranchInnerRadius, branchOuterRadius - 0.001),
  );
  const height = teeHeight / scaleFactor;
  const gussetSize = gussetSection / scaleFactor;

  // Run pipe length (default to 3x the OD)
  const totalRunLength = runLength || od * 3;
  const halfRunLength = totalRunLength / scaleFactor / 2;

  // Branch position offset from center
  // branchPositionMm is distance from left flange to center of branch
  // Convert to offset from center: offset = branchPositionMm - (totalRunLength / 2)
  const branchOffsetX =
    // Default to center if not specified
    branchPositionMm !== undefined ? (branchPositionMm - totalRunLength / 2) / scaleFactor : 0;

  // Create pipe geometry (cylinder with hole)
  const createPipeGeometry = (outerR: number, innerR: number, length: number) => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    const extrudeSettings = { depth: length, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  };

  // Create saddle-cut branch pipe geometry
  // The bottom of the branch pipe is cut to follow the curve of the run pipe (Steinmetz intersection)
  // For gusset tees, the bottom follows the gusset inner edge (V-shape)
  const createSaddleCutBranchGeometry = (
    branchOuterR: number,
    branchInnerR: number,
    runOuterR: number,
    totalHeight: number,
    gussetHalfWidth?: number,
  ) => {
    const radialSegments = 48;
    const heightSegments = 24;
    const geometry = new THREE.BufferGeometry();

    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    // Calculate saddle cut depth at each angle
    // For a branch meeting a run at 90°, the bottom follows: y = sqrt(R² - z²) where R is run radius
    // For gusset tees, the bottom follows the gusset inner edge (V-shaped curve)
    const saddleBottomY = (angle: number): number => {
      const z = branchOuterR * Math.sin(angle);
      // The bottom of the saddle where branch meets run surface
      const saddleY = Math.sqrt(Math.max(0, runOuterR * runOuterR - z * z));

      if (gussetHalfWidth === undefined) return saddleY;

      // For gusset tees, follow the gusset inner edge V-shape
      // The gusset inner edge Y = yOnRun + currentHalfWidth
      // where currentHalfWidth varies from max at z=0 to 0 at z=±branchRadius
      const zNormalized = Math.max(-1, Math.min(1, z / branchOuterR));
      const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
      const gussetInnerY = saddleY + gussetHalfWidth * widthFraction;

      return gussetInnerY;
    };

    // Generate outer surface vertices
    // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with saddle curve; declarative harms readability and performance
    for (let h = 0; h <= heightSegments; h++) {
      // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with saddle curve; declarative harms readability and performance
      for (let r = 0; r <= radialSegments; r++) {
        const angle = (r / radialSegments) * Math.PI * 2;
        const x = branchOuterR * Math.cos(angle);
        const z = branchOuterR * Math.sin(angle);

        // Bottom varies with saddle curve, top is flat at totalHeight
        const bottomY = saddleBottomY(angle);
        const y = bottomY + (h / heightSegments) * (totalHeight - bottomY);

        vertices.push(x, y, z);

        // Normal points outward radially
        const nx = Math.cos(angle);
        const nz = Math.sin(angle);
        normals.push(nx, 0, nz);
      }
    }

    // Store outer vertex count for indexing inner surface
    const outerVertexCount = vertices.length / 3;

    // Generate inner surface vertices (same pattern but with inner radius)
    const saddleBottomYInner = (angle: number): number => {
      const z = branchInnerR * Math.sin(angle);
      // Inner surface follows a slightly different curve
      const innerRunR = runOuterR - (branchOuterR - branchInnerR);
      const saddleY = Math.sqrt(Math.max(0, innerRunR * innerRunR - z * z));

      if (gussetHalfWidth === undefined) return saddleY;

      // For gusset tees, follow the gusset inner edge V-shape
      const zNormalized = Math.max(-1, Math.min(1, z / branchInnerR));
      const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
      const gussetInnerY = saddleY + gussetHalfWidth * widthFraction;

      return gussetInnerY;
    };

    // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with saddle curve; declarative harms readability and performance
    for (let h = 0; h <= heightSegments; h++) {
      // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with saddle curve; declarative harms readability and performance
      for (let r = 0; r <= radialSegments; r++) {
        const angle = (r / radialSegments) * Math.PI * 2;
        const x = branchInnerR * Math.cos(angle);
        const z = branchInnerR * Math.sin(angle);

        const bottomY = saddleBottomYInner(angle);
        const y = bottomY + (h / heightSegments) * (totalHeight - bottomY);

        vertices.push(x, y, z);

        // Normal points inward
        const nx = -Math.cos(angle);
        const nz = -Math.sin(angle);
        normals.push(nx, 0, nz);
      }
    }

    // Generate indices for outer surface
    // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation; declarative harms readability and performance
    for (let h = 0; h < heightSegments; h++) {
      // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation; declarative harms readability and performance
      for (let r = 0; r < radialSegments; r++) {
        const a = h * (radialSegments + 1) + r;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    // Generate indices for inner surface (reversed winding for correct normals)
    // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation; declarative harms readability and performance
    for (let h = 0; h < heightSegments; h++) {
      // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation; declarative harms readability and performance
      for (let r = 0; r < radialSegments; r++) {
        const a = outerVertexCount + h * (radialSegments + 1) + r;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, c, b);
        indices.push(c, d, b);
      }
    }

    // Add top cap (annular ring at top of pipe)
    const topCapStartIdx = vertices.length / 3;
    // eslint-disable-next-line no-restricted-syntax -- radial vertex buffer generation; declarative harms readability and performance
    for (let r = 0; r <= radialSegments; r++) {
      const angle = (r / radialSegments) * Math.PI * 2;
      // Outer edge at top
      vertices.push(branchOuterR * Math.cos(angle), totalHeight, branchOuterR * Math.sin(angle));
      normals.push(0, 1, 0);
      // Inner edge at top
      vertices.push(branchInnerR * Math.cos(angle), totalHeight, branchInnerR * Math.sin(angle));
      normals.push(0, 1, 0);
    }

    // Top cap indices
    // eslint-disable-next-line no-restricted-syntax -- radial triangle index generation; declarative harms readability and performance
    for (let r = 0; r < radialSegments; r++) {
      const outer1 = topCapStartIdx + r * 2;
      const inner1 = outer1 + 1;
      const outer2 = outer1 + 2;
      const inner2 = inner1 + 2;

      indices.push(outer1, inner1, outer2);
      indices.push(inner1, inner2, outer2);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  };

  // Create run pipe with hole cut where branch enters
  // This creates a realistic pipe with proper inner/outer surfaces and end caps
  // For gusset tees, holeExtension makes the hole larger to show gusset interior
  const createRunPipeWithHoleGeometry = (
    runOuterR: number,
    runInnerR: number,
    runLength: number,
    branchOuterR: number,
    branchInnerR: number,
    branchOffsetXVal: number,
    holeExtension: number = 0,
  ) => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    // Very high resolution for smooth gusset hole edge
    const lengthSegments = 512;
    const radialSegments = 512;
    const halfLength = runLength / 2;

    // Cut a hole where the branch intersects the run pipe (Steinmetz curve)
    // For gusset tees, the hole follows the gusset outer edge (diamond shape)
    const isInBranchHole = (x: number, angle: number, radius: number): boolean => {
      const z = radius * Math.sin(angle);
      const y = radius * Math.cos(angle);
      // Only cut hole on top half of run pipe
      if (y <= 0) return false;

      const zSq = z * z;
      const branchRSq = branchOuterR * branchOuterR;

      if (holeExtension > 0) {
        // For gusset tees: hole follows the gusset outer edge shape
        // The gusset outer edge X distance from branch center is:
        // xSaddleOffset + currentHalfWidth
        // where xSaddleOffset = sqrt(branchR² - z²) and currentHalfWidth varies with z
        if (zSq >= branchRSq) return false;

        const xSaddleOffset = Math.sqrt(branchRSq - zSq);
        const zNormalized = Math.abs(z) / branchOuterR;
        const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
        const gussetHalfWidth = holeExtension * widthFraction;
        const holeHalfWidth = xSaddleOffset + gussetHalfWidth;

        const xDist = Math.abs(x - branchOffsetXVal);
        return xDist < holeHalfWidth;
      } else {
        // Standard branch hole (cylinder intersection)
        if (zSq >= branchRSq) return false;
        const xDist = Math.abs(x - branchOffsetXVal);
        const holeHalfWidth = Math.sqrt(branchRSq - zSq);
        return xDist < holeHalfWidth;
      }
    };

    const isInBranchInnerHole = (x: number, angle: number): boolean => {
      const z = runInnerR * Math.sin(angle);
      const y = runInnerR * Math.cos(angle);
      if (y <= 0) return false;

      const zSq = z * z;
      const branchInnerRSq = branchInnerR * branchInnerR;

      if (holeExtension > 0) {
        // For gusset tees: hole follows gusset outer edge shape
        if (zSq >= branchInnerRSq) return false;

        const xSaddleOffset = Math.sqrt(branchInnerRSq - zSq);
        const zNormalized = Math.abs(z) / branchInnerR;
        const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
        const gussetHalfWidth = holeExtension * widthFraction;
        const holeHalfWidth = xSaddleOffset + gussetHalfWidth;

        const xDist = Math.abs(x - branchOffsetXVal);
        return xDist < holeHalfWidth;
      } else {
        // Standard branch hole
        if (zSq >= branchInnerRSq) return false;
        const xDist = Math.abs(x - branchOffsetXVal);
        const holeHalfWidth = Math.sqrt(branchInnerRSq - zSq);
        return xDist < holeHalfWidth;
      }
    };

    // Generate outer surface with hole
    const outerVertices: Map<string, number> = new Map();
    const getOuterVertexIndex = (li: number, ri: number): number => {
      const key = `o_${li}_${ri}`;
      if (outerVertices.has(key)) return outerVertices.get(key)!;

      const x = -halfLength + (li / lengthSegments) * runLength;
      const angle = (ri / radialSegments) * Math.PI * 2;

      // Skip vertices in hole
      if (isInBranchHole(x, angle, runOuterR)) return -1;

      const y = runOuterR * Math.cos(angle);
      const z = runOuterR * Math.sin(angle);

      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      normals.push(0, Math.cos(angle), Math.sin(angle));
      outerVertices.set(key, idx);
      return idx;
    };

    // Generate inner surface with hole
    const innerVertices: Map<string, number> = new Map();
    const getInnerVertexIndex = (li: number, ri: number): number => {
      const key = `i_${li}_${ri}`;
      if (innerVertices.has(key)) return innerVertices.get(key)!;

      const x = -halfLength + (li / lengthSegments) * runLength;
      const angle = (ri / radialSegments) * Math.PI * 2;

      if (isInBranchInnerHole(x, angle)) return -1;

      const y = runInnerR * Math.cos(angle);
      const z = runInnerR * Math.sin(angle);

      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      normals.push(0, -Math.cos(angle), -Math.sin(angle));
      innerVertices.set(key, idx);
      return idx;
    };

    // Build outer surface triangles
    // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation with hole cutouts; declarative harms readability and performance
    for (let li = 0; li < lengthSegments; li++) {
      // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation with hole cutouts; declarative harms readability and performance
      for (let ri = 0; ri < radialSegments; ri++) {
        const a = getOuterVertexIndex(li, ri);
        const b = getOuterVertexIndex(li + 1, ri);
        const c = getOuterVertexIndex(li, ri + 1);
        const d = getOuterVertexIndex(li + 1, ri + 1);

        if (a >= 0 && b >= 0 && c >= 0) indices.push(a, c, b);
        if (b >= 0 && c >= 0 && d >= 0) indices.push(b, c, d);
      }
    }

    // Build inner surface triangles (reversed winding)
    // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation with hole cutouts; declarative harms readability and performance
    for (let li = 0; li < lengthSegments; li++) {
      // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation with hole cutouts; declarative harms readability and performance
      for (let ri = 0; ri < radialSegments; ri++) {
        const a = getInnerVertexIndex(li, ri);
        const b = getInnerVertexIndex(li + 1, ri);
        const c = getInnerVertexIndex(li, ri + 1);
        const d = getInnerVertexIndex(li + 1, ri + 1);

        if (a >= 0 && b >= 0 && c >= 0) indices.push(a, b, c);
        if (b >= 0 && c >= 0 && d >= 0) indices.push(b, d, c);
      }
    }

    // Add end caps (annular rings at both ends)
    const addEndCap = (xPos: number, normalX: number) => {
      const capStart = vertices.length / 3;
      // eslint-disable-next-line no-restricted-syntax -- radial vertex buffer generation; declarative harms readability and performance
      for (let ri = 0; ri <= radialSegments; ri++) {
        const angle = (ri / radialSegments) * Math.PI * 2;
        const y = Math.cos(angle);
        const z = Math.sin(angle);

        // Outer edge
        vertices.push(xPos, runOuterR * y, runOuterR * z);
        normals.push(normalX, 0, 0);
        // Inner edge
        vertices.push(xPos, runInnerR * y, runInnerR * z);
        normals.push(normalX, 0, 0);
      }

      // eslint-disable-next-line no-restricted-syntax -- radial triangle index generation; declarative harms readability and performance
      for (let ri = 0; ri < radialSegments; ri++) {
        const o1 = capStart + ri * 2;
        const i1 = o1 + 1;
        const o2 = o1 + 2;
        const i2 = i1 + 2;

        if (normalX < 0) {
          indices.push(o1, o2, i1);
          indices.push(i1, o2, i2);
        } else {
          indices.push(o1, i1, o2);
          indices.push(i1, i2, o2);
        }
      }
    };

    // Left end
    addEndCap(-halfLength, -1);
    // Right end
    addEndCap(halfLength, 1);

    // Hole edge surface is covered by the branch pipe's saddle-cut geometry
    // The saddle weld visually covers any minor gap at the junction

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  };

  // Flange specs
  const { specs: runFlangeSpecs } = getFlangeSpecs(nominalBore, props.flangeSpecs);
  const rawTeeFlangeSpecs = props.teeFlangeSpecs;
  // For branch flange, use teeFlangeSpecs if provided (unequal tees), otherwise use main flangeSpecs
  const branchFlangeData = rawTeeFlangeSpecs || props.flangeSpecs;
  const { specs: branchFlangeSpecs } = getFlangeSpecs(
    effectiveBranchNB || nominalBore,
    branchFlangeData,
  );

  // Gusset plate thickness (estimated based on size)
  const gussetThickness = nominalBore <= 400 ? 0.1 : 0.14;

  return (
    <Center>
      <group>
        {/* Run pipe (horizontal) with hole cut where branch enters */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <primitive
            object={createRunPipeWithHoleGeometry(
              outerRadius,
              innerRadius,
              halfRunLength * 2,
              branchOuterRadius,
              branchInnerRadius,
              branchOffsetX,
              teeType === "gusset" ? gussetSize / 2 : 0,
            )}
            attach="geometry"
          />
          <meshStandardMaterial {...gussetColor} />
        </mesh>

        {/* Branch pipe (vertical) - saddle-cut bottom fits into run pipe curve */}
        {/* For gusset tees, branch bottom follows the gusset inner edge V-shape */}
        <mesh position={[branchOffsetX, 0, 0]} castShadow receiveShadow>
          <primitive
            object={createSaddleCutBranchGeometry(
              branchOuterRadius,
              branchInnerRadius,
              outerRadius,
              height,
              teeType === "gusset" ? gussetSize / 2 : undefined,
            )}
            attach="geometry"
          />
          <meshStandardMaterial {...gussetColor} />
        </mesh>

        {/* V-groove saddle weld at branch junction - only for non-gusset tees */}
        {/* For gusset tees, the gusset welds replace the saddle weld */}
        {teeType !== "gusset" && (
          <SaddleWeld
            runRadius={outerRadius}
            branchRadius={branchOuterRadius}
            branchOffsetX={branchOffsetX}
            weldThickness={0.12}
          />
        )}

        {/* Gusset plates for Gusset Tees - flat triangular reinforcement plates on front and back of branch */}
        {teeType === "gusset" && gussetSize > 0 && (
          <>
            {/* Left gusset (-X side) - diamond shape over run pipe */}
            <GussetPlate
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              thickness={gussetThickness}
              side="left"
              branchOffsetX={branchOffsetX}
            />
            <GussetWeld
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              side="left"
              branchOffsetX={branchOffsetX}
            />
            {/* Right gusset (+X side) - diamond shape over run pipe */}
            <GussetPlate
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              thickness={gussetThickness}
              side="right"
              branchOffsetX={branchOffsetX}
            />
            <GussetWeld
              runRadius={outerRadius}
              branchRadius={branchOuterRadius}
              gussetLength={gussetSize}
              side="right"
              branchOffsetX={branchOffsetX}
            />
          </>
        )}

        {/* Inlet flange (left side of run) */}
        {hasInletFlange &&
          (inletFlangeType === "rotating" ? (
            <>
              {/* Retaining ring welded at pipe end */}
              <RetainingRingComponent
                position={[-halfRunLength - 0.02, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                thickness={0.02}
              />
              {/* Rotating flange positioned 50mm (0.5 scene units) back from ring */}
              <RotatingFlangeComponent
                position={[-halfRunLength + 0.5, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                pipeOuterDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* R/F dimension line */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.15, 0],
                  [-halfRunLength + 0.5, -outerRadius - 0.15, 0],
                ]}
                color="#ea580c"
                lineWidth={2}
              />
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.1, 0],
                  [-halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Line
                points={[
                  [-halfRunLength + 0.5, -outerRadius - 0.1, 0],
                  [-halfRunLength + 0.5, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Text
                position={[-halfRunLength + 0.25, -outerRadius - 0.35, 0]}
                fontSize={0.15}
                color="#ea580c"
                anchorX="center"
                anchorY="middle"
              >
                R/F 50mm
              </Text>
            </>
          ) : inletFlangeType === "loose" ? (
            <>
              {/* Loose flange: Closure piece attached to tee, then 100mm gap, then flange floating */}
              {/* Hollow closure pipe piece - simple geometry approach */}
              <group
                position={[-halfRunLength - closureLengthMm / scaleFactor / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <mesh>
                  <cylinderGeometry
                    args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32, 1, true]}
                  />
                  <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry
                    args={[
                      innerRadius,
                      innerRadius,
                      closureLengthMm / scaleFactor + 0.01,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange floating 100mm (1.0 scene units) away from closure piece */}
              <FlangeComponent
                position={[-halfRunLength - closureLengthMm / scaleFactor - 1.0, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(od + 3) / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Closure length dimension line */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.15, 0],
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.15, 0],
                ]}
                color="#2563eb"
                lineWidth={2}
              />
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.1, 0],
                  [-halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              <Line
                points={[
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.1, 0],
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              {/* L/F label with closure length */}
              <Text
                position={[
                  -halfRunLength - closureLengthMm / scaleFactor / 2,
                  -outerRadius - 0.35,
                  0,
                ]}
                fontSize={0.15}
                color="#2563eb"
                anchorX="center"
                anchorY="middle"
              >
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap dimension line */}
              <Line
                points={[
                  [-halfRunLength - closureLengthMm / scaleFactor, -outerRadius - 0.5, 0],
                  [-halfRunLength - closureLengthMm / scaleFactor - 1.0, -outerRadius - 0.5, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
              />
              <Text
                position={[
                  -halfRunLength - closureLengthMm / scaleFactor - 0.5,
                  -outerRadius - 0.65,
                  0,
                ]}
                fontSize={0.12}
                color="#9333ea"
                anchorX="center"
                anchorY="middle"
              >
                100mm gap
              </Text>
            </>
          ) : (
            <>
              <FlangeComponent
                position={[-halfRunLength - runFlangeSpecs.thickness / scaleFactor, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Flange welds - inside and outside */}
              <FlangeWeldRing
                position={[-halfRunLength, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                weldThickness={0.08}
              />
            </>
          ))}

        {/* Outlet flange (right side of run) */}
        {hasOutletFlange &&
          (outletFlangeType === "rotating" ? (
            <>
              {/* Retaining ring welded at pipe end */}
              <RetainingRingComponent
                position={[halfRunLength + 0.02, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                thickness={0.02}
              />
              {/* Rotating flange positioned 50mm (0.5 scene units) back from ring */}
              <RotatingFlangeComponent
                position={[halfRunLength - 0.5, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                pipeOuterDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* R/F dimension line */}
              <Line
                points={[
                  [halfRunLength - 0.5, -outerRadius - 0.15, 0],
                  [halfRunLength, -outerRadius - 0.15, 0],
                ]}
                color="#ea580c"
                lineWidth={2}
              />
              <Line
                points={[
                  [halfRunLength - 0.5, -outerRadius - 0.1, 0],
                  [halfRunLength - 0.5, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.1, 0],
                  [halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Text
                position={[halfRunLength - 0.25, -outerRadius - 0.35, 0]}
                fontSize={0.15}
                color="#ea580c"
                anchorX="center"
                anchorY="middle"
              >
                R/F 50mm
              </Text>
            </>
          ) : outletFlangeType === "loose" ? (
            <>
              {/* Loose flange: Closure piece attached to tee, then 100mm gap, then flange floating */}
              {/* Hollow closure pipe piece - simple geometry approach */}
              <group
                position={[halfRunLength + closureLengthMm / scaleFactor / 2, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <mesh>
                  <cylinderGeometry
                    args={[outerRadius, outerRadius, closureLengthMm / scaleFactor, 32, 1, true]}
                  />
                  <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry
                    args={[
                      innerRadius,
                      innerRadius,
                      closureLengthMm / scaleFactor + 0.01,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange floating 100mm (1.0 scene units) away from closure piece */}
              <FlangeComponent
                position={[halfRunLength + closureLengthMm / scaleFactor + 1.0, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(od + 3) / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Closure length dimension line */}
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.15, 0],
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.15, 0],
                ]}
                color="#2563eb"
                lineWidth={2}
              />
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.1, 0],
                  [halfRunLength, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              <Line
                points={[
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.1, 0],
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.2, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              {/* L/F label with closure length */}
              <Text
                position={[
                  halfRunLength + closureLengthMm / scaleFactor / 2,
                  -outerRadius - 0.35,
                  0,
                ]}
                fontSize={0.15}
                color="#2563eb"
                anchorX="center"
                anchorY="middle"
              >
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap dimension line */}
              <Line
                points={[
                  [halfRunLength + closureLengthMm / scaleFactor, -outerRadius - 0.5, 0],
                  [halfRunLength + closureLengthMm / scaleFactor + 1.0, -outerRadius - 0.5, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
              />
              <Text
                position={[
                  halfRunLength + closureLengthMm / scaleFactor + 0.5,
                  -outerRadius - 0.65,
                  0,
                ]}
                fontSize={0.12}
                color="#9333ea"
                anchorX="center"
                anchorY="middle"
              >
                100mm gap
              </Text>
            </>
          ) : (
            <>
              <FlangeComponent
                position={[halfRunLength + runFlangeSpecs.thickness / scaleFactor, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={od / scaleFactor}
                thickness={runFlangeSpecs.thickness / scaleFactor}
                pcd={runFlangeSpecs.pcd / scaleFactor}
                boltHoles={runFlangeSpecs.boltHoles}
                holeID={runFlangeSpecs.holeID / scaleFactor}
              />
              {/* Flange welds - inside and outside */}
              <FlangeWeldRing
                position={[halfRunLength, 0, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                pipeOuterRadius={outerRadius}
                pipeInnerRadius={innerRadius}
                weldThickness={0.08}
              />
            </>
          ))}

        {/* Branch flange (top of branch) */}
        {hasBranchFlange &&
          (branchFlangeType === "rotating" ? (
            <>
              {/* Retaining ring welded at pipe end (top of branch) */}
              <RetainingRingComponent
                position={[branchOffsetX, height + 0.02, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                pipeOuterRadius={branchOuterRadius}
                pipeInnerRadius={branchInnerRadius}
                thickness={0.02}
              />
              {/* Rotating flange positioned 50mm (0.5 scene units) down from ring */}
              <RotatingFlangeComponent
                position={[branchOffsetX, height - 0.5, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                pipeOuterDiameter={branchOD / scaleFactor}
                thickness={branchFlangeSpecs.thickness / scaleFactor}
                pcd={branchFlangeSpecs.pcd / scaleFactor}
                boltHoles={branchFlangeSpecs.boltHoles}
                holeID={branchFlangeSpecs.holeID / scaleFactor}
              />
              {/* R/F dimension line (vertical, on the side of branch) */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.15, height - 0.5, 0],
                  [branchOffsetX + branchOuterRadius + 0.15, height, 0],
                ]}
                color="#ea580c"
                lineWidth={2}
              />
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.1, height - 0.5, 0],
                  [branchOffsetX + branchOuterRadius + 0.2, height - 0.5, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.1, height, 0],
                  [branchOffsetX + branchOuterRadius + 0.2, height, 0],
                ]}
                color="#ea580c"
                lineWidth={1}
              />
              <Text
                position={[branchOffsetX + branchOuterRadius + 0.35, height - 0.25, 0]}
                fontSize={0.15}
                color="#ea580c"
                anchorX="left"
                anchorY="middle"
              >
                R/F 50mm
              </Text>
            </>
          ) : branchFlangeType === "loose" ? (
            <>
              {/* Loose flange: Closure piece attached to branch, then 100mm gap, then flange floating */}
              {/* Hollow closure pipe piece - simple geometry approach */}
              <group position={[branchOffsetX, height + closureLengthMm / scaleFactor / 2, 0]}>
                <mesh>
                  <cylinderGeometry
                    args={[
                      branchOuterRadius,
                      branchOuterRadius,
                      closureLengthMm / scaleFactor,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeOuterMat} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <cylinderGeometry
                    args={[
                      branchInnerRadius,
                      branchInnerRadius,
                      closureLengthMm / scaleFactor + 0.01,
                      32,
                      1,
                      true,
                    ]}
                  />
                  <meshStandardMaterial {...pipeInnerMat} side={THREE.BackSide} />
                </mesh>
              </group>
              {/* Loose flange floating 100mm (1.0 scene units) above closure piece */}
              <FlangeComponent
                position={[branchOffsetX, height + closureLengthMm / scaleFactor + 1.0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={(branchOD + 3) / scaleFactor}
                thickness={branchFlangeSpecs.thickness / scaleFactor}
                pcd={branchFlangeSpecs.pcd / scaleFactor}
                boltHoles={branchFlangeSpecs.boltHoles}
                holeID={branchFlangeSpecs.holeID / scaleFactor}
              />
              {/* Closure length dimension line */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.15, height, 0],
                  [
                    branchOffsetX + branchOuterRadius + 0.15,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                ]}
                color="#2563eb"
                lineWidth={2}
              />
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.1, height, 0],
                  [branchOffsetX + branchOuterRadius + 0.2, height, 0],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              <Line
                points={[
                  [
                    branchOffsetX + branchOuterRadius + 0.1,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                  [
                    branchOffsetX + branchOuterRadius + 0.2,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                ]}
                color="#2563eb"
                lineWidth={1}
              />
              {/* L/F label */}
              <Text
                position={[
                  branchOffsetX + branchOuterRadius + 0.35,
                  height + closureLengthMm / scaleFactor / 2,
                  0,
                ]}
                fontSize={0.15}
                color="#2563eb"
                anchorX="left"
                anchorY="middle"
              >
                {`L/F ${closureLengthMm}mm`}
              </Text>
              {/* 100mm gap dimension line */}
              <Line
                points={[
                  [
                    branchOffsetX + branchOuterRadius + 0.4,
                    height + closureLengthMm / scaleFactor,
                    0,
                  ],
                  [
                    branchOffsetX + branchOuterRadius + 0.4,
                    height + closureLengthMm / scaleFactor + 1.0,
                    0,
                  ],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
              />
              <Text
                position={[
                  branchOffsetX + branchOuterRadius + 0.6,
                  height + closureLengthMm / scaleFactor + 0.5,
                  0,
                ]}
                fontSize={0.12}
                color="#9333ea"
                anchorX="left"
                anchorY="middle"
              >
                100mm gap
              </Text>
            </>
          ) : (
            <>
              <FlangeComponent
                position={[branchOffsetX, height + branchFlangeSpecs.thickness / scaleFactor, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
                innerDiameter={branchOD / scaleFactor}
                thickness={branchFlangeSpecs.thickness / scaleFactor}
                pcd={branchFlangeSpecs.pcd / scaleFactor}
                boltHoles={branchFlangeSpecs.boltHoles}
                holeID={branchFlangeSpecs.holeID / scaleFactor}
              />
              {/* Flange welds - inside and outside */}
              <FlangeWeldRing
                position={[branchOffsetX, height, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                pipeOuterRadius={branchOuterRadius}
                pipeInnerRadius={branchInnerRadius}
                weldThickness={0.08}
              />
            </>
          ))}

        {/* Blank Flanges - solid disc flanges positioned 50mm from fixed flanges */}
        {/* Blank flange gap distance: 50mm = 0.5 in scene units (50/100) */}
        {hasBlankInlet && (
          <>
            <BlankFlangeComponent
              position={[-halfRunLength - (2 * runFlangeSpecs.thickness) / scaleFactor - 0.5, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
              thickness={runFlangeSpecs.thickness / scaleFactor}
              pcd={runFlangeSpecs.pcd / scaleFactor}
              boltHoles={runFlangeSpecs.boltHoles}
              holeID={runFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[
                -halfRunLength - (2 * runFlangeSpecs.thickness) / scaleFactor - 0.25,
                -outerRadius - 0.2,
                0,
              ]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="center"
              anchorY="top"
            >
              BLANK
            </Text>
          </>
        )}
        {hasBlankOutlet && (
          <>
            <BlankFlangeComponent
              position={[halfRunLength + (2 * runFlangeSpecs.thickness) / scaleFactor + 0.5, 0, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              outerDiameter={runFlangeSpecs.flangeOD / scaleFactor}
              thickness={runFlangeSpecs.thickness / scaleFactor}
              pcd={runFlangeSpecs.pcd / scaleFactor}
              boltHoles={runFlangeSpecs.boltHoles}
              holeID={runFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[
                halfRunLength + (2 * runFlangeSpecs.thickness) / scaleFactor + 0.75,
                -outerRadius - 0.2,
                0,
              ]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="center"
              anchorY="top"
            >
              BLANK
            </Text>
          </>
        )}
        {hasBlankBranch && (
          <>
            <BlankFlangeComponent
              position={[
                branchOffsetX,
                height + (2 * branchFlangeSpecs.thickness) / scaleFactor + 0.5,
                0,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
              outerDiameter={branchFlangeSpecs.flangeOD / scaleFactor}
              thickness={branchFlangeSpecs.thickness / scaleFactor}
              pcd={branchFlangeSpecs.pcd / scaleFactor}
              boltHoles={branchFlangeSpecs.boltHoles}
              holeID={branchFlangeSpecs.holeID / scaleFactor}
            />
            <Text
              position={[
                branchOffsetX - branchOuterRadius - 0.3,
                height + (2 * branchFlangeSpecs.thickness) / scaleFactor + 0.5,
                0,
              ]}
              fontSize={0.12}
              color="#cc3300"
              anchorX="right"
              anchorY="middle"
            >
              BLANK
            </Text>
          </>
        )}

        {/* Dimension lines */}
        {/* Branch C/F dimension (vertical) - from top of main pipe to branch top/flange face */}
        {/* Positioned away from model with dotted extension lines */}
        {(() => {
          // Offset from branch edge for dimension line
          const dimOffset = 0.25;
          const dimX = branchOffsetX + branchOuterRadius + dimOffset;
          const extendX = branchOffsetX + branchOuterRadius + dimOffset + 0.15;
          // C/F is from run OD to branch top
          const branchCF = teeHeight - od / 2 / (scaleFactor / 2);
          return (
            <>
              {/* Main dimension line - from top of run pipe to top of branch */}
              <Line
                points={[
                  [dimX, outerRadius, 0],
                  [dimX, height, 0],
                ]}
                color="#dc2626"
                lineWidth={2}
              />
              {/* End caps */}
              <Line
                points={[
                  [dimX - 0.08, outerRadius, 0],
                  [dimX + 0.08, outerRadius, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
              />
              <Line
                points={[
                  [dimX - 0.08, height, 0],
                  [dimX + 0.08, height, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
              />
              {/* Dotted extension line from run pipe surface to dimension */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.02, outerRadius, 0],
                  [dimX, outerRadius, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Dotted extension line from branch top/flange to dimension */}
              <Line
                points={[
                  [branchOffsetX + branchOuterRadius + 0.02, height, 0],
                  [dimX, height, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Dotted line showing pipe center reference */}
              <Line
                points={[
                  [branchOffsetX, 0, 0],
                  [extendX, 0, 0],
                ]}
                color="#dc2626"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Label */}
              <Text
                position={[extendX + 0.05, (outerRadius + height) / 2, 0]}
                fontSize={0.15}
                color="#dc2626"
                anchorX="left"
                anchorY="middle"
                fontWeight="bold"
              >
                {`C/F: ${Math.round(teeHeight - od / 2)}mm`}
              </Text>
            </>
          );
        })()}

        {/* Total run pipe length dimension - at bottom of main pipe */}
        {(() => {
          // Offset below pipe
          const dimOffset = 0.25;
          const dimY = -outerRadius - dimOffset;
          return (
            <>
              {/* Main dimension line */}
              <Line
                points={[
                  [-halfRunLength, dimY, 0],
                  [halfRunLength, dimY, 0],
                ]}
                color="#9333ea"
                lineWidth={2}
              />
              {/* End caps */}
              <Line
                points={[
                  [-halfRunLength, dimY - 0.08, 0],
                  [-halfRunLength, dimY + 0.08, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
              />
              <Line
                points={[
                  [halfRunLength, dimY - 0.08, 0],
                  [halfRunLength, dimY + 0.08, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
              />
              {/* Dotted extension lines from pipe ends to dimension */}
              <Line
                points={[
                  [-halfRunLength, -outerRadius - 0.02, 0],
                  [-halfRunLength, dimY, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              <Line
                points={[
                  [halfRunLength, -outerRadius - 0.02, 0],
                  [halfRunLength, dimY, 0],
                ]}
                color="#9333ea"
                lineWidth={1}
                dashed
                dashSize={0.03}
                gapSize={0.02}
              />
              {/* Label */}
              <Text
                position={[0, dimY - 0.12, 0]}
                fontSize={0.15}
                color="#9333ea"
                anchorX="center"
                anchorY="top"
                fontWeight="bold"
              >
                {`L: ${totalRunLength}mm`}
              </Text>
            </>
          );
        })()}

        {/* Branch position dimension line (horizontal from left end to branch center) */}
        {branchPositionMm !== undefined &&
          (() => {
            // Offset below pipe (below the length dimension)
            const dimOffset = 0.4;
            const dimY = -outerRadius - dimOffset;
            return (
              <>
                {/* Main dimension line */}
                <Line
                  points={[
                    [-halfRunLength, dimY, 0],
                    [branchOffsetX, dimY, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={2}
                />
                {/* End caps */}
                <Line
                  points={[
                    [-halfRunLength, dimY - 0.06, 0],
                    [-halfRunLength, dimY + 0.06, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                />
                <Line
                  points={[
                    [branchOffsetX, dimY - 0.06, 0],
                    [branchOffsetX, dimY + 0.06, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                />
                {/* Dotted extension line from left pipe end */}
                <Line
                  points={[
                    [-halfRunLength, -outerRadius - 0.27, 0],
                    [-halfRunLength, dimY, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                  dashed
                  dashSize={0.03}
                  gapSize={0.02}
                />
                {/* Dotted extension line to branch center */}
                <Line
                  points={[
                    [branchOffsetX, 0, 0],
                    [branchOffsetX, dimY, 0],
                  ]}
                  color="#16a34a"
                  lineWidth={1}
                  dashed
                  dashSize={0.03}
                  gapSize={0.02}
                />
                {/* Label */}
                <Text
                  position={[(-halfRunLength + branchOffsetX) / 2, dimY - 0.1, 0]}
                  fontSize={0.12}
                  color="#16a34a"
                  anchorX="center"
                  anchorY="top"
                  fontWeight="bold"
                >
                  {`Branch pos: ${branchPositionMm}mm`}
                </Text>
              </>
            );
          })()}

        {/* Gusset dimension for gusset tees - shows width across the gusset plate */}
        {/* Positioned away from gusset with dotted extension lines */}
        {teeType === "gusset" &&
          gussetSize > 0 &&
          (() => {
            // Offset from gusset surface (150mm scaled)
            const dimOffset = 0.15;
            // Gusset inner edge at z=0: X = branchOffsetX + branchOuterRadius, Y = outerRadius + gussetSize/2
            // Gusset outer edge at z=0: X = branchOffsetX + branchOuterRadius + gussetSize/2, Y = outerRadius
            const innerX = branchOffsetX + branchOuterRadius;
            const innerY = outerRadius + gussetSize / 2;
            const outerX = branchOffsetX + branchOuterRadius + gussetSize / 2;
            const outerY = outerRadius;
            // Offset dimension line perpendicular to the gusset surface (45 degrees, so offset in both X and Y)
            // 1/sqrt(2) for 45 degree offset
            const offsetDir = Math.SQRT1_2;
            const dimInnerX = innerX + dimOffset * offsetDir;
            const dimInnerY = innerY + dimOffset * offsetDir;
            const dimOuterX = outerX + dimOffset * offsetDir;
            const dimOuterY = outerY + dimOffset * offsetDir;
            return (
              <>
                {/* Main dimension line - offset from gusset surface */}
                <Line
                  points={[
                    [dimInnerX, dimInnerY, 0.02],
                    [dimOuterX, dimOuterY, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={2}
                />
                {/* End caps perpendicular to the 45-degree line */}
                <Line
                  points={[
                    [dimInnerX - 0.04, dimInnerY + 0.04, 0.02],
                    [dimInnerX + 0.04, dimInnerY - 0.04, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                />
                <Line
                  points={[
                    [dimOuterX - 0.04, dimOuterY + 0.04, 0.02],
                    [dimOuterX + 0.04, dimOuterY - 0.04, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                />
                {/* Dotted extension line from gusset inner edge to dimension */}
                <Line
                  points={[
                    [innerX, innerY, 0.02],
                    [dimInnerX, dimInnerY, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                  dashed
                  dashSize={0.02}
                  gapSize={0.015}
                />
                {/* Dotted extension line from gusset outer edge to dimension */}
                <Line
                  points={[
                    [outerX, outerY, 0.02],
                    [dimOuterX, dimOuterY, 0.02],
                  ]}
                  color="#0066cc"
                  lineWidth={1}
                  dashed
                  dashSize={0.02}
                  gapSize={0.015}
                />
                {/* Label */}
                <Text
                  position={[
                    (dimInnerX + dimOuterX) / 2 + 0.1,
                    (dimInnerY + dimOuterY) / 2 + 0.1,
                    0.02,
                  ]}
                  fontSize={0.12}
                  color="#0066cc"
                  anchorX="left"
                  anchorY="bottom"
                  fontWeight="bold"
                >
                  {`C: ${gussetSection}mm`}
                </Text>
              </>
            );
          })()}
      </group>
    </Center>
  );
}

// Main Preview component
export default function Tee3DPreview(props: Tee3DPreviewProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const captureRef = useRef<(() => string | null) | null>(null);
  const { outerDiameterFromNB: getOuterDiameter } = useNbToOdLookup();

  const debouncedProps = useDebouncedProps(props, 100);

  // Handle escape key to close expanded modal
  useEffect(() => {
    if (!isExpanded) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  // Get dimensions using proper lookup tables
  const dims = getSabs719TeeDimensions(debouncedProps.nominalBore);
  const rawBranchNominalBore = debouncedProps.branchNominalBore;
  // Effective branch NB - either reducing tee (branchNominalBore) or unequal tee (teeNominalBore)
  const effectiveBranchNB = rawBranchNominalBore || debouncedProps.teeNominalBore;
  const branchDims = effectiveBranchNB ? getSabs719TeeDimensions(effectiveBranchNB) : null;
  const dimsOuterDiameterMm2 = dims?.outsideDiameterMm;
  const branchDimsOuterDiameterMm2 = branchDims?.outsideDiameterMm;
  const rawOuterDiameter = debouncedProps.outerDiameter;
  const od = getOuterDiameter(
    debouncedProps.nominalBore,
    rawOuterDiameter || dimsOuterDiameterMm2 || 0,
  );
  const rawWallThickness = debouncedProps.wallThickness;
  const wt = getWallThickness(debouncedProps.nominalBore, rawWallThickness || 0);
  const id = od - 2 * wt;
  const rawBranchOuterDiameter = debouncedProps.branchOuterDiameter;
  // Branch dimensions for reducing/unequal tees
  const branchOD = effectiveBranchNB
    ? getOuterDiameter(effectiveBranchNB, rawBranchOuterDiameter || branchDimsOuterDiameterMm2 || 0)
    : od;
  const branchWT = effectiveBranchNB ? getWallThickness(effectiveBranchNB) : wt;
  const branchID = branchOD - 2 * branchWT;
  const teeHeight = getTeeHeight(debouncedProps.nominalBore, debouncedProps.teeType);
  const gussetSection =
    debouncedProps.teeType === "gusset" ? getGussetSection(debouncedProps.nominalBore) : 0;
  // Get flange specs for display
  const { specs: runFlangeSpecs, isFromApi: runIsFromApi } = getFlangeSpecs(
    debouncedProps.nominalBore,
    debouncedProps.flangeSpecs,
  );
  const rawTeeFlangeSpecs2 = debouncedProps.teeFlangeSpecs;
  // For branch/tee flange, use teeFlangeSpecs if provided (unequal tees), otherwise use main flangeSpecs
  const branchFlangeData = rawTeeFlangeSpecs2 || debouncedProps.flangeSpecs;
  const { specs: branchFlangeSpecs, isFromApi: branchIsFromApi } = getFlangeSpecs(
    effectiveBranchNB || debouncedProps.nominalBore,
    branchFlangeData,
  );
  const rawFlangeStandardName = debouncedProps.flangeStandardName;
  const flangeStandardName = rawFlangeStandardName || "SABS 1123";
  const isNonSabsStandard =
    !flangeStandardName.toLowerCase().includes("sabs") &&
    !flangeStandardName.toLowerCase().includes("sans");
  const showRunFallbackWarning = !runIsFromApi && isNonSabsStandard;
  const showBranchFallbackWarning = !branchIsFromApi && isNonSabsStandard;
  const rawClosureLengthMm = debouncedProps.closureLengthMm;
  const closureLength = rawClosureLengthMm || 150;
  const rawRunLength = debouncedProps.runLength;
  const baseRunLengthMm = rawRunLength || od * 3;
  const runLengthMm =
    baseRunLengthMm +
    (debouncedProps.hasInletFlange ? closureLength : 0) +
    (debouncedProps.hasOutletFlange ? closureLength : 0);
  const branchHeightMm = teeHeight + (debouncedProps.hasBranchFlange ? closureLength : 0);
  const rawHasInletFlange = debouncedProps.hasInletFlange;
  const depthMm =
    od + (rawHasInletFlange || debouncedProps.hasOutletFlange ? runFlangeSpecs.thickness : 0);
  const runExtent = (runLengthMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const heightExtent = (branchHeightMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const depthExtent = (depthMm / SCALE_FACTOR) * PREVIEW_SCALE;
  const boundingRadius = Math.max(
    0.4,
    Math.sqrt((runExtent / 2) ** 2 + (heightExtent / 2) ** 2 + (depthExtent / 2) ** 2),
  );
  const computeDistance = (fov: number) => {
    const fovRad = (fov * Math.PI) / 180;
    const dist = boundingRadius / Math.sin(fovRad / 2);
    return Math.min(Math.max(dist * 1.15, MIN_CAMERA_DISTANCE), MAX_CAMERA_DISTANCE);
  };
  const defaultCameraDistance = computeDistance(50);
  const expandedCameraDistance = computeDistance(45);
  const defaultCameraPosition = useMemo(
    () =>
      [defaultCameraDistance, defaultCameraDistance * 0.8, defaultCameraDistance] as [
        number,
        number,
        number,
      ],
    [defaultCameraDistance],
  );
  const expandedCameraPosition = useMemo(
    () =>
      [expandedCameraDistance, expandedCameraDistance * 0.85, expandedCameraDistance] as [
        number,
        number,
        number,
      ],
    [expandedCameraDistance],
  );
  const defaultControls = useMemo(
    () => ({
      min: Math.max(defaultCameraDistance * 0.4, 0.8),
      max: Math.min(defaultCameraDistance * 4, MAX_CAMERA_DISTANCE * 1.5),
    }),
    [defaultCameraDistance],
  );
  const expandedControls = useMemo(
    () => ({
      min: Math.max(expandedCameraDistance * 0.35, 0.8),
      max: Math.min(expandedCameraDistance * 4, MAX_CAMERA_DISTANCE * 2),
    }),
    [expandedCameraDistance],
  );

  // Hidden state
  if (isHidden) {
    return (
      <div className="w-full bg-slate-100 rounded-md border border-slate-200 px-3 py-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          3D Preview - SABS 719 {props.teeType === "gusset" ? "Gusset" : "Short"} Tee (
          {props.nominalBore}NB)
        </span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-[10px] text-blue-600 bg-white px-2 py-1 rounded shadow-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-1"
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Show Drawing
        </button>
      </div>
    );
  }

  const rawHasInletFlange4 = props.hasInletFlange;

  return (
    <div
      data-tee-preview
      className="w-full h-full min-h-[500px] bg-slate-50 rounded-md border border-slate-200 overflow-hidden relative"
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: defaultCameraPosition, fov: 50, near: 0.01, far: 50000 }}
        style={{ width: "100%", height: "100%" }}
      >
        <SceneShell
          captureRef={captureRef}
          contactShadows={{ position: [0, -3, 0], opacity: 0.3, scale: 20, blur: 2 }}
          orbitControls={{
            enablePan: false,
            minDistance: defaultControls.min,
            maxDistance: defaultControls.max,
          }}
        >
          <TeeScene {...debouncedProps} />
        </SceneShell>
        <CameraTracker
          label="Tee"
          onCameraChange={props.onCameraChange}
          savedPosition={props.savedCameraPosition}
          savedTarget={props.savedCameraTarget}
        />
      </Canvas>
      {/* Badge - top left */}
      <div className="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-1 rounded shadow-sm">
        <span className="text-purple-700" style={{ fontWeight: 500 }}>
          SABS 719 {props.teeType === "gusset" ? "Gusset" : "Short"} Tee
        </span>
      </div>
      {/* Pipe & Tee Info - top right */}
      <div
        data-info-box
        className="absolute top-2 right-2 text-[10px] bg-white px-2 py-1.5 rounded shadow-md leading-snug border border-gray-200"
      >
        <div className="font-bold text-blue-800 mb-0.5">RUN PIPE ({props.nominalBore}NB)</div>
        <div className="text-gray-900 font-medium">
          OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm
        </div>
        <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
        {props.branchNominalBore && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">
              BRANCH ({props.branchNominalBore}NB)
            </div>
            <div className="text-gray-900 font-medium">
              OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
            </div>
            <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
          </>
        )}
        {props.teeNominalBore && (
          <>
            <div className="font-bold text-blue-800 mt-1 mb-0.5">
              TEE PIPE ({props.teeNominalBore}NB)
            </div>
            <div className="text-gray-900 font-medium">
              OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
            </div>
            <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
          </>
        )}
        <div className="text-gray-700 mt-1">Height: {teeHeight}mm</div>
        {props.teeType === "gusset" && (
          <div className="text-gray-700">Gusset: {gussetSection}mm</div>
        )}
        {/* Flange details - show once for equal tees, separate for reducing/unequal tees */}
        {(() => {
          const rawHasInletFlange2 = props.hasInletFlange;
          const hasAnyFlange = rawHasInletFlange2 || props.hasOutletFlange || props.hasBranchFlange;
          const isEqualTee = !props.branchNominalBore && !props.teeNominalBore;
          const flangeDesignation = (() => {
            const rawPressureClassDesignation = props.pressureClassDesignation;
            const designation = rawPressureClassDesignation || "";
            const rawFlangeTypeCode = props.flangeTypeCode;
            const flangeType = rawFlangeTypeCode || "";
            const pressureMatch = designation.match(/^(\d+)/);
            const pressureValue = pressureMatch
              ? pressureMatch[1]
              : designation.replace(/\/\d+$/, "");
            return `${flangeStandardName} T${pressureValue}${flangeType}`;
          })();

          if (!hasAnyFlange) return null;

          if (isEqualTee) {
            return (
              <>
                <div className="font-bold text-blue-800 mt-1 mb-0.5">FLANGE (ALL OUTLETS)</div>
                {showRunFallbackWarning && (
                  <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                    Data not available for {flangeStandardName} - showing SABS 1123 reference values
                  </div>
                )}
                <div className="text-gray-900 font-medium">
                  OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm
                </div>
                <div className="text-gray-700">
                  Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm
                </div>
                <div className="text-gray-700">
                  Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} ×{" "}
                  {runFlangeSpecs.boltLength}mm
                </div>
                <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
                <div
                  className={
                    showRunFallbackWarning
                      ? "text-orange-600 font-medium text-[9px]"
                      : "text-green-700 font-medium text-[9px]"
                  }
                >
                  {flangeDesignation}
                </div>
              </>
            );
          }

          const rawHasInletFlange3 = props.hasInletFlange;

          return (
            <>
              {(rawHasInletFlange3 || props.hasOutletFlange) && (
                <>
                  <div className="font-bold text-blue-800 mt-1 mb-0.5">RUN FLANGE</div>
                  {showRunFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} ×{" "}
                    {runFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showRunFallbackWarning
                        ? "text-orange-600 font-medium text-[9px]"
                        : "text-green-700 font-medium text-[9px]"
                    }
                  >
                    {flangeDesignation}
                  </div>
                </>
              )}
              {props.hasBranchFlange && (
                <>
                  <div className="font-bold text-blue-800 mt-1 mb-0.5">
                    {props.teeNominalBore ? "TEE FLANGE" : "BRANCH FLANGE"}
                  </div>
                  {showBranchFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {branchFlangeSpecs.flangeOD}mm | PCD: {branchFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {branchFlangeSpecs.boltHoles} × Ø{branchFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {branchFlangeSpecs.boltHoles} × M{branchFlangeSpecs.boltSize} ×{" "}
                    {branchFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {branchFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showBranchFallbackWarning
                        ? "text-orange-600 font-medium text-[9px]"
                        : "text-green-700 font-medium text-[9px]"
                    }
                  >
                    {flangeDesignation}
                  </div>
                </>
              )}
            </>
          );
        })()}
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
      {/* Bottom toolbar - Expand, Drag hint, and Hide button in horizontal row */}
      <div className="absolute bottom-2 right-2 flex flex-row items-center gap-2">
        <button
          onClick={() => setIsExpanded(true)}
          className="text-[10px] text-blue-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-1"
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
            const container = document.querySelector("[data-tee-preview]");
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
                      <title>3D Tee Drawing</title>
                      <style>
                        body { margin: 15px; font-family: Arial, sans-serif; }
                        .drawing-section { width: 100%; margin-bottom: 15px; }
                        .drawing-section img { width: 100%; border: 1px solid #ccc; }
                        .info-container { display: flex; gap: 20px; }
                        .info-column { flex: 1; padding: 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; font-size: 11px; }
                        .info-column > div { margin-bottom: 3px; }
                        .font-bold { font-weight: bold; margin-top: 8px; }
                        .text-blue-800 { color: #1e40af; }
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
          className="text-[10px] text-green-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-1"
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
            const runOd = od;
            const branchOdVal = branchOD;
            const height = teeHeight;

            let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
            dxf += "0\nSECTION\n2\nENTITIES\n";

            const runTop = runOd / 2;
            const runBottom = -runOd / 2;
            const runLength = runOd * 3;

            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${-runLength / 2}\n20\n${runTop}\n11\n${runLength / 2}\n21\n${runTop}\n`;
            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${-runLength / 2}\n20\n${runBottom}\n11\n${runLength / 2}\n21\n${runBottom}\n`;

            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${-runLength / 2}\n20\n${runTop}\n11\n${-runLength / 2}\n21\n${runBottom}\n`;
            dxf += `0\nLINE\n8\nRUN_PIPE\n10\n${runLength / 2}\n20\n${runTop}\n11\n${runLength / 2}\n21\n${runBottom}\n`;

            const branchLeft = -branchOdVal / 2;
            const branchRight = branchOdVal / 2;
            dxf += `0\nLINE\n8\nBRANCH\n62\n3\n10\n${branchLeft}\n20\n${runTop}\n11\n${branchLeft}\n21\n${runTop + height}\n`;
            dxf += `0\nLINE\n8\nBRANCH\n62\n3\n10\n${branchRight}\n20\n${runTop}\n11\n${branchRight}\n21\n${runTop + height}\n`;
            dxf += `0\nLINE\n8\nBRANCH\n62\n3\n10\n${branchLeft}\n20\n${runTop + height}\n11\n${branchRight}\n21\n${runTop + height}\n`;

            dxf += `0\nTEXT\n8\nDIMENSION\n10\n0\n20\n${runBottom - 30}\n40\n15\n1\nSABS 719 ${props.teeType === "gusset" ? "GUSSET" : "SHORT"} TEE\n72\n1\n11\n0\n21\n${runBottom - 30}\n`;
            dxf += `0\nTEXT\n8\nDIMENSION\n10\n0\n20\n${runBottom - 50}\n40\n12\n1\nRun: ${props.nominalBore}NB | Branch: ${props.branchNominalBore}NB\n72\n1\n11\n0\n21\n${runBottom - 50}\n`;

            dxf += "0\nENDSEC\n0\nEOF\n";

            const blob = new Blob([dxf], { type: "application/dxf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tee_${props.nominalBore}x${props.branchNominalBore}NB.dxf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="text-[10px] text-orange-600 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-1"
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
          onClick={() => setIsHidden(true)}
          className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded shadow-sm hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center gap-1"
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
          Hide Drawing
        </button>
      </div>
      {/* Expanded Modal - centered in viewport */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative w-full h-full max-w-6xl max-h-[90vh] bg-slate-100 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 z-50 bg-white hover:bg-white text-gray-700 p-3 rounded-full shadow-xl transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Expanded Canvas */}
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ position: expandedCameraPosition, fov: 45, near: 0.01, far: 50000 }}
            >
              <SceneShell
                contactShadows={{ position: [0, -3, 0], opacity: 0.3, scale: 20, blur: 2 }}
                orbitControls={{
                  enablePan: true,
                  minDistance: expandedControls.min,
                  maxDistance: expandedControls.max,
                }}
              >
                <TeeScene {...debouncedProps} />
              </SceneShell>
              <CameraTracker
                label="Tee"
                onCameraChange={props.onCameraChange}
                savedPosition={props.savedCameraPosition}
                savedTarget={props.savedCameraTarget}
              />
            </Canvas>

            {/* Info overlay in expanded view */}
            <div className="absolute top-4 left-4 text-sm bg-white/95 px-3 py-2 rounded-lg shadow-lg border border-gray-200">
              <div className="font-bold text-blue-800 mb-1">RUN PIPE ({props.nominalBore}NB)</div>
              <div className="text-gray-900 font-medium">
                OD: {od.toFixed(0)}mm | ID: {id.toFixed(0)}mm
              </div>
              <div className="text-gray-700">WT: {wt.toFixed(1)}mm</div>
              {props.branchNominalBore && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">
                    BRANCH ({props.branchNominalBore}NB)
                  </div>
                  <div className="text-gray-900 font-medium">
                    OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
                  </div>
                  <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
                </>
              )}
              {props.teeNominalBore && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">
                    TEE PIPE ({props.teeNominalBore}NB)
                  </div>
                  <div className="text-gray-900 font-medium">
                    OD: {branchOD.toFixed(0)}mm | ID: {branchID.toFixed(0)}mm
                  </div>
                  <div className="text-gray-700">WT: {branchWT.toFixed(1)}mm</div>
                </>
              )}
              <div className="text-gray-700 mt-2">Height: {teeHeight}mm</div>
              {props.teeType === "gusset" && (
                <div className="text-gray-700">Gusset: {gussetSection}mm</div>
              )}
              {(rawHasInletFlange4 || props.hasOutletFlange) && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">RUN FLANGE</div>
                  {showRunFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {runFlangeSpecs.flangeOD}mm | PCD: {runFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {runFlangeSpecs.boltHoles} × Ø{runFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {runFlangeSpecs.boltHoles} × M{runFlangeSpecs.boltSize} ×{" "}
                    {runFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {runFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showRunFallbackWarning
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
                      return `${flangeStandardName} T${pressureValue}${flangeType}`;
                    })()}
                  </div>
                </>
              )}
              {props.hasBranchFlange && (
                <>
                  <div className="font-bold text-blue-800 mt-2 mb-1">
                    {props.teeNominalBore ? "TEE FLANGE" : "BRANCH FLANGE"}
                  </div>
                  {showBranchFallbackWarning && (
                    <div className="text-orange-600 text-[9px] font-medium bg-orange-50 px-1 py-0.5 rounded mt-0.5">
                      Data not available for {flangeStandardName} - showing SABS 1123 reference
                      values
                    </div>
                  )}
                  <div className="text-gray-900 font-medium">
                    OD: {branchFlangeSpecs.flangeOD}mm | PCD: {branchFlangeSpecs.pcd}mm
                  </div>
                  <div className="text-gray-700">
                    Holes: {branchFlangeSpecs.boltHoles} × Ø{branchFlangeSpecs.holeID}mm
                  </div>
                  <div className="text-gray-700">
                    Bolts: {branchFlangeSpecs.boltHoles} × M{branchFlangeSpecs.boltSize} ×{" "}
                    {branchFlangeSpecs.boltLength}mm
                  </div>
                  <div className="text-gray-700">Thickness: {branchFlangeSpecs.thickness}mm</div>
                  <div
                    className={
                      showBranchFallbackWarning
                        ? "text-orange-600 font-medium"
                        : "text-green-700 font-medium"
                    }
                  >
                    {(() => {
                      const rawPressureClassDesignation3 = props.pressureClassDesignation;
                      const designation = rawPressureClassDesignation3 || "";
                      const rawFlangeTypeCode3 = props.flangeTypeCode;
                      const flangeType = rawFlangeTypeCode3 || "";
                      const pressureMatch = designation.match(/^(\d+)/);
                      const pressureValue = pressureMatch
                        ? pressureMatch[1]
                        : designation.replace(/\/\d+$/, "");
                      return `${flangeStandardName} T${pressureValue}${flangeType}`;
                    })()}
                  </div>
                </>
              )}
            </div>

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
