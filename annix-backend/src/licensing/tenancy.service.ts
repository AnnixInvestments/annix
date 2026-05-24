import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "../platform/entities/company.entity";
import { RbacService } from "../rbac/rbac.service";
import { User } from "../user/entities/user.entity";
import type { CreateTenantDto, InviteTenantUserDto, TransferOwnerDto } from "./dto/tenancy.dto";
import { ModuleLicense } from "./entities/module-license.entity";
import { LicensingService } from "./licensing.service";

export interface TenantSummary {
  companyId: number;
  name: string;
  ownerUserId: number | null;
  tier: string;
  userCount: number;
}

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ModuleLicense)
    private readonly licenseRepo: Repository<ModuleLicense>,
    private readonly rbacService: RbacService,
    private readonly licensingService: LicensingService,
  ) {}

  async listTenants(moduleKey: string): Promise<TenantSummary[]> {
    const licences = await this.licenseRepo.find({ where: { moduleKey } });
    return Promise.all(
      licences.map(async (licence) => {
        const company = await this.companyRepo.findOne({ where: { id: licence.companyId } });
        const userCount = await this.userRepo.count({ where: { companyId: licence.companyId } });
        return {
          companyId: licence.companyId,
          name: company?.name ?? "(unknown)",
          ownerUserId: company?.ownerUserId ?? null,
          tier: licence.tier,
          userCount,
        };
      }),
    );
  }

  async createTenant(
    moduleKey: string,
    dto: CreateTenantDto,
    grantedById: number,
  ): Promise<TenantSummary> {
    const company = await this.companyRepo.save(this.companyRepo.create({ name: dto.companyName }));
    const invite = await this.rbacService.inviteUser(
      {
        email: dto.ownerEmail,
        firstName: dto.ownerFirstName,
        lastName: dto.ownerLastName,
        appCode: moduleKey,
        roleCode: dto.ownerRoleCode,
      },
      grantedById,
    );
    await this.userRepo.update(invite.userId, { companyId: company.id });
    company.ownerUserId = invite.userId;
    await this.companyRepo.save(company);
    await this.licensingService.setTier(company.id, moduleKey, dto.tier);
    this.logger.log(`Created tenant ${company.id} (${company.name}) on ${moduleKey}:${dto.tier}`);
    return {
      companyId: company.id,
      name: company.name,
      ownerUserId: invite.userId,
      tier: dto.tier,
      userCount: 1,
    };
  }

  async inviteTenantUser(
    moduleKey: string,
    companyId: number,
    dto: InviteTenantUserDto,
    grantedById: number,
  ): Promise<{ userId: number; email: string }> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Tenant ${companyId} not found`);
    }
    const invite = await this.rbacService.inviteUser(
      {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        appCode: moduleKey,
        roleCode: dto.roleCode,
      },
      grantedById,
    );
    await this.userRepo.update(invite.userId, { companyId });
    return { userId: invite.userId, email: invite.email };
  }

  async transferOwnership(companyId: number, dto: TransferOwnerDto): Promise<TenantSummary> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Tenant ${companyId} not found`);
    }
    const newOwner = await this.userRepo.findOne({ where: { id: dto.newOwnerUserId } });
    if (!newOwner || newOwner.companyId !== companyId) {
      throw new BadRequestException("The new owner must be a user that belongs to this tenant.");
    }
    company.ownerUserId = dto.newOwnerUserId;
    await this.companyRepo.save(company);
    const userCount = await this.userRepo.count({ where: { companyId } });
    const licence = await this.licenseRepo.findOne({
      where: { companyId, moduleKey: "au-rubber" },
    });
    return {
      companyId,
      name: company.name,
      ownerUserId: company.ownerUserId,
      tier: licence?.tier ?? "essentials",
      userCount,
    };
  }
}
