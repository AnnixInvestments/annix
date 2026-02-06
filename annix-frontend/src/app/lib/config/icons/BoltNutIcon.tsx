'use client';

import React from 'react';

interface BoltNutIconProps {
  className?: string;
  size?: number;
}

export function BoltNutIcon({ className = '', size = 24 }: BoltNutIconProps) {
  const width = size * 2.2;
  const height = size * 1.1;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 55 28"
      fill="none"
      className={className}
    >
      <defs>
        {/* Zinc plated metal - main body */}
        <linearGradient id="zincBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A8B4BC" />
          <stop offset="25%" stopColor="#D4DCE4" />
          <stop offset="45%" stopColor="#E8EEF4" />
          <stop offset="55%" stopColor="#D4DCE4" />
          <stop offset="75%" stopColor="#B8C4CC" />
          <stop offset="100%" stopColor="#8C9CA8" />
        </linearGradient>
        {/* Bolt head top surface */}
        <linearGradient id="headTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0E8F0" />
          <stop offset="40%" stopColor="#C8D4E0" />
          <stop offset="100%" stopColor="#A0B0C0" />
        </linearGradient>
        {/* Bolt head side */}
        <linearGradient id="headSide" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#B0BCC8" />
          <stop offset="50%" stopColor="#8898A8" />
          <stop offset="100%" stopColor="#687888" />
        </linearGradient>
        {/* Thread groove */}
        <linearGradient id="threadGroove" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7888" />
          <stop offset="30%" stopColor="#9CA8B4" />
          <stop offset="70%" stopColor="#9CA8B4" />
          <stop offset="100%" stopColor="#788898" />
        </linearGradient>
        {/* Thread peak */}
        <linearGradient id="threadPeak" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B0BCC8" />
          <stop offset="30%" stopColor="#E0E8F0" />
          <stop offset="70%" stopColor="#E0E8F0" />
          <stop offset="100%" stopColor="#A0ACB8" />
        </linearGradient>
        {/* Nut face gradients */}
        <linearGradient id="nutFaceLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D8E0E8" />
          <stop offset="100%" stopColor="#A8B8C8" />
        </linearGradient>
        <linearGradient id="nutFaceMid" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C0CCD8" />
          <stop offset="50%" stopColor="#D8E4EC" />
          <stop offset="100%" stopColor="#B0BCC8" />
        </linearGradient>
        <linearGradient id="nutFaceDark" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#98A8B8" />
          <stop offset="100%" stopColor="#708090" />
        </linearGradient>
        {/* Nut hole */}
        <radialGradient id="nutHole" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2A3038" />
          <stop offset="70%" stopColor="#404850" />
          <stop offset="100%" stopColor="#586068" />
        </radialGradient>
      </defs>

      {/* ========== HEX BOLT ========== */}

      {/* Bolt head - 3D hex with washer face */}
      {/* Head top face */}
      <polygon
        points="5,7 9,4 17,4 21,7 17,10 9,10"
        fill="url(#headTop)"
      />
      {/* Head left face */}
      <polygon
        points="5,7 9,10 9,13 5,10"
        fill="#8898A8"
      />
      {/* Head front face */}
      <polygon
        points="9,10 17,10 17,13 9,13"
        fill="url(#headSide)"
      />
      {/* Head right face */}
      <polygon
        points="17,10 21,7 21,10 17,13"
        fill="#A0B0C0"
      />
      {/* Chamfer on head edges */}
      <line x1="9" y1="4.5" x2="17" y2="4.5" stroke="#F0F4F8" strokeWidth="0.6" opacity="0.7" />
      <line x1="5.5" y1="7" x2="9" y2="10" stroke="#F0F4F8" strokeWidth="0.4" opacity="0.5" />

      {/* Bolt shaft with realistic threads */}
      {/* Base shaft cylinder */}
      <rect x="10.5" y="13" width="5" height="13" fill="url(#zincBody)" />

      {/* Individual thread ridges - realistic V-thread profile */}
      {[0, 1.3, 2.6, 3.9, 5.2, 6.5, 7.8, 9.1, 10.4].map((y, i) => (
        <g key={i}>
          {/* Thread groove (dark line) */}
          <path
            d={`M 10 ${14 + y} L 10.5 ${14.3 + y} L 15.5 ${14.3 + y} L 16 ${14 + y}`}
            fill="none"
            stroke="#788898"
            strokeWidth="0.5"
          />
          {/* Thread peak highlight */}
          <path
            d={`M 10.5 ${14.6 + y} L 15.5 ${14.6 + y}`}
            stroke="#E8F0F8"
            strokeWidth="0.7"
            opacity="0.6"
          />
          {/* Thread body */}
          <rect
            x="10.3"
            y={14.3 + y}
            width="5.4"
            height="0.9"
            fill="url(#threadPeak)"
            opacity="0.9"
          />
        </g>
      ))}

      {/* Shaft edge highlights */}
      <line x1="10.5" y1="13" x2="10.5" y2="26" stroke="#E8F0F8" strokeWidth="0.6" opacity="0.5" />
      <line x1="15.5" y1="13" x2="15.5" y2="26" stroke="#687888" strokeWidth="0.4" opacity="0.4" />

      {/* ========== HEX NUT ========== */}

      {/* Nut - isometric view showing 3 faces */}
      {/* Top face */}
      <polygon
        points="32,10 38,6 48,6 54,10 48,14 38,14"
        fill="url(#nutFaceLight)"
        stroke="#8898A8"
        strokeWidth="0.3"
      />
      {/* Top chamfer highlight */}
      <polygon
        points="33,10 38,7 48,7 53,10 48,13 38,13"
        fill="none"
        stroke="#F0F4F8"
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* Left face */}
      <polygon
        points="32,10 38,14 38,22 32,18"
        fill="url(#nutFaceDark)"
        stroke="#687888"
        strokeWidth="0.3"
      />

      {/* Front face */}
      <polygon
        points="38,14 48,14 48,22 38,22"
        fill="url(#nutFaceMid)"
        stroke="#8898A8"
        strokeWidth="0.3"
      />
      {/* Front face vertical highlight */}
      <line x1="43" y1="14" x2="43" y2="22" stroke="#E8F0F8" strokeWidth="0.8" opacity="0.4" />

      {/* Right face */}
      <polygon
        points="48,14 54,10 54,18 48,22"
        fill="#A8B8C4"
        stroke="#8898A8"
        strokeWidth="0.3"
      />

      {/* Bottom chamfer */}
      <line x1="32" y1="17.5" x2="38" y2="21.5" stroke="#586068" strokeWidth="0.5" />
      <line x1="38" y1="21.5" x2="48" y2="21.5" stroke="#586068" strokeWidth="0.5" />
      <line x1="48" y1="21.5" x2="54" y2="17.5" stroke="#707880" strokeWidth="0.5" />

      {/* Threaded hole - top opening */}
      <ellipse cx="43" cy="10" rx="4" ry="2.2" fill="url(#nutHole)" />
      {/* Thread detail in hole */}
      <ellipse cx="43" cy="10" rx="3.2" ry="1.6" fill="none" stroke="#505860" strokeWidth="0.4" />
      <ellipse cx="43" cy="10" rx="2.4" ry="1.1" fill="none" stroke="#404850" strokeWidth="0.3" />
      {/* Hole highlight */}
      <path d="M 40 9 Q 43 8 46 9" stroke="#8090A0" strokeWidth="0.4" fill="none" opacity="0.6" />

      {/* Edge highlights */}
      <line x1="32" y1="10" x2="32" y2="18" stroke="#C8D4E0" strokeWidth="0.5" opacity="0.5" />
      <line x1="38" y1="6.5" x2="48" y2="6.5" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

export default BoltNutIcon;
