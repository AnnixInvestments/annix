import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/public.decorator";
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
import { RubberLiningService } from "./rubber-lining.service";

@ApiTags("Rubber Lining")
@Controller("rubber-lining")
export class RubberReferenceDataController {
  constructor(private readonly rubberLiningService: RubberLiningService) {}

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
}
