import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { lookupCoatingProduct } from "../config/coating-products";
import {
  PaintCoatRole,
  PaintFinishType,
  PaintGenericType,
  PaintPriceListItem,
} from "../entities/paint-price-list-item.entity";
import { DEFAULT_PAINT_PRICING_CONFIG, PaintPricingConfig } from "../entities/paint-pricing-config";
import { PaintPriceListItemRepository } from "../repositories/paint-price-list-item.repository";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import {
  PAINT_FINISH_TYPES,
  PAINT_GENERIC_TYPES,
  PaintPriceListExtractionService,
} from "./paint-price-list-extraction.service";
import { PaintPricingResult, PaintPricingService } from "./paint-pricing.service";

export interface PaintPriceListItemInput {
  supplierName: string;
  coatType?: string | null;
  productName: string;
  paintType?: string | null;
  genericType?: string | null;
  finishType?: string | null;
  zincRich?: boolean | null;
  mioPigment?: boolean | null;
  surfaceTolerant?: boolean | null;
  heatResistanceC?: number | null;
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
  preferred?: boolean;
}

export interface PaintPackVariant {
  id: number;
  packSizeLitres: number | null;
  costPerLitre: number;
  costPerKit: number | null;
}

export interface PaintPriceListRow {
  item: PaintPriceListItem;
  pricing: PaintPricingResult;
  isPricingVariant: boolean;
  packVariants: PaintPackVariant[];
}

export interface PaintPriceListResponse {
  config: PaintPricingConfig;
  lossPct: number;
  rows: PaintPriceListRow[];
}

export interface QuoteTierPrice {
  name: string;
  discountPercent: number;
  pricePerM2: number;
}

export interface QuoteCatalogItem {
  id: number;
  supplierName: string;
  productName: string;
  paintType: string | null;
  coatType: string | null;
  genericType: string | null;
  finishType: string | null;
  zincRich: boolean;
  mioPigment: boolean;
  recommendedMicrons: number | null;
  preferred: boolean;
  salePerM2: number;
  tiers: QuoteTierPrice[];
}

export interface PaintQuoteInput {
  itemId: number;
  areaM2: number;
  micronsOverride?: number | null;
  tierName?: string | null;
}

export interface PaintQuoteResult {
  productName: string;
  supplierName: string;
  microns: number;
  areaM2: number;
  tierName: string | null;
  pricePerM2: number;
  total: number;
}

export interface PackOptionLine {
  packSizeLitres: number;
  qty: number;
  packCost: number;
  lineTotal: number;
  totalLitres: number;
}

export interface PackOptionRequestItem {
  product: string;
  litres: number;
}

export interface PackOptionResult {
  product: string;
  matched: boolean;
  litres: number;
  packs: PaintPackVariant[];
  singlePackOptions: PackOptionLine[];
  best: PackOptionLine[] | null;
  bestTotalCost: number | null;
  bestTotalLitres: number | null;
}

export interface PreferredPaintOption {
  id: number;
  productName: string;
  supplierName: string;
  coatType: string | null;
  paintType: string | null;
  recommendedMicrons: number | null;
  volumeSolidsPercent: number;
}

export interface MultiCoatQuoteCoatInput {
  itemId: number;
  micronsOverride?: number | null;
}

export interface MultiCoatQuoteInput {
  coats: MultiCoatQuoteCoatInput[];
  blastGrade?: string | null;
  areaM2: number;
  tierName?: string | null;
}

export interface MultiCoatQuoteLine {
  itemId: number;
  productName: string;
  supplierName: string;
  coatType: string | null;
  microns: number;
  pricePerM2: number;
  lineTotal: number;
}

export interface MultiCoatBlastLine {
  grade: string;
  pricePerM2: number;
  lineTotal: number;
}

export interface MultiCoatQuoteResult {
  coats: MultiCoatQuoteLine[];
  blast: MultiCoatBlastLine | null;
  areaM2: number;
  tierName: string | null;
  paintPricePerM2: number;
  paintTotal: number;
  blastTotal: number;
  total: number;
}

