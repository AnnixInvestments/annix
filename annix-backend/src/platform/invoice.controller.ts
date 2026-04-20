import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { InvoiceFilterDto } from "./dto/invoice.dto";
import { InvoiceService } from "./invoice.service";

@ApiTags("Invoices (Unified)")
@Controller("platform/companies/:companyId/invoices")
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: "Search invoices with filters and pagination" })
  @ApiParam({ name: "companyId", type: Number })
  search(@Param("companyId", ParseIntPipe) companyId: number, @Query() filters: InvoiceFilterDto) {
    return this.invoiceService.search(companyId, filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get invoice by ID" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  findOne(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.invoiceService.findById(companyId, id);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve invoice" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  approve(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.invoiceService.approve(companyId, id, "system");
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete invoice" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  remove(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.invoiceService.remove(companyId, id);
  }
}
