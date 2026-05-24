import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelTaxService } from "./tax.service";

@ApiTags("annix-sentinel/tax")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/tax")
export class AnnixSentinelTaxController {
  constructor(private readonly taxService: AnnixSentinelTaxService) {}

  @Post("minimum-wage-check")
  minimumWageCheck(@Body() body: { hourlyRate: number }) {
    return this.taxService.minimumWageCheck(body.hourlyRate);
  }

  @Post("vat-assessment")
  vatAssessment(@Body() body: { annualTurnover: number }) {
    return this.taxService.vatAssessment(body.annualTurnover);
  }

  @Post("turnover-tax-estimate")
  turnoverTaxEstimate(@Body() body: { annualTurnover: number }) {
    return this.taxService.turnoverTaxEstimate(body.annualTurnover);
  }

  @Post("corporate-tax-estimate")
  corporateTaxEstimate(@Body() body: { taxableIncome: number }) {
    return this.taxService.corporateTaxEstimate(body.taxableIncome);
  }

  @Post("sdl-assessment")
  sdlAssessment(@Body() body: { annualPayroll: number }) {
    return this.taxService.sdlApplicable(body.annualPayroll);
  }

  @Post("uif-calculation")
  uifCalculation(@Body() body: { monthlyRemuneration: number }) {
    return this.taxService.uifCalculation(body.monthlyRemuneration);
  }

  @Get("calendar")
  calendar(@Query("financialYearEndMonth") financialYearEndMonth: string) {
    return this.taxService.taxCalendar(parseInt(financialYearEndMonth, 10));
  }

  @Get("seta-grants")
  setaGrants() {
    return this.taxService.setaGrantInfo();
  }
}
