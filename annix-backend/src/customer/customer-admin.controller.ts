import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { EmailService } from "../email/email.service";
import { AutoApprovalService } from "../nix/services/auto-approval.service";
import { DocumentVerificationService } from "../nix/services/document-verification.service";
import { CustomerAdminService } from "./customer-admin.service";
import {
  CustomerDetailDto,
  CustomerListResponseDto,
  CustomerQueryDto,
  ReactivateCustomerDto,
  ResetDeviceBindingDto,
  SuspendCustomerDto,
} from "./dto";

@ApiTags("Customer Administration")
@Controller("admin/customers")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth()
export class CustomerAdminController {
  constructor(
    private readonly customerAdminService: CustomerAdminService,
    private readonly emailService: EmailService,
    private readonly documentVerificationService: DocumentVerificationService,
    private readonly autoApprovalService: AutoApprovalService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all customers with filtering and pagination" })
  @ApiResponse({
    status: 200,
    description: "Customer list",
    type: CustomerListResponseDto,
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search by company name or email",
  })
  @ApiQuery({
    name: "status",
    required: false,
    description: "Filter by account status",
  })
  @ApiQuery({ name: "page", required: false, description: "Page number" })
  @ApiQuery({ name: "limit", required: false, description: "Items per page" })
  async listCustomers(@Query() query: CustomerQueryDto): Promise<CustomerListResponseDto> {
    return this.customerAdminService.listCustomers(query);
  }

  @Get("documents/:documentId/url")
  @ApiOperation({ summary: "Get presigned URL for customer document" })
  @ApiParam({ name: "documentId", description: "Document ID" })
  @ApiResponse({ status: 200, description: "Presigned URL for document" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async getDocumentUrl(@Param("documentId", ParseIntPipe) documentId: number) {
    return this.customerAdminService.getDocumentUrl(documentId);
  }

  @Get("onboarding/pending-review")
  @ApiOperation({ summary: "Get customers pending onboarding review" })
  @ApiResponse({ status: 200, description: "Pending review list" })
  async getPendingReview() {
    return this.customerAdminService.getPendingReviewCustomers();
  }

  @Get("onboarding/:id")
  @ApiOperation({ summary: "Get onboarding details for review" })
  @ApiParam({ name: "id", description: "Onboarding ID" })
  @ApiResponse({ status: 200, description: "Onboarding details" })
  @ApiResponse({ status: 404, description: "Onboarding not found" })
  async getOnboardingForReview(@Param("id", ParseIntPipe) id: number) {
    return this.customerAdminService.getOnboardingForReview(id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get customer details" })
  @ApiParam({ name: "id", description: "Customer ID" })
  @ApiResponse({
    status: 200,
    description: "Customer details",
    type: CustomerDetailDto,
  })
  @ApiResponse({ status: 404, description: "Customer not found" })
  async getCustomerDetail(@Param("id", ParseIntPipe) id: number): Promise<CustomerDetailDto> {
    return this.customerAdminService.getCustomerDetail(id);
  }

  @Post(":id/suspend")
  @ApiOperation({ summary: "Suspend customer account" })
  @ApiParam({ name: "id", description: "Customer ID" })
  @ApiResponse({ status: 200, description: "Account suspended" })
  @ApiResponse({ status: 400, description: "Account already suspended" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  async suspendCustomer(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SuspendCustomerDto,
    @Req() req: Request,
  ) {
    const adminUserId = req["user"]?.sub || req["user"]?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.suspendCustomer(id, dto, adminUserId, clientIp);
  }

  @Post(":id/reactivate")
  @ApiOperation({ summary: "Reactivate suspended customer account" })
  @ApiParam({ name: "id", description: "Customer ID" })
  @ApiResponse({ status: 200, description: "Account reactivated" })
  @ApiResponse({ status: 400, description: "Account already active" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  async reactivateCustomer(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ReactivateCustomerDto,
    @Req() req: Request,
  ) {
    const adminUserId = req["user"]?.sub || req["user"]?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.reactivateCustomer(id, dto, adminUserId, clientIp);
  }

  @Post(":id/reset-device")
  @ApiOperation({ summary: "Reset customer device binding" })
  @ApiParam({ name: "id", description: "Customer ID" })
  @ApiResponse({ status: 200, description: "Device binding reset" })
  @ApiResponse({ status: 400, description: "No active device binding" })
  @ApiResponse({ status: 404, description: "Customer not found" })
  async resetDeviceBinding(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ResetDeviceBindingDto,
    @Req() req: Request,
  ) {
    const adminUserId = req["user"]?.sub || req["user"]?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.resetDeviceBinding(id, dto, adminUserId, clientIp);
  }

  @Get(":id/login-history")
  @ApiOperation({ summary: "Get customer login history" })
  @ApiParam({ name: "id", description: "Customer ID" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of records to return",
  })
  @ApiResponse({ status: 200, description: "Login history" })
  async getLoginHistory(@Param("id", ParseIntPipe) id: number, @Query("limit") limit?: number) {
    return this.customerAdminService.getLoginHistory(id, limit || 50);
  }

  @Get(":id/documents")
  @ApiOperation({ summary: "Get customer documents" })
  @ApiParam({ name: "id", description: "Customer ID" })
  @ApiResponse({ status: 200, description: "Customer documents" })
  async getCustomerDocuments(@Param("id", ParseIntPipe) id: number) {
    return this.customerAdminService.getCustomerDocuments(id);
  }

  @Post("onboarding/:id/approve")
  @ApiOperation({ summary: "Approve customer onboarding" })
  @ApiParam({ name: "id", description: "Onboarding ID" })
  @ApiResponse({ status: 200, description: "Onboarding approved" })
  @ApiResponse({ status: 400, description: "Not in reviewable state" })
  async approveOnboarding(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
    const adminUserId = req["user"]?.sub || req["user"]?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.approveOnboarding(id, adminUserId, clientIp);
  }

  @Post("onboarding/:id/reject")
  @ApiOperation({ summary: "Reject customer onboarding" })
  @ApiParam({ name: "id", description: "Onboarding ID" })
  @ApiResponse({ status: 200, description: "Onboarding rejected" })
  @ApiResponse({ status: 400, description: "Not in reviewable state" })
  async rejectOnboarding(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { reason: string; remediationSteps: string },
    @Req() req: Request,
  ) {
    const adminUserId = req["user"]?.sub || req["user"]?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.rejectOnboarding(
      id,
      body.reason,
      body.remediationSteps,
      adminUserId,
      clientIp,
    );
  }

  @Post("documents/:id/review")
  @ApiOperation({ summary: "Review a customer document" })
  @ApiParam({ name: "id", description: "Document ID" })
  @ApiResponse({ status: 200, description: "Document reviewed" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async reviewDocument(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { validationStatus: string; validationNotes?: string },
    @Req() req: Request,
  ) {
    const adminUserId = req["user"]?.sub || req["user"]?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.reviewDocument(
      id,
      body.validationStatus as any,
      body.validationNotes || null,
      adminUserId,
      clientIp,
    );
  }

  @Get("documents/:id/review-data")
  @ApiOperation({ summary: "Get document review data with OCR comparison" })
  @ApiParam({ name: "id", description: "Document ID" })
  @ApiResponse({ status: 200, description: "Document review data" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async getDocumentReviewData(@Param("id", ParseIntPipe) id: number) {
    return this.customerAdminService.getDocumentReviewData(id);
  }

  @Get("documents/:id/preview-images")
  @ApiOperation({ summary: "Get document preview as images (converts PDF to images)" })
  @ApiParam({ name: "id", description: "Document ID" })
  @ApiResponse({ status: 200, description: "Document preview images" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async getDocumentPreviewImages(@Param("id", ParseIntPipe) id: number) {
    return this.customerAdminService.getDocumentPreviewImages(id);
  }

  @Post("documents/:id/re-verify")
  @ApiOperation({ summary: "Re-verify a customer document" })
  @ApiParam({ name: "id", description: "Document ID" })
  @ApiResponse({ status: 200, description: "Re-verification triggered" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async reVerifyDocument(@Param("id", ParseIntPipe) id: number) {
    const document = await this.customerAdminService.getDocumentById(id);
    const result = await this.documentVerificationService.verifyDocument({
      entityType: "customer",
      entityId: document.customerId,
      documentId: id,
    });
    return result;
  }

  @Post(":id/check-auto-approval")
  @ApiOperation({ summary: "Check if customer can be auto-approved" })
  @ApiParam({ name: "id", description: "Customer ID" })
  @ApiResponse({ status: 200, description: "Auto-approval check result" })
  async checkAutoApproval(@Param("id", ParseIntPipe) id: number) {
    return this.autoApprovalService.checkAndAutoApprove("customer", id);
  }

  // Invitation Endpoints

  @Post("invite")
  @ApiOperation({ summary: "Send customer invitation email" })
  @ApiResponse({ status: 200, description: "Invitation sent" })
  @ApiResponse({ status: 400, description: "Invalid email" })
  async inviteCustomer(@Body() body: { email: string; message?: string }, @Req() req: Request) {
    const adminName = req["user"]?.firstName
      ? `${req["user"].firstName} ${req["user"].lastName || ""}`.trim()
      : "Annix Admin";

    const success = await this.emailService.sendCustomerInvitationEmail(
      body.email,
      adminName,
      body.message,
    );

    return {
      success,
      message: success ? `Invitation sent to ${body.email}` : "Failed to send invitation",
    };
  }

  // Helper methods

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
      return ips.trim();
    }
    return req.ip || req.socket?.remoteAddress || "unknown";
  }
}
