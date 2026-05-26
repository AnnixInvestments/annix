import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import { Prospect, ProspectStatus } from "./entities/prospect.entity";

export interface ProspectRawCount {
  status: string;
  count: string;
}

export abstract class ProspectRepository extends CrudRepository<Prospect> {
  abstract findByOwner(ownerId: number, limit: number): Promise<Prospect[]>;
  abstract findByOwnerAndStatus(ownerId: number, status: ProspectStatus): Promise<Prospect[]>;
  abstract findByOwnerAndId(ownerId: number, id: number): Promise<Prospect | null>;
  abstract findAllByOwner(ownerId: number): Promise<Prospect[]>;
  abstract findByOwnerUpdatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]>;
  abstract findWonByOwnerUpdatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]>;
  abstract findByOwnerOrderedByValue(ownerId: number): Promise<Prospect[]>;
  abstract findByOwnerOrderedByCreated(ownerId: number): Promise<Prospect[]>;
  abstract findByOwnerCreatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]>;
  abstract findOwnerIdSelections(ownerId: number): Promise<Prospect[]>;
  abstract findByOwnerInIds(ownerId: number, ids: number[]): Promise<Prospect[]>;
  abstract findByOwnerInIdsSelectId(ownerId: number, ids: number[]): Promise<Prospect[]>;
  abstract findByIds(ids: number[]): Promise<Prospect[]>;
  abstract findWithOwner(id: number): Promise<Prospect | null>;
  abstract updateStatusForOwner(
    ownerId: number,
    ids: number[],
    status: ProspectStatus,
  ): Promise<void>;
  abstract deleteByOwnerInIds(ownerId: number, ids: number[]): Promise<void>;
  abstract deleteByIds(ids: number[]): Promise<void>;
  abstract findNearby(
    ownerId: number,
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number,
  ): Promise<Prospect[]>;
  abstract countByStatusGrouped(ownerId: number): Promise<ProspectRawCount[]>;
  abstract findFollowUpsDue(ownerId: number, asOf: Date): Promise<Prospect[]>;
  abstract findExistingExternalIds(ownerId: number): Promise<Prospect[]>;
  abstract findOwnerDuplicate(ownerId: number, externalId: string): Promise<Prospect | null>;
  abstract findOwnerByNormalizedPhone(
    ownerId: number,
    phoneFragment: string,
  ): Promise<Prospect | null>;
  abstract findOwnerByNameAndCity(
    ownerId: number,
    companyName: string,
    city: string,
  ): Promise<Prospect | null>;
  abstract findOverdueFollowUps(asOf: Date): Promise<Prospect[]>;
  abstract findByCrmExternalId(crmExternalId: string, ownerId: number): Promise<Prospect | null>;
  abstract findByOwnerAndIdOrdered(prospectId: number, ownerId: number): Promise<Prospect | null>;
  abstract findByOrganization(organizationId: number): Promise<Prospect[]>;
  abstract findByOrganizationSelectValueStatus(organizationId: number): Promise<Prospect[]>;
  abstract countByOrganization(organizationId: number): Promise<number>;
  abstract countByOrganizationAndStatusInRange(
    organizationId: number,
    status: ProspectStatus,
    from: Date,
    to: Date,
  ): Promise<number>;
  abstract countByOwnerAndOrganization(ownerId: number, organizationId: number): Promise<number>;
  abstract countByOwnerOrganizationStatusInRange(
    ownerId: number,
    organizationId: number,
    status: ProspectStatus,
    from: Date,
    to: Date,
  ): Promise<number>;
  abstract findByOwnerAndOrganizationSelectValueStatus(
    ownerId: number,
    organizationId: number,
  ): Promise<Prospect[]>;
  abstract findByTerritorySelectValueStatus(territoryId: number): Promise<Prospect[]>;
  abstract countByTerritory(territoryId: number): Promise<number>;
  abstract findByTerritoryWithOwner(territoryId: number): Promise<Prospect[]>;
  abstract findOrganizationOverdueFollowUps(
    organizationId: number,
    asOf: Date,
    limit: number,
  ): Promise<Prospect[]>;
  abstract countByOwnerCrmSynced(ownerId: number): Promise<number>;
  abstract countByOwner(ownerId: number): Promise<number>;
  abstract findActiveWithLocationForOwner(
    ownerId: number,
    statuses: ProspectStatus[],
  ): Promise<Prospect[]>;
  abstract saveMany(prospects: Prospect[]): Promise<Prospect[]>;
  abstract createMany(prospects: Array<DeepPartial<Prospect>>): Promise<Prospect[]>;
}
