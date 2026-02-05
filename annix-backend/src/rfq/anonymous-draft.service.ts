import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AnonymousDraft } from './entities/anonymous-draft.entity';
import {
  SaveAnonymousDraftDto,
  AnonymousDraftResponseDto,
  AnonymousDraftFullResponseDto,
  RecoveryEmailResponseDto,
} from './dto/anonymous-draft.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AnonymousDraftService {
  private readonly logger = new Logger(AnonymousDraftService.name);
  private readonly DRAFT_EXPIRY_DAYS = 7;

  constructor(
    @InjectRepository(AnonymousDraft)
    private readonly anonymousDraftRepo: Repository<AnonymousDraft>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private generateRecoveryToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private calculateExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.DRAFT_EXPIRY_DAYS);
    return expiryDate;
  }

  async saveDraft(dto: SaveAnonymousDraftDto): Promise<AnonymousDraftResponseDto> {
    this.logger.log(`Saving anonymous draft for ${dto.customerEmail}`);
    this.logger.log(`Received formData keys: ${dto.formData ? Object.keys(dto.formData).join(', ') : 'null'}`);
    this.logger.log(`Received entries count: ${dto.entries?.length || 0}`);
    this.logger.log(`Received globalSpecs keys: ${dto.globalSpecs ? Object.keys(dto.globalSpecs).join(', ') : 'null'}`);

    let draft: AnonymousDraft | null = null;

    if (dto.customerEmail) {
      draft = await this.anonymousDraftRepo.findOne({
        where: {
          customerEmail: dto.customerEmail,
          isClaimed: false,
        },
        order: { createdAt: 'DESC' },
      });
    }

    if (draft) {
      draft.currentStep = dto.currentStep;
      draft.formData = dto.formData;
      draft.globalSpecs = dto.globalSpecs;
      draft.requiredProducts = dto.requiredProducts;
      draft.entries = dto.entries;
      draft.projectName = dto.projectName;
      draft.expiresAt = this.calculateExpiryDate();

      if (dto.browserFingerprint) {
        draft.browserFingerprint = dto.browserFingerprint;
      }

      await this.anonymousDraftRepo.save(draft);
      this.logger.log(`Updated anonymous draft ${draft.id} for ${dto.customerEmail}`);
    } else {
      draft = this.anonymousDraftRepo.create({
        recoveryToken: this.generateRecoveryToken(),
        customerEmail: dto.customerEmail,
        projectName: dto.projectName,
        currentStep: dto.currentStep,
        formData: dto.formData,
        globalSpecs: dto.globalSpecs,
        requiredProducts: dto.requiredProducts,
        entries: dto.entries,
        browserFingerprint: dto.browserFingerprint,
        expiresAt: this.calculateExpiryDate(),
      });

      await this.anonymousDraftRepo.save(draft);
      this.logger.log(`Created new anonymous draft ${draft.id} for ${dto.customerEmail || 'unknown email'}`);
    }

    return this.mapToResponse(draft);
  }

  async getDraftByToken(token: string): Promise<AnonymousDraftFullResponseDto> {
    this.logger.log(`Getting draft by token: ${token.substring(0, 8)}...`);
    const draft = await this.anonymousDraftRepo.findOne({
      where: { recoveryToken: token },
    });

    if (!draft) {
      this.logger.warn(`Draft not found for token: ${token.substring(0, 8)}...`);
      throw new NotFoundException('Draft not found');
    }

    this.logger.log(`Found draft ${draft.id} for ${draft.customerEmail}`);
    this.logger.log(`Draft formData keys: ${draft.formData ? Object.keys(draft.formData).join(', ') : 'null'}`);
    this.logger.log(`Draft entries count: ${draft.entries?.length || 0}`);
    this.logger.log(`Draft globalSpecs keys: ${draft.globalSpecs ? Object.keys(draft.globalSpecs).join(', ') : 'null'}`);

    if (new Date() > draft.expiresAt) {
      throw new NotFoundException('Draft has expired');
    }

    if (draft.isClaimed) {
      throw new BadRequestException('This draft has already been claimed by a registered user');
    }

    return this.mapToFullResponse(draft);
  }

  async sendRecoveryEmail(customerEmail: string): Promise<RecoveryEmailResponseDto> {
    const draft = await this.anonymousDraftRepo.findOne({
      where: {
        customerEmail,
        isClaimed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!draft) {
      return {
        message: 'If a draft exists for this email, a recovery link has been sent.',
        draftFound: false,
      };
    }

    if (new Date() > draft.expiresAt) {
      return {
        message: 'If a draft exists for this email, a recovery link has been sent.',
        draftFound: false,
      };
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const recoveryLink = `${frontendUrl}/rfq?recover=${draft.recoveryToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Annix RFQ - Your Progress Has Been Saved</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to the Annix RFQ App</h1>
          <p>Thank you for starting a Request for Quotation${draft.projectName ? ` for "${draft.projectName}"` : ''} with Annix.</p>

          <p>This is a confirmation that your RFQ progress has been saved. Each time you click <strong>Save Progress</strong>, an email will be sent to you so you can resume from that point directly.</p>

          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Your RFQ Details:</strong>
            <p style="margin: 5px 0 0 0;">
              ${draft.projectName ? `<strong>Project:</strong> ${draft.projectName}<br/>` : ''}
              <strong>Progress:</strong> Step ${draft.currentStep} of 5<br/>
              <strong>Last Saved:</strong> ${draft.updatedAt.toLocaleDateString()}
            </p>
          </div>

          <p style="margin: 30px 0;">
            <a href="${recoveryLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Continue Your RFQ
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${recoveryLink}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in ${this.DRAFT_EXPIRY_DAYS} days.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you did not start this RFQ, please ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to the Annix RFQ App

      Thank you for starting a Request for Quotation${draft.projectName ? ` for "${draft.projectName}"` : ''} with Annix.

      This is a confirmation that your RFQ progress has been saved. Each time you click Save Progress, an email will be sent to you so you can resume from that point directly.

      Your RFQ Details:
      Project: ${draft.projectName || 'Unnamed'}
      Progress: Step ${draft.currentStep} of 5
      Last Saved: ${draft.updatedAt.toLocaleDateString()}

      Click here to continue: ${recoveryLink}

      This link will expire in ${this.DRAFT_EXPIRY_DAYS} days.

      If you did not start this RFQ, please ignore this email.
    `;

    await this.emailService.sendEmail({
      to: customerEmail,
      subject: 'Welcome to Annix RFQ - Your Progress Has Been Saved',
      html,
      text,
    });

    draft.recoveryEmailSent = true;
    draft.recoveryEmailSentAt = new Date();
    await this.anonymousDraftRepo.save(draft);

    this.logger.log(`Sent recovery email to ${customerEmail} for draft ${draft.id}`);

    return {
      message: 'If a draft exists for this email, a recovery link has been sent.',
      draftFound: true,
    };
  }

  async claimDraft(token: string, userId: number): Promise<{ message: string; draftId: number }> {
    const draft = await this.anonymousDraftRepo.findOne({
      where: { recoveryToken: token },
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.isClaimed) {
      throw new BadRequestException('This draft has already been claimed');
    }

    draft.isClaimed = true;
    draft.claimedByUserId = userId;
    await this.anonymousDraftRepo.save(draft);

    this.logger.log(`Draft ${draft.id} claimed by user ${userId}`);

    return {
      message: 'Draft claimed successfully',
      draftId: draft.id,
    };
  }

  async cleanupExpiredDrafts(): Promise<number> {
    const result = await this.anonymousDraftRepo.delete({
      expiresAt: LessThan(new Date()),
    });

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired anonymous drafts`);
    }

    return deletedCount;
  }

  private mapToResponse(draft: AnonymousDraft): AnonymousDraftResponseDto {
    return {
      id: draft.id,
      recoveryToken: draft.recoveryToken,
      customerEmail: draft.customerEmail,
      projectName: draft.projectName,
      currentStep: draft.currentStep,
      expiresAt: draft.expiresAt,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  private mapToFullResponse(draft: AnonymousDraft): AnonymousDraftFullResponseDto {
    return {
      ...this.mapToResponse(draft),
      formData: draft.formData,
      globalSpecs: draft.globalSpecs,
      requiredProducts: draft.requiredProducts,
      entries: draft.entries,
    };
  }
}
