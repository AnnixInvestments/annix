"use client";

interface PumpIconProps {
  className?: string;
  size?: number;
}

// Industrial centrifugal/slurry pump - blue with volute casing
export function IndustrialPumpIcon({ className = "", size = 24 }: PumpIconProps) {
  const width = size * 1.8;
  const height = size;

  return (
    <svg width={width} height={height} viewBox="0 0 44 24" fill="none" className={className}>
      <defs>
        {/* Blue pump body gradient */}
        <linearGradient id="pumpBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A90D9" />
          <stop offset="30%" stopColor="#2E6DB8" />
          <stop offset="60%" stopColor="#1E5A9E" />
          <stop offset="100%" stopColor="#144780" />
        </linearGradient>
        {/* Darker blue for depth */}
        <linearGradient id="pumpDarkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2E6DB8" />
          <stop offset="100%" stopColor="#0D3A5C" />
        </linearGradient>
        {/* Flange gradient */}
        <linearGradient id="flangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5AA0E8" />
          <stop offset="50%" stopColor="#3078C0" />
          <stop offset="100%" stopColor="#1E5A9E" />
        </linearGradient>
      </defs>

      {/* Main volute casing - spiral pump body */}
      <ellipse cx="18" cy="13" rx="12" ry="10" fill="url(#pumpBodyGradient)" />

      {/* Inner volute detail - darker ring */}
      <ellipse
        cx="18"
        cy="13"
        rx="8"
        ry="7"
        fill="none"
        stroke="#144780"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Center hub */}
      <circle
        cx="18"
        cy="13"
        r="4"
        fill="url(#pumpDarkGradient)"
        stroke="#0D3A5C"
        strokeWidth="0.5"
      />
      <circle cx="18" cy="13" r="2" fill="#1E5A9E" />

      {/* Discharge flange - top outlet */}
      <rect
        x="14"
        y="1"
        width="8"
        height="4"
        rx="0.5"
        fill="url(#flangeGradient)"
        stroke="#144780"
        strokeWidth="0.5"
      />
      {/* Flange bolt holes */}
      <circle cx="15.5" cy="3" r="0.8" fill="#0D3A5C" />
      <circle cx="20.5" cy="3" r="0.8" fill="#0D3A5C" />
      {/* Discharge pipe connection to body */}
      <rect x="15.5" y="4" width="5" height="2" fill="#2E6DB8" />

      {/* Suction flange - side inlet */}
      <ellipse
        cx="32"
        cy="13"
        rx="2.5"
        ry="5"
        fill="url(#flangeGradient)"
        stroke="#144780"
        strokeWidth="0.5"
      />
      {/* Flange bolt holes */}
      <circle cx="32" cy="9" r="0.7" fill="#0D3A5C" />
      <circle cx="32" cy="17" r="0.7" fill="#0D3A5C" />
      {/* Suction pipe */}
      <rect
        x="33"
        y="10"
        width="6"
        height="6"
        rx="0.5"
        fill="url(#flangeGradient)"
        stroke="#144780"
        strokeWidth="0.5"
      />
      <ellipse cx="39" cy="13" rx="1.5" ry="3" fill="#1E5A9E" stroke="#0D3A5C" strokeWidth="0.3" />

      {/* Motor/drive coupling - back */}
      <rect
        x="4"
        y="9"
        width="4"
        height="8"
        rx="1"
        fill="#3078C0"
        stroke="#144780"
        strokeWidth="0.5"
      />
      <rect
        x="2"
        y="10"
        width="3"
        height="6"
        rx="0.5"
        fill="#5AA0E8"
        stroke="#2E6DB8"
        strokeWidth="0.5"
      />

      {/* Base/feet */}
      <rect
        x="8"
        y="21"
        width="6"
        height="2"
        rx="0.5"
        fill="#2E6DB8"
        stroke="#144780"
        strokeWidth="0.3"
      />
      <rect
        x="20"
        y="21"
        width="6"
        height="2"
        rx="0.5"
        fill="#2E6DB8"
        stroke="#144780"
        strokeWidth="0.3"
      />

      {/* Highlight on casing */}
      <path
        d="M 10 8 Q 14 5 22 7"
        stroke="#7BBAF5"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />

      {/* Volute spiral detail */}
      <path
        d="M 26 10 Q 28 13 26 16"
        stroke="#144780"
        strokeWidth="0.8"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

export default IndustrialPumpIcon;
