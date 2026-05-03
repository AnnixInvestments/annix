import type { Assignment } from "@annix/product-data/teacher-assistant";
import { Injectable, Logger } from "@nestjs/common";
import { PuppeteerPoolService } from "../../shared/services/puppeteer-pool.service";
import { renderAssignmentHtml } from "../templates/assignment.template";

@Injectable()
export class AssignmentPdfService {
  private readonly logger = new Logger(AssignmentPdfService.name);

  constructor(private readonly puppeteerPool: PuppeteerPoolService) {}

  async render(assignment: Assignment): Promise<Buffer> {
    this.logger.log(`Rendering Teacher Assistant PDF: "${assignment.title}"`);
    const html = renderAssignmentHtml(assignment);
    return this.puppeteerPool.generatePdfFromHtml(html, {
      format: "A4",
      printBackground: true,
      margin: {
        top: "18mm",
        bottom: "18mm",
        left: "15mm",
        right: "15mm",
      },
    });
  }
}
