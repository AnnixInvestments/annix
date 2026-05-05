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
import { UpsertEeTargetDto } from "../dto/admin-ee-target.dto";
import type {
  EeTargetMetric,
  EeTargetOccupationalLevel,
} from "../entities/cv-assistant-ee-sectoral-target.entity";
import { EeReportService } from "../services/ee-report.service";

@Controller("admin/cv-assistant/ee-sectoral-targets")
@UseGuards(AdminAuthGuard)
export class AdminEeTargetsController {
  constructor(private readonly eeReportService: EeReportService) {}

  @Get()
  async list() {
    return this.eeReportService.listSectoralTargets();
  }

  @Post()
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
  async remove(@Param("id", ParseIntPipe) id: number) {
    return this.eeReportService.deleteSectoralTarget(id);
  }
}
