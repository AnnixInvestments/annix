import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { DeliveryNoteService } from "./delivery-note.service";
import {
  CreateDeliveryNoteDto,
  DeliveryNoteFilterDto,
  UpdateDeliveryNoteDto,
} from "./dto/delivery-note.dto";

@ApiTags("Delivery Notes (Unified)")
@Controller("platform/companies/:companyId/delivery-notes")
export class DeliveryNoteController {
  constructor(private readonly deliveryNoteService: DeliveryNoteService) {}

  @Get()
  @ApiOperation({ summary: "Search delivery notes with filters and pagination" })
  @ApiParam({ name: "companyId", type: Number })
  search(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Query() filters: DeliveryNoteFilterDto,
  ) {
    return this.deliveryNoteService.search(companyId, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get delivery note by ID" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  findOne(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.deliveryNoteService.findById(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create delivery note" })
  @ApiParam({ name: "companyId", type: Number })
  create(@Param("companyId", ParseIntPipe) companyId: number, @Body() dto: CreateDeliveryNoteDto) {
    return this.deliveryNoteService.create(companyId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update delivery note" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  update(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryNoteDto,
  ) {
    return this.deliveryNoteService.update(companyId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete delivery note" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  remove(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.deliveryNoteService.remove(companyId, id);
  }
}
