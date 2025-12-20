import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WorkflowService, PaginatedResult } from './workflow.service';
import { ReviewWorkflow, ReviewEntityType } from './entities/review-workflow.entity';
import { WorkflowQueryDto } from './dto/workflow-query.dto';
import { AssignReviewerDto } from './dto/assign-reviewer.dto';
import { ApprovalDto, RejectionDto, ChangeRequestDto } from '../drawings/dto/workflow-action.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditLog } from '../audit/entities/audit-log.entity';

@ApiTags('Workflow')
@Controller('workflow')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  // === SUBMIT FOR REVIEW ===

  @Post('drawings/:id/submit')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Submit a drawing for review' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReviewWorkflow })
  async submitDrawingForReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ReviewWorkflow> {
    return this.workflowService.submitForReview(ReviewEntityType.DRAWING, id, req.user);
  }

  @Post('boqs/:id/submit')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Submit a BOQ for review' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReviewWorkflow })
  async submitBoqForReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ReviewWorkflow> {
    return this.workflowService.submitForReview(ReviewEntityType.BOQ, id, req.user);
  }

  // === START REVIEW ===

  @Post(':id/start-review')
  @Roles('reviewer', 'approver', 'admin')
  @ApiOperation({ summary: 'Start reviewing an item (assigns to current user)' })
  @ApiResponse({ status: HttpStatus.OK, type: ReviewWorkflow })
  async startReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<ReviewWorkflow> {
    return this.workflowService.startReview(id, req.user);
  }

  // === DECISION ENDPOINTS ===

  @Post(':id/approve')
  @Roles('reviewer', 'approver', 'admin')
  @ApiOperation({ summary: 'Approve an item' })
  @ApiResponse({ status: HttpStatus.OK, type: ReviewWorkflow })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalDto,
    @Request() req,
  ): Promise<ReviewWorkflow> {
    return this.workflowService.approve(id, dto.notes || '', req.user);
  }

  @Post(':id/reject')
  @Roles('reviewer', 'approver', 'admin')
  @ApiOperation({ summary: 'Reject an item' })
  @ApiResponse({ status: HttpStatus.OK, type: ReviewWorkflow })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectionDto,
    @Request() req,
  ): Promise<ReviewWorkflow> {
    return this.workflowService.reject(id, dto.reason, req.user);
  }

  @Post(':id/request-changes')
  @Roles('reviewer', 'approver', 'admin')
  @ApiOperation({ summary: 'Request changes on an item' })
  @ApiResponse({ status: HttpStatus.OK, type: ReviewWorkflow })
  async requestChanges(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRequestDto,
    @Request() req,
  ): Promise<ReviewWorkflow> {
    return this.workflowService.requestChanges(id, dto.changesRequired, req.user);
  }

  // === ASSIGN REVIEWER ===

  @Post(':id/assign-reviewer')
  @Roles('rfq_administrator', 'approver', 'admin')
  @ApiOperation({ summary: 'Assign a reviewer to a workflow' })
  @ApiResponse({ status: HttpStatus.OK, type: ReviewWorkflow })
  async assignReviewer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignReviewerDto,
    @Request() req,
  ): Promise<ReviewWorkflow> {
    return this.workflowService.assignReviewer(id, dto, req.user);
  }

  // === QUERY ENDPOINTS ===

  @Get('pending')
  @Roles('reviewer', 'approver', 'compliance_officer', 'admin')
  @ApiOperation({ summary: 'Get all pending reviews for current user' })
  @ApiResponse({ status: HttpStatus.OK, type: [ReviewWorkflow] })
  async getPendingReviews(@Request() req): Promise<ReviewWorkflow[]> {
    return this.workflowService.getPendingReviews(req.user.id);
  }

  @Get()
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'admin')
  @ApiOperation({ summary: 'Get all workflows with filtering' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@Query() query: WorkflowQueryDto): Promise<PaginatedResult<ReviewWorkflow>> {
    return this.workflowService.findAll(query);
  }

  @Get(':id')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'admin')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ReviewWorkflow })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ReviewWorkflow> {
    return this.workflowService.findOne(id);
  }

  // === AUDIT TRAIL ===

  @Get(':entityType/:entityId/audit-trail')
  @Roles('rfq_administrator', 'compliance_officer', 'admin')
  @ApiOperation({ summary: 'Get complete audit trail for an entity' })
  @ApiResponse({ status: HttpStatus.OK, type: [AuditLog] })
  async getAuditTrail(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ): Promise<AuditLog[]> {
    return this.workflowService.getAuditTrail(entityType, entityId);
  }
}
