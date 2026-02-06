import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RubberLiningService } from './rubber-lining.service';
import {
  RubberTypeDto,
  RubberSpecificationDto,
  RubberApplicationRatingDto,
  RubberThicknessRecommendationDto,
  RubberAdhesionRequirementDto,
  RubberRecommendationRequestDto,
  RubberRecommendationDto,
  LineCalloutDto,
} from './dto/rubber-lining.dto';
import {
  ProductCodingType,
} from './entities/rubber-product-coding.entity';
import { RubberOrderStatus } from './entities/rubber-order.entity';
import {
  RubberProductCodingDto,
  CreateRubberProductCodingDto,
  UpdateRubberProductCodingDto,
  RubberPricingTierDto,
  CreateRubberPricingTierDto,
  UpdateRubberPricingTierDto,
  RubberCompanyDto,
  CreateRubberCompanyDto,
  UpdateRubberCompanyDto,
  RubberProductDto,
  CreateRubberProductDto,
  UpdateRubberProductDto,
  RubberOrderDto,
  CreateRubberOrderDto,
  UpdateRubberOrderDto,
  RubberPriceCalculationRequestDto,
  RubberPriceCalculationDto,
} from './dto/rubber-portal.dto';

@Controller('rubber-lining')
export class RubberLiningController {
  constructor(private readonly rubberLiningService: RubberLiningService) {}

  @Get('types')
  async rubberTypes(): Promise<RubberTypeDto[]> {
    return this.rubberLiningService.allRubberTypes();
  }

  @Get('types/:id')
  async rubberTypeById(@Param('id') id: string): Promise<RubberTypeDto | null> {
    return this.rubberLiningService.rubberTypeById(Number(id));
  }

  @Get('types/number/:typeNumber')
  async rubberTypeByNumber(
    @Param('typeNumber') typeNumber: string,
  ): Promise<RubberTypeDto | null> {
    return this.rubberLiningService.rubberTypeByNumber(Number(typeNumber));
  }

  @Get('specifications')
  async specifications(): Promise<RubberSpecificationDto[]> {
    return this.rubberLiningService.allSpecifications();
  }

  @Get('specifications/type/:typeNumber')
  async specificationsByType(
    @Param('typeNumber') typeNumber: string,
  ): Promise<RubberSpecificationDto[]> {
    return this.rubberLiningService.specificationsByType(Number(typeNumber));
  }

  @Get('specifications/callout/:typeNumber/:grade/:hardnessClass')
  async specificationByCallout(
    @Param('typeNumber') typeNumber: string,
    @Param('grade') grade: string,
    @Param('hardnessClass') hardnessClass: string,
  ): Promise<RubberSpecificationDto | null> {
    return this.rubberLiningService.specificationByLineCallout(
      Number(typeNumber),
      grade,
      Number(hardnessClass),
    );
  }

  @Get('application-ratings')
  async applicationRatings(
    @Query('typeNumber') typeNumber?: string,
    @Query('chemicalCategory') chemicalCategory?: string,
  ): Promise<RubberApplicationRatingDto[]> {
    return this.rubberLiningService.applicationRatings(
      typeNumber ? Number(typeNumber) : undefined,
      chemicalCategory,
    );
  }

  @Get('thickness-recommendations')
  async thicknessRecommendations(): Promise<
    RubberThicknessRecommendationDto[]
  > {
    return this.rubberLiningService.thicknessRecommendations();
  }

  @Get('adhesion-requirements')
  async adhesionRequirements(
    @Query('typeNumber') typeNumber?: string,
  ): Promise<RubberAdhesionRequirementDto[]> {
    return this.rubberLiningService.adhesionRequirements(
      typeNumber ? Number(typeNumber) : undefined,
    );
  }

  @Post('recommend')
  async recommend(
    @Body() request: RubberRecommendationRequestDto,
  ): Promise<RubberRecommendationDto> {
    return this.rubberLiningService.recommendRubberLining(request);
  }

  @Get('line-callout')
  async lineCallout(
    @Query('type') type: string,
    @Query('grade') grade: string,
    @Query('hardness') hardness: string,
    @Query('properties') properties?: string,
  ): Promise<LineCalloutDto> {
    const specialProps = properties
      ? properties.split(',').map((p) => Number(p.trim()))
      : [];
    return this.rubberLiningService.generateLineCallout(
      Number(type),
      grade,
      Number(hardness),
      specialProps,
    );
  }

  @Get('chemical-categories')
  async chemicalCategories(): Promise<{ value: string; label: string }[]> {
    return [
      { value: 'acids_inorganic', label: 'Inorganic Acids (H2SO4, HCl, HNO3)' },
      { value: 'acids_organic', label: 'Organic Acids (Acetic, Citric)' },
      { value: 'alkalis', label: 'Alkalis (NaOH, KOH, Ammonia)' },
      { value: 'alcohols', label: 'Alcohols (Methanol, Ethanol)' },
      { value: 'hydrocarbons', label: 'Hydrocarbons (Benzene, Toluene)' },
      { value: 'oils_mineral', label: 'Mineral Oils (Petroleum, Lubricants)' },
      { value: 'oils_vegetable', label: 'Vegetable Oils' },
      { value: 'chlorine_compounds', label: 'Chlorine Compounds (Cl2, NaOCl)' },
      { value: 'oxidizing_agents', label: 'Oxidizing Agents (H2O2, KMnO4)' },
      { value: 'solvents', label: 'Solvents (Acetone, MEK, Xylene)' },
      { value: 'water', label: 'Water (Fresh, Salt, Treated)' },
      { value: 'slurry_abrasive', label: 'Abrasive Slurries' },
    ];
  }

