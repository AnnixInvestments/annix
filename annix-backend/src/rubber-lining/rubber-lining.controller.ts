import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Response } from "express";
import { Repository } from "typeorm";
import { AdminAuthGuard, AdminRequest } from "../admin/guards/admin-auth.guard";
import { Public } from "../auth/public.decorator";
import { nowISO, nowMillis } from "../lib/datetime";
import { PaginatedResult } from "../lib/dto/pagination-query.dto";
import { SageExportFilterDto } from "../sage-export/dto/sage-export.dto";
import { type SageConfigDto, SageConnectionService } from "../sage-export/sage-connection.service";
import { SageExportService } from "../sage-export/sage-export.service";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import {
  CreateAuCocDto,
  CreateDeliveryNoteDto,
  CreateOpeningStockDto,
  CreateRollStockDto,
  CreateSupplierCocDto,
  ImportOpeningStockResultDto,
  ImportOpeningStockRowDto,
  ReserveRollDto,
  ReviewExtractionDto,
  RollTraceabilityDto,
  RubberAuCocDto,
  RubberDeliveryNoteDto,
  RubberRollStockDto,
  RubberSupplierCocDto,
  SaveExtractedDataCorrectionDto,
  SellRollDto,
  SendAuCocDto,
  UpdateDeliveryNoteDto,
  UpdateRollStockDto,
  UpdateSupplierCocDto,
} from "./dto/rubber-coc.dto";
import {
  AdjustCompoundDto,
  AdjustOtherStockDto,
  CalculateCompoundDto,
  CompoundCalculationResultDto,
  CreateCompoundOpeningStockDto,
  CreateOtherStockDto,
  CreateRubberCompanyDto,
  CreateRubberCompoundOrderDto,
  CreateRubberCompoundStockDto,
  CreateRubberOrderDto,
  CreateRubberPricingTierDto,
  CreateRubberProductCodingDto,
  CreateRubberProductDto,
  CreateRubberProductionDto,
  ImportCompoundOpeningStockResultDto,
  ImportCompoundOpeningStockRowDto,
  ImportOtherStockResultDto,
  ImportOtherStockRowDto,
  ImportProductsRequestDto,
  ImportProductsResultDto,
  ReceiveCompoundDto,
  ReceiveCompoundOrderDto,
  ReceiveOtherStockDto,
  RubberCompanyDto,
  RubberCompoundMovementDto,
  RubberCompoundOrderDto,
  RubberCompoundStockDto,
  RubberOrderDto,
  RubberOtherStockDto,
  RubberPriceCalculationDto,
  RubberPriceCalculationRequestDto,
  RubberPricingTierDto,
  RubberProductCodingDto,
  RubberProductDto,
  RubberProductionDto,
  UpdateOtherStockDto,
  UpdateRubberCompanyDto,
  UpdateRubberCompoundOrderStatusDto,
  UpdateRubberCompoundStockDto,
  UpdateRubberOrderDto,
  UpdateRubberPricingTierDto,
  UpdateRubberProductCodingDto,
  UpdateRubberProductDto,
} from "./dto/rubber-portal.dto";
import {
  AcknowledgeAlertDto,
  CompoundQualityDetailDto,
  CompoundQualitySummaryDto,
  QualityAlertDto,
  QualityConfigDto,
  UpdateQualityConfigDto,
} from "./dto/rubber-quality.dto";
import {
  CreateRollFromPhotoDto,
  CreateRollIssuanceDto,
  IdentifyRollPhotoDto,
  type JcLineItemDto,
  type JcSearchResultDto,
  type RollPhotoIdentifyResponse,
  type RubberRollIssuanceDto,
  type RubberRollIssuanceRollDto,
} from "./dto/rubber-roll-issuance.dto";
import { RubberAppProfile } from "./entities/rubber-app-profile.entity";
import { AuCocStatus } from "./entities/rubber-au-coc.entity";
import { CompanyType } from "./entities/rubber-company.entity";
import {
  CompoundMovementReferenceType,
  CompoundMovementType,
} from "./entities/rubber-compound-movement.entity";
import { RubberCompoundOrderStatus } from "./entities/rubber-compound-order.entity";
import { CostRateType } from "./entities/rubber-cost-rate.entity";
import {
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExtractedCustomerDeliveryNoteData,
  ExtractedCustomerDeliveryNotePodPage,
} from "./entities/rubber-delivery-note.entity";
import { MonthlyAccountType } from "./entities/rubber-monthly-account.entity";
import { RubberOrderStatus } from "./entities/rubber-order.entity";
import { ProductCodingType } from "./entities/rubber-product-coding.entity";
import { RubberProductionStatus } from "./entities/rubber-production.entity";
import {
  RequisitionItemType,
  RequisitionSourceType,
  RequisitionStatus,
} from "./entities/rubber-purchase-requisition.entity";
import { RollRejectionStatus } from "./entities/rubber-roll-rejection.entity";
import { RollStockStatus } from "./entities/rubber-roll-stock.entity";
import { ReconciliationStatus } from "./entities/rubber-statement-reconciliation.entity";
import { CocProcessingStatus, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { TaxInvoiceStatus, TaxInvoiceType } from "./entities/rubber-tax-invoice.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import {
  AuRubberDocumentType,
  AuRubberPartyType,
  auRubberDocumentPath,
} from "./lib/au-rubber-document-paths";
import {
  type MonthlyAccountDataDto,
  type MonthlyAccountDto,
  RubberAccountingService,
} from "./rubber-accounting.service";
import { RubberAuCocService } from "./rubber-au-coc.service";
import { RubberAuCocReadinessService } from "./rubber-au-coc-readiness.service";
import { RubberBrandingService, ScrapedBrandingCandidates } from "./rubber-branding.service";
import { RubberCocService } from "./rubber-coc.service";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";
import {
  type CreateDirectorDto,
  type DirectorDto,
  RubberCompanyDirectorService,
  type UpdateDirectorDto,
} from "./rubber-company-director.service";
import {
  type CostRateDto,
  type CreateCostRateDto,
  type RollCosDto,
  RubberCostService,
  type UpdateCostRateDto,
} from "./rubber-cost.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import {
  RubberDocumentVersioningService,
  VersionHistoryEntry,
} from "./rubber-document-versioning.service";
import { RubberLiningService } from "./rubber-lining.service";
import { RubberOtherStockService } from "./rubber-other-stock.service";
import { RubberQualityTrackingService } from "./rubber-quality-tracking.service";
import { RequisitionDto, RubberRequisitionService } from "./rubber-requisition.service";
import { RubberRollIssuanceService } from "./rubber-roll-issuance.service";
import {
  type RejectRollInput,
  type RollRejectionDto,
  RubberRollRejectionService,
} from "./rubber-roll-rejection.service";
import { RubberRollStockService } from "./rubber-roll-stock.service";
import { RubberSageCocAdapterService } from "./rubber-sage-coc-adapter.service";
import {
  RubberSageContactSyncService,
  type SageContactMappingStatus,
  type SageContactSyncResult,
} from "./rubber-sage-contact-sync.service";
import { RubberSageInvoiceAdapterService } from "./rubber-sage-invoice-adapter.service";
import {
  type BulkPostResult,
  type PostToSageResult,
  RubberSageInvoicePostService,
} from "./rubber-sage-invoice-post.service";
import {
  type ReconciliationDetailDto,
  type ReconciliationListDto,
  RubberStatementReconciliationService,
} from "./rubber-statement-reconciliation.service";
import { RubberStockService } from "./rubber-stock.service";
import { RubberStockLocationService, StockLocationDto } from "./rubber-stock-location.service";
import {
  CreateTaxInvoiceDto,
  RubberTaxInvoiceDto,
  RubberTaxInvoiceService,
  UpdateTaxInvoiceDto,
} from "./rubber-tax-invoice.service";
import { PdfPageCacheService } from "./services/pdf-page-cache.service";
import { RubberExtractionOrchestratorService } from "./services/rubber-extraction-orchestrator.service";
import { RubberOrderConfirmationService } from "./services/rubber-order-confirmation.service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default ?? pdfParseModule;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

@ApiTags("Rubber Lining")
@Controller("rubber-lining")
export class RubberLiningController {
  private readonly logger = new Logger(RubberLiningController.name);

