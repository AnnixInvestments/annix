import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import { StockTakeReconciliationService } from "../services/stock-take-reconciliation.service";

@ApiTags("Stock Control - Stock Take Reconciliation")
@Controller("stock-control/reconciliation")
@UseGuards(StockControlAuthGuard, StockControlOnboardingGuard, StockControlRoleGuard)
@StockControlRoles("manager", "admin")
@PermissionKey("job-cards.import")
export class StockTakeReconciliationController {
  constructor(private readonly reconciliationService: StockTakeReconciliationService) {}

  @Post("analyze")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Analyse a month-end stock-take spreadsheet against app records" })
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { periodLabel?: string; periodStart?: string; periodEnd?: string },
    @Req() req: any,
  ) {
    return this.reconciliationService.analyzeUpload(
      req.user.companyId,
      file.buffer,
      body.periodLabel ?? null,
      body.periodStart ?? "",
      body.periodEnd ?? "",
    );
  }
}