  @Get('hardness-classes')
  async hardnessClasses(): Promise<{ value: number; label: string }[]> {
    return [
      {
        value: 40,
        label: '40 IRHD - Soft (High flexibility, impact absorption)',
      },
      { value: 50, label: '50 IRHD - Medium-Soft (General purpose)' },
      { value: 60, label: '60 IRHD - Medium-Hard (Abrasion resistant)' },
      { value: 70, label: '70 IRHD - Hard (High abrasion, lower flexibility)' },
    ];
  }

  @Get('grades')
  async grades(): Promise<
    { value: string; label: string; tensileMin: number }[]
  > {
    return [
      {
        value: 'A',
        label: 'Grade A - High Strength (≥18 MPa)',
        tensileMin: 18,
      },
      {
        value: 'B',
        label: 'Grade B - Standard Strength (≥14 MPa)',
        tensileMin: 14,
      },
      { value: 'C', label: 'Grade C - Economy (≥7 MPa)', tensileMin: 7 },
      { value: 'D', label: 'Grade D - Ebonite (Hard rubber)', tensileMin: 0 },
    ];
  }

  @Get('special-properties')
  async specialProperties(): Promise<
    { value: number; label: string; code: string }[]
  > {
    return [
      { value: 1, label: 'Heat Resistance', code: 'I' },
      { value: 2, label: 'Ozone Resistance', code: 'II' },
      { value: 3, label: 'Chemical Resistance', code: 'III' },
      { value: 4, label: 'Abrasion Resistance', code: 'IV' },
      { value: 5, label: 'Contaminant Release Resistance', code: 'V' },
      { value: 6, label: 'Water Resistance', code: 'VI' },
      { value: 7, label: 'Oil Resistance', code: 'VII' },
    ];
  }

  @Get('vulcanization-methods')
  async vulcanizationMethods(): Promise<
    { value: string; label: string; description: string }[]
  > {
    return [
      {
        value: 'autoclave',
        label: 'Autoclave Vulcanization',
        description:
          'Carried out under pressure in an autoclave. Preferred method when pipe/vessel size permits.',
      },
      {
        value: 'open',
        label: 'Open Vulcanization',
        description:
          'Covering with canvas and injecting steam or hot gas. Hardness tolerance +5/-10 IRHD.',
      },
      {
        value: 'hot_water',
        label: 'Hot-Water Vulcanization',
        description: 'Filling with water heated to required temperature.',
      },
      {
        value: 'chemical',
        label: 'Chemical Vulcanization',
        description:
          'Self-vulcanizing at room temperature. Wider hardness tolerance ±10 IRHD.',
      },
    ];
  }

