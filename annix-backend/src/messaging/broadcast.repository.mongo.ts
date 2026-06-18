import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { now } from "../lib/datetime";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BroadcastPage, BroadcastRepository } from "./broadcast.repository";
import { BroadcastFilterDto } from "./dto";
import { Broadcast } from "./entities/broadcast.entity";

@Injectable()
export class MongoBroadcastRepository
  extends MongoCrudRepository<Broadcast>
  implements BroadcastRepository
{
  constructor(@InjectModel("Broadcast") model: Model<Broadcast>) {
    super(model);
  }

  async findPageForIds(
    ids: number[],
    filters: BroadcastFilterDto,
    skip: number,
    limit: number,
  ): Promise<BroadcastPage<Broadcast>> {
    const query: Record<string, unknown> = { _id: { $in: ids } };
    this.applyFilters(query, filters);

    const [rawDocs, total] = await Promise.all([
      this.documents.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { broadcasts: this.toDomainList(rawDocs), total };
  }

  async findBroadcastPage(
    filters: BroadcastFilterDto,
    skip: number,
    limit: number,
  ): Promise<BroadcastPage<Broadcast>> {
    const query: Record<string, unknown> = {};
    this.applyFilters(query, filters);

    const [rawDocs, total] = await Promise.all([
      this.documents.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { broadcasts: this.toDomainList(rawDocs), total };
  }

  private applyFilters(query: Record<string, unknown>, filters: BroadcastFilterDto): void {
    if (!filters.includeExpired) {
      query["$or"] = [{ expiresAt: null }, { expiresAt: { $gt: now().toJSDate() } }];
    }
    if (filters.priority) {
      query["priority"] = filters.priority;
    }
  }
}
