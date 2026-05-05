import { BadRequestException, Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { fromISO } from "../../lib/datetime";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { type EeReport, EeReportService } from "../services/ee-report.service";

@Controller("cv-assistant/compliance")
@UseGuards(CvAssistantAuthGuard)
export class ComplianceController {
  constructor(private readonly eeReportService: EeReportService) {}

  @Get("ee-report")
  async eeReport(
    @Request() req: { user: { id: number; companyId: number } },
    @Query("dateFrom") dateFrom: string,
    @Query("dateTo") dateTo: string,
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
