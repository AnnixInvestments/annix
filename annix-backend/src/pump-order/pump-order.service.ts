import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now, nowISO, nowMillis, toJSDate } from "../lib/datetime";
import { CreatePumpOrderDto, CreatePumpOrderItemDto } from "./dto/create-pump-order.dto";
import {
  PumpOrderListResponseDto,
  PumpOrderResponseDto,
  PumpOrderSummaryDto,
} from "./dto/pump-order-response.dto";
import { UpdatePumpOrderDto, UpdatePumpOrderItemDto } from "./dto/update-pump-order.dto";
import { PumpOrder, PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderItem } from "./entities/pump-order-item.entity";

export interface PumpOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PumpOrderStatus;
  orderType?: PumpOrderType;
  supplierId?: number;
  fromDate?: string;
  toDate?: string;
}

const VAT_RATE = 0.15;

@Injectable()
export class PumpOrderService {
  constructor(
    @InjectRepository(PumpOrder)
    private readonly orderRepository: Repository<PumpOrder>,
    @InjectRepository(PumpOrderItem)
    private readonly orderItemRepository: Repository<PumpOrderItem>,
  ) {}

  private generateOrderNumber(): string {
    const year = now().year;
    const timestamp = nowMillis().toString(36).toUpperCase();
    return `PO-${year}-${timestamp}`;
  }

  private calculateLineTotal(item: CreatePumpOrderItemDto | UpdatePumpOrderItemDto): number {
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unitPrice ?? 0;
    const discount = item.discountPercent ?? 0;
    return quantity * unitPrice * (1 - discount / 100);
  }

  private calculateOrderTotals(items: PumpOrderItem[]): {
    subtotal: number;
    vatAmount: number;
    totalAmount: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const vatAmount = subtotal * VAT_RATE;
    const totalAmount = subtotal + vatAmount;
    return { subtotal, vatAmount, totalAmount };
  }

