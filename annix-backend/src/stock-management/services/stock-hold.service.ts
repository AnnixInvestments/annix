import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromJSDate, now } from "../../lib/datetime";
import { IssuableProduct } from "../entities/issuable-product.entity";
import {
  type StockHoldDispositionStatus,
  StockHoldItem,
  type StockHoldReason,
} from "../entities/stock-hold-item.entity";

export interface FlagStockHoldInput {
  productId: number;
  stockTakeId?: number | null;
  quantity?: number | null;
  dimensionsJson?: { widthMm?: number; lengthM?: number; thicknessMm?: number } | null;
  reason: StockHoldReason;
  reasonNotes: string;
  photoUrl?: string | null;
  flaggedByStaffId: number;
  notes?: string | null;
}

export interface ResolveDispositionInput {
  status: Exclude<StockHoldDispositionStatus, "pending">;
  action: string;
  dispositionByStaffId: number;
  dispositionRefId?: number | null;
  notes?: string | null;
}

@Injectable()
export class StockHoldService {
  private readonly logger = new Logger(StockHoldService.name);

  constructor(
    @InjectRepository(StockHoldItem)
    private readonly holdRepo: Repository<StockHoldItem>,
    @InjectRepository(IssuableProduct)
    private readonly productRepo: Repository<IssuableProduct>,
  ) {}

  async flagStock(companyId: number, input: FlagStockHoldInput): Promise<StockHoldItem> {
    const product = await this.productRepo.findOne({
      where: { id: input.productId, companyId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${input.productId} not found`);
    }
    if (
      input.reason === "damaged" ||
      input.reason === "expired" ||
      input.reason === "contaminated"
    ) {
      if (!input.photoUrl) {
        throw new BadRequestException(`Reason "${input.reason}" requires a photo before flagging`);
      }
    }
    const writeOffValueR = (input.quantity ?? 0) * product.costPerUnit;
    const hold = this.holdRepo.create({
      companyId,
      stockTakeId: input.stockTakeId ?? null,
      productId: input.productId,
      quantity: input.quantity ?? null,
      dimensionsJson: input.dimensionsJson ?? null,
      reason: input.reason,
      reasonNotes: input.reasonNotes,
      photoUrl: input.photoUrl ?? null,
      flaggedByStaffId: input.flaggedByStaffId,
      writeOffValueR,
      dispositionStatus: "pending",
      notes: input.notes ?? null,
    });
    return this.holdRepo.save(hold);
  }

  async listPending(companyId: number): Promise<StockHoldItem[]> {
    return this.holdRepo.find({
      where: { companyId, dispositionStatus: "pending" },
      relations: { product: true, stockTake: true },
      order: { flaggedAt: "ASC" },
    });
  }

  async listAll(companyId: number, status?: StockHoldDispositionStatus): Promise<StockHoldItem[]> {
    const where: { companyId: number; dispositionStatus?: StockHoldDispositionStatus } = {
      companyId,
    };
    if (status) {
      where.dispositionStatus = status;
    }
    return this.holdRepo.find({
      where,
      relations: { product: true, stockTake: true },
      order: { flaggedAt: "DESC" },
    });
  }

  async byId(companyId: number, id: number): Promise<StockHoldItem> {
    const hold = await this.holdRepo.findOne({
      where: { id, companyId },
      relations: { product: true, stockTake: true },
    });
    if (!hold) {
      throw new NotFoundException(`Stock hold item ${id} not found`);
    }
    return hold;
  }

  async resolveDisposition(
    companyId: number,
    id: number,
    input: ResolveDispositionInput,
  ): Promise<StockHoldItem> {
    const hold = await this.byId(companyId, id);
    if (hold.dispositionStatus !== "pending") {
      throw new BadRequestException(
        `Stock hold ${id} already has disposition "${hold.dispositionStatus}"`,
      );
    }
    hold.dispositionStatus = input.status;
    hold.dispositionAction = input.action;
    hold.dispositionByStaffId = input.dispositionByStaffId;
    hold.dispositionAt = now().toJSDate();
    hold.dispositionRefId = input.dispositionRefId ?? null;
    hold.dispositionNotes = input.notes ?? null;
    const saved = await this.holdRepo.save(hold);
    this.logger.log(
      `Stock hold ${id} resolved as ${input.status} by staff ${input.dispositionByStaffId}`,
    );
    return saved;
  }

  async aging(companyId: number): Promise<{
    fresh: number;
    week: number;
    month: number;
    older: number;
  }> {
    const items = await this.listPending(companyId);
    const today = now();
    return items.reduce(
      (acc, item) => {
        const ageDays = Math.floor(today.diff(fromJSDate(item.flaggedAt), "days").days);
        if (ageDays <= 7) acc.fresh += 1;
        else if (ageDays <= 30) acc.week += 1;
        else if (ageDays <= 90) acc.month += 1;
        else acc.older += 1;
        return acc;
      },
      { fresh: 0, week: 0, month: 0, older: 0 },
    );
  }
}
