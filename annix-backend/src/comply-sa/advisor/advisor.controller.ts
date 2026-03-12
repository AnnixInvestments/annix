import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaAdvisorService } from "./advisor.service";

@ApiTags("comply-sa/advisor")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/advisor")
export class ComplySaAdvisorController {
  constructor(private readonly advisorService: ComplySaAdvisorService) {}

  @Post("clients")
  async addClient(@Req() req: { user: { userId: number } }, @Body() body: { companyId: number }) {
    return this.advisorService.addClient(req.user.userId, body.companyId);
  }

  @Delete("clients/:companyId")
  async removeClient(
    @Req() req: { user: { userId: number } },
    @Param("companyId", ParseIntPipe) companyId: number,
  ) {
    return this.advisorService.removeClient(req.user.userId, companyId);
  }

  @Get("clients")
  async clientList(@Req() req: { user: { userId: number } }) {
    return this.advisorService.clientList(req.user.userId);
  }

  @Get("dashboard")
  async dashboard(@Req() req: { user: { userId: number } }) {
    return this.advisorService.clientDashboard(req.user.userId);
  }

  @Get("calendar")
  async calendar(
    @Req() req: { user: { userId: number } },
    @Query("month", ParseIntPipe) month: number,
    @Query("year", ParseIntPipe) year: number,
  ) {
    return this.advisorService.deadlineCalendar(req.user.userId, month, year);
  }
}
