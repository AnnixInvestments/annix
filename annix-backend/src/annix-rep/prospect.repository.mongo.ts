import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Prospect, ProspectStatus } from "./entities/prospect.entity";
import { ProspectRawCount, ProspectRepository } from "./prospect.repository";

@Injectable()
export class MongoProspectRepository
  extends MongoCrudRepository<Prospect>
  implements ProspectRepository
{
  constructor(@InjectModel("Prospect") model: Model<Prospect>) {
    super(model);
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number): number => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async findByOwner(ownerId: number, limit: number): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByOwnerAndStatus(ownerId: number, status: ProspectStatus): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId, status })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByOwnerAndId(ownerId: number, id: number): Promise<Prospect | null> {
    const doc = await this.documents.findOne({ _id: id, ownerId }).lean().exec();
    return this.toDomain(doc);
  }

  async findAllByOwner(ownerId: number): Promise<Prospect[]> {
    const docs = await this.documents.find({ ownerId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByOwnerUpdatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId, updatedAt: { $gte: from, $lte: to } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findWonByOwnerUpdatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]> {
    const docs = await this.documents
      .find({
        ownerId,
        status: ProspectStatus.WON,
        updatedAt: { $gte: from, $lte: to },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByOwnerOrderedByValue(ownerId: number): Promise<Prospect[]> {
    const docs = await this.documents.find({ ownerId }).sort({ estimatedValue: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByOwnerOrderedByCreated(ownerId: number): Promise<Prospect[]> {
    const docs = await this.documents.find({ ownerId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByOwnerCreatedInRange(ownerId: number, from: Date, to: Date): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId, createdAt: { $gte: from, $lte: to } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOwnerIdSelections(ownerId: number): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId }, { googlePlaceId: 1, externalId: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByOwnerInIds(ownerId: number, ids: number[]): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId, _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByOwnerInIdsSelectId(ownerId: number, ids: number[]): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId, _id: { $in: ids } }, { _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIds(ids: number[]): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findWithOwner(id: number): Promise<Prospect | null> {
    const doc = await this.documents.findById(id).populate("owner").lean().exec();
    return this.toDomain(doc);
  }

  async updateStatusForOwner(
    ownerId: number,
    ids: number[],
    status: ProspectStatus,
  ): Promise<void> {
    await this.documents.updateMany({ _id: { $in: ids }, ownerId }, { $set: { status } }).exec();
  }

  async deleteByOwnerInIds(ownerId: number, ids: number[]): Promise<void> {
    await this.documents.deleteMany({ _id: { $in: ids }, ownerId }).exec();
  }

  async deleteByIds(ids: number[]): Promise<void> {
    await this.documents.deleteMany({ _id: { $in: ids } }).exec();
  }

  async findNearby(
    ownerId: number,
    latitude: number,
    longitude: number,
    radiusKm: number,
    limit: number,
  ): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId, latitude: { $ne: null }, longitude: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(docs)
      .map((prospect) => ({
        prospect,
        distance: this.haversineKm(
          latitude,
          longitude,
          Number(prospect.latitude),
          Number(prospect.longitude),
        ),
      }))
      .filter((entry) => entry.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map((entry) => entry.prospect);
  }

  async countByStatusGrouped(ownerId: number): Promise<ProspectRawCount[]> {
    const rows = await this.documents
      .aggregate<{ _id: string; count: number }>([
        { $match: { ownerId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .exec();
    return rows.map((row) => ({ status: row._id, count: String(row.count) }));
  }

  async findFollowUpsDue(ownerId: number, asOf: Date): Promise<Prospect[]> {
    const docs = await this.documents
      .find({
        ownerId,
        nextFollowUpAt: { $lte: asOf },
        status: { $nin: [ProspectStatus.WON, ProspectStatus.LOST] },
      })
      .sort({ nextFollowUpAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findExistingExternalIds(ownerId: number): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId }, { googlePlaceId: 1, externalId: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOwnerDuplicate(ownerId: number, externalId: string): Promise<Prospect | null> {
    const doc = await this.documents
      .findOne({
        ownerId,
        $or: [{ googlePlaceId: externalId }, { externalId }],
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOwnerByNormalizedPhone(
    ownerId: number,
    phoneFragment: string,
  ): Promise<Prospect | null> {
    const docs = await this.documents.find({ ownerId }).lean().exec();
    const match = this.toDomainList(docs).find((prospect) => {
      const normalized = (prospect.contactPhone ?? "").replace(/[\s\-+]/g, "");
      return normalized.includes(phoneFragment);
    });
    return match ?? null;
  }

  async findOwnerByNameAndCity(
    ownerId: number,
    companyName: string,
    city: string,
  ): Promise<Prospect | null> {
    const doc = await this.documents
      .findOne({
        ownerId,
        companyName: { $regex: `^${companyName}$`, $options: "i" },
        city: { $regex: `^${city}$`, $options: "i" },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOverdueFollowUps(asOf: Date): Promise<Prospect[]> {
    const docs = await this.documents
      .find({
        nextFollowUpAt: { $lte: asOf },
        status: { $lte: ProspectStatus.PROPOSAL },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByCrmExternalId(crmExternalId: string, ownerId: number): Promise<Prospect | null> {
    const doc = await this.documents.findOne({ crmExternalId, ownerId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByOwnerAndIdOrdered(prospectId: number, ownerId: number): Promise<Prospect | null> {
    const doc = await this.documents.findOne({ _id: prospectId, ownerId }).lean().exec();
    return this.toDomain(doc);
  }

  async findByOrganization(organizationId: number): Promise<Prospect[]> {
    const docs = await this.documents.find({ organizationId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByOrganizationSelectValueStatus(organizationId: number): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ organizationId }, { estimatedValue: 1, status: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countByOrganization(organizationId: number): Promise<number> {
    return this.documents.countDocuments({ organizationId }).exec();
  }

  countByOrganizationAndStatusInRange(
    organizationId: number,
    status: ProspectStatus,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.documents
      .countDocuments({
        organizationId,
        status,
        updatedAt: { $gte: from, $lte: to },
      })
      .exec();
  }

  countByOwnerAndOrganization(ownerId: number, organizationId: number): Promise<number> {
    return this.documents.countDocuments({ ownerId, organizationId }).exec();
  }

  countByOwnerOrganizationStatusInRange(
    ownerId: number,
    organizationId: number,
    status: ProspectStatus,
    from: Date,
    to: Date,
  ): Promise<number> {
    return this.documents
      .countDocuments({
        ownerId,
        organizationId,
        status,
        updatedAt: { $gte: from, $lte: to },
      })
      .exec();
  }

  async findByOwnerAndOrganizationSelectValueStatus(
    ownerId: number,
    organizationId: number,
  ): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ ownerId, organizationId }, { estimatedValue: 1, status: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByTerritorySelectValueStatus(territoryId: number): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ territoryId }, { estimatedValue: 1, status: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countByTerritory(territoryId: number): Promise<number> {
    return this.documents.countDocuments({ territoryId }).exec();
  }

  async findByTerritoryWithOwner(territoryId: number): Promise<Prospect[]> {
    const docs = await this.documents
      .find({ territoryId })
      .populate("owner")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOrganizationOverdueFollowUps(
    organizationId: number,
    asOf: Date,
    limit: number,
  ): Promise<Prospect[]> {
    const docs = await this.documents
      .find({
        organizationId,
        nextFollowUpAt: { $lt: asOf },
        status: { $nin: [ProspectStatus.WON, ProspectStatus.LOST] },
      })
      .populate("owner")
      .sort({ nextFollowUpAt: 1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countByOwnerCrmSynced(ownerId: number): Promise<number> {
    return this.documents.countDocuments({ ownerId, crmExternalId: { $ne: null } }).exec();
  }

  countByOwner(ownerId: number): Promise<number> {
    return this.documents.countDocuments({ ownerId }).exec();
  }

  async findActiveWithLocationForOwner(
    ownerId: number,
    statuses: ProspectStatus[],
  ): Promise<Prospect[]> {
    const docs = await this.documents
      .find({
        ownerId,
        status: { $in: statuses },
        latitude: { $ne: null },
        longitude: { $ne: null },
      })
      .sort({ priority: -1, lastContactedAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async saveMany(prospects: Prospect[]): Promise<Prospect[]> {
    return Promise.all(prospects.map((prospect) => this.save(prospect)));
  }

  async createMany(prospects: Array<DeepPartial<Prospect>>): Promise<Prospect[]> {
    return Promise.all(prospects.map((prospect) => this.create(prospect)));
  }
}
