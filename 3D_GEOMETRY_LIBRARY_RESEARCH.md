# 3D Geometry Library Research for Pipe/Fitting Visualization

**Date:** 2026-01-12
**Issue:** #21
**Goal:** Improve pipe visualization with accurate geometry (pipe intersections, open ends, realistic welds)

---

## Current Stack

- `three@0.182.0` - Core 3D rendering engine
- `@react-three/fiber@9.4.2` - React wrapper for Three.js
- `@react-three/drei@10.7.7` - Helper components for common 3D operations

**Current Limitations:**
- Pipe ends appear closed (not showing hollow interior)
- Weld geometry uses simplified cylindrical representation
- Complex intersection geometry (saddle cuts) not fully accurate
- No CSG operations for proper boolean geometry

---

## Research Findings

### 1. opencascade.js

**Description:** WASM port of OpenCASCADE CAD kernel to JavaScript

**Links:**
- [Official Project](https://dev.opencascade.org/project/opencascadejs)
- [GitHub Repository](https://github.com/donalffons/opencascade.js/)
- [Examples](https://donalffons.github.io/opencascade.js-examples/)
- [Documentation](https://ocjs.org/)
- [npm Package](https://www.npmjs.com/package/opencascade.js)

**Capabilities:**
- ✅ Full CAD kernel with BREP solid modeling
- ✅ Proper boolean operations (union, intersection, difference)
- ✅ Fillet, chamfer, loft, sweep operations
- ✅ Tessellation to Three.js BufferGeometry
- ✅ Supports multi-threading on modern browsers
- ✅ Near-native performance via WebAssembly

**Three.js Integration:**
- Tessellates CAD geometry into triangulated meshes
- Produces Three.js BufferGeometry for each face
- [Integration examples available](https://discourse.threejs.org/t/integrate-open-cascade-geometry-kernel/3619)

**License:** LGPL-2.1 (⚠️ **Not MIT** - requires additional consideration)

**Bundle Size:** ~10-20MB WASM module (significant)

**Pros:**
- Most powerful option - full CAD capabilities
- Industry-standard geometry kernel
- Excellent for complex pipe intersections and saddle cuts
- Can generate perfect open pipe ends with wall thickness
- Active development and good documentation

**Cons:**
- Large bundle size (10-20MB)
- LGPL license may require compliance measures
- Configuration complexity with modern bundlers (Vite, etc.)
- Steeper learning curve than pure CSG libraries
- May be overkill for basic pipe visualization

**Best For:** Professional CAD-like applications requiring perfect geometry

---

### 2. manifold-3d (ManifoldCAD)

**Description:** Modern geometry library with guaranteed manifold output

**Links:**
- [GitHub Repository](https://github.com/elalish/manifold)
- [Three.js Demo](https://manifoldcad.org/three)
- [npm Package](https://www.npmjs.com/package/manifold-3d)
- [Documentation](https://manifoldcad.org/jsdocs/)

**Capabilities:**
- ✅ Guaranteed manifold mesh boolean operations
- ✅ Union, intersection, difference operations
- ✅ Fast WASM implementation
- ✅ Handles multi-material meshes
- ✅ Converts to/from Three.js meshes seamlessly

**Three.js Integration:**
- [Direct interop examples](https://manifoldcad.org/three)
- Converts Three.js meshes → Manifold → boolean ops → Three.js meshes
- Maintains material mappings during operations

**License:** Apache 2.0 (✅ **Permissive**)

**Bundle Size:** ~1-2MB WASM module (moderate)

**Pros:**
- Permissive Apache 2.0 license
- Guaranteed robust boolean operations (solves open problem in mesh processing)
- Smaller than OpenCASCADE
- Good Three.js integration examples
- Handles edge cases that break other CSG libraries

**Cons:**
- WASM build is serial-only (no multi-threading yet)
- Less mature ecosystem than OpenCASCADE
- Fewer CAD operations (no fillets, sweeps, etc.)
- Still requires WASM loading configuration

**Best For:** Robust boolean operations with guaranteed manifold output

---

### 3. @react-three/csg

**Description:** Constructive solid geometry components for React Three Fiber

**Links:**
- [GitHub Repository](https://github.com/pmndrs/react-three-csg)
- [npm Package](https://www.npmjs.com/package/@react-three/csg)
- [Examples on CodeSandbox](https://codesandbox.io/examples/package/@react-three/csg)

**Capabilities:**
- ✅ Declarative React components for CSG operations
- ✅ Addition, Subtraction, Intersection, Difference
- ✅ Material groups support
- ✅ Chainable operations
- ✅ Pure JavaScript (no WASM)

**React Three Fiber Integration:**
- Native integration (part of pmndrs ecosystem)
- Declarative JSX syntax: `<Geometry><Base /><Subtraction /></Geometry>`
- Works seamlessly with existing @react-three/fiber code

**License:** MIT (✅ **Permissive**)

**Bundle Size:** ~100KB (small)

**Pros:**
- Perfect fit for our existing stack (@react-three/fiber)
- MIT license - no restrictions
- Small bundle size
- Declarative React API - easy to use
- No WASM configuration headaches
- Active maintenance by pmndrs team

**Cons:**
- Pure JavaScript - slower than WASM for complex operations
- May struggle with very complex meshes
- Numerical precision issues possible
- Not guaranteed manifold output
- Performance note: avoid frequent `update()` calls

**Best For:** React Three Fiber projects needing simple CSG operations

---

### 4. three-bvh-csg

**Description:** High-performance CSG using BVH acceleration structures

**Links:**
- [GitHub Repository](https://github.com/gkjohnson/three-bvh-csg)
- [npm Package](https://www.npmjs.com/package/three-bvh-csg)
- [Announcement Thread](https://discourse.threejs.org/t/three-bvh-csg-a-library-for-performing-fast-csg-operations/42713)

**Capabilities:**
- ✅ Fast boolean operations (100x faster than BSP-based CSG)
- ✅ BVH acceleration for performance
- ✅ Arbitrary geometry support
- ✅ Pure JavaScript
- ✅ Built on three-mesh-bvh

**Three.js Integration:**
- Direct Three.js BufferGeometry input/output
- Drop-in replacement for other CSG libraries
- Works with standard Three.js meshes

**License:** MIT (✅ **Permissive**)

**Bundle Size:** ~200KB (small)

**Pros:**
- MIT license
- Claims 100x faster than other JS CSG libraries
- Small bundle size
- No WASM configuration
- Good for interactive applications

**Cons:**
- Requires two-manifold (watertight) input geometry
- Reported performance issues with complex meshes in real-time (Oct 2025)
- May not be completely manifold output due to numerical precision
- Less mature than three-bvh-csg
- WebAssembly version proposed but not yet available

**Best For:** Fast CSG operations on simple-to-moderate complexity meshes

---

### 5. verb-nurbs

**Description:** NURBS curves and surfaces library for JavaScript

**Links:**
- [Official Website](http://verbnurbs.com/)
- [GitHub Repository](https://github.com/pboyer/verb)
- [npm Package](https://www.npmjs.com/package/verb-nurbs)
- [Documentation](http://verbnurbs.com/docs/)

**Capabilities:**
- ✅ NURBS curve and surface creation
- ✅ Derivative evaluation
- ✅ Adaptive tessellation
- ✅ Surface/curve intersection
- ✅ Sweep operations (useful for pipes!)

**Three.js Integration:**
- [Three.js NURBS examples](https://threejs.org/examples/webgl_geometry_nurbs.html)
- [NURBSForTHREE wrapper](https://github.com/hedral/NURBSForTHREE)
- Tessellates to BufferGeometry
- Three.js has native `NURBSCurve` and `NURBSSurface` classes

**License:** MIT (✅ **Permissive**)

**Bundle Size:** ~300KB (small)

**Pros:**
- MIT license
- Excellent for smooth pipe curves and bends
- Sweep operations perfect for creating pipe geometry
- Mathematically precise curve representation
- Cross-platform (works in many languages)

**Cons:**
- Not a CSG library - doesn't do boolean operations
- Requires understanding of NURBS concepts
- Tessellation quality vs performance tradeoff
- Older implementation using deprecated Three.js methods
- Would need to combine with CSG library for intersections

**Best For:** Smooth curved pipes, bends, and sweep operations

---

## Comparison Matrix

| Library | License | Size | WASM | CSG Ops | CAD Ops | React Integration | Performance | Complexity |
|---------|---------|------|------|---------|---------|-------------------|-------------|------------|
| opencascade.js | LGPL-2.1 ⚠️ | 10-20MB | Yes | ✅ | ✅ | Manual | Excellent | High |
| manifold-3d | Apache 2.0 ✅ | 1-2MB | Yes | ✅ | ❌ | Manual | Very Good | Medium |
| @react-three/csg | MIT ✅ | 100KB | No | ✅ | ❌ | Native | Good | Low |
| three-bvh-csg | MIT ✅ | 200KB | No | ✅ | ❌ | Manual | Very Good | Medium |
| verb-nurbs | MIT ✅ | 300KB | No | ❌ | Partial | Manual | Good | Medium |

---

## Recommendations

### Option A: Quick Win - @react-three/csg
**Best for:** Immediate improvement with minimal integration effort

**Why:**
- Perfect fit for existing stack (@react-three/fiber)
- MIT license - no legal concerns
- Small bundle size - minimal impact
- Declarative React API - familiar to team
- Can implement basic CSG operations for pipe intersections

**Implementation:**
```bash
pnpm add @react-three/csg
```

```tsx
<Geometry>
  <Base>
    <cylinderGeometry args={[outerRadius, outerRadius, length, 32]} />
  </Base>
  <Subtraction>
    <cylinderGeometry args={[innerRadius, innerRadius, length + 1, 32]} />
  </Subtraction>
</Geometry>
```

**Addresses:**
- ✅ Open pipe ends (cylinder - smaller cylinder)
- ✅ Branch intersections (union operations)
- ⚠️ Complex saddle cuts (may require additional work)
- ❌ Fillets on welds (not a CSG operation)

**Effort:** Low (1-2 days)
**Impact:** Medium (noticeable improvement)

---

### Option B: Production Quality - manifold-3d
**Best for:** Professional-grade geometry with guaranteed robustness

**Why:**
- Permissive Apache 2.0 license
- Guaranteed manifold output (no broken geometry)
- Moderate bundle size (1-2MB)
- Solves hard problems that break other CSG libraries
- Good Three.js integration examples

**Implementation:**
```bash
pnpm add manifold-3d
```

Requires WASM loading configuration in Vite/Next.js, but well-documented.

**Addresses:**
- ✅ Open pipe ends
- ✅ Branch intersections
- ✅ Complex saddle cuts (guaranteed correct)
- ⚠️ Fillets (would need additional work)

**Effort:** Medium (3-5 days including WASM setup)
**Impact:** High (professional-quality geometry)

---

### Option C: Hybrid Approach (RECOMMENDED)
**Best for:** Balanced solution optimizing for different use cases

**Strategy:**
1. Use **@react-three/csg** for simple operations:
   - Open pipe ends (hollow cylinders)
   - Basic tee intersections
   - 90° branches

2. Use **verb-nurbs** for curved geometry:
   - Smooth bends with accurate radius
   - Swept pipes along paths
   - Elbow connections

3. Fall back to current simple geometry for complex cases
   - Avoid over-engineering rarely-used features
   - Document limitations clearly

**Why:**
- Leverage strengths of each library
- Small total bundle size (~400KB combined)
- All MIT licensed
- No WASM complexity
- Incremental improvement path

**Addresses:**
- ✅ Open pipe ends (@react-three/csg)
- ✅ Smooth curved pipes (verb-nurbs)
- ✅ Basic intersections (@react-three/csg)
- ⚠️ Complex saddle cuts (documented limitation)

**Effort:** Medium (4-6 days)
**Impact:** High (best quality-to-effort ratio)

---

## Implementation Roadmap

### Phase 1: Foundation (Option A)
1. Install @react-three/csg
2. Update Pipe3DPreview to show hollow pipes (CSG subtraction)
3. Add open ends to all pipe components
4. Test performance with multiple items

**Deliverable:** Pipes show wall thickness and open ends

### Phase 2: Advanced Geometry (Optional)
1. Evaluate Option B (manifold-3d) vs Option C (hybrid)
2. Implement based on user feedback from Phase 1
3. Add accurate branch intersections
4. Improve weld representation

**Deliverable:** Professional-grade pipe intersections

### Phase 3: Polish (Future)
1. Add subtle fillets to welds (visual only, not structural)
2. Optimize performance for complex assemblies
3. Add visual quality settings (LOD)

---

## Proof of Concept

### Hollow Pipe with @react-three/csg

```tsx
import { Geometry, Base, Subtraction } from '@react-three/csg';

function HollowPipe({
  length,
  outerDiameter,
  wallThickness
}: {
  length: number;
  outerDiameter: number;
  wallThickness: number;
}) {
  const outerRadius = outerDiameter / 2;
  const innerRadius = outerRadius - wallThickness;

  return (
    <Geometry>
      <Base>
        {/* Outer cylinder */}
        <mesh>
          <cylinderGeometry args={[outerRadius, outerRadius, length, 32]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
      </Base>
      <Subtraction>
        {/* Inner cylinder - creates hollow */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[innerRadius, innerRadius, length + 1, 32]} />
        </mesh>
      </Subtraction>
    </Geometry>
  );
}
```

### Tee Intersection with Branch

```tsx
<Geometry>
  <Base>
    {/* Main pipe */}
    <mesh>
      <cylinderGeometry args={[mainRadius, mainRadius, mainLength, 32]} />
    </mesh>
  </Base>
  <Addition>
    {/* Branch pipe */}
    <mesh rotation={[0, 0, Math.PI / 2]} position={[0, branchOffset, 0]}>
      <cylinderGeometry args={[branchRadius, branchRadius, branchLength, 32]} />
    </mesh>
  </Addition>
  <Subtraction>
    {/* Hollow out both pipes */}
    <mesh>
      <cylinderGeometry args={[mainRadius - wallThickness, mainRadius - wallThickness, mainLength + 1, 32]} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]} position={[0, branchOffset, 0]}>
      <cylinderGeometry args={[branchRadius - wallThickness, branchRadius - wallThickness, branchLength + 1, 32]} />
    </mesh>
  </Subtraction>
</Geometry>
```

---

## Decision

**Recommended:** Start with **Option A (@react-three/csg)** for immediate improvement, then evaluate Option C (hybrid) based on user feedback.

**Rationale:**
- Low risk, high reward
- Fits existing architecture
- No licensing concerns
- Small bundle impact
- Can iterate based on real usage

**Next Steps:**
1. Get stakeholder approval for Option A
2. Create proof-of-concept branch
3. Update Pipe3DPreview, Bend3DPreview, Tee3DPreview
4. Gather user feedback
5. Decide on Phase 2 approach

---

## Sources

- [opencascade.js Repository](https://github.com/donalffons/opencascade.js/)
- [opencascade.js Examples](https://donalffons.github.io/opencascade.js-examples/)
- [Three.js OpenCASCADE Integration Discussion](https://discourse.threejs.org/t/integrate-open-cascade-geometry-kernel/3619)
- [manifold-3d Repository](https://github.com/elalish/manifold)
- [manifold-3d Three.js Demo](https://manifoldcad.org/three)
- [manifold-3d npm](https://www.npmjs.com/package/manifold-3d)
- [@react-three/csg Repository](https://github.com/pmndrs/react-three-csg)
- [@react-three/csg npm](https://www.npmjs.com/package/@react-three/csg)
- [three-bvh-csg Repository](https://github.com/gkjohnson/three-bvh-csg)
- [three-bvh-csg Announcement](https://discourse.threejs.org/t/three-bvh-csg-a-library-for-performing-fast-csg-operations/42713)
- [verb-nurbs Website](http://verbnurbs.com/)
- [verb-nurbs Repository](https://github.com/pboyer/verb)
- [Three.js NURBS Examples](https://threejs.org/examples/webgl_geometry_nurbs.html)
- [Three.js CSG Performance Discussion](https://github.com/mrdoob/three.js/issues/30512)
