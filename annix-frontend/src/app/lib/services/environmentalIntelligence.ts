/**
 * Environmental Intelligence Service
 *
 * Automatically populates Environmental Intelligence fields based on geographic location.
 * No user input required beyond latitude/longitude.
 *
 * Data Sources (in execution order):
 * 1. ISRIC SoilGrids - Soil Type & Soil Texture
 * 2. Agromonitoring - Soil Moisture
 * 3. USDA SSURGO (US) or SoilGrids-derived (non-US) - Soil Drainage
 * 4. OpenWeatherMap - Temperature & Relative Humidity
 * 5. OpenWeatherMap Air Pollution - Industrial Atmospheric Pollution
 *
 * Fields Populated:
 * - Soil Type (WRB classification)
 * - Soil Texture (USDA classification)
 * - Soil Moisture (value + classification)
 * - Soil Drainage / Drainage Class
 * - Temperature (min, max, mean)
 * - Relative Humidity (min, max, mean)
 * - Industrial Atmospheric Pollution (from air quality data)
 *
 * NOT Populated (per requirements):
 * - Soil Resistivity
 * - Soil Corrosivity
 */

import {
  fetchSoilGridsTexture,
  fetchSoilGridsClassification,
  fetchAgromonitoringSoilMoisture,
  fetchSsurgoDrainage,
  fetchOpenMeteoData,
  fetchOpenWeatherMapData,
  fetchAirPollutionData,
  extractSoilTexture,
  extractWrbClass,
  extractHumidity,
  extractSoilMoistureFromOpenMeteo,
  extractWeatherData,
  classifyUsdaSoilTexture,
  classifySoilMoisture,
  classifyIndustrialPollution,
  deriveDrainageFromSoilGrids,
  wrbToHumanReadable,
} from '../api/externalApis';

import { getMarineInfluence } from '../utils/coastlineCalculation';

// Types matching the form's GlobalSpecs environmental fields
export interface EnvironmentalData {
  // Location-based (always populated)
  ecpMarineInfluence?: 'None' | 'Coastal' | 'Offshore';
  ecpIso12944Category?: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CX';
  ecpIndustrialPollution?: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';

  // Soil data (auto-populated from APIs)
  soilType?: string;           // WRB classification (human-readable)
  soilTexture?: string;        // USDA soil texture classification
  soilMoisture?: string;       // Percentage value
  soilMoistureClass?: 'Low' | 'Moderate' | 'High';
  soilDrainage?: string;       // Drainage class description
  soilDrainageSource?: string; // 'USDA SSURGO' or 'model-derived'

  // Temperature data (auto-populated from OpenWeatherMap)
  tempMin?: number;            // Minimum temperature (°C)
  tempMax?: number;            // Maximum temperature (°C)
  tempMean?: number;           // Mean/average temperature (°C)

  // Relative Humidity data (auto-populated from OpenWeatherMap)
  humidityMin?: number;        // Minimum relative humidity (%)
  humidityMax?: number;        // Maximum relative humidity (%)
  humidityMean?: number;       // Mean/average relative humidity (%)
}

export interface EnvironmentalMetadata {
  distanceToCoastKm?: number;
  humidity?: number;
  soilMoistureRaw?: number;
  soilTexture?: {
    clay: number | null;
    sand: number | null;
    silt: number | null;
    bulkDensity: number | null;
    organicCarbon: number | null;
  };
  wrbClass?: string;
  weather?: {
    temperature: { min: number; max: number; mean: number };
    humidity: { min: number; max: number; mean: number };
    source: string;
  };
  airPollution?: {
    aqi: number;
    components: {
      pm2_5: number;
      pm10: number;
      no2: number;
      so2: number;
      co: number;
    };
    source: string;
  };
  fetchTimestamp: string;
  dataSources: string[];
}

export interface EnvironmentalFetchResult {
  data: EnvironmentalData;
  metadata: EnvironmentalMetadata;
  errors: string[];
  isComplete: boolean;
}

interface LocationCoordinates {
  lat: number;
  lng: number;
}

