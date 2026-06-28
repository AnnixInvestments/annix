import { CrudRepository } from "../../lib/persistence/crud-repository";
import {
  AnnixOrbitProfile,
  type AnnixOrbitSeekerSubscription,
  type AnnixOrbitUserType,
} from "../entities/annix-orbit-profile.entity";
import type { OrbitBillingStatus } from "../lib/seeker-entitlement";

export interface SeekerBillingUpdate {
  entitledTier?: string;
  billingStatus?: OrbitBillingStatus;
  paidUntil?: Date | null;
  subscription?: Partial<AnnixOrbitSeekerSubscription>;
}

export interface NotificationPreferencesUpdate {
  matchAlertThreshold?: number;
  digestEnabled?: boolean;
  pushEnabled?: boolean;
}

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
  /** Partial update of the seeker/recruiter notification prefs; ignores undefined keys. */
  abstract setNotificationPreferences(
    userId: number,
    prefs: NotificationPreferencesUpdate,
  ): Promise<void>;
  /** Job-seeker profiles (individual + student) WITH their core user populated. */
  abstract findSeekersWithUser(): Promise<AnnixOrbitProfile[]>;
  abstract setSelectedTier(userId: number, tier: string): Promise<void>;
  abstract applyBillingUpdate(userId: number, update: SeekerBillingUpdate): Promise<void>;
  abstract findByUserIds(userIds: number[]): Promise<AnnixOrbitProfile[]>;
  abstract findByIdentityStatuses(statuses: string[]): Promise<AnnixOrbitProfile[]>;
  abstract adminPage(params: {
    userType: AnnixOrbitUserType | null;
    skip: number;
    take: number;
  }): Promise<AnnixOrbitProfile[]>;
  abstract adminCount(userType: AnnixOrbitUserType | null): Promise<number>;
  // All registered job-seeker profiles (individual + student). Surfaces
  // self-registered seekers on the admin Seekers / seeker-testing pages even
  // when they have no candidate record (no CV uploaded) or app-access row.
  abstract findIndividualSeekers(): Promise<AnnixOrbitProfile[]>;
  abstract userPhonePairs(): Promise<Array<{ userId: number; phone: string }>>;
}
