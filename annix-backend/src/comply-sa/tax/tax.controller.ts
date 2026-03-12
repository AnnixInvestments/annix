import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaTaxService } from "./tax.service";

@ApiTags("comply-sa/tax")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard)
@Controller("comply-sa/tax")
export class ComplySaTaxController {
  constructor(private readonly taxService: ComplySaTaxService) {}

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
