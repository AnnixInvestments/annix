import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SupplierOnboardingStatus } from "./entities/supplier-onboarding.entity";
import { SupplierAccountStatus, SupplierProfile } from "./entities/supplier-profile.entity";
import {
  SupplierDirectoryFilters,
  SupplierProfilePage,
  SupplierProfileRepository,
} from "./supplier-profile.repository";

@Injectable()
export class PostgresSupplierProfileRepository
  extends TypeOrmCrudRepository<SupplierProfile>
  implements SupplierProfileRepository
{
  constructor(@InjectRepository(SupplierProfile) repository: Repository<SupplierProfile>) {
    super(repository);
  }

  findByIdWithRelations(id: number, relations: string[]): Promise<SupplierProfile | null> {
    return this.repository.findOne({ where: { id }, relations });
  }

  findByUserId(userId: number, relations: string[] = []): Promise<SupplierProfile | null> {
    return this.repository.findOne({
      where: { userId },
      ...(relations.length > 0 ? { relations } : {}),
    });
  }

  findByUserIdAndVerificationToken(
    userId: number,
    emailVerificationToken: string,
  ): Promise<SupplierProfile | null> {
    return this.repository.findOne({
      where: { userId, emailVerificationToken },
    });
  }

  findByIdForRefresh(id: number | undefined): Promise<SupplierProfile | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["company", "deviceBindings", "onboarding", "user"],
    });
  }

  async findAllPaginated(
    page: number,
    limit: number,
    accountStatus?: SupplierAccountStatus,
  ): Promise<SupplierProfilePage> {
    const queryBuilder = this.repository
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("profile.company", "company")
      .leftJoinAndSelect("profile.onboarding", "onboarding")
      .orderBy("profile.createdAt", "DESC");

    if (accountStatus) {
      queryBuilder.andWhere("profile.accountStatus = :accountStatus", {
        accountStatus,
      });
    }

    const total = await queryBuilder.getCount();

    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total };
  }

  async allUserIds(): Promise<number[]> {
    const profiles = await this.repository.find({ select: ["userId"] });
    return profiles.map((profile) => profile.userId);
  }

  searchActiveWithCompany(filters: SupplierDirectoryFilters): Promise<SupplierProfile[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("sp")
      .leftJoinAndSelect("sp.company", "company")
      .leftJoinAndSelect("sp.capabilities", "cap", "cap.is_active = true")
      .where("sp.account_status = :status", {
        status: SupplierAccountStatus.ACTIVE,
      })
      .andWhere("company.id IS NOT NULL");

    if (filters.search) {
      queryBuilder.andWhere(
        "(LOWER(company.legal_name) LIKE :search OR LOWER(company.trading_name) LIKE :search)",
        { search: `%${filters.search.toLowerCase()}%` },
      );
    }

    if (filters.province) {
      queryBuilder.andWhere("LOWER(company.province_state) = :province", {
        province: filters.province.toLowerCase(),
      });
    }

    return queryBuilder.getMany();
  }

  findByUserEmail(email: string): Promise<SupplierProfile | null> {
    return this.repository.findOne({
      where: { user: { email } },
      relations: ["user"],
    });
  }

  findByIdsWithUserAndCompany(ids: number[]): Promise<SupplierProfile[]> {
    return this.repository.find({
      where: { id: In(ids) },
      relations: ["user", "company"],
    });
  }

  findSubmittedForReview(): Promise<SupplierProfile[]> {
    return this.repository.find({
      where: {
        onboarding: {
          status: SupplierOnboardingStatus.SUBMITTED,
        },
      },
      relations: ["user", "company", "onboarding"],
      order: { createdAt: "ASC" },
    });
  }
}
