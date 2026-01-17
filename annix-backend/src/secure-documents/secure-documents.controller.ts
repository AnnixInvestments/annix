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
  ParseUUIDPipe,
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a secure document with decrypted content' })
  @ApiResponse({
    status: 200,
    description: 'Document with content',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SecureDocument & { content: string }> {
    return this.service.findOneWithContent(id);
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

  @Put(':id')
  @ApiOperation({ summary: 'Update a secure document' })
  @ApiResponse({
    status: 200,
    description: 'Document updated',
    type: SecureDocument,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSecureDocumentDto,
  ): Promise<SecureDocument> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a secure document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
