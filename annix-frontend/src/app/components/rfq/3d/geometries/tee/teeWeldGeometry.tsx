"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { STEELWORK_MATERIALS, WELD_MATERIALS } from "@/app/lib/config/rfq/rendering3DStandards";

const weldColor = WELD_MATERIALS.standard;
const gussetColor = STEELWORK_MATERIALS.rib;

export function GussetPlate({
  runRadius,
  branchRadius,
  gussetLength,
  thickness,
  side,
  branchOffsetX,
}: {
  runRadius: number;
  branchRadius: number;
  gussetLength: number;
  thickness: number;
  side: "left" | "right";
  branchOffsetX: number;
}) {
  const geometry = useMemo(() => {
    // Higher resolution for smooth gusset shape
    const segments = 48;
    const vertices: number[] = [];
    const indices: number[] = [];

    const xDir = side === "left" ? -1 : 1;
    const halfWidth = gussetLength / 2;

    // The gusset spans from front V-point (Z = +branchRadius) to back V-point (Z = -branchRadius)
    // At each Z position, it has a width that varies from 0 at the V-points to maximum at center
    // The outer edge follows the saddle curve, the inner edge extends toward the run center

    // Extend slightly beyond branchRadius to ensure gusset reaches V-weld points
    const zExtent = branchRadius * 1.02;

    // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with saddle curve; declarative harms readability and performance
    for (let ui = 0; ui <= segments; ui++) {
      const u = ui / segments;
      // Z goes from front V-weld to back V-weld
      const z = zExtent * (1 - 2 * u);

      // Clamp Z to branchRadius for saddle curve calculations
      const zClamped = Math.max(-branchRadius, Math.min(branchRadius, z));

      // Y position on run pipe surface - follows the saddle/V-weld curve
      const yOnRun = Math.sqrt(Math.max(0, runRadius * runRadius - zClamped * zClamped));

      // Width at this Z position - diamond shape, widest at center (z=0)
      // At the V-points, width = 0, so gusset comes to a point
      const zNormalized = Math.max(-1, Math.min(1, zClamped / branchRadius));
      const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
      const currentHalfWidth = halfWidth * widthFraction;

      // X position at saddle curve (where branch meets run on this side)
      const xSaddleOffset = Math.sqrt(
        Math.max(0, branchRadius * branchRadius - zClamped * zClamped),
      );
      const xAtSaddle = branchOffsetX + xDir * xSaddleOffset;

      // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with saddle curve; declarative harms readability and performance
      for (let vi = 0; vi <= segments; vi++) {
        const v = vi / segments;

        // v=0: inner edge (at saddle, where gusset meets branch) - higher up
        // v=1: outer edge (on run pipe surface) - at run surface level
        const xInner = xAtSaddle;
        const xOuter = xAtSaddle + xDir * currentHalfWidth;

        // Linear interpolation for X (edge to edge)
        const x = xInner * (1 - v) + xOuter * v;

        // Y creates 45-degree angle from inner to outer
        // Inner edge is elevated by currentHalfWidth (so tan(45°) = rise/run = 1)
        // Outer edge is on run pipe surface
        // At V-points (z = ±branchRadius), currentHalfWidth = 0, so both edges
        // meet at the V-weld position: Y = yOnRun = sqrt(runRadius² - branchRadius²)
        const yInner = yOnRun + currentHalfWidth;
        const yOuter = yOnRun;
        const y = yInner * (1 - v) + yOuter * v;

        vertices.push(x, y, z);
      }
    }

    // Generate triangle indices
    const vertsPerRow = segments + 1;
    // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation; declarative harms readability and performance
    for (let ui = 0; ui < segments; ui++) {
      // eslint-disable-next-line no-restricted-syntax -- nested triangle index generation; declarative harms readability and performance
      for (let vi = 0; vi < segments; vi++) {
        const a = ui * vertsPerRow + vi;
        const b = a + 1;
        const c = a + vertsPerRow;
        const d = c + 1;

        if (xDir > 0) {
          indices.push(a, b, c);
          indices.push(b, d, c);
        } else {
          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [runRadius, branchRadius, gussetLength, thickness, side, branchOffsetX]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial {...gussetColor} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function GussetWeld({
  runRadius,
  branchRadius,
  gussetLength,
  side,
  branchOffsetX,
}: {
  runRadius: number;
  branchRadius: number;
  gussetLength: number;
  side: "left" | "right";
  branchOffsetX: number;
}) {
  const weldRadius = gussetLength * 0.015;
  const xDir = side === "left" ? -1 : 1;
  // Higher resolution for smooth weld curve
  const segments = 32;
  const halfWidth = gussetLength / 2;

  // Extend slightly beyond branchRadius to reach V-weld points
  const zExtent = branchRadius * 1.02;

  // Inner edge: elevated at 45 degrees, meeting V-weld at the endpoints
  const innerEdgePoints: THREE.Vector3[] = Array.from({ length: segments + 1 }, (_, i) => {
    const u = i / segments;
    const z = zExtent * (1 - 2 * u);
    const zClamped = Math.max(-branchRadius, Math.min(branchRadius, z));
    const yOnRun = Math.sqrt(Math.max(0, runRadius * runRadius - zClamped * zClamped));
    const zNormalized = Math.max(-1, Math.min(1, zClamped / branchRadius));
    const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
    const currentHalfWidth = halfWidth * widthFraction;
    const xSaddleOffset = Math.sqrt(Math.max(0, branchRadius * branchRadius - zClamped * zClamped));
    const x = branchOffsetX + xDir * xSaddleOffset;
    const y = yOnRun + currentHalfWidth;
    return new THREE.Vector3(x, y, z);
  });
  const innerEdgeCurve = new THREE.CatmullRomCurve3(innerEdgePoints);

  // Outer edge: follows the diamond shape outline on run pipe surface
  const outerEdgePoints: THREE.Vector3[] = Array.from({ length: segments + 1 }, (_, i) => {
    const u = i / segments;
    const z = zExtent * (1 - 2 * u);
    const zClamped = Math.max(-branchRadius, Math.min(branchRadius, z));
    const yOnRun = Math.sqrt(Math.max(0, runRadius * runRadius - zClamped * zClamped));
    const zNormalized = Math.max(-1, Math.min(1, zClamped / branchRadius));
    const widthFraction = Math.sqrt(Math.max(0, 1 - zNormalized * zNormalized));
    const currentHalfWidth = halfWidth * widthFraction;
    const xSaddleOffset = Math.sqrt(Math.max(0, branchRadius * branchRadius - zClamped * zClamped));
    const x = branchOffsetX + xDir * (xSaddleOffset + currentHalfWidth);
    return new THREE.Vector3(x, yOnRun, z);
  });
  const outerEdgeCurve = new THREE.CatmullRomCurve3(outerEdgePoints);

  return (
    <group>
      <mesh>
        <tubeGeometry args={[innerEdgeCurve, 32, weldRadius, 8, false]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
      <mesh>
        <tubeGeometry args={[outerEdgeCurve, 32, weldRadius, 8, false]} />
        <meshStandardMaterial {...weldColor} />
      </mesh>
    </group>
  );
}

export function SaddleWeld({
  runRadius,
  branchRadius,
  branchOffsetX,
  weldThickness = 0.04,
}: {
  runRadius: number;
  branchRadius: number;
  branchOffsetX: number;
  weldThickness?: number;
}) {
  const geometry = useMemo(() => {
    // Create the saddle curve - the intersection of branch cylinder with run cylinder
    // Parametric: for angle θ around branch (0 to 2π):
    // - x offset along run = branchRadius * cos(θ)
    // - y (height) = runRadius + small offset for weld sitting on top
    // - z offset = branchRadius * sin(θ) adjusted for run surface curvature
    const segments = 64;
    const points: THREE.Vector3[] = Array.from({ length: segments + 1 }, (_, i) => {
      const theta = (i / segments) * Math.PI * 2;
      const x = branchOffsetX + branchRadius * Math.cos(theta);
      const z = branchRadius * Math.sin(theta);
      const y = Math.sqrt(Math.max(0, runRadius * runRadius - z * z));
      return new THREE.Vector3(x, y, z);
    });

    // true = closed curve
    const curve = new THREE.CatmullRomCurve3(points, true);

    // Create a custom weld bead cross-section (V-groove fillet profile)
    // This gives the characteristic welding bead appearance
    const weldProfile = new THREE.Shape();
    const w = weldThickness;
    // Height slightly more than width for V profile
    const h = weldThickness * 1.2;

    // Create a rounded triangular profile for the fillet weld
    weldProfile.moveTo(0, -h * 0.3);
    weldProfile.quadraticCurveTo(w * 0.6, 0, w * 0.3, h * 0.5);
    weldProfile.quadraticCurveTo(0, h * 0.7, -w * 0.3, h * 0.5);
    weldProfile.quadraticCurveTo(-w * 0.6, 0, 0, -h * 0.3);

    const extrudeSettings = {
      steps: segments,
      bevelEnabled: false,
      extrudePath: curve,
    };

    return new THREE.ExtrudeGeometry(weldProfile, extrudeSettings);
  }, [runRadius, branchRadius, branchOffsetX, weldThickness]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial {...weldColor} />
    </mesh>
  );
}

export function FlangeWeldRing({
  position,
  rotation,
  pipeOuterRadius,
  pipeInnerRadius,
  weldThickness = 0.03,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  pipeOuterRadius: number;
  pipeInnerRadius: number;
  weldThickness?: number;
}) {
  // Outer weld bead - fillet weld on outside of pipe where it meets flange
  const outerWeldGeometry = useMemo(() => {
    const segments = 64;
    const w = weldThickness;
    const torusRadius = pipeOuterRadius + w * 0.4;
    const tubeRadius = w * 0.5;
    return new THREE.TorusGeometry(torusRadius, tubeRadius, 16, segments);
  }, [pipeOuterRadius, weldThickness]);

  // Inner weld bead - fillet weld on inside of pipe bore where it meets flange
  const innerWeldGeometry = useMemo(() => {
    const segments = 64;
    const w = weldThickness * 0.8;
    const torusRadius = pipeInnerRadius - w * 0.3;
    const tubeRadius = w * 0.4;
    return new THREE.TorusGeometry(torusRadius, tubeRadius, 16, segments);
  }, [pipeInnerRadius, weldThickness]);

  // Offset for inner weld - position it inside the pipe, not on the flange face
  const innerWeldOffset = weldThickness * 0.6;

  return (
    <group position={position} rotation={rotation}>
      {/* Outer weld bead - visible bronze weld ring on outside */}
      <mesh geometry={outerWeldGeometry} castShadow receiveShadow>
        <meshStandardMaterial {...weldColor} />
      </mesh>
      {/* Inner weld bead - positioned inside the pipe bore */}
      <mesh
        geometry={innerWeldGeometry}
        position={[0, 0, innerWeldOffset]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial {...weldColor} />
      </mesh>
    </group>
  );
}
