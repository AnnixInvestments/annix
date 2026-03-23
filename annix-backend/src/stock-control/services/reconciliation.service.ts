import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ReconciliationEvent,
  ReconciliationEventType,
} from "../entities/reconciliation-event.entity";
import {
  ReconciliationItem,
  ReconciliationSourceType,
  ReconciliationStatus,
} from "../entities/reconciliation-item.entity";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface ReconciliationSummary {
  totalItems: number;
  totalOrdered: number;
  totalReleased: number;
  totalShipped: number;
  totalMps: number;
  pending: number;
  partial: number;
  complete: number;
  discrepancy: number;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconciliationItem)
    private readonly itemRepo: Repository<ReconciliationItem>,
    @InjectRepository(ReconciliationEvent)
    private readonly eventRepo: Repository<ReconciliationEvent>,
  ) {}

  async itemsForJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<Array<ReconciliationItem & { events: ReconciliationEvent[] }>> {
    const items = await this.itemRepo.find({
      where: { companyId, jobCardId },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });

    const events =
      items.length > 0
        ? await this.eventRepo.find({
            where: items.map((i) => ({ reconciliationItemId: i.id })),
            order: { createdAt: "DESC" },
          })
        : [];

    const eventsByItemId = events.reduce<Record<number, ReconciliationEvent[]>>(
      (acc, e) => ({
        ...acc,
        [e.reconciliationItemId]: [...(acc[e.reconciliationItemId] || []), e],
      }),
      {},
    );

    return items.map((item) => ({
      ...item,
      events: eventsByItemId[item.id] || [],
    }));
  }

  async addItem(
    companyId: number,
    jobCardId: number,
    data: { itemDescription: string; itemCode: string | null; quantityOrdered: number },
    _user: UserContext,
  ): Promise<ReconciliationItem> {
    const maxSort = await this.itemRepo
      .createQueryBuilder("ri")
      .select("COALESCE(MAX(ri.sort_order), -1)", "maxSort")
      .where("ri.company_id = :companyId AND ri.job_card_id = :jobCardId", { companyId, jobCardId })
      .getRawOne();

    const record = this.itemRepo.create({
      companyId,
      jobCardId,
      itemDescription: data.itemDescription,
      itemCode: data.itemCode,
      sourceType: ReconciliationSourceType.MANUAL,
      quantityOrdered: data.quantityOrdered,
      reconciliationStatus: ReconciliationStatus.PENDING,
      sortOrder: (maxSort?.maxSort ?? -1) + 1,
    });

    return this.itemRepo.save(record);
  }

  async updateItem(
    companyId: number,
    id: number,
    data: Partial<
      Pick<ReconciliationItem, "itemDescription" | "itemCode" | "quantityOrdered" | "notes">
    >,
  ): Promise<ReconciliationItem> {
    const item = await this.findOrFail(companyId, id);
    Object.assign(item, data);
    await this.recalculateStatus(item);
    return this.itemRepo.save(item);
  }

  async deleteItem(companyId: number, id: number): Promise<void> {
    const item = await this.findOrFail(companyId, id);
    await this.itemRepo.remove(item);
  }

  async recordEvent(
    companyId: number,
    jobCardId: number,
    eventType: ReconciliationEventType,
    items: Array<{ reconciliationItemId: number; quantity: number }>,
    referenceNumber: string | null,
    user: UserContext,
    notes: string | null,
  ): Promise<ReconciliationEvent[]> {
    const events = await Promise.all(
      items.map(async (entry) => {
        const item = await this.findOrFail(companyId, entry.reconciliationItemId);

        const event = this.eventRepo.create({
          reconciliationItemId: item.id,
          companyId,
          eventType,
          quantity: entry.quantity,
          referenceNumber,
          performedByName: user.name,
          performedById: user.id,
          notes,
        });

        const saved = await this.eventRepo.save(event);

        if (eventType === ReconciliationEventType.QA_RELEASE) {
          item.quantityReleased = Number(item.quantityReleased) + entry.quantity;
        } else if (eventType === ReconciliationEventType.POLYMER_DN) {
          item.quantityShipped = Number(item.quantityShipped) + entry.quantity;
        } else if (eventType === ReconciliationEventType.MPS_DN) {
          item.quantityMps = Number(item.quantityMps) + entry.quantity;
        }

        await this.recalculateStatus(item);
        await this.itemRepo.save(item);

        return saved;
      }),
    );

    this.logger.log(`Recorded ${events.length} ${eventType} event(s) for job card ${jobCardId}`);

    return events;
  }

  async summary(companyId: number, jobCardId: number): Promise<ReconciliationSummary> {
    const items = await this.itemRepo.find({
      where: { companyId, jobCardId },
    });

    return items.reduce<ReconciliationSummary>(
      (acc, item) => ({
        totalItems: acc.totalItems + 1,
        totalOrdered: acc.totalOrdered + Number(item.quantityOrdered),
        totalReleased: acc.totalReleased + Number(item.quantityReleased),
        totalShipped: acc.totalShipped + Number(item.quantityShipped),
        totalMps: acc.totalMps + Number(item.quantityMps),
        pending: acc.pending + (item.reconciliationStatus === ReconciliationStatus.PENDING ? 1 : 0),
        partial: acc.partial + (item.reconciliationStatus === ReconciliationStatus.PARTIAL ? 1 : 0),
        complete:
          acc.complete + (item.reconciliationStatus === ReconciliationStatus.COMPLETE ? 1 : 0),
        discrepancy:
          acc.discrepancy +
          (item.reconciliationStatus === ReconciliationStatus.DISCREPANCY ? 1 : 0),
      }),
      {
        totalItems: 0,
        totalOrdered: 0,
        totalReleased: 0,
        totalShipped: 0,
        totalMps: 0,
        pending: 0,
        partial: 0,
        complete: 0,
        discrepancy: 0,
      },
    );
  }

  private async recalculateStatus(item: ReconciliationItem): Promise<void> {
    const ordered = Number(item.quantityOrdered);
    const released = Number(item.quantityReleased);
    const shipped = Number(item.quantityShipped);

    if (shipped > ordered || released > ordered) {
      item.reconciliationStatus = ReconciliationStatus.DISCREPANCY;
    } else if (shipped >= ordered && released >= ordered) {
      item.reconciliationStatus = ReconciliationStatus.COMPLETE;
    } else if (released > 0 || shipped > 0) {
      item.reconciliationStatus = ReconciliationStatus.PARTIAL;
    } else {
      item.reconciliationStatus = ReconciliationStatus.PENDING;
    }
  }

  private async findOrFail(companyId: number, id: number): Promise<ReconciliationItem> {
    const item = await this.itemRepo.findOne({ where: { id, companyId } });
    if (!item) {
      throw new NotFoundException(`Reconciliation item #${id} not found`);
    }
    return item;
  }
}
