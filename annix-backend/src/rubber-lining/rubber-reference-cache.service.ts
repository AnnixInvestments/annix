import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { nowMillis } from "../lib/datetime";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberType } from "./entities/rubber-type.entity";
import { RubberCompanyRepository } from "./repositories/rubber-company.repository";
import { RubberProductCodingRepository } from "./repositories/rubber-product-coding.repository";
import { RubberTypeRepository } from "./repositories/rubber-type.repository";

interface CacheEntry<T> {
  data: T[];
  loadedAt: number;
}

const TTL_MS = 60_000;

@Injectable()
export class RubberReferenceCacheService implements OnModuleInit {
  private readonly logger = new Logger(RubberReferenceCacheService.name);

  private codingsCache: CacheEntry<RubberProductCoding> | null = null;
  private companiesCache: CacheEntry<RubberCompany> | null = null;
  private typesCache: CacheEntry<RubberType> | null = null;

  constructor(
    private readonly productCodingRepository: RubberProductCodingRepository,
    private readonly companyRepository: RubberCompanyRepository,
    private readonly rubberTypeRepository: RubberTypeRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await Promise.all([this.allCodings(), this.allCompanies(), this.allTypes()]).catch(
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Rubber reference cache warm-up failed (will lazy-load): ${message}`);
      },
    );
  }

  async allCodings(): Promise<RubberProductCoding[]> {
    const cache = this.codingsCache;
    if (cache && nowMillis() - cache.loadedAt < TTL_MS) {
      return cache.data;
    }
    const data = await this.productCodingRepository.findAll();
    this.codingsCache = { data, loadedAt: nowMillis() };
    return data;
  }

  async allCompanies(): Promise<RubberCompany[]> {
    const cache = this.companiesCache;
    if (cache && nowMillis() - cache.loadedAt < TTL_MS) {
      return cache.data;
    }
    const data = await this.companyRepository.findAll();
    this.companiesCache = { data, loadedAt: nowMillis() };
    return data;
  }

  async allTypes(): Promise<RubberType[]> {
    const cache = this.typesCache;
    if (cache && nowMillis() - cache.loadedAt < TTL_MS) {
      return cache.data;
    }
    const data = await this.rubberTypeRepository.findAll();
    this.typesCache = { data, loadedAt: nowMillis() };
    return data;
  }

  invalidateCodings(): void {
    this.codingsCache = null;
  }

  invalidateCompanies(): void {
    this.companiesCache = null;
  }

  invalidateTypes(): void {
    this.typesCache = null;
  }
}
