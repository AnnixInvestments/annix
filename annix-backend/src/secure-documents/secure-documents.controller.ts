import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { SecureDocumentsService } from './secure-documents.service';
import { CreateSecureDocumentDto } from './dto/create-secure-document.dto';
import { UpdateSecureDocumentDto } from './dto/update-secure-document.dto';
import { SecureDocument } from './secure-document.entity';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    sessionToken: string;
  };
}

@ApiTags('Secure Documents')
@Controller('admin/secure-documents')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class SecureDocumentsController {
  constructor(private readonly service: SecureDocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all secure documents (metadata only)' })
  @ApiResponse({
    status: 200,
    description: 'List of secure documents',
    type: [SecureDocument],
  })
  async findAll(): Promise<SecureDocument[]> {
    return this.service.findAll();
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a secure document with decrypted content by ID or slug' })
  @ApiResponse({
    status: 200,
    description: 'Document with content',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
  ): Promise<SecureDocument & { content: string }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      return this.service.findOneWithContent(idOrSlug);
    }
    return this.service.findBySlugWithContent(idOrSlug);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new secure document' })
  @ApiResponse({
    status: 201,
    description: 'Document created',
    type: SecureDocument,
  })
  async create(
    @Body() dto: CreateSecureDocumentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SecureDocument> {
    return this.service.create(dto, req.user.id);
  }

  @Put(':idOrSlug')
  @ApiOperation({ summary: 'Update a secure document by ID or slug' })
  @ApiResponse({
    status: 200,
    description: 'Document updated',
    type: SecureDocument,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateSecureDocumentDto,
  ): Promise<SecureDocument> {
    const id = await this.resolveId(idOrSlug);
    return this.service.update(id, dto);
  }

  @Delete(':idOrSlug')
  @ApiOperation({ summary: 'Delete a secure document by ID or slug' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(@Param('idOrSlug') idOrSlug: string): Promise<void> {
    const id = await this.resolveId(idOrSlug);
    return this.service.remove(id);
  }

  private async resolveId(idOrSlug: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      return idOrSlug;
    }
    const document = await this.service.findBySlug(idOrSlug);
    return document.id;
  }
}
