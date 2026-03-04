import { Injectable, Logger } from "@nestjs/common";
import { PuppeteerPoolService } from "../../shared/services/puppeteer-pool.service";
import type {
  MeetingOutcomesReport,
  MonthlySalesReport,
  TerritoryCoverageReport,
  WeeklyActivityReport,
} from "../dto/report.dto";
import {
  meetingOutcomesTemplate,
  monthlySalesTemplate,
  territoryCoverageTemplate,
  weeklyActivityTemplate,
} from "../templates";

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  constructor(private readonly puppeteerPool: PuppeteerPoolService) {}

  async generateWeeklyActivityPdf(report: WeeklyActivityReport, repName: string): Promise<Buffer> {
    const html = weeklyActivityTemplate(report, repName);
    return this.generatePdfFromHtml(html);
  }

  async generateMonthlySalesPdf(report: MonthlySalesReport, repName: string): Promise<Buffer> {
    const html = monthlySalesTemplate(report, repName);
    return this.generatePdfFromHtml(html);
  }

  async generateTerritoryCoveragePdf(
    report: TerritoryCoverageReport,
    repName: string,
  ): Promise<Buffer> {
    const html = territoryCoverageTemplate(report, repName);
    return this.generatePdfFromHtml(html);
  }

  async generateMeetingOutcomesPdf(
    report: MeetingOutcomesReport,
    repName: string,
  ): Promise<Buffer> {
    const html = meetingOutcomesTemplate(report, repName);
    return this.generatePdfFromHtml(html);
  }

  private async generatePdfFromHtml(html: string): Promise<Buffer> {
    this.logger.log("Generating PDF via pooled browser...");
    return this.puppeteerPool.generatePdfFromHtml(html, {
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });
  }
}
