import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { Repository } from "typeorm";
import { now } from "../lib/datetime";
import { PumpRfq } from "../rfq/entities/pump-rfq.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqItem } from "../rfq/entities/rfq-item.entity";
import { SupplierAuthGuard, SupplierRequest } from "./guards/supplier-auth.guard";

export type SupplierPumpQuoteStatus = "pending" | "viewed" | "quoted" | "declined" | "expired";

class DeclinePumpQuoteDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

class SubmitPumpQuoteDto {
  @IsNumber()
  unitPrice: number;

  @IsNumber()
  totalPrice: number;

  @IsOptional()
  @IsNumber()
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  breakdown?: Record<string, number>;
}

interface PumpQuoteRequest {
  id: number;
  rfqNumber: string;
  projectName: string;
  customerName: string | null;
  pumpType: string;
  flowRate: number | null;
  totalHead: number | null;
  quantity: number;
  status: SupplierPumpQuoteStatus;
  requiredDate: Date | null;
  createdAt: Date;
  viewedAt: Date | null;
  quotedAt: Date | null;
}

@ApiTags("Supplier Pump Quotes")
@Controller("supplier/pump-quotes")
@UseGuards(SupplierAuthGuard)
@ApiBearerAuth()
export class SupplierPumpQuoteController {
  constructor(
    @InjectRepository(Rfq)
    private readonly rfqRepository: Repository<Rfq>,
    @InjectRepository(RfqItem)
    private readonly rfqItemRepository: Repository<RfqItem>,
    @InjectRepository(PumpRfq)
    private readonly pumpRfqRepository: Repository<PumpRfq>,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all pump quote requests assigned to the supplier" })
  @ApiQuery({ name: "status", required: false })
  @ApiResponse({
    status: 200,
    description: "List of pump quote requests assigned to supplier",
  })
  async getMyPumpQuotes(
    @Request() req: SupplierRequest,
    @Query("status") status?: SupplierPumpQuoteStatus,
  ): Promise<PumpQuoteRequest[]> {
    const supplierProfileId = req.supplier.supplierId;

    const queryBuilder = this.rfqRepository
      .createQueryBuilder("rfq")
      .leftJoinAndSelect("rfq.items", "item")
      .leftJoinAndSelect("item.pumpDetails", "pump")
      .leftJoinAndSelect("rfq.supplierAssignments", "assignment")
      .where("assignment.supplierId = :supplierId", { supplierId: supplierProfileId })
      .andWhere("item.itemType = :itemType", { itemType: "pump" })
      .orderBy("rfq.createdAt", "DESC");

    if (status) {
      queryBuilder.andWhere("assignment.status = :status", { status });
    }

    const rfqs = await queryBuilder.getMany();

    return rfqs.map((rfq) => {
      const pumpItem = rfq.items.find((item) => item.itemType === "pump");
      const pumpDetails = pumpItem?.pumpDetails;
      const assignment = (rfq as any).supplierAssignments?.[0];

      return {
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        projectName: rfq.projectName,
        customerName: rfq.customerName ?? null,
        pumpType: pumpDetails?.pumpType ?? "Unknown",
        flowRate: pumpDetails?.flowRate ?? null,
        totalHead: pumpDetails?.totalHead ?? null,
        quantity: pumpItem?.quantity ?? 1,
        status: assignment?.status ?? "pending",
        requiredDate: rfq.requiredDate ?? null,
        createdAt: rfq.createdAt,
        viewedAt: assignment?.viewedAt ?? null,
        quotedAt: assignment?.quotedAt ?? null,
      };
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get pump quote request details" })
  @ApiResponse({
    status: 200,
    description: "Pump quote request details",
  })
  async getPumpQuoteDetails(
    @Request() req: SupplierRequest,
    @Param("id", ParseIntPipe) rfqId: number,
  ) {
    const supplierProfileId = req.supplier.supplierId;

    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["items", "items.pumpDetails", "supplierAssignments"],
    });

    if (!rfq) {
      return { error: "RFQ not found" };
    }

    const pumpItem = rfq.items.find((item) => item.itemType === "pump");
    const pumpDetails = pumpItem?.pumpDetails;

    const assignment = (rfq as any).supplierAssignments?.find(
      (a: any) => a.supplierId === supplierProfileId,
    );

    if (assignment && !assignment.viewedAt) {
      assignment.viewedAt = now().toJSDate();
      assignment.status = "viewed";
      await this.rfqRepository.save(rfq);
    }

    return {
      rfq: {
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        projectName: rfq.projectName,
        description: rfq.description,
        status: rfq.status,
        requiredDate: rfq.requiredDate,
        notes: rfq.notes,
      },
      customer: {
        name: rfq.customerName ?? "Unknown",
        email: rfq.customerEmail ?? "",
        phone: rfq.customerPhone,
        company: null,
      },
      pump: pumpDetails
        ? {
            serviceType: pumpDetails.serviceType,
            pumpType: pumpDetails.pumpType,
            pumpCategory: pumpDetails.pumpCategory,
            flowRate: pumpDetails.flowRate,
            totalHead: pumpDetails.totalHead,
            npshAvailable: pumpDetails.npshAvailable,
            operatingTemp: pumpDetails.operatingTemp,
            fluidType: pumpDetails.fluidType,
            specificGravity: pumpDetails.specificGravity,
            viscosity: pumpDetails.viscosity,
            casingMaterial: pumpDetails.casingMaterial,
            impellerMaterial: pumpDetails.impellerMaterial,
            shaftMaterial: pumpDetails.shaftMaterial,
            sealType: pumpDetails.sealType,
            motorType: pumpDetails.motorType,
            voltage: pumpDetails.voltage,
            frequency: pumpDetails.frequency,
            quantity: pumpDetails.quantityValue,
            existingPumpModel: pumpDetails.existingPumpModel,
            existingPumpSerial: pumpDetails.existingPumpSerial,
            spareParts: pumpDetails.spareParts,
            rentalDurationDays: pumpDetails.rentalDurationDays,
          }
        : null,
      item: pumpItem
        ? {
            id: pumpItem.id,
            description: pumpItem.description,
            quantity: pumpItem.quantity,
            notes: pumpItem.notes,
          }
        : null,
      accessStatus: assignment?.status ?? "pending",
      viewedAt: assignment?.viewedAt ?? now().toJSDate(),
    };
  }

  @Post(":id/view")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark pump quote request as viewed" })
  @ApiResponse({
    status: 200,
    description: "Quote request marked as viewed",
  })
  async markAsViewed(@Request() req: SupplierRequest, @Param("id", ParseIntPipe) rfqId: number) {
    const supplierProfileId = req.supplier.supplierId;

    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["supplierAssignments"],
    });

    if (!rfq) {
      return { error: "RFQ not found" };
    }

    const assignment = (rfq as any).supplierAssignments?.find(
      (a: any) => a.supplierId === supplierProfileId,
    );

    if (assignment && !assignment.viewedAt) {
      assignment.viewedAt = now().toJSDate();
      assignment.status = "viewed";
      await this.rfqRepository.save(rfq);
    }

    return {
      success: true,
      viewedAt: assignment?.viewedAt ?? now().toJSDate(),
      status: assignment?.status ?? "viewed",
    };
  }

