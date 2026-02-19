import { Controller, Get, Query, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { AnnixRepAuthGuard } from "../auth";
import { PdfGenerationService } from "../services/pdf-generation.service";
import { ReportsService } from "../services/reports.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Reports")
@Controller("annix-rep/reports")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfService: PdfGenerationService,
  ) {}

  @Get("weekly-activity")
  @ApiOperation({ summary: "Get weekly activity report" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiResponse({ status: 200, description: "Weekly activity report data" })
  weeklyActivity(
    @Req() req: AnnixRepRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.reportsService.weeklyActivityReport(req.annixRepUser.userId, startDate, endDate);
  }

  @Get("monthly-sales")
  @ApiOperation({ summary: "Get monthly sales report" })
  @ApiQuery({ name: "month", type: String, required: true, description: "YYYY-MM format" })
  @ApiResponse({ status: 200, description: "Monthly sales report data" })
  monthlySales(@Req() req: AnnixRepRequest, @Query("month") month: string) {
    return this.reportsService.monthlySalesReport(req.annixRepUser.userId, month);
  }

  @Get("territory-coverage")
  @ApiOperation({ summary: "Get territory coverage report" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiResponse({ status: 200, description: "Territory coverage report data" })
  territoryCoverage(
    @Req() req: AnnixRepRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.reportsService.territoryCoverageReport(req.annixRepUser.userId, startDate, endDate);
  }

  @Get("meeting-outcomes")
  @ApiOperation({ summary: "Get meeting outcomes report" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiResponse({ status: 200, description: "Meeting outcomes report data" })
  meetingOutcomes(
    @Req() req: AnnixRepRequest,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.reportsService.meetingOutcomesReport(req.annixRepUser.userId, startDate, endDate);
  }

  @Get("weekly-activity/pdf")
  @ApiOperation({ summary: "Download weekly activity report as PDF" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiProduces("application/pdf")
  @ApiResponse({ status: 200, description: "PDF file" })
  async weeklyActivityPdf(
    @Req() req: AnnixRepRequest,
    @Res() res: Response,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    const report = await this.reportsService.weeklyActivityReport(
      req.annixRepUser.userId,
      startDate,
      endDate,
    );
    const pdf = await this.pdfService.generateWeeklyActivityPdf(report, req.annixRepUser.email);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="weekly-activity-report-${startDate}-${endDate}.pdf"`,
    );
    res.send(pdf);
  }

  @Get("monthly-sales/pdf")
  @ApiOperation({ summary: "Download monthly sales report as PDF" })
  @ApiQuery({ name: "month", type: String, required: true, description: "YYYY-MM format" })
  @ApiProduces("application/pdf")
  @ApiResponse({ status: 200, description: "PDF file" })
  async monthlySalesPdf(
    @Req() req: AnnixRepRequest,
    @Res() res: Response,
    @Query("month") month: string,
  ) {
    const report = await this.reportsService.monthlySalesReport(req.annixRepUser.userId, month);
    const pdf = await this.pdfService.generateMonthlySalesPdf(report, req.annixRepUser.email);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="monthly-sales-report-${month}.pdf"`,
    );
    res.send(pdf);
  }

  @Get("territory-coverage/pdf")
  @ApiOperation({ summary: "Download territory coverage report as PDF" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiProduces("application/pdf")
  @ApiResponse({ status: 200, description: "PDF file" })
  async territoryCoveragePdf(
    @Req() req: AnnixRepRequest,
    @Res() res: Response,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    const report = await this.reportsService.territoryCoverageReport(
      req.annixRepUser.userId,
      startDate,
      endDate,
    );
    const pdf = await this.pdfService.generateTerritoryCoveragePdf(report, req.annixRepUser.email);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="territory-coverage-report-${startDate}-${endDate}.pdf"`,
    );
    res.send(pdf);
  }

  @Get("meeting-outcomes/pdf")
  @ApiOperation({ summary: "Download meeting outcomes report as PDF" })
  @ApiQuery({ name: "startDate", type: String, required: true })
  @ApiQuery({ name: "endDate", type: String, required: true })
  @ApiProduces("application/pdf")
  @ApiResponse({ status: 200, description: "PDF file" })
  async meetingOutcomesPdf(
    @Req() req: AnnixRepRequest,
    @Res() res: Response,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    const report = await this.reportsService.meetingOutcomesReport(
      req.annixRepUser.userId,
      startDate,
      endDate,
    );
    const pdf = await this.pdfService.generateMeetingOutcomesPdf(report, req.annixRepUser.email);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meeting-outcomes-report-${startDate}-${endDate}.pdf"`,
    );
    res.send(pdf);
  }
}
