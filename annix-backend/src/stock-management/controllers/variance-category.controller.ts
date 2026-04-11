import {
  Body,
  Controller,
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
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import {
  type CreateVarianceCategoryDto,
  type UpdateVarianceCategoryDto,
  VarianceCategoryService,
} from "../services/variance-category.service";

@ApiTags("stock-management/variance-categories")
@Controller("stock-management/variance-categories")
@UseGuards(JwtAuthGuard, StockManagementFeatureGuard)
export class VarianceCategoryController {
  constructor(private readonly service: VarianceCategoryService) {}

  @Get()
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "List variance categories for the calling company" })
  async list(@Req() req: any, @Query("includeInactive") includeInactive?: string) {
    return this.service.list(Number(req.user.companyId), includeInactive === "true");
  }

  @Get(":id")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Get a variance category by ID" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.service.byId(Number(req.user.companyId), id);
  }

  @Post()
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Create a new variance category" })
  async create(@Req() req: any, @Body() dto: CreateVarianceCategoryDto) {
    return this.service.create(Number(req.user.companyId), dto);
  }

  @Patch(":id")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Update a variance category" })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateVarianceCategoryDto,
  ) {
    return this.service.update(Number(req.user.companyId), id, dto);
  }

  @Post("seed")
  @StockManagementFeature("STOCK_TAKE")
  @ApiOperation({ summary: "Ensure default variance categories exist for the calling company" })
  async seed(@Req() req: any) {
    const created = await this.service.ensureSeedDataForCompany(Number(req.user.companyId));
    return { created };
  }
}
