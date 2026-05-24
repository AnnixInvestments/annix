import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelBbeeService } from "./bbee.service";

@ApiTags("annix-sentinel/bbee")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/bbee")
export class AnnixSentinelBbeeController {
  constructor(private readonly bbeeService: AnnixSentinelBbeeService) {}

  @Post("calculate")
  calculate(@Body() body: { turnover: number; blackOwnershipPercent: number }) {
    return this.bbeeService.calculateLevel(body.turnover, body.blackOwnershipPercent);
  }

  @Get("scorecard-elements")
  scorecardElements() {
    return this.bbeeService.scorecardElements();
  }
}
