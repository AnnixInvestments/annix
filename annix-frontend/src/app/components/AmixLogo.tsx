'use client';

import React from 'react';
import Image from 'next/image';

interface AmixLogoProps {
  /** Size variant: 'sm' (32px), 'md' (48px), 'lg' (64px), 'xl' (96px) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show the "Amix" text next to the logo */
  showText?: boolean;
  /** Custom className for the container */
  className?: string;
  /** Use the signature font for text */
  useSignatureFont?: boolean;
}

const sizeMap = {
  sm: { logo: 32, text: 'text-lg' },
  md: { logo: 48, text: 'text-2xl' },
  lg: { logo: 64, text: 'text-3xl' },
  xl: { logo: 96, text: 'text-4xl' },
};

/**
 * Annix App Logo Component
 *
 * Usage:
 * - <AmixLogo /> - Default medium size with text
 * - <AmixLogo size="lg" /> - Large logo with text
 * - <AmixLogo showText={false} /> - Logo only
 * - <AmixLogo useSignatureFont /> - Use Great Vibes font for "Annix" text
 *
 * To use the actual logo image:
 * 1. Save the logo as: public/images/annix-logo.png
 * 2. The component will automatically use it
 */
export default function AmixLogo({
  size = 'md',
  showText = true,
  className = '',
  useSignatureFont = true,
}: AmixLogoProps) {
  const { logo: logoSize, text: textSize } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Image - Replace SVG with actual image when available */}
      <div
        className="relative flex-shrink-0"
        style={{ width: logoSize, height: logoSize }}
      >
        {/*
          TODO: Replace this SVG with the actual logo image:
          <Image
            src="/images/annix-logo.png"
            alt="Annix App"
            width={logoSize}
            height={logoSize}
            priority
          />
        */}
        {/* Placeholder SVG - Orange tree emblem on navy */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Navy background circle */}
          <circle cx="50" cy="50" r="48" fill="#001F3F" stroke="#FFA500" strokeWidth="2" />
          {/* Stylized tree/branch emblem in orange */}
          <path
            d="M50 20 C50 20, 30 40, 35 55 C38 63, 45 65, 50 75 C55 65, 62 63, 65 55 C70 40, 50 20, 50 20"
            fill="#FFA500"
            opacity="0.9"
          />
          <path
            d="M50 75 L50 85"
            stroke="#FFA500"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Decorative leaves */}
          <circle cx="35" cy="45" r="5" fill="#FFA500" opacity="0.7" />
          <circle cx="65" cy="45" r="5" fill="#FFA500" opacity="0.7" />
          <circle cx="42" cy="35" r="4" fill="#FFA500" opacity="0.6" />
          <circle cx="58" cy="35" r="4" fill="#FFA500" opacity="0.6" />
          <circle cx="50" cy="28" r="4" fill="#FFA500" opacity="0.8" />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`${textSize} font-bold leading-tight ${
              useSignatureFont ? 'font-amix-signature' : ''
            }`}
            style={{ color: '#FFA500' }}
          >
            Annix
          </span>
          <span
            className="text-xs tracking-wider uppercase"
            style={{ color: '#FFA500', opacity: 0.8 }}
          >
            App
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Full logo with navy background - for use on light backgrounds
 */
export function AmixLogoWithBackground({
  size = 'md',
  className = '',
}: Omit<AmixLogoProps, 'showText' | 'useSignatureFont'>) {
  return (
    <div
      className={`inline-flex items-center rounded-lg px-4 py-2 ${className}`}
      style={{ backgroundColor: '#001F3F' }}
    >
      <AmixLogo size={size} showText useSignatureFont />
    </div>
  );
}
