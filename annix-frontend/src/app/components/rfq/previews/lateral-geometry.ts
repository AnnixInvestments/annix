import * as THREE from "three";

export const createPipeGeometry = (outerR: number, innerR: number, length: number) => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const holePath = new THREE.Path();
  holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(holePath);
  return new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: false,
    curveSegments: 48,
  });
};

export const createRunPipeWithHoleGeometry = (
  runOuterR: number,
  runInnerR: number,
  runLength: number,
  branchOuterR: number,
  branchOffsetXVal: number,
  lateralAngle: number,
) => {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const lengthSegments = 256;
  const radialSegments = 128;
  const halfLength = runLength / 2;

  const cotAngle = Math.cos(lateralAngle) / Math.sin(lateralAngle);

  const isInBranchHole = (x: number, angle: number): boolean => {
    const z = runOuterR * Math.sin(angle);
    const y = runOuterR * Math.cos(angle);
    if (y <= 0) return false;

    const holeMargin = branchOuterR * 0.15;
    const effectiveBranchR = branchOuterR - holeMargin;

    const zSq = z * z;
    const branchRSq = effectiveBranchR * effectiveBranchR;
    if (zSq >= branchRSq) return false;

    const xSaddleOffset = Math.sqrt(branchRSq - zSq);
    const angleExtension = y * cotAngle * 0.85;
    const xRelative = x - branchOffsetXVal;

    if (xRelative >= -xSaddleOffset && xRelative <= xSaddleOffset + angleExtension) {
      return true;
    }
    return false;
  };

  const vertexMap: Map<string, number> = new Map();
  const addVertex = (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
  ): number => {
    const key = `${x.toFixed(6)}_${y.toFixed(6)}_${z.toFixed(6)}`;
    if (vertexMap.has(key)) {
      return vertexMap.get(key)!;
    }
    const idx = vertices.length / 3;
    vertices.push(x, y, z);
    normals.push(nx, ny, nz);
    vertexMap.set(key, idx);
    return idx;
  };

  // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with hole cutouts; declarative harms readability and performance
  for (let l = 0; l < lengthSegments; l++) {
    const x0 = -halfLength + (l / lengthSegments) * runLength;
    const x1 = -halfLength + ((l + 1) / lengthSegments) * runLength;

    // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with hole cutouts; declarative harms readability and performance
    for (let r = 0; r < radialSegments; r++) {
      const angle0 = (r / radialSegments) * Math.PI * 2;
      const angle1 = ((r + 1) / radialSegments) * Math.PI * 2;

      const inHole00 = isInBranchHole(x0, angle0);
      const inHole01 = isInBranchHole(x0, angle1);
      const inHole10 = isInBranchHole(x1, angle0);
      const inHole11 = isInBranchHole(x1, angle1);

      const y00 = runOuterR * Math.cos(angle0);
      const z00 = runOuterR * Math.sin(angle0);
      const y01 = runOuterR * Math.cos(angle1);
      const z01 = runOuterR * Math.sin(angle1);

      const idx00 = addVertex(x0, y00, z00, 0, Math.cos(angle0), Math.sin(angle0));
      const idx01 = addVertex(x0, y01, z01, 0, Math.cos(angle1), Math.sin(angle1));
      const idx10 = addVertex(x1, y00, z00, 0, Math.cos(angle0), Math.sin(angle0));
      const idx11 = addVertex(x1, y01, z01, 0, Math.cos(angle1), Math.sin(angle1));

      if (!(inHole00 && inHole10 && inHole01)) {
        indices.push(idx00, idx10, idx01);
      }
      if (!(inHole01 && inHole10 && inHole11)) {
        indices.push(idx01, idx10, idx11);
      }
    }
  }

  const innerStartIdx = vertices.length / 3;
  vertexMap.clear();

  // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with hole cutouts; declarative harms readability and performance
  for (let l = 0; l < lengthSegments; l++) {
    const x0 = -halfLength + (l / lengthSegments) * runLength;
    const x1 = -halfLength + ((l + 1) / lengthSegments) * runLength;

    // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation with hole cutouts; declarative harms readability and performance
    for (let r = 0; r < radialSegments; r++) {
      const angle0 = (r / radialSegments) * Math.PI * 2;
      const angle1 = ((r + 1) / radialSegments) * Math.PI * 2;

      const inHole00 = isInBranchHole(x0, angle0);
      const inHole01 = isInBranchHole(x0, angle1);
      const inHole10 = isInBranchHole(x1, angle0);
      const inHole11 = isInBranchHole(x1, angle1);

      const y00 = runInnerR * Math.cos(angle0);
      const z00 = runInnerR * Math.sin(angle0);
      const y01 = runInnerR * Math.cos(angle1);
      const z01 = runInnerR * Math.sin(angle1);

      const idx00 = addVertex(x0, y00, z00, 0, -Math.cos(angle0), -Math.sin(angle0));
      const idx01 = addVertex(x0, y01, z01, 0, -Math.cos(angle1), -Math.sin(angle1));
      const idx10 = addVertex(x1, y00, z00, 0, -Math.cos(angle0), -Math.sin(angle0));
      const idx11 = addVertex(x1, y01, z01, 0, -Math.cos(angle1), -Math.sin(angle1));

      if (!(inHole00 && inHole10 && inHole01)) {
        indices.push(idx00, idx01, idx10);
      }
      if (!(inHole01 && inHole10 && inHole11)) {
        indices.push(idx01, idx11, idx10);
      }
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  return geometry;
};

export const createSaddleCutBranchGeometry = (
  branchOuterR: number,
  branchInnerR: number,
  runOuterR: number,
  totalHeight: number,
  lateralAngle: number,
) => {
  const radialSegments = 48;
  const heightSegments = 24;
  const geometry = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const cotAngle = Math.cos(lateralAngle) / Math.sin(lateralAngle);
  const cutPadding = runOuterR * 0.05;

  const saddleBottomZ = (phi: number, radius: number): number => {
    const localX = radius * Math.cos(phi);
    const localY = radius * Math.sin(phi);
    const yOnRun = Math.sqrt(Math.max(0, runOuterR * runOuterR - localY * localY));
    const angleOffset = -localX * cotAngle;
    return yOnRun + angleOffset + cutPadding;
  };

  // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation; declarative harms readability and performance
  for (let h = 0; h <= heightSegments; h++) {
    // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation; declarative harms readability and performance
    for (let r = 0; r <= radialSegments; r++) {
      const phi = (r / radialSegments) * Math.PI * 2;
      const x = branchOuterR * Math.cos(phi);
      const y = branchOuterR * Math.sin(phi);

      const bottomZ = saddleBottomZ(phi, branchOuterR);
      const z = bottomZ + (h / heightSegments) * (totalHeight - bottomZ);

      vertices.push(x, y, z);

      const nx = Math.cos(phi);
      const ny = Math.sin(phi);
      normals.push(nx, ny, 0);
    }
  }

  const outerVertexCount = vertices.length / 3;

  // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation; declarative harms readability and performance
  for (let h = 0; h <= heightSegments; h++) {
    // eslint-disable-next-line no-restricted-syntax -- nested vertex buffer generation; declarative harms readability and performance
    for (let r = 0; r <= radialSegments; r++) {
      const phi = (r / radialSegments) * Math.PI * 2;
      const x = branchInnerR * Math.cos(phi);
      const y = branchInnerR * Math.sin(phi);

      const bottomZ = saddleBottomZ(phi, branchInnerR);
      const z = bottomZ + (h / heightSegments) * (totalHeight - bottomZ);

      vertices.push(x, y, z);

      const nx = -Math.cos(phi);
      const ny = -Math.sin(phi);
      normals.push(nx, ny, 0);
    }
  }

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

  const topCapStartIdx = vertices.length / 3;
  // eslint-disable-next-line no-restricted-syntax -- radial vertex buffer generation; declarative harms readability and performance
  for (let r = 0; r <= radialSegments; r++) {
    const phi = (r / radialSegments) * Math.PI * 2;
    vertices.push(branchOuterR * Math.cos(phi), branchOuterR * Math.sin(phi), totalHeight);
    normals.push(0, 0, 1);
    vertices.push(branchInnerR * Math.cos(phi), branchInnerR * Math.sin(phi), totalHeight);
    normals.push(0, 0, 1);
  }

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
