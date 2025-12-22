import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  CustomerProfile,
  CustomerCompany,
  CustomerPreferredSupplier,
  SupplierInvitation,
  CustomerRole,
} from './entities';
import { SupplierInvitationStatus } from './entities/supplier-invitation.entity';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class CustomerSupplierService {
  constructor(
    @InjectRepository(CustomerPreferredSupplier)
    private readonly preferredSupplierRepo: Repository<CustomerPreferredSupplier>,
    @InjectRepository(SupplierInvitation)
    private readonly invitationRepo: Repository<SupplierInvitation>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerCompany)
    private readonly companyRepo: Repository<CustomerCompany>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepo: Repository<SupplierProfile>,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  // Preferential Suppliers

  async getPreferredSuppliers(customerId: number) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['company'],
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    const suppliers = await this.preferredSupplierRepo.find({
      where: { customerCompanyId: profile.companyId, isActive: true },
      relations: ['supplierProfile', 'supplierProfile.company', 'addedBy'],
      order: { priority: 'ASC', createdAt: 'DESC' },
    });

    return suppliers.map(s => ({
      id: s.id,
      supplierProfileId: s.supplierProfileId,
      supplierName: s.supplierProfile?.company?.legalName || s.supplierName,
      supplierEmail: s.supplierProfile?.user?.email || s.supplierEmail,
      priority: s.priority,
      notes: s.notes ?? undefined,
      addedBy: s.addedBy ? `${s.addedBy.firstName} ${s.addedBy.lastName}` : undefined,
      createdAt: s.createdAt,
      isRegistered: !!s.supplierProfileId,
    }));
  }

  async addPreferredSupplier(
    customerId: number,
    data: {
      supplierProfileId?: number;
      supplierName?: string;
      supplierEmail?: string;
      priority?: number;
      notes?: string;
    },
    clientIp: string,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['company'],
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    // Only admins can add suppliers
    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException('Only customer admins can manage preferred suppliers');
    }

    // Check if supplier already exists
    if (data.supplierProfileId) {
      const existing = await this.preferredSupplierRepo.findOne({
        where: {
          customerCompanyId: profile.companyId,
          supplierProfileId: data.supplierProfileId,
          isActive: true,
        },
      });

      if (existing) {
        throw new ConflictException('Supplier is already in your preferred list');
      }
    }

    const supplier = this.preferredSupplierRepo.create({
      customerCompanyId: profile.companyId,
      supplierProfileId: data.supplierProfileId || null,
      supplierName: data.supplierName || null,
      supplierEmail: data.supplierEmail || null,
      addedById: customerId,
      priority: data.priority || 0,
      notes: data.notes || null,
      isActive: true,
    });

    const saved = await this.preferredSupplierRepo.save(supplier);

    await this.auditService.log({
      entityType: 'customer_preferred_supplier',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: {
        supplierProfileId: data.supplierProfileId,
        supplierName: data.supplierName,
        supplierEmail: data.supplierEmail,
      },
      ipAddress: clientIp,
    });

    return {
      id: saved.id,
      message: 'Supplier added to preferred list',
    };
  }

  async updatePreferredSupplier(
    customerId: number,
    supplierId: number,
    data: { priority?: number; notes?: string },
    clientIp: string,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException('Only customer admins can manage preferred suppliers');
    }

    const supplier = await this.preferredSupplierRepo.findOne({
      where: { id: supplierId, customerCompanyId: profile.companyId, isActive: true },
    });

    if (!supplier) {
      throw new NotFoundException('Preferred supplier not found');
    }

    if (data.priority !== undefined) supplier.priority = data.priority;
    if (data.notes !== undefined) supplier.notes = data.notes;

    await this.preferredSupplierRepo.save(supplier);

    await this.auditService.log({
      entityType: 'customer_preferred_supplier',
      entityId: supplierId,
      action: AuditAction.UPDATE,
      newValues: data,
      ipAddress: clientIp,
    });

    return { success: true, message: 'Supplier updated' };
  }

  async removePreferredSupplier(customerId: number, supplierId: number, clientIp: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException('Only customer admins can manage preferred suppliers');
    }

    const supplier = await this.preferredSupplierRepo.findOne({
      where: { id: supplierId, customerCompanyId: profile.companyId },
    });

    if (!supplier) {
      throw new NotFoundException('Preferred supplier not found');
    }

    supplier.isActive = false;
    await this.preferredSupplierRepo.save(supplier);

    await this.auditService.log({
      entityType: 'customer_preferred_supplier',
      entityId: supplierId,
      action: AuditAction.DELETE,
      newValues: { deactivated: true },
      ipAddress: clientIp,
    });

    return { success: true, message: 'Supplier removed from preferred list' };
  }

  // Supplier Invitations

  async getInvitations(customerId: number) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    const invitations = await this.invitationRepo.find({
      where: { customerCompanyId: profile.companyId },
      relations: ['invitedBy', 'supplierProfile'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      supplierCompanyName: inv.supplierCompanyName ?? undefined,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt ?? undefined,
      invitedBy: inv.invitedBy ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}` : undefined,
      isExpired: new Date() > inv.expiresAt,
    }));
  }

  async createInvitation(
    customerId: number,
    data: {
      email: string;
      supplierCompanyName?: string;
      message?: string;
    },
    clientIp: string,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['company'],
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException('Only customer admins can send supplier invitations');
    }

    // Check if active invitation already exists
    const existingInvitation = await this.invitationRepo.findOne({
      where: {
        customerCompanyId: profile.companyId,
        email: data.email,
        status: SupplierInvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (existingInvitation) {
      throw new ConflictException('An active invitation already exists for this email');
    }

    // Check if supplier is already registered
    const existingSupplier = await this.supplierProfileRepo.findOne({
      where: { user: { email: data.email } },
      relations: ['user'],
    });

    if (existingSupplier) {
      throw new BadRequestException('This supplier is already registered. Add them directly to your preferred list.');
    }

    // Generate invitation
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = this.invitationRepo.create({
      customerCompanyId: profile.companyId,
      invitedById: customerId,
      token,
      email: data.email,
      supplierCompanyName: data.supplierCompanyName || null,
      status: SupplierInvitationStatus.PENDING,
      expiresAt,
      message: data.message || null,
    });

    const saved = await this.invitationRepo.save(invitation);

    // Send invitation email
    await this.emailService.sendSupplierInvitationEmail(
      data.email,
      profile.company.tradingName || profile.company.legalName,
      token,
      data.message,
    );

    await this.auditService.log({
      entityType: 'supplier_invitation',
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: {
        email: data.email,
        supplierCompanyName: data.supplierCompanyName,
      },
      ipAddress: clientIp,
    });

    return {
      id: saved.id,
      message: 'Invitation sent successfully',
      expiresAt: saved.expiresAt,
    };
  }

  async cancelInvitation(customerId: number, invitationId: number, clientIp: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException('Only customer admins can manage invitations');
    }

    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, customerCompanyId: profile.companyId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== SupplierInvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    invitation.status = SupplierInvitationStatus.CANCELLED;
    await this.invitationRepo.save(invitation);

    await this.auditService.log({
      entityType: 'supplier_invitation',
      entityId: invitationId,
      action: AuditAction.UPDATE,
      newValues: { status: SupplierInvitationStatus.CANCELLED },
      ipAddress: clientIp,
    });

    return { success: true, message: 'Invitation cancelled' };
  }

  async resendInvitation(customerId: number, invitationId: number, clientIp: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: customerId },
      relations: ['company'],
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException('Only customer admins can manage invitations');
    }

    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, customerCompanyId: profile.companyId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Generate new token and extend expiry
    invitation.token = uuidv4();
    invitation.expiresAt = new Date();
    invitation.expiresAt.setDate(invitation.expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
    invitation.status = SupplierInvitationStatus.PENDING;

    await this.invitationRepo.save(invitation);

    // Resend email
    await this.emailService.sendSupplierInvitationEmail(
      invitation.email,
      profile.company.tradingName || profile.company.legalName,
      invitation.token,
      invitation.message ?? undefined,
    );

    await this.auditService.log({
      entityType: 'supplier_invitation',
      entityId: invitationId,
      action: AuditAction.UPDATE,
      newValues: { resent: true, newExpiresAt: invitation.expiresAt },
      ipAddress: clientIp,
    });

    return { success: true, message: 'Invitation resent', expiresAt: invitation.expiresAt };
  }

  // Public method for validating invitation token (used by supplier registration)
  async validateInvitationToken(token: string) {
    const invitation = await this.invitationRepo.findOne({
      where: {
        token,
        status: SupplierInvitationStatus.PENDING,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['customerCompany'],
    });

    if (!invitation) {
      return null;
    }

    return {
      id: invitation.id,
      email: invitation.email,
      customerCompanyName: invitation.customerCompany.tradingName || invitation.customerCompany.legalName,
      supplierCompanyName: invitation.supplierCompanyName,
    };
  }

  // Mark invitation as accepted (called after supplier registration)
  async acceptInvitation(token: string, supplierProfileId: number) {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
    });

    if (!invitation) {
      return;
    }

    invitation.status = SupplierInvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    invitation.supplierProfileId = supplierProfileId;
    await this.invitationRepo.save(invitation);

    // Auto-add to preferred suppliers
    const preferredSupplier = this.preferredSupplierRepo.create({
      customerCompanyId: invitation.customerCompanyId,
      supplierProfileId,
      addedById: invitation.invitedById,
      isActive: true,
    });
    await this.preferredSupplierRepo.save(preferredSupplier);
  }
}
