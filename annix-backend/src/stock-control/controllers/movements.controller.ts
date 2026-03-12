import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateStockMovementDto } from "../dto/create-stock-movement.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
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
  @PermissionKey("stock.adjustment")
  @Post("adjustment")
  @ApiOperation({ summary: "Create a manual stock adjustment" })
  async createAdjustment(@Body() dto: CreateStockMovementDto, @Req() req: any) {
    return this.movementService.createManualAdjustment(req.user.companyId, {
      ...dto,
      createdBy: req.user.name,
    });
  }
}
