import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as fs from 'fs';

import { CustomerDocumentService } from './customer-document.service';
import { CustomerAuthGuard } from './guards/customer-auth.guard';
import { CustomerDocumentType } from './entities/customer-document.entity';

@ApiTags('Customer Documents')
@Controller('customer/documents')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class CustomerDocumentController {
  constructor(private readonly documentService: CustomerDocumentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customer documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved' })
  async getDocuments(@Req() req: Request) {
    const customerId = (req as any).customer.id;
    return this.documentService.getDocuments(customerId);
  }

  @Post()
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: Object.values(CustomerDocumentType) },
        expiryDate: { type: 'string', format: 'date', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file or document type' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { documentType: CustomerDocumentType; expiryDate?: string },
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;

    return this.documentService.uploadDocument(
      customerId,
      file,
      body.documentType,
      expiryDate,
      clientIp,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.documentService.deleteDocument(customerId, id, clientIp);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a document' })
  @ApiResponse({ status: 200, description: 'Document file' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const customerId = (req as any).customer.id;
    const { filePath, fileName, mimeType } = await this.documentService.getDocumentFile(customerId, id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
