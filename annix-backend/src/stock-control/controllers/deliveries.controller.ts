import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { DeliveryService } from "../services/delivery.service";

@ApiTags("Stock Control - Deliveries")
@Controller("stock-control/deliveries")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class DeliveriesController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @ApiOperation({ summary: "List all delivery notes" })
  async list(@Req() req: any) {
    return this.deliveryService.findAll(req.user.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Delivery note by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.findById(req.user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a delivery note with items" })
  async create(@Body() body: any, @Req() req: any) {
    return this.deliveryService.create(req.user.companyId, { ...body, receivedBy: req.user.name });
  }

  @StockControlRoles("manager", "admin")
  @Delete(":id")
  @ApiOperation({ summary: "Delete a delivery note" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.remove(req.user.companyId, id);
  }

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a photo for a delivery note" })
  async uploadPhoto(
    @Req() req: any,
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.deliveryService.uploadPhoto(req.user.companyId, id, file);
  }

  @Post(":id/extract")
  @ApiOperation({ summary: "Extract data from delivery note photo using AI" })
  async extractFromPhoto(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.extractFromPhoto(req.user.companyId, id);
  }

  @Get(":id/extraction")
  @ApiOperation({ summary: "Get extraction status for delivery note" })
  async extractionStatus(@Req() req: any, @Param("id") id: number) {
    return this.deliveryService.extractionStatus(req.user.companyId, id);
  }
}
