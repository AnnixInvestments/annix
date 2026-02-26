import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { QrCodeService } from "../services/qr-code.service";

@ApiTags("Stock Control - QR Codes")
@Controller("stock-control")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Get("inventory/:id/qr")
  @ApiOperation({ summary: "QR code PNG for a stock item" })
  async stockItemQr(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const buffer = await this.qrCodeService.stockItemQrPng(Number(id), req.user.companyId);
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="stock-${id}-qr.png"`,
    });
    res.send(buffer);
  }

  @Get("inventory/:id/qr/pdf")
  @ApiOperation({ summary: "Printable label PDF with QR code for a stock item" })
  async stockItemQrPdf(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const buffer = await this.qrCodeService.stockItemLabelPdf(Number(id), req.user.companyId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stock-${id}-label.pdf"`,
    });
    res.send(buffer);
  }

  @Get("job-cards/:id/qr")
  @ApiOperation({ summary: "QR code PNG for a job card" })
  async jobCardQr(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const buffer = await this.qrCodeService.jobCardQrPng(Number(id), req.user.companyId);
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="job-${id}-qr.png"`,
    });
    res.send(buffer);
  }

  @Get("job-cards/:id/qr/pdf")
  @ApiOperation({ summary: "Printable job card PDF with QR code" })
  async jobCardQrPdf(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const buffer = await this.qrCodeService.jobCardPdf(Number(id), req.user.companyId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="job-card-${id}.pdf"`,
    });
    res.send(buffer);
  }

  @Get("staff/:id/qr/pdf")
  @ApiOperation({ summary: "Printable staff ID card PDF" })
  async staffIdCardPdf(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const buffer = await this.qrCodeService.staffIdCardPdf(Number(id), req.user.companyId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="staff-id-${id}.pdf"`,
    });
    res.send(buffer);
  }

  @Post("staff/id-cards/pdf")
  @ApiOperation({ summary: "Batch printable staff ID cards PDF" })
  async batchStaffIdCardsPdf(
    @Body() body: { ids?: number[] },
    @Req() req: any,
    @Res() res: Response,
  ) {
    const buffer = await this.qrCodeService.batchStaffIdCardsPdf(req.user.companyId, body.ids);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="staff-id-cards.pdf"`,
    });
    res.send(buffer);
  }
}
