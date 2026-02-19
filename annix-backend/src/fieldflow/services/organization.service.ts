import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { Organization, OrganizationPlan } from "../entities/organization.entity";
import { TeamMember, TeamMemberStatus, TeamRole } from "../entities/team-member.entity";

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
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepo: Repository<TeamMember>,
  ) {}

  async create(ownerId: number, dto: CreateOrganizationDto): Promise<Organization> {
    const existingOrg = await this.findByUser(ownerId);
    if (existingOrg) {
      throw new ConflictException("User already belongs to an organization");
    }

    const slug = this.generateSlug(dto.name);
    const existingSlug = await this.organizationRepo.findOne({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException("Organization name already taken");
    }

    const organization = this.organizationRepo.create({
      name: dto.name,
      slug,
      ownerId,
      industry: dto.industry ?? null,
      logoUrl: dto.logoUrl ?? null,
      plan: OrganizationPlan.FREE,
      maxMembers: 5,
      isActive: true,
    });

    const savedOrg = await this.organizationRepo.save(organization);

    const ownerMember = this.teamMemberRepo.create({
      organizationId: savedOrg.id,
      userId: ownerId,
      role: TeamRole.ADMIN,
      status: TeamMemberStatus.ACTIVE,
      joinedAt: now().toJSDate(),
    });
    await this.teamMemberRepo.save(ownerMember);

    this.logger.log(`Organization created: ${savedOrg.name} (${savedOrg.slug}) by user ${ownerId}`);
    return savedOrg;
  }

  async findOne(id: number): Promise<Organization | null> {
    return this.organizationRepo.findOne({
      where: { id },
      relations: ["owner"],
    });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepo.findOne({
      where: { slug },
      relations: ["owner"],
    });
  }

  async findByUser(userId: number): Promise<Organization | null> {
    const member = await this.teamMemberRepo.findOne({
      where: { userId },
      relations: ["organization"],
    });
    return member?.organization ?? null;
  }

  async update(id: number, dto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);
    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    if (dto.name !== undefined) {
      organization.name = dto.name;
    }
    if (dto.industry !== undefined) {
      organization.industry = dto.industry;
    }
    if (dto.logoUrl !== undefined) {
      organization.logoUrl = dto.logoUrl;
    }
    if (dto.plan !== undefined) {
      organization.plan = dto.plan;
    }
    if (dto.maxMembers !== undefined) {
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
    return this.teamMemberRepo.count({
      where: { organizationId: orgId, status: TeamMemberStatus.ACTIVE },
    });
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
    const memberCount = await this.teamMemberRepo.count({
      where: { organizationId: orgId },
    });

    const activeMembers = await this.teamMemberRepo.count({
      where: { organizationId: orgId, status: TeamMemberStatus.ACTIVE },
    });

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
