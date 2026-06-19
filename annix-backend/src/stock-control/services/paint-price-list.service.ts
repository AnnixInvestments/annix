import { Injectable, NotFoundException } from "@nestjs/common";
import { lookupCoatingProduct } from "../config/coating-products";
import { PaintCoatRole, PaintPriceListItem } from "../entities/paint-price-list-item.entity";
import { DEFAULT_PAINT_PRICING_CONFIG, PaintPricingConfig } from "../entities/paint-pricing-config";
import { PaintPriceListItemRepository } from "../repositories/paint-price-list-item.repository";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { PaintPriceListExtractionService } from "./paint-price-list-extraction.service";
import { PaintPricingResult, PaintPricingService } from "./paint-pricing.service";

export interface PaintPriceListItemInput {
  supplierName: string;
  coatType?: string | null;
  productName: string;
  paintType?: string | null;
  packSizeLitres?: number | null;
  volumeSolidsPercent: number;
  costPerLitre: number;
  costPerKit?: number | null;
  upliftPercent?: number | null;
  recommendedMicrons?: number | null;
  micronsOverride?: number | null;
  thinnerName?: string | null;
  thinnerPricePerLitre?: number | null;
  maxThinningPercent?: number | null;
  active?: boolean;
}

export interface PaintPriceListRow {
  item: PaintPriceListItem;
  pricing: PaintPricingResult;
}

export interface PaintPriceListResponse {
  config: PaintPricingConfig;
  lossPct: number;
  rows: PaintPriceListRow[];
}

@Injectable()
export class PaintPriceListService {
  constructor(
    private readonly itemRepo: PaintPriceListItemRepository,
    private readonly companyRepo: StockControlCompanyRepository,
    private readonly pricingService: PaintPricingService,
    private readonly extractionService: PaintPriceListExtractionService,
  ) {}

  private itemNeedsSpecs(item: PaintPriceListItem): boolean {
    return (
      item.coatType == null ||
      item.paintType == null ||
      !item.volumeSolidsPercent ||
      item.volumeSolidsPercent <= 0 ||
      item.recommendedMicrons == null ||
      item.thinnerName == null ||
      item.maxThinningPercent == null
    );
  }

