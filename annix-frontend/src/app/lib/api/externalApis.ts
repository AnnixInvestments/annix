/**
 * External API clients for environmental data fetching
 *
 * Data Sources:
 * - ISRIC SoilGrids: Soil Type & Texture (Global, no API key)
 * - Agromonitoring: Soil Moisture (requires API key)
 * - USDA SSURGO: Soil Drainage (US only, no API key)
 * - Open-Meteo: Weather/humidity data (Global, no API key)
 * - OpenWeatherMap: Temperature & Humidity (Global, requires API key)
 */

// API Base URLs
const SOILGRIDS_BASE = 'https://rest.isric.org/soilgrids/v2.0';
const AGROMONITORING_BASE = 'https://api.agromonitoring.com/agro/1.0';
const SSURGO_BASE = 'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1';
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

// Get API keys from environment
const AGROMONITORING_API_KEY = process.env.NEXT_PUBLIC_AGROMONITORING_API_KEY || '';
const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '';

// ============================================================================
// ISRIC SoilGrids API - Soil Type & Texture
// ============================================================================

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

export interface SoilGridsClassResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    layers: Array<{
      name: string;
      depths: Array<{
        label: string;
        range: { top_depth: number; bottom_depth: number };
        values: {
          most_probable: string;
        };
      }>;
    }>;
  };
}

/**
 * Fetch soil texture data from SoilGrids API (clay, sand, silt, bulk density, organic carbon)
 * Uses 0-5cm depth layer as specified
 */
export async function fetchSoilGridsTexture(lat: number, lng: number): Promise<SoilGridsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `${SOILGRIDS_BASE}/properties/query?` +
      `lon=${lng}&lat=${lat}` +
      `&property=clay&property=sand&property=silt&property=bdod&property=ocd` +
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
 * Fetch WRB soil classification from SoilGrids
 */
