import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { OrbitJobDelistService } from "../services/orbit-job-delist.service";

@Controller("admin/annix-orbit/delist-reports")
@UseGuards(AdminAuthGuard, RolesGuard)
export class AdminOrbitDelistReportsController {
  constructor(private readonly service: OrbitJobDelistService) {}

  @Get()
  @Roles("admin")
  list() {
    return this.service.pendingReports();
  }

  @Get("count")
  @Roles("admin")
  async count() {
    const count = await this.service.pendingCount();
    return { count };
  }

  @Post(":id/confirm")
  @Roles("admin")
  async confirm(@Param("id", ParseIntPipe) id: number) {
    await this.service.confirm(id);
    return { success: true };
  }

  @Post(":id/reject")
  @Roles("admin")
  async reject(@Param("id", ParseIntPipe) id: number) {
    await this.service.reject(id);
    return { success: true };
  }
}
