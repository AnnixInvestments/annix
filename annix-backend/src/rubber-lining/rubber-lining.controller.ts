import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { AdminAuthGuard, AdminRequest } from "../admin/guards/admin-auth.guard";
import { Public } from "../auth/public.decorator";
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
  SellRollDto,
  SendAuCocDto,
  UpdateDeliveryNoteDto,
  UpdateRollStockDto,
  UpdateSupplierCocDto,
} from "./dto/rubber-coc.dto";
import {
  LineCalloutDto,
  RubberAdhesionRequirementDto,
  RubberApplicationRatingDto,
  RubberRecommendationDto,
  RubberRecommendationRequestDto,
  RubberSpecificationDto,
  RubberThicknessRecommendationDto,
  RubberTypeDto,
} from "./dto/rubber-lining.dto";
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
import { AuCocStatus } from "./entities/rubber-au-coc.entity";
import {
  CompoundMovementReferenceType,
  CompoundMovementType,
} from "./entities/rubber-compound-movement.entity";
import { RubberCompoundOrderStatus } from "./entities/rubber-compound-order.entity";
import { DeliveryNoteStatus, DeliveryNoteType } from "./entities/rubber-delivery-note.entity";
import { RubberOrderStatus } from "./entities/rubber-order.entity";
import { ProductCodingType } from "./entities/rubber-product-coding.entity";
import { RubberProductionStatus } from "./entities/rubber-production.entity";
import {
  RequisitionItemType,
  RequisitionSourceType,
  RequisitionStatus,
} from "./entities/rubber-purchase-requisition.entity";
import { RollStockStatus } from "./entities/rubber-roll-stock.entity";
import { CocProcessingStatus, SupplierCocType } from "./entities/rubber-supplier-coc.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { RubberAuCocService } from "./rubber-au-coc.service";
import { RubberBrandingService, ScrapedBrandingCandidates } from "./rubber-branding.service";
import { RubberCocService } from "./rubber-coc.service";
import { RubberDeliveryNoteService } from "./rubber-delivery-note.service";
import { RubberLiningService } from "./rubber-lining.service";
import { RubberOtherStockService } from "./rubber-other-stock.service";
import { RubberQualityTrackingService } from "./rubber-quality-tracking.service";
import { RequisitionDto, RubberRequisitionService } from "./rubber-requisition.service";
import { RubberRollStockService } from "./rubber-roll-stock.service";
import { RubberStockService } from "./rubber-stock.service";
import { RubberStockLocationService, StockLocationDto } from "./rubber-stock-location.service";

@ApiTags("Rubber Lining")
@Controller("rubber-lining")
export class RubberLiningController {
  constructor(
    private readonly rubberLiningService: RubberLiningService,
    private readonly rubberStockService: RubberStockService,
    private readonly rubberBrandingService: RubberBrandingService,
    private readonly rubberCocService: RubberCocService,
    private readonly rubberDeliveryNoteService: RubberDeliveryNoteService,
    private readonly rubberRollStockService: RubberRollStockService,
    private readonly rubberAuCocService: RubberAuCocService,
    private readonly rubberRequisitionService: RubberRequisitionService,
    private readonly rubberStockLocationService: RubberStockLocationService,
    private readonly rubberQualityTrackingService: RubberQualityTrackingService,
    private readonly rubberOtherStockService: RubberOtherStockService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
  ) {}

  @Get("types")
  @Public()
  @ApiOperation({
    summary: "List all rubber types",
    description:
      "Returns all rubber lining types per ISO 6529/SANS standards (NR, SBR, NBR, CR, EPDM, IIR, CSM, FKM)",
  })
  @ApiResponse({
    status: 200,
    description: "List of rubber types",
    type: [RubberTypeDto],
  })
  async rubberTypes(): Promise<RubberTypeDto[]> {
    return this.rubberLiningService.allRubberTypes();
  }

