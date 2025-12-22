/**
 * Environmental Intelligence Service
 *
 * Automatically populates Environmental Intelligence fields based on geographic location.
 * No user input required beyond latitude/longitude.
 *
 * Data Sources (in execution order):
 * 1. Coastline Calculation - Distance to Coast, Marine Influence, Air Salt Content, Flood Risk
 * 2. ISRIC SoilGrids - Soil Type & Soil Texture
 * 3. Agromonitoring - Soil Moisture
 * 4. USDA SSURGO (US) or SoilGrids-derived (non-US) - Soil Drainage
 * 5. OpenWeatherMap - Temperature, Relative Humidity, Time of Wetness (TOW)
 * 6. OpenWeatherMap Air Pollution - Industrial Atmospheric Pollution
 *
 * Fields Populated:
 * - Distance to Coast (exact, formatted)
 * - Marine Influence (detailed ISO-aligned classification)
 * - Air Salt Content (chloride deposition, ISO 9223 S0-S3)
 * - Time of Wetness (ISO 9223 T1-T5)
 * - Flooding / Water Table Risk
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

import {
  getMarineEnvironmentalData,
  type MarineEnvironmentalData,
  type AirSaltContentResult,
  type TimeOfWetnessResult,
  type FloodRiskLevel,
} from '../utils/coastlineCalculation';

// Types matching the form's GlobalSpecs environmental fields
export interface EnvironmentalData {
  // Location-based (always populated)
  ecpMarineInfluence?: 'None' | 'Coastal' | 'Offshore';
  ecpIso12944Category?: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CX';
  ecpIndustrialPollution?: 'None' | 'Low' | 'Moderate' | 'High' | 'Very High';

  // Marine & Special Conditions (auto-populated from coastline calculation)
  distanceToCoast?: number;           // Distance in km
  distanceToCoastFormatted?: string;  // Formatted string (e.g., "500 m" or "2.50 km")
  detailedMarineInfluence?: 'Extreme Marine' | 'Severe Marine' | 'High Marine' | 'Moderate Marine' | 'Low / Non-Marine';
  airSaltContent?: AirSaltContentResult;  // Chloride deposition classification
  timeOfWetness?: TimeOfWetnessResult;    // TOW classification (ISO 9223)
  floodRisk?: FloodRiskLevel;             // Flooding / Water Table Risk

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

  // Additional Atmospheric Conditions (auto-populated from OpenWeatherMap)
  annualRainfall?: string;     // Rainfall category (<250, 250-500, 500-1000, 1000-2000, >2000)
  windSpeed?: number;          // Mean wind speed in m/s
  windDirection?: string;      // Prevailing direction (N, NE, E, SE, S, SW, W, NW)
  uvIndex?: number;            // UV index value
  uvExposure?: 'Low' | 'Moderate' | 'High' | 'Very High';
  snowExposure?: 'None' | 'Low' | 'Moderate' | 'High';
  fogFrequency?: 'Low' | 'Moderate' | 'High';
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
  marineEnvironmental?: MarineEnvironmentalData;
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
): 'None' | 'Low' | 'Moderate' | 'High' | 'Very High' {
  if (!region && !country) return 'None';

  const locationStr = `${region || ''} ${country || ''}`.toLowerCase();

  const heavyIndustrialAreas = [
    'johannesburg', 'pretoria', 'gauteng', 'durban', 'ethekwini',
    'richards bay', 'secunda', 'sasolburg', 'vanderbijlpark',
    'houston', 'los angeles', 'chicago', 'detroit', 'pittsburgh'
  ];

  const lowIndustrialAreas = [
    'cape town', 'western cape', 'port elizabeth', 'nelson mandela bay',
    'east london', 'bloemfontein', 'polokwane', 'rustenburg',
    'denver', 'phoenix', 'dallas', 'atlanta'
  ];

  const moderateIndustrialAreas = [
    'durban', 'ethekwini', 'richards bay',
    'houston', 'los angeles', 'chicago'
  ];

  for (const area of heavyIndustrialAreas) {
    if (locationStr.includes(area)) return 'Very High';
  }

  for (const area of moderateIndustrialAreas) {
    if (locationStr.includes(area)) return 'Moderate';
  }

  for (const area of lowIndustrialAreas) {
    if (locationStr.includes(area)) return 'Low';
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

  // Step 1: Calculate marine environmental data (local calculation - always succeeds)
  // Note: We'll recalculate with humidity/temp after weather data is fetched
  const initialMarineData = getMarineEnvironmentalData(location.lat, location.lng);
  data.ecpMarineInfluence = initialMarineData.marineInfluence;
  data.distanceToCoast = initialMarineData.distanceToCoastKm;
  data.distanceToCoastFormatted = initialMarineData.distanceToCoastFormatted;
  data.detailedMarineInfluence = initialMarineData.detailedMarineInfluence;
  data.airSaltContent = initialMarineData.airSaltContent;
  data.floodRisk = initialMarineData.floodRisk;
  metadata.distanceToCoastKm = initialMarineData.distanceToCoastKm;
  metadata.marineEnvironmental = initialMarineData;
  dataSources.push('Coastline calculation');

  console.log('[Environmental] Step 1 - Marine data calculated:', {
    distanceToCoast: data.distanceToCoastFormatted,
    marineInfluence: data.detailedMarineInfluence,
    airSaltContent: data.airSaltContent?.level,
    floodRisk: data.floodRisk,
  });

  // Estimate industrial pollution from region/country
  const industrialPollution = estimateIndustrialPollution(
    addressInfo?.region,
    addressInfo?.country
  );
  // Map the heuristic values to the expected EnvironmentalData type
  // 'Heavy' maps to 'High' since the form uses a different scale
  data.ecpIndustrialPollution = industrialPollution === 'Heavy' ? 'High' : industrialPollution;

  // Step 2: Query SoilGrids for Soil Type and Texture
  let soilTextureData: ReturnType<typeof extractSoilTexture> | null = null;

  // Fetch both endpoints in parallel - these now return null on error instead of throwing
  const [textureResponse, classResponse] = await Promise.all([
    fetchSoilGridsTexture(location.lat, location.lng),
    fetchSoilGridsClassification(location.lat, location.lng),
  ]);

  // Process texture response if available
  if (textureResponse) {
    soilTextureData = extractSoilTexture(textureResponse);
    metadata.soilTexture = soilTextureData;

    // Determine USDA Soil Texture
    if (soilTextureData.clay !== null &&
        soilTextureData.sand !== null &&
        soilTextureData.silt !== null) {
      data.soilTexture = classifyUsdaSoilTexture(
        soilTextureData.clay,
        soilTextureData.sand,
        soilTextureData.silt
      );
      dataSources.push('ISRIC SoilGrids');
    }
  }

  // Process classification response if available
  if (classResponse) {
    const wrbClass = extractWrbClass(classResponse);
    metadata.wrbClass = wrbClass || undefined;

    if (wrbClass) {
      data.soilType = wrbToHumanReadable(wrbClass);
      if (!dataSources.includes('ISRIC SoilGrids')) {
        dataSources.push('ISRIC SoilGrids');
      }
    }
  }

  // Add error message if neither API returned data
  if (!textureResponse && !classResponse) {
    errors.push('Soil type and texture data unavailable');
  } else if (!classResponse) {
    errors.push('Soil classification unavailable');
  } else if (!textureResponse) {
    errors.push('Soil texture data unavailable');
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

      // Populate additional atmospheric conditions
      if (weatherData.annualRainfall) {
        data.annualRainfall = weatherData.annualRainfall;
      }
      if (weatherData.windSpeed !== undefined) {
        data.windSpeed = weatherData.windSpeed;
      }
      if (weatherData.windDirection) {
        data.windDirection = weatherData.windDirection;
      }
      if (weatherData.uvIndex !== undefined) {
        data.uvIndex = weatherData.uvIndex;
      }
      if (weatherData.uvExposure) {
        data.uvExposure = weatherData.uvExposure;
      }
      if (weatherData.snowExposure) {
        data.snowExposure = weatherData.snowExposure;
      }
      if (weatherData.fogFrequency) {
        data.fogFrequency = weatherData.fogFrequency;
      }

      // Update metadata with more accurate humidity
      metadata.humidity = weatherData.humidity.mean;
      metadata.weather = {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        source: weatherData.source,
      };

      dataSources.push('OpenWeatherMap');

      console.log('[Environmental] Step 5 - Weather data fetched:', {
        temp: weatherData.temperature,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        windDirection: weatherData.windDirection,
        annualRainfall: weatherData.annualRainfall,
        uvExposure: weatherData.uvExposure,
        snowExposure: weatherData.snowExposure,
        fogFrequency: weatherData.fogFrequency,
      });

      // Step 5b: Recalculate marine data with humidity/temperature for TOW and enhanced salt content
      const enhancedMarineData = getMarineEnvironmentalData(
        location.lat,
        location.lng,
        weatherData.humidity.mean,
        weatherData.temperature.mean
      );
      // Update with humidity-enhanced air salt content
      data.airSaltContent = enhancedMarineData.airSaltContent;
      // Add Time of Wetness (now available with temp/humidity)
      data.timeOfWetness = enhancedMarineData.timeOfWetness;
      metadata.marineEnvironmental = enhancedMarineData;
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

  console.log('[Environmental] Final data to apply:', {
    fieldsPopulated: Object.keys(data).filter(k => data[k as keyof EnvironmentalData] !== undefined),
    dataSources,
    errors,
    sampleData: {
      distanceToCoast: data.distanceToCoastFormatted,
      marineInfluence: data.detailedMarineInfluence,
      tempMean: data.tempMean,
      humidityMean: data.humidityMean,
      windSpeed: data.windSpeed,
      windDirection: data.windDirection,
      annualRainfall: data.annualRainfall,
    }
  });

  return {
    data,
    metadata,
    errors,
    isComplete,
  };
}

// Re-export marine types for consumers
export type { AirSaltContentResult, TimeOfWetnessResult, FloodRiskLevel, MarineEnvironmentalData };
