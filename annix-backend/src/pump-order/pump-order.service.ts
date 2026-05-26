import { Injectable, NotFoundException } from "@nestjs/common";
import { now, nowISO, nowMillis } from "../lib/datetime";
import { CreatePumpOrderDto, CreatePumpOrderItemDto } from "./dto/create-pump-order.dto";
import {
  PumpOrderListResponseDto,
  PumpOrderResponseDto,
  PumpOrderSummaryDto,
} from "./dto/pump-order-response.dto";
import { UpdatePumpOrderDto, UpdatePumpOrderItemDto } from "./dto/update-pump-order.dto";
import { PumpOrder, PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderItem } from "./entities/pump-order-item.entity";
import { PumpOrderRepository } from "./pump-order.repository";
import { PumpOrderItemRepository } from "./pump-order-item.repository";

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
    private readonly orderRepository: PumpOrderRepository,
    private readonly orderItemRepository: PumpOrderItemRepository,
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
    const savedOrder = await this.orderRepository.create({
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
        ? new Date(createDto.requestedDeliveryDate)
        : null,
      supplierId: createDto.supplierId ?? null,
      currency: createDto.currency ?? "ZAR",
      specialInstructions: createDto.specialInstructions ?? null,
      internalNotes: createDto.internalNotes ?? null,
      createdBy: createDto.createdBy ?? null,
      statusHistory: [],
    });

    const itemDtos = createDto.items.map((itemDto) => {
      const lineTotal = this.calculateLineTotal(itemDto);
      return {
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
      };
    });

    const savedItems = await this.orderItemRepository.saveMany(itemDtos);
    const totals = this.calculateOrderTotals(savedItems);

    await this.orderRepository.updateTotals(savedOrder.id, totals);

    return this.findOne(savedOrder.id);
  }

  findAll(params: PumpOrderQueryParams): Promise<PumpOrderListResponseDto> {
    return this.orderRepository.findAllPaged(params);
  }

  async findOne(id: number): Promise<PumpOrderResponseDto> {
    const order = await this.orderRepository.findById(id, ["items"]);

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return this.toResponseDto(order);
  }

  async findByOrderNumber(orderNumber: string): Promise<PumpOrderResponseDto> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);

    if (!order) {
      throw new NotFoundException(`Order with number ${orderNumber} not found`);
    }

    return this.toResponseDto(order);
  }

  async update(id: number, updateDto: UpdatePumpOrderDto): Promise<PumpOrderResponseDto> {
    const order = await this.orderRepository.findById(id, ["items"]);

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
      ...(updateDto.orderType !== undefined && { orderType: updateDto.orderType }),
      ...(updateDto.rfqId !== undefined && { rfqId: updateDto.rfqId }),
      ...(updateDto.customerCompany !== undefined && {
        customerCompany: updateDto.customerCompany,
      }),
      ...(updateDto.customerContact !== undefined && {
        customerContact: updateDto.customerContact,
      }),
      ...(updateDto.customerEmail !== undefined && { customerEmail: updateDto.customerEmail }),
      ...(updateDto.customerPhone !== undefined && { customerPhone: updateDto.customerPhone }),
      ...(updateDto.deliveryAddress !== undefined && {
        deliveryAddress: updateDto.deliveryAddress,
      }),
      ...(updateDto.requestedDeliveryDate !== undefined && {
        requestedDeliveryDate: updateDto.requestedDeliveryDate
          ? new Date(updateDto.requestedDeliveryDate)
          : null,
      }),
      ...(updateDto.confirmedDeliveryDate !== undefined && {
        confirmedDeliveryDate: updateDto.confirmedDeliveryDate
          ? new Date(updateDto.confirmedDeliveryDate)
          : null,
      }),
      ...(updateDto.supplierId !== undefined && { supplierId: updateDto.supplierId }),
      ...(updateDto.currency !== undefined && { currency: updateDto.currency }),
      ...(updateDto.specialInstructions !== undefined && {
        specialInstructions: updateDto.specialInstructions,
      }),
      ...(updateDto.internalNotes !== undefined && { internalNotes: updateDto.internalNotes }),
      ...(updateDto.updatedBy !== undefined && { updatedBy: updateDto.updatedBy }),
    });

    if (updateDto.items) {
      await this.orderItemRepository.deleteByOrderId(id);

      const itemDtos = updateDto.items.map((itemDto) => {
        const lineTotal = this.calculateLineTotal(itemDto as CreatePumpOrderItemDto);
        return {
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
        };
      });

      const savedItems = await this.orderItemRepository.saveMany(itemDtos);
      const totals = this.calculateOrderTotals(savedItems);
      Object.assign(order, totals);
    }

    await this.orderRepository.save(order);

    return this.findOne(id);
  }

  updateStatus(
    id: number,
    status: PumpOrderStatus,
    updatedBy?: string,
    notes?: string,
  ): Promise<PumpOrderResponseDto> {
    return this.update(id, { status, updatedBy, statusChangeNotes: notes });
  }

  async remove(id: number): Promise<void> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    await this.orderRepository.remove(order);
  }

  summary(): Promise<PumpOrderSummaryDto> {
    return this.orderRepository.summary();
  }
}
