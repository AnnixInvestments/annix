/**
 * Amix Investments Brand Constants
 *
 * This file contains all branding colors, fonts, and reusable styles
 * for the Amix Investments / Annix application.
 */

// Brand Colors
export const brandColors = {
  // Primary navy blue background
  navy: '#001F3F',
  navyLight: '#003366',
  navyDark: '#001529',

  // Accent orange color
  orange: '#FFA500',
  orangeLight: '#FFB733',
  orangeDark: '#CC8400',

  // Supporting colors
  white: '#FFFFFF',
  offWhite: '#F5F5F5',

  // Text colors
  textOnNavy: '#FFFFFF',
  textOnWhite: '#001F3F',
} as const;

// CSS class names for brand styling
export const brandClasses = {
  // Background classes
  bgNavy: 'bg-amix-navy',
  bgOrange: 'bg-amix-orange',

  // Text classes
  textNavy: 'text-amix-navy',
  textOrange: 'text-amix-orange',
  textOnNavy: 'text-white',

  // Gradient for branding
  gradientNavyOrange: 'bg-gradient-to-r from-amix-navy to-amix-orange',

  // Signature font class
  signatureFont: 'font-amix-signature',
} as const;

// Font configurations
export const brandFonts = {
  // Main signature/cursive font for "Amix" branding
  signature: {
    family: '"Great Vibes", cursive',
    className: 'font-amix-signature',
  },
  // Body text font
  body: {
    family: 'Inter, system-ui, sans-serif',
    className: 'font-sans',
  },
} as const;

// Reusable style objects for inline styling when needed
export const brandStyles = {
  navyBackground: {
    backgroundColor: brandColors.navy,
    color: brandColors.textOnNavy,
  },
  orangeText: {
    color: brandColors.orange,
  },
  signatureText: {
    fontFamily: brandFonts.signature.family,
    color: brandColors.orange,
  },
} as const;

// Tailwind-compatible color values for use in className strings
export const tw = {
  navy: '[#001F3F]',
  orange: '[#FFA500]',
} as const;
