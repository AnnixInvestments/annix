# 3D Pipe Visualization Guide

This guide explains the 3D visualization components integrated into the RFQ forms.

## Overview

The application includes interactive 3D visualization for pipes and bends, integrated directly into the RFQ item configuration workflow.

## Components

### 1. **Pipe3DPreview** (`annix-frontend/src/app/components/rfq/Pipe3DPreview.tsx`)
- Interactive 3D rendering of straight pipes
- Shows flanges, welds, and accurate dimensions
- Multiple camera views: Default, End A, End B
- Material-aware rendering (carbon steel, stainless, PVC, galvanized)

### 2. **Bend3DPreview** (`annix-frontend/src/app/components/rfq/Bend3DPreview.tsx`)
- Interactive 3D rendering of pipe bends
- Visualizes bend radius (1.5D, 2D, 3D, 5D)
- Shows tangent lengths and angles
- Schedule-aware wall thickness estimation

### 3. **Dependencies**
- `three@0.182.0` - 3D rendering engine
- `@react-three/fiber@9.4.2` - React wrapper for Three.js
- `@react-three/drei@10.7.7` - Helper components

## Where It's Used

These components are **automatically integrated** into the RFQ forms:
- **ItemUploadStep.tsx**: Shows 3D previews for each configured item
- **StraightPipeForm.tsx**: Real-time preview as pipe specifications are entered
- **BendForm.tsx**: Real-time preview as bend specifications are entered

## Component Usage

### Basic Usage - Pipe3DPreview

```tsx
import Pipe3DPreview from '@/app/components/rfq/Pipe3DPreview';

function MyComponent() {
  return (
    <Pipe3DPreview
      length={1000}              // Length in mm (or meters if < 50)
      outerDiameter={100}        // OD in mm
      wallThickness={5}          // Wall thickness in mm
      endConfiguration="FOE"     // PE, FOE, FBE, FOE_LF, FOE_RF, 2X_RF
      materialName="SABS 62"     // Optional: affects material appearance
    />
  );
}
```

### Basic Usage - Bend3DPreview

```tsx
import Bend3DPreview from '@/app/components/rfq/Bend3DPreview';

function MyComponent() {
  return (
    <Bend3DPreview
      nominalBore={100}          // NB in mm
      outerDiameter={114.3}      // OD in mm
      wallThickness={6}          // Wall thickness in mm
      bendAngle={90}             // Bend angle in degrees
      bendType="3D"              // 1.5D, 2D, 3D, 5D
      tangent1={150}             // Optional: tangent length 1 in mm
      tangent2={150}             // Optional: tangent length 2 in mm
      materialName="Carbon Steel" // Optional
      schedule="40"              // Optional: 40, 80, 160, XS, XXS
    />
  );
}
```

### Current Integration

The 3D visualization is already integrated into the RFQ workflow:

- **ItemUploadStep** dynamically loads the components using Next.js `dynamic()` to avoid SSR issues
- **StraightPipeForm** and **BendForm** receive the components as props and display them automatically
- Users see real-time 3D previews as they configure pipe specifications

No additional integration work is required - the feature is live in the application.

## Features

### Interactive Controls
- **Drag to Rotate**: Click and drag to rotate the 3D view
- **Scroll to Zoom**: Mouse wheel to zoom in/out
- **View Buttons**: Quick camera angles for pipes (Default, End A, End B)

### Visual Elements
- Accurate pipe geometry (hollow cylinders)
- Flanges with bolt holes
- Weld beads at flange connections
- Dimension annotations
- Material-based coloring
- Realistic lighting and shadows

## Performance Notes

The 3D rendering is optimized but may impact performance on:
- Low-end devices
- Forms with many items
- Mobile browsers

Consider making the 3D preview optional or lazy-loaded if needed.

## How to Remove/Revert

If you decide you don't want these features, here's how to cleanly remove them:

### Option 1: Delete the Feature Branch

```bash
# Switch back to dev branch
git checkout dev

# Delete the feature branch
git branch -D feature/3d-pipe-visualization
```

This completely removes all changes. Your `dev` branch remains untouched.

### Option 2: Keep the Branch, Remove Dependencies

If you want to keep the components for future use but remove the large dependencies:

```bash
cd annix-frontend
pnpm remove three @react-three/fiber @react-three/drei
```

### Option 3: Merge but Make Optional

If you integrate into your forms, wrap the components in:

```tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load the 3D component
const Pipe3DPreview = dynamic(
  () => import('./Pipe3DPreview'),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-slate-100 rounded animate-pulse" />
  }
);

// Then use with a toggle
{show3D && (
  <Suspense fallback={<div>Loading 3D view...</div>}>
    <Pipe3DPreview {...props} />
  </Suspense>
)}
```

## Troubleshooting

### "Module not found: Can't resolve 'three'"

Run: `cd annix-frontend && pnpm install`

### Black screen or no render

Check browser console. Ensure:
- Component is used in a client component (`'use client'` at top)
- Props are valid numbers (not undefined or NaN)

### Performance issues

- Use dynamic imports with `ssr: false`
- Add a toggle to show/hide 3D view
- Reduce the number of simultaneous 3D previews on screen

## Branch Information

- **Branch**: `feature/3d-pipe-visualization`
- **Commits**: 2 clean commits
  1. Add 3D preview components
  2. Install required dependencies
- **Files Changed**: 4 (2 new components, package.json, pnpm-lock.yaml)
- **Lines Added**: ~1200
- **Dependencies Added**: 52 packages (~60MB)

## Compatibility

This feature does NOT:
- Change any existing database tables
- Modify any migrations
- Break existing functionality
- Affect your ability to switch branches

You can freely switch between `dev` and `feature/3d-pipe-visualization` branches without database issues.

## Next Steps

1. **Test the components** in isolation first
2. **Decide where to integrate** (or keep as optional)
3. **Add user toggle** if you want it optional
4. **Consider lazy loading** for performance
5. **Merge to dev** when ready, or keep separate for now

---

*Generated with Claude Code - Manual feature port from experimental_features branch*
