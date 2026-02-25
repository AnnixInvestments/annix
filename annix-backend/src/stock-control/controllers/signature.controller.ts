import { Body, Controller, Delete, Get, Logger, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { SignatureService } from "../services/signature.service";

@ApiTags("Stock Control - Signatures")
@Controller("stock-control/signatures")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class SignatureController {
  private readonly logger = new Logger(SignatureController.name);

  constructor(private readonly signatureService: SignatureService) {}

  @Get()
  @ApiOperation({ summary: "Current user signature" })
  async mySignature(@Req() req: any) {
    const signature = await this.signatureService.findByUser(req.user.id);
    return signature ? { signatureUrl: signature.signatureUrl } : { signatureUrl: null };
  }

  @Post()
  @ApiOperation({ summary: "Upload signature" })
  async uploadSignature(@Req() req: any, @Body() body: { signatureDataUrl: string }) {
    return this.signatureService.uploadSignature(
      req.user.companyId,
      req.user.id,
      body.signatureDataUrl,
    );
  }

  @Delete()
  @ApiOperation({ summary: "Delete signature" })
  async deleteSignature(@Req() req: any) {
    await this.signatureService.deleteSignature(req.user.id);
    return { success: true };
  }
}
