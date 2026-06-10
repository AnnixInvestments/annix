import * as THREE from "three";

export const createPipeGeometry = (outerR: number, innerR: number, length: number) => {
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
export const createSaddleCutBranchGeometry = (
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
export const createRunPipeWithHoleGeometry = (
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