  private formatPaintType(genericType: string): string {
    return genericType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private fillFromReference(item: PaintPriceListItem): {
    item: PaintPriceListItem;
    changed: boolean;
  } {
    const reference = lookupCoatingProduct(item.productName);
    if (!reference) {
      return { item, changed: false };
    }
    const next = { ...item };
    let changed = false;
    if (
      (!next.volumeSolidsPercent || next.volumeSolidsPercent <= 0) &&
      reference.volumeSolidsPercent
    ) {
      next.volumeSolidsPercent = reference.volumeSolidsPercent;
      changed = true;
    }
    if (next.recommendedMicrons == null && reference.defaultDftUm) {
      next.recommendedMicrons = reference.defaultDftUm;
      changed = true;
    }
    if (next.paintType == null && reference.genericType) {
      next.paintType = this.formatPaintType(reference.genericType);
      changed = true;
    }
    return { item: next, changed };
  }

  private fillFromSpec(
    item: PaintPriceListItem,
    spec: {
      coatType?: string | null;
      paintType?: string | null;
      volumeSolidsPercent?: number | null;
      recommendedMicrons?: number | null;
      thinnerName?: string | null;
      maxThinningPercent?: number | null;
    },
  ): { item: PaintPriceListItem; changed: boolean } {
    const next = { ...item };
    let changed = false;
    const coat = spec.coatType;
    if (
      next.coatType == null &&
      (coat === "primer" || coat === "intermediate" || coat === "final")
    ) {
      next.coatType = coat;
      changed = true;
    }
    if (next.paintType == null && spec.paintType) {
      next.paintType = spec.paintType;
      changed = true;
    }
    if ((!next.volumeSolidsPercent || next.volumeSolidsPercent <= 0) && spec.volumeSolidsPercent) {
      next.volumeSolidsPercent = spec.volumeSolidsPercent;
      changed = true;
    }
    if (next.recommendedMicrons == null && spec.recommendedMicrons) {
      next.recommendedMicrons = spec.recommendedMicrons;
      changed = true;
    }
    if (next.thinnerName == null && spec.thinnerName) {
      next.thinnerName = spec.thinnerName;
      changed = true;
    }
    if (next.maxThinningPercent == null && spec.maxThinningPercent) {
      next.maxThinningPercent = spec.maxThinningPercent;
      changed = true;
    }
    return { item: next, changed };
  }

  async enrichMissingSpecs(companyId: number): Promise<{ enriched: number; checked: number }> {
    const items = await this.itemRepo.findAllForCompany(companyId);
    const needing = items.filter((item) => this.itemNeedsSpecs(item));
    if (needing.length === 0) {
      return { enriched: 0, checked: 0 };
    }

    const afterReference = needing.map((item) => this.fillFromReference(item));

    const stillNeeding = afterReference
      .filter((entry) => this.itemNeedsSpecs(entry.item))
      .map((entry) => entry.item);
    const distinct = new Map<string, { productName: string; supplierName: string }>();
    stillNeeding.forEach((item) =>
      distinct.set(`${item.supplierName}__${item.productName}`.toLowerCase(), {
        productName: item.productName,
        supplierName: item.supplierName,
      }),
    );
    const specs = distinct.size
      ? await this.extractionService.lookupSpecs(Array.from(distinct.values()))
      : new Map();

    const updated = await Promise.all(
      afterReference.map(async (entry) => {
        let current = entry.item;
        let changed = entry.changed;
        const spec = specs.get(current.productName.trim().toLowerCase());
        if (spec) {
          const applied = this.fillFromSpec(current, spec);
          current = applied.item;
          changed = changed || applied.changed;
        }
        if (!changed) {
          return false;
        }
        await this.itemRepo.save(current);
        return true;
      }),
    );

    return { enriched: updated.filter(Boolean).length, checked: needing.length };
  }

  async configForCompany(companyId: number): Promise<PaintPricingConfig> {
    const company = await this.companyRepo.findById(companyId);
    const stored = company?.paintPricingConfig;
    if (!stored) {
      return DEFAULT_PAINT_PRICING_CONFIG;
    }
    return {
      lossPct: stored.lossPct ?? DEFAULT_PAINT_PRICING_CONFIG.lossPct,
      applicationCostPerM2:
        stored.applicationCostPerM2 ?? DEFAULT_PAINT_PRICING_CONFIG.applicationCostPerM2,
      markupFactor: stored.markupFactor ?? DEFAULT_PAINT_PRICING_CONFIG.markupFactor,
      discountTiers: stored.discountTiers ?? DEFAULT_PAINT_PRICING_CONFIG.discountTiers,
    };
  }

  async updateConfig(companyId: number, config: PaintPricingConfig): Promise<PaintPricingConfig> {
    await this.companyRepo.updateById(companyId, { paintPricingConfig: config });
    return config;
  }

  async list(companyId: number): Promise<PaintPriceListResponse> {
    const [items, config] = await Promise.all([
      this.itemRepo.findAllForCompany(companyId),
      this.configForCompany(companyId),
    ]);
    const rows = items.map((item) => ({
      item,
      pricing: this.pricingService.computePricing(item, config),
    }));
    return { config, lossPct: config.lossPct, rows };
  }

  private toCreatePayload(companyId: number, input: PaintPriceListItemInput) {
    return {
      companyId,
      supplierName: input.supplierName,
      coatType: (input.coatType ?? null) as PaintCoatRole | null,
      productName: input.productName,
      paintType: input.paintType ?? null,
      packSizeLitres: input.packSizeLitres ?? null,
      volumeSolidsPercent: input.volumeSolidsPercent,
      costPerLitre: input.costPerLitre,
      costPerKit: input.costPerKit ?? null,
      upliftPercent: input.upliftPercent ?? 0,
      recommendedMicrons: input.recommendedMicrons ?? null,
      micronsOverride: input.micronsOverride ?? null,
      thinnerName: input.thinnerName ?? null,
      thinnerPricePerLitre: input.thinnerPricePerLitre ?? null,
      maxThinningPercent: input.maxThinningPercent ?? null,
      active: input.active ?? true,
    };
  }

  async create(companyId: number, input: PaintPriceListItemInput): Promise<PaintPriceListItem> {
    return this.itemRepo.create(this.toCreatePayload(companyId, input));
  }

  async replaceSupplier(
    companyId: number,
    supplierName: string,
    inputs: PaintPriceListItemInput[],
  ): Promise<number> {
    const existing = await this.itemRepo.findAllForCompany(companyId);
    const toRemove = existing.filter((item) => item.supplierName === supplierName);
    await Promise.all(toRemove.map((item) => this.itemRepo.remove(item)));
    const created = await Promise.all(
      inputs.map((input) => this.itemRepo.create(this.toCreatePayload(companyId, input))),
    );
    return created.length;
  }

  async addMany(companyId: number, inputs: PaintPriceListItemInput[]): Promise<number> {
    const created = await Promise.all(
      inputs.map((input) => this.itemRepo.create(this.toCreatePayload(companyId, input))),
    );
    return created.length;
  }

  async setUpliftForAll(companyId: number, upliftPercent: number): Promise<{ updated: number }> {
    const items = await this.itemRepo.findAllForCompany(companyId);
    const updated = await Promise.all(
      items.map((item) => this.itemRepo.save({ ...item, upliftPercent })),
    );
    return { updated: updated.length };
  }

  async update(
    companyId: number,
    id: number,
    input: Partial<PaintPriceListItemInput>,
  ): Promise<PaintPriceListItem> {
    const existing = await this.itemRepo.findOneForCompany(companyId, id);
    if (!existing) {
      throw new NotFoundException(`Paint price list item ${id} not found`);
    }
    const merged: PaintPriceListItem = {
      ...existing,
      ...input,
      id: existing.id,
      companyId,
    } as PaintPriceListItem;
    return this.itemRepo.save(merged);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const existing = await this.itemRepo.findOneForCompany(companyId, id);
    if (!existing) {
      throw new NotFoundException(`Paint price list item ${id} not found`);
    }
    await this.itemRepo.remove(existing);
  }
}
