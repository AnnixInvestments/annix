import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard, AdminRequest } from "../admin/guards/admin-auth.guard";
import { ChemicalSupplierDocumentService } from "./chemical-supplier-document.service";
import {
  type ChemicalSupplierDocumentDto,
  type CreateChemicalSupplierDocumentDto,
  type UpdateChemicalSupplierDocumentDto,
} from "./dto/chemical-supplier-document.dto";
import type { CocProcessingStatus } from "./entities/rubber-supplier-coc.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";

@ApiTags("AU Rubber - Chemical Supplier Documents")
@Controller("rubber-lining/portal/chemical-documents")
@UseGuards(AdminAuthGuard, AuRubberAccessGuard)
@ApiBearerAuth()
export class ChemicalSupplierDocumentController {
  constructor(private readonly chemicalDocumentService: ChemicalSupplierDocumentService) {}

  @Get()
  @ApiOperation({ summary: "List chemical supplier documents" })
  async list(
    @Query("supplierCompanyId") supplierCompanyId?: string,
    @Query("processingStatus") processingStatus?: CocProcessingStatus,
    @Query("search") search?: string,
  ): Promise<ChemicalSupplierDocumentDto[]> {
    return this.chemicalDocumentService.list({
      supplierCompanyId: supplierCompanyId ? Number(supplierCompanyId) : undefined,
      processingStatus,
      search,
    });
  }

  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload a chemical supplier document set (merged COA/DG/SDS PDF)" })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateChemicalSupplierDocumentDto,
    @Req() req: AdminRequest,
  ): Promise<ChemicalSupplierDocumentDto> {
    const dto: CreateChemicalSupplierDocumentDto = {
      supplierCompanyId: body.supplierCompanyId ? Number(body.supplierCompanyId) : null,
      supplierName: body.supplierName ?? null,
      deliveryNoteNumber: body.deliveryNoteNumber ?? null,
      batchNumber: body.batchNumber ?? null,
      productName: body.productName ?? null,
    };
    return this.chemicalDocumentService.uploadDocument(file, dto, req.user?.email);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a chemical supplier document" })
  async byId(@Param("id") id: string): Promise<ChemicalSupplierDocumentDto> {
    return this.chemicalDocumentService.byId(Number(id));
  }

  @Get(":id/document")
  @ApiOperation({ summary: "Get a presigned URL for the stored document PDF" })
  async documentUrl(@Param("id") id: string): Promise<{ url: string }> {
    const url = await this.chemicalDocumentService.documentUrl(Number(id));
    return { url };
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a chemical supplier document's fields / extracted data" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateChemicalSupplierDocumentDto,
  ): Promise<ChemicalSupplierDocumentDto> {
    return this.chemicalDocumentService.update(Number(id), dto);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve a chemical supplier document" })
  async approve(
    @Param("id") id: string,
    @Req() req: AdminRequest,
  ): Promise<ChemicalSupplierDocumentDto> {
    return this.chemicalDocumentService.approve(Number(id), req.user?.email);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a chemical supplier document" })
  async remove(@Param("id") id: string): Promise<{ success: boolean }> {
    await this.chemicalDocumentService.remove(Number(id));
    return { success: true };
  }
}
