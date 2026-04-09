import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockItem } from "../entities/stock-item.entity";

const LEGAL_SUFFIXES =
  /\b(pty|proprietary|ltd|limited|inc|incorporated|company|co|corp|corporation|cc|close\s*corporation|trading|t\/a|ta|group|holdings|enterprises|services|supplies|supply)\b/gi;

interface MatchCandidate {
  item: StockItem;
  score: number;
  matchType: "sku_normalised" | "name_token" | "name_exact";
}

@Injectable()
export class DeliverySupplierService {
  private readonly logger = new Logger(DeliverySupplierService.name);

  constructor(
    @InjectRepository(StockControlSupplier)
    private readonly supplierRepo: Repository<StockControlSupplier>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(DeliveryNoteItem)
    private readonly deliveryNoteItemRepo: Repository<DeliveryNoteItem>,
  ) {}

  async resolveOrCreateSupplier(
    companyId: number,
    supplierName: string,
    details?: {
      vatNumber?: string;
      address?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<StockControlSupplier> {
    const normalised = this.normaliseSupplierName(supplierName);
    const existing = await this.supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.companyId = :companyId", { companyId })
      .andWhere("LOWER(supplier.name) = LOWER(:name)", { name: supplierName })
      .getOne();

    if (existing) {
      return existing;
    }

    const fuzzyMatch =
      normalised.length >= 3
        ? await this.supplierRepo
            .createQueryBuilder("supplier")
            .where("supplier.companyId = :companyId", { companyId })
            .getMany()
            .then((all) =>
              all.find((s) => {
                const normS = this.normaliseSupplierName(s.name);
                return (
                  normS === normalised || normS.includes(normalised) || normalised.includes(normS)
                );
              }),
            )
        : null;

    if (fuzzyMatch) {
      this.logger.log(
        `Matched supplier "${supplierName}" to existing "${fuzzyMatch.name}" via normalisation`,
      );
      return fuzzyMatch;
    }

    const supplier = this.supplierRepo.create({
      companyId,
      name: supplierName,
      vatNumber: details?.vatNumber || null,
      address: details?.address || null,
      contactPerson: details?.contactPerson || null,
      phone: details?.phone || null,
      email: details?.email || null,
    });

    const saved = await this.supplierRepo.save(supplier);
    this.logger.log(
      `Auto-created supplier "${supplierName}" (id=${saved.id}) for company ${companyId}`,
    );
    return saved;
  }

  async findByNormalisedSku(companyId: number, sku: string): Promise<StockItem | null> {
    const normalised = this.normaliseSku(sku);
    if (normalised.length < 2) return null;

    const allItems = await this.stockItemRepo.find({ where: { companyId } });

    return allItems.find((item) => this.normaliseSku(item.sku) === normalised) ?? null;
  }

  async findMatchingStockItem(
    companyId: number,
    supplierName: string,
    description: string,
    newSku: string,
    category?: string | null,
  ): Promise<{ existingItem: StockItem | null; sameSupplier: boolean; score: number }> {
    const allItems = await this.stockItemRepo.find({ where: { companyId } });

    const candidates = this.scoreCandidates(allItems, description, newSku, category);

    if (candidates.length === 0) {
      return { existingItem: null, sameSupplier: false, score: 0 };
    }

    const candidateIds = candidates.map((c) => c.item.id);
    const suppliersByItemId = await this.supplierHistoryForItems(companyId, candidateIds);
    const normalizedCurrentSupplier = this.normaliseSupplierName(supplierName);

    const bestSameSupplier = candidates.find((c) => {
      const suppliers = suppliersByItemId[c.item.id] ?? [];
      return suppliers.some((s) => this.suppliersMatch(s, normalizedCurrentSupplier));
    });

    if (bestSameSupplier) {
      this.logger.log(
        `Matched item: "${bestSameSupplier.item.name}" (SKU: ${bestSameSupplier.item.sku}) ` +
          `score=${bestSameSupplier.score.toFixed(2)} type=${bestSameSupplier.matchType} ` +
          `same supplier: ${supplierName}`,
      );
      return {
        existingItem: bestSameSupplier.item,
        sameSupplier: true,
        score: bestSameSupplier.score,
      };
    }

    const bestAnySupplier = candidates[0];
    if (bestAnySupplier.score >= 0.85) {
      this.logger.log(
        `High-confidence match: "${bestAnySupplier.item.name}" (SKU: ${bestAnySupplier.item.sku}) ` +
          `score=${bestAnySupplier.score.toFixed(2)} — different supplier but strong match`,
      );
      return {
        existingItem: bestAnySupplier.item,
        sameSupplier: false,
        score: bestAnySupplier.score,
      };
    }

    candidates.slice(0, 3).forEach((c) => {
      const suppliers = suppliersByItemId[c.item.id] ?? [];
      this.logger.log(
        `Near-match: "${c.item.name}" score=${c.score.toFixed(2)} type=${c.matchType} ` +
          `suppliers=[${suppliers.join(", ")}] vs current="${supplierName}"`,
      );
    });

    return { existingItem: null, sameSupplier: false, score: bestAnySupplier.score };
  }

  scoreCandidates(
    allItems: StockItem[],
    description: string,
    newSku: string,
    category?: string | null,
  ): MatchCandidate[] {
    const normDesc = this.normalizeForComparison(description);
    const normSku = this.normaliseSku(newSku);
    const descTokens = this.tokenise(description);
    const normCategory = category?.toLowerCase().trim() || null;

    const candidates: MatchCandidate[] = allItems
      .map((item) => {
        const normItemName = this.normalizeForComparison(item.name);
        const normItemSku = this.normaliseSku(item.sku);
        const itemCategory = item.category?.toLowerCase().trim() || null;
        const categoryMatch = normCategory && itemCategory ? normCategory === itemCategory : null;

        if (normSku.length >= 3 && normSku === normItemSku) {
          return { item, score: 0.95, matchType: "sku_normalised" as const };
        }

        if (normDesc === normItemName && normDesc.length >= 3) {
          return { item, score: 0.9, matchType: "name_exact" as const };
        }

        const tokenScore = this.jaccardTokenSimilarity(descTokens, this.tokenise(item.name));
        if (tokenScore >= 0.5) {
          if (categoryMatch === false && tokenScore < 0.8) {
            return null;
          }
          const boosted = categoryMatch === true ? Math.min(1, tokenScore + 0.05) : tokenScore;
          return { item, score: boosted, matchType: "name_token" as const };
        }

        if (
          normSku.length >= 5 &&
          normItemSku.length >= 5 &&
          (normSku.includes(normItemSku) || normItemSku.includes(normSku))
        ) {
          return { item, score: 0.7, matchType: "sku_normalised" as const };
        }

        return null;
      })
      .filter((c): c is MatchCandidate => c !== null)
      .sort((a, b) => b.score - a.score);

    return candidates;
  }

  normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  normaliseSku(sku: string): string {
    return sku
      .toLowerCase()
      .replace(/[\s\-_./\\]+/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  normaliseSupplierName(name: string): string {
    return (name || "")
      .toLowerCase()
      .replace(LEGAL_SUFFIXES, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  suppliersMatch(a: string, b: string): boolean {
    const normA = this.normaliseSupplierName(a);
    const normB = this.normaliseSupplierName(b);
    if (normA === normB) return true;
    if (normA.length >= 4 && normB.length >= 4) {
      if (normA.includes(normB) || normB.includes(normA)) return true;
    }
    const tokensA = normA.split(/\s+/).filter((t) => t.length > 2);
    const tokensB = normB.split(/\s+/).filter((t) => t.length > 2);
    if (tokensA.length >= 2 && tokensB.length >= 2) {
      const overlap = tokensA.filter((t) => tokensB.includes(t));
      const minLen = Math.min(tokensA.length, tokensB.length);
      if (overlap.length / minLen >= 0.6) return true;
    }
    return false;
  }

  private tokenise(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  private jaccardTokenSimilarity(tokensA: string[], tokensB: string[]): number {
    if (tokensA.length === 0 || tokensB.length === 0) return 0;
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = [...setA].filter((t) => setB.has(t));
    const union = new Set([...setA, ...setB]);
    return intersection.length / union.size;
  }

  private async supplierHistoryForItems(
    companyId: number,
    itemIds: number[],
  ): Promise<Record<number, string[]>> {
    if (itemIds.length === 0) return {};

    const supplierRows: { stockItemId: number; supplierName: string }[] =
      await this.deliveryNoteItemRepo
        .createQueryBuilder("dni")
        .innerJoin("dni.deliveryNote", "dn")
        .where("dni.stock_item_id IN (:...itemIds)", { itemIds })
        .andWhere("dni.company_id = :companyId", { companyId })
        .select("DISTINCT dni.stock_item_id", "stockItemId")
        .addSelect("dn.supplierName", "supplierName")
        .getRawMany();

    return supplierRows.reduce<Record<number, string[]>>((acc, row) => {
      const id = Number(row.stockItemId);
      const existing = acc[id] ?? [];
      return { ...acc, [id]: [...existing, row.supplierName?.toLowerCase() || ""] };
    }, {});
  }
}
