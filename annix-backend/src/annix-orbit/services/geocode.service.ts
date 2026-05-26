import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CvGeocodeCacheRepository } from "../repositories/cv-geocode-cache.repository";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const COORD_PRECISION = 2;

export interface GeocodeResult {
  lat: number;
  lon: number;
}

@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name);
  private readonly apiKey: string | null;

  constructor(
    private readonly cacheRepo: CvGeocodeCacheRepository,
    private readonly configService: ConfigService,
  ) {
    const fromGeocodeEnv = this.configService.get<string>("GOOGLE_GEOCODE_API_KEY");
    const fromPlacesEnv = this.configService.get<string>("GOOGLE_PLACES_API_KEY");
    const fromMapsEnv = this.configService.get<string>("GOOGLE_MAPS_API_KEY");
    this.apiKey = fromGeocodeEnv ?? fromPlacesEnv ?? fromMapsEnv ?? null;
    if (!this.apiKey) {
      this.logger.warn(
        "No Google Maps API key configured (GOOGLE_GEOCODE_API_KEY / GOOGLE_PLACES_API_KEY / GOOGLE_MAPS_API_KEY) — GeocodeService is a no-op",
      );
    }
  }

  async geocode(rawAddress: string): Promise<GeocodeResult | null> {
    const address = normaliseAddress(rawAddress);
    if (address.length === 0) return null;

    const cached = await this.cacheRepo.findByAddress(address);
    if (cached) {
      return { lat: cached.lat, lon: cached.lon };
    }

    if (!this.apiKey) return null;

    const fetched = await this.callGoogleGeocode(address);
    if (!fetched) return null;

    const rounded = {
      lat: roundCoord(fetched.lat),
      lon: roundCoord(fetched.lon),
    };

    try {
      await this.cacheRepo.upsert({
        address,
        lat: rounded.lat,
        lon: rounded.lon,
        provider: "google",
      });
    } catch (err) {
      this.logger.warn(
        `Geocode cache write failed for "${address}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return rounded;
  }

  async invalidateCache(): Promise<void> {
    await this.cacheRepo.clear();
  }

  private async callGoogleGeocode(address: string): Promise<GeocodeResult | null> {
    try {
      const params = new URLSearchParams({
        address: `${address}, South Africa`,
        key: this.apiKey ?? "",
        region: "za",
      });
      const response = await fetch(`${GEOCODE_URL}?${params.toString()}`);
      if (!response.ok) {
        this.logger.warn(`Google geocode HTTP ${response.status} for "${address}"`);
        return null;
      }
      const data = (await response.json()) as {
        status: string;
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
      };
      if (data.status !== "OK" || data.results.length === 0) {
        this.logger.debug(`Google geocode status=${data.status} for "${address}"`);
        return null;
      }
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lon: location.lng };
    } catch (err) {
      this.logger.warn(
        `Google geocode threw for "${address}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}

export function haversineKm(a: GeocodeResult, b: GeocodeResult): number {
  const R = 6371;
  const dLat = degToRad(b.lat - a.lat);
  const dLon = degToRad(b.lon - a.lon);
  const lat1 = degToRad(a.lat);
  const lat2 = degToRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function normaliseAddress(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function roundCoord(value: number): number {
  const factor = 10 ** COORD_PRECISION;
  return Math.round(value * factor) / factor;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
