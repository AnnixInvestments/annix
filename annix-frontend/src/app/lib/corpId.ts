/**
 * Annix Corporate Identity Module
 *
 * This module centralizes all corporate identity (Corp ID) settings for the Annix application.
 * Any changes to branding, colors, or styling should be made here and will automatically
 * propagate to all components that use this module.
 *
 * Usage:
 * import { corpId } from '@/app/lib/corpId';
 */

export const corpId = {
  name: 'Annix',
  fullName: 'Annix Investments',
  tagline: 'Industrial Piping Solutions',

  colors: {
    primary: {
      navy: '#323288',
      navyLight: '#4a4da3',
      navyDark: '#252560',
    },
    accent: {
      orange: '#FFA500',
      orangeLight: '#FFB733',
      orangeDark: '#CC8400',
    },
    neutral: {
      white: '#FFFFFF',
      offWhite: '#F5F5F5',
      gray: '#6B7280',
      grayLight: '#9CA3AF',
      grayDark: '#374151',
    },
    text: {
      onNavy: '#FFFFFF',
      onWhite: '#323288',
      onOrange: '#FFFFFF',
    },
    portal: {
      admin: {
        background: '#323288',
        text: '#FFFFFF',
        accent: '#FFA500',
        hover: '#4a4da3',
        active: '#252560',
      },
      customer: {
        background: '#323288',
        text: '#FFFFFF',
        accent: '#FFA500',
        hover: '#4a4da3',
        active: '#252560',
      },
      supplier: {
        background: '#323288',
        text: '#FFFFFF',
        accent: '#FFA500',
        hover: '#4a4da3',
        active: '#252560',
      },
    },
  },

  fonts: {
    signature: {
      family: '"Great Vibes", cursive',
      className: 'font-amix-signature',
    },
    body: {
      family: 'Inter, system-ui, sans-serif',
      className: 'font-sans',
    },
  },

  toolbar: {
    height: 'h-16',
    shadow: 'shadow-lg',
    logoSize: 'md' as const,
  },

  assets: {
    logo: {
      icon: '/images/annix-icon.png',
      text: '/images/annix-text.png',
      full: '/images/annix-logo-full.png',
    },
  },
} as const;

export type PortalType = 'admin' | 'customer' | 'supplier';

export const portalConfig = {
  admin: {
    title: '',
    homeHref: '/admin/portal/dashboard',
    loginHref: '/admin/login',
  },
  customer: {
    title: '',
    homeHref: '/customer/portal/dashboard',
    loginHref: '/customer/login',
  },
  supplier: {
    title: '',
    homeHref: '/supplier/portal/dashboard',
    loginHref: '/supplier/login',
  },
} as const;

export const toolbarStyles = {
  nav: `bg-[${corpId.colors.primary.navy}] ${corpId.toolbar.shadow}`,
  navLink: {
    base: 'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
    active: `text-[${corpId.colors.accent.orange}] bg-[${corpId.colors.primary.navyDark}]`,
    inactive: `text-white hover:text-[${corpId.colors.accent.orange}] hover:bg-[${corpId.colors.primary.navyLight}]`,
  },
  userAvatar: {
    base: 'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-colors',
    background: `bg-[${corpId.colors.accent.orange}]`,
    hover: `hover:bg-[${corpId.colors.accent.orangeLight}]`,
  },
} as const;

export default corpId;