  constructor(
    private readonly rubberLiningService: RubberLiningService,
    private readonly rubberStockService: RubberStockService,
    private readonly rubberBrandingService: RubberBrandingService,
    private readonly rubberCocService: RubberCocService,
    private readonly rubberDeliveryNoteService: RubberDeliveryNoteService,
    private readonly rubberRollStockService: RubberRollStockService,
    private readonly rubberAuCocService: RubberAuCocService,
    private readonly rubberAuCocReadinessService: RubberAuCocReadinessService,
    private readonly rubberRequisitionService: RubberRequisitionService,
    private readonly rubberStockLocationService: RubberStockLocationService,
    private readonly rubberQualityTrackingService: RubberQualityTrackingService,
    private readonly rubberOtherStockService: RubberOtherStockService,
    private readonly rubberCocExtractionService: RubberCocExtractionService,
    private readonly rubberTaxInvoiceService: RubberTaxInvoiceService,
    private readonly rubberSageAdapterService: RubberSageInvoiceAdapterService,
    private readonly rubberSageCocAdapterService: RubberSageCocAdapterService,
    private readonly sageExportService: SageExportService,
    private readonly sageConnectionService: SageConnectionService,
    private readonly rubberSageContactSyncService: RubberSageContactSyncService,
    private readonly rubberSageInvoicePostService: RubberSageInvoicePostService,
    private readonly rubberDocumentVersioningService: RubberDocumentVersioningService,
    private readonly rubberRollRejectionService: RubberRollRejectionService,
    private readonly rubberCostService: RubberCostService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    private readonly rubberAccountingService: RubberAccountingService,
    private readonly rubberCompanyDirectorService: RubberCompanyDirectorService,
    private readonly rubberStatementReconciliationService: RubberStatementReconciliationService,
    private readonly rubberRollIssuanceService: RubberRollIssuanceService,
    private readonly rubberOrderConfirmationService: RubberOrderConfirmationService,
    private readonly extractionOrchestratorService: RubberExtractionOrchestratorService,
    private readonly pdfPageCacheService: PdfPageCacheService,
    @InjectRepository(RubberAppProfile)
    private readonly appProfileRepository: Repository<RubberAppProfile>,
  ) {}

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/product-codings")
  @ApiOperation({
    summary: "List product codings",
    description:
      "Retrieve all product codings, optionally filtered by type (COLOUR, COMPOUND, CURING_METHOD, GRADE, HARDNESS, TYPE)",
  })
  @ApiQuery({
    name: "codingType",
    required: false,
    enum: ["COLOUR", "COMPOUND", "CURING_METHOD", "GRADE", "HARDNESS", "TYPE"],
  })
  async productCodings(
    @Query("codingType") codingType?: ProductCodingType,
  ): Promise<RubberProductCodingDto[]> {
    return this.rubberLiningService.allProductCodings(codingType);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/product-codings/needs-review-count")
  @ApiOperation({
    summary:
      "Count of product codings auto-created from extraction that haven't been reviewed by an admin yet",
  })
  async productCodingsNeedsReviewCount(): Promise<{ count: number }> {
    return this.rubberLiningService.countProductCodingsNeedingReview();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/product-codings/:id")
  @ApiOperation({ summary: "Get product coding by ID" })
  @ApiParam({ name: "id", description: "Product coding ID" })
  @ApiResponse({ status: 404, description: "Product coding not found" })
  async productCodingById(@Param("id") id: string): Promise<RubberProductCodingDto> {
    const coding = await this.rubberLiningService.productCodingById(Number(id));
    if (!coding) throw new NotFoundException("Product coding not found");
    return coding;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/product-codings")
  @ApiOperation({
    summary: "Create product coding",
    description: "Create a new product coding (e.g., a new colour or compound code)",
  })
  async createProductCoding(
    @Body() dto: CreateRubberProductCodingDto,
  ): Promise<RubberProductCodingDto> {
    return this.rubberLiningService.createProductCoding(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/product-codings/:id")
  @ApiOperation({ summary: "Update product coding" })
  @ApiParam({ name: "id", description: "Product coding ID" })
  @ApiResponse({ status: 404, description: "Product coding not found" })
  async updateProductCoding(
    @Param("id") id: string,
    @Body() dto: UpdateRubberProductCodingDto,
  ): Promise<RubberProductCodingDto> {
    const coding = await this.rubberLiningService.updateProductCoding(Number(id), dto);
    if (!coding) throw new NotFoundException("Product coding not found");
    return coding;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/product-codings/:id")
  @ApiOperation({ summary: "Delete product coding" })
  @ApiParam({ name: "id", description: "Product coding ID" })
  @ApiResponse({ status: 404, description: "Product coding not found" })
  async deleteProductCoding(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteProductCoding(Number(id));
    if (!deleted) throw new NotFoundException("Product coding not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/pricing-tiers")
  @ApiOperation({
    summary: "List pricing tiers",
    description:
      "Retrieve all pricing tiers. Tiers define pricing multipliers for different customer categories.",
  })
  async pricingTiers(): Promise<RubberPricingTierDto[]> {
    return this.rubberLiningService.allPricingTiers();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/pricing-tiers/:id")
  @ApiOperation({ summary: "Get pricing tier by ID" })
  @ApiParam({ name: "id", description: "Pricing tier ID" })
  @ApiResponse({ status: 404, description: "Pricing tier not found" })
  async pricingTierById(@Param("id") id: string): Promise<RubberPricingTierDto> {
    const tier = await this.rubberLiningService.pricingTierById(Number(id));
    if (!tier) throw new NotFoundException("Pricing tier not found");
    return tier;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/pricing-tiers")
  @ApiOperation({
    summary: "Create pricing tier",
    description: "Create a new pricing tier with name and pricing factor (percentage)",
  })
  async createPricingTier(@Body() dto: CreateRubberPricingTierDto): Promise<RubberPricingTierDto> {
    return this.rubberLiningService.createPricingTier(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/pricing-tiers/:id")
  @ApiOperation({ summary: "Update pricing tier" })
  @ApiParam({ name: "id", description: "Pricing tier ID" })
  @ApiResponse({ status: 404, description: "Pricing tier not found" })
  async updatePricingTier(
    @Param("id") id: string,
    @Body() dto: UpdateRubberPricingTierDto,
  ): Promise<RubberPricingTierDto> {
    const tier = await this.rubberLiningService.updatePricingTier(Number(id), dto);
    if (!tier) throw new NotFoundException("Pricing tier not found");
    return tier;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/pricing-tiers/:id")
  @ApiOperation({ summary: "Delete pricing tier" })
  @ApiParam({ name: "id", description: "Pricing tier ID" })
  @ApiResponse({ status: 404, description: "Pricing tier not found" })
  async deletePricingTier(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deletePricingTier(Number(id));
    if (!deleted) throw new NotFoundException("Pricing tier not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/companies")
  @Header("Cache-Control", "private, max-age=600")
  @ApiOperation({
    summary: "List companies",
    description: "Retrieve all rubber lining companies with their pricing tier information",
  })
  async companies(): Promise<RubberCompanyDto[]> {
    return this.rubberLiningService.allCompanies();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/companies/:id")
  @ApiOperation({ summary: "Get company by ID" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({ status: 404, description: "Company not found" })
  async companyById(@Param("id") id: string): Promise<RubberCompanyDto> {
    const company = await this.rubberLiningService.companyById(Number(id));
    if (!company) throw new NotFoundException("Company not found");
    return company;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/companies")
  @ApiOperation({
    summary: "Create company",
    description:
      "Create a new rubber lining company. Set isCompoundOwner=true for compound manufacturers.",
  })
  async createCompany(@Body() dto: CreateRubberCompanyDto): Promise<RubberCompanyDto> {
    return this.rubberLiningService.createCompany(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/companies/:id")
  @ApiOperation({ summary: "Update company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({ status: 404, description: "Company not found" })
  async updateCompany(
    @Param("id") id: string,
    @Body() dto: UpdateRubberCompanyDto,
  ): Promise<RubberCompanyDto> {
    const company = await this.rubberLiningService.updateCompany(Number(id), dto);
    if (!company) throw new NotFoundException("Company not found");
    return company;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/companies/:id")
  @ApiOperation({ summary: "Delete company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({ status: 404, description: "Company not found" })
  async deleteCompany(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteCompany(Number(id));
    if (!deleted) throw new NotFoundException("Company not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/products")
  @Header("Cache-Control", "private, max-age=600")
  @ApiOperation({
    summary: "List products",
    description: "Retrieve all rubber products with resolved coding names and calculated prices",
  })
  async products(): Promise<RubberProductDto[]> {
    return this.rubberLiningService.allProducts();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/products/:id")
  @ApiOperation({ summary: "Get product by ID" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 404, description: "Product not found" })
  async productById(@Param("id") id: string): Promise<RubberProductDto> {
    const product = await this.rubberLiningService.productById(Number(id));
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/products")
  @ApiOperation({
    summary: "Create product",
    description:
      "Create a new rubber product. References to codings (compound, type, colour, etc.) use Firebase UIDs and are validated.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid coding reference - coding not found or wrong type",
  })
  async createProduct(@Body() dto: CreateRubberProductDto): Promise<RubberProductDto> {
    return this.rubberLiningService.createProduct(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/products/:id")
  @ApiOperation({ summary: "Update product" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({
    status: 400,
    description: "Invalid coding reference - coding not found or wrong type",
  })
  @ApiResponse({ status: 404, description: "Product not found" })
  async updateProduct(
    @Param("id") id: string,
    @Body() dto: UpdateRubberProductDto,
  ): Promise<RubberProductDto> {
    const product = await this.rubberLiningService.updateProduct(Number(id), dto);
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/products/:id")
  @ApiOperation({ summary: "Delete product" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 404, description: "Product not found" })
  async deleteProduct(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteProduct(Number(id));
    if (!deleted) throw new NotFoundException("Product not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/products/import")
  @ApiOperation({
    summary: "Import products from CSV data",
    description:
      "Bulk import products. Coding fields (type, compound, colour, etc.) use names which are resolved to Firebase UIDs. Supports create and update modes.",
  })
  @ApiResponse({
    status: 200,
    description: "Import results with counts and per-row status",
  })
  async importProducts(@Body() dto: ImportProductsRequestDto): Promise<ImportProductsResultDto> {
    return this.rubberLiningService.importProducts(dto.rows, dto.updateExisting ?? false);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/orders")
  @ApiOperation({
    summary: "List orders",
    description:
      "Retrieve all orders, optionally filtered by status. Orders contain line items with calloff schedules.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description:
      "Filter by order status (-1=New, 0=Draft, 1=Cancelled, 2=Partial, 3=Submitted, 4=Manufacturing, 5=Delivering, 6=Complete)",
  })
  async orders(@Query("status") status?: string): Promise<RubberOrderDto[]> {
    const orderStatus = status !== undefined ? (Number(status) as RubberOrderStatus) : undefined;
    return this.rubberLiningService.allOrders(orderStatus);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/orders/:id")
  @ApiOperation({
    summary: "Get order by ID",
    description: "Retrieve order with all line items and calloff schedules",
  })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async orderById(@Param("id") id: string): Promise<RubberOrderDto> {
    const order = await this.rubberLiningService.orderById(Number(id));
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/orders")
  @ApiOperation({
    summary: "Create order",
    description: "Create a new rubber lining order. Auto-generates order number if not provided.",
  })
  async createOrder(@Body() dto: CreateRubberOrderDto): Promise<RubberOrderDto> {
    return this.rubberLiningService.createOrder(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/orders/:id")
  @ApiOperation({
    summary: "Update order",
    description:
      "Update order details, status, and line items. Replaces all items if items array is provided.",
  })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async updateOrder(
    @Param("id") id: string,
    @Body() dto: UpdateRubberOrderDto,
  ): Promise<RubberOrderDto> {
    const order = await this.rubberLiningService.updateOrder(Number(id), dto);
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/orders/:id")
  @ApiOperation({ summary: "Delete order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async deleteOrder(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteOrder(Number(id));
    if (!deleted) throw new NotFoundException("Order not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/orders/:id/confirmation-pdf")
  @ApiOperation({ summary: "Generate order confirmation PDF" })
  @ApiParam({ name: "id", description: "Order ID" })
  async orderConfirmationPdf(@Param("id") id: string, @Res() res: Response): Promise<void> {
    const buffer = await this.rubberOrderConfirmationService.confirmationPdf(Number(id));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Order-Confirmation-${id}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/orders/:id/send-confirmation")
  @ApiOperation({ summary: "Send order confirmation email to customer" })
  @ApiParam({ name: "id", description: "Order ID" })
  async sendOrderConfirmation(
    @Param("id") id: string,
    @Body() body: { email: string; cc?: string; bcc?: string },
  ): Promise<{ success: boolean }> {
    await this.rubberOrderConfirmationService.sendConfirmation(
      Number(id),
      body.email,
      body.cc,
      body.bcc,
    );
    return { success: true };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/app-profile")
  @ApiOperation({ summary: "Get app owner company profile" })
  async appProfile(): Promise<RubberAppProfile> {
    const profile = await this.appProfileRepository.findOne({ where: { id: 1 } });
    if (!profile) {
      const newProfile = this.appProfileRepository.create({ id: 1 });
      return this.appProfileRepository.save(newProfile);
    }
    return profile;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/app-profile")
  @ApiOperation({ summary: "Update app owner company profile" })
  async updateAppProfile(@Body() body: Partial<RubberAppProfile>): Promise<RubberAppProfile> {
    const existing = await this.appProfileRepository.findOne({ where: { id: 1 } });
    if (!existing) {
      const newProfile = this.appProfileRepository.create({ id: 1, ...body });
      return this.appProfileRepository.save(newProfile);
    }
    const merged = this.appProfileRepository.merge(existing, body);
    return this.appProfileRepository.save(merged);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/order-statuses")
  @ApiOperation({
    summary: "List order statuses",
    description: "Get all possible order status values and labels",
  })
  async orderStatuses(): Promise<{ value: number; label: string }[]> {
    return [
      { value: -1, label: "New" },
      { value: 0, label: "Draft" },
      { value: 1, label: "Cancelled" },
      { value: 2, label: "Partially Submitted" },
      { value: 3, label: "Submitted" },
      { value: 4, label: "Manufacturing" },
      { value: 5, label: "Delivering" },
      { value: 6, label: "Complete" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/coding-types")
  @ApiOperation({
    summary: "List coding types",
    description: "Get all product coding type values for filtering",
  })
  async codingTypes(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "COLOUR", label: "Colour" },
      { value: "COMPOUND", label: "Compound" },
      { value: "CURING_METHOD", label: "Curing Method" },
      { value: "GRADE", label: "Grade" },
      { value: "HARDNESS", label: "Hardness" },
      { value: "TYPE", label: "Type" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/calculate-price")
  @ApiOperation({
    summary: "Calculate roll price",
    description: `Calculate the price for rubber rolls based on product, company, and dimensions.

Formula: totalPrice = totalKg × salePricePerKg
- kgPerRoll = thickness(mm) × (width(mm)/1000) × length(m) × specificGravity
- totalKg = kgPerRoll × quantity
- pricePerKg = costPerKg × (markup/100)
- salePricePerKg = pricePerKg × (pricingFactor/100)`,
  })
  @ApiResponse({ status: 404, description: "Product or company not found" })
  async calculatePrice(
    @Body() request: RubberPriceCalculationRequestDto,
  ): Promise<RubberPriceCalculationDto> {
    const result = await this.rubberLiningService.calculatePrice(request);
    if (!result) throw new NotFoundException("Product or company not found");
    return result;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/compound-stocks")
  @ApiOperation({ summary: "List compound stocks" })
  async compoundStocks(): Promise<RubberCompoundStockDto[]> {
    return this.rubberStockService.allCompoundStocks();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/compound-stocks/low-stock")
  @ApiOperation({ summary: "List compounds below reorder point" })
  async lowStockCompounds(): Promise<RubberCompoundStockDto[]> {
    return this.rubberStockService.lowStockCompounds();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/compound-stocks/:id")
  @ApiOperation({ summary: "Get compound stock by ID" })
  @ApiParam({ name: "id", description: "Compound stock ID" })
  async compoundStockById(@Param("id") id: string): Promise<RubberCompoundStockDto> {
    const stock = await this.rubberStockService.compoundStockById(Number(id));
    if (!stock) throw new NotFoundException("Compound stock not found");
    return stock;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/compound-stocks")
  @ApiOperation({ summary: "Create compound stock" })
  async createCompoundStock(
    @Body() dto: CreateRubberCompoundStockDto,
  ): Promise<RubberCompoundStockDto> {
    return this.rubberStockService.createCompoundStock(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/compound-stocks/opening")
  @ApiOperation({ summary: "Create compound opening stock entry" })
  async createCompoundOpeningStock(
    @Body() dto: CreateCompoundOpeningStockDto,
  ): Promise<RubberCompoundStockDto> {
    return this.rubberStockService.createCompoundOpeningStock(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/compound-stocks/import-opening")
  @ApiOperation({ summary: "Bulk import compound opening stock" })
  async importCompoundOpeningStock(
    @Body() rows: ImportCompoundOpeningStockRowDto[],
  ): Promise<ImportCompoundOpeningStockResultDto> {
    return this.rubberStockService.importCompoundOpeningStock(rows);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/compound-stocks/:id")
  @ApiOperation({ summary: "Update compound stock" })
  @ApiParam({ name: "id", description: "Compound stock ID" })
  async updateCompoundStock(
    @Param("id") id: string,
    @Body() dto: UpdateRubberCompoundStockDto,
  ): Promise<RubberCompoundStockDto> {
    const stock = await this.rubberStockService.updateCompoundStock(Number(id), dto);
    if (!stock) throw new NotFoundException("Compound stock not found");
    return stock;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/compound-stocks/:id")
  @ApiOperation({ summary: "Delete compound stock" })
  @ApiParam({ name: "id", description: "Compound stock ID" })
  async deleteCompoundStock(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberStockService.deleteCompoundStock(Number(id));
    if (!deleted) throw new NotFoundException("Compound stock not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/compound-movements")
  @ApiOperation({ summary: "List compound movements" })
  @ApiQuery({ name: "compoundStockId", required: false })
  @ApiQuery({ name: "movementType", required: false, enum: CompoundMovementType })
  @ApiQuery({ name: "referenceType", required: false, enum: CompoundMovementReferenceType })
  async compoundMovements(
    @Query("compoundStockId") compoundStockId?: string,
    @Query("movementType") movementType?: CompoundMovementType,
    @Query("referenceType") referenceType?: CompoundMovementReferenceType,
  ): Promise<RubberCompoundMovementDto[]> {
    return this.rubberStockService.allMovements({
      compoundStockId: compoundStockId ? Number(compoundStockId) : undefined,
      movementType,
      referenceType,
    });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/compound-movements/receive")
  @ApiOperation({ summary: "Receive compound into stock" })
  async receiveCompound(@Body() dto: ReceiveCompoundDto): Promise<RubberCompoundMovementDto> {
    return this.rubberStockService.receiveCompound(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/compound-movements/adjust")
  @ApiOperation({ summary: "Manually adjust compound stock" })
  async adjustCompound(@Body() dto: AdjustCompoundDto): Promise<RubberCompoundMovementDto> {
    return this.rubberStockService.manualAdjustment(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/productions")
  @ApiOperation({ summary: "List productions" })
  @ApiQuery({ name: "status", required: false, enum: RubberProductionStatus })
  async productions(
    @Query("status") status?: RubberProductionStatus,
  ): Promise<RubberProductionDto[]> {
    return this.rubberStockService.allProductions(status);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/productions/:id")
  @ApiOperation({ summary: "Get production by ID" })
  @ApiParam({ name: "id", description: "Production ID" })
  async productionById(@Param("id") id: string): Promise<RubberProductionDto> {
    const production = await this.rubberStockService.productionById(Number(id));
    if (!production) throw new NotFoundException("Production not found");
    return production;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/productions")
  @ApiOperation({ summary: "Create production" })
  async createProduction(@Body() dto: CreateRubberProductionDto): Promise<RubberProductionDto> {
    return this.rubberStockService.createProduction(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/productions/:id/start")
  @ApiOperation({ summary: "Start production" })
  @ApiParam({ name: "id", description: "Production ID" })
  async startProduction(@Param("id") id: string): Promise<RubberProductionDto> {
    return this.rubberStockService.startProduction(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/productions/:id/complete")
  @ApiOperation({ summary: "Complete production (deducts compound)" })
  @ApiParam({ name: "id", description: "Production ID" })
  async completeProduction(@Param("id") id: string): Promise<RubberProductionDto> {
    return this.rubberStockService.completeProduction(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/productions/:id/cancel")
  @ApiOperation({ summary: "Cancel production" })
  @ApiParam({ name: "id", description: "Production ID" })
  async cancelProduction(@Param("id") id: string): Promise<RubberProductionDto> {
    return this.rubberStockService.cancelProduction(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/productions/calculate-compound")
  @ApiOperation({ summary: "Calculate compound required for production" })
  async calculateCompoundRequired(
    @Body() dto: CalculateCompoundDto,
  ): Promise<CompoundCalculationResultDto> {
    return this.rubberStockService.calculateCompoundRequired(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/compound-orders")
  @ApiOperation({ summary: "List compound orders" })
  @ApiQuery({ name: "status", required: false, enum: RubberCompoundOrderStatus })
  async compoundOrders(
    @Query("status") status?: RubberCompoundOrderStatus,
  ): Promise<RubberCompoundOrderDto[]> {
    return this.rubberStockService.allCompoundOrders(status);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/compound-orders/:id")
  @ApiOperation({ summary: "Get compound order by ID" })
  @ApiParam({ name: "id", description: "Compound order ID" })
  async compoundOrderById(@Param("id") id: string): Promise<RubberCompoundOrderDto> {
    const order = await this.rubberStockService.compoundOrderById(Number(id));
    if (!order) throw new NotFoundException("Compound order not found");
    return order;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/compound-orders")
  @ApiOperation({ summary: "Create compound order" })
  async createCompoundOrder(
    @Body() dto: CreateRubberCompoundOrderDto,
  ): Promise<RubberCompoundOrderDto> {
    return this.rubberStockService.createCompoundOrder(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/compound-orders/:id/status")
  @ApiOperation({ summary: "Update compound order status" })
  @ApiParam({ name: "id", description: "Compound order ID" })
  async updateCompoundOrderStatus(
    @Param("id") id: string,
    @Body() dto: UpdateRubberCompoundOrderStatusDto,
  ): Promise<RubberCompoundOrderDto> {
    return this.rubberStockService.updateCompoundOrderStatus(Number(id), dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/compound-orders/:id/receive")
  @ApiOperation({ summary: "Receive compound order" })
  @ApiParam({ name: "id", description: "Compound order ID" })
  async receiveCompoundOrder(
    @Param("id") id: string,
    @Body() dto: ReceiveCompoundOrderDto,
  ): Promise<RubberCompoundOrderDto> {
    return this.rubberStockService.receiveCompoundOrder(Number(id), dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/production-statuses")
  @ApiOperation({ summary: "List production statuses" })
  async productionStatuses(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "PENDING", label: "Pending" },
      { value: "IN_PROGRESS", label: "In Progress" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/compound-order-statuses")
  @ApiOperation({ summary: "List compound order statuses" })
  async compoundOrderStatuses(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "PENDING", label: "Pending" },
      { value: "APPROVED", label: "Approved" },
      { value: "ORDERED", label: "Ordered" },
      { value: "RECEIVED", label: "Received" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/scrape-branding")
  @ApiOperation({ summary: "Scrape branding candidates from a website" })
  @ApiResponse({ status: 200, description: "Scraped branding candidates" })
  async scrapeBranding(@Body() body: { websiteUrl: string }): Promise<ScrapedBrandingCandidates> {
    return this.rubberBrandingService.scrapeCandidates(body.websiteUrl);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/proxy-image")
  @ApiOperation({ summary: "Proxy an external image to avoid CORS issues" })
  async proxyImage(@Query("url") url: string, @Res() res: Response) {
    if (!url) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: "url query parameter is required" });
      return;
    }

    const result = await this.rubberBrandingService.proxyImage(url);
    if (!result) {
      res.status(HttpStatus.BAD_GATEWAY).json({ message: "Failed to fetch image" });
      return;
    }

    res.set({
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=86400, immutable",
      "Content-Length": result.buffer.length.toString(),
    });
    res.send(result.buffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/documents/url")
  @Header("Cache-Control", "private, max-age=3000")
  @ApiOperation({ summary: "Get presigned URL for a document" })
  @ApiQuery({ name: "path", description: "Document path in storage" })
  @ApiResponse({ status: 200, description: "Presigned URL for the document" })
  async documentUrl(@Query("path") path: string): Promise<{ url: string }> {
    if (!path) {
      throw new NotFoundException("Document path is required");
    }
    const url = await this.storageService.presignedUrl(path);
    return { url };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs")
  @ApiOperation({ summary: "List supplier CoCs" })
  @ApiQuery({ name: "cocType", required: false, enum: SupplierCocType })
  @ApiQuery({ name: "processingStatus", required: false, enum: CocProcessingStatus })
  @ApiQuery({ name: "supplierCompanyId", required: false })
  @ApiQuery({ name: "includeAllVersions", required: false })
  async supplierCocs(
    @Query("cocType") cocType?: SupplierCocType,
    @Query("processingStatus") processingStatus?: CocProcessingStatus,
    @Query("supplierCompanyId") supplierCompanyId?: string,
    @Query("includeAllVersions") includeAllVersions?: string,
  ): Promise<RubberSupplierCocDto[]> {
    return this.rubberCocService.allSupplierCocs({
      cocType,
      processingStatus,
      supplierCompanyId: supplierCompanyId ? Number(supplierCompanyId) : undefined,
      includeAllVersions: includeAllVersions === "true",
    });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs/export/sage-preview")
  @ApiOperation({ summary: "Preview CoC Sage CSV export" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  async cocSageExportPreview(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("excludeExported") excludeExported?: string,
  ): Promise<{ cocCount: number; batchCount: number; totalBatches: number }> {
    return this.rubberSageCocAdapterService.cocPreviewCount({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      excludeExported: excludeExported !== "false",
    });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs/export/sage-csv")
  @ApiOperation({ summary: "Download CoC Sage CSV export" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  async cocSageExportCsv(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("excludeExported") excludeExported?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const filters: SageExportFilterDto = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      excludeExported: excludeExported !== "false",
    };

    const { invoices, cocIds } = await this.rubberSageCocAdapterService.exportableCocs(filters);
    const csvBuffer = this.sageExportService.generateCsv(invoices);

    await this.rubberSageCocAdapterService.markCocExported(cocIds);

    res!.set({
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=sage-coc-export.csv",
      "Content-Length": csvBuffer.length,
    });
    res!.send(csvBuffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs/non-canonical-compounder-ids")
  @ApiOperation({
    summary:
      "List Compounder CoC IDs whose compoundCode does not match any canonical compound coding",
  })
  async nonCanonicalCompounderCocIds(): Promise<{ ids: number[] }> {
    const ids = await this.rubberCocService.nonCanonicalCompounderCocIds();
    return { ids };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs/:id")
  @ApiOperation({ summary: "Get supplier CoC by ID" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async supplierCocById(@Param("id") id: string): Promise<RubberSupplierCocDto> {
    const coc = await this.rubberCocService.supplierCocById(Number(id));
    if (!coc) throw new NotFoundException("Supplier CoC not found");
    return coc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/supplier-cocs")
  @ApiOperation({ summary: "Create supplier CoC" })
  async createSupplierCoc(@Body() dto: CreateSupplierCocDto): Promise<RubberSupplierCocDto> {
    return this.rubberCocService.createSupplierCoc(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/supplier-cocs/:id")
  @ApiOperation({ summary: "Update supplier CoC" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async updateSupplierCoc(
    @Param("id") id: string,
    @Body() dto: UpdateSupplierCocDto,
  ): Promise<RubberSupplierCocDto> {
    const coc = await this.rubberCocService.updateSupplierCoc(Number(id), dto);
    if (!coc) throw new NotFoundException("Supplier CoC not found");
    return coc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/supplier-cocs/:id/review")
  @ApiOperation({ summary: "Review extracted data and update CoC" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async reviewSupplierCocExtraction(
    @Param("id") id: string,
    @Body() dto: ReviewExtractionDto,
  ): Promise<RubberSupplierCocDto> {
    const coc = await this.rubberCocService.reviewExtraction(Number(id), dto);
    if (!coc) throw new NotFoundException("Supplier CoC not found");
    return coc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/supplier-cocs/:id/approve")
  @ApiOperation({ summary: "Approve supplier CoC (creates batches from extracted data)" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async approveSupplierCoc(
    @Param("id") id: string,
    @Req() req: AdminRequest,
  ): Promise<RubberSupplierCocDto> {
    const user = req.user;
    const approvedBy = user?.email ?? undefined;
    const coc = await this.rubberCocService.approveCoc(Number(id), approvedBy);
    if (!coc) throw new NotFoundException("Supplier CoC not found");
    return coc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/supplier-cocs/:id/extract")
  @ApiOperation({ summary: "Re-extract data from supplier CoC PDF using AI" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async reextractSupplierCoc(@Param("id") id: string): Promise<RubberSupplierCocDto> {
    const updatedCoc = await this.runReextractForSupplierCoc(Number(id));
    return updatedCoc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/supplier-cocs/reextract-non-canonical")
  @ApiOperation({
    summary:
      "Re-extract all Compounder CoCs whose compoundCode does not match any canonical compound coding",
  })
  async reextractNonCanonicalCompounderCocs(): Promise<{
    candidates: number[];
    succeeded: number[];
    failed: { id: number; error: string }[];
  }> {
    const candidates = await this.rubberCocService.nonCanonicalCompounderCocIds();
    const succeeded: number[] = [];
    const failed: { id: number; error: string }[] = [];
    for (const cocId of candidates) {
      try {
        await this.runReextractForSupplierCoc(cocId);
        succeeded.push(cocId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Bulk re-extract failed for supplier CoC ${cocId}: ${message}`);
        failed.push({ id: cocId, error: message });
      }
    }
    this.logger.log(
      `Bulk re-extract: ${succeeded.length}/${candidates.length} succeeded, ${failed.length} failed`,
    );
    return { candidates, succeeded, failed };
  }

  private async runReextractForSupplierCoc(id: number): Promise<RubberSupplierCocDto> {
    const coc = await this.rubberCocService.supplierCocById(id);
    if (!coc) throw new NotFoundException("Supplier CoC not found");

    if (!coc.documentPath) {
      throw new NotFoundException("Supplier CoC has no document attached");
    }

    const isAvailable = await this.rubberCocExtractionService.isAvailable();
    if (!isAvailable) {
      throw new NotFoundException(
        "AI extraction service not available - GEMINI_API_KEY not configured",
      );
    }

    const pdfBuffer = await this.storageService.download(coc.documentPath);
    const pdfText = await (async () => {
      try {
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text || "";
      } catch (error) {
        this.logger.warn(
          `PDF text extraction failed for CoC ${id}: ${error instanceof Error ? error.message : error}`,
        );
        return "";
      }
    })();

    if (pdfText.length < 50 && coc.cocType !== SupplierCocType.COMPOUNDER) {
      throw new NotFoundException(
        "PDF appears to be scanned/image-based. Re-extraction for this CoC type requires text-based PDFs.",
      );
    }

    const correctionHints = await this.rubberCocService.correctionHintsForCoc(id);

    const extractionResult = await this.rubberCocExtractionService.extractByType(
      coc.cocType,
      pdfText,
      correctionHints,
      pdfBuffer,
    );

    const updatedCoc = await this.rubberCocService.reextractAndUpdateCoc(id, extractionResult.data);
    if (!updatedCoc) throw new NotFoundException("Failed to update supplier CoC");

    return updatedCoc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/supplier-cocs/:id")
  @ApiOperation({ summary: "Delete supplier CoC" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async deleteSupplierCoc(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberCocService.deleteSupplierCoc(Number(id));
    if (!deleted) throw new NotFoundException("Supplier CoC not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/supplier-cocs")
  @ApiOperation({ summary: "Clear all supplier CoCs and reset numbering" })
  async clearAllSupplierCocs(): Promise<{ deletedBatches: number; deletedCocs: number }> {
    return this.rubberCocService.clearAllSupplierCocs();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs/:id/batches")
  @ApiOperation({ summary: "Get batches for a supplier CoC" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async batchesByCocId(@Param("id") id: string) {
    return this.rubberCocService.batchesByCocId(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/compound-batches/:id")
  @ApiOperation({ summary: "Update a compound batch" })
  @ApiParam({ name: "id", description: "Compound Batch ID" })
  async updateCompoundBatch(
    @Param("id") id: string,
    @Body() dto: import("./dto/rubber-coc.dto").UpdateCompoundBatchDto,
  ) {
    return this.rubberCocService.updateCompoundBatch(Number(id), dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/compound-batches/:id")
  @ApiOperation({ summary: "Delete a compound batch" })
  @ApiParam({ name: "id", description: "Compound Batch ID" })
  async deleteCompoundBatch(@Param("id") id: string) {
    await this.rubberCocService.deleteCompoundBatch(Number(id));
    return { success: true };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/supplier-cocs/:id/link-compounder")
  @ApiOperation({ summary: "Link calendarer CoC to compounder CoCs based on batch numbers" })
  @ApiParam({ name: "id", description: "Calendarer CoC ID" })
  async linkCalendererToCompounderCocs(
    @Param("id") id: string,
  ): Promise<{ linkedCocIds: number[]; linkedBatches: string[] }> {
    return this.rubberCocService.linkCalendererToCompounderCocs(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/traceability/roll/:rollNumber")
  @ApiOperation({ summary: "Get full traceability chain for a roll number" })
  @ApiParam({ name: "rollNumber", description: "Roll number to trace" })
  async traceabilityForRoll(@Param("rollNumber") rollNumber: string) {
    return this.rubberCocService.traceabilityForRoll(rollNumber);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/bulk-auto-link")
  @ApiOperation({ summary: "Bulk auto-link all unlinked delivery notes to matching supplier CoCs" })
  async bulkAutoLinkDns(): Promise<{ linked: number; details: string[] }> {
    return this.rubberDeliveryNoteService.bulkAutoLinkAllUnlinkedDns();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/bulk-link-customer-dns")
  @ApiOperation({ summary: "Bulk link customer DNs to CoCs from already-linked supplier DNs" })
  async bulkLinkCustomerDns(): Promise<{ linked: number; details: string[] }> {
    return this.rubberDeliveryNoteService.bulkLinkCustomerDnsFromLinkedSupplierDns();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/delivery-notes")
  @ApiOperation({ summary: "List delivery notes (paginated)" })
  @ApiQuery({ name: "deliveryNoteType", required: false, enum: DeliveryNoteType })
  @ApiQuery({ name: "status", required: false, enum: DeliveryNoteStatus })
  @ApiQuery({ name: "supplierCompanyId", required: false })
  @ApiQuery({ name: "companyType", required: false, enum: CompanyType })
  @ApiQuery({ name: "includeAllVersions", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "sortColumn", required: false })
  @ApiQuery({ name: "sortDirection", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async deliveryNotes(
    @Query("deliveryNoteType") deliveryNoteType?: DeliveryNoteType,
    @Query("status") status?: DeliveryNoteStatus,
    @Query("supplierCompanyId") supplierCompanyId?: string,
    @Query("companyType") companyType?: CompanyType,
    @Query("includeAllVersions") includeAllVersions?: string,
    @Query("search") search?: string,
    @Query("sortColumn") sortColumn?: string,
    @Query("sortDirection") sortDirection?: "asc" | "desc",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<PaginatedResult<RubberDeliveryNoteDto>> {
    return this.rubberDeliveryNoteService.paginatedDeliveryNotes({
      deliveryNoteType,
      status,
      supplierCompanyId: supplierCompanyId ? Number(supplierCompanyId) : undefined,
      companyType,
      includeAllVersions: includeAllVersions === "true",
      search,
      sortColumn,
      sortDirection,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/delivery-notes/:id")
  @ApiOperation({ summary: "Get delivery note by ID" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async deliveryNoteById(@Param("id") id: string): Promise<RubberDeliveryNoteDto> {
    const note = await this.rubberDeliveryNoteService.deliveryNoteById(Number(id));
    if (!note) throw new NotFoundException("Delivery note not found");
    return note;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes")
  @ApiOperation({ summary: "Create delivery note" })
  async createDeliveryNote(@Body() dto: CreateDeliveryNoteDto): Promise<RubberDeliveryNoteDto> {
    return this.rubberDeliveryNoteService.createDeliveryNote(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id")
  @ApiOperation({ summary: "Update delivery note" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async updateDeliveryNote(
    @Param("id") id: string,
    @Body() dto: UpdateDeliveryNoteDto,
  ): Promise<RubberDeliveryNoteDto> {
    const note = await this.rubberDeliveryNoteService.updateDeliveryNote(Number(id), dto);
    if (!note) throw new NotFoundException("Delivery note not found");
    return note;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/link-coc")
  @ApiOperation({ summary: "Link delivery note to CoC" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async linkDeliveryNoteToCoc(
    @Param("id") id: string,
    @Body() body: { cocId: number },
  ): Promise<RubberDeliveryNoteDto> {
    const note = await this.rubberDeliveryNoteService.linkToCoc(Number(id), body.cocId);
    if (!note) throw new NotFoundException("Delivery note not found");
    return note;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/finalize")
  @ApiOperation({ summary: "Finalize delivery note (marks as stock created)" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async finalizeDeliveryNote(@Param("id") id: string): Promise<RubberDeliveryNoteDto> {
    const note = await this.rubberDeliveryNoteService.finalizeDeliveryNote(Number(id));
    if (!note) throw new NotFoundException("Delivery note not found");
    return note;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/approve")
  @ApiOperation({ summary: "Approve extracted delivery note data (status EXTRACTED → APPROVED)" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async approveDeliveryNote(@Param("id") id: string): Promise<RubberDeliveryNoteDto> {
    const note = await this.rubberDeliveryNoteService.approveDeliveryNote(Number(id));
    if (!note) throw new NotFoundException("Delivery note not found");
    return note;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/:id/backfill-siblings")
  @ApiOperation({
    summary:
      "Re-extract this delivery note's source PDF and create sibling DN records for any DN numbers in the PDF that don't yet exist (recovery for multi-DN PDFs that were collapsed during initial extraction)",
  })
  @ApiParam({ name: "id", description: "Parent delivery note ID" })
  async backfillSiblingsFromDocument(@Param("id") id: string): Promise<{
    created: number;
    deliveryNoteIds: number[];
    skipped: { dnNumber: string; reason: string }[];
  }> {
    const parentId = Number(id);
    const note = await this.rubberDeliveryNoteService.deliveryNoteById(parentId);
    if (!note) throw new NotFoundException("Delivery note not found");
    if (!note.documentPath) {
      throw new BadRequestException("Delivery note has no source document to re-extract from");
    }
    if (note.deliveryNoteType !== DeliveryNoteType.ROLL) {
      throw new BadRequestException(
        "Backfill siblings is only supported for ROLL delivery notes (compound DNs use a different extraction path)",
      );
    }

    const isAvailable = await this.rubberCocExtractionService.isAvailable();
    if (!isAvailable) {
      throw new BadRequestException(
        "AI extraction service not available - GEMINI_API_KEY not configured",
      );
    }

    const pdfBuffer = await this.storageService.download(note.documentPath);
    const correctionHints = await this.rubberDeliveryNoteService.correctionHintsForDnSupplier(
      note.supplierCompanyName,
    );

    const customerResult = await (async () => {
      try {
        return await this.rubberCocExtractionService.extractCustomerDeliveryNoteFromImages(
          pdfBuffer,
          correctionHints,
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        throw new BadRequestException(
          `Failed to re-extract source PDF: ${msg}. Please ensure the document is a valid PDF.`,
        );
      }
    })();

    const supplierDns = customerResult.deliveryNotes.filter((dn) => {
      const supplier = (dn.supplierName || "").toLowerCase();
      return !(supplier.includes("au industrie") || supplier.includes("au industries"));
    });

    const dnsToProcess = supplierDns.length > 0 ? supplierDns : customerResult.deliveryNotes;

    const result = await this.rubberDeliveryNoteService.backfillSiblingsFromExtractedDeliveryNotes(
      parentId,
      dnsToProcess,
    );

    this.logger.log(
      `Backfill on DN #${parentId}: created ${result.created} sibling(s), skipped ${result.skipped.length}`,
    );

    return result;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/refile-stock")
  @ApiOperation({
    summary: "Re-approve and overwrite stock movement using corrected extracted data",
  })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async refileDeliveryNoteStock(@Param("id") id: string): Promise<RubberDeliveryNoteDto> {
    const note = await this.rubberDeliveryNoteService.refileStock(Number(id));
    if (!note) throw new NotFoundException("Delivery note not found");
    return note;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/:id/extract")
  @ApiOperation({ summary: "Extract data from delivery note PDF using AI" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async extractDeliveryNoteData(@Param("id") id: string): Promise<RubberDeliveryNoteDto> {
    const note = await this.rubberDeliveryNoteService.deliveryNoteById(Number(id));
    if (!note) throw new NotFoundException("Delivery note not found");

    if (!note.documentPath) {
      throw new NotFoundException("Delivery note has no document attached");
    }

    const isAvailable = await this.rubberCocExtractionService.isAvailable();
    if (!isAvailable) {
      throw new NotFoundException(
        "AI extraction service not available - GEMINI_API_KEY not configured",
      );
    }

    const pdfBuffer = await this.storageService.download(note.documentPath);

    const isRollDeliveryNote = note.deliveryNoteType === "ROLL";

    const correctionHints = await this.rubberDeliveryNoteService.correctionHintsForDnSupplier(
      note.supplierCompanyName,
    );

    const extractedData = await (async () => {
      if (isRollDeliveryNote) {
        let customerResult: Awaited<
          ReturnType<typeof this.rubberCocExtractionService.extractCustomerDeliveryNoteFromImages>
        >;
        try {
          customerResult =
            await this.rubberCocExtractionService.extractCustomerDeliveryNoteFromImages(
              pdfBuffer,
              correctionHints,
            );
        } catch (pdfErr: unknown) {
          const msg = pdfErr instanceof Error ? pdfErr.message : "Unknown error";
          throw new BadRequestException(
            `Failed to process PDF: ${msg}. Please ensure the uploaded file is a valid PDF.`,
          );
        }

        const allRolls = customerResult.deliveryNotes.flatMap((dn, dnIdx) =>
          (dn.lineItems || [])
            .filter((item) => item != null && typeof item === "object")
            .map((item) => ({
              rollNumber: item.rollNumber ?? null,
              compoundCode: item.compoundCode ?? null,
              thicknessMm: item.thicknessMm ?? null,
              widthMm: item.widthMm ?? null,
              lengthM: item.lengthM ?? null,
              weightKg: item.actualWeightKg ?? null,
              areaSqM: item.widthMm && item.lengthM ? (item.widthMm * item.lengthM) / 1000 : null,
              deliveryNoteNumber: dn.deliveryNoteNumber ?? null,
              deliveryDate: dn.deliveryDate ?? null,
              customerName: dn.customerName ?? null,
              customerReference: dn.customerReference ?? null,
              supplierName: dn.supplierName ?? null,
              pageNumber: dnIdx + 1,
              sourcePages: dn.sourcePages && dn.sourcePages.length > 0 ? dn.sourcePages : null,
            })),
        );

        const podPageNumbers = this.resolvePodPageNumbers(
          customerResult.podPages,
          customerResult.deliveryNotes,
          note.deliveryNoteNumber,
        );
        if (podPageNumbers.length > 0) {
          await this.rubberDeliveryNoteService.setPodPageNumbers(Number(id), podPageNumbers);
        }

        const currentDnNumber = note.deliveryNoteNumber;
        const matchingDn = customerResult.deliveryNotes.find(
          (dn) => dn.deliveryNoteNumber === currentDnNumber,
        );
        const dnMetadata = matchingDn || customerResult.deliveryNotes[0];

        return {
          deliveryNoteNumber: dnMetadata?.deliveryNoteNumber,
          deliveryDate: dnMetadata?.deliveryDate,
          customerName: dnMetadata?.customerName,
          customerReference: dnMetadata?.customerReference,
          rolls: allRolls,
        };
      } else {
        const pdfText = await (async () => {
          try {
            const pdfData = await pdfParse(pdfBuffer);
            return pdfData.text || "";
          } catch {
            return "";
          }
        })();

        const useOcr = pdfText.length < 50;
        const extractionResult = useOcr
          ? await this.rubberCocExtractionService.extractDeliveryNoteFromImages(
              pdfBuffer,
              correctionHints,
            )
          : await this.rubberCocExtractionService.extractDeliveryNote(pdfText, correctionHints);
        return extractionResult.data;
      }
    })();

    await this.rubberDeliveryNoteService.setExtractedData(Number(id), extractedData);

    const splitResult = await this.rubberDeliveryNoteService.acceptExtractAndSplit(Number(id));

    await Promise.all(
      splitResult.deliveryNoteIds.map((dnId) =>
        this.rubberDeliveryNoteService.autoLinkToSupplierCoc(dnId),
      ),
    );

    const finalNote = await this.rubberDeliveryNoteService.deliveryNoteById(
      splitResult.deliveryNoteIds[0],
    );
    if (!finalNote) throw new NotFoundException("Failed to update delivery note");

    return finalNote;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/extracted-data")
  @ApiOperation({ summary: "Save user corrections to extracted delivery note data" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async saveExtractedDataCorrections(
    @Param("id") id: string,
    @Body() corrections: SaveExtractedDataCorrectionDto,
  ): Promise<RubberDeliveryNoteDto> {
    const updatedNote = await this.rubberDeliveryNoteService.saveUserCorrections(
      Number(id),
      corrections,
    );
    if (!updatedNote) throw new NotFoundException("Delivery note not found");

    return updatedNote;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/accept-extract")
  @ApiOperation({
    summary: "Accept extracted data and split into separate delivery notes if needed",
  })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async acceptDeliveryNoteExtract(@Param("id") id: string): Promise<{ deliveryNoteIds: number[] }> {
    return this.rubberDeliveryNoteService.acceptExtractAndSplit(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/delivery-notes/:id/page/:pageNumber")
  @ApiOperation({ summary: "Get a specific page from delivery note PDF as image" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  @ApiParam({ name: "pageNumber", description: "Page number (1-indexed)" })
  async deliveryNotePageImage(
    @Param("id") id: string,
    @Param("pageNumber") pageNumber: string,
  ): Promise<{ url: string; totalPages: number }> {
    const note = await this.rubberDeliveryNoteService.deliveryNoteById(Number(id));
    if (!note) throw new NotFoundException("Delivery note not found");

    if (!note.documentPath) {
      throw new NotFoundException("Delivery note has no document attached");
    }

    const pageNum = Number(pageNumber);
    if (pageNum < 1) {
      throw new BadRequestException("Page number must be at least 1");
    }

    const documentPath = note.documentPath;
    const images = await this.pdfPageCacheService.pages(documentPath, async () => {
      const pdfBuffer = await this.storageService.download(documentPath);
      return this.rubberCocExtractionService.convertPdfToImages(pdfBuffer);
    });

    if (pageNum > images.length) {
      throw new NotFoundException(`Page ${pageNum} not found. PDF has ${images.length} pages.`);
    }

    const imageBuffer = images[pageNum - 1];
    const base64 = imageBuffer.toString("base64");
    const url = `data:image/png;base64,${base64}`;

    return { url, totalPages: images.length };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/delivery-notes/:id")
  @ApiOperation({ summary: "Delete delivery note" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async deleteDeliveryNote(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberDeliveryNoteService.deleteDeliveryNote(Number(id));
    if (!deleted) throw new NotFoundException("Delivery note not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/document")
  @ApiOperation({ summary: "Replace delivery note document" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async replaceDeliveryNoteDocument(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<RubberDeliveryNoteDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const note = await this.rubberDeliveryNoteService.deliveryNoteById(Number(id));
    if (!note) throw new NotFoundException("Delivery note not found");

    const noteCompany = await this.rubberLiningService.companyById(note.supplierCompanyId);
    const party: AuRubberPartyType =
      noteCompany?.companyType === CompanyType.CUSTOMER ? "customers" : "suppliers";
    const targetPath = auRubberDocumentPath(
      party,
      AuRubberDocumentType.DELIVERY_NOTE,
      note.deliveryNoteNumber,
      file.originalname,
    );
    const subdir = targetPath.substring(0, targetPath.lastIndexOf("/"));
    const upload = await this.storageService.upload(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      } as Express.Multer.File,
      subdir,
    );
    const filePath = upload.path;

    const updated = await this.rubberDeliveryNoteService.updateDocumentPath(Number(id), filePath);
    if (!updated) throw new NotFoundException("Failed to update delivery note");

    return updated;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/analyze")
  @ApiOperation({ summary: "Analyze delivery note photo or PDF using AI" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Photo (JPEG, PNG) or PDF of delivery note",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async analyzeDeliveryNote(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const isAvailable = await this.rubberCocExtractionService.isAvailable();
    if (!isAvailable) {
      throw new NotFoundException(
        "AI extraction service not available - GEMINI_API_KEY not configured",
      );
    }

    const mimeType = file.mimetype.toLowerCase();
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      throw new BadRequestException("File must be an image (JPEG, PNG) or PDF");
    }

    const result = isPdf
      ? await this.rubberCocExtractionService.analyzeDeliveryNotePdf(file.buffer)
      : await this.rubberCocExtractionService.analyzeDeliveryNotePhoto([file.buffer]);

    return {
      success: true,
      data: result.data,
      tokensUsed: result.tokensUsed,
      processingTimeMs: result.processingTimeMs,
    };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/accept-analyzed")
  @ApiOperation({ summary: "Accept analyzed delivery note and create record" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Original photo (JPEG, PNG) or PDF of delivery note",
        },
        analyzedData: {
          type: "string",
          description: "JSON string of analyzed delivery note data",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async acceptAnalyzedDeliveryNote(
    @UploadedFile() file: Express.Multer.File,
    @Body("analyzedData") analyzedDataJson: string,
    @Req() req: AdminRequest,
  ): Promise<RubberDeliveryNoteDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (!analyzedDataJson) {
      throw new BadRequestException("analyzedData field is required");
    }

    const analyzedData: {
      deliveryNoteNumber?: string;
      deliveryDate?: string;
      fromCompany?: { name?: string };
      toCompany?: { name?: string };
      lineItems?: Array<{
        rollNumber?: string;
        thicknessMm?: number;
        widthMm?: number;
        lengthM?: number;
        weightKg?: number;
      }>;
    } = (() => {
      try {
        return JSON.parse(analyzedDataJson);
      } catch {
        throw new BadRequestException("Invalid JSON in analyzedData field");
      }
    })();

    const supplierCompany = await this.rubberDeliveryNoteService.findOrCreateCompanyByName(
      analyzedData.fromCompany?.name || "Unknown Supplier",
      "supplier",
    );

    const extIndex = file.originalname.lastIndexOf(".");
    const ext = extIndex >= 0 ? file.originalname.substring(extIndex) : ".pdf";
    const dnNumber = analyzedData.deliveryNoteNumber ?? `SCAN_${nowMillis()}`;
    const fileName = `${dnNumber}${ext}`;
    const targetPath = auRubberDocumentPath(
      "suppliers",
      AuRubberDocumentType.DELIVERY_NOTE,
      dnNumber,
      fileName,
    );
    const subdir = targetPath.substring(0, targetPath.lastIndexOf("/"));
    const upload = await this.storageService.upload(
      {
        buffer: file.buffer,
        originalname: fileName,
        mimetype: file.mimetype,
      } as Express.Multer.File,
      subdir,
    );
    const filePath = upload.path;

    const deliveryNote = await this.rubberDeliveryNoteService.createDeliveryNote(
      {
        deliveryNoteType: DeliveryNoteType.ROLL,
        deliveryNoteNumber: analyzedData.deliveryNoteNumber ?? `SCAN_${nowMillis()}`,
        deliveryDate: analyzedData.deliveryDate || null,
        supplierCompanyId: supplierCompany.id,
        documentPath: filePath,
      },
      req.user?.email,
    );

    const extractedData = {
      deliveryNoteNumber: analyzedData.deliveryNoteNumber,
      deliveryDate: analyzedData.deliveryDate,
      supplierName: analyzedData.fromCompany?.name,
      customerName: analyzedData.toCompany?.name,
      rolls: analyzedData.lineItems?.map((item, idx) => ({
        rollNumber: item.rollNumber || `ROLL-${idx + 1}`,
        thicknessMm: item.thicknessMm ?? null,
        widthMm: item.widthMm ?? null,
        lengthM: item.lengthM ?? null,
        weightKg: item.weightKg ?? null,
        pageNumber: 1,
      })),
    };

    const updatedNote = await this.rubberDeliveryNoteService.setExtractedData(
      deliveryNote.id,
      extractedData,
    );

    return updatedNote!;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/delivery-notes/:id/items")
  @ApiOperation({ summary: "Get items for a delivery note" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async deliveryNoteItems(@Param("id") id: string) {
    return this.rubberDeliveryNoteService.itemsByDeliveryNoteId(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-stock")
  @ApiOperation({ summary: "List roll stock" })
  @ApiQuery({ name: "status", required: false, enum: RollStockStatus })
  @ApiQuery({ name: "compoundCodingId", required: false })
  @ApiQuery({ name: "soldToCompanyId", required: false })
  async rollStock(
    @Query("status") status?: RollStockStatus,
    @Query("compoundCodingId") compoundCodingId?: string,
    @Query("soldToCompanyId") soldToCompanyId?: string,
  ): Promise<RubberRollStockDto[]> {
    return this.rubberRollStockService.allRollStock({
      status,
      compoundCodingId: compoundCodingId ? Number(compoundCodingId) : undefined,
      soldToCompanyId: soldToCompanyId ? Number(soldToCompanyId) : undefined,
    });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-stock/by-numbers")
  @ApiOperation({ summary: "Lookup rolls by their roll numbers (cost-breakdown display)" })
  async rollsByNumbers(@Query("rollNumbers") rollNumbers: string) {
    if (!rollNumbers) return [];
    const numbers = rollNumbers
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    return this.rubberRollStockService.rollsByNumbers(numbers);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-stock/available")
  @ApiOperation({ summary: "List in-stock rolls for a given product code (CTI roll picker)" })
  async availableRolls(@Query("productCode") productCode: string) {
    if (!productCode) return [];
    return this.rubberRollStockService.availableRollsForProductCode(productCode);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-stock/:id")
  @ApiOperation({ summary: "Get roll stock by ID" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async rollStockById(@Param("id") id: string): Promise<RubberRollStockDto> {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) throw new NotFoundException("Roll stock not found");
    const roll = await this.rubberRollStockService.rollById(numericId);
    if (!roll) throw new NotFoundException("Roll stock not found");
    return roll;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-stock/:id/traceability")
  @ApiOperation({ summary: "Get full traceability for a roll" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async rollTraceability(@Param("id") id: string): Promise<RollTraceabilityDto> {
    const traceability = await this.rubberRollStockService.rollTraceability(Number(id));
    if (!traceability) throw new NotFoundException("Roll stock not found");
    return traceability;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/roll-stock")
  @ApiOperation({ summary: "Create roll stock" })
  async createRollStock(@Body() dto: CreateRollStockDto): Promise<RubberRollStockDto> {
    return this.rubberRollStockService.createRollStock(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/roll-stock/opening-stock")
  @ApiOperation({
    summary: "Create opening stock",
    description: "Create a single roll stock entry for opening stock with cost and selling price",
  })
  async createOpeningStock(@Body() dto: CreateOpeningStockDto): Promise<RubberRollStockDto> {
    return this.rubberRollStockService.createOpeningStock(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/roll-stock/import-opening")
  @ApiOperation({
    summary: "Import opening stock from CSV data",
    description:
      "Bulk import opening stock entries. Expects compound codes (not IDs) which are resolved to IDs.",
  })
  async importOpeningStock(
    @Body() body: { rows: ImportOpeningStockRowDto[] },
  ): Promise<ImportOpeningStockResultDto> {
    return this.rubberRollStockService.importOpeningStock(body.rows);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/roll-stock/:id")
  @ApiOperation({ summary: "Update roll stock" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async updateRollStock(
    @Param("id") id: string,
    @Body() dto: UpdateRollStockDto,
  ): Promise<RubberRollStockDto> {
    const roll = await this.rubberRollStockService.updateRollStock(Number(id), dto);
    if (!roll) throw new NotFoundException("Roll stock not found");
    return roll;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/roll-stock/:id/reserve")
  @ApiOperation({ summary: "Reserve roll for customer" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async reserveRoll(
    @Param("id") id: string,
    @Body() dto: ReserveRollDto,
  ): Promise<RubberRollStockDto> {
    const roll = await this.rubberRollStockService.reserveRoll(Number(id), dto);
    if (!roll) throw new NotFoundException("Roll stock not found");
    return roll;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/roll-stock/:id/unreserve")
  @ApiOperation({ summary: "Unreserve roll" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async unreserveRoll(@Param("id") id: string): Promise<RubberRollStockDto> {
    const roll = await this.rubberRollStockService.unreserveRoll(Number(id));
    if (!roll) throw new NotFoundException("Roll stock not found");
    return roll;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/roll-stock/:id/sell")
  @ApiOperation({ summary: "Sell roll to customer" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async sellRoll(@Param("id") id: string, @Body() dto: SellRollDto): Promise<RubberRollStockDto> {
    const roll = await this.rubberRollStockService.sellRoll(Number(id), dto);
    if (!roll) throw new NotFoundException("Roll stock not found");
    return roll;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/roll-stock/:id")
  @ApiOperation({ summary: "Delete roll stock" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async deleteRollStock(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberRollStockService.deleteRollStock(Number(id));
    if (!deleted) throw new NotFoundException("Roll stock not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/au-cocs")
  @ApiOperation({ summary: "List AU CoCs" })
  @ApiQuery({ name: "status", required: false, enum: AuCocStatus })
  @ApiQuery({ name: "customerCompanyId", required: false })
  async auCocs(
    @Query("status") status?: AuCocStatus,
    @Query("customerCompanyId") customerCompanyId?: string,
  ): Promise<RubberAuCocDto[]> {
    return this.rubberAuCocService.allAuCocs({
      status,
      customerCompanyId: customerCompanyId ? Number(customerCompanyId) : undefined,
    });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/au-cocs/:id")
  @ApiOperation({ summary: "Get AU CoC by ID" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async auCocById(@Param("id") id: string): Promise<RubberAuCocDto> {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) throw new BadRequestException("Invalid AU CoC ID");
    const coc = await this.rubberAuCocService.auCocById(numericId);
    if (!coc) throw new NotFoundException("AU CoC not found");
    return coc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs")
  @ApiOperation({ summary: "Create AU CoC for rolls" })
  async createAuCoc(@Body() dto: CreateAuCocDto): Promise<RubberAuCocDto> {
    return this.rubberAuCocService.createAuCoc(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/:id/generate-pdf")
  @ApiOperation({ summary: "Generate PDF for AU CoC" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async generateAuCocPdf(@Param("id") id: string): Promise<RubberAuCocDto> {
    await this.rubberAuCocService.generatePdf(Number(id));
    const coc = await this.rubberAuCocService.auCocById(Number(id));
    if (!coc) throw new NotFoundException("AU CoC not found");
    return coc;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/au-cocs/:id/pdf")
  @ApiOperation({ summary: "Preview/download AU CoC PDF" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async auCocPdf(@Param("id") id: string, @Res() res: Response): Promise<void> {
    const { buffer, filename } = await this.rubberAuCocService.pdfBuffer(Number(id));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    });
    res.send(buffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/:id/send")
  @ApiOperation({ summary: "Mark AU CoC as sent to customer" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async sendAuCoc(@Param("id") id: string, @Body() dto: SendAuCocDto): Promise<RubberAuCocDto> {
    return this.rubberAuCocService.sendToCustomer(Number(id), dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/bulk-send")
  @ApiOperation({ summary: "Send all generated AU CoCs to customer in one email" })
  async bulkSendAuCocs(
    @Body() dto: SendAuCocDto,
  ): Promise<{ sent: number; total: number; cocNumbers: string[] }> {
    return this.rubberAuCocService.bulkSendToCustomer(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/:id/approve")
  @ApiOperation({ summary: "Approve a GENERATED AU CoC for customer dispatch" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async approveAuCoc(@Param("id") id: string, @Req() req: AdminRequest): Promise<RubberAuCocDto> {
    const approverEmail = req.user?.email ?? "unknown";
    return this.rubberAuCocService.approveAuCoc(Number(id), approverEmail);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/:id/auto-send")
  @ApiOperation({
    summary: "Send an APPROVED AU CoC to the customer's configured recipient email",
  })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async autoSendAuCoc(
    @Param("id") id: string,
    @Body() body: { overrideEmail?: string },
  ): Promise<RubberAuCocDto> {
    return this.rubberAuCocService.sendApprovedAuCocToCustomer(Number(id), body.overrideEmail);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/:id/recheck-readiness")
  @ApiOperation({ summary: "Re-run the upstream-doc readiness check for a single AU CoC" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async recheckAuCocReadiness(@Param("id") id: string) {
    return this.rubberAuCocReadinessService.checkReadiness(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/auto-process-now")
  @ApiOperation({
    summary:
      "Manually trigger the same auto-process job that runs every 3h on cron — re-checks readiness and auto-generates ready AU CoCs",
  })
  async autoProcessAuCocsNow(): Promise<{
    rechecked: number;
    generated: number;
    details: string[];
  }> {
    return this.rubberAuCocReadinessService.runScheduledAutoProcessing();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/au-cocs/:id")
  @ApiOperation({ summary: "Delete AU CoC" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async deleteAuCoc(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberAuCocService.deleteAuCoc(Number(id));
    if (!deleted) throw new NotFoundException("AU CoC not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/auto-create-from-dn")
  @ApiOperation({
    summary: "Auto-create AU CoC from customer delivery note by matching to Impilo COCs",
  })
  async autoCreateAuCocFromDeliveryNote(
    @Body()
    dto: {
      deliveryNoteId: number;
      customerCompanyId: number;
    },
    @Req() req: { user?: { email?: string } },
  ): Promise<{
    auCoc: RubberAuCocDto | null;
    matchedSupplierCocs: { id: number; cocNumber: string | null; orderNumber: string | null }[];
    message: string;
  }> {
    return this.rubberAuCocService.autoCreateFromCustomerDeliveryNote(
      dto.deliveryNoteId,
      dto.customerCompanyId,
      req.user?.email,
    );
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/create-from-delivery-note/:deliveryNoteId")
  @ApiOperation({
    summary: "Create AU CoC directly from delivery note extracted data",
  })
  @ApiParam({ name: "deliveryNoteId", description: "Delivery note ID" })
  async createAuCocFromDeliveryNote(
    @Param("deliveryNoteId") deliveryNoteId: string,
    @Req() req: { user?: { email?: string } },
  ): Promise<RubberAuCocDto> {
    return this.rubberAuCocService.createAuCocFromDeliveryNote(
      Number(deliveryNoteId),
      req.user?.email,
    );
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/au-cocs/:id/pdf-with-graph/:supplierCocId")
  @ApiOperation({ summary: "Get AU CoC PDF with supplier graph attached" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  @ApiParam({ name: "supplierCocId", description: "Supplier COC ID for graph" })
  async auCocPdfWithGraph(
    @Param("id") id: string,
    @Param("supplierCocId") supplierCocId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.rubberAuCocService.generatePdfWithGraph(
      Number(id),
      Number(supplierCocId),
    );
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
    });
    res.send(buffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/au-cocs/pending")
  @ApiOperation({ summary: "List AU CoCs pending generation with readiness details" })
  async pendingAuCocs() {
    const cocs = await this.rubberAuCocService.allAuCocs({ status: "DRAFT" as never });
    const pendingCocs = cocs.filter(
      (coc) =>
        coc.readinessStatus &&
        coc.readinessStatus !== "NOT_TRACKED" &&
        coc.readinessStatus !== "AUTO_GENERATED",
    );
    return pendingCocs;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/au-cocs/:id/readiness")
  @ApiOperation({ summary: "Check AU CoC readiness for auto-generation" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async auCocReadiness(@Param("id") id: string) {
    const result = await this.rubberAuCocReadinessService.checkReadiness(Number(id));
    return {
      ready: result.ready,
      readinessStatus: result.readinessStatus,
      calendererCocId: result.calendererCoc?.id ?? null,
      compounderCocId: result.compounderCoc?.id ?? null,
      graphPdfPath: result.graphPdfPath,
      missingDocuments: result.missingDocuments,
    };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/:id/auto-generate")
  @ApiOperation({ summary: "Manually trigger auto-generation for an AU CoC" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async autoGenerateAuCoc(@Param("id") id: string) {
    return this.rubberAuCocReadinessService.autoGenerateAuCoc(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/bulk-auto-generate")
  @ApiOperation({ summary: "Bulk auto-generate all draft AU CoCs that are ready" })
  async bulkAutoGenerateAuCocs() {
    return this.rubberAuCocReadinessService.bulkAutoGenerateAllDraftAuCocs();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/au-cocs/bulk-regenerate")
  @ApiOperation({ summary: "Regenerate all previously generated AU CoCs" })
  async bulkRegenerateAuCocs() {
    return this.rubberAuCocService.regenerateAllGeneratedCocs();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/coc-statuses")
  @ApiOperation({ summary: "List CoC processing statuses" })
  async cocStatuses(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "PENDING", label: "Pending" },
      { value: "EXTRACTED", label: "Extracted" },
      { value: "NEEDS_REVIEW", label: "Needs Review" },
      { value: "APPROVED", label: "Approved" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-stock-statuses")
  @ApiOperation({ summary: "List roll stock statuses" })
  async rollStockStatuses(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "IN_STOCK", label: "In Stock" },
      { value: "RESERVED", label: "Reserved" },
      { value: "SOLD", label: "Sold" },
      { value: "SCRAPPED", label: "Scrapped" },
      { value: "REJECTED", label: "Rejected" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/au-coc-statuses")
  @ApiOperation({ summary: "List AU CoC statuses" })
  async auCocStatuses(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "DRAFT", label: "Draft" },
      { value: "GENERATED", label: "Generated" },
      { value: "SENT", label: "Sent" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/stock-locations")
  @ApiOperation({ summary: "List stock locations" })
  @ApiQuery({ name: "includeInactive", required: false, type: Boolean })
  async stockLocations(
    @Query("includeInactive") includeInactive?: string,
  ): Promise<StockLocationDto[]> {
    return this.rubberStockLocationService.allLocations(includeInactive === "true");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/stock-locations/:id")
  @ApiOperation({ summary: "Get stock location by ID" })
  @ApiParam({ name: "id", description: "Stock location ID" })
  async stockLocationById(@Param("id") id: string): Promise<StockLocationDto> {
    return this.rubberStockLocationService.locationById(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/stock-locations")
  @ApiOperation({ summary: "Create stock location" })
  async createStockLocation(
    @Body() body: { name: string; description?: string; displayOrder?: number },
  ): Promise<StockLocationDto> {
    return this.rubberStockLocationService.createLocation(body);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/stock-locations/:id")
  @ApiOperation({ summary: "Update stock location" })
  @ApiParam({ name: "id", description: "Stock location ID" })
  async updateStockLocation(
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string; displayOrder?: number; active?: boolean },
  ): Promise<StockLocationDto> {
    return this.rubberStockLocationService.updateLocation(Number(id), body);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/stock-locations/:id")
  @ApiOperation({ summary: "Delete stock location" })
  @ApiParam({ name: "id", description: "Stock location ID" })
  async deleteStockLocation(@Param("id") id: string): Promise<void> {
    await this.rubberStockLocationService.deleteLocation(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/purchase-requisitions")
  @ApiOperation({ summary: "List purchase requisitions" })
  @ApiQuery({ name: "status", required: false, enum: RequisitionStatus })
  @ApiQuery({ name: "sourceType", required: false, enum: RequisitionSourceType })
  async purchaseRequisitions(
    @Query("status") status?: RequisitionStatus,
    @Query("sourceType") sourceType?: RequisitionSourceType,
  ): Promise<RequisitionDto[]> {
    return this.rubberRequisitionService.allRequisitions({ status, sourceType });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/purchase-requisitions/pending")
  @ApiOperation({ summary: "List requisitions pending approval" })
  async pendingRequisitions(): Promise<RequisitionDto[]> {
    return this.rubberRequisitionService.pendingApprovals();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/purchase-requisitions/:id")
  @ApiOperation({ summary: "Get purchase requisition by ID" })
  @ApiParam({ name: "id", description: "Purchase requisition ID" })
  async purchaseRequisitionById(@Param("id") id: string): Promise<RequisitionDto> {
    return this.rubberRequisitionService.requisitionById(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/purchase-requisitions")
  @ApiOperation({ summary: "Create manual purchase requisition" })
  async createManualRequisition(
    @Body()
    body: {
      supplierCompanyId?: number;
      externalPoNumber?: string;
      expectedDeliveryDate?: string;
      notes?: string;
      createdBy?: string;
      items: {
        itemType: RequisitionItemType;
        compoundStockId?: number;
        compoundCodingId?: number;
        compoundName?: string;
        quantityKg: number;
        unitPrice?: number;
        notes?: string;
      }[];
    },
  ): Promise<RequisitionDto> {
    return this.rubberRequisitionService.createManualRequisition(body);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/purchase-requisitions/external-po")
  @ApiOperation({ summary: "Create requisition from external PO" })
  async createExternalPoRequisition(
    @Body()
    body: {
      supplierCompanyId?: number;
      externalPoNumber: string;
      externalPoDocumentPath?: string;
      expectedDeliveryDate?: string;
      notes?: string;
      createdBy?: string;
      items: {
        itemType: RequisitionItemType;
        compoundStockId?: number;
        compoundCodingId?: number;
        compoundName?: string;
        quantityKg: number;
        unitPrice?: number;
        notes?: string;
      }[];
    },
  ): Promise<RequisitionDto> {
    return this.rubberRequisitionService.createExternalPoRequisition(body);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/purchase-requisitions/check-low-stock")
  @ApiOperation({ summary: "Check and create requisitions for low stock items" })
  async checkLowStockRequisitions(): Promise<RequisitionDto[]> {
    return this.rubberRequisitionService.checkAndCreateLowStockRequisitions();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/purchase-requisitions/:id/approve")
  @ApiOperation({ summary: "Approve purchase requisition" })
  @ApiParam({ name: "id", description: "Purchase requisition ID" })
  async approveRequisition(
    @Param("id") id: string,
    @Body() body: { approvedBy: string },
  ): Promise<RequisitionDto> {
    return this.rubberRequisitionService.approveRequisition(Number(id), body.approvedBy);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/purchase-requisitions/:id/reject")
  @ApiOperation({ summary: "Reject purchase requisition" })
  @ApiParam({ name: "id", description: "Purchase requisition ID" })
  async rejectRequisition(
    @Param("id") id: string,
    @Body() body: { rejectedBy: string; reason: string },
  ): Promise<RequisitionDto> {
    return this.rubberRequisitionService.rejectRequisition(
      Number(id),
      body.rejectedBy,
      body.reason,
    );
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/purchase-requisitions/:id/mark-ordered")
  @ApiOperation({ summary: "Mark requisition as ordered" })
  @ApiParam({ name: "id", description: "Purchase requisition ID" })
  async markRequisitionOrdered(
    @Param("id") id: string,
    @Body() body: { externalPoNumber?: string; expectedDeliveryDate?: string },
  ): Promise<RequisitionDto> {
    return this.rubberRequisitionService.markAsOrdered(Number(id), body);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/purchase-requisitions/:id/receive")
  @ApiOperation({ summary: "Receive items for requisition" })
  @ApiParam({ name: "id", description: "Purchase requisition ID" })
  async receiveRequisitionItems(
    @Param("id") id: string,
    @Body() body: { itemReceipts: { itemId: number; quantityReceivedKg: number }[] },
  ): Promise<RequisitionDto> {
    return this.rubberRequisitionService.receiveItems(Number(id), body.itemReceipts);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/purchase-requisitions/:id/cancel")
  @ApiOperation({ summary: "Cancel purchase requisition" })
  @ApiParam({ name: "id", description: "Purchase requisition ID" })
  async cancelRequisition(@Param("id") id: string): Promise<RequisitionDto> {
    return this.rubberRequisitionService.cancelRequisition(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/requisition-statuses")
  @ApiOperation({ summary: "List requisition statuses" })
  async requisitionStatuses(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "PENDING", label: "Pending Approval" },
      { value: "APPROVED", label: "Approved" },
      { value: "ORDERED", label: "Ordered" },
      { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
      { value: "RECEIVED", label: "Received" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/requisition-source-types")
  @ApiOperation({ summary: "List requisition source types" })
  async requisitionSourceTypes(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "LOW_STOCK", label: "Low Stock Alert" },
      { value: "MANUAL", label: "Manual Request" },
      { value: "EXTERNAL_PO", label: "External PO" },
    ];
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/quality-tracking")
  @ApiOperation({ summary: "Get quality summary for all compounds" })
  async qualityTrackingSummary(): Promise<CompoundQualitySummaryDto[]> {
    return this.rubberQualityTrackingService.qualitySummaryByCompound();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/quality-tracking/:compoundCode")
  @ApiOperation({ summary: "Get detailed quality metrics for a compound" })
  @ApiParam({ name: "compoundCode", description: "Compound code" })
  async qualityTrackingDetail(
    @Param("compoundCode") compoundCode: string,
  ): Promise<CompoundQualityDetailDto> {
    const detail = await this.rubberQualityTrackingService.qualityDetailForCompound(compoundCode);
    if (!detail) throw new NotFoundException("Compound not found or no batch data");
    return detail;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/quality-alerts")
  @ApiOperation({ summary: "Get all active quality alerts" })
  async qualityAlerts(): Promise<QualityAlertDto[]> {
    return this.rubberQualityTrackingService.activeAlerts();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/quality-alerts/:id/acknowledge")
  @ApiOperation({ summary: "Acknowledge a quality alert" })
  @ApiParam({ name: "id", description: "Alert ID" })
  async acknowledgeQualityAlert(
    @Param("id") id: string,
    @Body() dto: AcknowledgeAlertDto,
  ): Promise<QualityAlertDto> {
    const alert = await this.rubberQualityTrackingService.acknowledgeAlert(
      Number(id),
      dto.acknowledgedBy,
    );
    if (!alert) throw new NotFoundException("Alert not found");
    return alert;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/quality-configs")
  @ApiOperation({ summary: "Get quality threshold configurations for all compounds" })
  async qualityConfigs(): Promise<QualityConfigDto[]> {
    return this.rubberQualityTrackingService.allConfigs();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/quality-configs/:compoundCode")
  @ApiOperation({ summary: "Update quality threshold configuration for a compound" })
  @ApiParam({ name: "compoundCode", description: "Compound code" })
  async updateQualityConfig(
    @Param("compoundCode") compoundCode: string,
    @Body() dto: UpdateQualityConfigDto,
    @Req() req: AdminRequest,
  ): Promise<QualityConfigDto> {
    const user = req.user;
    const updatedBy = user?.email || "unknown";
    return this.rubberQualityTrackingService.updateConfig(compoundCode, dto, updatedBy);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/other-stocks")
  @ApiOperation({ summary: "List other stock items" })
  @ApiQuery({ name: "includeInactive", required: false, type: Boolean })
  async otherStocks(
    @Query("includeInactive") includeInactive?: string,
  ): Promise<RubberOtherStockDto[]> {
    return this.rubberOtherStockService.allOtherStocks(includeInactive === "true");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/other-stocks/low")
  @ApiOperation({ summary: "List low stock items" })
  async lowStockItems(): Promise<RubberOtherStockDto[]> {
    return this.rubberOtherStockService.lowStockItems();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/other-stocks/:id")
  @ApiOperation({ summary: "Get other stock item by ID" })
  @ApiParam({ name: "id", description: "Other stock ID" })
  async otherStockById(@Param("id") id: string): Promise<RubberOtherStockDto> {
    const stock = await this.rubberOtherStockService.otherStockById(Number(id));
    if (!stock) throw new NotFoundException("Other stock item not found");
    return stock;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/other-stocks")
  @ApiOperation({ summary: "Create other stock item" })
  async createOtherStock(@Body() dto: CreateOtherStockDto): Promise<RubberOtherStockDto> {
    return this.rubberOtherStockService.createOtherStock(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/other-stocks/:id")
  @ApiOperation({ summary: "Update other stock item" })
  @ApiParam({ name: "id", description: "Other stock ID" })
  async updateOtherStock(
    @Param("id") id: string,
    @Body() dto: UpdateOtherStockDto,
  ): Promise<RubberOtherStockDto> {
    const stock = await this.rubberOtherStockService.updateOtherStock(Number(id), dto);
    if (!stock) throw new NotFoundException("Other stock item not found");
    return stock;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/other-stocks/:id")
  @ApiOperation({ summary: "Delete other stock item" })
  @ApiParam({ name: "id", description: "Other stock ID" })
  async deleteOtherStock(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberOtherStockService.deleteOtherStock(Number(id));
    if (!deleted) throw new NotFoundException("Other stock item not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/other-stocks/receive")
  @ApiOperation({ summary: "Receive stock for an item" })
  async receiveOtherStock(@Body() dto: ReceiveOtherStockDto): Promise<RubberOtherStockDto> {
    return this.rubberOtherStockService.receiveOtherStock(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/other-stocks/adjust")
  @ApiOperation({ summary: "Adjust stock quantity for an item" })
  async adjustOtherStock(@Body() dto: AdjustOtherStockDto): Promise<RubberOtherStockDto> {
    return this.rubberOtherStockService.adjustOtherStock(dto);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/other-stocks/import")
  @ApiOperation({ summary: "Bulk import other stock items" })
  async importOtherStock(
    @Body() rows: ImportOtherStockRowDto[],
  ): Promise<ImportOtherStockResultDto> {
    return this.rubberOtherStockService.importOtherStock(rows);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices")
  @ApiOperation({ summary: "List tax invoices (paginated)" })
  @ApiQuery({ name: "invoiceType", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "companyId", required: false })
  @ApiQuery({ name: "includeAllVersions", required: false })
  @ApiQuery({ name: "isCreditNote", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "sortColumn", required: false })
  @ApiQuery({ name: "sortDirection", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  async taxInvoices(
    @Query("invoiceType") invoiceType?: TaxInvoiceType,
    @Query("status") status?: TaxInvoiceStatus,
    @Query("companyId") companyId?: string,
    @Query("includeAllVersions") includeAllVersions?: string,
    @Query("isCreditNote") isCreditNote?: string,
    @Query("search") search?: string,
    @Query("sortColumn") sortColumn?: string,
    @Query("sortDirection") sortDirection?: "asc" | "desc",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<PaginatedResult<RubberTaxInvoiceDto>> {
    return this.rubberTaxInvoiceService.paginatedTaxInvoices({
      invoiceType,
      status,
      companyId: companyId ? Number(companyId) : undefined,
      includeAllVersions: includeAllVersions === "true",
      isCreditNote: isCreditNote != null ? isCreditNote === "true" : undefined,
      search,
      sortColumn,
      sortDirection,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices/statements")
  @ApiOperation({
    summary: "Aggregated tax invoice statements grouped by company",
    description:
      "Returns one row per company with invoice count + total + VAT totals. Used by the Companies > Statements page so the frontend doesn't have to fetch every invoice and aggregate client-side.",
  })
  @ApiQuery({ name: "invoiceType", required: true, enum: TaxInvoiceType })
  async taxInvoiceStatements(@Query("invoiceType") invoiceType: TaxInvoiceType) {
    return this.rubberTaxInvoiceService.companyStatements({ invoiceType });
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices/export/sage-preview")
  @ApiOperation({ summary: "Preview Sage CSV export" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  @ApiQuery({ name: "invoiceId", required: false })
  async sageExportPreview(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("excludeExported") excludeExported?: string,
    @Query("invoiceId") invoiceId?: string,
  ): Promise<{ invoiceCount: number; lineItemCount: number; totalAmount: number }> {
    const context = { companyId: null, appKey: "au-rubber" };
    const preview = await this.rubberSageAdapterService.previewCount(
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        excludeExported: excludeExported !== "false",
        invoiceId: invoiceId ? Number(invoiceId) : undefined,
      },
      context,
    );
    return {
      invoiceCount: preview.count,
      lineItemCount: preview.lineItemCount,
      totalAmount: preview.totalAmount,
    };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices/export/sage-csv")
  @ApiOperation({ summary: "Download Sage CSV export" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  @ApiQuery({ name: "invoiceId", required: false })
  async sageExportCsv(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("excludeExported") excludeExported?: string,
    @Query("invoiceId") invoiceId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const context = { companyId: null, appKey: "au-rubber" };
    const filters: SageExportFilterDto = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      excludeExported: excludeExported !== "false",
      invoiceId: invoiceId ? Number(invoiceId) : undefined,
    };

    const { invoices, entityIds } = await this.rubberSageAdapterService.exportableInvoices(
      filters,
      context,
    );
    const csvBuffer = this.sageExportService.generateCsv(invoices);

    await this.rubberSageAdapterService.markExported(entityIds, context);

    res!.set({
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=sage-invoices.csv",
      "Content-Length": csvBuffer.length,
    });
    res!.send(csvBuffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices/:id/extract")
  @ApiOperation({ summary: "Extract data from tax invoice document using AI" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async extractTaxInvoice(@Param("id") id: string): Promise<RubberTaxInvoiceDto> {
    const invoice = await this.rubberTaxInvoiceService.taxInvoiceById(Number(id));
    if (!invoice) throw new NotFoundException("Tax invoice not found");

    if (!invoice.documentPath) {
      throw new NotFoundException("Tax invoice has no document attached");
    }

    const isAvailable = await this.rubberCocExtractionService.isAvailable();
    if (!isAvailable) {
      throw new NotFoundException(
        "AI extraction service not available - GEMINI_API_KEY not configured",
      );
    }

    const docBuffer = await this.storageService.download(invoice.documentPath);
    const ext = invoice.documentPath.split(".").pop()?.toLowerCase() || "";

    const correctionHints = await this.rubberTaxInvoiceService.correctionHintsForSupplier(
      invoice.companyName,
    );

    const isCreditNote = invoice.isCreditNote;
    const invoiceType = invoice.invoiceType;
    const extractText = (text: string) =>
      isCreditNote
        ? this.rubberCocExtractionService.extractCreditNote(text, correctionHints)
        : this.rubberCocExtractionService.extractTaxInvoice(text, correctionHints, invoiceType);
    const extractImages = (buffer: Buffer) =>
      isCreditNote
        ? this.rubberCocExtractionService.extractCreditNoteFromImages(buffer, correctionHints)
        : this.rubberCocExtractionService.extractTaxInvoiceFromImages(
            buffer,
            correctionHints,
            invoiceType,
          );

    const extractionResult: {
      data: import("./entities/rubber-tax-invoice.entity").ExtractedTaxInvoiceData;
      invoices?: import("./entities/rubber-tax-invoice.entity").ExtractedTaxInvoiceData[];
      tokensUsed?: number;
      processingTimeMs: number;
    } = await (async () => {
      if (ext === "docx" || ext === "doc") {
        const textResult = await mammoth.extractRawText({ buffer: docBuffer });
        const docText = textResult.value || "";
        if (docText.length < 20) {
          throw new BadRequestException("Word document appears to be empty or unreadable");
        }
        return extractText(docText);
      } else if (ext === "xlsx" || ext === "xls") {
        const workbook = XLSX.read(docBuffer, { type: "buffer" });
        const sheetTexts = workbook.SheetNames.map((name: string) => {
          const sheet = workbook.Sheets[name];
          return XLSX.utils.sheet_to_csv(sheet);
        });
        const excelText = sheetTexts.join("\n\n");
        if (excelText.length < 20) {
          throw new BadRequestException("Excel document appears to be empty or unreadable");
        }
        return extractText(excelText);
      } else {
        return extractImages(docBuffer);
      }
    })();

    const detectedInvoices = extractionResult.invoices ?? [extractionResult.data];
    if (!isCreditNote && detectedInvoices.length > 1) {
      const splitResult = await this.rubberTaxInvoiceService.splitTaxInvoiceExtraction(
        Number(id),
        detectedInvoices,
      );
      this.logger.log(
        `Manual re-extract split tax invoice ${id} into ${splitResult.taxInvoiceIds.length} invoices: ${splitResult.taxInvoiceIds.join(", ")}`,
      );
      const updated = await this.rubberTaxInvoiceService.taxInvoiceById(Number(id));
      if (!updated) throw new NotFoundException("Failed to update tax invoice");
      return updated;
    }

    const updated = await this.rubberTaxInvoiceService.setExtractedData(
      Number(id),
      extractionResult.data,
    );
    if (!updated) throw new NotFoundException("Failed to update tax invoice");

    return updated;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices/re-extract-all")
  @ApiOperation({ summary: "Re-extract all tax invoices with documents using Vision AI" })
  @ApiQuery({ name: "invoiceType", enum: TaxInvoiceType, required: false })
  async reExtractAllTaxInvoices(
    @Query("invoiceType") invoiceTypeQuery?: string,
  ): Promise<{ triggered: number; invoiceIds: number[]; startedAt: string }> {
    const invoiceType =
      invoiceTypeQuery === TaxInvoiceType.CUSTOMER
        ? TaxInvoiceType.CUSTOMER
        : TaxInvoiceType.SUPPLIER;

    const allInvoices = await this.rubberTaxInvoiceService.allTaxInvoices({
      invoiceType,
      isCreditNote: false,
    });

    const withDocuments = allInvoices.filter(
      (inv) => inv.documentPath && inv.status !== TaxInvoiceStatus.APPROVED,
    );
    const startedAt = nowISO();
    const logger = this.logger;
    const storageService = this.storageService;
    const orchestrator = this.extractionOrchestratorService;
    const taxInvoiceService = this.rubberTaxInvoiceService;
    const cocExtractionService = this.rubberCocExtractionService;

    const byDocPath = withDocuments.reduce((map, inv) => {
      const list = map.get(inv.documentPath!) ?? [];
      return new Map(map).set(inv.documentPath!, [...list, inv]);
    }, new Map<string, typeof withDocuments>());

    (async () => {
      const groups = Array.from(byDocPath.entries());
      const concurrency = 3;
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (true) {
          const idx = cursor;
          cursor += 1;
          if (idx >= groups.length) return;
          const [path, invoicesAtPath] = groups[idx];
          try {
            if (invoicesAtPath.length === 1) {
              const inv = invoicesAtPath[0];
              const docBuffer = await storageService.download(path);
              orchestrator.triggerTaxInvoiceExtraction(inv.id, docBuffer, path, inv.companyName);
              logger.log(
                `Triggered re-extraction for ${invoiceType} tax invoice ${inv.id} (${inv.invoiceNumber}) — single-PDF`,
              );
              continue;
            }
            const docBuffer = await storageService.download(path);
            const correctionHints = invoicesAtPath[0].companyName
              ? await taxInvoiceService.correctionHintsForSupplier(invoicesAtPath[0].companyName)
              : null;
            const extractionResult = await cocExtractionService.extractTaxInvoiceFromImages(
              docBuffer,
              correctionHints,
              invoiceType,
            );
            const invoices = extractionResult.invoices ?? [extractionResult.data];
            await Promise.all(
              invoicesAtPath.map((inv) =>
                taxInvoiceService.splitTaxInvoiceExtraction(inv.id, invoices, docBuffer),
              ),
            );
            logger.log(
              `Batched re-extract: ${invoicesAtPath.length} ${invoiceType} invoices sharing ${path} processed via 1 Gemini call (${extractionResult.processingTimeMs}ms) + parallel per-invoice slicing`,
            );
          } catch (err) {
            logger.error(
              `Failed batched re-extract for ${path}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      };
      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      logger.log(
        `Bulk re-extraction complete (${invoiceType}): ${withDocuments.length} invoices across ${byDocPath.size} unique PDF(s)`,
      );
    })();

    return {
      triggered: withDocuments.length,
      invoiceIds: withDocuments.map((inv) => inv.id),
      startedAt,
    };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/dedupe")
  @ApiOperation({
    summary: "Delete duplicate delivery notes (same DN number + supplier), keeping the oldest",
  })
  async dedupeDeliveryNotes(): Promise<{ deleted: number; kept: number; groups: number }> {
    const allNotes = await this.rubberDeliveryNoteService.allDeliveryNotes();
    const activeNotes = allNotes.filter((n) => n.versionStatus === "ACTIVE");

    const groups = activeNotes.reduce((map, note) => {
      const dnNumber = note.deliveryNoteNumber;
      if (!dnNumber || /^DN-\d+$/.test(dnNumber)) return map;
      const key = `${dnNumber}|${note.supplierCompanyId}`;
      const list = map.get(key) ?? [];
      return new Map(map).set(key, [...list, note]);
    }, new Map<string, typeof activeNotes>());

    const dedupeResult = await Array.from(groups.values()).reduce(
      async (accPromise, group) => {
        const acc = await accPromise;
        if (group.length <= 1) {
          return { ...acc, kept: acc.kept + group.length };
        }
        const sorted = [...group].sort((a, b) => a.id - b.id);
        const dupIds = sorted.slice(1).map((n) => n.id);
        await dupIds.reduce(
          (chain, dupId) =>
            chain.then(async () => {
              await this.rubberDeliveryNoteService.deleteDeliveryNote(dupId);
              this.logger.log(`Deduped delivery note ${dupId} (kept #${sorted[0].id})`);
            }),
          Promise.resolve(),
        );
        return { kept: acc.kept + 1, deleted: acc.deleted + dupIds.length };
      },
      Promise.resolve({ deleted: 0, kept: 0 }),
    );

    return { ...dedupeResult, groups: groups.size };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/admin/re-extract-ctis-missing-rolls")
  @ApiOperation({
    summary:
      "Re-extract customer tax invoices whose extracted_data has line items with no rolls[] array (Gemini missed them on the first pass)",
  })
  async reExtractCtisMissingRolls(): Promise<{
    triggered: number;
    invoiceIds: number[];
  }> {
    const allInvoices = await this.rubberTaxInvoiceService.allTaxInvoices({
      invoiceType: TaxInvoiceType.CUSTOMER,
      isCreditNote: false,
    });
    const candidates = allInvoices.filter((inv) => {
      if (!inv.documentPath) return false;
      if (inv.status === TaxInvoiceStatus.APPROVED) return false;
      if (inv.versionStatus !== "ACTIVE") return false;
      const lineItems = inv.extractedData?.lineItems;
      if (!lineItems || lineItems.length === 0) return false;
      return lineItems.some((li) => !Array.isArray(li.rolls) || li.rolls.length === 0);
    });
    if (candidates.length === 0) {
      return { triggered: 0, invoiceIds: [] };
    }
    for (const inv of candidates) {
      try {
        const docBuffer = await this.storageService.download(inv.documentPath!);
        this.extractionOrchestratorService.triggerTaxInvoiceExtraction(
          inv.id,
          docBuffer,
          inv.documentPath!,
          inv.companyName,
        );
        this.logger.log(
          `Re-triggered extraction for incomplete CTI ${inv.id} (${inv.invoiceNumber})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to re-trigger extraction for CTI ${inv.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { triggered: candidates.length, invoiceIds: candidates.map((inv) => inv.id) };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/admin/rematch-rolls")
  @ApiOperation({
    summary:
      "Re-run roll dispatch across all customer-side documents and clean up prefix-suffix orphan placeholder rolls",
  })
  async rematchAllRolls(): Promise<{
    customerInvoicesDispatched: number;
    customerDeliveryNotesDispatched: number;
    orphansDeleted: number;
    orphansMerged: number;
  }> {
    const allInvoices = await this.rubberTaxInvoiceService.allTaxInvoices({
      invoiceType: TaxInvoiceType.CUSTOMER,
      isCreditNote: false,
    });
    const eligibleInvoices = allInvoices.filter(
      (inv) => inv.extractedData != null && inv.versionStatus === "ACTIVE",
    );
    let customerInvoicesDispatched = 0;
    for (const invDto of eligibleInvoices) {
      const invoice = await this.rubberTaxInvoiceService.taxInvoiceEntityById(invDto.id);
      if (!invoice) continue;
      try {
        await this.rubberTaxInvoiceService.dispatchCustomerRollsToStock(invoice);
        customerInvoicesDispatched += 1;
      } catch (err) {
        this.logger.error(
          `Rematch failed for CTI ${invoice.invoiceNumber} (#${invoice.id}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const allDns = await this.rubberDeliveryNoteService.allDeliveryNotes();
    const allCompanies = await this.rubberLiningService.allCompanies();
    const customerCompanyIds = new Set(
      allCompanies.filter((c) => c.companyType === CompanyType.CUSTOMER).map((c) => c.id),
    );
    const eligibleDns = allDns.filter(
      (dn) =>
        customerCompanyIds.has(dn.supplierCompanyId) &&
        dn.versionStatus === "ACTIVE" &&
        dn.extractedData != null,
    );
    let customerDeliveryNotesDispatched = 0;
    for (const dn of eligibleDns) {
      try {
        await this.extractionOrchestratorService.dispatchRollsForDeliveryNote(dn.id);
        customerDeliveryNotesDispatched += 1;
      } catch (err) {
        this.logger.error(
          `Rematch failed for CDN ${dn.deliveryNoteNumber} (#${dn.id}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const cleanup = await this.rubberRollStockService.cleanupPrefixedOrphanRolls();

    this.logger.log(
      `Rematch complete: ${customerInvoicesDispatched} CTIs, ${customerDeliveryNotesDispatched} CDNs, deleted ${cleanup.deleted} orphan(s), merged ${cleanup.merged}`,
    );

    return {
      customerInvoicesDispatched,
      customerDeliveryNotesDispatched,
      orphansDeleted: cleanup.deleted,
      orphansMerged: cleanup.merged,
    };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices/dedupe")
  @ApiOperation({
    summary:
      "Delete duplicate tax invoices (same invoice number + company + type), keeping the oldest",
  })
  async dedupeTaxInvoices(): Promise<{ deleted: number; kept: number; groups: number }> {
    const allInvoices = await this.rubberTaxInvoiceService.allTaxInvoices({
      includeAllVersions: false,
    });

    const groups = allInvoices.reduce((map, inv) => {
      const invNumber = inv.invoiceNumber;
      if (!invNumber || /^SCAN_/i.test(invNumber)) return map;
      const key = `${invNumber}|${inv.companyId}|${inv.invoiceType}`;
      const list = map.get(key) ?? [];
      return new Map(map).set(key, [...list, inv]);
    }, new Map<string, typeof allInvoices>());

    const dedupeResult = await Array.from(groups.values()).reduce(
      async (accPromise, group) => {
        const acc = await accPromise;
        if (group.length <= 1) {
          return { ...acc, kept: acc.kept + group.length };
        }
        const sorted = [...group].sort((a, b) => a.id - b.id);
        const dupIds = sorted.slice(1).map((n) => n.id);
        await dupIds.reduce(
          (chain, dupId) =>
            chain.then(async () => {
              await this.rubberTaxInvoiceService.deleteTaxInvoice(dupId);
              this.logger.log(`Deduped tax invoice ${dupId} (kept #${sorted[0].id})`);
            }),
          Promise.resolve(),
        );
        return { kept: acc.kept + 1, deleted: acc.deleted + dupIds.length };
      },
      Promise.resolve({ deleted: 0, kept: 0 }),
    );

    return { ...dedupeResult, groups: groups.size };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/delivery-notes/re-extract-all")
  @ApiOperation({ summary: "Re-extract all delivery notes with documents using Vision AI" })
  @ApiQuery({ name: "partyType", enum: ["SUPPLIER", "CUSTOMER"], required: false })
  async reExtractAllDeliveryNotes(
    @Query("partyType") partyTypeQuery?: string,
  ): Promise<{ triggered: number; deliveryNoteIds: number[]; startedAt: string }> {
    const partyType = partyTypeQuery === "CUSTOMER" ? "CUSTOMER" : "SUPPLIER";

    const allNotes = await this.rubberDeliveryNoteService.allDeliveryNotes();
    const allCompanies = await this.rubberLiningService.allCompanies();
    const matchingCompanyIds = new Set(
      allCompanies.filter((c) => c.companyType === partyType).map((c) => c.id),
    );

    const withDocuments = allNotes.filter(
      (note) =>
        note.documentPath &&
        matchingCompanyIds.has(note.supplierCompanyId) &&
        (note.status === DeliveryNoteStatus.PENDING ||
          note.status === DeliveryNoteStatus.EXTRACTED),
    );
    const startedAt = nowISO();
    const logger = this.logger;
    const storageService = this.storageService;
    const orchestrator = this.extractionOrchestratorService;
    const cocExtractionService = this.rubberCocExtractionService;
    const deliveryNoteService = this.rubberDeliveryNoteService;

    const byDocPath = withDocuments.reduce((map, note) => {
      const list = map.get(note.documentPath!) ?? [];
      return new Map(map).set(note.documentPath!, [...list, note]);
    }, new Map<string, typeof withDocuments>());

    (async () => {
      const groups = Array.from(byDocPath.entries());
      const concurrency = 3;
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (true) {
          const idx = cursor;
          cursor += 1;
          if (idx >= groups.length) return;
          const [path, notesAtPath] = groups[idx];
          try {
            if (notesAtPath.length === 1) {
              const note = notesAtPath[0];
              const docBuffer = await storageService.download(path);
              orchestrator.triggerDeliveryNoteExtraction(note.id, docBuffer, note.deliveryNoteType);
              logger.log(
                `Triggered re-extraction for ${partyType} delivery note ${note.id} (${note.deliveryNoteNumber}) — single-PDF`,
              );
              continue;
            }
            const docBuffer = await storageService.download(path);
            const isRoll = notesAtPath.every((n) => n.deliveryNoteType === "ROLL");
            if (!isRoll) {
              await Promise.all(
                notesAtPath.map((note) =>
                  Promise.resolve().then(() =>
                    orchestrator.triggerDeliveryNoteExtraction(
                      note.id,
                      docBuffer,
                      note.deliveryNoteType,
                    ),
                  ),
                ),
              );
              logger.log(
                `Triggered re-extraction for ${notesAtPath.length} ${partyType} compound DNs sharing ${path}`,
              );
              continue;
            }
            const correctionHints = notesAtPath[0].supplierCompanyName
              ? await deliveryNoteService.correctionHintsForDnSupplier(
                  notesAtPath[0].supplierCompanyName,
                )
              : null;
            const customerResult = await cocExtractionService.extractCustomerDeliveryNoteFromImages(
              docBuffer,
              correctionHints,
            );
            await Promise.all(
              notesAtPath.map((note) =>
                Promise.resolve().then(() =>
                  orchestrator.triggerDeliveryNoteExtraction(
                    note.id,
                    docBuffer,
                    note.deliveryNoteType,
                    customerResult,
                  ),
                ),
              ),
            );
            logger.log(
              `Batched re-extract: ${notesAtPath.length} ${partyType} roll DNs sharing ${path} processed via 1 Gemini call (${customerResult.processingTimeMs}ms)`,
            );
          } catch (err) {
            logger.error(
              `Failed batched re-extract for ${path}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      };
      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      logger.log(
        `Bulk delivery-note re-extraction complete (${partyType}): ${withDocuments.length} notes across ${byDocPath.size} unique PDF(s)`,
      );
    })();

    return {
      triggered: withDocuments.length,
      deliveryNoteIds: withDocuments.map((n) => n.id),
      startedAt,
    };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices/:id")
  @ApiOperation({ summary: "Get tax invoice by ID" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async taxInvoiceById(@Param("id") id: string): Promise<RubberTaxInvoiceDto> {
    const invoice = await this.rubberTaxInvoiceService.taxInvoiceById(Number(id));
    if (!invoice) throw new NotFoundException("Tax invoice not found");
    return invoice;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices")
  @ApiOperation({ summary: "Create tax invoice" })
  async createTaxInvoice(
    @Body() dto: CreateTaxInvoiceDto,
    @Req() req: AdminRequest,
  ): Promise<RubberTaxInvoiceDto> {
    const user = req.user;
    return this.rubberTaxInvoiceService.createTaxInvoice(dto, user?.email);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id")
  @ApiOperation({ summary: "Update tax invoice" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async updateTaxInvoice(
    @Param("id") id: string,
    @Body() dto: UpdateTaxInvoiceDto,
  ): Promise<RubberTaxInvoiceDto> {
    const invoice = await this.rubberTaxInvoiceService.updateTaxInvoice(Number(id), dto);
    if (!invoice) throw new NotFoundException("Tax invoice not found");
    return invoice;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id/approve")
  @ApiOperation({ summary: "Approve tax invoice and update compound stock" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async approveTaxInvoice(@Param("id") id: string): Promise<RubberTaxInvoiceDto> {
    const invoice = await this.rubberTaxInvoiceService.approveTaxInvoice(Number(id));
    if (!invoice) throw new NotFoundException("Tax invoice not found");
    return invoice;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id/line-items/:idx/rolls")
  @ApiOperation({ summary: "Replace the rolls array on a tax invoice line item" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  @ApiParam({ name: "idx", description: "Zero-based line-item index" })
  async updateTaxInvoiceLineItemRolls(
    @Param("id") id: string,
    @Param("idx") idx: string,
    @Body() body: { rolls: Array<{ rollNumber: string; weightKg: number | null }> },
  ): Promise<RubberTaxInvoiceDto> {
    const invoice = await this.rubberTaxInvoiceService.updateLineItemRolls(
      Number(id),
      Number(idx),
      body.rolls ?? [],
    );
    if (!invoice) throw new NotFoundException("Tax invoice not found");
    return invoice;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices/:id/recompute-compound-costs")
  @ApiOperation({
    summary:
      "Recompute compound (S&N) cost for every roll on this Impilo supplier tax invoice — useful when the matching S&N invoice arrived after this one was approved",
  })
  @ApiParam({ name: "id", description: "Impilo supplier tax invoice ID" })
  async recomputeCompoundCosts(
    @Param("id") id: string,
  ): Promise<{ updated: number; unitPrice: number | null }> {
    return this.rubberRollStockService.propagateCompoundCostsForImpiloInvoice(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id/reprocess-stock")
  @ApiOperation({ summary: "Reprocess compound stock for an approved tax invoice" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async reprocessCompoundStock(@Param("id") id: string): Promise<RubberTaxInvoiceDto> {
    const invoice = await this.rubberTaxInvoiceService.reprocessCompoundStock(Number(id));
    if (!invoice) throw new NotFoundException("Tax invoice not found");
    return invoice;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id/refile-stock")
  @ApiOperation({
    summary: "Re-approve and overwrite stock for an approved tax invoice using corrected data",
  })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async refileTaxInvoiceStock(@Param("id") id: string): Promise<RubberTaxInvoiceDto> {
    const invoice = await this.rubberTaxInvoiceService.refileStock(Number(id));
    if (!invoice) throw new NotFoundException("Tax invoice not found");
    return invoice;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/tax-invoices/:id")
  @ApiOperation({ summary: "Delete tax invoice" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async deleteTaxInvoice(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberTaxInvoiceService.deleteTaxInvoice(Number(id));
    if (!deleted) throw new NotFoundException("Tax invoice not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id/document")
  @ApiOperation({ summary: "Upload tax invoice document" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadTaxInvoiceDocument(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<RubberTaxInvoiceDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const invoice = await this.rubberTaxInvoiceService.taxInvoiceById(Number(id));
    if (!invoice) throw new NotFoundException("Tax invoice not found");

    const party: AuRubberPartyType =
      invoice.invoiceType === TaxInvoiceType.CUSTOMER ? "customers" : "suppliers";
    const targetPath = auRubberDocumentPath(
      party,
      AuRubberDocumentType.TAX_INVOICE,
      invoice.invoiceNumber,
      file.originalname,
    );
    const subdir = targetPath.substring(0, targetPath.lastIndexOf("/"));
    const upload = await this.storageService.upload(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      } as Express.Multer.File,
      subdir,
    );
    const filePath = upload.path;

    const updated = await this.rubberTaxInvoiceService.updateDocumentPath(Number(id), filePath);
    if (!updated) throw new NotFoundException("Failed to update tax invoice");

    return updated;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/sage/status")
  @ApiOperation({ summary: "Sage connection status" })
  async sageStatus() {
    return this.sageConnectionService.connectionStatus("au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Patch("portal/sage/config")
  @ApiOperation({ summary: "Update Sage connection credentials" })
  async updateSageConfig(@Body() body: SageConfigDto) {
    return this.sageConnectionService.saveCredentials("au-rubber", body);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/sage/config")
  @ApiOperation({ summary: "Disconnect from Sage" })
  async disconnectSage() {
    return this.sageConnectionService.disconnect("au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/sage/test")
  @ApiOperation({ summary: "Test Sage connection" })
  async testSageConnection(@Body() body: { username?: string; password?: string }) {
    return this.sageConnectionService.testConnection("au-rubber", body.username, body.password);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/sage/companies")
  @ApiOperation({ summary: "List Sage companies" })
  async sageCompanies(@Query("username") username?: string, @Query("password") password?: string) {
    return this.sageConnectionService.sageCompanies("au-rubber", username, password);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/sage/suppliers")
  @ApiOperation({ summary: "List Sage suppliers" })
  async sageSuppliers() {
    return this.sageConnectionService.sageSuppliers("au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/sage/customers")
  @ApiOperation({ summary: "List Sage customers" })
  async sageCustomers() {
    return this.sageConnectionService.sageCustomers("au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/sage/tax-types")
  @ApiOperation({ summary: "List Sage tax types" })
  async sageTaxTypes() {
    return this.sageConnectionService.sageTaxTypes("au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/sage/contact-sync")
  @ApiOperation({ summary: "Sync contacts from Sage (auto-match by name)" })
  async syncSageContacts(): Promise<SageContactSyncResult> {
    return this.rubberSageContactSyncService.syncContacts("au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/sage/contact-mappings")
  @ApiOperation({ summary: "View Sage contact mapping status" })
  async sageContactMappings(): Promise<SageContactMappingStatus> {
    return this.rubberSageContactSyncService.mappingStatus("au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Patch("portal/sage/contact-mappings/:companyId")
  @ApiOperation({ summary: "Manually map a company to a Sage contact" })
  async mapSageContact(
    @Param("companyId") companyId: string,
    @Body() body: { sageContactId: number; sageContactType: string },
  ) {
    return this.rubberSageContactSyncService.manualMap(
      Number(companyId),
      body.sageContactId,
      body.sageContactType,
    );
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/sage/contact-mappings/:companyId")
  @ApiOperation({ summary: "Remove Sage contact mapping" })
  async unmapSageContact(@Param("companyId") companyId: string) {
    return this.rubberSageContactSyncService.unmap(Number(companyId));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices/:id/post-to-sage")
  @ApiOperation({ summary: "Post a single invoice directly to Sage" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async postInvoiceToSage(@Param("id") id: string): Promise<PostToSageResult> {
    return this.rubberSageInvoicePostService.postInvoice(Number(id), "au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices/post-to-sage/bulk")
  @ApiOperation({ summary: "Post multiple invoices to Sage" })
  async postInvoicesToSageBulk(@Body() body: { invoiceIds: number[] }): Promise<BulkPostResult> {
    return this.rubberSageInvoicePostService.postBulk(body.invoiceIds, "au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/tax-invoices/post-to-sage/bulk-by-filter")
  @ApiOperation({
    summary: "Post all matching invoices to Sage",
    description:
      "Resolves eligible (APPROVED + not yet posted to Sage) invoices that match the filter, then posts them. Replaces the inline pageSize:10000 fetch on the bulk-post button.",
  })
  async postInvoicesToSageBulkByFilter(
    @Body()
    body: { invoiceType: TaxInvoiceType; search?: string; includeAllVersions?: boolean },
  ): Promise<BulkPostResult> {
    const ids = await this.rubberTaxInvoiceService.eligibleSageInvoiceIds(body);
    return this.rubberSageInvoicePostService.postBulk(ids, "au-rubber");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices/export/customer-sage-preview")
  @ApiOperation({ summary: "Preview customer invoice Sage CSV export" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  async customerSageExportPreview(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("excludeExported") excludeExported?: string,
  ): Promise<{ invoiceCount: number; lineItemCount: number; totalAmount: number }> {
    const context = { companyId: null, appKey: "au-rubber" };
    const preview = await this.rubberSageAdapterService.previewCount(
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        excludeExported: excludeExported !== "false",
        invoiceType: "CUSTOMER",
      },
      context,
    );
    return {
      invoiceCount: preview.count,
      lineItemCount: preview.lineItemCount,
      totalAmount: preview.totalAmount,
    };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices/export/customer-sage-csv")
  @ApiOperation({ summary: "Download customer invoice Sage CSV export" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  async customerSageExportCsv(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("excludeExported") excludeExported?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const context = { companyId: null, appKey: "au-rubber" };
    const filters: SageExportFilterDto = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      excludeExported: excludeExported !== "false",
      invoiceType: "CUSTOMER",
    };

    const { invoices, entityIds } = await this.rubberSageAdapterService.exportableInvoices(
      filters,
      context,
    );
    const csvBuffer = this.sageExportService.generateCsv(invoices);

    await this.rubberSageAdapterService.markExported(entityIds, context);

    res!.set({
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=sage-customer-invoices.csv",
      "Content-Length": csvBuffer.length,
    });
    res!.send(csvBuffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id/authorize-version")
  @ApiOperation({ summary: "Authorize a pending tax invoice version" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async authorizeTaxInvoiceVersion(
    @Param("id") id: string,
  ): Promise<{ authorizedId: number; supersededId: number | null }> {
    return this.rubberDocumentVersioningService.authorizeVersion("tax-invoice", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/tax-invoices/:id/reject-version")
  @ApiOperation({ summary: "Reject a pending tax invoice version" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async rejectTaxInvoiceVersion(@Param("id") id: string): Promise<void> {
    await this.rubberDocumentVersioningService.rejectVersion("tax-invoice", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/tax-invoices/:id/version-history")
  @ApiOperation({ summary: "Get tax invoice version history" })
  @ApiParam({ name: "id", description: "Tax invoice ID" })
  async taxInvoiceVersionHistory(@Param("id") id: string): Promise<VersionHistoryEntry[]> {
    return this.rubberDocumentVersioningService.versionHistory("tax-invoice", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/authorize-version")
  @ApiOperation({ summary: "Authorize a pending delivery note version" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async authorizeDeliveryNoteVersion(
    @Param("id") id: string,
  ): Promise<{ authorizedId: number; supersededId: number | null }> {
    return this.rubberDocumentVersioningService.authorizeVersion("delivery-note", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/delivery-notes/:id/reject-version")
  @ApiOperation({ summary: "Reject a pending delivery note version" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async rejectDeliveryNoteVersion(@Param("id") id: string): Promise<void> {
    await this.rubberDocumentVersioningService.rejectVersion("delivery-note", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/delivery-notes/:id/version-history")
  @ApiOperation({ summary: "Get delivery note version history" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async deliveryNoteVersionHistory(@Param("id") id: string): Promise<VersionHistoryEntry[]> {
    return this.rubberDocumentVersioningService.versionHistory("delivery-note", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/supplier-cocs/:id/authorize-version")
  @ApiOperation({ summary: "Authorize a pending supplier CoC version" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async authorizeSupplierCocVersion(
    @Param("id") id: string,
  ): Promise<{ authorizedId: number; supersededId: number | null }> {
    return this.rubberDocumentVersioningService.authorizeVersion("supplier-coc", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/supplier-cocs/:id/reject-version")
  @ApiOperation({ summary: "Reject a pending supplier CoC version" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async rejectSupplierCocVersion(@Param("id") id: string): Promise<void> {
    await this.rubberDocumentVersioningService.rejectVersion("supplier-coc", Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs/:id/version-history")
  @ApiOperation({ summary: "Get supplier CoC version history" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async supplierCocVersionHistory(@Param("id") id: string): Promise<VersionHistoryEntry[]> {
    return this.rubberDocumentVersioningService.versionHistory("supplier-coc", Number(id));
  }

  // ── Roll Rejections ──────────────────────────────────────────────

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-rejections")
  @ApiOperation({ summary: "List all roll rejections" })
  @ApiQuery({ name: "status", required: false, enum: RollRejectionStatus })
  async allRollRejections(
    @Query("status") status?: RollRejectionStatus,
  ): Promise<RollRejectionDto[]> {
    return this.rubberRollRejectionService.allRejections(status || undefined);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs/:id/roll-rejections")
  @ApiOperation({ summary: "List roll rejections for a supplier CoC" })
  @ApiParam({ name: "id", description: "Supplier CoC ID" })
  async rollRejectionsBySupplierCoc(@Param("id") id: string): Promise<RollRejectionDto[]> {
    return this.rubberRollRejectionService.rejectionsBySupplierCoc(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/roll-rejections")
  @ApiOperation({ summary: "Create a roll rejection" })
  async createRollRejection(@Body() body: RejectRollInput): Promise<RollRejectionDto> {
    return this.rubberRollRejectionService.rejectRoll(body);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/roll-rejections/:id/return-document")
  @ApiOperation({ summary: "Upload return document for a roll rejection" })
  @ApiParam({ name: "id", description: "Roll rejection ID" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadRollRejectionReturnDocument(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<RollRejectionDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.rubberRollRejectionService.uploadReturnDocument(Number(id), file);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/roll-rejections/:id/link-replacement")
  @ApiOperation({ summary: "Link a replacement supplier CoC to a roll rejection" })
  @ApiParam({ name: "id", description: "Roll rejection ID" })
  async linkReplacementCoc(
    @Param("id") id: string,
    @Body() body: { replacementCocId: number; replacementRollNumber?: string },
  ): Promise<RollRejectionDto> {
    return this.rubberRollRejectionService.linkReplacementCoc(
      Number(id),
      body.replacementCocId,
      body.replacementRollNumber,
    );
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/roll-rejections/:id/close")
  @ApiOperation({ summary: "Close a roll rejection" })
  @ApiParam({ name: "id", description: "Roll rejection ID" })
  async closeRollRejection(@Param("id") id: string): Promise<RollRejectionDto> {
    return this.rubberRollRejectionService.closeRejection(Number(id));
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-rejections/:id/return-document-url")
  @ApiOperation({ summary: "Get presigned URL for a return document" })
  @ApiParam({ name: "id", description: "Roll rejection ID" })
  async rollRejectionReturnDocumentUrl(@Param("id") id: string): Promise<{ url: string | null }> {
    const url = await this.rubberRollRejectionService.returnDocumentPresignedUrl(Number(id));
    return { url };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/cost-rates")
  @ApiOperation({
    summary: "List cost rates",
    description:
      "Retrieve all admin-configured cost rates (calenderer conversion and compound costs)",
  })
  @ApiQuery({ name: "rateType", required: false, enum: CostRateType })
  async costRates(@Query("rateType") rateType?: CostRateType): Promise<CostRateDto[]> {
    return this.rubberCostService.allCostRates(rateType);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/cost-rates/calenderer-rates")
  @ApiOperation({
    summary: "Get calenderer conversion rates",
    description: "Returns the current uncured and cured & buffed conversion cost per kg",
  })
  async calendererConversionRates(): Promise<{
    uncuredPerKg: number | null;
    curedBuffedPerKg: number | null;
  }> {
    return this.rubberCostService.calendererConversionRates();
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/cost-rates/:id")
  @ApiOperation({ summary: "Get cost rate by ID" })
  @ApiParam({ name: "id", description: "Cost rate ID" })
  async costRateById(@Param("id") id: string): Promise<CostRateDto> {
    const rate = await this.rubberCostService.costRateById(Number(id));
    if (!rate) throw new NotFoundException("Cost rate not found");
    return rate;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Post("portal/cost-rates")
  @ApiOperation({
    summary: "Create cost rate",
    description: "Create a new cost rate (calenderer conversion or compound cost per kg)",
  })
  async createCostRate(
    @Body() dto: CreateCostRateDto,
    @Req() req: AdminRequest,
  ): Promise<CostRateDto> {
    return this.rubberCostService.createCostRate(dto, req.user?.email);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Put("portal/cost-rates/:id")
  @ApiOperation({ summary: "Update cost rate" })
  @ApiParam({ name: "id", description: "Cost rate ID" })
  async updateCostRate(
    @Param("id") id: string,
    @Body() dto: UpdateCostRateDto,
    @Req() req: AdminRequest,
  ): Promise<CostRateDto> {
    const rate = await this.rubberCostService.updateCostRate(Number(id), dto, req.user?.email);
    if (!rate) throw new NotFoundException("Cost rate not found");
    return rate;
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Delete("portal/cost-rates/:id")
  @ApiOperation({ summary: "Delete cost rate" })
  @ApiParam({ name: "id", description: "Cost rate ID" })
  async deleteCostRate(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberCostService.deleteCostRate(Number(id));
    if (!deleted) throw new NotFoundException("Cost rate not found");
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-cos")
  @ApiOperation({
    summary: "Get COS for all rolls",
    description: "Calculate cost of sale for all rolls with profit/loss and anomaly tracking",
  })
  @ApiQuery({ name: "status", required: false, enum: RollStockStatus })
  async allRollCos(@Query("status") status?: string): Promise<RollCosDto[]> {
    return this.rubberCostService.allRollCos(status);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/roll-cos/:rollId")
  @ApiOperation({ summary: "Get COS for a specific roll" })
  @ApiParam({ name: "rollId", description: "Roll stock ID" })
  async rollCos(@Param("rollId") rollId: string): Promise<RollCosDto> {
    const cos = await this.rubberCostService.rollCos(Number(rollId));
    if (!cos) throw new NotFoundException("Roll not found");
    return cos;
  }

  private resolvePodPageNumbers(
    podPages: ExtractedCustomerDeliveryNotePodPage[],
    deliveryNotes: ExtractedCustomerDeliveryNoteData[],
    targetDnNumber: string | null,
  ): number[] {
    if (!podPages || podPages.length === 0) return [];

    const directMatches = podPages
      .filter((pod) => pod.relatedDnNumber === targetDnNumber)
      .map((pod) => pod.pageNumber);

    if (directMatches.length > 0) return directMatches;

    const dnPageNumbers = deliveryNotes
      .map((dn, idx) => ({
        dnNumber: dn.deliveryNoteNumber || null,
        maxPage:
          dn.sourcePages && dn.sourcePages.length > 0 ? Math.max(...dn.sourcePages) : idx + 1,
      }))
      .filter((entry) => entry.dnNumber === targetDnNumber)
      .map((entry) => entry.maxPage);

    if (dnPageNumbers.length === 0) return [];

    const maxDnPage = Math.max(...dnPageNumbers);
    const allDnPages = new Set(
      deliveryNotes.map((dn, idx) =>
        dn.sourcePages && dn.sourcePages.length > 0 ? Math.max(...dn.sourcePages) : idx + 1,
      ),
    );

    return podPages
      .filter((pod) => {
        if (pod.relatedDnNumber && pod.relatedDnNumber !== targetDnNumber) return false;
        const nextDnPage = Array.from(allDnPages)
          .filter((p) => p > maxDnPage)
          .sort((a, b) => a - b)[0];
        return pod.pageNumber > maxDnPage && (!nextDnPage || pod.pageNumber < nextDnPage);
      })
      .map((pod) => pod.pageNumber);
  }

  @Get("portal/accounting/directors")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "List all company directors" })
  async accountingDirectors(): Promise<DirectorDto[]> {
    return this.rubberCompanyDirectorService.allDirectors();
  }

  @Post("portal/accounting/directors")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Create a company director" })
  async createAccountingDirector(@Body() dto: CreateDirectorDto): Promise<DirectorDto> {
    return this.rubberCompanyDirectorService.createDirector(dto);
  }

  @Put("portal/accounting/directors/:id")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Update a company director" })
  async updateAccountingDirector(
    @Param("id") id: string,
    @Body() dto: UpdateDirectorDto,
  ): Promise<DirectorDto> {
    const result = await this.rubberCompanyDirectorService.updateDirector(Number(id), dto);
    if (!result) throw new NotFoundException("Director not found");
    return result;
  }

  @Delete("portal/accounting/directors/:id")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Delete a company director" })
  async deleteAccountingDirector(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberCompanyDirectorService.deleteDirector(Number(id));
    if (!deleted) throw new NotFoundException("Director not found");
  }

  @Get("portal/accounting/payable")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Monthly accounts payable data" })
  async accountingPayable(
    @Query("year") year: string,
    @Query("month") month: string,
    @Query("companyId") companyId?: string,
  ): Promise<MonthlyAccountDataDto> {
    return this.rubberAccountingService.monthlyPayable(
      Number(year),
      Number(month),
      companyId ? Number(companyId) : undefined,
    );
  }

  @Get("portal/accounting/receivable")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Monthly accounts receivable data" })
  async accountingReceivable(
    @Query("year") year: string,
    @Query("month") month: string,
    @Query("companyId") companyId?: string,
  ): Promise<MonthlyAccountDataDto> {
    return this.rubberAccountingService.monthlyReceivable(
      Number(year),
      Number(month),
      companyId ? Number(companyId) : undefined,
    );
  }

  @Get("portal/accounting")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "List generated monthly accounts" })
  async accountingList(
    @Query("accountType") accountType?: string,
    @Query("status") status?: string,
    @Query("year") year?: string,
  ): Promise<MonthlyAccountDto[]> {
    return this.rubberAccountingService.allMonthlyAccounts({
      accountType: accountType as MonthlyAccountType,
      status: status as never,
      year: year ? Number(year) : undefined,
    });
  }

  @Get("portal/accounting/:id")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Single monthly account with sign-off status" })
  async accountingById(@Param("id") id: string): Promise<MonthlyAccountDto> {
    const result = await this.rubberAccountingService.monthlyAccountById(Number(id));
    if (!result) throw new NotFoundException("Monthly account not found");
    return result;
  }

  @Post("portal/accounting/generate")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Generate monthly account PDF" })
  async accountingGenerate(
    @Body()
    body: {
      year: number;
      month: number;
      accountType: MonthlyAccountType;
    },
    @Req() req: AdminRequest,
  ): Promise<MonthlyAccountDto> {
    const generatedBy = req.user?.email || "unknown";
    return this.rubberAccountingService.generateMonthlyAccountPdf(
      body.year,
      body.month,
      body.accountType,
      generatedBy,
    );
  }

  @Get("portal/accounting/:id/pdf")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Download monthly account PDF" })
  async accountingDownloadPdf(@Param("id") id: string, @Res() res: Response): Promise<void> {
    const buffer = await this.rubberAccountingService.downloadAccountPdf(Number(id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="account-${id}.pdf"`);
    res.send(buffer);
  }

  @Post("portal/accounting/:id/request-signoff")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Send sign-off request emails to directors" })
  async accountingRequestSignOff(@Param("id") id: string): Promise<MonthlyAccountDto> {
    return this.rubberAccountingService.requestDirectorSignOff(Number(id));
  }

  @Get("public/accounting/signoff/:token")
  @Public()
  @ApiOperation({ summary: "View sign-off details (public)" })
  async accountingSignOffDetails(@Param("token") token: string): Promise<{
    signOff: unknown;
    account: unknown;
    pdfUrl: string | null;
  }> {
    const result = await this.rubberAccountingService.signOffDetails(token);
    if (!result) throw new NotFoundException("Invalid sign-off token");
    return result;
  }

  @Post("public/accounting/signoff/:token")
  @Public()
  @ApiOperation({ summary: "Submit sign-off decision (public)" })
  async accountingSubmitSignOff(
    @Param("token") token: string,
    @Body() body: { action: "APPROVED" | "REJECTED"; notes?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.rubberAccountingService.signOffAccount(token, body.action, body.notes);
  }

  @Post("portal/accounting/reconciliation/upload")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload a supplier statement for reconciliation" })
  async reconciliationUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { companyId: string; year: string; month: string },
  ): Promise<ReconciliationListDto> {
    return this.rubberStatementReconciliationService.uploadStatement(
      Number(body.companyId),
      file,
      Number(body.year),
      Number(body.month),
    );
  }

  @Post("portal/accounting/reconciliation/:id/extract")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Trigger AI extraction on uploaded statement" })
  async reconciliationExtract(@Param("id") id: string): Promise<ReconciliationDetailDto> {
    return this.rubberStatementReconciliationService.extractStatement(Number(id));
  }

  @Post("portal/accounting/reconciliation/:id/reconcile")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Run statement reconciliation matching" })
  async reconciliationReconcile(@Param("id") id: string): Promise<ReconciliationDetailDto> {
    return this.rubberStatementReconciliationService.reconcileStatement(Number(id));
  }

  @Put("portal/accounting/reconciliation/:id/resolve")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Mark reconciliation as resolved" })
  async reconciliationResolve(
    @Param("id") id: string,
    @Body() body: { resolvedBy: string; notes: string },
  ): Promise<ReconciliationDetailDto> {
    return this.rubberStatementReconciliationService.resolveDiscrepancy(
      Number(id),
      body.resolvedBy,
      body.notes,
    );
  }

  @Get("portal/accounting/reconciliation")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "List all reconciliations" })
  async reconciliationList(
    @Query("companyId") companyId?: string,
    @Query("status") status?: string,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ): Promise<ReconciliationListDto[]> {
    return this.rubberStatementReconciliationService.allReconciliations({
      companyId: companyId ? Number(companyId) : undefined,
      status: status as ReconciliationStatus,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
  }

  @Get("portal/accounting/reconciliation/:id")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiOperation({ summary: "Reconciliation detail" })
  async reconciliationById(@Param("id") id: string): Promise<ReconciliationDetailDto> {
    const result = await this.rubberStatementReconciliationService.reconciliationById(Number(id));
    if (!result) throw new NotFoundException("Reconciliation not found");
    return result;
  }

  @Post("portal/roll-issuances/identify-photo")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Identify rubber roll from photo using AI" })
  async identifyRollPhoto(@Body() dto: IdentifyRollPhotoDto): Promise<RollPhotoIdentifyResponse> {
    return this.rubberRollIssuanceService.identifyRollFromPhoto(dto.imageBase64, dto.mediaType);
  }

  @Post("portal/roll-issuances/create-from-photo")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create roll stock entry from photo extraction" })
  async createRollFromPhoto(
    @Body() dto: CreateRollFromPhotoDto,
  ): Promise<RubberRollIssuanceRollDto> {
    return this.rubberRollIssuanceService.createRollFromPhoto(dto);
  }

  @Get("portal/roll-issuances/jc-search")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Search job cards for roll issuing" })
  async searchJobCardsForIssuing(@Query("q") query: string): Promise<JcSearchResultDto[]> {
    return this.rubberRollIssuanceService.searchJobCards(query || "");
  }

  @Get("portal/roll-issuances/jc/:id/line-items")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get job card line items for roll issuing" })
  async jobCardLineItemsForIssuing(@Param("id") id: string): Promise<JcLineItemDto[]> {
    return this.rubberRollIssuanceService.jobCardLineItems(Number(id));
  }

  @Post("portal/roll-issuances")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a roll issuance to one or more job cards" })
  async createRollIssuance(@Body() dto: CreateRollIssuanceDto): Promise<RubberRollIssuanceDto> {
    return this.rubberRollIssuanceService.createIssuance(dto);
  }

  @Get("portal/roll-issuances")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all roll issuances" })
  async listRollIssuances(): Promise<RubberRollIssuanceDto[]> {
    return this.rubberRollIssuanceService.allIssuances();
  }

  @Get("portal/roll-issuances/:id")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get roll issuance detail" })
  async rollIssuanceById(@Param("id") id: string): Promise<RubberRollIssuanceDto> {
    return this.rubberRollIssuanceService.issuanceById(Number(id));
  }

  @Post("portal/roll-issuances/:id/cancel")
  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel a roll issuance" })
  async cancelRollIssuance(@Param("id") id: string): Promise<RubberRollIssuanceDto> {
    return this.rubberRollIssuanceService.cancelIssuance(Number(id));
  }
}