// Countries that use SSURGO
const SSURGO_COUNTRIES = ['united states', 'usa', 'us', 'america'];

// Thresholds for environmental classification
const THRESHOLDS = {
  humidity: {
    veryHigh: 85,
    high: 75,
    moderate: 60,
    low: 45,
  },
};

/**
 * Check if location is in the United States
 */
function isUnitedStates(country?: string): boolean {
  if (!country) return false;
  return SSURGO_COUNTRIES.some(c => country.toLowerCase().includes(c));
}

/**
 * Classify ISO 12944 corrosivity category based on environmental factors
 */
function classifyIso12944(
  marineInfluence: 'None' | 'Coastal' | 'Offshore',
  humidity: number | null,
  industrialPollution: 'None' | 'Moderate' | 'Heavy'
): 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CX' {
  if (marineInfluence === 'Offshore') return 'CX';

  if (marineInfluence === 'Coastal') {
    if (humidity !== null && humidity > THRESHOLDS.humidity.veryHigh) return 'C5';
    if (industrialPollution === 'Heavy') return 'C5';
    return 'C4';
  }

  if (industrialPollution === 'Heavy') return 'C4';

  if (industrialPollution === 'Moderate') {
    if (humidity !== null && humidity > THRESHOLDS.humidity.high) return 'C4';
    return 'C3';
  }

  if (humidity !== null) {
    if (humidity > THRESHOLDS.humidity.high) return 'C3';
    if (humidity > THRESHOLDS.humidity.moderate) return 'C2';
    return 'C1';
  }

  return 'C2';
}

/**
 * Estimate industrial pollution level based on region/country heuristics
 */
function estimateIndustrialPollution(
  region?: string,
  country?: string
): 'None' | 'Moderate' | 'Heavy' {
  if (!region && !country) return 'None';

  const locationStr = `${region || ''} ${country || ''}`.toLowerCase();

  const heavyIndustrialAreas = [
    'johannesburg', 'pretoria', 'gauteng', 'durban', 'ethekwini',
    'richards bay', 'secunda', 'sasolburg', 'vanderbijlpark',
    'houston', 'los angeles', 'chicago', 'detroit', 'pittsburgh'
  ];

  const moderateIndustrialAreas = [
    'cape town', 'western cape', 'port elizabeth', 'nelson mandela bay',
    'east london', 'bloemfontein', 'polokwane', 'rustenburg',
    'denver', 'phoenix', 'dallas', 'atlanta'
  ];

  for (const area of heavyIndustrialAreas) {
    if (locationStr.includes(area)) return 'Heavy';
  }

  for (const area of moderateIndustrialAreas) {
    if (locationStr.includes(area)) return 'Moderate';
  }

  return 'None';
}

/**
 * Main function to fetch and transform environmental data from location
 *
 * Execution Order (as specified):
 * 1. Accept latitude and longitude
 * 2. Query SoilGrids → Populate Soil Type, Soil Texture
 * 3. Query Agromonitoring → Populate Soil Moisture
 * 4. Determine Soil Drainage (SSURGO for US, derived for others)
 * 5. Populate all Environmental Intelligence fields
 * 6. Attach data source and timestamp as internal metadata
 */
