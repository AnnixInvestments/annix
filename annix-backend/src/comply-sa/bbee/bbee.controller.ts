import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaBbeeService } from "./bbee.service";

@ApiTags("comply-sa/bbee")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/bbee")
export class ComplySaBbeeController {
  constructor(private readonly bbeeService: ComplySaBbeeService) {}

  @Post("calculate")
  calculate(@Body() body: { turnover: number; blackOwnershipPercent: number }) {
    return this.bbeeService.calculateLevel(body.turnover, body.blackOwnershipPercent);
  }

  @Get("scorecard-elements")
  scorecardElements() {
    return this.bbeeService.scorecardElements();
  }
}
