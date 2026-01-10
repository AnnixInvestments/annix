'use client'

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import { shouldShowGlobalNavigation } from '../lib/navigation-utils';

export default function ConditionalNavigation() {
  const pathname = usePathname();

  if (!shouldShowGlobalNavigation(pathname)) {
    return null;
  }

  return <Navigation />;
}
