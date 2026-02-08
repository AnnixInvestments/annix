import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
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
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
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
  CreateRubberCompanyDto,
  CreateRubberOrderDto,
  CreateRubberPricingTierDto,
  CreateRubberProductCodingDto,
  CreateRubberProductDto,
  ImportProductsRequestDto,
  ImportProductsResultDto,
  RubberCompanyDto,
  RubberOrderDto,
  RubberPriceCalculationDto,
  RubberPriceCalculationRequestDto,
  RubberPricingTierDto,
  RubberProductCodingDto,
  RubberProductDto,
  UpdateRubberCompanyDto,
  UpdateRubberOrderDto,
  UpdateRubberPricingTierDto,
  UpdateRubberProductCodingDto,
  UpdateRubberProductDto,
} from "./dto/rubber-portal.dto";
import { RubberOrderStatus } from "./entities/rubber-order.entity";
import { ProductCodingType } from "./entities/rubber-product-coding.entity";
import { RubberLiningService } from "./rubber-lining.service";

@ApiTags("Rubber Lining")
@Controller("rubber-lining")
export class RubberLiningController {
  constructor(private readonly rubberLiningService: RubberLiningService) {}

  @Get("types")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Delete("portal/product-codings/:id")
  @ApiOperation({ summary: "Delete product coding" })
  @ApiParam({ name: "id", description: "Product coding ID" })
  @ApiResponse({ status: 404, description: "Product coding not found" })
  async deleteProductCoding(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteProductCoding(Number(id));
    if (!deleted) throw new NotFoundException("Product coding not found");
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Post("portal/pricing-tiers")
  @ApiOperation({
    summary: "Create pricing tier",
    description: "Create a new pricing tier with name and pricing factor (percentage)",
  })
  async createPricingTier(@Body() dto: CreateRubberPricingTierDto): Promise<RubberPricingTierDto> {
    return this.rubberLiningService.createPricingTier(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Delete("portal/pricing-tiers/:id")
  @ApiOperation({ summary: "Delete pricing tier" })
  @ApiParam({ name: "id", description: "Pricing tier ID" })
  @ApiResponse({ status: 404, description: "Pricing tier not found" })
  async deletePricingTier(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deletePricingTier(Number(id));
    if (!deleted) throw new NotFoundException("Pricing tier not found");
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Get("portal/companies")
  @ApiOperation({
    summary: "List companies",
    description: "Retrieve all rubber lining companies with their pricing tier information",
  })
  async companies(): Promise<RubberCompanyDto[]> {
    return this.rubberLiningService.allCompanies();
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Delete("portal/companies/:id")
  @ApiOperation({ summary: "Delete company" })
  @ApiParam({ name: "id", description: "Company ID" })
  @ApiResponse({ status: 404, description: "Company not found" })
  async deleteCompany(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteCompany(Number(id));
    if (!deleted) throw new NotFoundException("Company not found");
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Get("portal/products")
  @ApiOperation({
    summary: "List products",
    description: "Retrieve all rubber products with resolved coding names and calculated prices",
  })
  async products(): Promise<RubberProductDto[]> {
    return this.rubberLiningService.allProducts();
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Delete("portal/products/:id")
  @ApiOperation({ summary: "Delete product" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 404, description: "Product not found" })
  async deleteProduct(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteProduct(Number(id));
    if (!deleted) throw new NotFoundException("Product not found");
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Post("portal/orders")
  @ApiOperation({
    summary: "Create order",
    description: "Create a new rubber lining order. Auto-generates order number if not provided.",
  })
  async createOrder(@Body() dto: CreateRubberOrderDto): Promise<RubberOrderDto> {
    return this.rubberLiningService.createOrder(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
  @Delete("portal/orders/:id")
  @ApiOperation({ summary: "Delete order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({ status: 404, description: "Order not found" })
  async deleteOrder(@Param("id") id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteOrder(Number(id));
    if (!deleted) throw new NotFoundException("Order not found");
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin", "employee")
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
}
