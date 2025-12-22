import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { SupplierService } from './supplier.service';
import { SupplierAuthGuard } from './guards/supplier-auth.guard';
import {
  SupplierCompanyDto,
  UpdateSupplierProfileDto,
  UploadSupplierDocumentDto,
} from './dto';

@ApiTags('Supplier Portal')
@Controller('supplier')
@UseGuards(SupplierAuthGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get supplier profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@Req() req: Request) {
    const supplierId = req['supplier'].supplierId;
    return this.supplierService.getProfile(supplierId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update supplier profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @Body() dto: UpdateSupplierProfileDto,
    @Req() req: Request,
  ) {
    const supplierId = req['supplier'].supplierId;
    const clientIp = this.getClientIp(req);
    return this.supplierService.updateProfile(supplierId, dto, clientIp);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get supplier dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard(@Req() req: Request) {
    const supplierId = req['supplier'].supplierId;
    return this.supplierService.getDashboard(supplierId);
  }

  @Get('onboarding/status')
  @ApiOperation({ summary: 'Get onboarding status' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved' })
  async getOnboardingStatus(@Req() req: Request) {
    const supplierId = req['supplier'].supplierId;
    return this.supplierService.getOnboardingStatus(supplierId);
  }

  @Post('onboarding/company')
  @ApiOperation({ summary: 'Save company details for onboarding' })
  @ApiResponse({ status: 200, description: 'Company details saved' })
  async saveCompanyDetails(
    @Body() dto: SupplierCompanyDto,
    @Req() req: Request,
  ) {
    const supplierId = req['supplier'].supplierId;
    const clientIp = this.getClientIp(req);
    return this.supplierService.saveCompanyDetails(supplierId, dto, clientIp);
  }

  @Get('onboarding/documents')
  @ApiOperation({ summary: 'Get uploaded documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved' })
  async getDocuments(@Req() req: Request) {
    const supplierId = req['supplier'].supplierId;
    return this.supplierService.getDocuments(supplierId);
  }

  @Post('onboarding/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload onboarding document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: ['registration_cert', 'tax_clearance', 'bee_cert', 'iso_cert', 'insurance', 'other'] },
        expiryDate: { type: 'string', format: 'date' },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSupplierDocumentDto,
    @Req() req: Request,
  ) {
    const supplierId = req['supplier'].supplierId;
    const clientIp = this.getClientIp(req);
    return this.supplierService.uploadDocument(supplierId, file, dto, clientIp);
  }

  @Delete('onboarding/documents/:id')
  @ApiOperation({ summary: 'Delete onboarding document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async deleteDocument(
    @Param('id', ParseIntPipe) documentId: number,
    @Req() req: Request,
  ) {
    const supplierId = req['supplier'].supplierId;
    const clientIp = this.getClientIp(req);
    await this.supplierService.deleteDocument(supplierId, documentId, clientIp);
    return { success: true, message: 'Document deleted' };
  }

  @Post('onboarding/submit')
  @ApiOperation({ summary: 'Submit onboarding for review' })
  @ApiResponse({ status: 200, description: 'Onboarding submitted' })
  @ApiResponse({ status: 400, description: 'Incomplete onboarding data' })
  async submitOnboarding(@Req() req: Request) {
    const supplierId = req['supplier'].supplierId;
    const clientIp = this.getClientIp(req);
    return this.supplierService.submitOnboarding(supplierId, clientIp);
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
