import { RUBBER_PRICE_PRODUCTS, type RubberPriceProductSeed } from "@annix/product-data/rubber";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RubberCureType, RubberPriceListItem } from "../entities/rubber-price-list-item.entity";
import {
  DEFAULT_RUBBER_PRICING_CONFIG,
  RubberPriceFamily,
  RubberPricingConfig,
} from "../entities/rubber-pricing-config";
import { RubberBondingAgentRepository } from "../repositories/rubber-bonding-agent.repository";
import { RubberPriceListItemRepository } from "../repositories/rubber-price-list-item.repository";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { computeRubberBondingAgentPricing } from "./rubber-bonding-agent-pricing";
import {
  RubberBondingAgentSalePrice,
  RubberPricingResult,
  RubberPricingService,
} from "./rubber-pricing.service";

export interface RubberPriceListItemInput {
  supplier: string;
  productCode: string;
  productName?: string | null;
  cureType?: string | null;
  bondingType?: string | null;
  colour?: string | null;
  shoreHardness?: number | null;
  specificGravity: number;
  costPerKg?: number | null;
  upliftPercent?: number | null;
  active?: boolean;
  preferred?: boolean;
}

export interface RubberPriceListRow {
  item: RubberPriceListItem;
  plate: RubberPricingResult;
  pipe: RubberPricingResult;
}

export interface RubberPriceListResponse {
  config: RubberPricingConfig;
  items: RubberPriceListRow[];
}

export interface RubberQuoteCatalogThickness {
  thicknessMm: number;
  salePerM2: number;
  mpsPerM2: number;
}

export interface RubberQuoteCatalogItem {
  id: number;
  family: RubberPriceFamily;
  supplier: string;
  productCode: string;
  productName: string | null;
  cureType: string | null;
  bondingType: string | null;
  colour: string | null;
  shoreHardness: number | null;
  preferred: boolean;
  thicknesses: RubberQuoteCatalogThickness[];
}

export interface RubberQuoteInput {
  itemId?: number | null;
  family?: string | null;
  cureType?: string | null;
  thicknessMm: number;
  nb?: string | null;
  areaOrLength: number;
  bondingType?: string | null;
  bondingAgentSupplier?: string | null;
}

