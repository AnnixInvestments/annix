import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { StockPurchaseBatch } from "../entities/stock-purchase-batch.entity";
import { FifoBatchService } from "./fifo-batch.service";

const LEGACY_BATCH_RECEIVED_AT = "2000-01-01T00:00:00.000Z";

export interface FifoBootstrapResult {
  productsConsidered: number;
  legacyBatchesCreated: number;
  legacyBatchesSkipped: number;
}

@Injectable()
export class FifoBootstrapService {
  private readonly logger = new Logger(FifoBootstrapService.name);

  constructor(
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
    @InjectRepository(StockPurchaseBatch)
    private readonly batchRepo: Repository<StockPurchaseBatch>,
    private readonly fifoBatchService: FifoBatchService,
  ) {}

  async bootstrapCompany(companyId: number, dryRun = false): Promise<FifoBootstrapResult> {
    const products = await this.productRepo.find({
      where: { companyId, active: true },
    });
    let created = 0;
    let skipped = 0;

    for (const product of products) {
      const existingLegacy = await this.batchRepo.findOne({
        where: { companyId, productId: product.id, isLegacyBatch: true },
      });
      if (existingLegacy) {
        skipped += 1;
        continue;
      }
      if (product.quantity <= 0) {
        skipped += 1;
        continue;
      }
      if (dryRun) {
        created += 1;
        continue;
      }
      await this.fifoBatchService.createBatch(companyId, {
        productId: product.id,
        sourceType: "legacy",
        quantityPurchased: product.quantity,
        costPerUnit: product.costPerUnit,
        receivedAt: fromISO(LEGACY_BATCH_RECEIVED_AT).toJSDate(),
        isLegacyBatch: true,
        notes: "Legacy bootstrap batch — created on stock-management cutover",
      });
      created += 1;
    }

    if (dryRun) {
      this.logger.log(
        `[dry-run] Company ${companyId}: would create ${created} legacy batches (${skipped} skipped)`,
      );
    } else {
      this.logger.log(
        `Company ${companyId}: created ${created} legacy batches (${skipped} skipped)`,
      );
    }

    return {
      productsConsidered: products.length,
      legacyBatchesCreated: created,
      legacyBatchesSkipped: skipped,
    };
  }
}
