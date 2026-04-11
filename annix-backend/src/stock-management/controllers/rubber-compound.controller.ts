import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import {
  type CreateRubberCompoundDto,
  RubberCompoundService,
  type UpdateRubberCompoundDto,
} from "../services/rubber-compound.service";

@ApiTags("stock-management/rubber-compounds")
@Controller("stock-management/rubber-compounds")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class RubberCompoundController {
  constructor(private readonly compoundService: RubberCompoundService) {}

  @Get()
  @StockManagementFeature("RUBBER_ROLL_TRACKING")
  @ApiOperation({ summary: "List all rubber compounds for the calling company" })
  async list(@Req() req: any, @Query("includeInactive") includeInactive?: string) {
    return this.compoundService.list(Number(req.user.companyId), includeInactive === "true");
  }

  @Get(":id")
  @StockManagementFeature("RUBBER_ROLL_TRACKING")
  @ApiOperation({ summary: "Get a single rubber compound by ID" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.compoundService.byId(Number(req.user.companyId), id);
  }

  @Post()
  @StockManagementFeature("RUBBER_ROLL_TRACKING")
  @ApiOperation({ summary: "Create a new rubber compound" })
  async create(@Req() req: any, @Body() dto: CreateRubberCompoundDto) {
    return this.compoundService.create(Number(req.user.companyId), dto);
  }

  @Patch(":id")
  @StockManagementFeature("RUBBER_ROLL_TRACKING")
  @ApiOperation({ summary: "Update a rubber compound" })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRubberCompoundDto,
  ) {
    return this.compoundService.update(Number(req.user.companyId), id, dto);
  }

  @Delete(":id")
  @StockManagementFeature("RUBBER_ROLL_TRACKING")
  @ApiOperation({ summary: "Soft-delete (deactivate) a rubber compound" })
  async softDelete(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const compound = await this.compoundService.update(Number(req.user.companyId), id, {
      active: false,
    });
    return compound;
  }

  @Post("seed")
  @StockManagementFeature("RUBBER_ROLL_TRACKING")
  @ApiOperation({ summary: "Ensure standard rubber compounds exist for the calling company" })
  async seed(@Req() req: any) {
    const created = await this.compoundService.ensureSeedCompoundsForCompany(
      Number(req.user.companyId),
    );
    return { created };
  }
}
