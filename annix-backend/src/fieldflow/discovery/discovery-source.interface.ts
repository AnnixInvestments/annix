import { DiscoveredBusiness, DiscoverySource } from "./dto";

export interface DiscoverySearchParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
  searchTerms: string[];
}

export interface DiscoveryProvider {
  source: DiscoverySource;
  search(params: DiscoverySearchParams): Promise<DiscoveredBusiness[]>;
  isConfigured(): boolean;
}