export async function fetchSoilGridsClassification(lat: number, lng: number): Promise<SoilGridsClassResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `${SOILGRIDS_BASE}/classification/query?` +
      `lon=${lng}&lat=${lat}&number_classes=1`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`SoilGrids Classification API error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract soil texture percentages from SoilGrids response
 */
export function extractSoilTexture(data: SoilGridsResponse): {
  clay: number | null;
  sand: number | null;
  silt: number | null;
  bulkDensity: number | null;
  organicCarbon: number | null;
} {
  const result = {
    clay: null as number | null,
    sand: null as number | null,
    silt: null as number | null,
    bulkDensity: null as number | null,
    organicCarbon: null as number | null,
  };

  if (!data.properties?.layers) {
    return result;
  }

  for (const layer of data.properties.layers) {
    const depth = layer.depths?.[0];
    if (!depth?.values?.mean) continue;

    switch (layer.name) {
      case 'clay':
        // SoilGrids returns g/kg, convert to percentage
        result.clay = depth.values.mean / 10;
        break;
      case 'sand':
        result.sand = depth.values.mean / 10;
        break;
      case 'silt':
        result.silt = depth.values.mean / 10;
        break;
      case 'bdod':
        // Bulk density in cg/cm³, convert to g/cm³
        result.bulkDensity = depth.values.mean / 100;
        break;
      case 'ocd':
        // Organic carbon density in dg/kg, convert to percentage
        result.organicCarbon = depth.values.mean / 100;
        break;
    }
  }

  return result;
}

/**
 * Extract WRB soil class from classification response
 */
export function extractWrbClass(data: SoilGridsClassResponse): string | null {
  if (!data.properties?.layers?.[0]?.depths?.[0]?.values?.most_probable) {
    return null;
  }
  return data.properties.layers[0].depths[0].values.most_probable;
}

/**
 * Determine USDA Soil Texture Classification from clay/sand/silt percentages
 * Based on the USDA soil texture triangle
 */
export function classifyUsdaSoilTexture(clay: number, sand: number, silt: number): string {
  // Normalize percentages
  const total = clay + sand + silt;
  if (total === 0) return 'Unknown';

  const c = (clay / total) * 100;
  const s = (sand / total) * 100;
  const si = (silt / total) * 100;

  // USDA Soil Texture Classification
  if (c >= 40) {
    if (si >= 40) return 'Silty Clay';
    if (s >= 45) return 'Sandy Clay';
    return 'Clay';
  }

  if (c >= 27 && c < 40) {
    if (s >= 20 && s < 45) return 'Clay Loam';
    if (s < 20 && si >= 28) return 'Silty Clay Loam';
    if (s >= 45) return 'Sandy Clay Loam';
  }

  if (c >= 7 && c < 27) {
    if (si >= 50 && c >= 12) return 'Silt Loam';
    if (si >= 50 && si < 80) return 'Silt Loam';
    if (si >= 80) return 'Silt';
    if (s >= 52) return 'Sandy Loam';
    return 'Loam';
  }

  if (c < 7) {
    if (si >= 50) return 'Silt';
    if (s >= 85) return 'Sand';
    if (s >= 70) return 'Loamy Sand';
    return 'Sandy Loam';
  }

  return 'Loam'; // Default
}

// ============================================================================
// Agromonitoring API - Soil Moisture
// ============================================================================

export interface AgromonitoringSoilResponse {
  dt: number;
  t10: number;  // Soil temperature at 10cm depth
  moisture: number;  // Soil moisture (volumetric water content)
  t0: number;  // Surface temperature
}

/**
 * Fetch soil moisture from Agromonitoring API
 * Requires AGROMONITORING_API_KEY environment variable
 */
export async function fetchAgromonitoringSoilMoisture(
  lat: number,
  lng: number
): Promise<AgromonitoringSoilResponse | null> {
  if (!AGROMONITORING_API_KEY) {
    console.warn('Agromonitoring API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Create a polygon around the point (required by API)
    const delta = 0.01; // ~1km
    const polygon = [
      [lng - delta, lat - delta],
      [lng + delta, lat - delta],
      [lng + delta, lat + delta],
      [lng - delta, lat + delta],
      [lng - delta, lat - delta],
    ];

    // First, create a polygon
    const createResponse = await fetch(
      `${AGROMONITORING_BASE}/polygons?appid=${AGROMONITORING_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `temp_${Date.now()}`,
          geo_json: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [polygon],
            },
          },
        }),
        signal: controller.signal,
      }
    );

    if (!createResponse.ok) {
      // Try alternative: direct soil endpoint with lat/lon
      const directResponse = await fetch(
        `${AGROMONITORING_BASE}/soil?lat=${lat}&lon=${lng}&appid=${AGROMONITORING_API_KEY}`,
        { signal: controller.signal }
      );

      if (directResponse.ok) {
        return await directResponse.json();
      }

      throw new Error(`Agromonitoring API error: ${createResponse.status}`);
    }

    const polygonData = await createResponse.json();
    const polyId = polygonData.id;

    // Get soil data for the polygon
    const soilResponse = await fetch(
      `${AGROMONITORING_BASE}/soil?polyid=${polyId}&appid=${AGROMONITORING_API_KEY}`,
      { signal: controller.signal }
    );

    // Clean up: delete the temporary polygon
    fetch(`${AGROMONITORING_BASE}/polygons/${polyId}?appid=${AGROMONITORING_API_KEY}`, {
      method: 'DELETE',
    }).catch(() => {}); // Ignore cleanup errors

    if (!soilResponse.ok) {
      throw new Error(`Agromonitoring Soil API error: ${soilResponse.status}`);
    }

    return await soilResponse.json();
  } catch (error) {
    console.error('Agromonitoring API error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Classify soil moisture level
 * Returns percentage value and qualitative classification
 */
export function classifySoilMoisture(moisture: number): {
  percentage: string;
  classification: 'Low' | 'Moderate' | 'High';
} {
  const percentage = Math.round(moisture * 100);

  let classification: 'Low' | 'Moderate' | 'High';
  if (percentage < 20) {
    classification = 'Low';
  } else if (percentage < 40) {
    classification = 'Moderate';
  } else {
    classification = 'High';
  }

  return {
    percentage: `${percentage}%`,
    classification,
  };
}

// ============================================================================
// USDA SSURGO API - Soil Drainage (US Only)
// ============================================================================

export interface SsurgoResponse {
  Table: Array<string[]>;
}

/**
 * Fetch soil drainage class from USDA SSURGO
 * Only works for locations within the United States
 */
export async function fetchSsurgoDrainage(lat: number, lng: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // SSURGO SQL query to get drainage class for a point
    const query = `
      SELECT drainagecl.drclassdesc
      FROM sacatalog
      INNER JOIN legend ON legend.areasymbol = sacatalog.areasymbol
      INNER JOIN mapunit ON mapunit.lkey = legend.lkey
      INNER JOIN component ON component.mukey = mapunit.mukey
      INNER JOIN cohydriccriteria ON cohydriccriteria.cokey = component.cokey
      INNER JOIN drainagecl ON drainagecl.drainageclkey = component.drainagecl
      WHERE component.cokey IN (
        SELECT TOP 1 component.cokey
        FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${lng} ${lat})') AS mukey_result
        INNER JOIN component ON component.mukey = mukey_result.mukey
        ORDER BY component.comppct_r DESC
      )
    `.trim();

    const response = await fetch(SSURGO_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(query)}&format=JSON`,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SSURGO API error: ${response.status}`);
    }

    const data: SsurgoResponse = await response.json();

    if (data.Table && data.Table.length > 0 && data.Table[0].length > 0) {
      return data.Table[0][0];
    }

    return null;
  } catch (error) {
    console.error('SSURGO API error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Derive drainage class from SoilGrids data (for non-US locations)
 * Uses clay content, bulk density, and organic carbon as proxies
 */
export function deriveDrainageFromSoilGrids(
  clay: number | null,
  bulkDensity: number | null,
  organicCarbon: number | null
): { class: 'Poor' | 'Moderate' | 'Well'; source: 'model-derived' } {
  // Default to moderate
  let drainageClass: 'Poor' | 'Moderate' | 'Well' = 'Moderate';

  if (clay !== null) {
    // High clay content = poor drainage
    if (clay > 45) {
      drainageClass = 'Poor';
    } else if (clay < 20) {
      drainageClass = 'Well';
    }
  }

  // Adjust based on bulk density (higher = more compacted = poorer drainage)
  if (bulkDensity !== null && bulkDensity > 1.6) {
    if (drainageClass === 'Well') drainageClass = 'Moderate';
    if (drainageClass === 'Moderate') drainageClass = 'Poor';
  }

  // High organic carbon can indicate wetland conditions (poor drainage)
  if (organicCarbon !== null && organicCarbon > 3) {
    if (drainageClass === 'Well') drainageClass = 'Moderate';
  }

  return {
    class: drainageClass,
    source: 'model-derived',
  };
}

// ============================================================================
// Open-Meteo API - Weather/Humidity Data
// ============================================================================

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

/**
 * Fetch weather and soil moisture data from Open-Meteo API
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
 * Extract humidity value from Open-Meteo response
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
 * Extract soil moisture value from Open-Meteo response (fallback if Agromonitoring fails)
 */
export function extractSoilMoistureFromOpenMeteo(data: OpenMeteoResponse): number | null {
  if (!data.hourly?.soil_moisture_0_to_1cm?.length) {
    return null;
  }

  const moistureValues = data.hourly.soil_moisture_0_to_1cm;
  const sum = moistureValues.reduce((acc, val) => acc + val, 0);
  return sum / moistureValues.length;
}

// ============================================================================
// WRB Soil Class Mapping
// ============================================================================

/**
 * Map WRB soil classification codes to human-readable names
 */
export const WRB_SOIL_CLASSES: Record<string, string> = {
  'Acrisols': 'Acrisol',
  'Albeluvisols': 'Albeluvisol',
  'Alisols': 'Alisol',
  'Andosols': 'Andosol',
  'Anthrosols': 'Anthrosol',
  'Arenosols': 'Arenosol',
  'Calcisols': 'Calcisol',
  'Cambisols': 'Cambisol',
  'Chernozems': 'Chernozem',
  'Cryosols': 'Cryosol',
  'Durisols': 'Durisol',
  'Ferralsols': 'Ferralsol',
  'Fluvisols': 'Fluvisol',
  'Gleysols': 'Gleysol',
  'Gypsisols': 'Gypsisol',
  'Histosols': 'Histosol',
  'Kastanozems': 'Kastanozem',
  'Leptosols': 'Leptosol',
  'Lixisols': 'Lixisol',
  'Luvisols': 'Luvisol',
  'Nitisols': 'Nitisol',
  'Phaeozems': 'Phaeozem',
  'Planosols': 'Planosol',
  'Plinthosols': 'Plinthosol',
  'Podzols': 'Podzol',
  'Regosols': 'Regosol',
  'Retisols': 'Retisol',
  'Solonchaks': 'Solonchak',
  'Solonetz': 'Solonetz',
  'Stagnosols': 'Stagnosol',
  'Technosols': 'Technosol',
  'Umbrisols': 'Umbrisol',
  'Vertisols': 'Vertisol',
};

/**
 * Convert WRB code to human-readable soil type
 */
export function wrbToHumanReadable(wrbClass: string | null): string {
  if (!wrbClass) return 'Unknown';

  // Try exact match first
  if (WRB_SOIL_CLASSES[wrbClass]) {
    return WRB_SOIL_CLASSES[wrbClass];
  }

  // Try partial match
  for (const [key, value] of Object.entries(WRB_SOIL_CLASSES)) {
    if (wrbClass.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Return cleaned up version of the original
  return wrbClass.replace(/s$/, '').replace(/_/g, ' ');
}

// ============================================================================
// OpenWeatherMap API - Temperature & Humidity
// ============================================================================

export interface OpenWeatherOneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  current?: {
    dt: number;
    temp: number;
    humidity: number;
    feels_like: number;
  };
  hourly?: Array<{
    dt: number;
    temp: number;
    humidity: number;
    feels_like: number;
  }>;
  daily?: Array<{
    dt: number;
    temp: {
      day: number;
      min: number;
      max: number;
      night: number;
      eve: number;
      morn: number;
    };
    humidity: number;
    feels_like: {
      day: number;
      night: number;
      eve: number;
      morn: number;
    };
  }>;
}

export interface WeatherData {
  temperature: {
    min: number;
    max: number;
    mean: number;
  };
  humidity: {
    min: number;
    max: number;
    mean: number;
  };
  source: 'OpenWeatherMap';
}

/**
 * Fetch weather data from OpenWeatherMap One Call API
 * Returns temperature and humidity data for auto-population
 */
export async function fetchOpenWeatherMapData(
  lat: number,
  lng: number
): Promise<OpenWeatherOneCallResponse | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeatherMap API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // Use One Call API 3.0 for comprehensive weather data
    const response = await fetch(
      `${OPENWEATHER_BASE}/onecall?` +
      `lat=${lat}&lon=${lng}` +
      `&exclude=alerts,minutely` +
      `&units=metric` +
      `&appid=${OPENWEATHER_API_KEY}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      // Fall back to free tier API if One Call fails
      console.warn('OpenWeatherMap One Call API failed, trying standard API');
      return await fetchOpenWeatherMapFallback(lat, lng);
    }

    return await response.json();
  } catch (error) {
    console.error('OpenWeatherMap API error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fallback to standard OpenWeatherMap API (free tier)
 */
async function fetchOpenWeatherMapFallback(
  lat: number,
  lng: number
): Promise<OpenWeatherOneCallResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${OPENWEATHER_BASE}/weather?` +
      `lat=${lat}&lon=${lng}` +
      `&units=metric` +
      `&appid=${OPENWEATHER_API_KEY}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform standard API response to match One Call structure
    return {
      lat: data.coord.lat,
      lon: data.coord.lon,
      timezone: 'UTC',
      current: {
        dt: data.dt,
        temp: data.main.temp,
        humidity: data.main.humidity,
        feels_like: data.main.feels_like,
      },
      daily: [{
        dt: data.dt,
        temp: {
          day: data.main.temp,
          min: data.main.temp_min,
          max: data.main.temp_max,
          night: data.main.temp,
          eve: data.main.temp,
          morn: data.main.temp,
        },
        humidity: data.main.humidity,
        feels_like: {
          day: data.main.feels_like,
          night: data.main.feels_like,
          eve: data.main.feels_like,
          morn: data.main.feels_like,
        },
      }],
    };
  } catch (error) {
    console.error('OpenWeatherMap fallback API error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract temperature and humidity data from OpenWeatherMap response
 */
export function extractWeatherData(data: OpenWeatherOneCallResponse | null): WeatherData | null {
  if (!data) return null;

  // Try to use daily data first (most accurate for min/max)
  if (data.daily && data.daily.length > 0) {
    const today = data.daily[0];

    // Calculate humidity min/max from hourly data if available
    let humidityMin = today.humidity;
    let humidityMax = today.humidity;

    if (data.hourly && data.hourly.length > 0) {
      // Get first 24 hours of data
      const todayHourly = data.hourly.slice(0, 24);
      const humidityValues = todayHourly.map(h => h.humidity);
      humidityMin = Math.min(...humidityValues);
      humidityMax = Math.max(...humidityValues);
    }

    return {
      temperature: {
        min: Math.round(today.temp.min * 10) / 10,
        max: Math.round(today.temp.max * 10) / 10,
        mean: Math.round(((today.temp.min + today.temp.max) / 2) * 10) / 10,
      },
      humidity: {
        min: humidityMin,
        max: humidityMax,
        mean: today.humidity,
      },
      source: 'OpenWeatherMap',
    };
  }

  // Fallback to current data if daily not available
  if (data.current) {
    return {
      temperature: {
        min: data.current.temp,
        max: data.current.temp,
        mean: data.current.temp,
      },
      humidity: {
        min: data.current.humidity,
        max: data.current.humidity,
        mean: data.current.humidity,
      },
      source: 'OpenWeatherMap',
    };
  }

  return null;
}

// ============================================================================
// OpenWeatherMap Air Pollution API - Industrial Atmospheric Pollution
// ============================================================================

export interface AirPollutionResponse {
  coord: {
    lon: number;
    lat: number;
  };
  list: Array<{
    dt: number;
    main: {
      aqi: number; // Air Quality Index: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    };
    components: {
      co: number;      // Carbon monoxide (μg/m³)
      no: number;      // Nitrogen monoxide (μg/m³)
      no2: number;     // Nitrogen dioxide (μg/m³)
      o3: number;      // Ozone (μg/m³)
      so2: number;     // Sulphur dioxide (μg/m³)
      pm2_5: number;   // Fine particles (μg/m³)
      pm10: number;    // Coarse particles (μg/m³)
      nh3: number;     // Ammonia (μg/m³)
    };
  }>;
}

export interface IndustrialPollutionData {
  level: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';
  aqi: number;
  components: {
    pm2_5: number;
    pm10: number;
    no2: number;
    so2: number;
    co: number;
  };
  source: 'OpenWeather Air Pollution API';
}

/**
 * Fetch air pollution data from OpenWeatherMap Air Pollution API
 * Used to determine Industrial Atmospheric Pollution level
 */
export async function fetchAirPollutionData(
  lat: number,
  lng: number
): Promise<AirPollutionResponse | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeatherMap API key not configured');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${OPENWEATHER_BASE}/air_pollution?` +
      `lat=${lat}&lon=${lng}` +
      `&appid=${OPENWEATHER_API_KEY}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`OpenWeatherMap Air Pollution API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Air Pollution API error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Classify industrial atmospheric pollution level based on AQI
 * AQI 1-2 = Low, AQI 3 = Moderate, AQI 4 = High, AQI 5 = Very High
 */
export function classifyIndustrialPollution(
  data: AirPollutionResponse | null
): IndustrialPollutionData | null {
  if (!data || !data.list || data.list.length === 0) {
    return null;
  }

  const current = data.list[0];
  const aqi = current.main.aqi;

  // Classify based on AQI
  let level: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';
  switch (aqi) {
    case 1:
      level = 'None';
      break;
    case 2:
      level = 'Low';
      break;
    case 3:
      level = 'Moderate';
      break;
    case 4:
      level = 'High';
      break;
    case 5:
      level = 'Very High';
      break;
    default:
      level = 'Moderate';
  }

  return {
    level,
    aqi,
    components: {
      pm2_5: current.components.pm2_5,
      pm10: current.components.pm10,
      no2: current.components.no2,
      so2: current.components.so2,
      co: current.components.co,
    },
    source: 'OpenWeather Air Pollution API',
  };
}
