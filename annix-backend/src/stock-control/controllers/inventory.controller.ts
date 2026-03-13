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
  ) {
    return this.inventoryService.findAll(req.user.companyId, {
      category,
      belowMinStock,
      search,
      page,
      limit,
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
  ) {
    const parsedLocationId = locationId ? Number(locationId) : null;
    if (
      parsedLocationId !== null &&
      (!Number.isInteger(parsedLocationId) || parsedLocationId <= 0)
    ) {
      throw new BadRequestException("locationId must be a positive integer");
    }
    return this.inventoryService.groupedByCategory(
      req.user.companyId,
      search,
      parsedLocationId ?? undefined,
    );
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

  @StockControlRoles("manager", "admin")
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