  @Post(":id/decline")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Decline pump quote request" })
  @ApiResponse({
    status: 200,
    description: "Quote request declined",
  })
  async declineQuote(
    @Request() req: SupplierRequest,
    @Param("id", ParseIntPipe) rfqId: number,
    @Body() body: DeclinePumpQuoteDto,
  ) {
    const supplierProfileId = req.supplier.supplierId;

    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["supplierAssignments"],
    });

    if (!rfq) {
      return { error: "RFQ not found" };
    }

    const assignment = (rfq as any).supplierAssignments?.find(
      (a: any) => a.supplierId === supplierProfileId,
    );

    if (assignment) {
      assignment.status = "declined";
      assignment.declineReason = body.reason;
      assignment.respondedAt = now().toJSDate();
      await this.rfqRepository.save(rfq);
    }

    return {
      success: true,
      status: "declined",
      respondedAt: now().toJSDate(),
    };
  }

  @Post(":id/quote")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit quote for pump request" })
  @ApiResponse({
    status: 200,
    description: "Quote submitted successfully",
  })
  async submitQuote(
    @Request() req: SupplierRequest,
    @Param("id", ParseIntPipe) rfqId: number,
    @Body() body: SubmitPumpQuoteDto,
  ) {
    const supplierProfileId = req.supplier.supplierId;

    const rfq = await this.rfqRepository.findOne({
      where: { id: rfqId },
      relations: ["supplierAssignments"],
    });

    if (!rfq) {
      return { error: "RFQ not found" };
    }

    const assignment = (rfq as any).supplierAssignments?.find(
      (a: any) => a.supplierId === supplierProfileId,
    );

    if (assignment) {
      assignment.status = "quoted";
      assignment.quotedAt = now().toJSDate();
      assignment.respondedAt = now().toJSDate();
      assignment.quoteData = {
        unitPrice: body.unitPrice,
        totalPrice: body.totalPrice,
        leadTimeDays: body.leadTimeDays,
        notes: body.notes,
        breakdown: body.breakdown,
      };
      await this.rfqRepository.save(rfq);
    }

    return {
      success: true,
      status: "quoted",
      quotedAt: now().toJSDate(),
    };
  }

  @Get("products/catalog")
  @ApiOperation({ summary: "Get available pump products for quoting" })
  @ApiResponse({
    status: 200,
    description: "List of pump products from catalog",
  })
  async getPumpCatalog(@Request() req: SupplierRequest) {
    return [];
  }
}
