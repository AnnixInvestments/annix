/**
 * Environmental Intelligence Service
 * Orchestrates fetching and transforming environmental data from multiple sources
 */

import {
  fetchOpenMeteoData,
  fetchSoilData,
  extractHumidity,
  extractSoilMoisture,
  extractSoilTexture,
  type OpenMeteoResponse,
  type SoilGridsResponse,
} from '../api/externalApis';

import { getMarineInfluence } from '../utils/coastlineCalculation';

// Types matching the form's GlobalSpecs environmental fields
export interface EnvironmentalData {
  ecpMarineInfluence?: 'None' | 'Coastal' | 'Offshore';
  ecpIso12944Category?: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CX';
  ecpIndustrialPollution?: 'None' | 'Moderate' | 'Heavy';
  ecpSoilType?: 'Sandy' | 'Clay' | 'Rocky' | 'Marshy';
  ecpSoilResistivity?: 'VeryLow' | 'Low' | 'Medium' | 'High';
  ecpSoilMoisture?: 'Dry' | 'Normal' | 'Wet' | 'Saturated';
}

export interface EnvironmentalFetchResult {
  data: EnvironmentalData;
  metadata: {
    distanceToCoastKm?: number;
    humidity?: number;
    soilMoisture?: number;
    soilTexture?: {
      clay: number | null;
      sand: number | null;
      silt: number | null;
      coarseFragments: number | null;
    };
  };
  errors: string[];
  isComplete: boolean;
}

interface LocationCoordinates {
  lat: number;
  lng: number;
}

// Thresholds for environmental classification
const THRESHOLDS = {
  humidity: {
    veryHigh: 85,
    high: 75,
    moderate: 60,
    low: 45,
  },
  soilMoisture: {
    saturated: 0.4,
    wet: 0.25,
    normal: 0.1,
  },
  soilTexture: {
    clay: 40,       // % for Clay classification
    sand: 70,       // % for Sandy classification
    coarse: 30,     // % for Rocky classification
  },
};

/**
 * Classify ISO 12944 corrosivity category based on environmental factors
 */
function classifyIso12944(
  marineInfluence: 'None' | 'Coastal' | 'Offshore',
  humidity: number | null,
  industrialPollution: 'None' | 'Moderate' | 'Heavy'
): 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'CX' {
  // CX: Extreme (offshore marine)
  if (marineInfluence === 'Offshore') {
    return 'CX';
  }

  // C5: Very high (coastal with high humidity or heavy industrial)
  if (marineInfluence === 'Coastal') {
    if (humidity !== null && humidity > THRESHOLDS.humidity.veryHigh) {
      return 'C5';
    }
    if (industrialPollution === 'Heavy') {
      return 'C5';
    }
    return 'C4'; // Coastal defaults to at least C4
  }

  // Heavy industrial pollution
  if (industrialPollution === 'Heavy') {
    return 'C4';
  }

  // Moderate industrial pollution
  if (industrialPollution === 'Moderate') {
    if (humidity !== null && humidity > THRESHOLDS.humidity.high) {
      return 'C4';
    }
    return 'C3';
  }

  // No coastal or industrial - classify by humidity
  if (humidity !== null) {
    if (humidity > THRESHOLDS.humidity.high) {
      return 'C3';
    }
    if (humidity > THRESHOLDS.humidity.moderate) {
      return 'C2';
    }
    return 'C1';
  }

  // Default to moderate if no data
  return 'C2';
}

/**
 * Classify soil type based on texture percentages
 */
function classifySoilType(
  clay: number | null,
  sand: number | null,
  coarseFragments: number | null,
  moisture: number | null
): 'Sandy' | 'Clay' | 'Rocky' | 'Marshy' {
  // Rocky: high coarse fragments
  if (coarseFragments !== null && coarseFragments > THRESHOLDS.soilTexture.coarse) {
    return 'Rocky';
  }

  // Marshy: high moisture with organic indication (using moisture as proxy)
  if (moisture !== null && moisture > THRESHOLDS.soilMoisture.saturated) {
    return 'Marshy';
  }

  // Clay: high clay content
  if (clay !== null && clay > THRESHOLDS.soilTexture.clay) {
    return 'Clay';
  }

  // Sandy: high sand content
  if (sand !== null && sand > THRESHOLDS.soilTexture.sand) {
    return 'Sandy';
  }

  // Default based on relative proportions
  if (clay !== null && sand !== null) {
    return clay > sand ? 'Clay' : 'Sandy';
  }

  return 'Sandy'; // Default
}

/**
 * Classify soil moisture level
 */
function classifySoilMoistureLevel(
  moisture: number | null
): 'Dry' | 'Normal' | 'Wet' | 'Saturated' {
  if (moisture === null) {
    return 'Normal'; // Default
  }

  if (moisture > THRESHOLDS.soilMoisture.saturated) {
    return 'Saturated';
  }
  if (moisture > THRESHOLDS.soilMoisture.wet) {
    return 'Wet';
  }
  if (moisture > THRESHOLDS.soilMoisture.normal) {
    return 'Normal';
  }
  return 'Dry';
}