@Injectable()
export class PaintPriceListService {
  private readonly logger = new Logger(PaintPriceListService.name);

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
      item.genericType == null ||
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

  private mapReferenceGenericType(coarse: string): PaintGenericType | null {
    const map: Record<string, PaintGenericType> = {
      epoxy: "epoxy",
      epoxy_mio: "epoxy-mio",
      epoxy_mastic: "epoxy-mastic",
      polyurethane: "polyurethane",
      polysiloxane: "polysiloxane",
      alkyd: "alkyd",
      acrylic: "acrylic",
      zinc_rich: "zinc-rich-epoxy",
      inorganic_zinc: "zinc-silicate",
      bitumen: "bitumen",
    };
    return map[coarse] ?? null;
  }

  private deriveZincRich(genericType: PaintGenericType | null): boolean {
    return genericType === "zinc-rich-epoxy" || genericType === "zinc-silicate";
  }

  private deriveMio(genericType: PaintGenericType | null): boolean {
    return genericType === "epoxy-mio";
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
    if (reference.genericType) {
      const mapped = this.mapReferenceGenericType(reference.genericType);
      if (mapped && next.genericType !== mapped) {
        next.genericType = mapped;
        if (this.deriveZincRich(mapped)) {
          next.zincRich = true;
        }
        if (this.deriveMio(mapped)) {
          next.mioPigment = true;
        }
        changed = true;
      }
    }
    return { item: next, changed };
  }

  private referenceGenericMismatch(item: PaintPriceListItem): boolean {
    const reference = lookupCoatingProduct(item.productName);
    const referenceGeneric = reference ? reference.genericType : null;
    if (!referenceGeneric) {
      return false;
    }
    const mapped = this.mapReferenceGenericType(referenceGeneric);
    return mapped != null && mapped !== item.genericType;
  }

  private validGenericType(value?: string | null): PaintGenericType | null {
    if (value && (PAINT_GENERIC_TYPES as readonly string[]).includes(value)) {
      return value as PaintGenericType;
    }
    return null;
  }

  private validFinishType(value?: string | null): PaintFinishType | null {
    if (value && (PAINT_FINISH_TYPES as readonly string[]).includes(value)) {
      return value as PaintFinishType;
    }
    return null;
  }

