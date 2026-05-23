"use client";

import { ORBIT_BRANDING_FALLBACK, orbitBrandingCssVars } from "@/app/lib/annix-orbit/branding";
import { OrbitBrandingContext } from "@/app/lib/annix-orbit/branding-context";
import { useOrbitBranding } from "@/app/lib/query/hooks";

export function OrbitBrandingProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const query = useOrbitBranding();
  const data = query.data;
  const branding = data || ORBIT_BRANDING_FALLBACK;
  const cssVars = orbitBrandingCssVars(branding);

  const surfaceStyle = {
    ...cssVars,
    backgroundImage:
      "linear-gradient(to bottom right, var(--orbit-grad-from), var(--orbit-grad-via), var(--orbit-grad-to))",
  } as React.CSSProperties;

  return (
    <OrbitBrandingContext.Provider value={branding}>
      <div className="relative min-h-screen" style={surfaceStyle}>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: "var(--orbit-watermark-image)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "var(--orbit-watermark-size)",
            opacity: "var(--orbit-watermark-opacity)",
          }}
        />
        <div className="relative z-10 min-h-screen">{children}</div>
      </div>
    </OrbitBrandingContext.Provider>
  );
}