/**
 * Classify soil resistivity based on moisture and clay content
 * Lower resistivity = more corrosive
 */
function classifySoilResistivity(
  moisture: number | null,
  clay: number | null
): 'VeryLow' | 'Low' | 'Medium' | 'High' {
  const moistureLevel = classifySoilMoistureLevel(moisture);
  const isHighClay = clay !== null && clay > THRESHOLDS.soilTexture.clay;

  // Very low resistivity (very corrosive): saturated + high clay
  if (moistureLevel === 'Saturated' && isHighClay) {
    return 'VeryLow';
  }

  // Low resistivity (corrosive): wet conditions or high clay
  if (moistureLevel === 'Saturated' || moistureLevel === 'Wet') {
    return isHighClay ? 'VeryLow' : 'Low';
  }

  // Medium resistivity: normal conditions
  if (moistureLevel === 'Normal') {
    return isHighClay ? 'Low' : 'Medium';
  }

  // High resistivity (low corrosivity): dry, especially sandy
  return 'High';
}

/**
 * Estimate industrial pollution level based on region/country heuristics
 * This is a simplified heuristic - for more accuracy, additional data sources would be needed
 */
function estimateIndustrialPollution(
  region?: string,
  country?: string
): 'None' | 'Moderate' | 'Heavy' {
  if (!region && !country) {
    return 'None';
  }

  const locationStr = `${region || ''} ${country || ''}`.toLowerCase();

  // Known industrial regions in South Africa
  const heavyIndustrialAreas = [
    'johannesburg', 'pretoria', 'gauteng', 'durban', 'ethekwini',
    'richards bay', 'secunda', 'sasolburg', 'vanderbijlpark'
  ];

  const moderateIndustrialAreas = [
    'cape town', 'western cape', 'port elizabeth', 'nelson mandela bay',
    'east london', 'bloemfontein', 'polokwane', 'rustenburg'
  ];

  for (const area of heavyIndustrialAreas) {
    if (locationStr.includes(area)) {
      return 'Heavy';
    }
  }

  for (const area of moderateIndustrialAreas) {
    if (locationStr.includes(area)) {
      return 'Moderate';
    }
  }

  return 'None';
}

/**
 * Main function to fetch and transform environmental data from location
 */
export async function fetchEnvironmentalData(
  location: LocationCoordinates,
  addressInfo?: { region?: string; country?: string }
): Promise<EnvironmentalFetchResult> {
  const errors: string[] = [];
  const metadata: EnvironmentalFetchResult['metadata'] = {};

  // Initialize with partial data
  const data: EnvironmentalData = {};

  // 1. Calculate marine influence (local calculation - always succeeds)
  const marineResult = getMarineInfluence(location.lat, location.lng);
  data.ecpMarineInfluence = marineResult.influence;
  metadata.distanceToCoastKm = marineResult.distanceToCoastKm;

  // 2. Estimate industrial pollution from region/country
  const industrialPollution = estimateIndustrialPollution(
    addressInfo?.region,
    addressInfo?.country
  );
  data.ecpIndustrialPollution = industrialPollution;

  // 3. Fetch external API data in parallel
  const apiResults = await Promise.allSettled([
    fetchOpenMeteoData(location.lat, location.lng),
    fetchSoilData(location.lat, location.lng),
  ]);

  // Process Open-Meteo results
  let humidity: number | null = null;
  let soilMoisture: number | null = null;

  if (apiResults[0].status === 'fulfilled') {
    const meteoData = apiResults[0].value;
    humidity = extractHumidity(meteoData);
    soilMoisture = extractSoilMoisture(meteoData);
    metadata.humidity = humidity ?? undefined;
    metadata.soilMoisture = soilMoisture ?? undefined;

    // Classify soil moisture
    data.ecpSoilMoisture = classifySoilMoistureLevel(soilMoisture);
  } else {
    errors.push('Weather data unavailable - humidity and soil moisture not auto-filled');
  }

  // Process SoilGrids results
  let soilTexture: ReturnType<typeof extractSoilTexture> | null = null;

  if (apiResults[1].status === 'fulfilled') {
    soilTexture = extractSoilTexture(apiResults[1].value);
    metadata.soilTexture = soilTexture;

    // Classify soil type
    data.ecpSoilType = classifySoilType(
      soilTexture.clay,
      soilTexture.sand,
      soilTexture.coarseFragments,
      soilMoisture
    );

    // Classify soil resistivity
    data.ecpSoilResistivity = classifySoilResistivity(
      soilMoisture,
      soilTexture.clay
    );
  } else {
    errors.push('Soil data unavailable - soil type and resistivity not auto-filled');
  }

  // 4. Calculate ISO 12944 category (composite of multiple factors)
  data.ecpIso12944Category = classifyIso12944(
    data.ecpMarineInfluence || 'None',
    humidity,
    industrialPollution
  );

  // Determine if we got complete data
  const isComplete = errors.length === 0;

  return {
    data,
    metadata,
    errors,
    isComplete,
  };
}