  private fillFromSpec(
    item: PaintPriceListItem,
    spec: {
      coatType?: string | null;
      paintType?: string | null;
      genericType?: string | null;
      finishType?: string | null;
      zincRich?: boolean | null;
      mioPigment?: boolean | null;
      surfaceTolerant?: boolean | null;
      heatResistanceC?: number | null;
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
    if (next.genericType == null) {
      const generic = this.validGenericType(spec.genericType);
      if (generic) {
        next.genericType = generic;
        if (!next.zincRich && this.deriveZincRich(generic)) {
          next.zincRich = true;
        }
        if (!next.mioPigment && this.deriveMio(generic)) {
          next.mioPigment = true;
        }
        changed = true;
      }
    }
    if (next.finishType == null) {
      const finish = this.validFinishType(spec.finishType);
      if (finish) {
        next.finishType = finish;
        changed = true;
      }
    }
    if (!next.zincRich && spec.zincRich === true) {
      next.zincRich = true;
      changed = true;
    }
    if (!next.mioPigment && spec.mioPigment === true) {
      next.mioPigment = true;
      changed = true;
    }
    if (!next.surfaceTolerant && spec.surfaceTolerant === true) {
      next.surfaceTolerant = true;
      changed = true;
    }
    if (next.heatResistanceC == null && spec.heatResistanceC && spec.heatResistanceC > 0) {
      next.heatResistanceC = spec.heatResistanceC;
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

  async enrichMissingSpecs(companyId: number): Promise<{
    enriched: number;
    checked: number;
    unfilled: { productName: string; supplierName: string; missing: string[] }[];
  }> {
    const items = await this.itemRepo.findAllForCompany(companyId);
    const needing = items.filter(
      (item) => this.itemNeedsSpecs(item) || this.referenceGenericMismatch(item),
    );
    const missingCoat = items.filter((item) => item.coatType == null).length;
    this.logger.log(
      `Enrich: ${needing.length}/${items.length} rows need specs (coatType null on ${missingCoat})`,
    );
    if (needing.length === 0) {
      return { enriched: 0, checked: 0, unfilled: [] };
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

    const outcomes = await Promise.all(
      afterReference.map(async (entry) => {
        let current = entry.item;
        let changed = entry.changed;
        const spec = specs.get(current.productName.trim().toLowerCase());
        if (spec) {
          const applied = this.fillFromSpec(current, spec);
          current = applied.item;
          changed = changed || applied.changed;
        }
        if (changed) {
          await this.itemRepo.save(current);
        }
        return { item: current, changed };
      }),
    );

    const unfilled = outcomes
      .filter((outcome) => this.itemNeedsSpecs(outcome.item))
      .map((outcome) => ({
        productName: outcome.item.productName,
        supplierName: outcome.item.supplierName,
        missing: this.missingSpecFields(outcome.item),
      }));
    unfilled.forEach((entry) =>
      this.logger.warn(
        `Enrich: "${entry.supplierName} — ${entry.productName}" still missing: ${entry.missing.join(", ")}`,
      ),
    );

    return {
      enriched: outcomes.filter((outcome) => outcome.changed).length,
      checked: needing.length,
      unfilled,
    };
  }

  private missingSpecFields(item: PaintPriceListItem): string[] {
    const missing: string[] = [];
    if (item.coatType == null) missing.push("coat type");
    if (item.paintType == null) missing.push("paint type");
    if (item.genericType == null) missing.push("technology");
    if (!item.volumeSolidsPercent || item.volumeSolidsPercent <= 0) missing.push("vol solids");
    if (item.recommendedMicrons == null) missing.push("microns");
    if (item.thinnerName == null) missing.push("thinner");
    if (item.maxThinningPercent == null) missing.push("max thinning %");
    return missing;
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
      blastGrades: stored.blastGrades ?? DEFAULT_PAINT_PRICING_CONFIG.blastGrades,
    };
  }

  async updateConfig(companyId: number, config: PaintPricingConfig): Promise<PaintPricingConfig> {
    await this.companyRepo.updateById(companyId, { paintPricingConfig: config });
    return config;
  }

  private groupKey(item: PaintPriceListItem): string {
    return `${item.supplierName}__${item.productName}`.toLowerCase();
  }

  private groupVariants(items: PaintPriceListItem[]): Map<string, PaintPriceListItem[]> {
    const groups = new Map<string, PaintPriceListItem[]>();
    items.forEach((item) => {
      const key = this.groupKey(item);
      const existing = groups.get(key) ?? [];
      existing.push(item);
      groups.set(key, existing);
    });
    return groups;
  }

  private pricingVariant(variants: PaintPriceListItem[]): PaintPriceListItem {
    return variants.reduce((highest, candidate) =>
      candidate.costPerLitre > highest.costPerLitre ? candidate : highest,
    );
  }

  private packVariantsOf(variants: PaintPriceListItem[]): PaintPackVariant[] {
    return variants
      .map((variant) => ({
        id: variant.id,
        packSizeLitres: variant.packSizeLitres ?? null,
        costPerLitre: variant.costPerLitre,
        costPerKit: variant.costPerKit ?? null,
      }))
      .sort((a, b) => (b.packSizeLitres ?? 0) - (a.packSizeLitres ?? 0));
  }

  async list(companyId: number): Promise<PaintPriceListResponse> {
    const [items, config] = await Promise.all([
      this.itemRepo.findAllForCompany(companyId),
      this.configForCompany(companyId),
    ]);
    const groups = this.groupVariants(items);
    const rows = items.map((item) => {
      const variants = groups.get(this.groupKey(item)) ?? [item];
      const primary = this.pricingVariant(variants);
      return {
        item,
        pricing: this.pricingService.computePricing(item, config),
        isPricingVariant: primary.id === item.id,
        packVariants: this.packVariantsOf(variants),
      };
    });
    return { config, lossPct: config.lossPct, rows };
  }

  private pricingVariantItems(items: PaintPriceListItem[]): PaintPriceListItem[] {
    const groups = this.groupVariants(items);
    return Array.from(groups.values()).map((variants) => this.pricingVariant(variants));
  }

  private mergedGroupSpec(variants: PaintPriceListItem[]): {
    paintType: string | null;
    coatType: string | null;
    genericType: string | null;
    finishType: string | null;
    zincRich: boolean;
    mioPigment: boolean;
    preferred: boolean;
    recommendedMicrons: number | null;
  } {
    const firstString = (
      pick: (v: PaintPriceListItem) => string | null | undefined,
    ): string | null => {
      const match = variants.find((variant) => pick(variant) != null);
      return match ? (pick(match) ?? null) : null;
    };
    const firstNumber = (
      pick: (v: PaintPriceListItem) => number | null | undefined,
    ): number | null => {
      const match = variants.find((variant) => pick(variant) != null);
      return match ? (pick(match) ?? null) : null;
    };
    return {
      paintType: firstString((variant) => variant.paintType),
      coatType: firstString((variant) => variant.coatType),
      genericType: firstString((variant) => variant.genericType),
      finishType: firstString((variant) => variant.finishType),
      zincRich: variants.some((variant) => variant.zincRich === true),
      mioPigment: variants.some((variant) => variant.mioPigment === true),
      preferred: variants.some((variant) => variant.preferred === true),
      recommendedMicrons: firstNumber((variant) => variant.recommendedMicrons),
    };
  }

  async quoteCatalog(companyId: number): Promise<QuoteCatalogItem[]> {
    const [items, config] = await Promise.all([
      this.itemRepo.findAllForCompany(companyId),
      this.configForCompany(companyId),
    ]);
    const activeItems = items.filter((item) => item.active !== false);
    const groups = this.groupVariants(activeItems);
    return Array.from(groups.values())
      .map((variants) => {
        const primary = this.pricingVariant(variants);
        const spec = this.mergedGroupSpec(variants);
        return { primary, spec, pricing: this.pricingService.computePricing(primary, config) };
      })
      .filter((row) => row.pricing.salePerM2 > 0)
      .map((row) => ({
        id: row.primary.id,
        supplierName: row.primary.supplierName,
        productName: row.primary.productName,
        paintType: row.spec.paintType,
        coatType: row.spec.coatType,
        genericType: row.spec.genericType,
        finishType: row.spec.finishType,
        zincRich: row.spec.zincRich,
        mioPigment: row.spec.mioPigment,
        recommendedMicrons: row.spec.recommendedMicrons,
        preferred: row.spec.preferred,
        salePerM2: row.pricing.salePerM2,
        tiers: row.pricing.tierPrices,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }

  private normalizeMatchKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  private packCostOf(variant: PaintPackVariant): number {
    if (variant.costPerKit && variant.costPerKit > 0) {
      return variant.costPerKit;
    }
    const size = variant.packSizeLitres ?? 0;
    return variant.costPerLitre * size;
  }

  private bestPackCombo(packs: PaintPackVariant[], litres: number): PackOptionLine[] | null {
    const usable = packs.filter(
      (pack) => (pack.packSizeLitres ?? 0) > 0 && this.packCostOf(pack) > 0,
    );
    if (usable.length === 0 || litres <= 0) {
      return null;
    }
    const sizes = usable.map((pack) => pack.packSizeLitres as number);
    const costs = usable.map((pack) => this.packCostOf(pack));
    const caps = sizes.map((size) => Math.min(Math.ceil(litres / size) + 1, 500));

    let bestCounts: number[] | null = null;
    let bestCost = Number.POSITIVE_INFINITY;

    const recurse = (index: number, counts: number[], litSum: number, costSum: number) => {
      if (costSum >= bestCost) {
        return;
      }
      if (index === usable.length) {
        if (litSum >= litres && costSum < bestCost) {
          bestCost = costSum;
          bestCounts = [...counts];
        }
        return;
      }
      for (let c = 0; c <= caps[index]; c++) {
        recurse(index + 1, [...counts, c], litSum + c * sizes[index], costSum + c * costs[index]);
      }
    };
    recurse(0, [], 0, 0);

    if (!bestCounts) {
      return null;
    }
    const counts = bestCounts as number[];
    return usable
      .map((pack, i) => ({ pack, qty: counts[i] }))
      .filter((entry) => entry.qty > 0)
      .map((entry) => {
        const size = entry.pack.packSizeLitres as number;
        const packCost = this.packCostOf(entry.pack);
        return {
          packSizeLitres: size,
          qty: entry.qty,
          packCost: Math.round(packCost * 100) / 100,
          lineTotal: Math.round(packCost * entry.qty * 100) / 100,
          totalLitres: Math.round(size * entry.qty * 100) / 100,
        };
      });
  }

  async packOptions(
    companyId: number,
    requests: PackOptionRequestItem[],
  ): Promise<PackOptionResult[]> {
    const items = await this.itemRepo.findAllForCompany(companyId);
    const groups = this.groupVariants(items);
    const groupByNormalized = new Map<string, PaintPriceListItem[]>();
    groups.forEach((variants) => {
      const sample = variants[0];
      groupByNormalized.set(this.normalizeMatchKey(sample.productName), variants);
    });

    return requests.map((request) => {
      const litres = request.litres > 0 ? request.litres : 0;
      const key = this.normalizeMatchKey(request.product);
      const matchedEntry = Array.from(groupByNormalized.entries()).find(
        ([normalized]) =>
          normalized === key || key.includes(normalized) || normalized.includes(key),
      );
      const variants = matchedEntry ? matchedEntry[1] : [];
      const packs = this.packVariantsOf(variants);
      const singlePackOptions = packs
        .filter((pack) => (pack.packSizeLitres ?? 0) > 0 && this.packCostOf(pack) > 0)
        .map((pack) => {
          const size = pack.packSizeLitres as number;
          const qty = litres > 0 ? Math.ceil(litres / size) : 0;
          const packCost = this.packCostOf(pack);
          return {
            packSizeLitres: size,
            qty,
            packCost: Math.round(packCost * 100) / 100,
            lineTotal: Math.round(packCost * qty * 100) / 100,
            totalLitres: Math.round(size * qty * 100) / 100,
          };
        });
      const best = this.bestPackCombo(packs, litres);
      const bestTotalCost = best
        ? Math.round(best.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100
        : null;
      const bestTotalLitres = best
        ? Math.round(best.reduce((sum, line) => sum + line.totalLitres, 0) * 100) / 100
        : null;
      return {
        product: request.product,
        matched: variants.length > 0,
        litres,
        packs,
        singlePackOptions,
        best,
        bestTotalCost,
        bestTotalLitres,
      };
    });
  }

  async preferredForAssignment(companyId: number): Promise<PreferredPaintOption[]> {
    const items = await this.itemRepo.findAllForCompany(companyId);
    const preferredActive = items.filter(
      (item) => item.preferred === true && item.active !== false,
    );
    return this.pricingVariantItems(preferredActive)
      .map((item) => ({
        id: item.id,
        productName: item.productName,
        supplierName: item.supplierName,
        coatType: item.coatType ?? null,
        paintType: item.paintType ?? null,
        recommendedMicrons: item.recommendedMicrons ?? null,
        volumeSolidsPercent: item.volumeSolidsPercent,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }

  async quote(companyId: number, input: PaintQuoteInput): Promise<PaintQuoteResult> {
    const item = await this.itemRepo.findOneForCompany(companyId, input.itemId);
    if (!item) {
      throw new NotFoundException(`Paint price list item ${input.itemId} not found`);
    }
    const config = await this.configForCompany(companyId);
    const override = input.micronsOverride;
    const forQuote: PaintPriceListItem =
      override && override > 0 ? { ...item, micronsOverride: override } : item;
    const pricing = this.pricingService.computePricing(forQuote, config);
    const tierName = input.tierName ?? null;
    const tier = tierName ? pricing.tierPrices.find((entry) => entry.name === tierName) : null;
    const pricePerM2 = tier ? tier.pricePerM2 : pricing.salePerM2;
    const area = input.areaM2 > 0 ? input.areaM2 : 0;
    return {
      productName: item.productName,
      supplierName: item.supplierName,
      microns: pricing.microns,
      areaM2: area,
      tierName: tier ? tier.name : null,
      pricePerM2,
      total: Math.round(pricePerM2 * area * 100) / 100,
    };
  }

  private blastPriceForTier(config: PaintPricingConfig, grade: string, tierName: string | null) {
    const grades = config.blastGrades ?? [];
    const match = grades.find((entry) => entry.grade === grade);
    if (!match) {
      return null;
    }
    const tierPrices = match.tierPrices ?? [];
    const tierMatch = tierName ? tierPrices.find((entry) => entry.name === tierName) : null;
    const pricePerM2 = tierMatch ? tierMatch.pricePerM2 : match.pricePerM2;
    return { grade: match.grade, pricePerM2 };
  }

  async multiCoatQuote(
    companyId: number,
    input: MultiCoatQuoteInput,
  ): Promise<MultiCoatQuoteResult> {
    const config = await this.configForCompany(companyId);
    const tierName = input.tierName ?? null;
    const area = input.areaM2 > 0 ? input.areaM2 : 0;
    const round2 = (value: number) => Math.round(value * 100) / 100;

    const coatInputs = input.coats ?? [];
    const resolved = await Promise.all(
      coatInputs.map(async (coat): Promise<MultiCoatQuoteLine | null> => {
        const item = await this.itemRepo.findOneForCompany(companyId, coat.itemId);
        if (!item) {
          return null;
        }
        const override = coat.micronsOverride;
        const forQuote: PaintPriceListItem =
          override && override > 0 ? { ...item, micronsOverride: override } : item;
        const pricing = this.pricingService.computePricing(forQuote, config);
        const tier = tierName ? pricing.tierPrices.find((entry) => entry.name === tierName) : null;
        const pricePerM2 = tier ? tier.pricePerM2 : pricing.salePerM2;
        return {
          itemId: item.id,
          productName: item.productName,
          supplierName: item.supplierName,
          coatType: item.coatType ?? null,
          microns: pricing.microns,
          pricePerM2,
          lineTotal: round2(pricePerM2 * area),
        };
      }),
    );
    const coats = resolved.filter((line): line is MultiCoatQuoteLine => line !== null);

    const blastGrade = input.blastGrade ?? null;
    const blastResolved = blastGrade ? this.blastPriceForTier(config, blastGrade, tierName) : null;
    const blast = blastResolved
      ? {
          grade: blastResolved.grade,
          pricePerM2: blastResolved.pricePerM2,
          lineTotal: round2(blastResolved.pricePerM2 * area),
        }
      : null;

    const paintPricePerM2 = round2(coats.reduce((sum, line) => sum + line.pricePerM2, 0));
    const paintTotal = round2(coats.reduce((sum, line) => sum + line.lineTotal, 0));
    const blastTotal = blast ? blast.lineTotal : 0;

    return {
      coats,
      blast,
      areaM2: area,
      tierName,
      paintPricePerM2,
      paintTotal,
      blastTotal,
      total: round2(paintTotal + blastTotal),
    };
  }

  private toCreatePayload(companyId: number, input: PaintPriceListItemInput) {
    return {
      companyId,
      supplierName: input.supplierName,
      coatType: (input.coatType ?? null) as PaintCoatRole | null,
      productName: input.productName,
      paintType: input.paintType ?? null,
      genericType: (this.validGenericType(input.genericType) ?? null) as PaintGenericType | null,
      finishType: (this.validFinishType(input.finishType) ?? null) as PaintFinishType | null,
      zincRich: input.zincRich ?? false,
      mioPigment: input.mioPigment ?? false,
      surfaceTolerant: input.surfaceTolerant ?? false,
      heatResistanceC: input.heatResistanceC ?? null,
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
      preferred: input.preferred ?? false,
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
