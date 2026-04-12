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
import type {
  CreateIssuableProductDto,
  IssuableProductFilters,
  UpdateIssuableProductDto,
} from "../dto/issuable-product.dto";
import type { IssuableProductType } from "../entities/issuable-product.entity";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import { IssuableProductService } from "../services/issuable-product.service";

@ApiTags("stock-management/products")
@Controller("stock-management/products")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class IssuableProductController {
  constructor(private readonly productService: IssuableProductService) {}

  @Get()
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "List issuable products with optional filters" })
  async list(
    @Req() req: any,
    @Query("productType") productType?: IssuableProductType,
    @Query("categoryId") categoryId?: string,
    @Query("active") active?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const filters: IssuableProductFilters = {};
    if (productType) filters.productType = productType;
    if (categoryId) filters.categoryId = Number(categoryId);
    if (active !== undefined) filters.active = active === "true";
    if (search) filters.search = search;
    if (page) filters.page = Number(page);
    if (pageSize) filters.pageSize = Number(pageSize);
    return this.productService.list(Number(req.user.companyId), filters);
  }

  @Get("counts-by-type")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Count issuable products by product type for the calling company" })
  async counts(@Req() req: any) {
    return this.productService.countByType(Number(req.user.companyId));
  }

  @Get(":id")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Get a single issuable product by ID" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.productService.byId(Number(req.user.companyId), id);
  }

  @Get(":id/linked-parts")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Get linked paint parts (Part B, C) for a product" })
  async linkedParts(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.productService.linkedParts(Number(req.user.companyId), id);
  }

  @Post()
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Create a new issuable product" })
  async create(@Req() req: any, @Body() dto: CreateIssuableProductDto) {
    return this.productService.create(Number(req.user.companyId), dto);
  }

  @Patch(":id")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Update an existing issuable product" })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateIssuableProductDto,
  ) {
    return this.productService.update(Number(req.user.companyId), id, dto);
  }

  @Delete(":id")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({ summary: "Soft-delete (deactivate) an issuable product" })
  async softDelete(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.productService.softDelete(Number(req.user.companyId), id);
  }
}
