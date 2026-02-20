import { Injectable, Logger } from "@nestjs/common";
import { DiscoveryProvider, DiscoverySearchParams } from "../discovery-source.interface";
import { DiscoveredBusiness, DiscoverySource } from "../dto";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

@Injectable()
export class OsmOverpassProvider implements DiscoveryProvider {
  private readonly logger = new Logger(OsmOverpassProvider.name);
  private readonly overpassUrl = "https://overpass-api.de/api/interpreter";
  readonly source = DiscoverySource.OSM;

  isConfigured(): boolean {
    return true;
  }

  async search(params: DiscoverySearchParams): Promise<DiscoveredBusiness[]> {
    const osmTags = this.mapSearchTermsToOsmTags(params.searchTerms);
    const query = this.buildOverpassQuery(params, osmTags);

    const response = await fetch(this.overpassUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      this.logger.error(`Overpass API error: ${response.status}`);
      return [];
    }

    const data: OverpassResponse = await response.json();

    return data.elements
      .filter((element) => element.tags?.name)
      .map((element) => this.transformElement(element));
  }

  private buildOverpassQuery(params: DiscoverySearchParams, osmTags: string[]): string {
    const { latitude, longitude, radiusKm } = params;
    const radiusMeters = radiusKm * 1000;

    const tagFilters = osmTags.map((tag) => {
      const [key, value] = tag.split("=");
      if (value) {
        return `["${key}"="${value}"]`;
      }
      return `["${key}"]`;
    });

    const nodeQueries = tagFilters
      .map((filter) => `node${filter}(around:${radiusMeters},${latitude},${longitude});`)
      .join("\n");

    const wayQueries = tagFilters
      .map((filter) => `way${filter}(around:${radiusMeters},${latitude},${longitude});`)
      .join("\n");

    return `
      [out:json][timeout:25];
      (
        ${nodeQueries}
        ${wayQueries}
      );
      out center;
    `;
  }

  private mapSearchTermsToOsmTags(searchTerms: string[]): string[] {
    const tagMappings: Record<string, string[]> = {
      mine: ["landuse=quarry", "industrial=mine"],
      mining: ["landuse=quarry", "industrial=mine"],
      factory: ["building=industrial", "industrial=factory"],
      manufacturing: ["building=industrial", "industrial=factory"],
      warehouse: ["building=warehouse"],
      office: ["building=office", "office"],
      construction: ["office=company", "building=construction"],
      industrial: ["building=industrial", "industrial"],
      engineering: ["office=company", "office=engineer"],
      pump: ["shop=trade", "industrial"],
      equipment: ["shop=trade", "industrial"],
      steel: ["industrial=factory", "shop=trade"],
      pipes: ["shop=trade", "industrial"],
      fabrication: ["industrial=factory"],
      welding: ["craft=welder", "industrial"],
    };

    const tags = new Set<string>();

    tags.add("office=company");
    tags.add("building=industrial");

    for (const term of searchTerms) {
      const lowerTerm = term.toLowerCase();

      for (const [keyword, osmTags] of Object.entries(tagMappings)) {
        if (lowerTerm.includes(keyword)) {
          osmTags.forEach((tag) => tags.add(tag));
        }
      }
    }

    return [...tags];
  }

  private transformElement(element: OverpassElement): DiscoveredBusiness {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat ?? 0;
    const lon = element.lon ?? element.center?.lon ?? 0;

    const businessTypes = this.extractBusinessTypes(tags);

    return {
      source: DiscoverySource.OSM,
      externalId: `osm-${element.type}-${element.id}`,
      companyName: tags.name ?? "Unknown",
      streetAddress: this.buildStreetAddress(tags),
      city: tags["addr:city"] ?? tags["addr:suburb"] ?? null,
      province: tags["addr:state"] ?? tags["addr:province"] ?? null,
      latitude: lat,
      longitude: lon,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      businessTypes,
      rating: null,
      userRatingsTotal: null,
    };
  }

  private buildStreetAddress(tags: Record<string, string>): string | null {
    const parts: string[] = [];

    if (tags["addr:housenumber"]) {
      parts.push(tags["addr:housenumber"]);
    }

    if (tags["addr:street"]) {
      parts.push(tags["addr:street"]);
    }

    return parts.length > 0 ? parts.join(" ") : null;
  }

  private extractBusinessTypes(tags: Record<string, string>): string[] {
    const types: string[] = [];

    if (tags.office) {
      types.push(`office:${tags.office}`);
    }

    if (tags.shop) {
      types.push(`shop:${tags.shop}`);
    }

    if (tags.industrial) {
      types.push(`industrial:${tags.industrial}`);
    }

    if (tags.craft) {
      types.push(`craft:${tags.craft}`);
    }

    if (tags.building && tags.building !== "yes") {
      types.push(`building:${tags.building}`);
    }

    if (tags.landuse) {
      types.push(`landuse:${tags.landuse}`);
    }

    return types;
  }
}
