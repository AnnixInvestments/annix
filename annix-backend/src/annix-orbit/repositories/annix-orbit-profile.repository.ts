import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitProfile, type AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";

export abstract class AnnixOrbitProfileRepository extends CrudRepository<AnnixOrbitProfile> {
  abstract findByUserId(userId: number): Promise<AnnixOrbitProfile | null>;
  abstract findByUserIdWithCompany(userId: number): Promise<AnnixOrbitProfile | null>;
  abstract teamMembers(companyId: number): Promise<AnnixOrbitProfile[]>;
  abstract findByCompanyWithUser(companyId: number): Promise<AnnixOrbitProfile[]>;
  abstract findDigestEnabledForCompany(companyId: number): Promise<AnnixOrbitProfile[]>;
  abstract digestEnabledCompanyIds(): Promise<number[]>;
  abstract findByValidDeletionToken(token: string, now: Date): Promise<AnnixOrbitProfile | null>;
  abstract findByCalendarFeedToken(token: string): Promise<AnnixOrbitProfile | null>;
  abstract setPushEnabledForUser(userId: number, enabled: boolean): Promise<void>;
  abstract setSelectedTier(userId: number, tier: string): Promise<void>;
  abstract findByUserIds(userIds: number[]): Promise<AnnixOrbitProfile[]>;
  abstract findByIdentityStatuses(statuses: string[]): Promise<AnnixOrbitProfile[]>;
  abstract adminPage(params: {
    userType: AnnixOrbitUserType | null;
    skip: number;
    take: number;
  }): Promise<AnnixOrbitProfile[]>;
  abstract adminCount(userType: AnnixOrbitUserType | null): Promise<number>;
}
