"use client";

interface SurfaceProtectionIconProps {
  className?: string;
  size?: number;
}

export function SurfaceProtectionIcon({ className = "", size = 24 }: SurfaceProtectionIconProps) {
  const width = size * 2;
  const height = size * 1.2;

  return (
    <svg width={width} height={height} viewBox="0 0 52 30" fill="none" className={className}>
      <defs>
        {/* Spray gun body - dark grey metal */}
        <linearGradient id="gunBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5A5A5A" />
          <stop offset="30%" stopColor="#404040" />
          <stop offset="70%" stopColor="#2A2A2A" />
          <stop offset="100%" stopColor="#1A1A1A" />
        </linearGradient>
        {/* Gun grip */}
        <linearGradient id="gunGrip" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3A3A3A" />
          <stop offset="50%" stopColor="#4A4A4A" />
          <stop offset="100%" stopColor="#2A2A2A" />
        </linearGradient>
        {/* Paint cup - metallic */}
        <linearGradient id="paintCup" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#808890" />
          <stop offset="30%" stopColor="#B0B8C0" />
          <stop offset="70%" stopColor="#A0A8B0" />
          <stop offset="100%" stopColor="#707880" />
        </linearGradient>
        {/* Blue paint/coating */}
        <linearGradient id="blueCoating" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E5A9E" />
          <stop offset="50%" stopColor="#2E7AC0" />
          <stop offset="100%" stopColor="#1E5A9E" />
        </linearGradient>
        {/* Spray mist gradient */}
        <radialGradient id="sprayMist" cx="20%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#4A9AE0" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#3A8AD0" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#2A7AC0" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1A6AB0" stopOpacity="0" />
        </radialGradient>
        {/* Metal surface gradient */}
        <linearGradient id="metalSurface" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#909090" />
          <stop offset="50%" stopColor="#707070" />
          <stop offset="100%" stopColor="#505050" />
        </linearGradient>
        {/* Coated surface */}
        <linearGradient id="coatedSurface" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3A8AD0" />
          <stop offset="50%" stopColor="#2A6AA8" />
          <stop offset="100%" stopColor="#1A5A98" />
        </linearGradient>
      </defs>

      {/* ========== METAL SURFACE BEING COATED ========== */}

      {/* Uncoated metal part (right side) */}
      <rect x="30" y="20" width="20" height="8" fill="url(#metalSurface)" rx="0.5" />
      <line x1="35" y1="20" x2="35" y2="28" stroke="#606060" strokeWidth="0.5" opacity="0.5" />
      <line x1="40" y1="20" x2="40" y2="28" stroke="#606060" strokeWidth="0.5" opacity="0.5" />
      <line x1="45" y1="20" x2="45" y2="28" stroke="#606060" strokeWidth="0.5" opacity="0.5" />

      {/* Coated part (left side) - blue coating applied */}
      <rect x="10" y="20" width="22" height="8" fill="url(#coatedSurface)" rx="0.5" />
      {/* Coating shine */}
      <rect x="10" y="20.5" width="22" height="1.5" fill="#5AAAE8" opacity="0.4" rx="0.3" />
      {/* Coating texture lines */}
      <line x1="15" y1="20" x2="15" y2="28" stroke="#2A7AC0" strokeWidth="0.3" opacity="0.4" />
      <line x1="20" y1="20" x2="20" y2="28" stroke="#2A7AC0" strokeWidth="0.3" opacity="0.4" />
      <line x1="25" y1="20" x2="25" y2="28" stroke="#2A7AC0" strokeWidth="0.3" opacity="0.4" />

      {/* Transition edge where coating meets bare metal */}
      <rect x="30" y="20" width="2" height="8" fill="#4A8AC0" opacity="0.6" />

      {/* ========== SPRAY PATTERN ========== */}

      {/* Main spray cone */}
      <ellipse cx="28" cy="16" rx="12" ry="8" fill="url(#sprayMist)" />

      {/* Spray droplets/particles */}
      <circle cx="22" cy="12" r="0.8" fill="#4A9AE0" opacity="0.7" />
      <circle cx="26" cy="10" r="0.6" fill="#5AAAF0" opacity="0.6" />
      <circle cx="30" cy="11" r="0.7" fill="#4A9AE0" opacity="0.5" />
      <circle cx="24" cy="15" r="0.9" fill="#3A8AD0" opacity="0.6" />
      <circle cx="32" cy="14" r="0.5" fill="#5AAAF0" opacity="0.5" />
      <circle cx="28" cy="8" r="0.5" fill="#6ABAF8" opacity="0.4" />
      <circle cx="20" cy="17" r="0.6" fill="#4A9AE0" opacity="0.5" />
      <circle cx="34" cy="17" r="0.7" fill="#3A8AD0" opacity="0.4" />
      <circle cx="25" cy="19" r="0.8" fill="#3A8AD0" opacity="0.7" />
      <circle cx="31" cy="19" r="0.6" fill="#4A9AE0" opacity="0.6" />

      {/* Dense spray near nozzle */}
      <ellipse cx="18" cy="14" rx="3" ry="2" fill="#4A9AE0" opacity="0.5" />

      {/* ========== SPRAY GUN ========== */}

      {/* Gun body - main barrel */}
      <rect x="2" y="11" width="14" height="5" rx="1" fill="url(#gunBody)" />

      {/* Nozzle tip */}
      <rect x="15" y="12" width="4" height="3" rx="0.5" fill="#505050" />
      <ellipse
        cx="19"
        cy="13.5"
        rx="1"
        ry="1.2"
        fill="#606060"
        stroke="#404040"
        strokeWidth="0.3"
      />
      {/* Nozzle opening */}
      <ellipse cx="19" cy="13.5" rx="0.5" ry="0.7" fill="#1A1A1A" />

      {/* Air cap ring */}
      <ellipse cx="16" cy="13.5" rx="0.8" ry="2" fill="none" stroke="#707070" strokeWidth="0.5" />

      {/* Body highlights */}
      <line x1="3" y1="12" x2="14" y2="12" stroke="#707070" strokeWidth="0.5" opacity="0.6" />

      {/* Trigger */}
      <path
        d="M 7 16 L 8 18 L 6 20 L 5 20 L 6 17 Z"
        fill="url(#gunGrip)"
        stroke="#303030"
        strokeWidth="0.3"
      />

      {/* Handle/grip */}
      <rect x="4" y="16" width="5" height="10" rx="1" fill="url(#gunGrip)" />
      <line x1="5" y1="18" x2="5" y2="25" stroke="#505050" strokeWidth="0.5" opacity="0.5" />
      <line x1="8" y1="18" x2="8" y2="25" stroke="#505050" strokeWidth="0.5" opacity="0.5" />
      {/* Grip texture */}
      <line x1="4.5" y1="19" x2="8.5" y2="19" stroke="#252525" strokeWidth="0.3" />
      <line x1="4.5" y1="21" x2="8.5" y2="21" stroke="#252525" strokeWidth="0.3" />
      <line x1="4.5" y1="23" x2="8.5" y2="23" stroke="#252525" strokeWidth="0.3" />

      {/* Paint cup (gravity feed) */}
      <path
        d="M 6 6 L 5 11 L 10 11 L 9 6 Z"
        fill="url(#paintCup)"
        stroke="#606870"
        strokeWidth="0.3"
      />
      {/* Paint level visible in cup */}
      <path d="M 5.5 8 L 5.2 10.5 L 9.8 10.5 L 9.5 8 Z" fill="url(#blueCoating)" opacity="0.8" />
      {/* Cup lid */}
      <rect
        x="5.5"
        y="5"
        width="4"
        height="1.5"
        rx="0.3"
        fill="#909090"
        stroke="#707070"
        strokeWidth="0.3"
      />
      {/* Cup highlight */}
      <line x1="6" y1="6.5" x2="6" y2="10" stroke="#C0C8D0" strokeWidth="0.4" opacity="0.5" />

      {/* Air hose connection */}
      <ellipse cx="4" cy="13.5" rx="1.5" ry="1" fill="#404040" stroke="#303030" strokeWidth="0.3" />
      <rect x="1" y="12.5" width="3" height="2" rx="0.5" fill="#353535" />
    </svg>
  );
}

export default SurfaceProtectionIcon;
