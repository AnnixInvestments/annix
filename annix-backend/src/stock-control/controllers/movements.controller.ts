import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { MovementService } from "../services/movement.service";

@ApiTags("Stock Control - Movements")
@Controller("stock-control/movements")
@UseGuards(StockControlAuthGuard)
export class MovementsController {
  constructor(private readonly movementService: MovementService) {}

  @Get()
  @ApiOperation({ summary: "List stock movements with optional filters" })
  async list(
    @Query("stockItemId") stockItemId?: string,
    @Query("movementType") movementType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit?: string,
  ) {
    return this.movementService.findAll({
      stockItemId: stockItemId ? Number(stockItemId) : undefined,
      movementType: movementType as any,
      startDate,
      endDate,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("adjustment")
  @ApiOperation({ summary: "Create a manual stock adjustment" })
  async createAdjustment(@Body() body: any, @Req() req: any) {
    return this.movementService.createManualAdjustment({
      ...body,
      createdBy: req.user.name,
    });
  }
}
