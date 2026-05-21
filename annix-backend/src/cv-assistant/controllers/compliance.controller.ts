import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { fromISO } from "../../lib/datetime";
import { AnnixOrbitAuthGuard } from "../guards/cv-assistant-auth.guard";
import { type EeReport, EeReportService } from "../services/ee-report.service";

@Controller("cv-assistant/compliance")
@UseGuards(AnnixOrbitAuthGuard)
export class ComplianceController {
  constructor(private readonly eeReportService: EeReportService) {}

  @Get("ee-report")
  async eeReport(
    @Request() req: { user: { id: number; companyId: number } },
    @Query("dateFrom") dateFrom: string,
    @Query("dateTo") dateTo: string,
  ): Promise<EeReport> {
    return this.runReport(req, dateFrom, dateTo);
  }

  @Get("ee-report.csv")
  async eeReportCsv(
    @Request() req: { user: { id: number; companyId: number } },
    @Query("dateFrom") dateFrom: string,
    @Query("dateTo") dateTo: string,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.runReport(req, dateFrom, dateTo);
    const csv = this.eeReportService.buildCsv(report);
    const filename = `ee-report-${dateFrom}-to-${dateTo}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get("ee-report.pdf")
  async eeReportPdf(
    @Request() req: { user: { id: number; companyId: number } },
    @Query("dateFrom") dateFrom: string,
    @Query("dateTo") dateTo: string,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.runReport(req, dateFrom, dateTo);
    const buffer = await this.eeReportService.buildPdf(report);
    const filename = `ee-report-${dateFrom}-to-${dateTo}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(buffer.length));
    res.end(buffer);
  }

  private async runReport(
    req: { user: { id: number; companyId: number } },
    dateFrom: string,
    dateTo: string,
  ): Promise<EeReport> {
    if (!dateFrom || !dateTo) {
      throw new BadRequestException("dateFrom and dateTo are required ISO-8601 date strings");
    }
    const from = fromISO(dateFrom).toJSDate();
    const to = fromISO(dateTo).toJSDate();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException("dateFrom and dateTo must be valid ISO-8601 strings");
    }
    if (to <= from) {
      throw new BadRequestException("dateTo must be after dateFrom");
    }
    return this.eeReportService.buildReport(req.user.companyId, from, to, req.user.id);
  }
}
