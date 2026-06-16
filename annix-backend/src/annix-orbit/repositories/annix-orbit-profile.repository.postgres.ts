import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitProfile, AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitProfileRepository } from "./annix-orbit-profile.repository";

@Injectable()
export class PostgresAnnixOrbitProfileRepository
  extends TypeOrmCrudRepository<AnnixOrbitProfile>
  implements AnnixOrbitProfileRepository
{
  constructor(@InjectRepository(AnnixOrbitProfile) repository: Repository<AnnixOrbitProfile>) {
    super(repository);
  }

  findByUserId(userId: number): Promise<AnnixOrbitProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }

  findByUserIdWithCompany(userId: number): Promise<AnnixOrbitProfile | null> {
    return this.repository.findOne({ where: { userId }, relations: ["company"] });
  }

  teamMembers(companyId: number): Promise<AnnixOrbitProfile[]> {
    return this.repository.find({
      where: { companyId, userType: AnnixOrbitUserType.COMPANY },
      relations: ["user"],
      order: { createdAt: "ASC" },
    });
  }

  findByCompanyWithUser(companyId: number): Promise<AnnixOrbitProfile[]> {
    return this.repository.find({ where: { companyId }, relations: ["user"] });
  }

  findDigestEnabledForCompany(companyId: number): Promise<AnnixOrbitProfile[]> {
    return this.repository.find({
      where: { companyId, digestEnabled: true },
      relations: ["user"],
    });
  }

  async digestEnabledCompanyIds(): Promise<number[]> {
    const rows = await this.repository
      .createQueryBuilder("profile")
      .select("DISTINCT profile.company_id", "companyId")
      .where("profile.digest_enabled = true")
      .getRawMany();
    return rows.map((r) => r.companyId);
  }

  findByValidDeletionToken(token: string, now: Date): Promise<AnnixOrbitProfile | null> {
    return this.repository.findOne({
      where: {
        deletionToken: token,
        deletionTokenExpires: MoreThan(now),
      },
    });
  }

  findByCalendarFeedToken(token: string): Promise<AnnixOrbitProfile | null> {
    return this.repository.findOne({ where: { calendarFeedToken: token } });
  }

  async setPushEnabledForUser(userId: number, enabled: boolean): Promise<void> {
    await this.repository.update({ userId }, { pushEnabled: enabled });
  }

  async setSelectedTier(userId: number, tier: string): Promise<void> {
    await this.repository.update({ userId }, { selectedTier: tier });
  }

  findByUserIds(userIds: number[]): Promise<AnnixOrbitProfile[]> {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { userId: In(userIds) } });
  }

  findByIdentityStatuses(statuses: string[]): Promise<AnnixOrbitProfile[]> {
    if (statuses.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository
      .createQueryBuilder("profile")
      .where("profile.identity_verification ->> 'status' IN (:...statuses)", { statuses })
      .getMany();
  }

  adminPage(params: {
    userType: AnnixOrbitUserType | null;
    skip: number;
    take: number;
  }): Promise<AnnixOrbitProfile[]> {
    return this.repository.find({
      where: params.userType ? { userType: params.userType } : {},
      order: { createdAt: "DESC" },
      skip: params.skip,
      take: params.take,
    });
  }

  adminCount(userType: AnnixOrbitUserType | null): Promise<number> {
    return this.repository.count({ where: userType ? { userType } : {} });
  }

  findIndividualSeekers(): Promise<AnnixOrbitProfile[]> {
    return this.repository.find({
      where: { userType: In([AnnixOrbitUserType.INDIVIDUAL, AnnixOrbitUserType.STUDENT]) },
      order: { createdAt: "DESC" },
    });
  }
}
