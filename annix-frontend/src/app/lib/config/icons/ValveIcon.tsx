"use client";

interface ValveIconProps {
  className?: string;
  size?: number;
}

// Industrial knife gate valve - blue with handwheel
export function IndustrialValveIcon({ className = "", size = 24 }: ValveIconProps) {
  const width = size * 1.2;
  const height = size * 1.4;

  return (
    <svg width={width} height={height} viewBox="0 0 30 34" fill="none" className={className}>
      <defs>
        {/* Blue valve body gradient */}
        <linearGradient id="valveBodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1E5A9E" />
          <stop offset="30%" stopColor="#2E6DB8" />
          <stop offset="70%" stopColor="#2E6DB8" />
          <stop offset="100%" stopColor="#1E5A9E" />
        </linearGradient>
        {/* Darker blue for flanges */}
        <linearGradient id="flangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3078C0" />
          <stop offset="50%" stopColor="#1E5A9E" />
          <stop offset="100%" stopColor="#144780" />
        </linearGradient>
        {/* Stem gradient */}
        <linearGradient id="stemGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A0A0A0" />
          <stop offset="50%" stopColor="#D0D0D0" />
          <stop offset="100%" stopColor="#909090" />
        </linearGradient>
        {/* Handwheel gradient */}
        <linearGradient id="handwheelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2E6DB8" />
          <stop offset="50%" stopColor="#1E5A9E" />
          <stop offset="100%" stopColor="#0D3A5C" />
        </linearGradient>
      </defs>

      {/* Handwheel at top */}
      <ellipse
        cx="15"
        cy="3"
        rx="8"
        ry="2"
        fill="url(#handwheelGradient)"
        stroke="#0D3A5C"
        strokeWidth="0.5"
      />
      {/* Handwheel spokes */}
      <line x1="7" y1="3" x2="23" y2="3" stroke="#144780" strokeWidth="1.5" />
      <line x1="15" y1="1" x2="15" y2="5" stroke="#144780" strokeWidth="1" />
      {/* Handwheel center hub */}
      <circle cx="15" cy="3" r="2" fill="#1E5A9E" stroke="#0D3A5C" strokeWidth="0.5" />

      {/* Rising stem */}
      <rect
        x="14"
        y="4"
        width="2"
        height="8"
        fill="url(#stemGradient)"
        stroke="#707070"
        strokeWidth="0.3"
      />

      {/* Stem bonnet/yoke */}
      <path
        d="M 11 11 L 11 14 L 19 14 L 19 11 L 17 9 L 13 9 Z"
        fill="url(#valveBodyGradient)"
        stroke="#144780"
        strokeWidth="0.5"
      />

      {/* Main valve body */}
      <rect
        x="8"
        y="14"
        width="14"
        height="10"
        rx="1"
        fill="url(#valveBodyGradient)"
        stroke="#144780"
        strokeWidth="0.5"
      />

      {/* Body detail - gate slot indication */}
      <line x1="15" y1="15" x2="15" y2="23" stroke="#144780" strokeWidth="0.8" opacity="0.5" />

      {/* Left flange */}
      <ellipse
        cx="6"
        cy="19"
        rx="2"
        ry="6"
        fill="url(#flangeGradient)"
        stroke="#0D3A5C"
        strokeWidth="0.5"
      />
      {/* Left flange bolt holes */}
      <circle cx="6" cy="14.5" r="0.8" fill="#0D3A5C" />
      <circle cx="6" cy="23.5" r="0.8" fill="#0D3A5C" />
      <circle cx="4.5" cy="19" r="0.6" fill="#0D3A5C" />
      {/* Left pipe opening */}
      <ellipse cx="6" cy="19" rx="1" ry="3.5" fill="#1a1a1a" />

      {/* Right flange */}
      <ellipse
        cx="24"
        cy="19"
        rx="2"
        ry="6"
        fill="url(#flangeGradient)"
        stroke="#0D3A5C"
        strokeWidth="0.5"
      />
      {/* Right flange bolt holes */}
      <circle cx="24" cy="14.5" r="0.8" fill="#0D3A5C" />
      <circle cx="24" cy="23.5" r="0.8" fill="#0D3A5C" />
      <circle cx="25.5" cy="19" r="0.6" fill="#0D3A5C" />
      {/* Right pipe opening */}
      <ellipse cx="24" cy="19" rx="1" ry="3.5" fill="#1a1a1a" />

      {/* Bottom support/base */}
      <rect
        x="10"
        y="24"
        width="10"
        height="2"
        rx="0.5"
        fill="#1E5A9E"
        stroke="#0D3A5C"
        strokeWidth="0.3"
      />

      {/* Highlight on body */}
      <path
        d="M 9 15 L 9 22"
        stroke="#5AA0E8"
        strokeWidth="1"
        opacity="0.4"
        strokeLinecap="round"
      />

      {/* Highlight on handwheel */}
      <path
        d="M 9 2.5 Q 15 1 21 2.5"
        stroke="#7BBAF5"
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

export default IndustrialValveIcon;
