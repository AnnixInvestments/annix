import { forwardRef, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isDate, keys, values } from "es-toolkit/compat";
import { In, Repository } from "typeorm";
import { fromISO, now, nowMillis } from "../../lib/datetime";
import {
  BulkDeleteResponseDto,
  BulkTagOperationDto,
  BulkUpdateStatusResponseDto,
  CreateProspectDto,
  ImportProspectRowDto,
  ImportProspectsResultDto,
  MergeProspectsDto,
  NearbyProspectsQueryDto,
  UpdateProspectDto,
} from "../dto";
import { FollowUpRecurrence, Prospect, ProspectPriority, ProspectStatus } from "../entities";
import { ProspectActivityService } from "./prospect-activity.service";

@Injectable()
export class ProspectService {
  private readonly logger = new Logger(ProspectService.name);

  constructor(
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @Inject(forwardRef(() => ProspectActivityService))
    private readonly activityService: ProspectActivityService,
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
      nextFollowUpAt: dto.nextFollowUpAt ? fromISO(dto.nextFollowUpAt).toJSDate() : null,
      followUpRecurrence: dto.followUpRecurrence ?? FollowUpRecurrence.NONE,
      customFields: dto.customFields ?? null,
    });

    const saved = await this.prospectRepo.save(prospect);
    this.logger.log(`Prospect created: ${saved.id} by user ${ownerId}`);

    await this.activityService.logCreated(saved.id, ownerId, saved.companyName);

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

    const oldValues: Record<string, unknown> = {
      companyName: prospect.companyName,
      contactName: prospect.contactName,
      contactEmail: prospect.contactEmail,
      contactPhone: prospect.contactPhone,
      status: prospect.status,
      priority: prospect.priority,
      notes: prospect.notes,
      tags: prospect.tags,
      estimatedValue: prospect.estimatedValue,
    };

    const oldStatus = prospect.status;
    const oldTags = prospect.tags ? [...prospect.tags] : null;

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
      updateData.nextFollowUpAt = dto.nextFollowUpAt
        ? fromISO(dto.nextFollowUpAt).toJSDate()
        : null;
    }
    if (dto.followUpRecurrence !== undefined) {
      updateData.followUpRecurrence = dto.followUpRecurrence;
    }
    if (dto.customFields !== undefined) updateData.customFields = dto.customFields ?? null;

    Object.assign(prospect, updateData);
    const saved = await this.prospectRepo.save(prospect);

    if (dto.status !== undefined && dto.status !== oldStatus) {
      await this.activityService.logStatusChange(id, ownerId, oldStatus, dto.status);
    }

    if (dto.tags !== undefined) {
      await this.activityService.logTagsChanged(id, ownerId, oldTags, dto.tags ?? null);
    }

    const newValues: Record<string, unknown> = {
      companyName: saved.companyName,
      contactName: saved.contactName,
      contactEmail: saved.contactEmail,
      contactPhone: saved.contactPhone,
      status: saved.status,
      priority: saved.priority,
      notes: saved.notes,
      tags: saved.tags,
      estimatedValue: saved.estimatedValue,
    };

    const statusOrTagsChanged = dto.status !== undefined || dto.tags !== undefined;
    if (!statusOrTagsChanged) {
      await this.activityService.logFieldsUpdated(id, ownerId, oldValues, newValues);
    }

    return saved;
  }

  async updateStatus(ownerId: number, id: number, status: ProspectStatus): Promise<Prospect> {
    const prospect = await this.findOne(ownerId, id);
    const oldStatus = prospect.status;
    prospect.status = status;
    const saved = await this.prospectRepo.save(prospect);

    if (oldStatus !== status) {
      await this.activityService.logStatusChange(id, ownerId, oldStatus, status);
    }

    return saved;
  }

  async markContacted(ownerId: number, id: number): Promise<Prospect> {
    const prospect = await this.findOne(ownerId, id);
    prospect.lastContactedAt = now().toJSDate();
    const saved = await this.prospectRepo.save(prospect);

    await this.activityService.logContacted(id, ownerId);

    return saved;
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

    const counts = values(ProspectStatus).reduce(
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

  async completeFollowUp(ownerId: number, id: number): Promise<Prospect> {
    const prospect = await this.findOne(ownerId, id);
    prospect.lastContactedAt = now().toJSDate();

    if (prospect.followUpRecurrence !== FollowUpRecurrence.NONE) {
      const nextDate = now();
      const recurrenceDays: Record<FollowUpRecurrence, number> = {
        [FollowUpRecurrence.NONE]: 0,
        [FollowUpRecurrence.DAILY]: 1,
        [FollowUpRecurrence.WEEKLY]: 7,
        [FollowUpRecurrence.BIWEEKLY]: 14,
        [FollowUpRecurrence.MONTHLY]: 30,
      };
      const daysToAdd = recurrenceDays[prospect.followUpRecurrence];
      prospect.nextFollowUpAt = nextDate.plus({ days: daysToAdd }).toJSDate();
      this.logger.log(
        `Auto-scheduled next follow-up for prospect ${id}: ${prospect.nextFollowUpAt.toISOString()}`,
      );
    } else {
      prospect.nextFollowUpAt = null;
    }

    const saved = await this.prospectRepo.save(prospect);

    await this.activityService.logFollowUpCompleted(id, ownerId);

    return saved;
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

    const validStatuses = values(ProspectStatus);
    const validPriorities = values(ProspectPriority);

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

  async mergeProspects(ownerId: number, dto: MergeProspectsDto): Promise<Prospect> {
    const primary = await this.findOne(ownerId, dto.primaryId);

    const toMerge = await this.prospectRepo.find({
      where: { ownerId, id: In(dto.mergeIds) },
    });

    if (toMerge.length !== dto.mergeIds.length) {
      const foundIds = toMerge.map((p) => p.id);
      const missingIds = dto.mergeIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Prospects not found: ${missingIds.join(", ")}`);
    }

    const allTags = new Set<string>(primary.tags ?? []);
    toMerge.forEach((p) => {
      (p.tags ?? []).forEach((tag) => allTags.add(tag));
    });

    const allNotes = [primary.notes, ...toMerge.map((p) => p.notes)]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const mergedCustomFields = toMerge.reduce(
      (acc, p) => ({ ...acc, ...(p.customFields ?? {}) }),
      primary.customFields ?? {},
    );

    if (dto.fieldOverrides) {
      if (dto.fieldOverrides.companyName) primary.companyName = dto.fieldOverrides.companyName;
      if (dto.fieldOverrides.contactName) primary.contactName = dto.fieldOverrides.contactName;
      if (dto.fieldOverrides.contactEmail) primary.contactEmail = dto.fieldOverrides.contactEmail;
      if (dto.fieldOverrides.contactPhone) primary.contactPhone = dto.fieldOverrides.contactPhone;
      if (dto.fieldOverrides.contactTitle) primary.contactTitle = dto.fieldOverrides.contactTitle;
      if (dto.fieldOverrides.streetAddress)
        primary.streetAddress = dto.fieldOverrides.streetAddress;
      if (dto.fieldOverrides.city) primary.city = dto.fieldOverrides.city;
      if (dto.fieldOverrides.province) primary.province = dto.fieldOverrides.province;
      if (dto.fieldOverrides.postalCode) primary.postalCode = dto.fieldOverrides.postalCode;
      if (dto.fieldOverrides.priority) primary.priority = dto.fieldOverrides.priority;
      if (dto.fieldOverrides.estimatedValue !== undefined) {
        primary.estimatedValue = dto.fieldOverrides.estimatedValue ?? null;
      }
    }

    primary.tags = allTags.size > 0 ? Array.from(allTags) : null;
    primary.notes = allNotes || null;
    primary.customFields = keys(mergedCustomFields).length > 0 ? mergedCustomFields : null;

    const highestValue = Math.max(
      primary.estimatedValue ?? 0,
      ...toMerge.map((p) => p.estimatedValue ?? 0),
    );
    if (highestValue > 0 && !dto.fieldOverrides?.estimatedValue) {
      primary.estimatedValue = highestValue;
    }

    const saved = await this.prospectRepo.save(primary);

    await this.prospectRepo.delete({ id: In(dto.mergeIds) });

    await this.activityService.logMerged(dto.primaryId, ownerId, dto.mergeIds);

    this.logger.log(
      `Merged ${dto.mergeIds.length} prospects into ${dto.primaryId} by user ${ownerId}`,
    );

    return saved;
  }

  calculateScore(prospect: Prospect): number {
    let score = 0;

    const statusScores: Record<ProspectStatus, number> = {
      [ProspectStatus.NEW]: 5,
      [ProspectStatus.CONTACTED]: 10,
      [ProspectStatus.QUALIFIED]: 15,
      [ProspectStatus.PROPOSAL]: 20,
      [ProspectStatus.WON]: 25,
      [ProspectStatus.LOST]: 0,
    };
    score += statusScores[prospect.status] ?? 0;

    if (prospect.lastContactedAt) {
      const contactedAt = isDate(prospect.lastContactedAt)
        ? prospect.lastContactedAt.getTime()
        : fromISO(String(prospect.lastContactedAt)).toMillis();
      const daysSinceContact = Math.floor((nowMillis() - contactedAt) / (1000 * 60 * 60 * 24));
      if (daysSinceContact <= 7) {
        score += 20;
      } else if (daysSinceContact <= 14) {
        score += 15;
      } else if (daysSinceContact <= 30) {
        score += 10;
      } else if (daysSinceContact <= 60) {
        score += 5;
      }
    }

    const priorityScores: Record<ProspectPriority, number> = {
      [ProspectPriority.LOW]: 3,
      [ProspectPriority.MEDIUM]: 8,
      [ProspectPriority.HIGH]: 12,
      [ProspectPriority.URGENT]: 15,
    };
    score += priorityScores[prospect.priority] ?? 0;

    if (prospect.estimatedValue) {
      if (prospect.estimatedValue >= 1000000) {
        score += 20;
      } else if (prospect.estimatedValue >= 500000) {
        score += 16;
      } else if (prospect.estimatedValue >= 100000) {
        score += 12;
      } else if (prospect.estimatedValue >= 50000) {
        score += 8;
      } else if (prospect.estimatedValue > 0) {
        score += 4;
      }
    }

    if (prospect.nextFollowUpAt) {
      const followUpMillis = isDate(prospect.nextFollowUpAt)
        ? prospect.nextFollowUpAt.getTime()
        : fromISO(String(prospect.nextFollowUpAt)).toMillis();
      const todayMillis = nowMillis();
      if (followUpMillis >= todayMillis) {
        score += 10;
      } else {
        const daysOverdue = Math.floor((todayMillis - followUpMillis) / (1000 * 60 * 60 * 24));
        score += Math.max(0, 10 - daysOverdue);
      }
    }

    let completeness = 0;
    if (prospect.companyName) completeness += 2;
    if (prospect.contactName) completeness += 2;
    if (prospect.contactEmail) completeness += 2;
    if (prospect.contactPhone) completeness += 1;
    if (prospect.streetAddress) completeness += 1;
    if (prospect.city) completeness += 1;
    if (prospect.notes) completeness += 1;
    score += completeness;

    return Math.min(100, Math.max(0, score));
  }

  async updateScore(ownerId: number, id: number): Promise<Prospect> {
    const prospect = await this.findOne(ownerId, id);
    prospect.score = this.calculateScore(prospect);
    prospect.scoreUpdatedAt = now().toJSDate();
    return this.prospectRepo.save(prospect);
  }

  async recalculateAllScores(ownerId: number): Promise<{ updated: number }> {
    const prospects = await this.findAll(ownerId);
    const updatedProspects = prospects.map((prospect) => {
      prospect.score = this.calculateScore(prospect);
      prospect.scoreUpdatedAt = now().toJSDate();
      return prospect;
    });

    await this.prospectRepo.save(updatedProspects);
    this.logger.log(
      `Recalculated scores for ${updatedProspects.length} prospects for user ${ownerId}`,
    );

    return { updated: updatedProspects.length };
  }

  async bulkAssign(
    ownerId: number,
    ids: number[],
    assignedToId: number | null,
  ): Promise<{ updated: number; updatedIds: number[] }> {
    const prospects = await this.prospectRepo.find({
      where: { ownerId, id: In(ids) },
    });

    const updatedProspects = prospects.map((prospect) => {
      prospect.assignedToId = assignedToId;
      return prospect;
    });

    await this.prospectRepo.save(updatedProspects);
    this.logger.log(
      `Bulk assigned ${updatedProspects.length} prospects to user ${assignedToId ?? "unassigned"} by user ${ownerId}`,
    );

    return {
      updated: updatedProspects.length,
      updatedIds: updatedProspects.map((p) => p.id),
    };
  }

  async bulkTagOperation(
    ownerId: number,
    dto: BulkTagOperationDto,
  ): Promise<{ updated: number; updatedIds: number[] }> {
    const prospects = await this.prospectRepo.find({
      where: { ownerId, id: In(dto.ids) },
    });

    const updatedProspects = prospects.map((prospect) => {
      const currentTags = new Set(prospect.tags ?? []);

      if (dto.operation === "add") {
        dto.tags.forEach((tag) => currentTags.add(tag));
      } else {
        dto.tags.forEach((tag) => currentTags.delete(tag));
      }

      const oldTags = prospect.tags ? [...prospect.tags] : null;
      prospect.tags = currentTags.size > 0 ? Array.from(currentTags) : null;

      return { prospect, oldTags };
    });

    const savedProspects = await this.prospectRepo.save(updatedProspects.map((u) => u.prospect));

    await Promise.all(
      updatedProspects.map(({ prospect, oldTags }) =>
        this.activityService.logTagsChanged(prospect.id, ownerId, oldTags, prospect.tags),
      ),
    );

    this.logger.log(
      `Bulk tag ${dto.operation}: ${dto.tags.join(", ")} on ${savedProspects.length} prospects by user ${ownerId}`,
    );

    return {
      updated: savedProspects.length,
      updatedIds: savedProspects.map((p) => p.id),
    };
  }
}
