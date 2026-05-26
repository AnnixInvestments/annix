import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerListParams, CustomerProfileRepository } from "./customer-profile.repository";
import { CustomerProfile } from "./entities/customer-profile.entity";

@Injectable()
export class PostgresCustomerProfileRepository
  extends TypeOrmCrudRepository<CustomerProfile>
  implements CustomerProfileRepository
{
  constructor(@InjectRepository(CustomerProfile) repository: Repository<CustomerProfile>) {
    super(repository);
  }

  findByUserId(userId: number, relations: string[] = []): Promise<CustomerProfile | null> {
    return this.repository.findOne({
      where: { userId },
      ...(relations.length > 0 ? { relations } : {}),
    });
  }

  findByValidEmailVerificationToken(
    token: string,
    notExpiredBefore: Date,
  ): Promise<CustomerProfile | null> {
    return this.repository.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: MoreThan(notExpiredBefore),
      },
      relations: ["user", "company"],
    });
  }

  listForAdmin(params: CustomerListParams): Promise<[CustomerProfile[], number]> {
    const queryBuilder = this.repository
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.company", "company")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect(
        "profile.deviceBindings",
        "deviceBinding",
        "deviceBinding.isActive = true AND deviceBinding.isPrimary = true",
      )
      .leftJoin(
        "profile.sessions",
        "session",
        "session.isActive = true OR session.invalidatedAt IS NOT NULL",
      );

    if (params.search) {
      queryBuilder.andWhere(
        "(company.legalName ILIKE :search OR company.tradingName ILIKE :search OR user.email ILIKE :search OR profile.firstName ILIKE :search OR profile.lastName ILIKE :search)",
        { search: `%${params.search}%` },
      );
    }

    if (params.status) {
      queryBuilder.andWhere("profile.accountStatus = :status", { status: params.status });
    }

    queryBuilder.orderBy(`profile.${params.sortField}`, params.sortOrder);
    queryBuilder.skip(params.skip).take(params.limit);

    return queryBuilder.getManyAndCount();
  }

  async allUserIds(): Promise<number[]> {
    const profiles = await this.repository.find({ select: ["userId"] });
    return profiles.map((profile) => profile.userId);
  }

  findWithExpiringBeeCertificates(todayStr: string): Promise<CustomerProfile[]> {
    return this.repository
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.company", "company")
      .leftJoinAndSelect("profile.user", "user")
      .where("company.beeCertificateExpiry IS NOT NULL")
      .andWhere("DATE(company.beeCertificateExpiry) <= :today", { today: todayStr })
      .andWhere(
        "(company.beeExpiryNotificationSentAt IS NULL OR DATE(company.beeExpiryNotificationSentAt) < DATE(company.beeCertificateExpiry))",
      )
      .getMany();
  }

  findByIdWithRelations(id: number, relations: string[]): Promise<CustomerProfile | null> {
    return this.repository.findOne({ where: { id }, relations });
  }
}
