import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { CreatePumpProductDto } from "./dto/create-pump-product.dto";
import {
  PumpProductListResponseDto,
  PumpProductResponseDto,
} from "./dto/pump-product-response.dto";
import { UpdatePumpProductDto } from "./dto/update-pump-product.dto";
import { PumpProductCategory, PumpProductStatus } from "./entities/pump-product.entity";
import { ManualCurveEntry, PumpCurveDigitizerService } from "./pump-curve-digitizer.service";
import { ImportResult, PumpDataImportService } from "./pump-data-import.service";
import { PumpCurveData, PumpDatasheetService } from "./pump-datasheet.service";
import { PumpManufacturerApiService } from "./pump-manufacturer-api.service";
import { PumpProductQueryParams, PumpProductService } from "./pump-product.service";

@ApiTags("Pump Products")
@Controller("pump-products")
export class PumpProductController {
  constructor(
    private readonly pumpProductService: PumpProductService,
    private readonly importService: PumpDataImportService,
    private readonly datasheetService: PumpDatasheetService,
    private readonly manufacturerApiService: PumpManufacturerApiService,
    private readonly curveDigitizerService: PumpCurveDigitizerService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new pump product" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Product created successfully",
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Duplicate SKU or invalid data",
  })
  create(@Body() createDto: CreatePumpProductDto): Promise<PumpProductResponseDto> {
    return this.pumpProductService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "List all pump products with optional filtering" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 10)",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search in title, SKU, manufacturer",
  })
  @ApiQuery({
    name: "category",
    required: false,
    enum: PumpProductCategory,
    description: "Filter by category",
  })
  @ApiQuery({
    name: "manufacturer",
    required: false,
    type: String,
    description: "Filter by manufacturer",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: PumpProductStatus,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "minFlowRate",
    required: false,
    type: Number,
    description: "Minimum flow rate in m³/h",
  })
  @ApiQuery({
    name: "maxFlowRate",
    required: false,
    type: Number,
    description: "Maximum flow rate in m³/h",
  })
  @ApiQuery({
    name: "minHead",
    required: false,
    type: Number,
    description: "Minimum head in meters",
  })
  @ApiQuery({
    name: "maxHead",
    required: false,
    type: Number,
    description: "Maximum head in meters",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of pump products",
    type: PumpProductListResponseDto,
  })
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("category") category?: PumpProductCategory,
    @Query("manufacturer") manufacturer?: string,
    @Query("status") status?: PumpProductStatus,
    @Query("minFlowRate") minFlowRate?: string,
    @Query("maxFlowRate") maxFlowRate?: string,
    @Query("minHead") minHead?: string,
    @Query("maxHead") maxHead?: string,
  ): Promise<PumpProductListResponseDto> {
    const params: PumpProductQueryParams = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      category,
      manufacturer,
      status,
      minFlowRate: minFlowRate ? parseFloat(minFlowRate) : undefined,
      maxFlowRate: maxFlowRate ? parseFloat(maxFlowRate) : undefined,
      minHead: minHead ? parseFloat(minHead) : undefined,
      maxHead: maxHead ? parseFloat(maxHead) : undefined,
    };
    return this.pumpProductService.findAll(params);
  }

  @Get("manufacturers")
  @ApiOperation({ summary: "List all unique manufacturers" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of manufacturer names",
    type: [String],
  })
  manufacturers(): Promise<string[]> {
    return this.pumpProductService.manufacturers();
  }

  @Get("search/advanced")
  @ApiOperation({ summary: "Advanced full-text search for pump products" })
  @ApiQuery({ name: "q", required: true, type: String, description: "Search query" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "category", required: false, enum: PumpProductCategory })
  @ApiQuery({ name: "manufacturer", required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Search results with relevance scores",
  })
  async fullTextSearch(
    @Query("q") query: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: PumpProductCategory,
    @Query("manufacturer") manufacturer?: string,
  ) {
    return this.pumpProductService.fullTextSearch(query, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      category,
      manufacturer,
    });
  }

  @Post("compare")
  @ApiOperation({ summary: "Compare multiple pump products side-by-side" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        productIds: { type: "array", items: { type: "number" } },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Comparison data for selected products",
  })
  async compareProducts(@Body("productIds") productIds: number[]) {
    if (!productIds || productIds.length < 2) {
      return { error: "At least 2 products are required for comparison" };
    }
    if (productIds.length > 6) {
      return { error: "Maximum 6 products can be compared at once" };
    }
    return this.pumpProductService.findByIds(productIds);
  }

  @Get(":id/similar")
  @ApiOperation({ summary: "Find similar products" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of similar products",
  })
  async findSimilar(
    @Param("id", ParseIntPipe) id: number,
    @Query("limit") limit?: string,
  ): Promise<PumpProductResponseDto[]> {
    return this.pumpProductService.findSimilar(id, limit ? parseInt(limit, 10) : undefined);
  }

  @Get("category/:category")
  @ApiOperation({ summary: "List products by category" })
  @ApiParam({ name: "category", enum: PumpProductCategory })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of products in category",
    type: [PumpProductResponseDto],
  })
  findByCategory(
    @Param("category") category: PumpProductCategory,
  ): Promise<PumpProductResponseDto[]> {
    return this.pumpProductService.findByCategory(category);
  }

  @Get("manufacturer/:manufacturer")
  @ApiOperation({ summary: "List products by manufacturer" })
  @ApiParam({ name: "manufacturer", type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of products from manufacturer",
    type: [PumpProductResponseDto],
  })
  findByManufacturer(
    @Param("manufacturer") manufacturer: string,
  ): Promise<PumpProductResponseDto[]> {
    return this.pumpProductService.findByManufacturer(manufacturer);
  }

  @Get("sku/:sku")
  @ApiOperation({ summary: "Find a product by SKU" })
  @ApiParam({ name: "sku", type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Product details",
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Product not found",
  })
  findBySku(@Param("sku") sku: string): Promise<PumpProductResponseDto | null> {
    return this.pumpProductService.findBySku(sku);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a pump product by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Product details",
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Product not found",
  })
  findOne(@Param("id", ParseIntPipe) id: number): Promise<PumpProductResponseDto> {
    return this.pumpProductService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a pump product" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Product updated successfully",
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Product not found",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid data or duplicate SKU",
  })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdatePumpProductDto,
  ): Promise<PumpProductResponseDto> {
    return this.pumpProductService.update(id, updateDto);
  }

  @Patch(":id/stock")
  @ApiOperation({ summary: "Update product stock quantity" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({
    name: "quantity",
    type: Number,
    description: "New stock quantity",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Stock updated successfully",
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Product not found",
  })
  updateStock(
    @Param("id", ParseIntPipe) id: number,
    @Query("quantity", ParseIntPipe) quantity: number,
  ): Promise<PumpProductResponseDto> {
    return this.pumpProductService.updateStock(id, quantity);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a pump product" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Product deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Product not found",
  })
  remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.pumpProductService.remove(id);
  }

  @Post("import/csv")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Import products from CSV file" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        updateExisting: { type: "boolean", default: false },
        supplierId: { type: "number" },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Import completed",
  })
  async importFromCsv(
    @UploadedFile() file: Express.Multer.File,
    @Query("updateExisting") updateExisting?: string,
    @Query("supplierId") supplierId?: string,
  ): Promise<ImportResult> {
    const csvData = file.buffer.toString("utf-8");
    return this.importService.importFromCsv(csvData, {
      updateExisting: updateExisting === "true",
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
    });
  }

  @Post("import/json")
  @ApiOperation({ summary: "Import products from JSON array" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Import completed",
  })
  async importFromJson(
    @Body() products: CreatePumpProductDto[],
    @Query("updateExisting") updateExisting?: string,
    @Query("supplierId") supplierId?: string,
  ): Promise<ImportResult> {
    return this.importService.importFromJson(products, {
      updateExisting: updateExisting === "true",
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
    });
  }

  @Get("import/template")
  @ApiOperation({ summary: "Download CSV import template" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "CSV template file",
  })
  downloadCsvTemplate(@Res() res: Response): void {
    const template = this.importService.generateCsvTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="pump-products-template.csv"');
    res.send(template);
  }

  @Get("manufacturers/api")
  @ApiOperation({ summary: "List available manufacturer API integrations" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of available manufacturers",
  })
  availableManufacturerApis(): string[] {
    return this.manufacturerApiService.availableManufacturers();
  }

  @Get("manufacturers/api/status")
  @ApiOperation({ summary: "Check manufacturer API availability" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "API availability status",
  })
  async checkManufacturerApiStatus(): Promise<Record<string, boolean>> {
    return this.manufacturerApiService.checkAvailability();
  }

  @Post("manufacturers/api/:manufacturer/sync")
  @ApiOperation({ summary: "Sync products from manufacturer API" })
  @ApiParam({ name: "manufacturer", type: String })
  @ApiQuery({ name: "updateExisting", type: Boolean, required: false })
  @ApiQuery({ name: "supplierId", type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Sync completed",
  })
  async syncFromManufacturer(
    @Param("manufacturer") manufacturer: string,
    @Query("updateExisting") updateExisting?: string,
    @Query("supplierId") supplierId?: string,
  ): Promise<ImportResult> {
    const response = await this.manufacturerApiService.fetchProductsFromManufacturer(manufacturer);

    if (!response.success) {
      return {
        success: false,
        totalRows: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, sku: "", error: response.error || "API error" }],
      };
    }

    const dtos = response.products.map((p) =>
      this.manufacturerApiService.mapToCreateDto(p, manufacturer),
    );

    return this.importService.importFromJson(dtos, {
      updateExisting: updateExisting === "true",
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
    });
  }

  @Post(":id/datasheet")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload product datasheet" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Datasheet uploaded",
  })
  async uploadDatasheet(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.datasheetService.uploadDatasheet(id, file);
  }

  @Get(":id/datasheet")
  @ApiOperation({ summary: "Download product datasheet" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Datasheet file",
  })
  async downloadDatasheet(
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, mimeType } = await this.datasheetService.downloadDatasheet(id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Delete(":id/datasheet")
  @ApiOperation({ summary: "Delete product datasheet" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Datasheet deleted",
  })
  async deleteDatasheet(@Param("id", ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.datasheetService.deleteDatasheet(id);
    return { message: "Datasheet deleted successfully" };
  }

  @Post(":id/image")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload product image" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Image uploaded",
  })
  async uploadImage(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.datasheetService.uploadProductImage(id, file);
  }

  @Post(":id/curve")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload pump curve image" })
  @ApiParam({ name: "id", type: Number })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Curve uploaded",
  })
  async uploadCurve(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.datasheetService.uploadPumpCurve(id, file);
  }

  @Post(":id/curve/data")
  @ApiOperation({ summary: "Add pump curve data manually" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Curve data updated",
  })
  async updateCurveData(
    @Param("id", ParseIntPipe) id: number,
    @Body() curveEntry: ManualCurveEntry,
  ) {
    const curveData = this.curveDigitizerService.createFromManualEntry(curveEntry);
    return this.datasheetService.updatePumpCurveData(id, curveData);
  }

  @Post(":id/curve/analyze")
  @ApiOperation({ summary: "Analyze pump curve data" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Curve analysis results",
  })
  async analyzeCurve(@Param("id", ParseIntPipe) id: number) {
    const product = await this.pumpProductService.findOne(id);
    if (!product.pumpCurveData) {
      return { error: "No curve data available for this product" };
    }

    const curveData = product.pumpCurveData as PumpCurveData;
    return this.curveDigitizerService.analyzeCurve(
      curveData.flowPoints,
      curveData.headPoints,
      curveData.efficiencyPoints,
      curveData.speed,
    );
  }
}
