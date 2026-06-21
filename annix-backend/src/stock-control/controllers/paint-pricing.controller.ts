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
  MultiCoatQuoteDto,
  PackOptionsDto,
  PaintQuoteDto,
  UpdatePaintPriceListItemDto,
  UpdatePaintPricingConfigDto,
} from "../dto/paint-pricing.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { PaintCoatingSystemService } from "../services/paint-coating-system.service";
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
    private readonly coatingSystemService: PaintCoatingSystemService,
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
  @ApiOperation({
    summary: "Save extracted price list rows (replace-by-supplier, append or update)",
  })
  async commitImport(@Req() req: any, @Body() dto: CommitPaintPriceListImportDto) {
    const companyId = req.user.companyId;
    const mode = dto.mode ?? (dto.replaceSupplier ? "replace" : "append");
    if (mode === "update") {
      return this.paintPriceListService.updateByName(companyId, dto.rows);
    }
    const imported =
      mode === "replace"
        ? await this.paintPriceListService.replaceSupplier(
            companyId,
            dto.supplierName,
            dto.rows,
            req.user.id,
          )
        : await this.paintPriceListService.addMany(companyId, dto.rows);
    return { imported };
  }

  @Get("preferred")
  @ApiOperation({
    summary: "Preferred paints for coating-spec assignment, grouped client-side by coat type",
  })
  async preferred(@Req() req: any) {
    return this.paintPriceListService.preferredForAssignment(req.user.companyId);
  }

  @Post("pack-options")
  @ApiOperation({ summary: "Cheapest pack combination + per-pack totals for required litres" })
  async packOptions(@Req() req: any, @Body() dto: PackOptionsDto) {
    return this.paintPriceListService.packOptions(req.user.companyId, dto.items);
  }

  @Get("quote/catalog")
  @ApiOperation({
    summary:
      "Sell-price-only paint catalogue for the quote page — no cost or markup exposed (admin/manager only)",
  })
  async quoteCatalog(@Req() req: any) {
    return this.paintPriceListService.quoteCatalog(req.user.companyId);
  }

  @Get("coating-systems")
  @ApiOperation({
    summary:
      "ISO 12944 coating systems per corrosivity category, normalised into primer/intermediate/final coats",
  })
  async coatingSystems() {
    return this.coatingSystemService.coatingSystems();
  }

  @Post("quote")
  @ApiOperation({ summary: "Quote a paint: sell price per m² and total for an area" })
  async quote(@Req() req: any, @Body() dto: PaintQuoteDto) {
    return this.paintPriceListService.quote(req.user.companyId, dto);
  }

  @Post("quote/multi-coat")
  @ApiOperation({ summary: "Quote a multi-coat system + blasting: per-coat prices and total" })
  async multiCoatQuote(@Req() req: any, @Body() dto: MultiCoatQuoteDto) {
    return this.paintPriceListService.multiCoatQuote(req.user.companyId, dto);
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
    return this.paintPriceListService.setUpliftForAll(
      req.user.companyId,
      dto.upliftPercent,
      req.user.id,
    );
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
    return this.paintPriceListService.updateConfig(req.user.companyId, dto, req.user.id);
  }
}
