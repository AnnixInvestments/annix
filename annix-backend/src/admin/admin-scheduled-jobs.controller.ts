import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminScheduledJobsService, type ScheduledJobDto } from "./admin-scheduled-jobs.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@Controller("admin/scheduled-jobs")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin")
export class AdminScheduledJobsController {
  constructor(private readonly scheduledJobsService: AdminScheduledJobsService) {}

  @Get()
  async list(): Promise<ScheduledJobDto[]> {
    return this.scheduledJobsService.allJobs();
  }

  @Post(":name/pause")
  async pause(@Param("name") name: string): Promise<ScheduledJobDto> {
    return this.scheduledJobsService.pauseJob(name);
  }

  @Post(":name/resume")
  async resume(@Param("name") name: string): Promise<ScheduledJobDto> {
    return this.scheduledJobsService.resumeJob(name);
  }

  @Post(":name/frequency")
  async updateFrequency(
    @Param("name") name: string,
    @Body("cronExpression") cronExpression: string,
  ): Promise<ScheduledJobDto> {
    return this.scheduledJobsService.updateFrequency(name, cronExpression);
  }
}