  @Get("types/:id")
  @Public()
  @ApiOperation({
    summary: "Get rubber type by ID",
    description: "Returns a single rubber type by database ID",
  })
  @ApiParam({
    name: "id",
    description: "Rubber type database ID",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Rubber type details",
    type: RubberTypeDto,
  })
  @ApiResponse({ status: 404, description: "Rubber type not found" })
  async rubberTypeById(@Param("id") id: string): Promise<RubberTypeDto | null> {
    return this.rubberLiningService.rubberTypeById(Number(id));
  }

  @Get("types/number/:typeNumber")
  @Public()
  @ApiOperation({
    summary: "Get rubber type by type number",
    description: "Returns a rubber type by its standard type number (1-8)",
  })
  @ApiParam({
    name: "typeNumber",
    description: "Standard type number (1=NR, 2=SBR, 3=NBR, etc.)",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Rubber type details",
    type: RubberTypeDto,
  })
  @ApiResponse({ status: 404, description: "Rubber type not found" })
  async rubberTypeByNumber(@Param("typeNumber") typeNumber: string): Promise<RubberTypeDto | null> {
    return this.rubberLiningService.rubberTypeByNumber(Number(typeNumber));
  }

  @Get("specifications")
  @Public()
  @ApiOperation({
    summary: "List all rubber specifications",
    description:
      "Returns all rubber specifications with physical properties (tensile strength, elongation, hardness)",
  })
  @ApiResponse({
    status: 200,
    description: "List of rubber specifications",
    type: [RubberSpecificationDto],
  })
  async specifications(): Promise<RubberSpecificationDto[]> {
    return this.rubberLiningService.allSpecifications();
  }

  @Get("specifications/type/:typeNumber")
  @Public()
  @ApiOperation({
    summary: "Get specifications by rubber type",
    description: "Returns all specifications for a given rubber type number",
  })
  @ApiParam({
    name: "typeNumber",
    description: "Standard type number (1-8)",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "List of specifications for the type",
    type: [RubberSpecificationDto],
  })
  async specificationsByType(
    @Param("typeNumber") typeNumber: string,
  ): Promise<RubberSpecificationDto[]> {
    return this.rubberLiningService.specificationsByType(Number(typeNumber));
  }

  @Get("specifications/callout/:typeNumber/:grade/:hardnessClass")
  @Public()
  @ApiOperation({
    summary: "Get specification by line callout",
    description:
      "Returns the specification matching a specific line callout (type/grade/hardness combination)",
  })
  @ApiParam({
    name: "typeNumber",
    description: "Standard type number (1-8)",
    type: Number,
  })
  @ApiParam({
    name: "grade",
    description: "Grade letter (A, B, C, or D)",
    type: String,
  })
  @ApiParam({
    name: "hardnessClass",
    description: "Hardness class in IRHD (40, 50, 60, 70)",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "Matching specification",
    type: RubberSpecificationDto,
  })
  @ApiResponse({ status: 404, description: "Specification not found" })
  async specificationByCallout(
    @Param("typeNumber") typeNumber: string,
    @Param("grade") grade: string,
    @Param("hardnessClass") hardnessClass: string,
  ): Promise<RubberSpecificationDto | null> {
    return this.rubberLiningService.specificationByLineCallout(
      Number(typeNumber),
      grade,
      Number(hardnessClass),
    );
  }

  @Get("application-ratings")
  @Public()
  @ApiOperation({
    summary: "Get chemical application ratings",
    description:
      "Returns chemical resistance ratings for rubber types. Filter by type or chemical category.",
  })
  @ApiQuery({
    name: "typeNumber",
    description: "Filter by rubber type number",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "chemicalCategory",
    description: "Filter by chemical category (e.g., acids_inorganic, alkalis)",
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "List of application ratings",
    type: [RubberApplicationRatingDto],
  })
  async applicationRatings(
    @Query("typeNumber") typeNumber?: string,
    @Query("chemicalCategory") chemicalCategory?: string,
  ): Promise<RubberApplicationRatingDto[]> {
    return this.rubberLiningService.applicationRatings(
      typeNumber ? Number(typeNumber) : undefined,
      chemicalCategory,
    );
  }

