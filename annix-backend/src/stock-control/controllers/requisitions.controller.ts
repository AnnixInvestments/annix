import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { RequisitionService } from "../services/requisition.service";

@ApiTags("Stock Control - Requisitions")
@Controller("stock-control/requisitions")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class RequisitionsController {
  constructor(private readonly requisitionService: RequisitionService) {}

  @Get()
  @ApiOperation({ summary: "List all requisitions" })
  async list(@Req() req: any) {
    return this.requisitionService.findAll(req.user.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Requisition by ID with items" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.requisitionService.findById(req.user.companyId, id);
  }

  @Put(":id/items/:itemId")
  @ApiOperation({ summary: "Update requisition item" })
  async updateItem(
    @Req() req: any,
    @Param("itemId") itemId: number,
    @Body() body: {
      packSizeLitres?: number;
      reorderQty?: number | null;
      reqNumber?: string | null;
    },
  ) {
    return this.requisitionService.updateItem(req.user.companyId, itemId, body);
  }
}