  @Get('application-environments')
  async applicationEnvironments(): Promise<{ value: string; label: string }[]> {
    return [
      { value: 'mining_slurry', label: 'Mining Slurry Pipelines' },
      { value: 'chemical_processing', label: 'Chemical Processing' },
      { value: 'water_treatment', label: 'Water Treatment' },
      { value: 'oil_and_gas', label: 'Oil and Gas' },
      { value: 'food_processing', label: 'Food Processing' },
      { value: 'general_industrial', label: 'General Industrial' },
    ];
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/product-codings')
  async productCodings(
    @Query('codingType') codingType?: ProductCodingType,
  ): Promise<RubberProductCodingDto[]> {
    return this.rubberLiningService.allProductCodings(codingType);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/product-codings/:id')
  async productCodingById(
    @Param('id') id: string,
  ): Promise<RubberProductCodingDto> {
    const coding = await this.rubberLiningService.productCodingById(Number(id));
    if (!coding) throw new NotFoundException('Product coding not found');
    return coding;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Post('portal/product-codings')
  async createProductCoding(
    @Body() dto: CreateRubberProductCodingDto,
  ): Promise<RubberProductCodingDto> {
    return this.rubberLiningService.createProductCoding(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Put('portal/product-codings/:id')
  async updateProductCoding(
    @Param('id') id: string,
    @Body() dto: UpdateRubberProductCodingDto,
  ): Promise<RubberProductCodingDto> {
    const coding = await this.rubberLiningService.updateProductCoding(
      Number(id),
      dto,
    );
    if (!coding) throw new NotFoundException('Product coding not found');
    return coding;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Delete('portal/product-codings/:id')
  async deleteProductCoding(@Param('id') id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteProductCoding(
      Number(id),
    );
    if (!deleted) throw new NotFoundException('Product coding not found');
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/pricing-tiers')
  async pricingTiers(): Promise<RubberPricingTierDto[]> {
    return this.rubberLiningService.allPricingTiers();
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/pricing-tiers/:id')
  async pricingTierById(
    @Param('id') id: string,
  ): Promise<RubberPricingTierDto> {
    const tier = await this.rubberLiningService.pricingTierById(Number(id));
    if (!tier) throw new NotFoundException('Pricing tier not found');
    return tier;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Post('portal/pricing-tiers')
  async createPricingTier(
    @Body() dto: CreateRubberPricingTierDto,
  ): Promise<RubberPricingTierDto> {
    return this.rubberLiningService.createPricingTier(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Put('portal/pricing-tiers/:id')
  async updatePricingTier(
    @Param('id') id: string,
    @Body() dto: UpdateRubberPricingTierDto,
  ): Promise<RubberPricingTierDto> {
    const tier = await this.rubberLiningService.updatePricingTier(
      Number(id),
      dto,
    );
    if (!tier) throw new NotFoundException('Pricing tier not found');
    return tier;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Delete('portal/pricing-tiers/:id')
  async deletePricingTier(@Param('id') id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deletePricingTier(Number(id));
    if (!deleted) throw new NotFoundException('Pricing tier not found');
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/companies')
  async companies(): Promise<RubberCompanyDto[]> {
    return this.rubberLiningService.allCompanies();
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/companies/:id')
  async companyById(@Param('id') id: string): Promise<RubberCompanyDto> {
    const company = await this.rubberLiningService.companyById(Number(id));
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Post('portal/companies')
  async createCompany(
    @Body() dto: CreateRubberCompanyDto,
  ): Promise<RubberCompanyDto> {
    return this.rubberLiningService.createCompany(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Put('portal/companies/:id')
  async updateCompany(
    @Param('id') id: string,
    @Body() dto: UpdateRubberCompanyDto,
  ): Promise<RubberCompanyDto> {
    const company = await this.rubberLiningService.updateCompany(
      Number(id),
      dto,
    );
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Delete('portal/companies/:id')
  async deleteCompany(@Param('id') id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteCompany(Number(id));
    if (!deleted) throw new NotFoundException('Company not found');
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/products')
  async products(): Promise<RubberProductDto[]> {
    return this.rubberLiningService.allProducts();
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/products/:id')
  async productById(@Param('id') id: string): Promise<RubberProductDto> {
    const product = await this.rubberLiningService.productById(Number(id));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Post('portal/products')
  async createProduct(
    @Body() dto: CreateRubberProductDto,
  ): Promise<RubberProductDto> {
    return this.rubberLiningService.createProduct(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Put('portal/products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateRubberProductDto,
  ): Promise<RubberProductDto> {
    const product = await this.rubberLiningService.updateProduct(
      Number(id),
      dto,
    );
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Delete('portal/products/:id')
  async deleteProduct(@Param('id') id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteProduct(Number(id));
    if (!deleted) throw new NotFoundException('Product not found');
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/orders')
  async orders(@Query('status') status?: string): Promise<RubberOrderDto[]> {
    const orderStatus =
      status !== undefined ? (Number(status) as RubberOrderStatus) : undefined;
    return this.rubberLiningService.allOrders(orderStatus);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/orders/:id')
  async orderById(@Param('id') id: string): Promise<RubberOrderDto> {
    const order = await this.rubberLiningService.orderById(Number(id));
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Post('portal/orders')
  async createOrder(@Body() dto: CreateRubberOrderDto): Promise<RubberOrderDto> {
    return this.rubberLiningService.createOrder(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Put('portal/orders/:id')
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateRubberOrderDto,
  ): Promise<RubberOrderDto> {
    const order = await this.rubberLiningService.updateOrder(Number(id), dto);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Delete('portal/orders/:id')
  async deleteOrder(@Param('id') id: string): Promise<void> {
    const deleted = await this.rubberLiningService.deleteOrder(Number(id));
    if (!deleted) throw new NotFoundException('Order not found');
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/order-statuses')
  async orderStatuses(): Promise<{ value: number; label: string }[]> {
    return [
      { value: -1, label: 'New' },
      { value: 0, label: 'Draft' },
      { value: 1, label: 'Cancelled' },
      { value: 2, label: 'Partially Submitted' },
      { value: 3, label: 'Submitted' },
      { value: 4, label: 'Manufacturing' },
      { value: 5, label: 'Delivering' },
      { value: 6, label: 'Complete' },
    ];
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Get('portal/coding-types')
  async codingTypes(): Promise<{ value: string; label: string }[]> {
    return [
      { value: 'COLOUR', label: 'Colour' },
      { value: 'COMPOUND', label: 'Compound' },
      { value: 'CURING_METHOD', label: 'Curing Method' },
      { value: 'GRADE', label: 'Grade' },
      { value: 'HARDNESS', label: 'Hardness' },
      { value: 'TYPE', label: 'Type' },
    ];
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @Post('portal/calculate-price')
  async calculatePrice(
    @Body() request: RubberPriceCalculationRequestDto,
  ): Promise<RubberPriceCalculationDto> {
    const result = await this.rubberLiningService.calculatePrice(request);
    if (!result)
      throw new NotFoundException('Product or company not found');
    return result;
  }
}
