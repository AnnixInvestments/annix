import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CreateRubberPriceListItemDto,
  RubberBulkUpliftDto,
  RubberCommitImportDto,
  RubberQuoteDto,
  UpdateRubberPriceListItemDto,
  UpdateRubberPricingConfigDto,
} from "../dto/rubber-pricing.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { RubberPriceListService } from "../services/rubber-price-list.service";
import { RubberPriceListExtractionService } from "../services/rubber-price-list-extraction.service";

@ApiTags("Stock Control - Rubber Pricing")
@Controller("stock-control/rubber-pricing")
@UseGuards(StockControlAuthGuard, StockControlOnboardingGuard, StockControlRoleGuard)
@StockControlRoles("admin", "manager")
export class RubberPricingController {
  constructor(
    private readonly priceListService: RubberPriceListService,
    private readonly extractionService: RubberPriceListExtractionService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List rubber price list items with computed pricing + config" })
  async list(@Req() req: any) {
    return this.priceListService.list(req.user.companyId);
  }

  @Get("quote/catalog")
  @ApiOperation({ summary: "Customer-safe rubber catalogue (sell + MPS prices only)" })
  async quoteCatalog(@Req() req: any, @Query("family") family?: string) {
    return this.priceListService.quoteCatalog(req.user.companyId, family ?? null);
  }

  @Post("quote")
  @ApiOperation({
    summary: "Quote a rubber: sale + MPS price for an area (plate) or length (pipe)",
  })
  async quote(@Req() req: any, @Body() dto: RubberQuoteDto) {
    return this.priceListService.quote(req.user.companyId, dto);
  }

  @Post()
  @ApiOperation({ summary: "Create a rubber price list item" })
  async create(@Req() req: any, @Body() dto: CreateRubberPriceListItemDto) {
    return this.priceListService.create(req.user.companyId, dto);
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Extract a supplier rubber price list (PDF/image/sheet) into rows" })
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    return this.extractionService.extractPriceList(file);
  }

  @Post("import/bonding-agents")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Extract a bonding-agent price list into rows" })
  async importBondingAgents(@UploadedFile() file: Express.Multer.File) {
    return this.extractionService.extractBondingAgents(file);
  }

  @Post("import/commit")
  @ApiOperation({ summary: "Save extracted rubber rows (replace-by-supplier, append or update)" })
  async commitImport(@Req() req: any, @Body() dto: RubberCommitImportDto) {
    const companyId = req.user.companyId;
    const mode = dto.mode ?? (dto.replaceSupplier ? "replace" : "append");
    if (mode === "update") {
      return this.priceListService.updateByCode(companyId, dto.rows);
    }
    const imported =
      mode === "replace"
        ? await this.priceListService.replaceSupplier(companyId, dto.supplier, dto.rows)
        : await this.priceListService.addMany(companyId, dto.rows);
    return { imported };
  }

  @Post("bulk-uplift")
  @ApiOperation({ summary: "Apply an uplift % to every rubber in the price list" })
  async bulkUplift(@Req() req: any, @Body() dto: RubberBulkUpliftDto) {
    return this.priceListService.setUpliftForAll(req.user.companyId, dto.upliftPercent);
  }

  @Post("seed")
  @ApiOperation({ summary: "Seed the rubber price list from product data when empty" })
  async seed(@Req() req: any) {
    return this.priceListService.seedFromProductData(req.user.companyId);
  }

  @Post("clear")
  @ApiOperation({ summary: "Delete every rubber price list item for the company" })
  async clear(@Req() req: any) {
    return this.priceListService.clearAll(req.user.companyId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a rubber price list item" })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRubberPriceListItemDto,
  ) {
    return this.priceListService.update(req.user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a rubber price list item" })
  async remove(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    await this.priceListService.remove(req.user.companyId, id);
    return { success: true };
  }

  @Put("config")
  @ApiOperation({
    summary: "Update the rubber pricing config (paraffin, blasting, labour, markups)",
  })
  async updateConfig(@Req() req: any, @Body() dto: UpdateRubberPricingConfigDto) {
    return this.priceListService.updateConfig(req.user.companyId, dto);
  }
}
