import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DataValidationService } from "./data-validation.service";
import {
  CoverageSummaryDto,
  PtCurveVerificationDto,
  RunValidationDto,
  SpecificationNormalizationDto,
  ValidationResultDto,
  ValidationRuleDto,
} from "./dto/data-validation.dto";

@ApiTags("Data Validation")
@Controller("data-validation")
export class DataValidationController {
  constructor(private readonly validationService: DataValidationService) {}

  @Get("rules")
  @ApiOperation({ summary: "Get all validation rules" })
  @ApiResponse({ status: 200, type: [ValidationRuleDto] })
  async rules(): Promise<ValidationRuleDto[]> {
    return this.validationService.rules();
  }

  @Post("run")
  @ApiOperation({ summary: "Run data validation" })
  @ApiResponse({ status: 200, type: ValidationResultDto })
  async runValidation(@Body() dto: RunValidationDto): Promise<ValidationResultDto> {
    return this.validationService.runValidation(dto);
  }

  @Get("pt-curve-verification")
  @ApiOperation({ summary: "Get P-T curve verification results" })
  @ApiQuery({ name: "standardCode", required: false })
  @ApiQuery({ name: "materialGroup", required: false })
  @ApiResponse({ status: 200, type: [PtCurveVerificationDto] })
  async ptCurveVerification(
    @Query("standardCode") standardCode?: string,
    @Query("materialGroup") materialGroup?: string,
  ): Promise<PtCurveVerificationDto[]> {
    return this.validationService.ptCurveVerification(standardCode, materialGroup);
  }

  @Get("coverage-report")
  @ApiOperation({ summary: "Get data coverage report" })
  @ApiResponse({ status: 200, type: CoverageSummaryDto })
  async coverageReport(): Promise<CoverageSummaryDto> {
    return this.validationService.coverageReport();
  }

  @Get("specification-normalizations")
  @ApiOperation({ summary: "Get steel specification normalizations" })
  @ApiResponse({ status: 200, type: [SpecificationNormalizationDto] })
  async specificationNormalizations(): Promise<SpecificationNormalizationDto[]> {
    return this.validationService.specificationNormalizations();
  }

  @Get("flange-dimension-validation")
  @ApiOperation({ summary: "Get flange dimension validation view" })
  async dimensionValidationView(): Promise<Record<string, unknown>[]> {
    return this.validationService.dimensionValidationView();
  }

  @Get("standard-coverage")
  @ApiOperation({ summary: "Get standard coverage summary" })
  async standardCoverageSummary(): Promise<Record<string, unknown>[]> {
    return this.validationService.standardCoverageSummary();
  }

  @Get("flange-completeness")
  @ApiOperation({ summary: "Get flange data completeness by standard/class" })
  async flangeDataCompleteness(): Promise<Record<string, unknown>[]> {
    return this.validationService.flangeDataCompleteness();
  }

  @Get("pt-rating-coverage")
  @ApiOperation({ summary: "Get P-T rating coverage by material" })
  async ptRatingCoverage(): Promise<Record<string, unknown>[]> {
    return this.validationService.ptRatingCoverage();
  }
}
