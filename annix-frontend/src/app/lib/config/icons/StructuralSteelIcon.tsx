'use client';

import React from 'react';

interface StructuralSteelIconProps {
  className?: string;
  size?: number;
}

// Structural Steel I-Beam / H-Beam icon
export function StructuralSteelIcon({ className = '', size = 24 }: StructuralSteelIconProps) {
  const width = size * 1.6;
  const height = size;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 40 24"
      fill="none"
      className={className}
    >
      <defs>
        {/* Steel gradient - top flange */}
        <linearGradient id="steelTopGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#B8C4CE" />
          <stop offset="30%" stopColor="#8FA4B5" />
          <stop offset="100%" stopColor="#6B8299" />
        </linearGradient>
        {/* Steel gradient - web (vertical part) */}
        <linearGradient id="steelWebGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5A7085" />
          <stop offset="50%" stopColor="#7A9AAF" />
          <stop offset="100%" stopColor="#5A7085" />
        </linearGradient>
        {/* Steel gradient - bottom flange */}
        <linearGradient id="steelBottomGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6B8299" />
          <stop offset="70%" stopColor="#4A6275" />
          <stop offset="100%" stopColor="#3D5266" />
        </linearGradient>
        {/* Blue tint for industrial look */}
        <linearGradient id="steelBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7A9AAF" />
          <stop offset="50%" stopColor="#5A7A8F" />
          <stop offset="100%" stopColor="#4A6A7F" />
        </linearGradient>
      </defs>

      {/* I-Beam shown at angle for 3D effect */}

      {/* Back/shadow I-beam (creates depth) */}
      <g transform="translate(4, 2)" opacity="0.3">
        {/* Top flange */}
        <rect x="2" y="0" width="22" height="3" fill="#3D5266" />
        {/* Web */}
        <rect x="10" y="3" width="6" height="12" fill="#3D5266" />
        {/* Bottom flange */}
        <rect x="2" y="15" width="22" height="3" fill="#3D5266" />
      </g>

      {/* Main I-Beam */}
      {/* Top flange */}
      <rect x="6" y="2" width="24" height="4" rx="0.5" fill="url(#steelTopGradient)" stroke="#4A6275" strokeWidth="0.5" />
      {/* Top flange highlight */}
      <rect x="6" y="2" width="24" height="1.5" rx="0.3" fill="#D0DCE5" opacity="0.5" />

      {/* Web (vertical middle section) */}
      <rect x="15" y="6" width="6" height="10" fill="url(#steelWebGradient)" stroke="#4A6275" strokeWidth="0.5" />
      {/* Web center highlight */}
      <rect x="17" y="6" width="2" height="10" fill="#9AB5C5" opacity="0.4" />

      {/* Bottom flange */}
      <rect x="6" y="16" width="24" height="4" rx="0.5" fill="url(#steelBottomGradient)" stroke="#4A6275" strokeWidth="0.5" />
      {/* Bottom flange top edge highlight */}
      <line x1="6" y1="16.5" x2="30" y2="16.5" stroke="#8FA4B5" strokeWidth="0.5" opacity="0.6" />

      {/* Cross-section end view (small, on the right) */}
      <g transform="translate(32, 6)">
        {/* Mini I-beam cross section */}
        <rect x="0" y="0" width="6" height="1.5" fill="#7A9AAF" stroke="#4A6275" strokeWidth="0.3" />
        <rect x="2" y="1.5" width="2" height="9" fill="#6B8299" stroke="#4A6275" strokeWidth="0.3" />
        <rect x="0" y="10.5" width="6" height="1.5" fill="#5A7085" stroke="#4A6275" strokeWidth="0.3" />
      </g>

      {/* Edge highlights for metallic effect */}
      <line x1="6" y1="2.5" x2="30" y2="2.5" stroke="#E8EEF2" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

export default StructuralSteelIcon;
