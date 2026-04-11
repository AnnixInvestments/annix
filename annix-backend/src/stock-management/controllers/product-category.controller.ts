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
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from "../dto/product-category.dto";
import type { ProductCategoryType } from "../entities/product-category.entity";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import { ProductCategoryService } from "../services/product-category.service";

@ApiTags("stock-management/product-categories")
@Controller("stock-management/product-categories")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class ProductCategoryController {
  constructor(private readonly categoryService: ProductCategoryService) {}

  @Get()
  @StockManagementFeature("PRODUCT_CATEGORIES")
  @ApiOperation({ summary: "List all product categories for the calling company" })
  async list(@Req() req: any, @Query("productType") productType?: ProductCategoryType) {
    const companyId = Number(req.user.companyId);
    return this.categoryService.listForCompany(companyId, productType);
  }

  @Get(":id")
  @StockManagementFeature("PRODUCT_CATEGORIES")
  @ApiOperation({ summary: "Get a single product category by ID" })
  async byId(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.categoryService.byId(Number(req.user.companyId), id);
  }

  @Post()
  @StockManagementFeature("PRODUCT_CATEGORIES")
  @ApiOperation({ summary: "Create a new product category" })
  async create(@Req() req: any, @Body() dto: CreateProductCategoryDto) {
    return this.categoryService.create(Number(req.user.companyId), dto);
  }

  @Patch(":id")
  @StockManagementFeature("PRODUCT_CATEGORIES")
  @ApiOperation({ summary: "Update a product category" })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.categoryService.update(Number(req.user.companyId), id, dto);
  }

  @Delete(":id")
  @StockManagementFeature("PRODUCT_CATEGORIES")
  @ApiOperation({ summary: "Soft-delete (deactivate) a product category" })
  async softDelete(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.categoryService.softDelete(Number(req.user.companyId), id);
  }

  @Post("seed")
  @StockManagementFeature("PRODUCT_CATEGORIES")
  @ApiOperation({
    summary: "Ensure default seed product categories exist for the calling company",
  })
  async seedDefaults(@Req() req: any) {
    const created = await this.categoryService.ensureSeedDataForCompany(Number(req.user.companyId));
    return { created };
  }
}
