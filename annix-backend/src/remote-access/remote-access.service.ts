import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { now, DateTime } from '../lib/datetime';

import {
  RemoteAccessRequest,
  RemoteAccessRequestType,
  RemoteAccessDocumentType,
  RemoteAccessStatus,
} from './entities/remote-access-request.entity';
import { User } from '../user/entities/user.entity';
import { RfqDraft } from '../rfq/entities/rfq-draft.entity';
import { EmailService } from '../email/email.service';
import {
  CreateRemoteAccessRequestDto,
  RespondToAccessRequestDto,
  RemoteAccessRequestResponseDto,
  PendingAccessRequestsResponseDto,
  AccessStatusResponseDto,
} from './dto/remote-access.dto';

@Injectable()
export class RemoteAccessService {
  private readonly logger = new Logger(RemoteAccessService.name);
  private readonly accessExpiryHours = 24;

  constructor(
    @InjectRepository(RemoteAccessRequest)
    private readonly accessRequestRepo: Repository<RemoteAccessRequest>,
    @InjectRepository(RfqDraft)
    private readonly rfqDraftRepo: Repository<RfqDraft>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  isFeatureEnabled(): boolean {
    return this.configService.get('ENABLE_REMOTE_ACCESS') === 'true';
  }

  async requestAccess(
    adminId: number,
    dto: CreateRemoteAccessRequestDto,
  ): Promise<RemoteAccessRequestResponseDto> {
    if (!this.isFeatureEnabled()) {
      throw new BadRequestException('Remote access feature is disabled');
    }

    const admin = await this.userRepo.findOne({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    const documentOwner = await this.findDocumentOwner(dto.documentType, dto.documentId);
    if (!documentOwner) {
      throw new NotFoundException('Document owner not found');
    }

    const existingRequest = await this.accessRequestRepo.findOne({
      where: {
        requestedBy: { id: adminId },
        documentType: dto.documentType,
        documentId: dto.documentId,
        status: RemoteAccessStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException('A pending access request already exists for this document');
    }

    const existingApproval = await this.accessRequestRepo.findOne({
      where: {
        requestedBy: { id: adminId },
        documentType: dto.documentType,
        documentId: dto.documentId,
        status: RemoteAccessStatus.APPROVED,
        expiresAt: MoreThan(now().toJSDate()),
      },
    });

    if (existingApproval) {
      return this.mapToResponse(existingApproval);
    }

    const expiresAt = now().plus({ hours: this.accessExpiryHours }).toJSDate();

    const request = this.accessRequestRepo.create({
      requestType: dto.requestType,
      documentType: dto.documentType,
      documentId: dto.documentId,
      requestedBy: admin,
      documentOwner,
      message: dto.message || null,
      expiresAt,
      status: RemoteAccessStatus.PENDING,
    });

    const savedRequest = await this.accessRequestRepo.save(request);

    await this.sendAccessRequestEmail(savedRequest);

    this.logger.log(
      `Admin ${adminId} requested ${dto.requestType} access to ${dto.documentType} ${dto.documentId}`,
    );

    return this.mapToResponse(savedRequest);
  }

  async checkAccessStatus(
    adminId: number,
    documentType: RemoteAccessDocumentType,
    documentId: number,
  ): Promise<AccessStatusResponseDto> {
    if (!this.isFeatureEnabled()) {
      return {
        hasAccess: true,
        status: RemoteAccessStatus.APPROVED,
      };
    }

    const approvedRequest = await this.accessRequestRepo.findOne({
      where: {
        requestedBy: { id: adminId },
        documentType,
        documentId,
        status: RemoteAccessStatus.APPROVED,
        expiresAt: MoreThan(now().toJSDate()),
      },
    });

    if (approvedRequest) {
      return {
        hasAccess: true,
        status: RemoteAccessStatus.APPROVED,
        requestId: approvedRequest.id,
        expiresAt: approvedRequest.expiresAt,
      };
    }

    const pendingRequest = await this.accessRequestRepo.findOne({
      where: {
        requestedBy: { id: adminId },
        documentType,
        documentId,
        status: RemoteAccessStatus.PENDING,
        expiresAt: MoreThan(now().toJSDate()),
      },
    });

    if (pendingRequest) {
      return {
        hasAccess: false,
        status: RemoteAccessStatus.PENDING,
        requestId: pendingRequest.id,
        expiresAt: pendingRequest.expiresAt,
        message: pendingRequest.message || undefined,
      };
    }

    return {
      hasAccess: false,
      status: RemoteAccessStatus.EXPIRED,
    };
  }

  async requestStatus(requestId: number): Promise<RemoteAccessRequestResponseDto> {
    const request = await this.accessRequestRepo.findOne({
      where: { id: requestId },
      relations: ['requestedBy', 'documentOwner'],
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    return this.mapToResponse(request);
  }

  async pendingRequestsForOwner(ownerId: number): Promise<PendingAccessRequestsResponseDto> {
    const requests = await this.accessRequestRepo.find({
      where: {
        documentOwner: { id: ownerId },
        status: RemoteAccessStatus.PENDING,
        expiresAt: MoreThan(now().toJSDate()),
      },
      relations: ['requestedBy', 'documentOwner'],
      order: { requestedAt: 'DESC' },
    });

    return {
      requests: requests.map((r) => this.mapToResponse(r)),
      count: requests.length,
    };
  }

  async respondToRequest(
    ownerId: number,
    requestId: number,
    dto: RespondToAccessRequestDto,
  ): Promise<RemoteAccessRequestResponseDto> {
    const request = await this.accessRequestRepo.findOne({
      where: { id: requestId },
      relations: ['requestedBy', 'documentOwner'],
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (request.documentOwner.id !== ownerId) {
      throw new ForbiddenException('You are not the owner of this document');
    }

    if (request.status !== RemoteAccessStatus.PENDING) {
      throw new BadRequestException('This request has already been responded to');
    }

    if (request.expiresAt < now().toJSDate()) {
      request.status = RemoteAccessStatus.EXPIRED;
      await this.accessRequestRepo.save(request);
      throw new BadRequestException('This request has expired');
    }

    if (dto.approved) {
      request.status = RemoteAccessStatus.APPROVED;
      request.expiresAt = now().plus({ hours: this.accessExpiryHours }).toJSDate();
    } else {
      request.status = RemoteAccessStatus.DENIED;
      request.denialReason = dto.denialReason || null;
    }

    request.respondedAt = now().toJSDate();
    const savedRequest = await this.accessRequestRepo.save(request);

    this.logger.log(
      `Owner ${ownerId} ${dto.approved ? 'approved' : 'denied'} access request ${requestId}`,
    );

    return this.mapToResponse(savedRequest);
  }

  async cleanupExpiredRequests(): Promise<void> {
    const result = await this.accessRequestRepo.update(
      {
        status: RemoteAccessStatus.PENDING,
        expiresAt: LessThan(now().toJSDate()),
      },
      { status: RemoteAccessStatus.EXPIRED },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} expired access requests`);
    }
  }

  private async findDocumentOwner(
    documentType: RemoteAccessDocumentType,
    documentId: number,
  ): Promise<User | null> {
    if (documentType === RemoteAccessDocumentType.RFQ) {
      const draft = await this.rfqDraftRepo.findOne({
        where: { id: documentId },
        relations: ['createdBy'],
      });
      return draft?.createdBy || null;
    }

    return null;
  }

  private async sendAccessRequestEmail(request: RemoteAccessRequest): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const portalLink = `${frontendUrl}/customer/portal/remote-access`;

    const adminName =
      request.requestedBy.firstName && request.requestedBy.lastName
        ? `${request.requestedBy.firstName} ${request.requestedBy.lastName}`
        : request.requestedBy.username || request.requestedBy.email;

    const documentName = await this.documentName(request.documentType, request.documentId);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Remote Access Request - Annix</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Remote Access Request</h1>
          <p>An administrator has requested access to one of your documents.</p>

          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <strong>Request Details:</strong>
            <p style="margin: 5px 0 0 0;">
              <strong>Administrator:</strong> ${adminName}<br/>
              <strong>Document:</strong> ${documentName}<br/>
              <strong>Access Type:</strong> ${request.requestType}<br/>
              <strong>Expires:</strong> ${DateTime.fromJSDate(request.expiresAt).toFormat('dd MMM yyyy HH:mm')}
            </p>
          </div>

          ${
            request.message
              ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
            <strong>Message from Administrator:</strong>
            <p style="margin: 5px 0 0 0;">${request.message}</p>
          </div>
          `
              : ''
          }

          <p style="margin: 30px 0;">
            <a href="${portalLink}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Request
            </a>
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This request will expire in ${this.accessExpiryHours} hours if not responded to.
          </p>
        </div>
      </body>
      </html>
    `;

    await this.emailService.sendEmail({
      to: request.documentOwner.email,
      subject: `Remote Access Request: ${documentName} - Annix`,
      html,
    });
  }

  private async documentName(
    documentType: RemoteAccessDocumentType,
    documentId: number,
  ): Promise<string> {
    if (documentType === RemoteAccessDocumentType.RFQ) {
      const draft = await this.rfqDraftRepo.findOne({ where: { id: documentId } });
      return draft?.projectName || draft?.draftNumber || `RFQ #${documentId}`;
    }
    return `${documentType} #${documentId}`;
  }

  private mapToResponse(request: RemoteAccessRequest): RemoteAccessRequestResponseDto {
    return {
      id: request.id,
      requestType: request.requestType,
      documentType: request.documentType,
      documentId: request.documentId,
      status: request.status,
      message: request.message || undefined,
      requestedAt: request.requestedAt,
      expiresAt: request.expiresAt,
      respondedAt: request.respondedAt || undefined,
      requestedBy: request.requestedBy
        ? {
            id: request.requestedBy.id,
            name:
              request.requestedBy.firstName && request.requestedBy.lastName
                ? `${request.requestedBy.firstName} ${request.requestedBy.lastName}`
                : request.requestedBy.username || '',
            email: request.requestedBy.email,
          }
        : undefined,
      documentOwner: request.documentOwner
        ? {
            id: request.documentOwner.id,
            name:
              request.documentOwner.firstName && request.documentOwner.lastName
                ? `${request.documentOwner.firstName} ${request.documentOwner.lastName}`
                : request.documentOwner.username || '',
            email: request.documentOwner.email,
          }
        : undefined,
    };
  }
}
