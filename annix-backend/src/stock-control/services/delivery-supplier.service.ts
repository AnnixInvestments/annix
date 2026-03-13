import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeliveryNoteItem } from "../entities/delivery-note-item.entity";
import { StockControlSupplier } from "../entities/stock-control-supplier.entity";
import { StockItem } from "../entities/stock-item.entity";

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
    const existing = await this.supplierRepo
      .createQueryBuilder("supplier")
      .where("supplier.companyId = :companyId", { companyId })
      .andWhere("LOWER(supplier.name) = LOWER(:name)", { name: supplierName })
      .getOne();

    if (existing) {
      return existing;
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

  async findMatchingStockItem(
    companyId: number,
    supplierName: string,
    description: string,
    newSku: string,
  ): Promise<{ existingItem: StockItem | null; sameSupplier: boolean }> {
    const normalizedDesc = this.normalizeForComparison(description);
    const normalizedNewSku = newSku.toLowerCase().replace(/[^a-z0-9]/g, "");

    const allItems = await this.stockItemRepo.find({ where: { companyId } });

    const candidateItems = allItems.filter((item) => {
      const normalizedItemName = this.normalizeForComparison(item.name);
      const normalizedItemSku = item.sku.toLowerCase().replace(/[^a-z0-9]/g, "");

      const nameMatch =
        normalizedDesc === normalizedItemName ||
        (normalizedDesc.length > 15 && normalizedItemName.includes(normalizedDesc)) ||
        (normalizedItemName.length > 15 && normalizedDesc.includes(normalizedItemName));

      const skuSimilar =
        normalizedNewSku.length > 5 &&
        normalizedItemSku.length > 5 &&
        (normalizedNewSku.includes(normalizedItemSku.slice(-5)) ||
          normalizedItemSku.includes(normalizedNewSku.slice(-5)));

      return nameMatch || skuSimilar;
    });

    if (candidateItems.length === 0) {
      return { existingItem: null, sameSupplier: false };
    }

    const candidateIds = candidateItems.map((item) => item.id);
    const supplierRows: { stockItemId: number; supplierName: string }[] =
      await this.deliveryNoteItemRepo
        .createQueryBuilder("dni")
        .innerJoin("dni.deliveryNote", "dn")
        .where("dni.stock_item_id IN (:...candidateIds)", { candidateIds })
        .andWhere("dni.company_id = :companyId", { companyId })
        .select("DISTINCT dni.stock_item_id", "stockItemId")
        .addSelect("dn.supplierName", "supplierName")
        .getRawMany();

    const suppliersByItemId = supplierRows.reduce<Record<number, string[]>>((acc, row) => {
      const id = Number(row.stockItemId);
      const existing = acc[id] ?? [];
      return { ...acc, [id]: [...existing, row.supplierName?.toLowerCase() || ""] };
    }, {});

    const normalizedCurrentSupplier = supplierName?.toLowerCase() || "";

    const matchedItem = candidateItems.find((item) => {
      const suppliers = suppliersByItemId[item.id] ?? [];
      return suppliers.some(
        (s) =>
          s === normalizedCurrentSupplier ||
          s.includes(normalizedCurrentSupplier) ||
          normalizedCurrentSupplier.includes(s),
      );
    });

    if (matchedItem) {
      this.logger.log(
        `Found matching item: "${matchedItem.name}" (SKU: ${matchedItem.sku}) from same supplier: ${supplierName}`,
      );
      return { existingItem: matchedItem, sameSupplier: true };
    }

    candidateItems.forEach((item) => {
      const suppliers = suppliersByItemId[item.id] ?? [];
      this.logger.log(
        `Found similar item: "${item.name}" but from different supplier(s): ${suppliers.join(", ")} vs current: ${supplierName}`,
      );
    });

    return { existingItem: null, sameSupplier: false };
  }

  normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }
}
