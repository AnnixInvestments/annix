import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateStockItemDto } from "../dto/create-stock-item.dto";
import { UpdateStockItemDto } from "../dto/update-stock-item.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import { InventoryService } from "../services/inventory.service";
import { ItemIdentificationService } from "../services/item-identification.service";
import { PriceHistoryService } from "../services/price-history.service";

@ApiTags("Stock Control - Inventory")
@Controller("stock-control/inventory")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly itemIdentificationService: ItemIdentificationService,
    private readonly priceHistoryService: PriceHistoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List stock items with optional filters" })
  async list(
    @Req() req: any,
    @Query("category") category?: string,
    @Query("belowMinStock") belowMinStock?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.inventoryService.findAll(req.user.companyId, {
      category,
      belowMinStock,
      search,
      page,
      limit,
      locationId,
    });
  }

  @Get("low-stock")
  @ApiOperation({ summary: "Items below minimum stock level" })
  async lowStock(@Req() req: any) {
    return this.inventoryService.lowStockAlerts(req.user.companyId);
  }

  @Get("categories")
  @ApiOperation({ summary: "Distinct stock item categories" })
  async categories(@Req() req: any) {
    return this.inventoryService.categories(req.user.companyId);
  }

  @Get("grouped")
  @ApiOperation({ summary: "Stock items grouped by category" })
  async grouped(
    @Req() req: any,
    @Query("search") search?: string,
    @Query("locationId") locationId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLocationId = locationId ? Number(locationId) : null;
    if (
      parsedLocationId !== null &&
      (!Number.isInteger(parsedLocationId) || parsedLocationId <= 0)
    ) {
      throw new BadRequestException("locationId must be a positive integer");
    }
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(1000, Math.max(1, Number(limit) || 500));
    return this.inventoryService.groupedByCategory(
      req.user.companyId,
      search,
      parsedLocationId ?? null,
      parsedPage,
      parsedLimit,
    );
  }

  @StockControlRoles("manager", "admin")
  @Get("duplicates")
  @ApiOperation({ summary: "Detect duplicate stock items that may need merging" })
  async detectDuplicates(@Req() req: any) {
    return this.inventoryService.detectDuplicates(req.user.companyId);
  }

  @StockControlRoles("manager", "admin")
  @Get("supplier-mappings")
  @ApiOperation({ summary: "List learned supplier SKU to stock item mappings" })
  async supplierMappings(@Req() req: any) {
    return this.inventoryService.supplierSkuMappings(req.user.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Stock item by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.inventoryService.findByIdWithPhoto(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @PermissionKey("inventory.create")
  @Post()
  @ApiOperation({ summary: "Create a stock item" })
  async create(@Req() req: any, @Body() dto: CreateStockItemDto) {
    return this.inventoryService.create(req.user.companyId, dto);
  }

  @StockControlRoles("storeman", "accounts", "manager", "admin")
  @Put(":id")
  @ApiOperation({ summary: "Update a stock item" })
  async update(@Req() req: any, @Param("id") id: number, @Body() dto: UpdateStockItemDto) {
    return this.inventoryService.update(req.user.companyId, id, dto);
  }

  @StockControlRoles("accounts", "manager", "admin")
  @PermissionKey("inventory.delete")
  @Delete(":id")
  @ApiOperation({ summary: "Delete a stock item" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.inventoryService.remove(req.user.companyId, id);
  }

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a photo for a stock item" })
  async uploadPhoto(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.inventoryService.uploadPhoto(req.user.companyId, id, file);
  }

  @Post("identify-issuance-photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Identify product name and batch number from a photo for stock issuance",
  })
  async identifyForIssuance(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const base64 = file.buffer.toString("base64");
    const mediaType = file.mimetype as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    return this.itemIdentificationService.identifyForIssuance(
      req.user.companyId,
      base64,
      mediaType,
    );
  }

  @Post("identify-photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Identify items from a photo using AI" })
  async identifyFromPhoto(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body("context") context?: string,
  ) {
    const base64 = file.buffer.toString("base64");
    const mediaType = file.mimetype as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    return this.itemIdentificationService.identifyFromPhoto(
      req.user.companyId,
      base64,
      mediaType,
      context,
    );
  }

  @StockControlRoles("manager", "admin")
  @Delete("supplier-mappings/:id")
  @ApiOperation({ summary: "Delete a supplier SKU mapping" })
  async deleteSupplierMapping(@Req() req: any, @Param("id") id: number) {
    return this.inventoryService.deleteSupplierSkuMapping(id);
  }

  @StockControlRoles("manager", "admin")
  @Post("merge")
  @ApiOperation({ summary: "Merge duplicate stock items into a single target item" })
  async mergeItems(
    @Req() req: any,
    @Body() dto: { targetItemId: number; sourceItemIds: number[] },
  ) {
    return this.inventoryService.mergeItems(
      req.user.companyId,
      dto.targetItemId,
      dto.sourceItemIds,
      req.user.name || req.user.email || "system",
    );
  }

  @StockControlRoles("manager", "admin")
  @Post("auto-categorize")
  @ApiOperation({ summary: "Auto-categorize uncategorized stock items using AI" })
  async autoCategorize(@Req() req: any) {
    return this.inventoryService.autoCategorize(req.user.companyId);
  }

  @StockControlRoles("admin")
  @Post("backfill-rubber")
  @ApiOperation({ summary: "Backfill stock items with rubber roll data from AU Rubber" })
  async backfillRubber(@Req() req: any) {
    return this.inventoryService.backfillRubberRollStock(req.user.companyId);
  }

  @StockControlRoles("manager", "admin")
  @Post("normalize-rubber")
  @ApiOperation({ summary: "Normalize rubber item names and SKUs to standard format" })
  async normalizeRubber(@Req() req: any) {
    return this.inventoryService.normalizeRubberItems(req.user.companyId);
  }

  @Get(":id/price-history")
  @ApiOperation({ summary: "Price history for a stock item" })
  async priceHistory(@Req() req: any, @Param("id") id: number) {
    return this.priceHistoryService.historyForItem(req.user.companyId, id);
  }

  @Get(":id/price-statistics")
  @ApiOperation({ summary: "Price statistics for a stock item" })
  async priceStatistics(@Req() req: any, @Param("id") id: number) {
    return this.priceHistoryService.priceStatistics(req.user.companyId, id);
  }
}
