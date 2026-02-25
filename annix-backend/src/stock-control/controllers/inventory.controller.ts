import {
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
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { InventoryService } from "../services/inventory.service";
import { ItemIdentificationService } from "../services/item-identification.service";

@ApiTags("Stock Control - Inventory")
@Controller("stock-control/inventory")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly itemIdentificationService: ItemIdentificationService,
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
  async grouped(@Req() req: any, @Query("search") search?: string) {
    return this.inventoryService.groupedByCategory(req.user.companyId, search);
  }

  @Get(":id")
  @ApiOperation({ summary: "Stock item by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.inventoryService.findById(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Post()
  @ApiOperation({ summary: "Create a stock item" })
  async create(@Req() req: any, @Body() body: any) {
    return this.inventoryService.create(req.user.companyId, body);
  }

  @StockControlRoles("manager", "admin")
  @Put(":id")
  @ApiOperation({ summary: "Update a stock item" })
  async update(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    return this.inventoryService.update(req.user.companyId, id, body);
  }

  @StockControlRoles("manager", "admin")
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
}
