import { Injectable, Logger } from "@nestjs/common";
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
    let puppeteer: typeof import("puppeteer");
    try {
      puppeteer = await import("puppeteer");
    } catch (importError) {
      this.logger.error("Failed to import puppeteer", importError);
      throw new Error("PDF generation is not available");
    }

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "networkidle0",
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          bottom: "20mm",
          left: "15mm",
          right: "15mm",
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error("Failed to generate PDF", error);
      throw new Error("Failed to generate PDF");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
