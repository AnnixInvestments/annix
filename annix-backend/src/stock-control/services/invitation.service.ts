import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import {
  StockControlInvitation,
  StockControlInvitationStatus,
} from "../entities/stock-control-invitation.entity";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { StockControlInvitationRepository } from "../repositories/stock-control-invitation.repository";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class StockControlInvitationService {
  private readonly logger = new Logger(StockControlInvitationService.name);

  constructor(
    private readonly invitationRepo: StockControlInvitationRepository,
    private readonly userRepo: StockControlUserRepository,
    private readonly companyRepo: StockControlCompanyRepository,
    private readonly emailService: EmailService,
  ) {}

  async create(
    companyId: number,
    invitedById: number,
    email: string,
    role: string,
  ): Promise<StockControlInvitation> {
    const existingUser = await this.userRepo.findOneByEmailAndCompany(email, companyId);
    if (existingUser) {
      throw new ConflictException("User is already a member of this company");
    }

    const existingPending = await this.invitationRepo.findOnePendingForCompanyByEmail(
      companyId,
      email,
    );
    if (existingPending) {
      throw new ConflictException("An invitation is already pending for this email");
    }

    const token = uuidv4();
    const expiresAt = now().plus({ days: INVITATION_EXPIRY_DAYS }).toJSDate();

    const saved = await this.invitationRepo.create({
      companyId,
      invitedById,
      email,
      token,
      role,
      status: StockControlInvitationStatus.PENDING,
      expiresAt,
    });

    const company = await this.companyRepo.findById(companyId);
    const inviter = await this.userRepo.findOneForCompany(invitedById, companyId);

    await this.emailService.sendStockControlInvitationEmail(
      email,
      token,
      company?.name ?? "Your company",
      inviter?.name ?? "A team member",
      role,
    );

    this.logger.log(`Invitation created for ${email} to company ${companyId}`);
    return saved;
  }

  async findByCompany(companyId: number): Promise<StockControlInvitation[]> {
    const pending = await this.invitationRepo.findPendingForCompanyWithInviter(companyId);

    if (pending.length === 0) {
      return [];
    }

    const pendingEmails = pending.map((inv) => inv.email.toLowerCase());
    const matchingUsers = await Promise.all(
      pendingEmails.map((email) => this.userRepo.findOneByEmail(email)),
    );

    const resolvedInvitationIds = new Set<number>();

    await Promise.all(
      pending.map(async (inv, index) => {
        const existingUser = matchingUsers[index];
        if (!existingUser) return;

        if (existingUser.companyId !== companyId) {
          const previousCompanyId = existingUser.companyId;
          existingUser.companyId = companyId;
          existingUser.role = inv.role;
          await this.userRepo.saveForCompany(companyId, existingUser);
          this.logger.log(
            `Moved user ${existingUser.email} from company ${previousCompanyId} to ${companyId}`,
          );
        }

        inv.status = StockControlInvitationStatus.ACCEPTED;
        inv.acceptedAt = now().toJSDate();
        await this.invitationRepo.saveForCompany(companyId, inv);
        resolvedInvitationIds.add(inv.id);
      }),
    );

    return pending.filter((inv) => !resolvedInvitationIds.has(inv.id));
  }

  async findByToken(token: string): Promise<StockControlInvitation | null> {
    const invitation = await this.invitationRepo.findOneByTokenWithCompany(token);

    if (
      invitation &&
      invitation.status === StockControlInvitationStatus.PENDING &&
      now().toJSDate() > invitation.expiresAt
    ) {
      invitation.status = StockControlInvitationStatus.EXPIRED;
      await this.invitationRepo.saveForCompany(invitation.companyId, invitation);
    }

    return invitation;
  }

  async cancel(companyId: number, invitationId: number): Promise<void> {
    const invitation = await this.invitationRepo.findOneForCompany(invitationId, companyId);
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== StockControlInvitationStatus.PENDING) {
      throw new ConflictException(`Cannot cancel ${invitation.status} invitation`);
    }

    invitation.status = StockControlInvitationStatus.CANCELLED;
    await this.invitationRepo.saveForCompany(companyId, invitation);
    this.logger.log(`Invitation cancelled: ${invitation.email}`);
  }

  async resend(companyId: number, invitationId: number): Promise<StockControlInvitation> {
    const invitation = await this.invitationRepo.findOneForCompanyWithInviter(
      invitationId,
      companyId,
    );
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== StockControlInvitationStatus.PENDING) {
      throw new ConflictException(`Cannot resend ${invitation.status} invitation`);
    }

    invitation.token = uuidv4();
    invitation.expiresAt = now().plus({ days: INVITATION_EXPIRY_DAYS }).toJSDate();

    const saved = await this.invitationRepo.saveForCompany(companyId, invitation);

    const company = await this.companyRepo.findById(companyId);

    await this.emailService.sendStockControlInvitationEmail(
      invitation.email,
      saved.token,
      company?.name ?? "Your company",
      invitation.invitedBy?.name ?? "A team member",
      invitation.role,
    );

    this.logger.log(`Invitation resent: ${invitation.email}`);
    return saved;
  }
}
