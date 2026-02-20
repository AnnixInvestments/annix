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
import { DeliveryService } from "../services/delivery.service";

@ApiTags("Stock Control - Deliveries")
@Controller("stock-control/deliveries")
@UseGuards(StockControlAuthGuard)
export class DeliveriesController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @ApiOperation({ summary: "List all delivery notes" })
  async list() {
    return this.deliveryService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Delivery note by ID" })
  async findById(@Param("id") id: number) {
    return this.deliveryService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a delivery note with items" })
  async create(@Body() body: any, @Req() req: any) {
    return this.deliveryService.create({ ...body, receivedBy: req.user.name });
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a delivery note" })
  async remove(@Param("id") id: number) {
    return this.deliveryService.remove(id);
  }

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a photo for a delivery note" })
  async uploadPhoto(
    @Param("id") id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const delivery = await this.deliveryService.findById(id);
    return { deliveryId: delivery.id, filename: file.originalname, size: file.size };
  }
}
