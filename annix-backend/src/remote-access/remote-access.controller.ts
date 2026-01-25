import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

import { RemoteAccessService } from './remote-access.service';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { CustomerAuthGuard } from '../customer/guards/customer-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateRemoteAccessRequestDto,
  RespondToAccessRequestDto,
  RemoteAccessRequestResponseDto,
  PendingAccessRequestsResponseDto,
  AccessStatusResponseDto,
} from './dto/remote-access.dto';
import { RemoteAccessDocumentType } from './entities/remote-access-request.entity';

@ApiTags('Remote Access')
@Controller('remote-access')
export class RemoteAccessController {
  constructor(private readonly remoteAccessService: RemoteAccessService) {}

  @Get('enabled')
  @ApiOperation({ summary: 'Check if remote access feature is enabled' })
  @ApiResponse({ status: 200, description: 'Feature status returned' })
  featureEnabled(): { enabled: boolean } {
    return { enabled: this.remoteAccessService.isFeatureEnabled() };
  }

  @Post('request')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request access to a customer document (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Access request created',
    type: RemoteAccessRequestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request or feature disabled' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async requestAccess(
    @Request() req: ExpressRequest,
    @Body() dto: CreateRemoteAccessRequestDto,
  ): Promise<RemoteAccessRequestResponseDto> {
    const adminId = req['user'].id;
    return this.remoteAccessService.requestAccess(adminId, dto);
  }

  @Get('status')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check access status for a document (Admin only)' })
  @ApiQuery({ name: 'documentType', enum: RemoteAccessDocumentType })
  @ApiQuery({ name: 'documentId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Access status returned',
    type: AccessStatusResponseDto,
  })
  async checkAccessStatus(
    @Request() req: ExpressRequest,
    @Query('documentType') documentType: RemoteAccessDocumentType,
    @Query('documentId', ParseIntPipe) documentId: number,
  ): Promise<AccessStatusResponseDto> {
    const adminId = req['user'].id;
    return this.remoteAccessService.checkAccessStatus(adminId, documentType, documentId);
  }

  @Get('request/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin', 'employee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get access request status by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Request ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Request status returned',
    type: RemoteAccessRequestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async requestStatus(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RemoteAccessRequestResponseDto> {
    return this.remoteAccessService.requestStatus(id);
  }

  @Get('pending')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending access requests for document owner (Customer only)' })
  @ApiResponse({
    status: 200,
    description: 'Pending requests returned',
    type: PendingAccessRequestsResponseDto,
  })
  async pendingRequests(
    @Request() req: ExpressRequest,
  ): Promise<PendingAccessRequestsResponseDto> {
    const userId = req['customer'].userId;
    return this.remoteAccessService.pendingRequestsForOwner(userId);
  }

  @Put(':id/respond')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Respond to an access request (Customer only)' })
  @ApiParam({ name: 'id', description: 'Request ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Response recorded',
    type: RemoteAccessRequestResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not the document owner' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async respondToRequest(
    @Request() req: ExpressRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondToAccessRequestDto,
  ): Promise<RemoteAccessRequestResponseDto> {
    const userId = req['customer'].userId;
    return this.remoteAccessService.respondToRequest(userId, id, dto);
  }
}
