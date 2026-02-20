import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { MovementService } from "../services/movement.service";

@ApiTags("Stock Control - Movements")
@Controller("stock-control/movements")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class MovementsController {
  constructor(private readonly movementService: MovementService) {}

  @Get()
  @ApiOperation({ summary: "List stock movements with optional filters" })
  async list(
    @Req() req: any,
    @Query("stockItemId") stockItemId?: string,
    @Query("movementType") movementType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit?: string,
  ) {
    return this.movementService.findAll(req.user.companyId, {
      stockItemId: stockItemId ? Number(stockItemId) : undefined,
      movementType: movementType as any,
      startDate,
      endDate,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @StockControlRoles("manager", "admin")
  @Post("adjustment")
  @ApiOperation({ summary: "Create a manual stock adjustment" })
  async createAdjustment(@Body() body: any, @Req() req: any) {
    return this.movementService.createManualAdjustment(req.user.companyId, {
      ...body,
      createdBy: req.user.name,
    });
  }
}
