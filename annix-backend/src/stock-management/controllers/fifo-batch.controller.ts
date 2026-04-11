import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import type {
  StockPurchaseBatchSourceType,
  StockPurchaseBatchStatus,
} from "../entities/stock-purchase-batch.entity";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import { FifoBatchService } from "../services/fifo-batch.service";
import { FifoBootstrapService } from "../services/fifo-bootstrap.service";

interface CreateBatchBody {
  productId: number;
  sourceType: StockPurchaseBatchSourceType;
  sourceRefId?: number | null;
  supplierName?: string | null;
  supplierBatchRef?: string | null;
  quantityPurchased: number;
  costPerUnit: number;
  receivedAt?: string | null;
  notes?: string | null;
}

interface BootstrapBody {
  dryRun?: boolean;
}

@ApiTags("stock-management/fifo-batches")
@Controller("stock-management/fifo-batches")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class FifoBatchController {
  constructor(
    private readonly fifoBatchService: FifoBatchService,
    private readonly fifoBootstrapService: FifoBootstrapService,
  ) {}

  @Get("by-product/:productId")
  @StockManagementFeature("FIFO_BATCH_TRACKING")
  @ApiOperation({ summary: "List FIFO purchase batches for a product" })
  async batchesForProduct(
    @Req() req: any,
    @Param("productId", ParseIntPipe) productId: number,
    @Query("status") status?: StockPurchaseBatchStatus,
  ) {
    return this.fifoBatchService.batchesForProduct(Number(req.user.companyId), productId, status);
  }

  @Get("valuation/by-product/:productId")
  @StockManagementFeature("FIFO_BATCH_TRACKING")
  @ApiOperation({ summary: "Compute FIFO valuation for a single product" })
  async productValuation(@Req() req: any, @Param("productId", ParseIntPipe) productId: number) {
    return this.fifoBatchService.valuationForProduct(Number(req.user.companyId), productId);
  }

  @Get("valuation/company")
  @StockManagementFeature("FIFO_BATCH_TRACKING")
  @ApiOperation({ summary: "Compute total FIFO valuation for the calling company" })
  async companyValuation(@Req() req: any) {
    return this.fifoBatchService.valuationForCompany(Number(req.user.companyId));
  }

  @Get("consumption-history/:productId")
  @StockManagementFeature("FIFO_BATCH_TRACKING")
  @ApiOperation({ summary: "List recent FIFO consumption events for a product" })
  async consumptionHistory(
    @Req() req: any,
    @Param("productId", ParseIntPipe) productId: number,
    @Query("limit") limit?: string,
  ) {
    return this.fifoBatchService.consumptionHistory(
      Number(req.user.companyId),
      productId,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @StockManagementFeature("FIFO_BATCH_TRACKING")
  @ApiOperation({ summary: "Create a new FIFO purchase batch (e.g. from a manual adjustment)" })
  async createBatch(@Req() req: any, @Body() body: CreateBatchBody) {
    return this.fifoBatchService.createBatch(Number(req.user.companyId), {
      productId: body.productId,
      sourceType: body.sourceType,
      sourceRefId: body.sourceRefId ?? null,
      supplierName: body.supplierName ?? null,
      supplierBatchRef: body.supplierBatchRef ?? null,
      quantityPurchased: body.quantityPurchased,
      costPerUnit: body.costPerUnit,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined,
      createdByStaffId: req.user.linkedStaffId ?? null,
      notes: body.notes ?? null,
    });
  }

  @Post("bootstrap-legacy")
  @StockManagementFeature("FIFO_BATCH_TRACKING")
  @ApiOperation({
    summary:
      "Bootstrap legacy batches for every product with current quantity > 0 that has no legacy batch",
  })
  async bootstrap(@Req() req: any, @Body() body: BootstrapBody) {
    return this.fifoBootstrapService.bootstrapCompany(
      Number(req.user.companyId),
      body.dryRun ?? false,
    );
  }
}