  private toResponseDto(order: PumpOrder): PumpOrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerReference: order.customerReference,
      status: order.status,
      orderType: order.orderType,
      rfqId: order.rfqId,
      customerCompany: order.customerCompany,
      customerContact: order.customerContact,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      requestedDeliveryDate: order.requestedDeliveryDate,
      confirmedDeliveryDate: order.confirmedDeliveryDate,
      supplierId: order.supplierId,
      items:
        order.items?.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          itemType: item.itemType,
          description: item.description,
          pumpType: item.pumpType,
          manufacturer: item.manufacturer,
          modelNumber: item.modelNumber,
          partNumber: item.partNumber,
          flowRate: item.flowRate ? Number(item.flowRate) : null,
          head: item.head ? Number(item.head) : null,
          motorPowerKw: item.motorPowerKw ? Number(item.motorPowerKw) : null,
          casingMaterial: item.casingMaterial,
          impellerMaterial: item.impellerMaterial,
          sealType: item.sealType,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          discountPercent: Number(item.discountPercent),
          lineTotal: Number(item.lineTotal),
          leadTimeDays: item.leadTimeDays,
          notes: item.notes,
          specifications: item.specifications,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })) ?? [],
      subtotal: Number(order.subtotal),
      vatAmount: Number(order.vatAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      specialInstructions: order.specialInstructions,
      internalNotes: order.internalNotes,
      statusHistory: order.statusHistory,
      createdBy: order.createdBy,
      updatedBy: order.updatedBy,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async create(createDto: CreatePumpOrderDto): Promise<PumpOrderResponseDto> {
    const order = this.orderRepository.create({
      orderNumber: this.generateOrderNumber(),
      customerReference: createDto.customerReference ?? null,
      orderType: createDto.orderType,
      rfqId: createDto.rfqId ?? null,
      customerCompany: createDto.customerCompany ?? null,
      customerContact: createDto.customerContact ?? null,
      customerEmail: createDto.customerEmail ?? null,
      customerPhone: createDto.customerPhone ?? null,
      deliveryAddress: createDto.deliveryAddress ?? null,
      requestedDeliveryDate: createDto.requestedDeliveryDate
        ? toJSDate(createDto.requestedDeliveryDate)
        : null,
      supplierId: createDto.supplierId ?? null,
      currency: createDto.currency ?? "ZAR",
      specialInstructions: createDto.specialInstructions ?? null,
      internalNotes: createDto.internalNotes ?? null,
      createdBy: createDto.createdBy ?? null,
      statusHistory: [],
    });

    const savedOrder = await this.orderRepository.save(order);

    const items = createDto.items.map((itemDto) => {
      const lineTotal = this.calculateLineTotal(itemDto);
      return this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: itemDto.productId ?? null,
        itemType: itemDto.itemType,
        description: itemDto.description,
        pumpType: itemDto.pumpType ?? null,
        manufacturer: itemDto.manufacturer ?? null,
        modelNumber: itemDto.modelNumber ?? null,
        partNumber: itemDto.partNumber ?? null,
        flowRate: itemDto.flowRate ?? null,
        head: itemDto.head ?? null,
        motorPowerKw: itemDto.motorPowerKw ?? null,
        casingMaterial: itemDto.casingMaterial ?? null,
        impellerMaterial: itemDto.impellerMaterial ?? null,
        sealType: itemDto.sealType ?? null,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        discountPercent: itemDto.discountPercent ?? 0,
        lineTotal,
        leadTimeDays: itemDto.leadTimeDays ?? null,
        notes: itemDto.notes ?? null,
        specifications: itemDto.specifications ?? null,
      });
    });

    const savedItems = await this.orderItemRepository.save(items);
    const totals = this.calculateOrderTotals(savedItems);

    await this.orderRepository.update(savedOrder.id, totals);

    return this.findOne(savedOrder.id);
  }

  async findAll(params: PumpOrderQueryParams): Promise<PumpOrderListResponseDto> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
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
      queryBuilder.andWhere("order.status = :status", {
        status: params.status,
      });
    }

    if (params.orderType) {
      queryBuilder.andWhere("order.orderType = :orderType", {
        orderType: params.orderType,
      });
    }

    if (params.supplierId) {
      queryBuilder.andWhere("order.supplierId = :supplierId", {
        supplierId: params.supplierId,
      });
    }

    if (params.fromDate) {
      queryBuilder.andWhere("order.createdAt >= :fromDate", {
        fromDate: params.fromDate,
      });
    }

    if (params.toDate) {
      queryBuilder.andWhere("order.createdAt <= :toDate", {
        toDate: params.toDate,
      });
    }

    const [orders, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      data: orders.map((order) => this.toResponseDto(order)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<PumpOrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return this.toResponseDto(order);
  }

  async findByOrderNumber(orderNumber: string): Promise<PumpOrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: ["items"],
    });

    if (!order) {
      throw new NotFoundException(`Order with number ${orderNumber} not found`);
    }

    return this.toResponseDto(order);
  }

  async update(id: number, updateDto: UpdatePumpOrderDto): Promise<PumpOrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ["items"],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (updateDto.status && updateDto.status !== order.status) {
      const historyEvent = {
        timestamp: nowISO(),
        fromStatus: order.status,
        toStatus: updateDto.status,
        changedBy: updateDto.updatedBy ?? null,
        notes: updateDto.statusChangeNotes ?? null,
      };
      order.statusHistory.push(historyEvent);
    }

    Object.assign(order, {
      ...(updateDto.customerReference !== undefined && {
        customerReference: updateDto.customerReference,
      }),
      ...(updateDto.status !== undefined && { status: updateDto.status }),
      ...(updateDto.orderType !== undefined && {
        orderType: updateDto.orderType,
      }),
      ...(updateDto.rfqId !== undefined && { rfqId: updateDto.rfqId }),
      ...(updateDto.customerCompany !== undefined && {
        customerCompany: updateDto.customerCompany,
      }),
      ...(updateDto.customerContact !== undefined && {
        customerContact: updateDto.customerContact,
      }),
      ...(updateDto.customerEmail !== undefined && {
        customerEmail: updateDto.customerEmail,
      }),
      ...(updateDto.customerPhone !== undefined && {
        customerPhone: updateDto.customerPhone,
      }),
      ...(updateDto.deliveryAddress !== undefined && {
        deliveryAddress: updateDto.deliveryAddress,
      }),
      ...(updateDto.requestedDeliveryDate !== undefined && {
        requestedDeliveryDate: updateDto.requestedDeliveryDate
          ? toJSDate(updateDto.requestedDeliveryDate)
          : null,
      }),
      ...(updateDto.confirmedDeliveryDate !== undefined && {
        confirmedDeliveryDate: updateDto.confirmedDeliveryDate
          ? toJSDate(updateDto.confirmedDeliveryDate)
          : null,
      }),
      ...(updateDto.supplierId !== undefined && {
        supplierId: updateDto.supplierId,
      }),
      ...(updateDto.currency !== undefined && { currency: updateDto.currency }),
      ...(updateDto.specialInstructions !== undefined && {
        specialInstructions: updateDto.specialInstructions,
      }),
      ...(updateDto.internalNotes !== undefined && {
        internalNotes: updateDto.internalNotes,
      }),
      ...(updateDto.updatedBy !== undefined && {
        updatedBy: updateDto.updatedBy,
      }),
    });

    if (updateDto.items) {
      await this.orderItemRepository.delete({ orderId: id });

      const items = updateDto.items.map((itemDto) => {
        const lineTotal = this.calculateLineTotal(itemDto as CreatePumpOrderItemDto);
        return this.orderItemRepository.create({
          orderId: id,
          productId: itemDto.productId ?? null,
          itemType: itemDto.itemType,
          description: itemDto.description,
          pumpType: itemDto.pumpType ?? null,
          manufacturer: itemDto.manufacturer ?? null,
          modelNumber: itemDto.modelNumber ?? null,
          partNumber: itemDto.partNumber ?? null,
          flowRate: itemDto.flowRate ?? null,
          head: itemDto.head ?? null,
          motorPowerKw: itemDto.motorPowerKw ?? null,
          casingMaterial: itemDto.casingMaterial ?? null,
          impellerMaterial: itemDto.impellerMaterial ?? null,
          sealType: itemDto.sealType ?? null,
          quantity: itemDto.quantity ?? 1,
          unitPrice: itemDto.unitPrice ?? 0,
          discountPercent: itemDto.discountPercent ?? 0,
          lineTotal,
          leadTimeDays: itemDto.leadTimeDays ?? null,
          notes: itemDto.notes ?? null,
          specifications: itemDto.specifications ?? null,
        });
      });

      const savedItems = await this.orderItemRepository.save(items);
      const totals = this.calculateOrderTotals(savedItems);
      Object.assign(order, totals);
    }

    await this.orderRepository.save(order);

    return this.findOne(id);
  }

  async updateStatus(
    id: number,
    status: PumpOrderStatus,
    updatedBy?: string,
    notes?: string,
  ): Promise<PumpOrderResponseDto> {
    return this.update(id, { status, updatedBy, statusChangeNotes: notes });
  }

  async remove(id: number): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    await this.orderRepository.remove(order);
  }

  async summary(): Promise<PumpOrderSummaryDto> {
    const orders = await this.orderRepository.find();

    const byStatus = orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<PumpOrderStatus, number>,
    );

    const byType = orders.reduce(
      (acc, order) => {
        acc[order.orderType] = (acc[order.orderType] ?? 0) + 1;
        return acc;
      },
      {} as Record<PumpOrderType, number>,
    );

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      totalOrders: orders.length,
      byStatus,
      byType,
      totalRevenue,
      averageOrderValue,
    };
  }
}
