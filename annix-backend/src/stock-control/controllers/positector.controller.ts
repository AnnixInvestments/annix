import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import {
  PositectorService,
  type RegisterDeviceDto,
  type UpdateDeviceDto,
} from "../services/positector.service";

@ApiTags("Stock Control - PosiTector Devices")
@Controller("stock-control/positector-devices")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class PositectorController {
  private readonly logger = new Logger(PositectorController.name);

  constructor(private readonly positectorService: PositectorService) {}

  @Post()
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Register a PosiTector device" })
  async registerDevice(@Req() req: any, @Body() body: RegisterDeviceDto) {
    return this.positectorService.registerDevice(
      req.user.companyId,
      body,
      req.user,
    );
  }

  @Get()
  @ApiOperation({ summary: "List registered PosiTector devices" })
  async findAll(@Req() req: any, @Query("active") active?: string) {
    const filters: { active?: boolean } = {};

    if (active === "true") filters.active = true;
    if (active === "false") filters.active = false;

    return this.positectorService.findAll(req.user.companyId, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a PosiTector device by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.positectorService.findById(req.user.companyId, id);
  }

  @Patch(":id")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Update a PosiTector device" })
  async updateDevice(
    @Req() req: any,
    @Param("id") id: number,
    @Body() body: UpdateDeviceDto,
  ) {
    return this.positectorService.updateDevice(req.user.companyId, id, body);
  }

  @Delete(":id")
  @StockControlRoles("manager", "admin")
  @ApiOperation({ summary: "Delete a PosiTector device" })
  async deleteDevice(@Req() req: any, @Param("id") id: number) {
    await this.positectorService.deleteDevice(req.user.companyId, id);
    return { deleted: true };
  }

  @Post(":id/check-connection")
  @ApiOperation({ summary: "Check connection to a PosiTector device" })
  async checkConnection(@Req() req: any, @Param("id") id: number) {
    return this.positectorService.checkConnection(req.user.companyId, id);
  }

  @Get(":id/batches")
  @ApiOperation({ summary: "List batches on a PosiTector device" })
  async listBatches(@Req() req: any, @Param("id") id: number) {
    return this.positectorService.listBatches(req.user.companyId, id);
  }

  @Get(":id/batches/:buid")
  @ApiOperation({ summary: "Fetch a specific batch from a PosiTector device" })
  async fetchBatch(
    @Req() req: any,
    @Param("id") id: number,
    @Param("buid") buid: string,
  ) {
    const batch = await this.positectorService.fetchBatch(
      req.user.companyId,
      id,
      buid,
    );
    const entityType = this.positectorService.detectQcEntityType(
      batch.header.probeType,
    );
    return { ...batch, suggestedEntityType: entityType };
  }
}
