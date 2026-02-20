import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { InventoryService } from "../services/inventory.service";

@ApiTags("Stock Control - Inventory")
@Controller("stock-control/inventory")
@UseGuards(StockControlAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: "List stock items with optional filters" })
  async list(
    @Query("category") category?: string,
    @Query("belowMinStock") belowMinStock?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.inventoryService.findAll({ category, belowMinStock, search, page, limit });
  }

  @Get("low-stock")
  @ApiOperation({ summary: "Items below minimum stock level" })
  async lowStock() {
    return this.inventoryService.lowStockAlerts();
  }

  @Get("categories")
  @ApiOperation({ summary: "Distinct stock item categories" })
  async categories() {
    return this.inventoryService.categories();
  }

  @Get(":id")
  @ApiOperation({ summary: "Stock item by ID" })
  async findById(@Param("id") id: number) {
    return this.inventoryService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a stock item" })
  async create(@Body() body: any) {
    return this.inventoryService.create(body);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a stock item" })
  async update(@Param("id") id: number, @Body() body: any) {
    return this.inventoryService.update(id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a stock item" })
  async remove(@Param("id") id: number) {
    return this.inventoryService.remove(id);
  }
}
