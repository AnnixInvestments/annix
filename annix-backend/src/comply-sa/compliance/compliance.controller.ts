import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaComplianceService } from "./compliance.service";

@ApiTags("comply-sa/compliance")
@Controller("comply-sa/compliance")
export class ComplySaComplianceController {
  constructor(private readonly complianceService: ComplySaComplianceService) {}

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
  @Post("assess")
  async assess(@Req() req: { user: { companyId: number } }) {
    return this.complianceService.assessCompany(req.user.companyId);
  }

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
  @Get("dashboard")
  async dashboard(@Req() req: { user: { companyId: number } }) {
    return this.complianceService.companyDashboard(req.user.companyId);
  }

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
  @Patch("status/:id")
  async updateStatus(
    @Req() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: { status?: string; notes?: string; lastCompletedDate?: string },
  ) {
    return this.complianceService.updateStatus(req.user.companyId, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
  @Post("checklist/:requirementId/toggle")
  async toggleChecklistStep(
    @Req() req: { user: { companyId: number; userId: number } },
    @Param("requirementId", ParseIntPipe) requirementId: number,
    @Body() body: { stepIndex: number },
  ) {
    return this.complianceService.toggleChecklistStep(
      req.user.companyId,
      requirementId,
      body.stepIndex,
      req.user.userId,
    );
  }

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
  @Get("requirements")
  async requirements() {
    return this.complianceService.allRequirements();
  }

  @Get("badge/:companyId")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Header("Content-Type", "image/svg+xml")
  @Header("Cache-Control", "no-cache, no-store, must-revalidate")
  async badge(@Param("companyId", ParseIntPipe) companyId: number): Promise<string> {
    const dashboard = await this.complianceService.companyDashboard(companyId);
    const score = dashboard.overallScore;

    const color = score >= 80 ? "#4caf50" : score >= 50 ? "#ff9800" : "#f44336";

    const label = "compliance";
    const value = `${score}%`;
    const labelWidth = 80;
    const valueWidth = 50;
    const totalWidth = labelWidth + valueWidth;

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">`,
      `  <linearGradient id="b" x2="0" y2="100%">`,
      `    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>`,
      `    <stop offset="1" stop-opacity=".1"/>`,
      "  </linearGradient>",
      `  <clipPath id="a">`,
      `    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>`,
      "  </clipPath>",
      `  <g clip-path="url(#a)">`,
      `    <rect width="${labelWidth}" height="20" fill="#555"/>`,
      `    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>`,
      `    <rect width="${totalWidth}" height="20" fill="url(#b)"/>`,
      "  </g>",
      `  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">`,
      `    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>`,
      `    <text x="${labelWidth / 2}" y="14">${label}</text>`,
      `    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>`,
      `    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>`,
      "  </g>",
      "</svg>",
    ].join("\n");
  }
}
