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
import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { BoqDistributionService } from "../boq/boq-distribution.service";
import { SupplierBoqStatus } from "../boq/entities/boq-supplier-access.entity";
import { now } from "../lib/datetime";
import { SupplierAuthGuard } from "./guards/supplier-auth.guard";

class DeclineBoqDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

class SetReminderDto {
  @IsOptional()
  reminderDays: number | null;
}

class SaveQuoteDto {
  @IsObject()
  pricingInputs: Record<string, any>;

  @IsObject()
  unitPrices: Record<string, Record<number, number>>;

  @IsObject()
  weldUnitPrices: Record<string, number>;
}

class SubmitQuoteDto {
  @IsObject()
  pricingInputs: Record<string, any>;

  @IsObject()
  unitPrices: Record<string, Record<number, number>>;

  @IsObject()
  weldUnitPrices: Record<string, number>;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags("Supplier BOQs")
@Controller("supplier/boqs")
@UseGuards(SupplierAuthGuard)
@ApiBearerAuth()
export class SupplierBoqController {
  constructor(private readonly distributionService: BoqDistributionService) {}

  @Get()
  @ApiOperation({ summary: "Get all BOQs assigned to the supplier" })
  @ApiQuery({ name: "status", required: false, enum: SupplierBoqStatus })
  @ApiResponse({
    status: 200,
    description: "List of BOQs assigned to supplier",
  })
  async getMyBoqs(@Request() req: any, @Query("status") status?: SupplierBoqStatus) {
    const supplierProfileId = req.supplier.supplierId;

    const boqs = await this.distributionService.getSupplierBoqs(supplierProfileId, status);

    return boqs.map(({ access, boq, sectionSummary }) => ({
      id: boq.id,
      boqNumber: boq.boqNumber,
      title: boq.title,
      status: access.status,
      projectInfo: access.projectInfo,
      customerInfo: access.customerInfo,
      sections: sectionSummary,
      viewedAt: access.viewedAt,
      respondedAt: access.respondedAt,
      notificationSentAt: access.notificationSentAt,
      createdAt: access.createdAt,
    }));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get filtered BOQ details (only allowed sections)" })
  @ApiResponse({
    status: 200,
    description: "Filtered BOQ details for supplier",
  })
  async getBoqDetails(@Request() req: any, @Param("id", ParseIntPipe) boqId: number) {
    const supplierProfileId = req.supplier.supplierId;

    const { boq, sections, access } = await this.distributionService.getFilteredBoqForSupplier(
      boqId,
      supplierProfileId,
    );

    // Auto-mark as viewed on first access
    if (!access.viewedAt) {
      await this.distributionService.markAsViewed(boqId, supplierProfileId);
    }

    return {
      boq: {
        id: boq.id,
        boqNumber: boq.boqNumber,
        title: boq.title,
        description: boq.description,
        status: boq.status,
      },
      projectInfo: access.projectInfo,
      customerInfo: access.customerInfo,
      accessStatus: access.status,
      viewedAt: access.viewedAt || now().toJSDate(),
      sections: sections.map((section) => ({
        id: section.id,
        sectionType: section.sectionType,
        sectionTitle: section.sectionTitle,
        items: section.items,
        totalWeightKg: section.totalWeightKg,
        itemCount: section.itemCount,
      })),
    };
  }

  @Post(":id/view")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark BOQ as viewed" })
  @ApiResponse({
    status: 200,
    description: "BOQ marked as viewed",
  })
  async markAsViewed(@Request() req: any, @Param("id", ParseIntPipe) boqId: number) {
    const supplierProfileId = req.supplier.supplierId;
    const access = await this.distributionService.markAsViewed(boqId, supplierProfileId);

    return {
      success: true,
      viewedAt: access.viewedAt,
      status: access.status,
    };
  }

  @Post(":id/decline")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Decline to quote on BOQ" })
  @ApiResponse({
    status: 200,
    description: "BOQ declined",
  })
  async declineBoq(
    @Request() req: any,
    @Param("id", ParseIntPipe) boqId: number,
    @Body() body: DeclineBoqDto,
  ) {
    const supplierProfileId = req.supplier.supplierId;
    const access = await this.distributionService.declineBoq(boqId, supplierProfileId, body.reason);

    return {
      success: true,
      status: access.status,
      respondedAt: access.respondedAt,
    };
  }

  @Post(":id/reminder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set email reminder for BOQ closing date" })
  @ApiResponse({
    status: 200,
    description: "Reminder set successfully",
  })
  async setReminder(
    @Request() req: any,
    @Param("id", ParseIntPipe) boqId: number,
    @Body() body: SetReminderDto,
  ) {
    const supplierProfileId = req.supplier.supplierId;
    const access = await this.distributionService.setReminder(
      boqId,
      supplierProfileId,
      body.reminderDays,
    );

    return {
      success: true,
      reminderDays: access.reminderDays,
    };
  }

  @Get(":id/rfq-items")
  @ApiOperation({ summary: "Get full RFQ item details for quoting" })
  @ApiResponse({
    status: 200,
    description: "Full RFQ items with detailed specifications",
  })
  async getRfqItems(@Request() req: any, @Param("id", ParseIntPipe) boqId: number) {
    const supplierProfileId = req.supplier.supplierId;
    const items = await this.distributionService.getRfqItemsForBoq(boqId, supplierProfileId);

    return items.map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber,
      itemType: item.itemType,
      description: item.description,
      quantity: item.quantity,
      totalWeightKg: item.totalWeightKg,
      weightPerUnitKg: item.weightPerUnitKg,
      notes: item.notes,
      straightPipeDetails: item.straightPipeDetails,
      bendDetails: item.bendDetails,
      fittingDetails: item.fittingDetails,
      flangeStandardCode: item.flangeStandardCode,
      flangePressureClassDesignation: item.flangePressureClassDesignation,
    }));
  }

  @Post(":id/quote/save")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save quote progress" })
  @ApiResponse({
    status: 200,
    description: "Quote progress saved",
  })
  async saveQuoteProgress(
    @Request() req: any,
    @Param("id", ParseIntPipe) boqId: number,
    @Body() body: SaveQuoteDto,
  ) {
    const supplierProfileId = req.supplier.supplierId;
    const access = await this.distributionService.saveQuoteProgress(boqId, supplierProfileId, body);

    return {
      success: true,
      savedAt: access.quoteSavedAt,
    };
  }

  @Post(":id/quote/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit quote for BOQ" })
  @ApiResponse({
    status: 200,
    description: "Quote submitted",
  })
  async submitQuote(
    @Request() req: any,
    @Param("id", ParseIntPipe) boqId: number,
    @Body() body: SubmitQuoteDto,
  ) {
    const supplierProfileId = req.supplier.supplierId;
    const access = await this.distributionService.submitQuote(boqId, supplierProfileId, body);

    return {
      success: true,
      status: access.status,
      submittedAt: access.quoteSubmittedAt,
    };
  }
}
