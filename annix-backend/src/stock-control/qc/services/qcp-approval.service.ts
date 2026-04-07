import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now, nowISO } from "../../../lib/datetime";
import { S3StorageService } from "../../../storage/s3-storage.service";
import { StockControlCompany } from "../../entities/stock-control-company.entity";
import { CompanyEmailService } from "../../services/company-email.service";
import { QcControlPlan } from "../entities/qc-control-plan.entity";
import {
  QcpApprovalToken,
  QcpApprovalTokenStatus,
  type QcpPartyRole,
} from "../entities/qcp-approval-token.entity";
import { QcpCustomerPreference } from "../entities/qcp-customer-preference.entity";

@Injectable()
export class QcpApprovalService {
  private readonly logger = new Logger(QcpApprovalService.name);
  private readonly storageType: string;

  constructor(
    @InjectRepository(QcpApprovalToken)
    private readonly tokenRepo: Repository<QcpApprovalToken>,
    @InjectRepository(QcpCustomerPreference)
    private readonly prefRepo: Repository<QcpCustomerPreference>,
    @InjectRepository(QcControlPlan)
    private readonly planRepo: Repository<QcControlPlan>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    private readonly emailService: CompanyEmailService,
    private readonly s3StorageService: S3StorageService,
    private readonly configService: ConfigService,
  ) {
    this.storageType = this.configService.get<string>("STORAGE_TYPE") || "local";
  }

  private async priorTokenRecipients(
    planId: number,
    partyRoles: QcpPartyRole[],
  ): Promise<string[]> {
    const tokens = await this.tokenRepo.find({
      where: partyRoles.map((role) => ({
        controlPlanId: planId,
        partyRole: role,
        status: QcpApprovalTokenStatus.APPROVED,
      })),
    });
    return tokens.map((t) => t.recipientEmail).filter((e): e is string => !!e);
  }

