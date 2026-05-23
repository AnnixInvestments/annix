"use client";

import { createContext, useContext } from "react";
import { ORBIT_BRANDING_FALLBACK, type OrbitBranding } from "./branding";

export const OrbitBrandingContext = createContext<OrbitBranding>(ORBIT_BRANDING_FALLBACK);

export function useOrbitBrandingContext(): OrbitBranding {
  return useContext(OrbitBrandingContext);
}
