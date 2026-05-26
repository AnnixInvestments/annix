import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { Organization, OrganizationPlan } from "../entities/organization.entity";
import { TeamMemberStatus, TeamRole } from "../entities/team-member.entity";
import { OrganizationRepository } from "../organization.repository";
import { TeamMemberRepository } from "../team-member.repository";

export interface CreateOrganizationDto {
  name: string;
  industry?: string;
  logoUrl?: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  industry?: string;
  logoUrl?: string;
  plan?: OrganizationPlan;
  maxMembers?: number;
}

export interface OrganizationStats {
  memberCount: number;
  activeMembers: number;
  territoryCount: number;
  prospectCount: number;
  meetingsThisMonth: number;
}

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly organizationRepo: OrganizationRepository,
    private readonly teamMemberRepo: TeamMemberRepository,
  ) {}

  async create(ownerId: number, dto: CreateOrganizationDto): Promise<Organization> {
    const existingOrg = await this.findByUser(ownerId);
    if (existingOrg) {
      throw new ConflictException("User already belongs to an organization");
    }

    const slug = this.generateSlug(dto.name);
    const existingSlug = await this.organizationRepo.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictException("Organization name already taken");
    }

    const savedOrg = await this.organizationRepo.create({
      name: dto.name,
      slug,
      ownerId,
      industry: dto.industry ?? null,
      logoUrl: dto.logoUrl ?? null,
      plan: OrganizationPlan.FREE,
      maxMembers: 5,
      isActive: true,
    });

    await this.teamMemberRepo.create({
      organizationId: savedOrg.id,
      userId: ownerId,
      role: TeamRole.ADMIN,
      status: TeamMemberStatus.ACTIVE,
      joinedAt: now().toJSDate(),
    });

    this.logger.log(`Organization created: ${savedOrg.name} (${savedOrg.slug}) by user ${ownerId}`);
    return savedOrg;
  }

  async findOne(id: number): Promise<Organization | null> {
    return this.organizationRepo.findWithOwner(id);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepo.findBySlugWithOwner(slug);
  }

  async findByUser(userId: number): Promise<Organization | null> {
    const member = await this.teamMemberRepo.findByUserWithOrganization(userId);
    return member?.organization ?? null;
  }

  async update(id: number, dto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    if (dto.name != null) {
      organization.name = dto.name;
    }
    if (dto.industry != null) {
      organization.industry = dto.industry;
    }
    if (dto.logoUrl != null) {
      organization.logoUrl = dto.logoUrl;
    }
    if (dto.plan != null) {
      organization.plan = dto.plan;
    }
    if (dto.maxMembers != null) {
      organization.maxMembers = dto.maxMembers;
    }

    return this.organizationRepo.save(organization);
  }

  async delete(id: number, requestingUserId: number): Promise<void> {
    const organization = await this.findOne(id);
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    if (organization.ownerId !== requestingUserId) {
      throw new ConflictException("Only the organization owner can delete it");
    }

    await this.organizationRepo.remove(organization);
    this.logger.log(`Organization deleted: ${organization.name} (${organization.slug})`);
  }

  async memberCount(orgId: number): Promise<number> {
    return this.teamMemberRepo.countActiveByOrganization(orgId);
  }

  async canAddMembers(orgId: number): Promise<boolean> {
    const organization = await this.findOne(orgId);
    if (!organization) {
      return false;
    }

    const currentCount = await this.memberCount(orgId);
    return currentCount < organization.maxMembers;
  }

  async stats(orgId: number): Promise<OrganizationStats> {
    const memberCount = await this.teamMemberRepo.countByOrganization(orgId);

    const activeMembers = await this.teamMemberRepo.countActiveByOrganization(orgId);

    return {
      memberCount,
      activeMembers,
      territoryCount: 0,
      prospectCount: 0,
      meetingsThisMonth: 0,
    };
  }

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const timestamp = now().toMillis().toString(36).slice(-4);
    return `${baseSlug}-${timestamp}`;
  }
}
