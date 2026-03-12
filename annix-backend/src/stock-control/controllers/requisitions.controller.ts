import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { RecordRequisitionReceiptDto, UpdateRequisitionItemDto } from "../dto/additional.dto";
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
  async list(@Req() req: any, @Query("page") page?: string, @Query("limit") limit?: string) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    return this.requisitionService.findAll(req.user.companyId, pageNum, limitNum);
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
    @Body() dto: UpdateRequisitionItemDto,
  ) {
    return this.requisitionService.updateItem(req.user.companyId, itemId, dto);
  }

  @Post(":id/items/:itemId/receive")
  @ApiOperation({ summary: "Record partial receipt of a requisition item" })
  async recordReceipt(
    @Req() req: any,
    @Param("id") id: number,
    @Param("itemId") itemId: number,
    @Body() dto: RecordRequisitionReceiptDto,
  ) {
    return this.requisitionService.recordReceipt(
      req.user.companyId,
      id,
      itemId,
      dto.quantityReceived,
      dto.deliveryNoteId ?? null,
    );
  }
}
