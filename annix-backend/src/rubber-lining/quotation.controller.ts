import { Body, Controller, Delete, Get, Param, Patch, Post, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { CreateQuotationDto, UpdateQuotationDto } from "./dto/quotation.dto";
import { QuotationService } from "./services/quotation.service";

@ApiTags("Quotations")
@ApiBearerAuth()
@Controller("rubber-lining/portal/quotations")
@UseGuards(AdminAuthGuard)
export class QuotationController {
  constructor(private readonly quotationService: QuotationService) {}

  @Post()
  @ApiOperation({ summary: "Create a quotation" })
  async create(@Body() dto: CreateQuotationDto) {
    return this.quotationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List all quotations" })
  async findAll() {
    return this.quotationService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a quotation by id" })
  async findById(@Param("id") id: number) {
    return this.quotationService.findById(Number(id));
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a quotation" })
  async update(@Param("id") id: number, @Body() dto: UpdateQuotationDto) {
    return this.quotationService.update(Number(id), dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a quotation" })
  async delete(@Param("id") id: number) {
    const deleted = await this.quotationService.delete(Number(id));
    return { deleted };
  }

  @Get(":id/pdf")
  @ApiOperation({ summary: "Generate quotation PDF" })
  async pdf(@Param("id") id: string, @Res() res: Response): Promise<void> {
    const buffer = await this.quotationService.generatePdf(Number(id));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Quotation-${id}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post(":id/send")
  @ApiOperation({ summary: "Send quotation email" })
  async send(
    @Param("id") id: string,
    @Body() body: { email: string; cc?: string; bcc?: string },
  ): Promise<{ success: boolean }> {
    await this.quotationService.sendEmail(Number(id), body.email, body.cc, body.bcc);
    return { success: true };
  }
}
