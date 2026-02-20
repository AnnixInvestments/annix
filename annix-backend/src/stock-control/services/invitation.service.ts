import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockControlInvitation, StockControlInvitationStatus } from "../entities/stock-control-invitation.entity";
import { StockControlUser } from "../entities/stock-control-user.entity";

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class StockControlInvitationService {
  private readonly logger = new Logger(StockControlInvitationService.name);

  constructor(
    @InjectRepository(StockControlInvitation)
    private readonly invitationRepo: Repository<StockControlInvitation>,
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    private readonly emailService: EmailService,
  ) {}

  async create(companyId: number, invitedById: number, email: string, role: string): Promise<StockControlInvitation> {
    const existingUser = await this.userRepo.findOne({ where: { email, companyId } });
    if (existingUser) {
      throw new ConflictException("User is already a member of this company");
    }

    const existingPending = await this.invitationRepo.findOne({
      where: { companyId, email, status: StockControlInvitationStatus.PENDING },
    });
    if (existingPending) {
      throw new ConflictException("An invitation is already pending for this email");
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = this.invitationRepo.create({
      companyId,
      invitedById,
      email,
      token,
      role,
      status: StockControlInvitationStatus.PENDING,
      expiresAt,
    });

    const saved = await this.invitationRepo.save(invitation);

    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const inviter = await this.userRepo.findOne({ where: { id: invitedById } });

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
    return this.invitationRepo.find({
      where: { companyId, status: StockControlInvitationStatus.PENDING },
      relations: ["invitedBy"],
      order: { createdAt: "DESC" },
    });
  }

  async findByToken(token: string): Promise<StockControlInvitation | null> {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
      relations: ["company"],
    });

    if (invitation && invitation.status === StockControlInvitationStatus.PENDING && new Date() > invitation.expiresAt) {
      invitation.status = StockControlInvitationStatus.EXPIRED;
      await this.invitationRepo.save(invitation);
    }

    return invitation;
  }

  async cancel(companyId: number, invitationId: number): Promise<void> {
    const invitation = await this.invitationRepo.findOne({ where: { id: invitationId, companyId } });
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== StockControlInvitationStatus.PENDING) {
      throw new ConflictException(`Cannot cancel ${invitation.status} invitation`);
    }

    invitation.status = StockControlInvitationStatus.CANCELLED;
    await this.invitationRepo.save(invitation);
    this.logger.log(`Invitation cancelled: ${invitation.email}`);
  }

  async resend(companyId: number, invitationId: number): Promise<StockControlInvitation> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, companyId },
      relations: ["invitedBy"],
    });
    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== StockControlInvitationStatus.PENDING) {
      throw new ConflictException(`Cannot resend ${invitation.status} invitation`);
    }

    invitation.token = uuidv4();
    invitation.expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const saved = await this.invitationRepo.save(invitation);

    const company = await this.companyRepo.findOne({ where: { id: companyId } });

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
