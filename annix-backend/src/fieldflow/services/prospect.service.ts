import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { CreateProspectDto, NearbyProspectsQueryDto, UpdateProspectDto } from "../dto";
import { Prospect, ProspectStatus } from "../entities";

@Injectable()
export class ProspectService {
  private readonly logger = new Logger(ProspectService.name);

  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
  ) {}

  async create(ownerId: number, dto: CreateProspectDto): Promise<Prospect> {
    const prospect = this.prospectRepo.create({
      ownerId,
      companyName: dto.companyName,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      contactTitle: dto.contactTitle ?? null,
      streetAddress: dto.streetAddress ?? null,
      city: dto.city ?? null,
      province: dto.province ?? null,
      postalCode: dto.postalCode ?? null,
      country: dto.country ?? "South Africa",
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      googlePlaceId: dto.googlePlaceId ?? null,
      status: dto.status ?? ProspectStatus.NEW,
      priority: dto.priority,
      notes: dto.notes ?? null,
      tags: dto.tags ?? null,
      estimatedValue: dto.estimatedValue ?? null,
      nextFollowUpAt: dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null,
      customFields: dto.customFields ?? null,
    });

    const saved = await this.prospectRepo.save(prospect);
    this.logger.log(`Prospect created: ${saved.id} by user ${ownerId}`);
    return saved;
  }

  async findAll(ownerId: number): Promise<Prospect[]> {
    return this.prospectRepo.find({
      where: { ownerId },
      order: { updatedAt: "DESC" },
    });
  }

  async findByStatus(ownerId: number, status: ProspectStatus): Promise<Prospect[]> {
    return this.prospectRepo.find({
      where: { ownerId, status },
      order: { updatedAt: "DESC" },
    });
  }

  async findOne(ownerId: number, id: number): Promise<Prospect> {
    const prospect = await this.prospectRepo.findOne({
      where: { id, ownerId },
    });

    if (!prospect) {
      throw new NotFoundException(`Prospect ${id} not found`);
    }

    return prospect;
  }

  async update(ownerId: number, id: number, dto: UpdateProspectDto): Promise<Prospect> {
    const prospect = await this.findOne(ownerId, id);

    const updateData: Partial<Prospect> = {};

    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.contactName !== undefined) updateData.contactName = dto.contactName ?? null;
    if (dto.contactEmail !== undefined) updateData.contactEmail = dto.contactEmail ?? null;
    if (dto.contactPhone !== undefined) updateData.contactPhone = dto.contactPhone ?? null;
    if (dto.contactTitle !== undefined) updateData.contactTitle = dto.contactTitle ?? null;
    if (dto.streetAddress !== undefined) updateData.streetAddress = dto.streetAddress ?? null;
    if (dto.city !== undefined) updateData.city = dto.city ?? null;
    if (dto.province !== undefined) updateData.province = dto.province ?? null;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode ?? null;
    if (dto.country !== undefined) updateData.country = dto.country ?? "South Africa";
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude ?? null;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude ?? null;
    if (dto.googlePlaceId !== undefined) updateData.googlePlaceId = dto.googlePlaceId ?? null;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.notes !== undefined) updateData.notes = dto.notes ?? null;
    if (dto.tags !== undefined) updateData.tags = dto.tags ?? null;
    if (dto.estimatedValue !== undefined) updateData.estimatedValue = dto.estimatedValue ?? null;
    if (dto.nextFollowUpAt !== undefined) {
      updateData.nextFollowUpAt = dto.nextFollowUpAt ? new Date(dto.nextFollowUpAt) : null;
    }
    if (dto.customFields !== undefined) updateData.customFields = dto.customFields ?? null;

    Object.assign(prospect, updateData);
    return this.prospectRepo.save(prospect);
  }

  async updateStatus(ownerId: number, id: number, status: ProspectStatus): Promise<Prospect> {
    const prospect = await this.findOne(ownerId, id);
    prospect.status = status;
    return this.prospectRepo.save(prospect);
  }

  async markContacted(ownerId: number, id: number): Promise<Prospect> {
    const prospect = await this.findOne(ownerId, id);
    prospect.lastContactedAt = now().toJSDate();
    return this.prospectRepo.save(prospect);
  }

  async remove(ownerId: number, id: number): Promise<void> {
    const prospect = await this.findOne(ownerId, id);
    await this.prospectRepo.remove(prospect);
    this.logger.log(`Prospect deleted: ${id} by user ${ownerId}`);
  }

  async findNearby(ownerId: number, query: NearbyProspectsQueryDto): Promise<Prospect[]> {
    const radiusKm = query.radiusKm ?? 10;
    const limit = query.limit ?? 20;

    const results = await this.prospectRepo
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
        { lat: query.latitude, lng: query.longitude, radius: radiusKm },
      )
      .orderBy(
        `6371 * acos(
          cos(radians(:lat)) * cos(radians(prospect.latitude)) *
          cos(radians(prospect.longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(prospect.latitude))
        )`,
        "ASC",
      )
      .setParameter("lat", query.latitude)
      .setParameter("lng", query.longitude)
      .limit(limit)
      .getMany();

    return results;
  }

  async countByStatus(ownerId: number): Promise<Record<ProspectStatus, number>> {
    const results = await this.prospectRepo
      .createQueryBuilder("prospect")
      .select("prospect.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("prospect.owner_id = :ownerId", { ownerId })
      .groupBy("prospect.status")
      .getRawMany();

    const counts = Object.values(ProspectStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<ProspectStatus, number>,
    );

    results.forEach((r) => {
      counts[r.status as ProspectStatus] = parseInt(r.count, 10);
    });

    return counts;
  }

  async followUpsDue(ownerId: number): Promise<Prospect[]> {
    return this.prospectRepo
      .createQueryBuilder("prospect")
      .where("prospect.owner_id = :ownerId", { ownerId })
      .andWhere("prospect.next_follow_up_at <= :now", { now: now().toJSDate() })
      .andWhere("prospect.status NOT IN (:...closedStatuses)", {
        closedStatuses: [ProspectStatus.WON, ProspectStatus.LOST],
      })
      .orderBy("prospect.next_follow_up_at", "ASC")
      .getMany();
  }
}
