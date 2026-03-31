import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  AdminScheduledJobsService,
  type ScheduledJobDto,
  type ScheduledJobExportDto,
  type SyncResultDto,
} from "./admin-scheduled-jobs.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@Controller("admin/scheduled-jobs")
export class AdminScheduledJobsController {
  constructor(private readonly scheduledJobsService: AdminScheduledJobsService) {}

  @Get()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  async list(): Promise<ScheduledJobDto[]> {
    return this.scheduledJobsService.allJobs();
  }

  @Get("export")
  async exportOverrides(
    @Headers("x-sync-token") syncToken: string,
  ): Promise<ScheduledJobExportDto[]> {
    if (!this.scheduledJobsService.validateSyncToken(syncToken)) {
      throw new ForbiddenException("Invalid or missing sync token");
    }
    return this.scheduledJobsService.exportOverrides();
  }

  @Get("sync-status")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  async syncStatus(): Promise<{ syncSource: string | null; lastSyncTimestamp: string | null }> {
    return this.scheduledJobsService.syncStatus();
  }

  @Post("sync")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  async sync(): Promise<SyncResultDto> {
    return this.scheduledJobsService.syncFromSource();
  }

  @Post(":name/pause")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  async pause(@Param("name") name: string): Promise<ScheduledJobDto> {
    return this.scheduledJobsService.pauseJob(name);
  }

  @Post(":name/resume")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  async resume(@Param("name") name: string): Promise<ScheduledJobDto> {
    return this.scheduledJobsService.resumeJob(name);
  }

  @Post(":name/frequency")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  async updateFrequency(
    @Param("name") name: string,
    @Body("cronExpression") cronExpression: string,
  ): Promise<ScheduledJobDto> {
    return this.scheduledJobsService.updateFrequency(name, cronExpression);
  }
}
