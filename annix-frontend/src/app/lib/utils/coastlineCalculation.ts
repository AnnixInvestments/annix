/**
 * Coastline distance calculation utility
 * Calculates distance to nearest coastline for marine influence classification
 */

interface CoastlinePoint {
  lat: number;
  lng: number;
}

// Simplified South African coastline points (key coastal locations)
// Coverage from Namibia border (west) around to Mozambique border (east)
const SOUTH_AFRICA_COASTLINE: CoastlinePoint[] = [
  // West Coast (Atlantic)
  { lat: -28.7167, lng: 16.4500 },   // Alexander Bay
  { lat: -29.2667, lng: 16.8833 },   // Port Nolloth
  { lat: -30.9500, lng: 17.5833 },   // Hondeklip Bay
  { lat: -31.6333, lng: 18.0167 },   // Lamberts Bay
  { lat: -32.0833, lng: 18.3333 },   // Elands Bay
  { lat: -32.7500, lng: 17.9333 },   // Saldanha Bay
  { lat: -33.0167, lng: 17.9333 },   // Langebaan
  { lat: -33.4833, lng: 18.3667 },   // Melkbosstrand
  { lat: -33.9167, lng: 18.4167 },   // Cape Town

  // Cape Peninsula
  { lat: -34.0833, lng: 18.3500 },   // Hout Bay
  { lat: -34.2000, lng: 18.4333 },   // Simon's Town
  { lat: -34.3500, lng: 18.4833 },   // Cape Point

  // South Coast (Indian Ocean)
  { lat: -34.4167, lng: 19.2500 },   // Hermanus
  { lat: -34.5833, lng: 19.6167 },   // Gansbaai
  { lat: -34.4667, lng: 20.5000 },   // Arniston
  { lat: -34.1833, lng: 22.1333 },   // Mossel Bay
  { lat: -34.0333, lng: 23.0500 },   // George/Wilderness
  { lat: -34.0500, lng: 23.3667 },   // Knysna
  { lat: -33.9667, lng: 23.9167 },   // Plettenberg Bay
  { lat: -33.7667, lng: 25.9500 },   // Port Elizabeth
  { lat: -33.0333, lng: 27.9167 },   // East London

  // East Coast
  { lat: -31.6000, lng: 29.5333 },   // Port St Johns
  { lat: -30.8667, lng: 30.3833 },   // Port Shepstone
  { lat: -29.8667, lng: 31.0333 },   // Durban
  { lat: -29.5500, lng: 31.2167 },   // Ballito
  { lat: -28.7500, lng: 32.0667 },   // Richards Bay
  { lat: -27.5333, lng: 32.6833 },   // St Lucia
  { lat: -27.0167, lng: 32.9000 },   // Kosi Bay
];

// Additional global coastline points for major regions
const GLOBAL_COASTLINE_SAMPLES: CoastlinePoint[] = [
  // Europe - Mediterranean
  { lat: 41.9000, lng: 12.5000 },    // Italy
  { lat: 36.7000, lng: -4.4000 },    // Spain
  { lat: 43.3000, lng: 5.3700 },     // France

  // Europe - Atlantic
  { lat: 51.5000, lng: 0.1276 },     // UK
  { lat: 52.3700, lng: 4.8900 },     // Netherlands

  // Middle East
  { lat: 25.2000, lng: 55.2700 },    // UAE
  { lat: 29.5000, lng: 34.9200 },    // Red Sea

  // Asia
  { lat: 1.3500, lng: 103.8200 },    // Singapore
  { lat: 22.3000, lng: 114.1700 },   // Hong Kong

  // Australia
  { lat: -33.8700, lng: 151.2100 },  // Sydney
  { lat: -31.9500, lng: 115.8600 },  // Perth

  // Americas
  { lat: 25.7600, lng: -80.1900 },   // Miami
  { lat: 34.0500, lng: -118.2500 },  // Los Angeles
  { lat: -22.9000, lng: -43.1700 },  // Rio de Janeiro
];

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a point is likely in South Africa based on bounding box
 */
function isInSouthAfricaRegion(lat: number, lng: number): boolean {
  return lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33;
}

/**
 * Calculate distance to nearest coastline point
 * @param lat Latitude of the location
 * @param lng Longitude of the location
 * @returns Distance to nearest coast in kilometers
 */
export function calculateDistanceToCoast(lat: number, lng: number): number {
  // Select appropriate coastline dataset based on location
  const coastlinePoints = isInSouthAfricaRegion(lat, lng)
    ? SOUTH_AFRICA_COASTLINE
    : [...SOUTH_AFRICA_COASTLINE, ...GLOBAL_COASTLINE_SAMPLES];

  let minDistance = Infinity;

  for (const point of coastlinePoints) {
    const distance = haversineDistance(lat, lng, point.lat, point.lng);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

/**
 * Classify marine influence based on distance to coast
 * @param distanceKm Distance to coast in kilometers
 * @returns Marine influence classification
 */
export function classifyMarineInfluence(
  distanceKm: number
): 'None' | 'Coastal' | 'Offshore' {
  if (distanceKm < 1) {
    return 'Offshore';
  }
  if (distanceKm < 5) {
    return 'Coastal';
  }
  return 'None';
}

/**
 * Get marine influence classification for a location
 * Convenience function combining distance calculation and classification
 */
export function getMarineInfluence(
  lat: number,
  lng: number
): {
  influence: 'None' | 'Coastal' | 'Offshore';
  distanceToCoastKm: number;
} {
  const distanceToCoastKm = calculateDistanceToCoast(lat, lng);
  const influence = classifyMarineInfluence(distanceToCoastKm);

  return {
    influence,
    distanceToCoastKm: Math.round(distanceToCoastKm * 10) / 10, // Round to 1 decimal
  };
}
