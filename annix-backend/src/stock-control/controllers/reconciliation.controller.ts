import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { ReconciliationDocCategory } from "../entities/reconciliation-document.entity";
import { ReconciliationEventType } from "../entities/reconciliation-event.entity";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard } from "../guards/stock-control-role.guard";
import { ReconciliationService } from "../services/reconciliation.service";
import { ReconciliationDocumentService } from "../services/reconciliation-document.service";
import { ReconciliationExtractionService } from "../services/reconciliation-extraction.service";

@ApiTags("Stock Control - Reconciliation")
@Controller("stock-control/job-cards/:jobCardId/reconciliation")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class ReconciliationController {
  constructor(
    private readonly docService: ReconciliationDocumentService,
    private readonly reconService: ReconciliationService,
    private readonly extractionService: ReconciliationExtractionService,
  ) {}

  @Get("documents")
  @ApiOperation({ summary: "List reconciliation documents for a job card" })
  async listDocuments(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.docService.documentsForJobCard(req.user.companyId, jobCardId);
  }

  @Post("documents")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a reconciliation document" })
  async uploadDocument(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body("category") category: ReconciliationDocCategory,
  ) {
    return this.docService.upload(req.user.companyId, jobCardId, file, category, req.user);
  }

  @Delete("documents/:docId")
  @ApiOperation({ summary: "Delete a reconciliation document" })
  async deleteDocument(@Req() req: any, @Param("docId") docId: number) {
    await this.docService.deleteDocument(req.user.companyId, docId);
    return { deleted: true };
  }

  @Get("documents/:docId/view")
  @ApiOperation({ summary: "Presigned URL for viewing a document" })
  async viewDocument(@Req() req: any, @Param("docId") docId: number) {
    const url = await this.docService.presignedUrl(req.user.companyId, docId);
    return { url };
  }

  @Get("documents/:docId/download")
  @ApiOperation({ summary: "Download a reconciliation document" })
  async downloadDocument(@Req() req: any, @Param("docId") docId: number, @Res() res: Response) {
    const { buffer, filename, mimeType } = await this.docService.downloadBuffer(
      req.user.companyId,
      docId,
    );
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  }

  @Post("documents/:docId/retry-extraction")
  @ApiOperation({ summary: "Retry AI extraction for a document" })
  async retryExtraction(@Param("docId") docId: number) {
    await this.extractionService.retryExtraction(docId);
    return { retrying: true };
  }

  @Get("gate-status")
  @ApiOperation({ summary: "Document upload gate status" })
  async gateStatus(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.docService.gateStatus(req.user.companyId, jobCardId);
  }

  @Get("items")
  @ApiOperation({ summary: "Reconciliation items with events" })
  async listItems(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.reconService.itemsForJobCard(req.user.companyId, jobCardId);
  }

  @Post("items")
  @ApiOperation({ summary: "Add a manual reconciliation item" })
  async addItem(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body() body: { itemDescription: string; itemCode: string | null; quantityOrdered: number },
  ) {
    return this.reconService.addItem(req.user.companyId, jobCardId, body, req.user);
  }

  @Put("items/:itemId")
  @ApiOperation({ summary: "Update a reconciliation item" })
  async updateItem(@Req() req: any, @Param("itemId") itemId: number, @Body() body: any) {
    return this.reconService.updateItem(req.user.companyId, itemId, body);
  }

  @Delete("items/:itemId")
  @ApiOperation({ summary: "Delete a reconciliation item" })
  async deleteItem(@Req() req: any, @Param("itemId") itemId: number) {
    await this.reconService.deleteItem(req.user.companyId, itemId);
    return { deleted: true };
  }

  @Post("events")
  @ApiOperation({ summary: "Record reconciliation events (QA release, Polymer DN, MPS DN)" })
  async recordEvent(
    @Req() req: any,
    @Param("jobCardId") jobCardId: number,
    @Body()
    body: {
      eventType: ReconciliationEventType;
      items: Array<{ reconciliationItemId: number; quantity: number }>;
      referenceNumber: string | null;
      notes: string | null;
    },
  ) {
    return this.reconService.recordEvent(
      req.user.companyId,
      jobCardId,
      body.eventType,
      body.items,
      body.referenceNumber,
      req.user,
      body.notes,
    );
  }

  @Get("summary")
  @ApiOperation({ summary: "Reconciliation summary" })
  async reconciliationSummary(@Req() req: any, @Param("jobCardId") jobCardId: number) {
    return this.reconService.summary(req.user.companyId, jobCardId);
  }
}
