import { Body, Controller, Get, Logger, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { CreateIssuanceDto, IssuanceFilters, IssuanceService } from "../services/issuance.service";

@ApiTags("Stock Control - Issuance")
@Controller("stock-control/issuance")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class IssuanceController {
  private readonly logger = new Logger(IssuanceController.name);

  constructor(private readonly issuanceService: IssuanceService) {}

  @Post("scan-qr")
  @StockControlRoles("storeman", "manager", "admin")
  @ApiOperation({ summary: "Scan and validate any QR code for issuance workflow" })
  async scanQr(@Req() req: any, @Body() body: { qrCode: string }) {
    return this.issuanceService.parseAndValidateQr(req.user.companyId, body.qrCode);
  }

  @Post()
  @StockControlRoles("storeman", "manager", "admin")
  @ApiOperation({ summary: "Create a new stock issuance" })
  async createIssuance(@Req() req: any, @Body() dto: CreateIssuanceDto) {
    return this.issuanceService.createIssuance(req.user.companyId, dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: "List all stock issuances with optional filters" })
  async findAll(
    @Req() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("staffId") staffId?: string,
    @Query("stockItemId") stockItemId?: string,
    @Query("jobCardId") jobCardId?: string,
  ) {
    const filters: IssuanceFilters = {};

    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (staffId) filters.staffId = parseInt(staffId, 10);
    if (stockItemId) filters.stockItemId = parseInt(stockItemId, 10);
    if (jobCardId) filters.jobCardId = parseInt(jobCardId, 10);

    return this.issuanceService.findAll(req.user.companyId, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific issuance by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.issuanceService.findById(req.user.companyId, id);
  }
}
