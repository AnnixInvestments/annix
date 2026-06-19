import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  BulkUpliftDto,
  CommitPaintPriceListImportDto,
  CreatePaintPriceListItemDto,
  UpdatePaintPriceListItemDto,
  UpdatePaintPricingConfigDto,
} from "../dto/paint-pricing.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { PaintPriceListService } from "../services/paint-price-list.service";
import { PaintPriceListExtractionService } from "../services/paint-price-list-extraction.service";

@ApiTags("Stock Control - Paint Pricing")
@Controller("stock-control/paint-pricing")
@UseGuards(StockControlAuthGuard, StockControlOnboardingGuard, StockControlRoleGuard)
@StockControlRoles("admin", "manager")
export class PaintPricingController {
  constructor(
    private readonly paintPriceListService: PaintPriceListService,
    private readonly extractionService: PaintPriceListExtractionService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List paint price list items with computed pricing + config" })
  async list(@Req() req: any) {
    return this.paintPriceListService.list(req.user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Create a paint price list item" })
  async create(@Req() req: any, @Body() dto: CreatePaintPriceListItemDto) {
    return this.paintPriceListService.create(req.user.companyId, dto);
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Extract a supplier price list (PDF/image) into a preview of rows" })
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    return this.extractionService.extractPriceList(file);
  }

  @Post("import/commit")
  @ApiOperation({ summary: "Save extracted price list rows (replace-by-supplier or append)" })
  async commitImport(@Req() req: any, @Body() dto: CommitPaintPriceListImportDto) {
    const imported = dto.replaceSupplier
      ? await this.paintPriceListService.replaceSupplier(
          req.user.companyId,
          dto.supplierName,
          dto.rows,
        )
      : await this.paintPriceListService.addMany(req.user.companyId, dto.rows);
    return { imported };
  }

  @Post("enrich")
  @ApiOperation({
    summary: "Fill missing vol solids / microns / thinner from published data sheets",
  })
  async enrich(@Req() req: any) {
    return this.paintPriceListService.enrichMissingSpecs(req.user.companyId);
  }

  @Post("bulk-uplift")
  @ApiOperation({ summary: "Apply an uplift % to every paint in the price list" })
  async bulkUplift(@Req() req: any, @Body() dto: BulkUpliftDto) {
    return this.paintPriceListService.setUpliftForAll(req.user.companyId, dto.upliftPercent);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a paint price list item" })
  async update(@Req() req: any, @Param("id") id: number, @Body() dto: UpdatePaintPriceListItemDto) {
    return this.paintPriceListService.update(req.user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a paint price list item" })
  async remove(@Req() req: any, @Param("id") id: number) {
    await this.paintPriceListService.remove(req.user.companyId, id);
    return { success: true };
  }

  @Put("config")
  @ApiOperation({
    summary: "Update paint pricing config (loss %, application cost, markup, discount tiers)",
  })
  async updateConfig(@Req() req: any, @Body() dto: UpdatePaintPricingConfigDto) {
    return this.paintPriceListService.updateConfig(req.user.companyId, dto);
  }
}