export interface RubberQuoteResult {
  itemId: number;
  family: RubberPriceFamily;
  supplier: string;
  productCode: string;
  thicknessMm: number;
  nb: string | null;
  areaOrLength: number;
  salePerM2: number | null;
  mpsPerM2: number | null;
  salePerMetre: number | null;
  mpsPerMetre: number | null;
  saleTotal: number;
  mpsTotal: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class RubberPriceListService {
  private readonly logger = new Logger(RubberPriceListService.name);

  constructor(
    private readonly itemRepo: RubberPriceListItemRepository,
    private readonly companyRepo: StockControlCompanyRepository,
    private readonly pricingService: RubberPricingService,
    private readonly bondingAgentRepo: RubberBondingAgentRepository,
  ) {}

  async configForCompany(companyId: number): Promise<RubberPricingConfig> {
    const company = await this.companyRepo.findById(companyId);
    const stored = company?.rubberPricingConfig;
    return stored ?? DEFAULT_RUBBER_PRICING_CONFIG;
  }

  private async bondingAgentSalePrices(
    companyId: number,
    config: RubberPricingConfig,
  ): Promise<RubberBondingAgentSalePrice[]> {
    const agents = await this.bondingAgentRepo.findAllForCompany(companyId);
    return agents
      .filter((agent) => agent.active !== false)
      .map((agent) => ({
        name: agent.name,
        salePerM2: computeRubberBondingAgentPricing(agent, config.consumableMarkup).salePerM2,
      }));
  }

  async updateConfig(companyId: number, config: RubberPricingConfig): Promise<RubberPricingConfig> {
    await this.companyRepo.updateById(companyId, { rubberPricingConfig: config });
    return config;
  }

  private normalizeFamily(value: string): RubberPriceFamily {
    return value === "pipe" ? "pipe" : "plate";
  }

  async list(companyId: number): Promise<RubberPriceListResponse> {
    const [items, config] = await Promise.all([
      this.itemRepo.findAllForCompany(companyId),
      this.configForCompany(companyId),
    ]);
    const agents = await this.bondingAgentSalePrices(companyId, config);
    const rows = items.map((item) => {
      const both = this.pricingService.computeBothFamilies(item, config, { agents });
      return { item, plate: both.plate, pipe: both.pipe };
    });
    return { config, items: rows };
  }

  async quoteCatalog(companyId: number, family?: string | null): Promise<RubberQuoteCatalogItem[]> {
    const [items, config] = await Promise.all([
      this.itemRepo.findAllForCompany(companyId),
      this.configForCompany(companyId),
    ]);
    const agents = await this.bondingAgentSalePrices(companyId, config);
    const wanted = this.normalizeFamily(family ?? "plate");
    return items
      .filter((item) => item.active !== false && item.costPerKg != null)
      .map((item) => ({
        item,
        pricing: this.pricingService.computePricing(item, config, { family: wanted, agents }),
      }))
      .map((row) => ({
        id: row.item.id,
        family: wanted,
        supplier: row.item.supplier,
        productCode: row.item.productCode,
        productName: row.item.productName ?? null,
        cureType: row.item.cureType ?? null,
        bondingType: row.item.bondingType ?? null,
        colour: row.item.colour ?? null,
        shoreHardness: row.item.shoreHardness ?? null,
        preferred: row.item.preferred === true,
        thicknesses: row.pricing.thicknesses.map((thickness) => ({
          thicknessMm: thickness.thicknessMm,
          salePerM2: thickness.salePerM2,
          mpsPerM2: thickness.mpsPerM2,
        })),
      }))
      .sort(
        (a, b) =>
          a.supplier.localeCompare(b.supplier) || a.productCode.localeCompare(b.productCode),
      );
  }

  private async resolveQuoteItem(
    companyId: number,
    input: RubberQuoteInput,
  ): Promise<RubberPriceListItem> {
    if (input.itemId != null) {
      const item = await this.itemRepo.findOneForCompany(companyId, input.itemId);
      if (!item) {
        throw new NotFoundException(`Rubber price list item ${input.itemId} not found`);
      }
      return item;
    }
    const items = await this.itemRepo.findAllForCompany(companyId);
    const candidates = items.filter(
      (item) =>
        item.active !== false &&
        item.costPerKg != null &&
        (input.cureType ? item.cureType === input.cureType : true),
    );
    const preferred = candidates.find((item) => item.preferred === true);
    const chosen = preferred ?? candidates[0];
    if (!chosen) {
      throw new NotFoundException("No active priced rubber found to quote");
    }
    return chosen;
  }

  async quote(companyId: number, input: RubberQuoteInput): Promise<RubberQuoteResult> {
    const config = await this.configForCompany(companyId);
    const item = await this.resolveQuoteItem(companyId, input);
    const agents = await this.bondingAgentSalePrices(companyId, config);
    const family = this.normalizeFamily(input.family ?? "plate");
    const pricingOptions = {
      family,
      bondingType: input.bondingType ?? item.bondingType,
      agents,
      bondingAgentSupplier: input.bondingAgentSupplier ?? null,
    };
    const areaOrLength = input.areaOrLength > 0 ? input.areaOrLength : 0;

    if (family === "pipe" && input.nb) {
      const running = this.pricingService.runningMetrePrice(
        item,
        config,
        input.thicknessMm,
        input.nb,
        pricingOptions,
      );
      if (!running) {
        throw new BadRequestException(`Unknown NB "${input.nb}" for pipe running-metre pricing`);
      }
      return {
        itemId: item.id,
        family,
        supplier: item.supplier,
        productCode: item.productCode,
        thicknessMm: input.thicknessMm,
        nb: input.nb,
        areaOrLength,
        salePerM2: null,
        mpsPerM2: null,
        salePerMetre: running.salePerMetre,
        mpsPerMetre: running.mpsPerMetre,
        saleTotal: round2(running.salePerMetre * areaOrLength),
        mpsTotal: round2(running.mpsPerMetre * areaOrLength),
      };
    }

    const salePerM2 = this.pricingService.salePerM2(
      item,
      config,
      input.thicknessMm,
      pricingOptions,
    );
    const mpsPerM2 = salePerM2 * config[family].mpsFactor;
    return {
      itemId: item.id,
      family,
      supplier: item.supplier,
      productCode: item.productCode,
      thicknessMm: input.thicknessMm,
      nb: null,
      areaOrLength,
      salePerM2: round2(salePerM2),
      mpsPerM2: round2(mpsPerM2),
      salePerMetre: null,
      mpsPerMetre: null,
      saleTotal: round2(salePerM2 * areaOrLength),
      mpsTotal: round2(mpsPerM2 * areaOrLength),
    };
  }

  private toCreatePayload(companyId: number, input: RubberPriceListItemInput) {
    return {
      companyId,
      supplier: input.supplier,
      productCode: input.productCode,
      productName: input.productName ?? null,
      cureType: (input.cureType ?? null) as RubberCureType | null,
      bondingType: input.bondingType ?? null,
      colour: input.colour ?? null,
      shoreHardness: input.shoreHardness ?? null,
      specificGravity: input.specificGravity,
      costPerKg: input.costPerKg ?? null,
      upliftPercent: input.upliftPercent ?? 0,
      active: input.active ?? true,
      preferred: input.preferred ?? false,
    };
  }

  async create(companyId: number, input: RubberPriceListItemInput): Promise<RubberPriceListItem> {
    return this.itemRepo.create(this.toCreatePayload(companyId, input));
  }

  async update(
    companyId: number,
    id: number,
    input: Partial<RubberPriceListItemInput>,
  ): Promise<RubberPriceListItem> {
    const existing = await this.itemRepo.findOneForCompany(companyId, id);
    if (!existing) {
      throw new NotFoundException(`Rubber price list item ${id} not found`);
    }
    const merged: RubberPriceListItem = {
      ...existing,
      ...input,
      id: existing.id,
      companyId,
    } as RubberPriceListItem;
    return this.itemRepo.save(merged);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const existing = await this.itemRepo.findOneForCompany(companyId, id);
    if (!existing) {
      throw new NotFoundException(`Rubber price list item ${id} not found`);
    }
    await this.itemRepo.remove(existing);
  }

  async clearAll(companyId: number): Promise<{ cleared: number }> {
    const cleared = await this.itemRepo.deleteAllForCompany(companyId);
    return { cleared };
  }

  async setUpliftForAll(companyId: number, upliftPercent: number): Promise<{ updated: number }> {
    const items = await this.itemRepo.findAllForCompany(companyId);
    const updated = await Promise.all(
      items.map((item) => this.itemRepo.save({ ...item, upliftPercent })),
    );
    return { updated: updated.length };
  }

  private async createSequentially(
    companyId: number,
    inputs: RubberPriceListItemInput[],
  ): Promise<RubberPriceListItem[]> {
    return inputs.reduce<Promise<RubberPriceListItem[]>>(async (accumulator, input) => {
      const created = await accumulator;
      const item = await this.itemRepo.create(this.toCreatePayload(companyId, input));
      return [...created, item];
    }, Promise.resolve([]));
  }

  async addMany(companyId: number, inputs: RubberPriceListItemInput[]): Promise<number> {
    const created = await this.createSequentially(companyId, inputs);
    return created.length;
  }

  async replaceSupplier(
    companyId: number,
    supplier: string,
    inputs: RubberPriceListItemInput[],
  ): Promise<number> {
    const existing = await this.itemRepo.findAllForCompany(companyId);
    const toRemove = existing.filter((item) => item.supplier === supplier);
    await Promise.all(toRemove.map((item) => this.itemRepo.remove(item)));
    return this.addMany(companyId, inputs);
  }

  private seedToInput(seed: RubberPriceProductSeed): RubberPriceListItemInput {
    const hasCost = seed.costPerKg != null;
    return {
      supplier: seed.supplier ?? "Unknown Supplier",
      productCode: seed.code,
      productName: null,
      cureType: "steam",
      bondingType: seed.bondingType ?? null,
      colour: seed.colour ?? null,
      shoreHardness: seed.shoreHardness ?? null,
      specificGravity: seed.specificGravity ?? 1,
      costPerKg: seed.costPerKg ?? null,
      upliftPercent: 0,
      active: hasCost,
      preferred: false,
    };
  }

  private dedupeSeeds(seeds: RubberPriceProductSeed[]): RubberPriceProductSeed[] {
    const cureType = "steam";
    const keyFor = (seed: RubberPriceProductSeed): string =>
      `${seed.code}::${cureType}::${seed.supplier ?? "Unknown Supplier"}`;
    const isRicher = (
      candidate: RubberPriceProductSeed,
      current: RubberPriceProductSeed,
    ): boolean => {
      const candidateScore =
        (candidate.costPerKg != null ? 1 : 0) + (candidate.specificGravity != null ? 1 : 0);
      const currentScore =
        (current.costPerKg != null ? 1 : 0) + (current.specificGravity != null ? 1 : 0);
      return candidateScore > currentScore;
    };
    const byKey = seeds.reduce<Map<string, RubberPriceProductSeed>>((accumulator, seed) => {
      const key = keyFor(seed);
      const current = accumulator.get(key);
      if (!current || isRicher(seed, current)) {
        accumulator.set(key, seed);
      }
      return accumulator;
    }, new Map());
    return [...byKey.values()];
  }

  async seedFromProductData(companyId: number): Promise<{ seeded: number }> {
    const existing = await this.itemRepo.findAllForCompany(companyId);
    if (existing.length > 0) {
      return { seeded: 0 };
    }
    const created = await this.createSequentially(
      companyId,
      this.dedupeSeeds(RUBBER_PRICE_PRODUCTS).map((seed) => this.seedToInput(seed)),
    );
    this.logger.log(`Seeded ${created.length} rubber price list item(s) from product data`);
    return { seeded: created.length };
  }
}