  @Get("thickness-recommendations")
  @Public()
  @ApiOperation({
    summary: "Get thickness recommendations",
    description: "Returns recommended rubber lining thicknesses based on application conditions",
  })
  @ApiResponse({
    status: 200,
    description: "List of thickness recommendations",
    type: [RubberThicknessRecommendationDto],
  })
  async thicknessRecommendations(): Promise<RubberThicknessRecommendationDto[]> {
    return this.rubberLiningService.thicknessRecommendations();
  }

  @Get("adhesion-requirements")
  @Public()
  @ApiOperation({
    summary: "Get adhesion requirements",
    description: "Returns adhesion test requirements per ISO standards for rubber types",
  })
  @ApiQuery({
    name: "typeNumber",
    description: "Filter by rubber type number",
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: "List of adhesion requirements",
    type: [RubberAdhesionRequirementDto],
  })
  async adhesionRequirements(
    @Query("typeNumber") typeNumber?: string,
  ): Promise<RubberAdhesionRequirementDto[]> {
    return this.rubberLiningService.adhesionRequirements(
      typeNumber ? Number(typeNumber) : undefined,
    );
  }

  @Post("recommend")
  @Public()
  @ApiOperation({
    summary: "Get rubber lining recommendation",
    description:
      "Recommends suitable rubber types and specifications based on application requirements (chemicals, temperature, abrasion)",
  })
  @ApiResponse({
    status: 201,
    description: "Rubber lining recommendation",
    type: RubberRecommendationDto,
  })
  async recommend(
    @Body() request: RubberRecommendationRequestDto,
  ): Promise<RubberRecommendationDto> {
    return this.rubberLiningService.recommendRubberLining(request);
  }

  @Get("line-callout")
  @Public()
  @ApiOperation({
    summary: "Generate line callout string",
    description:
      'Generates a standard line callout string (e.g., "3A60-III") from component values',
  })
  @ApiQuery({
    name: "type",
    description: "Rubber type number (1-8)",
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: "grade",
    description: "Grade letter (A, B, C, D)",
    required: true,
    type: String,
  })
  @ApiQuery({
    name: "hardness",
    description: "Hardness class in IRHD (40, 50, 60, 70)",
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: "properties",
    description: "Comma-separated special property codes (1-7)",
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Generated line callout",
    type: LineCalloutDto,
  })
  async lineCallout(
    @Query("type") type: string,
    @Query("grade") grade: string,
    @Query("hardness") hardness: string,
    @Query("properties") properties?: string,
  ): Promise<LineCalloutDto> {
    const specialProps = properties ? properties.split(",").map((p) => Number(p.trim())) : [];
    return this.rubberLiningService.generateLineCallout(
      Number(type),
      grade,
      Number(hardness),
      specialProps,
    );
  }

