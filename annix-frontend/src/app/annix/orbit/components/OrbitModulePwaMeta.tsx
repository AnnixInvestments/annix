"use client";

import { useEffect } from "react";
import { ORBIT_MODULE_MANIFESTS, type OrbitModuleKey } from "../config/pwaModules";

const BASE_MANIFEST_HREF = "/api/annix-orbit/manifest.json";
const BASE_APP_TITLE = "Orbit";

function applyManifestHref(href: string) {
  const existing = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (existing) {
    existing.href = href;
  } else {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = href;
    document.head.appendChild(link);
  }
}

function applyMeta(name: string, content: string) {
  const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) {
    existing.content = content;
  } else {
    const meta = document.createElement("meta");
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
  }
}

export function OrbitModulePwaMeta(props: { module: OrbitModuleKey }) {
  const { module } = props;

  useEffect(() => {
    const config = ORBIT_MODULE_MANIFESTS[module];
    if (!config) return;
    const label = config.name;

    applyManifestHref(`${BASE_MANIFEST_HREF}?module=${module}`);
    applyMeta("apple-mobile-web-app-title", label);
    applyMeta("application-name", label);

    return () => {
      applyManifestHref(BASE_MANIFEST_HREF);
      applyMeta("apple-mobile-web-app-title", BASE_APP_TITLE);
      applyMeta("application-name", BASE_APP_TITLE);
    };
  }, [module]);

  return null;
}
