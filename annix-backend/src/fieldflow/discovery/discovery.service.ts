import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { Prospect, ProspectStatus } from "../entities/prospect.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { DiscoverySearchParams } from "./discovery-source.interface";
import {
  DiscoveredBusiness,
  DiscoverProspectsDto,
  DiscoveryImportResult,
  DiscoveryQuota,
  DiscoverySearchResult,
  DiscoverySource,
} from "./dto";
import { GooglePlacesProvider, OsmOverpassProvider, YellowPagesProvider } from "./providers";

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly googleDailyLimit: number;
  private googleUsedToday = 0;
  private lastResetDate: string;

  private discoveryCache = new Map<string, { results: DiscoveredBusiness[]; timestamp: number }>();
  private readonly cacheTtlMs: number;

  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepository: Repository<Prospect>,
    @InjectRepository(RepProfile)
    private readonly repProfileRepository: Repository<RepProfile>,
    private readonly googlePlacesProvider: GooglePlacesProvider,
    private readonly yellowPagesProvider: YellowPagesProvider,
    private readonly osmOverpassProvider: OsmOverpassProvider,
    private readonly configService: ConfigService,
  ) {
    this.googleDailyLimit = this.configService.get<number>("DISCOVERY_GOOGLE_DAILY_LIMIT", 1000);
    const cacheTtlMinutes = this.configService.get<number>("DISCOVERY_CACHE_TTL_MINUTES", 60);
    this.cacheTtlMs = cacheTtlMinutes * 60 * 1000;
    this.lastResetDate = now().toISODate() ?? "";
  }

  async search(userId: number, dto: DiscoverProspectsDto): Promise<DiscoverySearchResult> {
    const repProfile = await this.repProfileRepository.findOne({
      where: { userId },
    });

    const searchTerms = this.buildSearchTerms(repProfile, dto.searchTerms);
    const radiusKm = dto.radiusKm ?? repProfile?.defaultSearchRadiusKm ?? 10;

    const sources = dto.sources ?? [DiscoverySource.GOOGLE_PLACES];

    const searchParams: DiscoverySearchParams = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      radiusKm,
      searchTerms,
    };

    const cacheKey = this.buildCacheKey(searchParams, sources);
    const cachedResult = this.cachedResults(cacheKey);
    if (cachedResult) {
      this.logger.log("Returning cached discovery results");
      return this.buildSearchResult(cachedResult, sources, userId);
    }

    this.resetDailyQuotaIfNeeded();

    const allResults: DiscoveredBusiness[] = [];
    const sourcesQueried: string[] = [];

    for (const source of sources) {
      const results = await this.searchSource(source, searchParams);
      allResults.push(...results);
      sourcesQueried.push(source);
    }

    const deduplicatedResults = this.deduplicateAcrossSources(allResults);

    this.discoveryCache.set(cacheKey, {
      results: deduplicatedResults,
      timestamp: Date.now(),
    });

    return this.buildSearchResult(deduplicatedResults, sourcesQueried, userId);
  }

  async importBusinesses(
    userId: number,
    businesses: DiscoveredBusiness[],
  ): Promise<DiscoveryImportResult> {
    const createdIds: number[] = [];
    let duplicates = 0;

    for (const business of businesses) {
      const isDuplicate = await this.checkForDuplicate(userId, business);

      if (isDuplicate) {
        duplicates++;
        continue;
      }

      const prospect = this.prospectRepository.create({
        ownerId: userId,
        companyName: business.companyName,
        streetAddress: business.streetAddress,
        city: business.city,
        province: business.province,
        latitude: business.latitude,
        longitude: business.longitude,
        contactPhone: business.phone,
        googlePlaceId:
          business.source === DiscoverySource.GOOGLE_PLACES ? business.externalId : null,
        status: ProspectStatus.NEW,
        discoverySource: business.source,
        discoveredAt: now().toJSDate(),
        externalId: business.externalId,
        tags: business.businessTypes.slice(0, 5),
        notes: business.website ? `Website: ${business.website}` : null,
      });

      const saved = await this.prospectRepository.save(prospect);
      createdIds.push(saved.id);
    }

    return {
      created: createdIds.length,
      duplicates,
      createdIds,
    };
  }

  quota(): DiscoveryQuota {
    this.resetDailyQuotaIfNeeded();

    return {
      googleDailyLimit: this.googleDailyLimit,
      googleUsedToday: this.googleUsedToday,
      googleRemaining: Math.max(0, this.googleDailyLimit - this.googleUsedToday),
      lastResetAt: this.lastResetDate,
    };
  }

  private buildSearchTerms(repProfile: RepProfile | null, customTerms?: string[]): string[] {
    const terms: string[] = [];

    if (customTerms && customTerms.length > 0) {
      terms.push(...customTerms);
    }

    if (repProfile) {
      if (repProfile.customSearchTerms) {
        terms.push(...repProfile.customSearchTerms);
      }

      if (repProfile.productCategories) {
        terms.push(...repProfile.productCategories);
      }

      if (repProfile.subIndustries) {
        terms.push(...repProfile.subIndustries);
      }

      if (repProfile.targetCustomerProfile?.businessTypes) {
        terms.push(...repProfile.targetCustomerProfile.businessTypes);
      }
    }

    const uniqueTerms = [...new Set(terms)];

    return uniqueTerms.length > 0 ? uniqueTerms : ["business", "company"];
  }

  private async searchSource(
    source: DiscoverySource,
    params: DiscoverySearchParams,
  ): Promise<DiscoveredBusiness[]> {
    switch (source) {
      case DiscoverySource.GOOGLE_PLACES:
        if (!this.googlePlacesProvider.isConfigured()) {
          this.logger.warn("Google Places not configured, skipping");
          return [];
        }
        if (this.googleUsedToday >= this.googleDailyLimit) {
          this.logger.warn("Google Places daily limit reached");
          return [];
        }
        this.googleUsedToday++;
        return this.googlePlacesProvider.search(params);

      case DiscoverySource.YELLOW_PAGES:
        return this.yellowPagesProvider.search(params);

      case DiscoverySource.OSM:
        return this.osmOverpassProvider.search(params);

      default:
        return [];
    }
  }

  private async buildSearchResult(
    discovered: DiscoveredBusiness[],
    sourcesQueried: string[],
    userId: number,
  ): Promise<DiscoverySearchResult> {
    const existingExternalIds = await this.existingExternalIds(userId);

    const newDiscoveries = discovered.filter((d) => !existingExternalIds.has(d.externalId));

    return {
      discovered: newDiscoveries,
      existingMatches: discovered.length - newDiscoveries.length,
      totalFound: discovered.length,
      sourcesQueried,
    };
  }

  private async existingExternalIds(userId: number): Promise<Set<string>> {
    const prospects = await this.prospectRepository.find({
      where: { ownerId: userId },
      select: ["googlePlaceId", "externalId"],
    });

    const ids = new Set<string>();

    for (const p of prospects) {
      if (p.googlePlaceId) {
        ids.add(p.googlePlaceId);
      }
      if (p.externalId) {
        ids.add(p.externalId);
      }
    }

    return ids;
  }

  private async checkForDuplicate(userId: number, business: DiscoveredBusiness): Promise<boolean> {
    const byExternalId = await this.prospectRepository.findOne({
      where: [
        { ownerId: userId, googlePlaceId: business.externalId },
        { ownerId: userId, externalId: business.externalId },
      ],
    });

    if (byExternalId) {
      return true;
    }

    if (business.phone) {
      const normalizedPhone = this.normalizePhone(business.phone);
      const byPhone = await this.prospectRepository
        .createQueryBuilder("prospect")
        .where("prospect.owner_id = :userId", { userId })
        .andWhere(
          "REPLACE(REPLACE(REPLACE(prospect.contact_phone, ' ', ''), '-', ''), '+', '') LIKE :phone",
          { phone: `%${normalizedPhone.replace(/\D/g, "").slice(-9)}%` },
        )
        .getOne();

      if (byPhone) {
        return true;
      }
    }

    const byNameAndCity = await this.prospectRepository
      .createQueryBuilder("prospect")
      .where("prospect.owner_id = :userId", { userId })
      .andWhere("LOWER(prospect.company_name) = LOWER(:name)", {
        name: business.companyName,
      })
      .andWhere("LOWER(prospect.city) = LOWER(:city)", {
        city: business.city ?? "",
      })
      .getOne();

    return !!byNameAndCity;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  private deduplicateAcrossSources(results: DiscoveredBusiness[]): DiscoveredBusiness[] {
    const seen = new Map<string, DiscoveredBusiness>();

    for (const result of results) {
      const key = `${result.companyName.toLowerCase()}-${result.latitude.toFixed(4)}-${result.longitude.toFixed(4)}`;

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, result);
      } else if (
        result.source === DiscoverySource.GOOGLE_PLACES &&
        existing.source !== DiscoverySource.GOOGLE_PLACES
      ) {
        seen.set(key, result);
      }
    }

    return [...seen.values()];
  }

  private buildCacheKey(params: DiscoverySearchParams, sources: DiscoverySource[]): string {
    return `${params.latitude.toFixed(3)}-${params.longitude.toFixed(3)}-${params.radiusKm}-${params.searchTerms.sort().join(",")}-${sources.sort().join(",")}`;
  }

  private cachedResults(cacheKey: string): DiscoveredBusiness[] | null {
    const cached = this.discoveryCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheTtlMs) {
      this.discoveryCache.delete(cacheKey);
      return null;
    }

    return cached.results;
  }

  private resetDailyQuotaIfNeeded(): void {
    const today = now().toISODate() ?? "";
    if (today !== this.lastResetDate) {
      this.googleUsedToday = 0;
      this.lastResetDate = today;
      this.logger.log("Daily quota reset");
    }
  }
}
