import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DiscoveryProvider, DiscoverySearchParams } from "../discovery-source.interface";
import { DiscoveredBusiness, DiscoverySource } from "../dto";

interface GooglePlaceResult {
  id: string;
  displayName: { text: string };
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  addressComponents?: Array<{
    longText: string;
    types: string[];
  }>;
}

interface GooglePlacesResponse {
  places?: GooglePlaceResult[];
}

@Injectable()
export class GooglePlacesProvider implements DiscoveryProvider {
  private readonly logger = new Logger(GooglePlacesProvider.name);
  private readonly apiKey: string | undefined;
  readonly source = DiscoverySource.GOOGLE_PLACES;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("GOOGLE_PLACES_API_KEY");
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(params: DiscoverySearchParams): Promise<DiscoveredBusiness[]> {
    if (!this.apiKey) {
      this.logger.warn("Google Places API key not configured");
      return [];
    }

    const results: DiscoveredBusiness[] = [];

    const searchQueries = params.searchTerms.length > 0 ? params.searchTerms : ["business"];

    const uniqueQueries = [...new Set(searchQueries.slice(0, 5))];

    for (const query of uniqueQueries) {
      const businesses = await this.searchWithQuery(params, query);
      results.push(...businesses);
    }

    return this.deduplicateResults(results);
  }

  private async searchWithQuery(
    params: DiscoverySearchParams,
    textQuery: string,
  ): Promise<DiscoveredBusiness[]> {
    const url = "https://places.googleapis.com/v1/places:searchText";

    const requestBody = {
      textQuery,
      locationBias: {
        circle: {
          center: {
            latitude: params.latitude,
            longitude: params.longitude,
          },
          radius: params.radiusKm * 1000,
        },
      },
      maxResultCount: 20,
      languageCode: "en",
      regionCode: "ZA",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey!,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.websiteUri,places.types,places.rating,places.userRatingCount,places.addressComponents",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Google Places API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data: GooglePlacesResponse = await response.json();

    if (!data.places) {
      return [];
    }

    return data.places.map((place) => this.transformPlace(place));
  }

  private transformPlace(place: GooglePlaceResult): DiscoveredBusiness {
    const addressComponents = place.addressComponents ?? [];

    const city = this.extractAddressComponent(addressComponents, [
      "locality",
      "sublocality",
      "administrative_area_level_2",
    ]);

    const province = this.extractAddressComponent(addressComponents, [
      "administrative_area_level_1",
    ]);

    const streetAddress = this.extractStreetAddress(addressComponents);

    return {
      source: DiscoverySource.GOOGLE_PLACES,
      externalId: place.id,
      companyName: place.displayName.text,
      streetAddress,
      city,
      province,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      phone: place.internationalPhoneNumber ?? null,
      website: place.websiteUri ?? null,
      businessTypes: place.types ?? [],
      rating: place.rating ?? null,
      userRatingsTotal: place.userRatingCount ?? null,
    };
  }

  private extractAddressComponent(
    components: Array<{ longText: string; types: string[] }>,
    typePreferences: string[],
  ): string | null {
    for (const typePreference of typePreferences) {
      const component = components.find((c) => c.types.includes(typePreference));
      if (component) {
        return component.longText;
      }
    }
    return null;
  }

  private extractStreetAddress(
    components: Array<{ longText: string; types: string[] }>,
  ): string | null {
    const streetNumber = this.extractAddressComponent(components, ["street_number"]);
    const route = this.extractAddressComponent(components, ["route"]);

    if (streetNumber && route) {
      return `${streetNumber} ${route}`;
    }

    if (route) {
      return route;
    }

    return null;
  }

  private deduplicateResults(results: DiscoveredBusiness[]): DiscoveredBusiness[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (seen.has(result.externalId)) {
        return false;
      }
      seen.add(result.externalId);
      return true;
    });
  }
}
