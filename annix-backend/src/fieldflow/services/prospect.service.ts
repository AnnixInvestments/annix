import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  BulkDeleteResponseDto,
  BulkUpdateStatusResponseDto,
  CreateProspectDto,
  ImportProspectRowDto,
  ImportProspectsResultDto,
  NearbyProspectsQueryDto,
  UpdateProspectDto,
} from "../dto";
import { Prospect, ProspectPriority, ProspectStatus } from "../entities";

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

  async bulkUpdateStatus(
    ownerId: number,
    ids: number[],
    status: ProspectStatus,
  ): Promise<BulkUpdateStatusResponseDto> {
    const ownedProspects = await this.prospectRepo.find({
      where: { ownerId, id: In(ids) },
      select: ["id"],
    });

    const ownedIds = ownedProspects.map((p) => p.id);
    const notFoundIds = ids.filter((id) => !ownedIds.includes(id));

    if (ownedIds.length > 0) {
      await this.prospectRepo.update({ id: In(ownedIds), ownerId }, { status });
      this.logger.log(
        `Bulk status update: ${ownedIds.length} prospects to ${status} by user ${ownerId}`,
      );
    }

    return {
      updated: ownedIds.length,
      updatedIds: ownedIds,
      notFoundIds,
    };
  }

  async bulkDelete(ownerId: number, ids: number[]): Promise<BulkDeleteResponseDto> {
    const ownedProspects = await this.prospectRepo.find({
      where: { ownerId, id: In(ids) },
      select: ["id"],
    });

    const ownedIds = ownedProspects.map((p) => p.id);
    const notFoundIds = ids.filter((id) => !ownedIds.includes(id));

    if (ownedIds.length > 0) {
      await this.prospectRepo.delete({ id: In(ownedIds), ownerId });
      this.logger.log(`Bulk delete: ${ownedIds.length} prospects by user ${ownerId}`);
    }

    return {
      deleted: ownedIds.length,
      deletedIds: ownedIds,
      notFoundIds,
    };
  }

  async exportToCsv(ownerId: number): Promise<string> {
    const prospects = await this.findAll(ownerId);

    const headers = [
      "ID",
      "Company Name",
      "Contact Name",
      "Contact Email",
      "Contact Phone",
      "Contact Title",
      "Street Address",
      "City",
      "Province",
      "Postal Code",
      "Country",
      "Latitude",
      "Longitude",
      "Status",
      "Priority",
      "Estimated Value",
      "Tags",
      "Notes",
      "Last Contacted",
      "Next Follow-Up",
      "Created At",
      "Updated At",
    ];

    const escapeField = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = prospects.map((p) =>
      [
        p.id,
        escapeField(p.companyName),
        escapeField(p.contactName),
        escapeField(p.contactEmail),
        escapeField(p.contactPhone),
        escapeField(p.contactTitle),
        escapeField(p.streetAddress),
        escapeField(p.city),
        escapeField(p.province),
        escapeField(p.postalCode),
        escapeField(p.country),
        p.latitude ?? "",
        p.longitude ?? "",
        p.status,
        p.priority,
        p.estimatedValue ?? "",
        escapeField(p.tags?.join("; ")),
        escapeField(p.notes),
        p.lastContactedAt?.toISOString() ?? "",
        p.nextFollowUpAt?.toISOString() ?? "",
        p.createdAt.toISOString(),
        p.updatedAt.toISOString(),
      ].join(","),
    );

    return [headers.join(","), ...rows].join("\n");
  }

  async findDuplicates(
    ownerId: number,
  ): Promise<Array<{ field: string; value: string; prospects: Prospect[] }>> {
    const prospects = await this.findAll(ownerId);
    const duplicates: Array<{ field: string; value: string; prospects: Prospect[] }> = [];

    const checkDuplicates = (
      field: "companyName" | "contactEmail" | "contactPhone",
      fieldLabel: string,
    ) => {
      const valueMap = new Map<string, Prospect[]>();

      prospects.forEach((p) => {
        const value = p[field];
        if (value) {
          const normalizedValue = value.toLowerCase().trim();
          const existing = valueMap.get(normalizedValue) ?? [];
          valueMap.set(normalizedValue, [...existing, p]);
        }
      });

      valueMap.forEach((matchingProspects, value) => {
        if (matchingProspects.length > 1) {
          duplicates.push({
            field: fieldLabel,
            value,
            prospects: matchingProspects,
          });
        }
      });
    };

    checkDuplicates("companyName", "Company Name");
    checkDuplicates("contactEmail", "Email");
    checkDuplicates("contactPhone", "Phone");

    return duplicates;
  }

  async importFromCsv(
    ownerId: number,
    rows: ImportProspectRowDto[],
    skipInvalid = true,
  ): Promise<ImportProspectsResultDto> {
    const result: ImportProspectsResultDto = {
      imported: 0,
      skipped: 0,
      errors: [],
      createdIds: [],
    };

    const validStatuses = Object.values(ProspectStatus);
    const validPriorities = Object.values(ProspectPriority);

    const processedProspects = rows.map((row, index) => {
      if (!row.companyName?.trim()) {
        return { row: index + 1, error: "Company name is required", data: null };
      }

      const status = row.status?.toLowerCase() as ProspectStatus;
      const priority = row.priority?.toLowerCase() as ProspectPriority;

      if (row.status && !validStatuses.includes(status)) {
        return { row: index + 1, error: `Invalid status: ${row.status}`, data: null };
      }

      if (row.priority && !validPriorities.includes(priority)) {
        return { row: index + 1, error: `Invalid priority: ${row.priority}`, data: null };
      }

      const estimatedValue = row.estimatedValue
        ? parseFloat(row.estimatedValue.replace(/[^0-9.-]/g, ""))
        : null;

      const tags = row.tags
        ? row.tags
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : null;

      return {
        row: index + 1,
        error: null,
        data: {
          ownerId,
          companyName: row.companyName.trim(),
          contactName: row.contactName?.trim() ?? null,
          contactEmail: row.contactEmail?.trim() ?? null,
          contactPhone: row.contactPhone?.trim() ?? null,
          contactTitle: row.contactTitle?.trim() ?? null,
          streetAddress: row.streetAddress?.trim() ?? null,
          city: row.city?.trim() ?? null,
          province: row.province?.trim() ?? null,
          postalCode: row.postalCode?.trim() ?? null,
          country: row.country?.trim() ?? "South Africa",
          status: status || ProspectStatus.NEW,
          priority: priority || ProspectPriority.MEDIUM,
          notes: row.notes?.trim() ?? null,
          tags,
          estimatedValue: Number.isNaN(estimatedValue) ? null : estimatedValue,
        },
      };
    });

    const validProspects = processedProspects.filter((p) => p.data !== null);
    const invalidProspects = processedProspects.filter((p) => p.error !== null);

    result.errors = invalidProspects.map((p) => ({ row: p.row, error: p.error! }));
    result.skipped = invalidProspects.length;

    if (!skipInvalid && invalidProspects.length > 0) {
      return result;
    }

    if (validProspects.length > 0) {
      const prospects = validProspects.map((p) => this.prospectRepo.create(p.data!));
      const saved = await this.prospectRepo.save(prospects);
      result.imported = saved.length;
      result.createdIds = saved.map((p) => p.id);
      this.logger.log(`Imported ${saved.length} prospects for user ${ownerId}`);
    }

    return result;
  }
}
