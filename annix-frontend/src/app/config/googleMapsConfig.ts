export interface GoogleMapDisplayConfig {
  mapHeight?: number;
  showGeocodingLoader?: boolean;
  layout?: 'default' | 'responsive';
  addressInfoMaxHeight?: number;
  containerClassName?: string;
}

export const GOOGLE_MAP_PRESETS = {
  default: {
    mapHeight: 400,
    showGeocodingLoader: true,
    layout: 'default' as const,
  },

  responsive: {
    mapHeight: 250,
    showGeocodingLoader: false,
    layout: 'responsive' as const,
    addressInfoMaxHeight: 200,
  },

  compact: {
    mapHeight: 300,
    showGeocodingLoader: false,
    layout: 'default' as const,
  },
} as const;

export type GoogleMapPreset = keyof typeof GOOGLE_MAP_PRESETS;