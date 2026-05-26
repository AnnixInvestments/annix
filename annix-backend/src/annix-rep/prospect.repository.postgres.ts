import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Between,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Not,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Prospect, ProspectStatus } from "./entities/prospect.entity";
import { ProspectRawCount, ProspectRepository } from "./prospect.repository";

@Injectable()
export class PostgresProspectRepository
  extends TypeOrmCrudRepository<Prospect>
  implements ProspectRepository
{
  constructor(@InjectRepository(Prospect) repository: Repository<Prospect>) {
    super(repository);
  }

  findByOwner(ownerId: number, limit: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId },
      order: { updatedAt: "DESC" },
      take: limit,
    });
  }

  findByOwnerAndStatus(ownerId: number, status: ProspectStatus): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId, status },
      order: { updatedAt: "DESC" },
    });
  }

  findByOwnerAndId(ownerId: number, id: number): Promise<Prospect | null> {
    return this.repository.findOne({ where: { id, ownerId } });
  }

  findAllByOwner(ownerId: number): Promise<Prospect[]> {
    return this.repository.find({ where: { ownerId } });
  }

  findByOwnerUpdatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]> {
    return this.repository.find({
      where: {
        ownerId,
        updatedAt: Between(from, to),
      },
    });
  }

  findWonByOwnerUpdatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]> {
    return this.repository.find({
      where: {
        ownerId,
        status: ProspectStatus.WON,
        updatedAt: Between(from, to),
      },
    });
  }

  findByOwnerOrderedByValue(ownerId: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId },
      order: { estimatedValue: "DESC" },
    });
  }

  findByOwnerOrderedByCreated(ownerId: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId },
      order: { createdAt: "DESC" },
    });
  }

  findByOwnerCreatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]> {
    return this.repository.find({
      where: {
        ownerId,
        createdAt: Between(from, to),
      },
    });
  }

  findOwnerIdSelections(ownerId: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId },
      select: ["googlePlaceId", "externalId"],
    });
  }

  findByOwnerInIds(ownerId: number, ids: number[]): Promise<Prospect[]> {
    return this.repository.find({ where: { ownerId, id: In(ids) } });
  }

  findByOwnerInIdsSelectId(ownerId: number, ids: number[]): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId, id: In(ids) },
      select: ["id"],
    });
  }

  findByIds(ids: number[]): Promise<Prospect[]> {
    return this.repository.find({ where: { id: In(ids) } });
  }

  findWithOwner(id: number): Promise<Prospect | null> {
    return this.repository.findOne({ where: { id }, relations: ["owner"] });
  }

  async updateStatusForOwner(
    ownerId: number,
    ids: number[],
    status: ProspectStatus,
  ): Promise<void> {
    await this.repository.update({ id: In(ids), ownerId }, { status });
  }

  async deleteByOwnerInIds(ownerId: number, ids: number[]): Promise<void> {
    await this.repository.delete({ id: In(ids), ownerId });
  }

  async deleteByIds(ids: number[]): Promise<void> {
    await this.repository.delete({ id: In(ids) });
  }

  findNearby(
    ownerId: number,
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number,
  ): Promise<Prospect[]> {
    return this.repository
      .createQueryBuilder("prospect")
      .where("prospect.owner_id = :ownerId", { ownerId })
      .andWhere("prospect.latitude IS NOT NULL")
      .andWhere("prospect.longitude IS NOT NULL")
      .andWhere(
        `(
          6371 * acos(
            cos(radians(:lat)) * cos(radians(prospect.latitude)) *
            cos(radians(prospect.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(prospect.latitude))
          )
        ) <= :radius`,
        { lat: latitude, lng: longitude, radius: radiusKm },
      )
      .orderBy(
        `6371 * acos(
          cos(radians(:lat)) * cos(radians(prospect.latitude)) *
          cos(radians(prospect.longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(prospect.latitude))
        )`,
        "ASC",
      )
      .setParameter("lat", latitude)
      .setParameter("lng", longitude)
      .limit(limit)
      .getMany();
  }

  countByStatusGrouped(ownerId: number): Promise<ProspectRawCount[]> {
    return this.repository
      .createQueryBuilder("prospect")
      .select("prospect.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("prospect.owner_id = :ownerId", { ownerId })
      .groupBy("prospect.status")
      .getRawMany();
  }

  findFollowUpsDue(ownerId: number, asOf: Date): Promise<Prospect[]> {
    return this.repository
      .createQueryBuilder("prospect")
      .where("prospect.owner_id = :ownerId", { ownerId })
      .andWhere("prospect.next_follow_up_at <= :now", { now: asOf })
      .andWhere("prospect.status NOT IN (:...closedStatuses)", {
        closedStatuses: [ProspectStatus.WON, ProspectStatus.LOST],
      })
      .orderBy("prospect.next_follow_up_at", "ASC")
      .getMany();
  }

  findExistingExternalIds(ownerId: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId },
      select: ["googlePlaceId", "externalId"],
    });
  }

  findOwnerDuplicate(ownerId: number, externalId: string): Promise<Prospect | null> {
    return this.repository.findOne({
      where: [
        { ownerId, googlePlaceId: externalId },
        { ownerId, externalId },
      ],
    });
  }

  findOwnerByNormalizedPhone(ownerId: number, phoneFragment: string): Promise<Prospect | null> {
    return this.repository
      .createQueryBuilder("prospect")
      .where("prospect.owner_id = :userId", { userId: ownerId })
      .andWhere(
        "REPLACE(REPLACE(REPLACE(prospect.contact_phone, ' ', ''), '-', ''), '+', '') LIKE :phone",
        { phone: `%${phoneFragment}%` },
      )
      .getOne();
  }

  findOwnerByNameAndCity(
    ownerId: number,
    companyName: string,
    city: string,
  ): Promise<Prospect | null> {
    return this.repository
      .createQueryBuilder("prospect")
      .where("prospect.owner_id = :userId", { userId: ownerId })
      .andWhere("LOWER(prospect.company_name) = LOWER(:name)", {
        name: companyName,
      })
      .andWhere("LOWER(prospect.city) = LOWER(:city)", {
        city,
      })
      .getOne();
  }

  findOverdueFollowUps(asOf: Date): Promise<Prospect[]> {
    return this.repository.find({
      where: {
        nextFollowUpAt: LessThanOrEqual(asOf),
        status: LessThanOrEqual(ProspectStatus.PROPOSAL) as unknown as ProspectStatus,
      },
    });
  }

  findByCrmExternalId(crmExternalId: string, ownerId: number): Promise<Prospect | null> {
    return this.repository.findOne({
      where: { crmExternalId, ownerId },
    });
  }

  findByOwnerAndIdOrdered(prospectId: number, ownerId: number): Promise<Prospect | null> {
    return this.repository.findOne({
      where: { id: prospectId, ownerId },
    });
  }

  findByOrganization(organizationId: number): Promise<Prospect[]> {
    return this.repository.find({ where: { organizationId } });
  }

  findByOrganizationSelectValueStatus(organizationId: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { organizationId },
      select: ["estimatedValue", "status"],
    });
  }

  countByOrganization(organizationId: number): Promise<number> {
    return this.repository.count({ where: { organizationId } });
  }

  countByOrganizationAndStatusInRange(
    organizationId: number,
    status: ProspectStatus,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.repository.count({
      where: {
        organizationId,
        status,
        updatedAt: Between(from, to),
      },
    });
  }

  countByOwnerAndOrganization(ownerId: number, organizationId: number): Promise<number> {
    return this.repository.count({ where: { ownerId, organizationId } });
  }

  countByOwnerOrganizationStatusInRange(
    ownerId: number,
    organizationId: number,
    status: ProspectStatus,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.repository.count({
      where: {
        ownerId,
        organizationId,
        status,
        updatedAt: Between(from, to),
      },
    });
  }

  findByOwnerAndOrganizationSelectValueStatus(
    ownerId: number,
    organizationId: number,
  ): Promise<Prospect[]> {
    return this.repository.find({
      where: { ownerId, organizationId },
      select: ["estimatedValue", "status"],
    });
  }

  findByTerritorySelectValueStatus(territoryId: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { territoryId },
      select: ["estimatedValue", "status"],
    });
  }

  countByTerritory(territoryId: number): Promise<number> {
    return this.repository.count({ where: { territoryId } });
  }

  findByTerritoryWithOwner(territoryId: number): Promise<Prospect[]> {
    return this.repository.find({
      where: { territoryId },
      relations: ["owner"],
      order: { createdAt: "DESC" },
    });
  }

  findOrganizationOverdueFollowUps(
    organizationId: number,
    asOf: Date,
    limit: number,
  ): Promise<Prospect[]> {
    return this.repository.find({
      where: {
        organizationId,
        nextFollowUpAt: LessThan(asOf),
        status: Not(In([ProspectStatus.WON, ProspectStatus.LOST])),
      },
      relations: ["owner"],
      order: { nextFollowUpAt: "ASC" },
      take: limit,
    });
  }

  countByOwnerCrmSynced(ownerId: number): Promise<number> {
    return this.repository.count({
      where: { ownerId, crmExternalId: Not(IsNull()) },
    });
  }

  countByOwner(ownerId: number): Promise<number> {
    return this.repository.count({ where: { ownerId } });
  }

  findActiveWithLocationForOwner(ownerId: number, statuses: ProspectStatus[]): Promise<Prospect[]> {
    return this.repository.find({
      where: {
        ownerId,
        status: In(statuses),
        latitude: Not(IsNull()) as unknown as number,
        longitude: Not(IsNull()) as unknown as number,
      },
      order: { priority: "DESC", lastContactedAt: "ASC" },
    });
  }

  saveMany(prospects: Prospect[]): Promise<Prospect[]> {
    return this.repository.save(prospects);
  }

  createMany(prospects: Array<DeepPartial<Prospect>>): Promise<Prospect[]> {
    const entities = this.repository.create(prospects as TypeOrmDeepPartial<Prospect>[]);
    return this.repository.save(entities);
  }
}
