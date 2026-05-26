import { CvGeocodeCache } from "../entities/cv-geocode-cache.entity";

export abstract class CvGeocodeCacheRepository {
  abstract findByAddress(address: string): Promise<CvGeocodeCache | null>;
  abstract upsert(entry: {
    address: string;
    lat: number;
    lon: number;
    provider: string;
  }): Promise<void>;
  abstract clear(): Promise<void>;
}
