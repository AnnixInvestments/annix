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
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreatePumpOrderDto } from "./dto/create-pump-order.dto";
import {
  PumpOrderListResponseDto,
  PumpOrderResponseDto,
  PumpOrderSummaryDto,
} from "./dto/pump-order-response.dto";
import { UpdatePumpOrderDto } from "./dto/update-pump-order.dto";
import { PumpOrderStatus, PumpOrderType } from "./entities/pump-order.entity";
import { PumpOrderQueryParams, PumpOrderService } from "./pump-order.service";

@ApiTags("Pump Orders")
@Controller("pump-orders")
export class PumpOrderController {
  constructor(private readonly pumpOrderService: PumpOrderService) {}

  @Post()
  @ApiOperation({ summary: "Create a new pump order" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Order created successfully",
    type: PumpOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid data provided",
  })
  create(@Body() createDto: CreatePumpOrderDto): Promise<PumpOrderResponseDto> {
    return this.pumpOrderService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "List all pump orders with optional filtering" })
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
    description: "Search in order number, customer",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: PumpOrderStatus,
    description: "Filter by status",
  })
  @ApiQuery({
    name: "orderType",
    required: false,
    enum: PumpOrderType,
    description: "Filter by order type",
  })
  @ApiQuery({
    name: "supplierId",
    required: false,
    type: Number,
    description: "Filter by supplier",
  })
  @ApiQuery({
    name: "fromDate",
    required: false,
    type: String,
    description: "Filter from date (ISO)",
  })
  @ApiQuery({ name: "toDate", required: false, type: String, description: "Filter to date (ISO)" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of orders",
    type: PumpOrderListResponseDto,
  })
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: PumpOrderStatus,
    @Query("orderType") orderType?: PumpOrderType,
    @Query("supplierId") supplierId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ): Promise<PumpOrderListResponseDto> {
    const params: PumpOrderQueryParams = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
      orderType,
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
      fromDate,
      toDate,
    };
    return this.pumpOrderService.findAll(params);
  }

  @Get("summary")
  @ApiOperation({ summary: "Get order summary statistics" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Order summary",
    type: PumpOrderSummaryDto,
  })
  summary(): Promise<PumpOrderSummaryDto> {
    return this.pumpOrderService.summary();
  }

  @Get("by-number/:orderNumber")
  @ApiOperation({ summary: "Find an order by order number" })
  @ApiParam({ name: "orderNumber", type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Order details",
    type: PumpOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order not found",
  })
  findByOrderNumber(@Param("orderNumber") orderNumber: string): Promise<PumpOrderResponseDto> {
    return this.pumpOrderService.findByOrderNumber(orderNumber);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a pump order by ID" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Order details",
    type: PumpOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order not found",
  })
  findOne(@Param("id", ParseIntPipe) id: number): Promise<PumpOrderResponseDto> {
    return this.pumpOrderService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a pump order" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Order updated successfully",
    type: PumpOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order not found",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid data provided",
  })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdatePumpOrderDto,
  ): Promise<PumpOrderResponseDto> {
    return this.pumpOrderService.update(id, updateDto);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update order status" })
  @ApiParam({ name: "id", type: Number })
  @ApiQuery({ name: "status", enum: PumpOrderStatus, description: "New status" })
  @ApiQuery({
    name: "updatedBy",
    required: false,
    type: String,
    description: "User making the change",
  })
  @ApiQuery({ name: "notes", required: false, type: String, description: "Status change notes" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Status updated successfully",
    type: PumpOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order not found",
  })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Query("status") status: PumpOrderStatus,
    @Query("updatedBy") updatedBy?: string,
    @Query("notes") notes?: string,
  ): Promise<PumpOrderResponseDto> {
    return this.pumpOrderService.updateStatus(id, status, updatedBy, notes);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a pump order" })
  @ApiParam({ name: "id", type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Order deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Order not found",
  })
  remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.pumpOrderService.remove(id);
  }
}
