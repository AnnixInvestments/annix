'use client';

import { useState, useEffect, useCallback } from 'react';

interface DeviceFingerprintData {
  fingerprint: string;
  browserInfo: {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    timezone: string;
    colorDepth: number;
    hardwareConcurrency: number;
    deviceMemory: number | null;
  };
}

/**
 * Generate a device fingerprint from browser characteristics
 * This is a custom implementation - in production, consider using FingerprintJS
 */
async function generateFingerprint(): Promise<DeviceFingerprintData> {
  const components: string[] = [];

  // User Agent
  components.push(navigator.userAgent);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Screen resolution
  const screenRes = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  components.push(screenRes);

  // Timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  components.push(timezone);

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Device memory (if available)
  const deviceMemory = (navigator as any).deviceMemory || null;
  components.push(String(deviceMemory || 0));

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Annix Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Annix Fingerprint', 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    components.push('canvas-not-available');
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const glContext = gl as WebGLRenderingContext;
      const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (e) {
    components.push('webgl-not-available');
  }

  // Installed plugins
  const plugins = Array.from(navigator.plugins || [])
    .map((p) => p.name)
    .sort()
    .join(',');
  components.push(plugins);

  // Generate hash from components
  const fingerprintString = components.join('|||');
  const fingerprint = await hashString(fingerprintString);

  return {
    fingerprint,
    browserInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: screenRes,
      timezone,
      colorDepth: window.screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory,
    },
  };
}

/**
 * Generate SHA-256 hash of a string
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hook to generate and manage device fingerprint
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [browserInfo, setBrowserInfo] = useState<DeviceFingerprintData['browserInfo'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await generateFingerprint();
      setFingerprint(data.fingerprint);
      setBrowserInfo(data.browserInfo);

      // Store in session storage for use across the app
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('deviceFingerprint', data.fingerprint);
        sessionStorage.setItem('browserInfo', JSON.stringify(data.browserInfo));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate device fingerprint');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if we already have a fingerprint in session
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('deviceFingerprint');
      const storedInfo = sessionStorage.getItem('browserInfo');
      if (stored && storedInfo) {
        setFingerprint(stored);
        setBrowserInfo(JSON.parse(storedInfo));
        setIsLoading(false);
        return;
      }
    }

    generate();
  }, [generate]);

  return {
    fingerprint,
    browserInfo,
    isLoading,
    error,
    regenerate: generate,
  };
}

/**
 * Get the stored device fingerprint synchronously
 * Returns null if not available
 */
export function getStoredFingerprint(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('deviceFingerprint');
}
