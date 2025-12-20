/**
 * External API clients for environmental data fetching
 * All APIs used are free and do not require API keys
 */

// Open-Meteo API - Free weather and climate data
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';

// SoilGrids API - Free soil data from ISRIC
const SOILGRIDS_BASE = 'https://rest.isric.org/soilgrids/v2.0';

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly?: {
    time: string[];
    relative_humidity_2m: number[];
    soil_moisture_0_to_1cm: number[];
  };
  daily?: {
    time: string[];
    precipitation_sum: number[];
  };
}

export interface SoilGridsResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    layers: Array<{
      name: string;
      unit_measure: {
        mapped_units: string;
        target_units: string;
        conversion_factor: number;
      };
      depths: Array<{
        label: string;
        range: { top_depth: number; bottom_depth: number };
        values: {
          mean: number;
          Q0_05?: number;
          Q0_5?: number;
          Q0_95?: number;
        };
      }>;
    }>;
  };
}

/**
 * Fetch weather and soil moisture data from Open-Meteo API
 * @param lat Latitude
 * @param lng Longitude
 * @returns Weather data including humidity and soil moisture
 */
export async function fetchOpenMeteoData(lat: number, lng: number): Promise<OpenMeteoResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${OPEN_METEO_BASE}/forecast?` +
      `latitude=${lat}&longitude=${lng}` +
      `&hourly=relative_humidity_2m,soil_moisture_0_to_1cm` +
      `&daily=precipitation_sum` +
      `&timezone=auto` +
      `&forecast_days=1`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch soil texture data from SoilGrids API
 * @param lat Latitude
 * @param lng Longitude
 * @returns Soil composition data (clay, sand, silt percentages)
 */
export async function fetchSoilData(lat: number, lng: number): Promise<SoilGridsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${SOILGRIDS_BASE}/properties/query?` +
      `lon=${lng}&lat=${lat}` +
      `&property=clay&property=sand&property=silt&property=cfvo` +
      `&depth=0-5cm&value=mean`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`SoilGrids API error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract humidity value from Open-Meteo response
 * Returns average humidity from the current day's readings
 */
export function extractHumidity(data: OpenMeteoResponse): number | null {
  if (!data.hourly?.relative_humidity_2m?.length) {
    return null;
  }

  const humidityValues = data.hourly.relative_humidity_2m;
  const sum = humidityValues.reduce((acc, val) => acc + val, 0);
  return sum / humidityValues.length;
}

/**
 * Extract soil moisture value from Open-Meteo response
 * Returns average soil moisture from the current day's readings
 */
export function extractSoilMoisture(data: OpenMeteoResponse): number | null {
  if (!data.hourly?.soil_moisture_0_to_1cm?.length) {
    return null;
  }

  const moistureValues = data.hourly.soil_moisture_0_to_1cm;
  const sum = moistureValues.reduce((acc, val) => acc + val, 0);
  return sum / moistureValues.length;
}

/**
 * Extract soil texture percentages from SoilGrids response
 */
export function extractSoilTexture(data: SoilGridsResponse): {
  clay: number | null;
  sand: number | null;
  silt: number | null;
  coarseFragments: number | null;
} {
  const result = {
    clay: null as number | null,
    sand: null as number | null,
    silt: null as number | null,
    coarseFragments: null as number | null,
  };

  if (!data.properties?.layers) {
    return result;
  }

  for (const layer of data.properties.layers) {
    const depth = layer.depths?.[0];
    if (!depth?.values?.mean) continue;

    // SoilGrids returns values in g/kg, convert to percentage
    const percentage = depth.values.mean / 10;

    switch (layer.name) {
      case 'clay':
        result.clay = percentage;
        break;
      case 'sand':
        result.sand = percentage;
        break;
      case 'silt':
        result.silt = percentage;
        break;
      case 'cfvo': // Coarse fragments volumetric
        result.coarseFragments = percentage;
        break;
    }
  }

  return result;
}
