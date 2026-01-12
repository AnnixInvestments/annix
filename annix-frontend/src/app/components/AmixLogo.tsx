'use client';

import React from 'react';
import Image from 'next/image';
import { log } from '@/app/lib/logger';

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
  const { logo: logoSize } = sizeMap[size];

  if (showText) {
    const iconSize = logoSize * 1.5;
    const textHeight = 48.4;
    const textWidth = Math.round(textHeight * 2.5);

    log.debug('AmixLogo rendering inline parts', { size, logoSize, iconSize, textWidth, textHeight });

    return (
      <div className={`flex items-center ${className}`}>
        <Image
          src="/images/annix-icon.png"
          alt="Annix"
          width={iconSize}
          height={iconSize}
          priority
          style={{ width: iconSize, height: iconSize }}
        />
        <Image
          src="/images/annix-text.png"
          alt="Annix Investments"
          width={textWidth}
          height={textHeight}
          priority
          style={{ width: 'auto', height: textHeight }}
        />
      </div>
    );
  }

  log.debug('AmixLogo rendering icon only', { size, logoSize });

  return (
    <div className={`inline-block ${className}`}>
      <Image
        src="/images/annix-icon.png"
        alt="Annix"
        width={logoSize}
        height={logoSize}
        priority
        style={{ width: logoSize, height: logoSize }}
      />
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
