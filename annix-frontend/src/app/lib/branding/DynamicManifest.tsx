"use client";

import { useEffect, useRef } from "react";
import { generateManifest, ManifestConfig, manifestToBlobUrl } from "./manifestUtils";

interface DynamicManifestProps {
  manifestUrl?: string;
  manifestConfig?: ManifestConfig;
}

export function DynamicManifest({ manifestUrl, manifestConfig }: DynamicManifestProps) {
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const updateManifestLink = (url: string) => {
      const existingManifest = document.querySelector(
        'link[rel="manifest"]',
      ) as HTMLLinkElement | null;

      if (existingManifest) {
        existingManifest.href = url;
      } else {
        const manifest = document.createElement("link");
        manifest.rel = "manifest";
        manifest.href = url;
        document.head.appendChild(manifest);
      }
    };

    if (manifestUrl) {
      updateManifestLink(manifestUrl);
    } else if (manifestConfig) {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const manifest = generateManifest(manifestConfig);
      const blobUrl = manifestToBlobUrl(manifest);
      blobUrlRef.current = blobUrl;
      updateManifestLink(blobUrl);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [manifestUrl, manifestConfig]);

  return null;
}
