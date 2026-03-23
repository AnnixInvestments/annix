import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockControlCompanyRole } from "../entities/stock-control-company-role.entity";

const DEFAULT_ROLES = [
  { key: "viewer", label: "Viewer", sortOrder: 0 },
  { key: "quality", label: "Quality", sortOrder: 1 },
  { key: "storeman", label: "Storeman", sortOrder: 2 },
  { key: "accounts", label: "Accounts", sortOrder: 3 },
  { key: "manager", label: "Manager", sortOrder: 4 },
  { key: "admin", label: "Admin", sortOrder: 5 },
];

export interface CompanyRoleDto {
  id: number;
  key: string;
  label: string;
  isSystem: boolean;
  sortOrder: number;
}

@Injectable()
export class CompanyRoleService {
  constructor(
    @InjectRepository(StockControlCompanyRole)
    private readonly roleRepo: Repository<StockControlCompanyRole>,
  ) {}

  async rolesForCompany(companyId: number): Promise<CompanyRoleDto[]> {
    const existing = await this.roleRepo.find({
      where: { companyId },
      order: { sortOrder: "ASC", id: "ASC" },
    });

    if (existing.length > 0) {
      return existing.map((r) => ({
        id: r.id,
        key: r.key,
        label: r.label,
        isSystem: r.isSystem,
        sortOrder: r.sortOrder,
      }));
    }

    const seeded = await this.seedDefaults(companyId);
    return seeded.map((r) => ({
      id: r.id,
      key: r.key,
      label: r.label,
      isSystem: r.isSystem,
      sortOrder: r.sortOrder,
    }));
  }

  async createRole(companyId: number, key: string, label: string): Promise<CompanyRoleDto> {
    const sanitizedKey = key
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);

    if (!sanitizedKey) {
      throw new BadRequestException("Invalid role key");
    }

    const existing = await this.roleRepo.findOne({
      where: { companyId, key: sanitizedKey },
    });

    if (existing) {
      throw new BadRequestException("A role with this key already exists");
    }

    const maxSort = await this.roleRepo
      .createQueryBuilder("r")
      .select("MAX(r.sort_order)", "max")
      .where("r.company_id = :companyId", { companyId })
      .getRawOne();

    const nextSort = (maxSort?.max ?? 0) + 1;

    const role = this.roleRepo.create({
      companyId,
      key: sanitizedKey,
      label: label.trim().slice(0, 50),
      isSystem: false,
      sortOrder: nextSort,
    });

    const saved = await this.roleRepo.save(role);

    return {
      id: saved.id,
      key: saved.key,
      label: saved.label,
      isSystem: saved.isSystem,
      sortOrder: saved.sortOrder,
    };
  }

  async updateRole(id: number, companyId: number, label: string): Promise<CompanyRoleDto> {
    const role = await this.roleRepo.findOne({ where: { id, companyId } });

    if (!role) {
      throw new BadRequestException("Role not found");
    }

    role.label = label.trim().slice(0, 50);
    const saved = await this.roleRepo.save(role);

    return {
      id: saved.id,
      key: saved.key,
      label: saved.label,
      isSystem: saved.isSystem,
      sortOrder: saved.sortOrder,
    };
  }

  async deleteRole(id: number, companyId: number): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id, companyId } });

    if (!role) {
      throw new BadRequestException("Role not found");
    }

    if (role.key === "admin") {
      throw new BadRequestException("Cannot delete the admin role");
    }

    await this.roleRepo.remove(role);
  }

  async reorderRoles(companyId: number, orderedIds: number[]): Promise<CompanyRoleDto[]> {
    const allRoles = await this.roleRepo.find({ where: { companyId } });

    const adminRole = allRoles.find((r) => r.key === "admin");
    if (adminRole && orderedIds[orderedIds.length - 1] !== adminRole.id) {
      throw new BadRequestException("Admin role must remain in the last position");
    }

    const updates = orderedIds.map((id, index) => {
      const role = allRoles.find((r) => r.id === id);
      if (!role) {
        throw new BadRequestException(`Role with id ${id} not found`);
      }
      role.sortOrder = index;
      return role;
    });

    await this.roleRepo.save(updates);

    return this.rolesForCompany(companyId);
  }

  private async seedDefaults(companyId: number): Promise<StockControlCompanyRole[]> {
    const entities = DEFAULT_ROLES.map((r) =>
      this.roleRepo.create({
        companyId,
        key: r.key,
        label: r.label,
        isSystem: true,
        sortOrder: r.sortOrder,
      }),
    );

    return this.roleRepo.save(entities);
  }
}
