import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import type { PumpOrderListResponseDto, PumpOrderSummaryDto } from "./dto/pump-order-response.dto";
import { PumpOrder, PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderRepository } from "./pump-order.repository";
import type { PumpOrderQueryParams } from "./pump-order.service";

@Injectable()
export class PostgresPumpOrderRepository
  extends TypeOrmCrudRepository<PumpOrder>
  implements PumpOrderRepository
{
  constructor(@InjectRepository(PumpOrder) repository: Repository<PumpOrder>) {
    super(repository);
  }

  async findAllPaged(params: PumpOrderQueryParams): Promise<PumpOrderListResponseDto> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.items", "items")
      .orderBy("order.createdAt", "DESC");

    if (params.search) {
      queryBuilder.andWhere(
        "(order.orderNumber ILIKE :search OR order.customerCompany ILIKE :search OR order.customerReference ILIKE :search)",
        { search: `%${params.search}%` },
      );
    }

    if (params.status) {
      queryBuilder.andWhere("order.status = :status", { status: params.status });
    }

    if (params.orderType) {
      queryBuilder.andWhere("order.orderType = :orderType", { orderType: params.orderType });
    }

    if (params.supplierId) {
      queryBuilder.andWhere("order.supplierId = :supplierId", { supplierId: params.supplierId });
    }

    if (params.fromDate) {
      queryBuilder.andWhere("order.createdAt >= :fromDate", { fromDate: params.fromDate });
    }

    if (params.toDate) {
      queryBuilder.andWhere("order.createdAt <= :toDate", { toDate: params.toDate });
    }

    const [orders, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      data: orders as unknown as PumpOrderListResponseDto["data"],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findByOrderNumber(orderNumber: string): Promise<PumpOrder | null> {
    return this.repository.findOne({ where: { orderNumber }, relations: ["items"] });
  }

  async summary(): Promise<PumpOrderSummaryDto> {
    const statusCounts = await this.repository
      .createQueryBuilder("o")
      .select("o.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("o.status")
      .getRawMany<{ status: PumpOrderStatus; count: string }>();

    const typeCounts = await this.repository
      .createQueryBuilder("o")
      .select("o.order_type", "orderType")
      .addSelect("COUNT(*)", "count")
      .groupBy("o.order_type")
      .getRawMany<{ orderType: PumpOrderType; count: string }>();

    const revenueResult = await this.repository
      .createQueryBuilder("o")
      .select("COUNT(*)", "total")
      .addSelect("COALESCE(SUM(o.total_amount), 0)", "revenue")
      .getRawOne<{ total: string; revenue: string }>();

    const byStatus = statusCounts.reduce(
      (acc, row) => {
        acc[row.status] = Number(row.count);
        return acc;
      },
      {} as Record<PumpOrderStatus, number>,
    );

    const byType = typeCounts.reduce(
      (acc, row) => {
        acc[row.orderType] = Number(row.count);
        return acc;
      },
      {} as Record<PumpOrderType, number>,
    );

    const totalOrders = Number(revenueResult?.total || 0);
    const totalRevenue = Number(revenueResult?.revenue || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalOrders, byStatus, byType, totalRevenue, averageOrderValue };
  }

  async updateTotals(
    id: number,
    totals: { subtotal: number; vatAmount: number; totalAmount: number },
  ): Promise<void> {
    await this.repository.update(id, totals);
  }
}
