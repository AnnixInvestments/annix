import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { isNil } from "es-toolkit/compat";
import { CustomerProfileRepository } from "../../customer/customer-profile.repository";
import { CustomerAuthGuard, CustomerRequest } from "../../customer/guards/customer-auth.guard";
import {
  DraftAiDto,
  PlanSourcingDto,
  PublishBucketDto,
  ReassignItemDto,
  SendSourcingDto,
  UpdateDraftBodyDto,
} from "./dto/rfq-sourcing.dto";
import {
  RfqSourcingDistributionService,
  type SendSourcingResult,
} from "./rfq-sourcing-distribution.service";
import { type PublishBucketResult, SourcingBoqBridgeService } from "./sourcing-boq-bridge.service";
import type { StoredSourcingPlan } from "./sourcing-plan.persistence";

export type SourcingPlanView = StoredSourcingPlan & {
  sendingEnabled: boolean;
  aiDraftEnabled: boolean;
};

@ApiTags("RFQ Sourcing")
@ApiBearerAuth()
@UseGuards(CustomerAuthGuard)
@Controller("rfq/sourcing")
export class RfqSourcingController {
  constructor(
    private readonly sourcingService: RfqSourcingDistributionService,
    private readonly bridgeService: SourcingBoqBridgeService,
    private readonly customerProfileRepo: CustomerProfileRepository,
  ) {}

  @Get("plan/:sessionId")
  @ApiOperation({
    summary: "Read the persisted sourcing plan for a session",
    description:
      "Returns the previously built plan (with saved reassignments and draft bodies), or null if none has been built yet. Does not rebuild.",
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Persisted sourcing plan or null" })
  async currentPlan(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Req() req: CustomerRequest,
  ): Promise<SourcingPlanView | null> {
    const companyId = await this.callerCompanyId(req);
    const plan = await this.sourcingService.currentPlan(sessionId, companyId);
    return plan ? this.withFlags(plan) : null;
  }

  @Post("plan")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({
    summary: "Build the supplier sourcing plan for a Nix extraction session",
    description:
      "Matches the session's extracted items against the customer's own preferred suppliers (tenant-scoped) and persists the resulting draft plan onto the session.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Sourcing plan built and persisted" })
  async plan(@Body() dto: PlanSourcingDto, @Req() req: CustomerRequest): Promise<SourcingPlanView> {
    const companyId = await this.callerCompanyId(req);
    const plan = await this.sourcingService.planSourcing(dto.sessionId, companyId);
    return this.withFlags(plan);
  }

  @Patch("reassign")
  @ApiOperation({
    summary: "Reassign an extracted item to a different supplier bucket",
    description: "Moves the row into the target bucket, removing it from any other auto bucket.",
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Updated sourcing plan" })
  async reassign(
    @Body() dto: ReassignItemDto,
    @Req() req: CustomerRequest,
  ): Promise<SourcingPlanView> {
    const companyId = await this.callerCompanyId(req);
    const plan = await this.sourcingService.reassignItem(
      dto.sessionId,
      dto.rowNumber,
      dto.targetBucketRef,
      companyId,
    );
    return this.withFlags(plan);
  }

  @Patch("draft-body")
  @ApiOperation({
    summary: "Update the reviewer-edited draft email body for a supplier bucket",
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Updated sourcing plan" })
  async draftBody(
    @Body() dto: UpdateDraftBodyDto,
    @Req() req: CustomerRequest,
  ): Promise<SourcingPlanView> {
    const companyId = await this.callerCompanyId(req);
    const plan = await this.sourcingService.updateDraftBody(
      dto.sessionId,
      dto.bucketRef,
      dto.body,
      companyId,
    );
    return this.withFlags(plan);
  }

  @Post("draft-ai")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: "AI-draft the sourcing email body for a supplier bucket",
    description:
      "Feature-flagged OFF by default (RFQ_SOURCING_AI_DRAFT_ENABLED). When enabled, drafts a fenced, plain-text email body via Gemini; on any AI failure or when disabled it falls back to the deterministic default body. Never throws for an AI failure.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Updated sourcing plan with draft body" })
  async draftAi(@Body() dto: DraftAiDto, @Req() req: CustomerRequest): Promise<SourcingPlanView> {
    const companyId = await this.callerCompanyId(req);
    const plan = await this.sourcingService.draftBucketEmailWithAi(
      dto.sessionId,
      dto.bucketRef,
      companyId,
      req.customer.userId,
    );
    return this.withFlags(plan);
  }

  @Post("send")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: "Send the sourcing email for a supplier bucket",
    description:
      "Feature-flagged OFF by default (RFQ_SOURCING_SEND_ENABLED). Resolves the recipient server-side from the tenant's supplier records and records a send audit.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Send result (audit or skipped)" })
  async send(
    @Body() dto: SendSourcingDto,
    @Req() req: CustomerRequest,
  ): Promise<SendSourcingResult> {
    const companyId = await this.callerCompanyId(req);
    return this.sourcingService.send(
      dto.sessionId,
      dto.bucketRef,
      req.customer.userId,
      companyId,
      dto.force ?? false,
    );
  }

  @Post("publish-bucket")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: "Publish a sourcing bucket as a BOQ for the existing supplier quote portal",
    description:
      "Feature-flagged OFF by default (RFQ_SOURCING_INAPP_QUOTE_ENABLED). Materializes one BOQ + section + supplier-access record from a registered-supplier bucket so the supplier quotes it through the existing BOQ portal. Idempotent: a second publish returns the same BOQ id without new writes.",
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: "Publish result (BOQ id or skipped)" })
  async publishBucket(
    @Body() dto: PublishBucketDto,
    @Req() req: CustomerRequest,
  ): Promise<PublishBucketResult> {
    const companyId = await this.callerCompanyId(req);
    return this.bridgeService.publishBucket(dto.sessionId, dto.bucketRef, companyId);
  }

  private withFlags(plan: StoredSourcingPlan): SourcingPlanView {
    return {
      ...plan,
      sendingEnabled: this.sourcingService.sendingEnabled(),
      aiDraftEnabled: this.sourcingService.aiDraftEnabled(),
    };
  }

  private async callerCompanyId(req: CustomerRequest): Promise<number> {
    const profile = await this.customerProfileRepo.findById(req.customer.customerId);
    if (!profile || isNil(profile.companyId)) {
      throw new ForbiddenException("Caller has no associated company");
    }
    return profile.companyId;
  }
}
