import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PumpProductService, PumpProductQueryParams } from './pump-product.service';
import { CreatePumpProductDto } from './dto/create-pump-product.dto';
import { UpdatePumpProductDto } from './dto/update-pump-product.dto';
import {
  PumpProductResponseDto,
  PumpProductListResponseDto,
} from './dto/pump-product-response.dto';
import { PumpProductCategory, PumpProductStatus } from './entities/pump-product.entity';

@ApiTags('Pump Products')
@Controller('pump-products')
export class PumpProductController {
  constructor(private readonly pumpProductService: PumpProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pump product' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created successfully',
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Duplicate SKU or invalid data',
  })
  create(@Body() createDto: CreatePumpProductDto): Promise<PumpProductResponseDto> {
    return this.pumpProductService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all pump products with optional filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in title, SKU, manufacturer' })
  @ApiQuery({ name: 'category', required: false, enum: PumpProductCategory, description: 'Filter by category' })
  @ApiQuery({ name: 'manufacturer', required: false, type: String, description: 'Filter by manufacturer' })
  @ApiQuery({ name: 'status', required: false, enum: PumpProductStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'minFlowRate', required: false, type: Number, description: 'Minimum flow rate in m³/h' })
  @ApiQuery({ name: 'maxFlowRate', required: false, type: Number, description: 'Maximum flow rate in m³/h' })
  @ApiQuery({ name: 'minHead', required: false, type: Number, description: 'Minimum head in meters' })
  @ApiQuery({ name: 'maxHead', required: false, type: Number, description: 'Maximum head in meters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of pump products',
    type: PumpProductListResponseDto,
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: PumpProductCategory,
    @Query('manufacturer') manufacturer?: string,
    @Query('status') status?: PumpProductStatus,
    @Query('minFlowRate') minFlowRate?: string,
    @Query('maxFlowRate') maxFlowRate?: string,
    @Query('minHead') minHead?: string,
    @Query('maxHead') maxHead?: string,
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

  @Get('manufacturers')
  @ApiOperation({ summary: 'List all unique manufacturers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of manufacturer names',
    type: [String],
  })
  manufacturers(): Promise<string[]> {
    return this.pumpProductService.manufacturers();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'List products by category' })
  @ApiParam({ name: 'category', enum: PumpProductCategory })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of products in category',
    type: [PumpProductResponseDto],
  })
  findByCategory(
    @Param('category') category: PumpProductCategory,
  ): Promise<PumpProductResponseDto[]> {
    return this.pumpProductService.findByCategory(category);
  }

  @Get('manufacturer/:manufacturer')
  @ApiOperation({ summary: 'List products by manufacturer' })
  @ApiParam({ name: 'manufacturer', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of products from manufacturer',
    type: [PumpProductResponseDto],
  })
  findByManufacturer(
    @Param('manufacturer') manufacturer: string,
  ): Promise<PumpProductResponseDto[]> {
    return this.pumpProductService.findByManufacturer(manufacturer);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Find a product by SKU' })
  @ApiParam({ name: 'sku', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details',
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  findBySku(@Param('sku') sku: string): Promise<PumpProductResponseDto | null> {
    return this.pumpProductService.findBySku(sku);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pump product by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details',
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PumpProductResponseDto> {
    return this.pumpProductService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pump product' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid data or duplicate SKU',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePumpProductDto,
  ): Promise<PumpProductResponseDto> {
    return this.pumpProductService.update(id, updateDto);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Update product stock quantity' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({ name: 'quantity', type: Number, description: 'New stock quantity' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock updated successfully',
    type: PumpProductResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Query('quantity', ParseIntPipe) quantity: number,
  ): Promise<PumpProductResponseDto> {
    return this.pumpProductService.updateStock(id, quantity);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pump product' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Product not found',
  })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.pumpProductService.remove(id);
  }
}
