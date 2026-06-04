import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { OrbitJobDelistService } from "../services/orbit-job-delist.service";

@Controller("admin/annix-orbit/delist-reports")
@UseGuards(AdminAuthGuard)
export class AdminOrbitDelistReportsController {
  constructor(private readonly service: OrbitJobDelistService) {}

  @Get()
  list() {
    return this.service.pendingReports();
  }

  @Get("count")
  async count() {
    const count = await this.service.pendingCount();
    return { count };
  }

  @Post(":id/confirm")
  async confirm(@Param("id", ParseIntPipe) id: number) {
    await this.service.confirm(id);
    return { success: true };
  }

  @Post(":id/reject")
  async reject(@Param("id", ParseIntPipe) id: number) {
    await this.service.reject(id);
    return { success: true };
  }
}
