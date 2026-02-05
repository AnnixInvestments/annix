'use client';

import * as THREE from 'three';

export interface OrbitControlsLike {
  target: THREE.Vector3;
  update: () => void;
}

export function asOrbitControls(controls: unknown): OrbitControlsLike | null {
  if (!controls) return null;
  const ctrl = controls as OrbitControlsLike;
  if (ctrl.target && typeof ctrl.update === 'function') {
    return ctrl;
  }
  return null;
}