export async function fetchEnvironmentalData(
  location: LocationCoordinates,
  addressInfo?: { region?: string; country?: string }
): Promise<EnvironmentalFetchResult> {
  const errors: string[] = [];
  const dataSources: string[] = [];
  const data: EnvironmentalData = {};

  // Initialize metadata
  const metadata: EnvironmentalMetadata = {
    fetchTimestamp: new Date().toISOString(),
    dataSources: [],
  };

  // Step 1: Calculate marine influence (local calculation - always succeeds)
  const marineResult = getMarineInfluence(location.lat, location.lng);
  data.ecpMarineInfluence = marineResult.influence;
  metadata.distanceToCoastKm = marineResult.distanceToCoastKm;
  dataSources.push('Coastline calculation');

  // Estimate industrial pollution from region/country
  const industrialPollution = estimateIndustrialPollution(
    addressInfo?.region,
    addressInfo?.country
  );
  data.ecpIndustrialPollution = industrialPollution;

  // Step 2: Query SoilGrids for Soil Type and Texture
  let soilTextureData: ReturnType<typeof extractSoilTexture> | null = null;

  try {
    const [textureResponse, classResponse] = await Promise.all([
      fetchSoilGridsTexture(location.lat, location.lng),
      fetchSoilGridsClassification(location.lat, location.lng),
    ]);

    // Extract soil texture
    soilTextureData = extractSoilTexture(textureResponse);
    metadata.soilTexture = soilTextureData;

    // Get WRB classification for Soil Type
    const wrbClass = extractWrbClass(classResponse);
    metadata.wrbClass = wrbClass || undefined;

    if (wrbClass) {
      data.soilType = wrbToHumanReadable(wrbClass);
      dataSources.push('ISRIC SoilGrids');
    }

    // Determine USDA Soil Texture
    if (soilTextureData.clay !== null &&
        soilTextureData.sand !== null &&
        soilTextureData.silt !== null) {
      data.soilTexture = classifyUsdaSoilTexture(
        soilTextureData.clay,
        soilTextureData.sand,
        soilTextureData.silt
      );
    }
  } catch (error) {
    console.error('SoilGrids API error:', error);
    errors.push('Soil type and texture data unavailable');
  }

  // Step 3: Query Agromonitoring for Soil Moisture
  let soilMoistureValue: number | null = null;

  try {
    const agroData = await fetchAgromonitoringSoilMoisture(location.lat, location.lng);

    if (agroData && agroData.moisture !== undefined) {
      soilMoistureValue = agroData.moisture;
      metadata.soilMoistureRaw = soilMoistureValue;

      const moistureResult = classifySoilMoisture(soilMoistureValue);
      data.soilMoisture = moistureResult.percentage;
      data.soilMoistureClass = moistureResult.classification;
      dataSources.push('Agromonitoring');
    } else {
      // Fallback to Open-Meteo if Agromonitoring fails
      try {
        const meteoData = await fetchOpenMeteoData(location.lat, location.lng);
        const meteoMoisture = extractSoilMoistureFromOpenMeteo(meteoData);
        const humidity = extractHumidity(meteoData);

        if (meteoMoisture !== null) {
          soilMoistureValue = meteoMoisture;
          metadata.soilMoistureRaw = soilMoistureValue;

          const moistureResult = classifySoilMoisture(soilMoistureValue);
          data.soilMoisture = moistureResult.percentage;
          data.soilMoistureClass = moistureResult.classification;
          dataSources.push('Open-Meteo (fallback)');
        }

        if (humidity !== null) {
          metadata.humidity = humidity;
        }
      } catch {
        errors.push('Soil moisture data unavailable');
      }
    }
  } catch (error) {
    console.error('Soil moisture fetch error:', error);
    errors.push('Soil moisture data unavailable');
  }

  // Ensure we have humidity data for ISO classification
  if (metadata.humidity === undefined) {
    try {
      const meteoData = await fetchOpenMeteoData(location.lat, location.lng);
      const humidity = extractHumidity(meteoData);
      if (humidity !== null) {
        metadata.humidity = humidity;
        if (!dataSources.includes('Open-Meteo') && !dataSources.includes('Open-Meteo (fallback)')) {
          dataSources.push('Open-Meteo');
        }
      }
    } catch {
      // Non-critical - continue without humidity
    }
  }

  // Step 4: Determine Soil Drainage
  const isUS = isUnitedStates(addressInfo?.country);

  if (isUS) {
    // Use USDA SSURGO for US locations
    try {
      const ssurgoDrainage = await fetchSsurgoDrainage(location.lat, location.lng);
      if (ssurgoDrainage) {
        data.soilDrainage = ssurgoDrainage;
        data.soilDrainageSource = 'USDA SSURGO';
        dataSources.push('USDA SSURGO');
      } else {
        // Fallback to derived if SSURGO doesn't have data
        if (soilTextureData) {
          const derived = deriveDrainageFromSoilGrids(
            soilTextureData.clay,
            soilTextureData.bulkDensity,
            soilTextureData.organicCarbon
          );
          data.soilDrainage = derived.class;
          data.soilDrainageSource = 'model-derived';
        }
      }
    } catch {
      // Fallback to derived
      if (soilTextureData) {
        const derived = deriveDrainageFromSoilGrids(
          soilTextureData.clay,
          soilTextureData.bulkDensity,
          soilTextureData.organicCarbon
        );
        data.soilDrainage = derived.class;
        data.soilDrainageSource = 'model-derived';
      }
    }
  } else {
    // Derive from SoilGrids for non-US locations
    if (soilTextureData) {
      const derived = deriveDrainageFromSoilGrids(
        soilTextureData.clay,
        soilTextureData.bulkDensity,
        soilTextureData.organicCarbon
      );
      data.soilDrainage = derived.class;
      data.soilDrainageSource = 'model-derived';
    }
  }

  // Step 5: Query OpenWeatherMap for Temperature & Humidity
  try {
    const weatherResponse = await fetchOpenWeatherMapData(location.lat, location.lng);
    const weatherData = extractWeatherData(weatherResponse);

    if (weatherData) {
      // Populate temperature fields
      data.tempMin = weatherData.temperature.min;
      data.tempMax = weatherData.temperature.max;
      data.tempMean = weatherData.temperature.mean;

      // Populate humidity fields
      data.humidityMin = weatherData.humidity.min;
      data.humidityMax = weatherData.humidity.max;
      data.humidityMean = weatherData.humidity.mean;

      // Update metadata with more accurate humidity
      metadata.humidity = weatherData.humidity.mean;
      metadata.weather = {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        source: weatherData.source,
      };

      dataSources.push('OpenWeatherMap');
    }
  } catch (error) {
    console.error('OpenWeatherMap API error:', error);
    errors.push('Temperature and humidity data unavailable');
  }

  // Step 6: Query OpenWeatherMap Air Pollution API for Industrial Atmospheric Pollution
  try {
    const pollutionResponse = await fetchAirPollutionData(location.lat, location.lng);
    const pollutionData = classifyIndustrialPollution(pollutionResponse);

    if (pollutionData) {
      // Populate industrial pollution field (replaces heuristic estimation)
      data.ecpIndustrialPollution = pollutionData.level;

      // Store detailed pollution data in metadata
      metadata.airPollution = {
        aqi: pollutionData.aqi,
        components: pollutionData.components,
        source: pollutionData.source,
      };

      if (!dataSources.includes('OpenWeatherMap')) {
        dataSources.push('OpenWeatherMap');
      }
      dataSources.push('OpenWeather Air Pollution API');
    }
  } catch (error) {
    console.error('Air Pollution API error:', error);
    // Keep the heuristic-based industrial pollution value if API fails
  }

  // Step 7: Calculate ISO 12944 category (composite of multiple factors)
  // Use actual pollution data if available, otherwise fall back to heuristic
  const pollutionForIso = data.ecpIndustrialPollution === 'High' || data.ecpIndustrialPollution === 'Very High'
    ? 'Heavy'
    : data.ecpIndustrialPollution === 'Moderate'
      ? 'Moderate'
      : 'None';

  data.ecpIso12944Category = classifyIso12944(
    data.ecpMarineInfluence || 'None',
    metadata.humidity ?? null,
    pollutionForIso as 'None' | 'Moderate' | 'Heavy'
  );

  // Step 8: Finalize metadata
  metadata.dataSources = dataSources;

  // Determine if we got complete data (temperature/humidity are optional)
  const isComplete = errors.length === 0 &&
    data.soilType !== undefined &&
    data.soilTexture !== undefined &&
    data.soilMoisture !== undefined &&
    data.soilDrainage !== undefined;

  return {
    data,
    metadata,
    errors,
    isComplete,
  };
}