  @Get("chemical-categories")
  @Public()
  @ApiOperation({
    summary: "List chemical categories",
    description: "Returns all chemical categories for application rating lookups",
  })
  @ApiResponse({
    status: 200,
    description: "List of chemical categories with value/label pairs",
  })
  async chemicalCategories(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "acids_inorganic", label: "Inorganic Acids (H2SO4, HCl, HNO3)" },
      { value: "acids_organic", label: "Organic Acids (Acetic, Citric)" },
      { value: "alkalis", label: "Alkalis (NaOH, KOH, Ammonia)" },
      { value: "alcohols", label: "Alcohols (Methanol, Ethanol)" },
      { value: "hydrocarbons", label: "Hydrocarbons (Benzene, Toluene)" },
      { value: "oils_mineral", label: "Mineral Oils (Petroleum, Lubricants)" },
      { value: "oils_vegetable", label: "Vegetable Oils" },
      { value: "chlorine_compounds", label: "Chlorine Compounds (Cl2, NaOCl)" },
      { value: "oxidizing_agents", label: "Oxidizing Agents (H2O2, KMnO4)" },
      { value: "solvents", label: "Solvents (Acetone, MEK, Xylene)" },
      { value: "water", label: "Water (Fresh, Salt, Treated)" },
      { value: "slurry_abrasive", label: "Abrasive Slurries" },
    ];
  }

  @Get("hardness-classes")
  @Public()
  @ApiOperation({
    summary: "List hardness classes",
    description: "Returns IRHD hardness classes with descriptions (40=Soft to 70=Hard)",
  })
  @ApiResponse({
    status: 200,
    description: "List of hardness classes with value/label pairs",
  })
  async hardnessClasses(): Promise<{ value: number; label: string }[]> {
    return [
      {
        value: 40,
        label: "40 IRHD - Soft (High flexibility, impact absorption)",
      },
      { value: 50, label: "50 IRHD - Medium-Soft (General purpose)" },
      { value: 60, label: "60 IRHD - Medium-Hard (Abrasion resistant)" },
      { value: 70, label: "70 IRHD - Hard (High abrasion, lower flexibility)" },
    ];
  }

  @Get("grades")
  @Public()
  @ApiOperation({
    summary: "List rubber grades",
    description:
      "Returns rubber grades (A-D) with minimum tensile strength requirements per ISO standards",
  })
  @ApiResponse({
    status: 200,
    description: "List of grades with tensile strength requirements",
  })
  async grades(): Promise<{ value: string; label: string; tensileMin: number }[]> {
    return [
      {
        value: "A",
        label: "Grade A - High Strength (≥18 MPa)",
        tensileMin: 18,
      },
      {
        value: "B",
        label: "Grade B - Standard Strength (≥14 MPa)",
        tensileMin: 14,
      },
      { value: "C", label: "Grade C - Economy (≥7 MPa)", tensileMin: 7 },
      { value: "D", label: "Grade D - Ebonite (Hard rubber)", tensileMin: 0 },
    ];
  }

  @Get("special-properties")
  @Public()
  @ApiOperation({
    summary: "List special properties",
    description: "Returns special property codes (I-VII) for rubber lining specifications",
  })
  @ApiResponse({
    status: 200,
    description: "List of special properties with numeric value, label, and roman numeral code",
  })
  async specialProperties(): Promise<{ value: number; label: string; code: string }[]> {
    return [
      { value: 1, label: "Heat Resistance", code: "I" },
      { value: 2, label: "Ozone Resistance", code: "II" },
      { value: 3, label: "Chemical Resistance", code: "III" },
      { value: 4, label: "Abrasion Resistance", code: "IV" },
      { value: 5, label: "Contaminant Release Resistance", code: "V" },
      { value: 6, label: "Water Resistance", code: "VI" },
      { value: 7, label: "Oil Resistance", code: "VII" },
    ];
  }

  @Get("vulcanization-methods")
  @Public()
  @ApiOperation({
    summary: "List vulcanization methods",
    description:
      "Returns available vulcanization methods with descriptions and hardness tolerances",
  })
  @ApiResponse({ status: 200, description: "List of vulcanization methods" })
  async vulcanizationMethods(): Promise<{ value: string; label: string; description: string }[]> {
    return [
      {
        value: "autoclave",
        label: "Autoclave Vulcanization",
        description:
          "Carried out under pressure in an autoclave. Preferred method when pipe/vessel size permits.",
      },
      {
        value: "open",
        label: "Open Vulcanization",
        description:
          "Covering with canvas and injecting steam or hot gas. Hardness tolerance +5/-10 IRHD.",
      },
      {
        value: "hot_water",
        label: "Hot-Water Vulcanization",
        description: "Filling with water heated to required temperature.",
      },
      {
        value: "chemical",
        label: "Chemical Vulcanization",
        description: "Self-vulcanizing at room temperature. Wider hardness tolerance ±10 IRHD.",
      },
    ];
  }

  @Get("application-environments")
  @Public()
  @ApiOperation({
    summary: "List application environments",
    description: "Returns common industrial application environments for rubber lining selection",
  })
  @ApiResponse({ status: 200, description: "List of application environments" })
  async applicationEnvironments(): Promise<{ value: string; label: string }[]> {
    return [
      { value: "mining_slurry", label: "Mining Slurry Pipelines" },
      { value: "chemical_processing", label: "Chemical Processing" },
      { value: "water_treatment", label: "Water Treatment" },
      { value: "oil_and_gas", label: "Oil and Gas" },
      { value: "food_processing", label: "Food Processing" },
      { value: "general_industrial", label: "General Industrial" },
    ];
  }

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
      "Cache-Control": "public, max-age=300",
      "Content-Length": result.buffer.length.toString(),
    });
    res.send(result.buffer);
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/documents/url")
  @ApiOperation({ summary: "Get presigned URL for a document" })
  @ApiQuery({ name: "path", description: "Document path in storage" })
  @ApiResponse({ status: 200, description: "Presigned URL for the document" })
  async documentUrl(@Query("path") path: string): Promise<{ url: string }> {
    if (!path) {
      throw new NotFoundException("Document path is required");
    }
    const url = await this.storageService.getPresignedUrl(path);
    return { url };
  }

  @UseGuards(AdminAuthGuard, AuRubberAccessGuard)
  @ApiBearerAuth()
  @Get("portal/supplier-cocs")
  @ApiOperation({ summary: "List supplier CoCs" })
  @ApiQuery({ name: "cocType", required: false, enum: SupplierCocType })
  @ApiQuery({ name: "processingStatus", required: false, enum: CocProcessingStatus })
  @ApiQuery({ name: "supplierCompanyId", required: false })
  async supplierCocs(
    @Query("cocType") cocType?: SupplierCocType,
    @Query("processingStatus") processingStatus?: CocProcessingStatus,
    @Query("supplierCompanyId") supplierCompanyId?: string,
  ): Promise<RubberSupplierCocDto[]> {
    return this.rubberCocService.allSupplierCocs({
      cocType,
      processingStatus,
      supplierCompanyId: supplierCompanyId ? Number(supplierCompanyId) : undefined,
    });
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
  @Get("portal/delivery-notes")
  @ApiOperation({ summary: "List delivery notes" })
  @ApiQuery({ name: "deliveryNoteType", required: false, enum: DeliveryNoteType })
  @ApiQuery({ name: "status", required: false, enum: DeliveryNoteStatus })
  @ApiQuery({ name: "supplierCompanyId", required: false })
  async deliveryNotes(
    @Query("deliveryNoteType") deliveryNoteType?: DeliveryNoteType,
    @Query("status") status?: DeliveryNoteStatus,
    @Query("supplierCompanyId") supplierCompanyId?: string,
  ): Promise<RubberDeliveryNoteDto[]> {
    return this.rubberDeliveryNoteService.allDeliveryNotes({
      deliveryNoteType,
      status,
      supplierCompanyId: supplierCompanyId ? Number(supplierCompanyId) : undefined,
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
  @Delete("portal/delivery-notes/:id")
  @ApiOperation({ summary: "Delete delivery note" })
  @ApiParam({ name: "id", description: "Delivery note ID" })
  async deleteDeliveryNote(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberDeliveryNoteService.deleteDeliveryNote(Number(id));
    if (!deleted) throw new NotFoundException("Delivery note not found");
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
  @Get("portal/roll-stock/:id")
  @ApiOperation({ summary: "Get roll stock by ID" })
  @ApiParam({ name: "id", description: "Roll stock ID" })
  async rollStockById(@Param("id") id: string): Promise<RubberRollStockDto> {
    const roll = await this.rubberRollStockService.rollById(Number(id));
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
    const coc = await this.rubberAuCocService.auCocById(Number(id));
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
  @Delete("portal/au-cocs/:id")
  @ApiOperation({ summary: "Delete AU CoC" })
  @ApiParam({ name: "id", description: "AU CoC ID" })
  async deleteAuCoc(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberAuCocService.deleteAuCoc(Number(id));
    if (!deleted) throw new NotFoundException("AU CoC not found");
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
}
