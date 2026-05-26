import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import type { PumpOrderListResponseDto, PumpOrderSummaryDto } from "./dto/pump-order-response.dto";
import { PumpOrder, PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderRepository } from "./pump-order.repository";
import type { PumpOrderQueryParams } from "./pump-order.service";

@Injectable()
export class MongoPumpOrderRepository
  extends MongoCrudRepository<PumpOrder>
  implements PumpOrderRepository
{
  constructor(@InjectModel("PumpOrder") model: Model<PumpOrder>) {
    super(model);
  }

  async findAllPaged(params: PumpOrderQueryParams): Promise<PumpOrderListResponseDto> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (params.search) {
      const re = new RegExp(params.search, "i");
      query.$or = [{ orderNumber: re }, { customerCompany: re }, { customerReference: re }];
    }
    if (params.status) {
      query.status = params.status;
    }
    if (params.orderType) {
      query.orderType = params.orderType;
    }
    if (params.supplierId) {
      query.supplierId = params.supplierId;
    }
    if (params.fromDate) {
      query.createdAt = { ...((query.createdAt as object) || {}), $gte: new Date(params.fromDate) };
    }
    if (params.toDate) {
      query.createdAt = { ...((query.createdAt as object) || {}), $lte: new Date(params.toDate) };
    }

    const [documents, total] = await Promise.all([
      this.documents.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return {
      data: this.toDomainList(documents) as unknown as PumpOrderListResponseDto["data"],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByOrderNumber(orderNumber: string): Promise<PumpOrder | null> {
    const document = await this.documents.findOne({ orderNumber }).lean().exec();
    return this.toDomain(document);
  }

  async summary(): Promise<PumpOrderSummaryDto> {
    const [statusAgg, typeAgg, revenueAgg] = await Promise.all([
      this.documents.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).exec(),
      this.documents.aggregate([{ $group: { _id: "$orderType", count: { $sum: 1 } } }]).exec(),
      this.documents
        .aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              revenue: { $sum: "$totalAmount" },
            },
          },
        ])
        .exec(),
    ]);

    const byStatus = (statusAgg as { _id: PumpOrderStatus; count: number }[]).reduce(
      (acc, row) => {
        acc[row._id] = row.count;
        return acc;
      },
      {} as Record<PumpOrderStatus, number>,
    );

    const byType = (typeAgg as { _id: PumpOrderType; count: number }[]).reduce(
      (acc, row) => {
        acc[row._id] = row.count;
        return acc;
      },
      {} as Record<PumpOrderType, number>,
    );

    const revenueRow = revenueAgg[0] as { total: number; revenue: number } | undefined;
    const totalOrders = revenueRow?.total ?? 0;
    const totalRevenue = revenueRow?.revenue ?? 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalOrders, byStatus, byType, totalRevenue, averageOrderValue };
  }

  async updateTotals(
    id: number,
    totals: { subtotal: number; vatAmount: number; totalAmount: number },
  ): Promise<void> {
    await this.documents.findByIdAndUpdate(id, { $set: totals }, { new: true }).lean().exec();
  }
}