  private async resolveStorageUrl(path: string | null): Promise<string | null> {
    if (!path) {
      return null;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (this.storageType === "s3") {
      return await this.s3StorageService.presignedUrl(path, 86400);
    }
    return path;
  }

  async sendForClientApproval(
    companyId: number,
    planId: number,
    clientEmail: string,
    user: { id: number; name: string },
  ): Promise<QcpApprovalToken> {
    const plan = await this.planRepo.findOne({ where: { id: planId, companyId } });
    if (!plan) {
      throw new NotFoundException("Control plan not found");
    }

    await this.tokenRepo.update(
      { controlPlanId: planId, partyRole: "mps", status: QcpApprovalTokenStatus.PENDING },
      { status: QcpApprovalTokenStatus.SUPERSEDED },
    );

    const token = randomBytes(32).toString("hex");
    const expiresAt = now().plus({ days: 14 }).toJSDate();

    const approvalToken = this.tokenRepo.create({
      companyId,
      controlPlanId: planId,
      controlPlanVersion: plan.version,
      partyRole: "mps" as QcpPartyRole,
      recipientEmail: clientEmail,
      recipientName: null,
      token,
      tokenExpiresAt: expiresAt,
      activitiesSnapshot: plan.activities,
      sentByParty: null,
    });

    const saved = await this.tokenRepo.save(approvalToken);

    const activeParties = ["pls", "mps", "client"];
    await this.planRepo.update(planId, {
      approvalStatus: "pending_mps",
      clientEmail,
      activeParties,
    });

    if (plan.customerName) {
      await this.upsertCustomerEmail(companyId, plan.customerName, clientEmail);
    }

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const companyName = company?.name || "Stock Control";
    const baseUrl = this.frontendBaseUrl();
    const reviewUrl = `${baseUrl}/stock-control/qcp-review/${token}`;

    await this.emailService.sendEmail(companyId, {
      to: clientEmail,
      subject:
        `QCP Review Request - ${plan.qcpNumber || `QCP #${plan.id}`} - ${plan.jobName || ""}`.trim(),
      html: this.reviewRequestEmailHtml(companyName, plan, reviewUrl, "mps"),
      text: `You have been requested to review QCP ${plan.qcpNumber || plan.id}. Review link: ${reviewUrl}`,
    });

    this.logger.log(
      `QCP approval token sent to ${clientEmail} (MPS) for plan ${planId} by ${user.name}`,
    );

    return saved;
  }

  async tokenDetails(tokenStr: string): Promise<{
    token: QcpApprovalToken;
    plan: QcControlPlan;
    company: { name: string; logoUrl: string | null; primaryColor: string | null };
  }> {
    const token = await this.tokenRepo.findOne({ where: { token: tokenStr } });
    if (!token) {
      throw new NotFoundException("Review link not found or invalid");
    }

    if (token.tokenExpiresAt < now().toJSDate()) {
      throw new BadRequestException("This review link has expired");
    }

    if (token.status !== QcpApprovalTokenStatus.PENDING) {
      throw new BadRequestException(
        `This review has already been ${token.status === QcpApprovalTokenStatus.APPROVED ? "approved" : token.status === QcpApprovalTokenStatus.CHANGES_REQUESTED ? "returned with change requests" : "superseded by a newer request"}`,
      );
    }

    const plan = await this.planRepo.findOne({
      where: { id: token.controlPlanId, companyId: token.companyId },
    });
    if (!plan) {
      throw new NotFoundException("Control plan no longer exists");
    }

    const company = await this.companyRepo.findOne({ where: { id: token.companyId } });
    const resolvedLogoUrl = await this.resolveStorageUrl(company?.logoUrl || null);

    return {
      token,
      plan,
      company: {
        name: company?.name || "",
        logoUrl: resolvedLogoUrl,
        primaryColor: company?.primaryColor || null,
      },
    };
  }

  async submitReview(
    tokenStr: string,
    payload: {
      action: "approve" | "request_changes";
      activities?: any[];
      lineRemarks?: Array<{ operationNumber: number; remark: string }>;
      overallComments?: string;
      signatureName?: string;
      signatureUrl?: string;
    },
  ): Promise<{ success: boolean }> {
    const token = await this.tokenRepo.findOne({ where: { token: tokenStr } });
    if (!token) {
      throw new NotFoundException("Review link not found");
    }

    if (token.tokenExpiresAt < now().toJSDate()) {
      throw new BadRequestException("This review link has expired");
    }

    if (token.status !== QcpApprovalTokenStatus.PENDING) {
      throw new BadRequestException("This review has already been actioned");
    }

    const plan = await this.planRepo.findOne({
      where: { id: token.controlPlanId, companyId: token.companyId },
    });
    if (!plan) {
      throw new NotFoundException("Control plan no longer exists");
    }

    const partyKeyMap: Record<string, string> = {
      mps: "mps",
      client: "client",
      third_party: "thirdParty",
    };
    const roleLabelMap: Record<string, string> = {
      mps: "MPS",
      client: "Client",
      third_party: "3rd Party",
    };

    if (payload.action === "approve") {
      if (!payload.signatureName || !payload.signatureUrl) {
        throw new BadRequestException("Signature is required for approval");
      }

      const partyKey = partyKeyMap[token.partyRole] || "client";
      const updatedActivities = (payload.activities || plan.activities).map(
        (activity: any, idx: number) => {
          const planActivity = plan.activities[idx];
          if (!planActivity) return activity;
          return {
            ...planActivity,
            [partyKey]: activity[partyKey] || planActivity[partyKey],
          };
        },
      );

      const sigParty = roleLabelMap[token.partyRole] || "Client";
      const updatedSignatures = plan.approvalSignatures.map((sig) => {
        if (sig.party === sigParty) {
          return {
            ...sig,
            name: payload.signatureName || null,
            signatureUrl: payload.signatureUrl || null,
            date: nowISO().slice(0, 10),
          };
        }
        return sig;
      });

      const nextStatus =
        token.partyRole === "mps"
          ? "approved"
          : token.partyRole === "client"
            ? plan.thirdPartyEmail || plan.activeParties?.includes("thirdParty")
              ? "pending_third_party"
              : "approved"
            : "approved";

      await this.planRepo.update(plan.id, {
        activities: updatedActivities,
        approvalSignatures: updatedSignatures,
        approvalStatus: nextStatus,
      });

      await this.tokenRepo.update(token.id, {
        status: QcpApprovalTokenStatus.APPROVED,
        submittedActivities: payload.activities || null,
        lineRemarks: payload.lineRemarks || null,
        overallComments: payload.overallComments || null,
        signatureName: payload.signatureName,
        signatureUrl: payload.signatureUrl,
        signedAt: now().toJSDate(),
      });

      const company = await this.companyRepo.findOne({ where: { id: token.companyId } });
      const roleLabel = roleLabelMap[token.partyRole] || token.partyRole;
      const qamEmail = company?.notificationEmails?.[0] || null;

      await this.emailService.sendEmail(token.companyId, {
        to: qamEmail || token.recipientEmail,
        subject: `QCP Approved - ${plan.qcpNumber || `QCP #${plan.id}`} by ${payload.signatureName}`,
        html: `<p><strong>${payload.signatureName}</strong> (${roleLabel}) has approved QCP <strong>${plan.qcpNumber || plan.id}</strong>.</p>`,
        text: `${payload.signatureName} has approved QCP ${plan.qcpNumber || plan.id}.`,
      });

      if (token.partyRole === "third_party" && nextStatus === "approved") {
        const priorRecipients = await this.priorTokenRecipients(plan.id, ["mps", "client"]);
        const fullApprovalRecipients = Array.from(new Set(priorRecipients));
        await Promise.all(
          fullApprovalRecipients.map((to) =>
            this.emailService.sendEmail(token.companyId, {
              to,
              subject: `QCP Fully Approved - ${plan.qcpNumber || `QCP #${plan.id}`}`,
              html: `<p>QCP <strong>${plan.qcpNumber || plan.id}</strong> has now been fully approved. 3rd party reviewer <strong>${payload.signatureName}</strong> has signed off and all parties have completed their review.</p>`,
              text: `QCP ${plan.qcpNumber || plan.id} has been fully approved. 3rd party (${payload.signatureName}) has signed off.`,
            }),
          ),
        );
      }
    } else {
      await this.tokenRepo.update(token.id, {
        status: QcpApprovalTokenStatus.CHANGES_REQUESTED,
        submittedActivities: payload.activities || null,
        lineRemarks: payload.lineRemarks || null,
        overallComments: payload.overallComments || null,
      });

      await this.planRepo.update(plan.id, {
        approvalStatus: "changes_requested",
        version: plan.version + 1,
      });

      const company = await this.companyRepo.findOne({ where: { id: token.companyId } });
      const notifEmail = company?.notificationEmails?.[0];

      if (notifEmail) {
        const remarksHtml = (payload.lineRemarks || [])
          .map((r) => `<li>Activity ${r.operationNumber}: ${r.remark}</li>`)
          .join("");

        await this.emailService.sendEmail(token.companyId, {
          to: notifEmail,
          subject: `QCP Changes Requested - ${plan.qcpNumber || `QCP #${plan.id}`}`,
          html: `
            <p><strong>${token.recipientEmail}</strong> (${roleLabelMap[token.partyRole] || token.partyRole}) has requested changes to QCP <strong>${plan.qcpNumber || plan.id}</strong>.</p>
            ${payload.overallComments ? `<p><strong>Comments:</strong> ${payload.overallComments}</p>` : ""}
            ${remarksHtml ? `<p><strong>Line remarks:</strong></p><ul>${remarksHtml}</ul>` : ""}
          `,
          text: `Changes requested for QCP ${plan.qcpNumber || plan.id} by ${token.recipientEmail}.`,
        });
      }
    }

    return { success: true };
  }

  async saveInterventionPreferences(
    tokenStr: string,
    preferences: Record<number, string>,
  ): Promise<{ saved: boolean }> {
    const token = await this.tokenRepo.findOne({ where: { token: tokenStr } });
    if (!token) {
      throw new NotFoundException("Review link not found");
    }

    const plan = await this.planRepo.findOne({
      where: { id: token.controlPlanId, companyId: token.companyId },
    });
    if (!plan?.customerName) {
      throw new BadRequestException("Cannot save preferences without a customer name");
    }

    const existing = await this.prefRepo.findOne({
      where: {
        companyId: token.companyId,
        customerName: plan.customerName,
        planType: plan.planType,
      },
    });

    if (existing) {
      await this.prefRepo.update(existing.id, {
        interventionDefaults: preferences,
        customerEmail: token.recipientEmail,
      });
    } else {
      await this.prefRepo.save(
        this.prefRepo.create({
          companyId: token.companyId,
          customerName: plan.customerName,
          customerEmail: token.recipientEmail,
          planType: plan.planType,
          interventionDefaults: preferences,
        }),
      );
    }

    return { saved: true };
  }

  async forwardToClient(
    tokenStr: string,
    clientEmail: string,
    clientName: string | null,
  ): Promise<QcpApprovalToken> {
    const mpsToken = await this.tokenRepo.findOne({ where: { token: tokenStr } });
    if (!mpsToken) {
      throw new NotFoundException("Review link not found");
    }

    if (mpsToken.status !== QcpApprovalTokenStatus.APPROVED) {
      throw new BadRequestException("MPS must approve before forwarding to client");
    }

    if (mpsToken.partyRole !== "mps") {
      throw new ForbiddenException("Only MPS tokens can forward to client");
    }

    const plan = await this.planRepo.findOne({
      where: { id: mpsToken.controlPlanId, companyId: mpsToken.companyId },
    });
    if (!plan) {
      throw new NotFoundException("Control plan not found");
    }

    await this.tokenRepo.update(
      {
        controlPlanId: plan.id,
        partyRole: "client",
        status: QcpApprovalTokenStatus.PENDING,
      },
      { status: QcpApprovalTokenStatus.SUPERSEDED },
    );

    const newToken = randomBytes(32).toString("hex");
    const expiresAt = now().plus({ days: 14 }).toJSDate();

    const clientToken = this.tokenRepo.create({
      companyId: mpsToken.companyId,
      controlPlanId: plan.id,
      controlPlanVersion: plan.version,
      partyRole: "client" as QcpPartyRole,
      recipientEmail: clientEmail,
      recipientName: clientName,
      token: newToken,
      tokenExpiresAt: expiresAt,
      activitiesSnapshot: plan.activities,
      sentByParty: "mps",
    });

    const saved = await this.tokenRepo.save(clientToken);

    await this.planRepo.update(plan.id, {
      approvalStatus: "pending_client",
    });

    const company = await this.companyRepo.findOne({ where: { id: mpsToken.companyId } });
    const companyName = company?.name || "Stock Control";
    const baseUrl = this.frontendBaseUrl();
    const reviewUrl = `${baseUrl}/stock-control/qcp-review/${newToken}`;

    await this.emailService.sendEmail(mpsToken.companyId, {
      to: clientEmail,
      subject: `QCP Review Request (Client) - ${plan.qcpNumber || `QCP #${plan.id}`}`,
      html: this.reviewRequestEmailHtml(companyName, plan, reviewUrl, "client"),
      text: `You have been requested to review QCP ${plan.qcpNumber || plan.id} as client. Review link: ${reviewUrl}`,
    });

    this.logger.log(
      `QCP client token sent to ${clientEmail} for plan ${plan.id} (forwarded by MPS)`,
    );

    return saved;
  }

  async finalizeClientApproval(tokenStr: string): Promise<{ success: boolean }> {
    const clientToken = await this.tokenRepo.findOne({ where: { token: tokenStr } });
    if (!clientToken) {
      throw new NotFoundException("Review link not found");
    }
    if (clientToken.partyRole !== "client" && clientToken.partyRole !== "mps") {
      throw new ForbiddenException("Only customer or client tokens can finalize approval");
    }
    if (clientToken.status !== QcpApprovalTokenStatus.APPROVED) {
      throw new BadRequestException("Must approve before finalizing");
    }

    const plan = await this.planRepo.findOne({
      where: { id: clientToken.controlPlanId, companyId: clientToken.companyId },
    });
    if (!plan) {
      throw new NotFoundException("Control plan not found");
    }

    const downstreamRoles =
      clientToken.partyRole === "mps" ? ["client", "third_party"] : ["third_party"];
    await Promise.all(
      downstreamRoles.map((role) =>
        this.tokenRepo.update(
          {
            controlPlanId: plan.id,
            partyRole: role as "client" | "third_party",
            status: QcpApprovalTokenStatus.PENDING,
          },
          { status: QcpApprovalTokenStatus.SUPERSEDED },
        ),
      ),
    );

    await this.planRepo.update(plan.id, { approvalStatus: "approved" });

    const company = await this.companyRepo.findOne({ where: { id: clientToken.companyId } });
    const qamEmail = company?.notificationEmails?.[0] || null;
    const mpsRecipients = await this.priorTokenRecipients(plan.id, ["mps"]);
    const recipients = Array.from(
      new Set([qamEmail, ...mpsRecipients].filter((e): e is string => !!e)),
    );

    await Promise.all(
      recipients.map((to) =>
        this.emailService.sendEmail(clientToken.companyId, {
          to,
          subject: `QCP Fully Approved - ${plan.qcpNumber || `QCP #${plan.id}`}`,
          html: `<p>QCP <strong>${plan.qcpNumber || plan.id}</strong> has been fully approved. The ${clientToken.partyRole === "mps" ? "customer" : "client"} has signed off and elected not to send for further review.</p>`,
          text: `QCP ${plan.qcpNumber || plan.id} has been fully approved (${clientToken.partyRole === "mps" ? "customer" : "client"} declined further review).`,
        }),
      ),
    );

    this.logger.log(`QCP ${plan.id} finalized by ${clientToken.partyRole} (no further review)`);
    return { success: true };
  }

  async forwardToThirdParty(
    tokenStr: string,
    thirdPartyEmail: string,
    thirdPartyName: string | null,
  ): Promise<QcpApprovalToken> {
    const clientToken = await this.tokenRepo.findOne({ where: { token: tokenStr } });
    if (!clientToken) {
      throw new NotFoundException("Review link not found");
    }

    if (clientToken.status !== QcpApprovalTokenStatus.APPROVED) {
      throw new BadRequestException("Client must approve before forwarding to 3rd party");
    }

    if (clientToken.partyRole !== "client") {
      throw new ForbiddenException("Only client tokens can forward to 3rd party");
    }

    const plan = await this.planRepo.findOne({
      where: { id: clientToken.controlPlanId, companyId: clientToken.companyId },
    });
    if (!plan) {
      throw new NotFoundException("Control plan not found");
    }

    await this.tokenRepo.update(
      {
        controlPlanId: plan.id,
        partyRole: "third_party",
        status: QcpApprovalTokenStatus.PENDING,
      },
      { status: QcpApprovalTokenStatus.SUPERSEDED },
    );

    const newToken = randomBytes(32).toString("hex");
    const expiresAt = now().plus({ days: 14 }).toJSDate();

    const tpToken = this.tokenRepo.create({
      companyId: clientToken.companyId,
      controlPlanId: plan.id,
      controlPlanVersion: plan.version,
      partyRole: "third_party" as QcpPartyRole,
      recipientEmail: thirdPartyEmail,
      recipientName: thirdPartyName,
      token: newToken,
      tokenExpiresAt: expiresAt,
      activitiesSnapshot: plan.activities,
      sentByParty: "client",
    });

    const saved = await this.tokenRepo.save(tpToken);

    const updatedParties = [
      ...(plan.activeParties || ["pls", "mps", "client"]),
      "thirdParty",
    ].filter((v, i, a) => a.indexOf(v) === i);
    await this.planRepo.update(plan.id, {
      approvalStatus: "pending_third_party",
      thirdPartyEmail,
      activeParties: updatedParties,
    });

    const company = await this.companyRepo.findOne({ where: { id: clientToken.companyId } });
    const companyName = company?.name || "Stock Control";
    const baseUrl = this.frontendBaseUrl();
    const reviewUrl = `${baseUrl}/stock-control/qcp-review/${newToken}`;

    const emailSent = await this.emailService.sendEmail(clientToken.companyId, {
      to: thirdPartyEmail,
      subject: `QCP Review Request (3rd Party) - ${plan.qcpNumber || `QCP #${plan.id}`}`,
      html: this.reviewRequestEmailHtml(companyName, plan, reviewUrl, "third_party"),
      text: `You have been requested to review QCP ${plan.qcpNumber || plan.id} as 3rd party. Review link: ${reviewUrl}`,
    });

    if (!emailSent) {
      this.logger.error(
        `QCP 3rd party email FAILED to send to ${thirdPartyEmail} for plan ${plan.id} - rolling back token`,
      );
      await this.tokenRepo.delete(saved.id);
      await this.planRepo.update(plan.id, {
        approvalStatus: "pending_client",
        thirdPartyEmail: null,
        activeParties: plan.activeParties || ["pls", "mps", "client"],
      });
      throw new BadRequestException(
        `Email delivery to ${thirdPartyEmail} failed. Check SMTP configuration under Stock Control Settings, then try again.`,
      );
    }

    this.logger.log(
      `QCP 3rd party token sent to ${thirdPartyEmail} for plan ${plan.id} (forwarded by client)`,
    );

    return saved;
  }

  async clientPreferences(
    companyId: number,
    customerName: string,
    planType?: string,
  ): Promise<{
    email: string | null;
    preferences: Array<{ planType: string; interventionDefaults: Record<number, string> | null }>;
  }> {
    const prefs = await this.prefRepo.find({
      where: planType ? { companyId, customerName, planType } : { companyId, customerName },
    });

    const email = prefs.find((p) => p.customerEmail)?.customerEmail || null;

    return {
      email,
      preferences: prefs.map((p) => ({
        planType: p.planType,
        interventionDefaults: p.interventionDefaults,
      })),
    };
  }

  async cancelApproval(companyId: number, planId: number): Promise<{ cancelled: boolean }> {
    const plan = await this.planRepo.findOne({ where: { id: planId, companyId } });
    if (!plan) {
      throw new NotFoundException("Control plan not found");
    }

    await this.tokenRepo.update(
      { controlPlanId: planId, status: QcpApprovalTokenStatus.PENDING },
      { status: QcpApprovalTokenStatus.SUPERSEDED },
    );

    await this.planRepo.update(planId, { approvalStatus: "draft" });

    return { cancelled: true };
  }

  async resendApproval(
    companyId: number,
    planId: number,
    partyRole: QcpPartyRole,
    user: { id: number; name: string },
  ): Promise<QcpApprovalToken> {
    const plan = await this.planRepo.findOne({ where: { id: planId, companyId } });
    if (!plan) {
      throw new NotFoundException("Control plan not found");
    }

    const email =
      partyRole === "mps"
        ? plan.clientEmail
        : partyRole === "client"
          ? plan.clientEmail
          : plan.thirdPartyEmail;
    if (!email) {
      throw new BadRequestException(`No ${partyRole} email set on this plan`);
    }

    await this.tokenRepo.update(
      { controlPlanId: planId, partyRole, status: QcpApprovalTokenStatus.PENDING },
      { status: QcpApprovalTokenStatus.SUPERSEDED },
    );

    const token = randomBytes(32).toString("hex");
    const expiresAt = now().plus({ days: 14 }).toJSDate();

    const approvalToken = this.tokenRepo.create({
      companyId,
      controlPlanId: planId,
      controlPlanVersion: plan.version,
      partyRole,
      recipientEmail: email,
      recipientName: null,
      token,
      tokenExpiresAt: expiresAt,
      activitiesSnapshot: plan.activities,
      sentByParty: null,
    });

    const saved = await this.tokenRepo.save(approvalToken);

    const statusMap: Record<string, string> = {
      mps: "pending_mps",
      client: "pending_client",
      third_party: "pending_third_party",
    };
    await this.planRepo.update(planId, { approvalStatus: statusMap[partyRole] });

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const companyName = company?.name || "Stock Control";
    const baseUrl = this.frontendBaseUrl();
    const reviewUrl = `${baseUrl}/stock-control/qcp-review/${token}`;

    await this.emailService.sendEmail(companyId, {
      to: email,
      subject:
        `QCP Review Request - ${plan.qcpNumber || `QCP #${plan.id}`} - ${plan.jobName || ""}`.trim(),
      html: this.reviewRequestEmailHtml(companyName, plan, reviewUrl, partyRole),
      text: `You have been requested to review QCP ${plan.qcpNumber || plan.id}. Review link: ${reviewUrl}`,
    });

    this.logger.log(`QCP approval re-sent to ${email} for plan ${planId} by ${user.name}`);

    return saved;
  }

  async approvalHistory(companyId: number, planId: number): Promise<QcpApprovalToken[]> {
    return this.tokenRepo.find({
      where: { controlPlanId: planId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  private async upsertCustomerEmail(
    companyId: number,
    customerName: string,
    email: string,
  ): Promise<void> {
    const existing = await this.prefRepo.findOne({
      where: { companyId, customerName },
    });

    if (existing) {
      await this.prefRepo.update(existing.id, { customerEmail: email });
    } else {
      await this.prefRepo.save(
        this.prefRepo.create({
          companyId,
          customerName,
          customerEmail: email,
          planType: "paint_external",
          interventionDefaults: null,
        }),
      );
    }
  }

  private frontendBaseUrl(): string {
    const envUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN;
    if (envUrl) return envUrl.replace(/\/$/, "");
    return "https://annix.co.za";
  }

  private reviewRequestEmailHtml(
    companyName: string,
    plan: QcControlPlan,
    reviewUrl: string,
    role: QcpPartyRole,
  ): string {
    const roleLabelLookup: Record<string, string> = {
      mps: "Customer",
      client: "Client",
      third_party: "3rd Party",
    };
    const roleLabel = roleLabelLookup[role] || "Client";
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #0d9488;">QCP Review Request</h2>
        <p>You have been invited by <strong>${companyName}</strong> to review the following Quality Control Plan as <strong>${roleLabel}</strong>:</p>
        <table style="margin: 16px 0; border-collapse: collapse;">
          <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">QCP Number:</td><td>${plan.qcpNumber || `QCP #${plan.id}`}</td></tr>
          ${plan.jobName ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Job:</td><td>${plan.jobName}</td></tr>` : ""}
          ${plan.customerName ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Customer:</td><td>${plan.customerName}</td></tr>` : ""}
          <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Revision:</td><td>${plan.revision || "01"}</td></tr>
        </table>
        <p>Please click the button below to review the plan, fill in your intervention types, and approve or request changes:</p>
        <a href="${reviewUrl}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">
          Review QCP
        </a>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">This link expires in 14 days. If you have questions, please contact ${companyName} directly.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Sent from ${companyName} via Annix Stock Control</p>
      </div>
    `;
  }
}
