export interface ManifestConfig {
  name: string;
  shortName: string;
  startUrl: string;
  scope: string;
  themeColor: string;
  backgroundColor: string;
  iconUrls: {
    size192: string;
    size512: string;
  };
  shortcuts?: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
}

export interface WebAppManifest {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  orientation: "portrait" | "landscape" | "any";
  theme_color: string;
  background_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
  shortcuts?: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
}

export function generateManifest(config: ManifestConfig): WebAppManifest {
  return {
    name: config.name,
    short_name: config.shortName,
    start_url: config.startUrl,
    scope: config.scope,
    display: "standalone",
    orientation: "portrait",
    theme_color: config.themeColor,
    background_color: config.backgroundColor,
    icons: [
      {
        src: config.iconUrls.size192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: config.iconUrls.size512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    shortcuts: config.shortcuts,
  };
}

export function manifestToBlob(manifest: WebAppManifest): Blob {
  return new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/manifest+json",
  });
}

export function manifestToBlobUrl(manifest: WebAppManifest): string {
  const blob = manifestToBlob(manifest);
  return URL.createObjectURL(blob);
}
