import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { UpsertEeTargetDto } from "../dto/admin-ee-target.dto";
import type {
  EeTargetMetric,
  EeTargetOccupationalLevel,
} from "../entities/annix-orbit-ee-sectoral-target.entity";
import { EeReportService } from "../services/ee-report.service";

@Controller("admin/annix-orbit/ee-sectoral-targets")
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminEeTargetsController {
  constructor(private readonly eeReportService: EeReportService) {}

  @Get()
  @Roles("admin")
  async list() {
    return this.eeReportService.listSectoralTargets();
  }

  @Post()
  @Roles("admin")
  async upsert(@Body() dto: UpsertEeTargetDto) {
    return this.eeReportService.upsertSectoralTarget({
      id: dto.id,
      sectorCode: dto.sectorCode,
      occupationalLevel: dto.occupationalLevel as EeTargetOccupationalLevel,
      targetYear: dto.targetYear,
      targetMetric: dto.targetMetric as EeTargetMetric,
      targetPercent: dto.targetPercent,
      gazetteReference: dto.gazetteReference,
    });
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Param("id", ParseIntPipe) id: number) {
    return this.eeReportService.deleteSectoralTarget(id);
  }
}
