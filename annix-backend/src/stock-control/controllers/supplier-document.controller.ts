import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import {
  PermissionKey,
  StockControlRoleGuard,
  StockControlRoles,
} from "../guards/stock-control-role.guard";
import {
  type SupplierDocumentFilters,
  SupplierDocumentService,
  type UploadSupplierDocumentDto,
} from "../services/supplier-document.service";

@ApiTags("Stock Control - Supplier Documents")
@ApiBearerAuth()
@Controller("stock-control/supplier-documents")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class SupplierDocumentController {
  private readonly logger = new Logger(SupplierDocumentController.name);

  constructor(private readonly service: SupplierDocumentService) {}

  @Post()
  @StockControlRoles("storeman", "accounts", "manager", "admin")
  @PermissionKey("supplier-documents.upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a supplier compliance document" })
  async upload(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    const dto: UploadSupplierDocumentDto = {
      supplierId: parseInt(body.supplierId, 10),
      docType: body.docType,
      docNumber: body.docNumber || null,
      issuedAt: body.issuedAt || null,
      expiresAt: body.expiresAt || null,
      notes: body.notes || null,
    };
    return this.service.upload(req.user.companyId, dto, file, req.user);
  }

  @Get()
  @ApiOperation({ summary: "List supplier documents with optional filters" })
  async findAll(
    @Req() req: any,
    @Query("supplierId") supplierId?: string,
    @Query("docType") docType?: string,
    @Query("expiryStatus") expiryStatus?: string,
  ) {
    const filters: SupplierDocumentFilters = {};
    if (supplierId) filters.supplierId = parseInt(supplierId, 10);
    if (docType) filters.docType = docType;
    if (
      expiryStatus === "expired" ||
      expiryStatus === "expiring_soon" ||
      expiryStatus === "valid" ||
      expiryStatus === "no_expiry"
    ) {
      filters.expiryStatus = expiryStatus;
    }

    return this.service.findAll(req.user.companyId, filters);
  }

  @Get("expiring-soon")
  @ApiOperation({ summary: "List documents expiring within N days (default 30)" })
  async expiringSoon(@Req() req: any, @Query("days") days?: string) {
    const withinDays = days ? parseInt(days, 10) : 30;
    return this.service.expiringSoon(req.user.companyId, withinDays);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific supplier document with a presigned download URL" })
  async findById(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    const doc = await this.service.findById(req.user.companyId, id);
    const downloadUrl = await this.service.presignedUrl(req.user.companyId, id);
    return { ...doc, downloadUrl };
  }

  @Patch(":id")
  @StockControlRoles("storeman", "accounts", "manager", "admin")
  @PermissionKey("supplier-documents.update")
  @ApiOperation({ summary: "Update metadata on a supplier document" })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Partial<UploadSupplierDocumentDto>,
  ) {
    return this.service.update(req.user.companyId, id, body);
  }

  @Delete(":id")
  @StockControlRoles("manager", "admin")
  @PermissionKey("supplier-documents.delete")
  @ApiOperation({ summary: "Delete a supplier document" })
  async delete(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    await this.service.delete(req.user.companyId, id);
    return { deleted: true };
  }
}
