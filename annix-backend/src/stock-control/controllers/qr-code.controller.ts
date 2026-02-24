import { Controller, Get, Param, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiProduces, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { QrCodeService } from "../services/qr-code.service";

@ApiTags("Stock Control - QR Codes")
@Controller("stock-control")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Get("inventory/:id/qr")
  @ApiOperation({ summary: "Download stock item QR code as PNG" })
  @ApiParam({ name: "id", description: "Stock item ID" })
  @ApiProduces("image/png")
  async stockItemQr(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
    const companyId = req.user.companyId;
    const buffer = await this.qrCodeService.stockItemQrCode(companyId, parseInt(id, 10));

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="stock-item-${id}-qr.png"`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  }

  @Get("inventory/:id/qr/pdf")
  @ApiOperation({ summary: "Download printable stock item PDF with QR code" })
  @ApiParam({ name: "id", description: "Stock item ID" })
  @ApiProduces("application/pdf")
  async stockItemPdf(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
    const companyId = req.user.companyId;
    const buffer = await this.qrCodeService.stockItemPdf(companyId, parseInt(id, 10));

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="stock-item-${id}-label.pdf"`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  }

  @Get("job-cards/:id/qr")
  @ApiOperation({ summary: "Download job card QR code as PNG" })
  @ApiParam({ name: "id", description: "Job card ID" })
  @ApiProduces("image/png")
  async jobCardQr(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
    const companyId = req.user.companyId;
    const buffer = await this.qrCodeService.jobCardQrCode(companyId, parseInt(id, 10));

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="job-card-${id}-qr.png"`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  }

  @Get("job-cards/:id/qr/pdf")
  @ApiOperation({ summary: "Download printable job card PDF with QR code" })
  @ApiParam({ name: "id", description: "Job card ID" })
  @ApiProduces("application/pdf")
  async jobCardPdf(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
    const companyId = req.user.companyId;
    const buffer = await this.qrCodeService.jobCardPdf(companyId, parseInt(id, 10));

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="job-card-${id}.pdf"`,
      "Content-Length": buffer.length,
    });

    res.send(buffer);
  }
}
