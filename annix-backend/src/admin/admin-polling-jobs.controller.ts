import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  AdminPollingJobsService,
  type NightSuspensionHours,
  type PollingJobDto,
  type PollingJobRuntimeConfigDto,
  type PollingJobsGlobalSettingsDto,
} from "./admin-polling-jobs.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@Controller("admin/polling-jobs")
export class AdminPollingJobsController {
  constructor(private readonly pollingJobsService: AdminPollingJobsService) {}

  @Get()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  list(): Promise<PollingJobDto[]> {
    return this.pollingJobsService.allJobs();
  }

  @Get("global-settings")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  globalSettings(): Promise<PollingJobsGlobalSettingsDto> {
    return this.pollingJobsService.globalSettings();
  }

  @Post("global-settings")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  updateGlobalSettings(
    @Body() body: PollingJobsGlobalSettingsDto,
  ): Promise<PollingJobsGlobalSettingsDto> {
    return this.pollingJobsService.updateGlobalSettings(body);
  }

  @Post(":name/pause")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  pause(@Param("name") name: string): Promise<PollingJobDto> {
    return this.pollingJobsService.pauseJob(name);
  }

  @Post(":name/resume")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  resume(@Param("name") name: string): Promise<PollingJobDto> {
    return this.pollingJobsService.resumeJob(name);
  }

  @Post(":name/interval")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  updateInterval(
    @Param("name") name: string,
    @Body("intervalMs") intervalMs: number,
  ): Promise<PollingJobDto> {
    return this.pollingJobsService.updateInterval(name, intervalMs);
  }

  @Post(":name/night-suspension")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  updateNightSuspension(
    @Param("name") name: string,
    @Body("nightSuspensionHours") nightSuspensionHours: NightSuspensionHours,
  ): Promise<PollingJobDto> {
    return this.pollingJobsService.updateNightSuspension(name, nightSuspensionHours);
  }
}

@Controller("public/polling-jobs")
export class PublicPollingJobsController {
  constructor(private readonly pollingJobsService: AdminPollingJobsService) {}

  @Get("config")
  config(): Promise<PollingJobRuntimeConfigDto> {
    return this.pollingJobsService.runtimeConfig();
  }
}
