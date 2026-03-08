"use client";

import { useEffect, useRef } from "react";

interface DynamicFaviconProps {
  iconUrl: string | null;
  fallbackIconUrl?: string;
}

export function DynamicFavicon(props: DynamicFaviconProps) {
  const { iconUrl, fallbackIconUrl = "/images/annix-icon.png" } = props;
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const effectiveUrl = iconUrl || fallbackIconUrl;

    const updateFavicon = (url: string) => {
      const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      const existingAppleIcon = document.querySelector(
        'link[rel="apple-touch-icon"]',
      ) as HTMLLinkElement | null;

      if (existingFavicon) {
        existingFavicon.href = url;
      } else {
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/png";
        favicon.href = url;
        document.head.appendChild(favicon);
      }

      if (existingAppleIcon) {
        existingAppleIcon.href = url;
      } else {
        const appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        appleIcon.href = url;
        document.head.appendChild(appleIcon);
      }
    };

    if (iconUrl?.startsWith("data:")) {
      updateFavicon(iconUrl);
    } else if (iconUrl && !iconUrl.startsWith("/") && !iconUrl.startsWith("http")) {
      fetch(iconUrl)
        .then((response) => response.blob())
        .then((blob) => {
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          updateFavicon(blobUrl);
        })
        .catch(() => {
          updateFavicon(fallbackIconUrl);
        });
    } else {
      updateFavicon(effectiveUrl);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [iconUrl, fallbackIconUrl]);

  return null;
}
