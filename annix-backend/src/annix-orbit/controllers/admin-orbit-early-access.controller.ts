import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { OrbitEarlyAccessService } from "../services/orbit-early-access.service";

@Controller("admin/annix-orbit/early-access")
@UseGuards(AdminAuthGuard)
export class AdminOrbitEarlyAccessController {
  constructor(private readonly service: OrbitEarlyAccessService) {}

  @Get("stats")
  stats() {
    return this.service.stats();
  }

  @Get("list")
  list() {
    return this.service.listAll();
  }

  @Get("export.csv")
  async exportCsv(@Res() res: Response): Promise<void> {
    const rows = await this.service.listAll();
    const csv = this.service.buildCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="orbit-early-access.csv"');
    res.send(csv);
  }
}
