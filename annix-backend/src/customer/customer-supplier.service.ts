import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { EmailService } from "../email/email.service";
import { now } from "../lib/datetime";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { CustomerBlockedSupplierRepository } from "./customer-blocked-supplier.repository";
import { CustomerPreferredSupplierRepository } from "./customer-preferred-supplier.repository";
import { CustomerProfileRepository } from "./customer-profile.repository";
import { DirectoryQueryDto, DirectorySupplierDto } from "./dto/supplier-directory.dto";
import { CustomerRole } from "./entities";
import { SupplierInvitationStatus } from "./entities/supplier-invitation.entity";
import { SupplierInvitationRepository } from "./supplier-invitation.repository";

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class CustomerSupplierService {
  constructor(
    private readonly preferredSupplierRepository: CustomerPreferredSupplierRepository,
    private readonly blockedSupplierRepository: CustomerBlockedSupplierRepository,
    private readonly invitationRepository: SupplierInvitationRepository,
    private readonly profileRepository: CustomerProfileRepository,
    private readonly supplierProfileRepo: SupplierProfileRepository,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  // Preferential Suppliers

  async getPreferredSuppliers(customerId: number) {
    const profile = await this.profileRepository.findById(customerId, ["company"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const suppliers = await this.preferredSupplierRepository.findActiveByCompany(
      profile.companyId,
      ["supplierProfile", "supplierProfile.company", "addedBy"],
    );

    return suppliers.map((s) => ({
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
    const profile = await this.profileRepository.findById(customerId, ["company"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    // Only admins can add suppliers
    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can manage preferred suppliers");
    }

    // Check if supplier already exists
    if (data.supplierProfileId) {
      const existing = await this.preferredSupplierRepository.findActiveByCompanyAndSupplier(
        profile.companyId,
        data.supplierProfileId,
      );

      if (existing) {
        throw new ConflictException("Supplier is already in your preferred list");
      }
    }

    const saved = await this.preferredSupplierRepository.create({
      customerCompanyId: profile.companyId,
      supplierProfileId: data.supplierProfileId || null,
      supplierName: data.supplierName || null,
      supplierEmail: data.supplierEmail || null,
      addedById: customerId,
      priority: data.priority || 0,
      notes: data.notes || null,
      isActive: true,
    });

    await this.auditService.log({
      entityType: "customer_preferred_supplier",
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
      message: "Supplier added to preferred list",
    };
  }

  async updatePreferredSupplier(
    customerId: number,
    supplierId: number,
    data: { priority?: number; notes?: string },
    clientIp: string,
  ) {
    const profile = await this.profileRepository.findById(customerId);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can manage preferred suppliers");
    }

    const supplier = await this.preferredSupplierRepository.findActiveByIdInCompany(
      supplierId,
      profile.companyId,
    );

    if (!supplier) {
      throw new NotFoundException("Preferred supplier not found");
    }

    if (data.priority !== undefined) supplier.priority = data.priority;
    if (data.notes !== undefined) supplier.notes = data.notes;

    await this.preferredSupplierRepository.save(supplier);

    await this.auditService.log({
      entityType: "customer_preferred_supplier",
      entityId: supplierId,
      action: AuditAction.UPDATE,
      newValues: data,
      ipAddress: clientIp,
    });

    return { success: true, message: "Supplier updated" };
  }

  async removePreferredSupplier(customerId: number, supplierId: number, clientIp: string) {
    const profile = await this.profileRepository.findById(customerId);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can manage preferred suppliers");
    }

    const supplier = await this.preferredSupplierRepository.findByIdInCompany(
      supplierId,
      profile.companyId,
    );

    if (!supplier) {
      throw new NotFoundException("Preferred supplier not found");
    }

    supplier.isActive = false;
    await this.preferredSupplierRepository.save(supplier);

    await this.auditService.log({
      entityType: "customer_preferred_supplier",
      entityId: supplierId,
      action: AuditAction.DELETE,
      newValues: { deactivated: true },
      ipAddress: clientIp,
    });

    return { success: true, message: "Supplier removed from preferred list" };
  }

  // Supplier Invitations

  async getInvitations(customerId: number) {
    const profile = await this.profileRepository.findById(customerId);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const invitations = await this.invitationRepository.findByCompany(profile.companyId);

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      supplierCompanyName: inv.supplierCompanyName ?? undefined,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt ?? undefined,
      invitedBy: inv.invitedBy ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}` : undefined,
      isExpired: now().toJSDate() > inv.expiresAt,
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
    const profile = await this.profileRepository.findById(customerId, ["company"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can send supplier invitations");
    }

    // Check if active invitation already exists
    const existingInvitation = await this.invitationRepository.findActivePendingByCompanyAndEmail(
      profile.companyId,
      data.email,
      now().toJSDate(),
    );

    if (existingInvitation) {
      throw new ConflictException("An active invitation already exists for this email");
    }

    // Check if supplier is already registered
    const existingSupplier = await this.supplierProfileRepo.findByUserEmail(data.email);

    if (existingSupplier) {
      throw new BadRequestException(
        "This supplier is already registered. Add them directly to your preferred list.",
      );
    }

    // Generate invitation
    const token = uuidv4();
    const expiresAt = now().plus({ days: INVITATION_EXPIRY_DAYS }).toJSDate();

    const saved = await this.invitationRepository.create({
      customerCompanyId: profile.companyId,
      invitedById: customerId,
      token,
      email: data.email,
      supplierCompanyName: data.supplierCompanyName || null,
      status: SupplierInvitationStatus.PENDING,
      expiresAt,
      message: data.message || null,
    });

    // Send invitation email
    await this.emailService.sendSupplierInvitationEmail(
      data.email,
      profile.company.tradingName || profile.company.legalName || "",
      token,
      data.message,
    );

    await this.auditService.log({
      entityType: "supplier_invitation",
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
      message: "Invitation sent successfully",
      expiresAt: saved.expiresAt,
    };
  }

  async cancelInvitation(customerId: number, invitationId: number, clientIp: string) {
    const profile = await this.profileRepository.findById(customerId);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can manage invitations");
    }

    const invitation = await this.invitationRepository.findByIdInCompany(
      invitationId,
      profile.companyId,
    );

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== SupplierInvitationStatus.PENDING) {
      throw new BadRequestException("Can only cancel pending invitations");
    }

    invitation.status = SupplierInvitationStatus.CANCELLED;
    await this.invitationRepository.save(invitation);

    await this.auditService.log({
      entityType: "supplier_invitation",
      entityId: invitationId,
      action: AuditAction.UPDATE,
      newValues: { status: SupplierInvitationStatus.CANCELLED },
      ipAddress: clientIp,
    });

    return { success: true, message: "Invitation cancelled" };
  }

  async resendInvitation(customerId: number, invitationId: number, clientIp: string) {
    const profile = await this.profileRepository.findById(customerId, ["company"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can manage invitations");
    }

    const invitation = await this.invitationRepository.findByIdInCompany(
      invitationId,
      profile.companyId,
    );

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    // Generate new token and extend expiry
    invitation.token = uuidv4();
    invitation.expiresAt = now().plus({ days: INVITATION_EXPIRY_DAYS }).toJSDate();
    invitation.status = SupplierInvitationStatus.PENDING;

    await this.invitationRepository.save(invitation);

    // Resend email
    await this.emailService.sendSupplierInvitationEmail(
      invitation.email,
      profile.company.tradingName || profile.company.legalName || "",
      invitation.token,
      invitation.message ?? undefined,
    );

    await this.auditService.log({
      entityType: "supplier_invitation",
      entityId: invitationId,
      action: AuditAction.UPDATE,
      newValues: { resent: true, newExpiresAt: invitation.expiresAt },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: "Invitation resent",
      expiresAt: invitation.expiresAt,
    };
  }

  // Public method for validating invitation token (used by supplier registration)
  async validateInvitationToken(token: string) {
    const invitation = await this.invitationRepository.findActivePendingByToken(
      token,
      now().toJSDate(),
    );

    if (!invitation) {
      return null;
    }

    return {
      id: invitation.id,
      email: invitation.email,
      customerCompanyName:
        invitation.customerCompany.tradingName || invitation.customerCompany.legalName,
      supplierCompanyName: invitation.supplierCompanyName,
    };
  }

  // Mark invitation as accepted (called after supplier registration)
  async acceptInvitation(token: string, supplierProfileId: number) {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      return;
    }

    invitation.status = SupplierInvitationStatus.ACCEPTED;
    invitation.acceptedAt = now().toJSDate();
    invitation.supplierProfileId = supplierProfileId;
    await this.invitationRepository.save(invitation);

    // Auto-add to preferred suppliers
    await this.preferredSupplierRepository.create({
      customerCompanyId: invitation.customerCompanyId,
      supplierProfileId,
      addedById: invitation.invitedById,
      isActive: true,
    });
  }

  // Auto-accept all pending invitations for a supplier email when they are approved
  async acceptPendingInvitationsByEmail(
    supplierEmail: string,
    supplierProfileId: number,
  ): Promise<number> {
    const pendingInvitations = await this.invitationRepository.findPendingByEmail(
      supplierEmail.toLowerCase(),
    );

    let acceptedCount = 0;

    for (const invitation of pendingInvitations) {
      // Check if preferred supplier relationship already exists
      const existingRelation = await this.preferredSupplierRepository.findByCompanyAndSupplier(
        invitation.customerCompanyId,
        supplierProfileId,
      );

      if (!existingRelation) {
        // Mark invitation as accepted
        invitation.status = SupplierInvitationStatus.ACCEPTED;
        invitation.acceptedAt = now().toJSDate();
        invitation.supplierProfileId = supplierProfileId;
        await this.invitationRepository.save(invitation);

        // Auto-add to preferred suppliers
        await this.preferredSupplierRepository.create({
          customerCompanyId: invitation.customerCompanyId,
          supplierProfileId,
          addedById: invitation.invitedById,
          isActive: true,
        });

        acceptedCount++;
      } else {
        // Just mark the invitation as accepted since relationship exists
        invitation.status = SupplierInvitationStatus.ACCEPTED;
        invitation.acceptedAt = now().toJSDate();
        invitation.supplierProfileId = supplierProfileId;
        await this.invitationRepository.save(invitation);
      }
    }

    return acceptedCount;
  }

  // Supplier Directory

  private readonly productLabelMap: Record<string, string> = {
    fabricated_steel: "Steel Pipes",
    fasteners_gaskets: "Nuts, Bolts, Washers & Gaskets",
    surface_protection: "Surface Protection",
    hdpe: "HDPE Pipes",
    pvc: "PVC Pipes",
    structural_steel: "Structural Steel",
    pumps: "Pumps & Pump Parts",
    valves_meters_instruments: "Valves, Meters & Instruments",
    valves_instruments: "Valves & Instruments",
    transport_install: "Transport/Install",
    pipe_steel_work: "Pipe Brackets & Steel Work",
    straight_pipe: "Straight Pipe",
    bends: "Bends",
    flanges: "Flanges",
    fittings: "Fittings",
    valves: "Valves",
    fabrication: "Fabrication",
    coating: "Coating",
    inspection: "Inspection",
    other: "Other",
  };

  async supplierDirectory(
    customerId: number,
    filters?: DirectoryQueryDto,
  ): Promise<DirectorySupplierDto[]> {
    const profile = await this.profileRepository.findById(customerId, ["company"]);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    const suppliers = await this.supplierProfileRepo.searchActiveWithCompany({
      search: filters?.search ?? null,
      province: filters?.province ?? null,
    });

    const preferredSuppliers = await this.preferredSupplierRepository.findActiveByCompany(
      profile.companyId,
    );
    const preferredMap = new Map(preferredSuppliers.map((ps) => [ps.supplierProfileId, ps]));

    const blockedSuppliers = await this.blockedSupplierRepository.findActiveByCompany(
      profile.companyId,
    );
    const blockedMap = new Map(blockedSuppliers.map((bs) => [bs.supplierProfileId, bs]));

    const results: DirectorySupplierDto[] = suppliers
      .map((supplier): DirectorySupplierDto | null => {
        const products: string[] = supplier.capabilities
          .filter((cap) => cap.isActive)
          .map((cap) => cap.productCategory as string);

        if (
          filters?.products &&
          filters.products.length > 0 &&
          !products.some((p) => filters.products?.includes(p))
        ) {
          return null;
        }

        const preferred = preferredMap.get(supplier.id);
        const blocked = blockedMap.get(supplier.id);

        let status: "preferred" | "blocked" | "none" = "none";
        if (blocked) {
          status = "blocked";
        } else if (preferred) {
          status = "preferred";
        }

        return {
          supplierProfileId: supplier.id,
          companyName: supplier.company?.tradingName || supplier.company?.legalName || "",
          province: supplier.company?.address?.province || "",
          products,
          productLabels: products.map((p) => this.productLabelMap[p] || p),
          status,
          preferredSupplierId: preferred?.id,
          blockedSupplierId: blocked?.id,
        };
      })
      .filter((s): s is DirectorySupplierDto => s !== null);

    return results;
  }

  async blockSupplier(
    customerId: number,
    supplierProfileId: number,
    reason: string | null,
    clientIp: string,
  ) {
    const profile = await this.profileRepository.findById(customerId);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can block suppliers");
    }

    const supplierProfile = await this.supplierProfileRepo.findById(supplierProfileId);

    if (!supplierProfile) {
      throw new NotFoundException("Supplier not found");
    }

    const existingBlock = await this.blockedSupplierRepository.findActiveByCompanyAndSupplier(
      profile.companyId,
      supplierProfileId,
    );

    if (existingBlock) {
      throw new ConflictException("Supplier is already blocked");
    }

    const existingPreferred = await this.preferredSupplierRepository.findActiveByCompanyAndSupplier(
      profile.companyId,
      supplierProfileId,
    );

    if (existingPreferred) {
      existingPreferred.isActive = false;
      await this.preferredSupplierRepository.save(existingPreferred);

      await this.auditService.log({
        entityType: "customer_preferred_supplier",
        entityId: existingPreferred.id,
        action: AuditAction.DELETE,
        newValues: { removedDueToBlock: true },
        ipAddress: clientIp,
      });
    }

    const saved = await this.blockedSupplierRepository.create({
      customerCompanyId: profile.companyId,
      supplierProfileId,
      blockedById: customerId,
      reason,
      isActive: true,
    });

    await this.auditService.log({
      entityType: "customer_blocked_supplier",
      entityId: saved.id,
      action: AuditAction.CREATE,
      newValues: { supplierProfileId, reason },
      ipAddress: clientIp,
    });

    return {
      id: saved.id,
      message: "Supplier blocked successfully",
    };
  }

  async unblockSupplier(customerId: number, supplierProfileId: number, clientIp: string) {
    const profile = await this.profileRepository.findById(customerId);

    if (!profile) {
      throw new NotFoundException("Customer profile not found");
    }

    if (profile.role !== CustomerRole.CUSTOMER_ADMIN) {
      throw new ForbiddenException("Only customer admins can unblock suppliers");
    }

    const blocked = await this.blockedSupplierRepository.findActiveByCompanyAndSupplier(
      profile.companyId,
      supplierProfileId,
    );

    if (!blocked) {
      throw new NotFoundException("Blocked supplier not found");
    }

    blocked.isActive = false;
    await this.blockedSupplierRepository.save(blocked);

    await this.auditService.log({
      entityType: "customer_blocked_supplier",
      entityId: blocked.id,
      action: AuditAction.DELETE,
      newValues: { unblocked: true },
      ipAddress: clientIp,
    });

    return { success: true, message: "Supplier unblocked successfully" };
  }
}
