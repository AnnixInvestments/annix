import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { fromISO } from "../../lib/datetime";
import { FollowUpRecurrence, Prospect, ProspectPriority, ProspectStatus } from "../entities";
import { ProspectService } from "./prospect.service";
import { ProspectActivityService } from "./prospect-activity.service";

describe("ProspectService", () => {
  let service: ProspectService;
  let mockRepo: Partial<Repository<Prospect>>;
  let mockActivityService: Partial<ProspectActivityService>;

  const OWNER_ID = 100;
  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockProspect = (overrides: Partial<Prospect> = {}): Prospect =>
    ({
      id: 1,
      ownerId: OWNER_ID,
      companyName: "Acme Industrial",
      contactName: "John Doe",
      contactEmail: "john@acme.co.za",
      contactPhone: "0821234567",
      contactTitle: "Procurement Manager",
      streetAddress: "10 Main Rd",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2000",
      country: "South Africa",
      latitude: -26.2041,
      longitude: 28.0473,
      googlePlaceId: null,
      discoverySource: null,
      discoveredAt: null,
      externalId: null,
      status: ProspectStatus.NEW,
      priority: ProspectPriority.MEDIUM,
      notes: "Initial contact via trade show",
      tags: ["mining", "industrial"],
      estimatedValue: 250000,
      crmExternalId: null,
      crmSyncStatus: null,
      crmLastSyncedAt: null,
      lastContactedAt: null,
      nextFollowUpAt: null,
      followUpRecurrence: FollowUpRecurrence.NONE,
      customFields: null,
      score: 0,
      scoreUpdatedAt: null,
      assignedToId: null,
      organization: null,
      organizationId: null,
      territory: null,
      territoryId: null,
      isSharedWithTeam: false,
      sharedNotesVisible: true,
      createdAt: testDate,
      updatedAt: testDate,
      ...overrides,
    }) as Prospect;

  const mockQueryBuilder = (): Partial<SelectQueryBuilder<Prospect>> => {
    const qb: Partial<SelectQueryBuilder<Prospect>> = {
      where: jest.fn().mockReturnThis() as any,
      andWhere: jest.fn().mockReturnThis() as any,
      orderBy: jest.fn().mockReturnThis() as any,
      select: jest.fn().mockReturnThis() as any,
      addSelect: jest.fn().mockReturnThis() as any,
      groupBy: jest.fn().mockReturnThis() as any,
      setParameter: jest.fn().mockReturnThis() as any,
      limit: jest.fn().mockReturnThis() as any,
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    return qb;
  };

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder()),
    };

    mockActivityService = {
      logCreated: jest.fn().mockResolvedValue(undefined),
      logStatusChange: jest.fn().mockResolvedValue(undefined),
      logFieldsUpdated: jest.fn().mockResolvedValue(undefined),
      logContacted: jest.fn().mockResolvedValue(undefined),
      logTagsChanged: jest.fn().mockResolvedValue(undefined),
      logFollowUpCompleted: jest.fn().mockResolvedValue(undefined),
      logFollowUpSnoozed: jest.fn().mockResolvedValue(undefined),
      logMerged: jest.fn().mockResolvedValue(undefined),
      findByProspect: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectService,
        {
          provide: getRepositoryToken(Prospect),
          useValue: mockRepo,
        },
        {
          provide: ProspectActivityService,
          useValue: mockActivityService,
        },
      ],
    }).compile();

    service = module.get<ProspectService>(ProspectService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a prospect with all fields", async () => {
      const dto = {
        companyName: "Acme Industrial",
        contactName: "John Doe",
        contactEmail: "john@acme.co.za",
        contactPhone: "0821234567",
        contactTitle: "Procurement Manager",
        streetAddress: "10 Main Rd",
        city: "Johannesburg",
        province: "Gauteng",
        postalCode: "2000",
        country: "South Africa",
        latitude: -26.2041,
        longitude: 28.0473,
        status: ProspectStatus.CONTACTED,
        priority: ProspectPriority.HIGH,
        notes: "Met at trade show",
        tags: ["mining"],
        estimatedValue: 500000,
        nextFollowUpAt: "2026-02-01T09:00:00Z",
        followUpRecurrence: FollowUpRecurrence.WEEKLY,
      };

      const created = mockProspect({
        ...dto,
        nextFollowUpAt: fromISO(dto.nextFollowUpAt).toJSDate(),
      });
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      const result = await service.create(OWNER_ID, dto);

      expect(result).toEqual(created);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: OWNER_ID,
          companyName: "Acme Industrial",
          priority: ProspectPriority.HIGH,
          followUpRecurrence: FollowUpRecurrence.WEEKLY,
        }),
      );
      expect(mockActivityService.logCreated).toHaveBeenCalledWith(
        created.id,
        OWNER_ID,
        "Acme Industrial",
      );
    });

    it("should default optional fields to null", async () => {
      const dto = {
        companyName: "Minimal Prospect",
        priority: ProspectPriority.LOW,
      };

      const created = mockProspect({ companyName: "Minimal Prospect" });
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      await service.create(OWNER_ID, dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          notes: null,
          tags: null,
          estimatedValue: null,
          nextFollowUpAt: null,
          customFields: null,
        }),
      );
    });

    it("should default country to South Africa when not provided", async () => {
      const dto = {
        companyName: "Local Company",
        priority: ProspectPriority.MEDIUM,
      };

      const created = mockProspect({ companyName: "Local Company" });
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      await service.create(OWNER_ID, dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ country: "South Africa" }),
      );
    });

    it("should default status to NEW when not provided", async () => {
      const dto = {
        companyName: "New Lead",
        priority: ProspectPriority.MEDIUM,
      };

      const created = mockProspect();
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      await service.create(OWNER_ID, dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProspectStatus.NEW }),
      );
    });

    it("should parse nextFollowUpAt ISO string to Date", async () => {
      const dto = {
        companyName: "Follow Up Corp",
        priority: ProspectPriority.MEDIUM,
        nextFollowUpAt: "2026-03-01T08:00:00Z",
      };

      const created = mockProspect();
      (mockRepo.create as jest.Mock).mockReturnValue(created);
      (mockRepo.save as jest.Mock).mockResolvedValue(created);

      await service.create(OWNER_ID, dto);

      const createArg = (mockRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.nextFollowUpAt).toBeInstanceOf(Date);
    });
  });

  describe("findAll", () => {
    it("should return all prospects for owner ordered by updatedAt DESC", async () => {
      const prospects = [mockProspect({ id: 1 }), mockProspect({ id: 2 })];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.findAll(OWNER_ID);

      expect(result).toEqual(prospects);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { ownerId: OWNER_ID },
        order: { updatedAt: "DESC" },
        take: 500,
      });
    });

    it("should return empty array when no prospects exist", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.findAll(OWNER_ID);

      expect(result).toEqual([]);
    });
  });

  describe("findByStatus", () => {
    it("should return prospects filtered by status", async () => {
      const prospects = [mockProspect({ status: ProspectStatus.QUALIFIED })];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.findByStatus(OWNER_ID, ProspectStatus.QUALIFIED);

      expect(result).toEqual(prospects);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { ownerId: OWNER_ID, status: ProspectStatus.QUALIFIED },
        order: { updatedAt: "DESC" },
      });
    });
  });

  describe("findOne", () => {
    it("should return a prospect by id and ownerId", async () => {
      const prospect = mockProspect();
      (mockRepo.findOne as jest.Mock).mockResolvedValue(prospect);

      const result = await service.findOne(OWNER_ID, 1);

      expect(result).toEqual(prospect);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, ownerId: OWNER_ID },
      });
    });

    it("should throw NotFoundException when prospect does not exist", async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(OWNER_ID, 999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(OWNER_ID, 999)).rejects.toThrow("Prospect 999 not found");
    });
  });

  describe("update", () => {
    it("should update prospect fields", async () => {
      const existing = mockProspect();
      const updated = mockProspect({ companyName: "Updated Name", contactEmail: "new@acme.co.za" });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockResolvedValue(updated);

      const result = await service.update(OWNER_ID, 1, {
        companyName: "Updated Name",
        contactEmail: "new@acme.co.za",
      });

      expect(result).toEqual(updated);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it("should log status change when status is updated", async () => {
      const existing = mockProspect({ status: ProspectStatus.NEW });
      const updated = mockProspect({ status: ProspectStatus.CONTACTED });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockResolvedValue(updated);

      await service.update(OWNER_ID, 1, { status: ProspectStatus.CONTACTED });

      expect(mockActivityService.logStatusChange).toHaveBeenCalledWith(
        1,
        OWNER_ID,
        ProspectStatus.NEW,
        ProspectStatus.CONTACTED,
      );
    });

    it("should log tags changed when tags are updated", async () => {
      const existing = mockProspect({ tags: ["mining"] });
      const updated = mockProspect({ tags: ["mining", "industrial"] });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockResolvedValue(updated);

      await service.update(OWNER_ID, 1, { tags: ["mining", "industrial"] });

      expect(mockActivityService.logTagsChanged).toHaveBeenCalledWith(
        1,
        OWNER_ID,
        ["mining"],
        ["mining", "industrial"],
      );
    });

    it("should log field updates when neither status nor tags change", async () => {
      const existing = mockProspect();
      const updated = mockProspect({ companyName: "New Name" });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockResolvedValue(updated);

      await service.update(OWNER_ID, 1, { companyName: "New Name" });

      expect(mockActivityService.logFieldsUpdated).toHaveBeenCalled();
      expect(mockActivityService.logStatusChange).not.toHaveBeenCalled();
      expect(mockActivityService.logTagsChanged).not.toHaveBeenCalled();
    });

    it("should not log field updates when status changes", async () => {
      const existing = mockProspect({ status: ProspectStatus.NEW });
      const updated = mockProspect({ status: ProspectStatus.CONTACTED });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockResolvedValue(updated);

      await service.update(OWNER_ID, 1, { status: ProspectStatus.CONTACTED });

      expect(mockActivityService.logFieldsUpdated).not.toHaveBeenCalled();
    });

    it("should parse nextFollowUpAt ISO string when updating", async () => {
      const existing = mockProspect();
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      await service.update(OWNER_ID, 1, { nextFollowUpAt: "2026-04-01T09:00:00Z" });

      const savedProspect = (mockRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedProspect.nextFollowUpAt).toBeInstanceOf(Date);
    });

    it("should throw NotFoundException for non-existent prospect", async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(OWNER_ID, 999, { companyName: "Does not matter" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateStatus", () => {
    it("should update prospect status and log change", async () => {
      const existing = mockProspect({ status: ProspectStatus.NEW });
      const updated = mockProspect({ status: ProspectStatus.QUALIFIED });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateStatus(OWNER_ID, 1, ProspectStatus.QUALIFIED);

      expect(result).toEqual(updated);
      expect(mockActivityService.logStatusChange).toHaveBeenCalledWith(
        1,
        OWNER_ID,
        ProspectStatus.NEW,
        ProspectStatus.QUALIFIED,
      );
    });

    it("should not log status change when status is unchanged", async () => {
      const existing = mockProspect({ status: ProspectStatus.NEW });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockResolvedValue(existing);

      await service.updateStatus(OWNER_ID, 1, ProspectStatus.NEW);

      expect(mockActivityService.logStatusChange).not.toHaveBeenCalled();
    });
  });

  describe("markContacted", () => {
    it("should set lastContactedAt and log contacted activity", async () => {
      const existing = mockProspect();
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.markContacted(OWNER_ID, 1);

      expect(result.lastContactedAt).toBeInstanceOf(Date);
      expect(mockActivityService.logContacted).toHaveBeenCalledWith(1, OWNER_ID);
    });
  });

  describe("remove", () => {
    it("should remove a prospect", async () => {
      const existing = mockProspect();
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.remove as jest.Mock).mockResolvedValue(existing);

      await service.remove(OWNER_ID, 1);

      expect(mockRepo.remove).toHaveBeenCalledWith(existing);
    });

    it("should throw NotFoundException for non-existent prospect", async () => {
      (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(OWNER_ID, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findNearby", () => {
    it("should use query builder with Haversine formula", async () => {
      const qb = mockQueryBuilder();
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (qb.getMany as jest.Mock).mockResolvedValue([mockProspect()]);

      const result = await service.findNearby(OWNER_ID, {
        latitude: -26.2041,
        longitude: 28.0473,
        radiusKm: 15,
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalled();
      expect(qb.limit).toHaveBeenCalledWith(10);
    });

    it("should default radiusKm to 10 and limit to 20", async () => {
      const qb = mockQueryBuilder();
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (qb.getMany as jest.Mock).mockResolvedValue([]);

      await service.findNearby(OWNER_ID, {
        latitude: -26.2041,
        longitude: 28.0473,
      });

      expect(qb.limit).toHaveBeenCalledWith(20);
    });
  });

  describe("countByStatus", () => {
    it("should return counts for all statuses", async () => {
      const qb = mockQueryBuilder();
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (qb.getRawMany as jest.Mock).mockResolvedValue([
        { status: ProspectStatus.NEW, count: "5" },
        { status: ProspectStatus.CONTACTED, count: "3" },
      ]);

      const result = await service.countByStatus(OWNER_ID);

      expect(result[ProspectStatus.NEW]).toBe(5);
      expect(result[ProspectStatus.CONTACTED]).toBe(3);
      expect(result[ProspectStatus.QUALIFIED]).toBe(0);
      expect(result[ProspectStatus.PROPOSAL]).toBe(0);
      expect(result[ProspectStatus.WON]).toBe(0);
      expect(result[ProspectStatus.LOST]).toBe(0);
    });

    it("should return all zeros when no prospects exist", async () => {
      const qb = mockQueryBuilder();
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (qb.getRawMany as jest.Mock).mockResolvedValue([]);

      const result = await service.countByStatus(OWNER_ID);

      Object.values(ProspectStatus).forEach((status) => {
        expect(result[status]).toBe(0);
      });
    });
  });

  describe("followUpsDue", () => {
    it("should query for due follow-ups excluding closed statuses", async () => {
      const qb = mockQueryBuilder();
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      const dueProspect = mockProspect({ nextFollowUpAt: testDate });
      (qb.getMany as jest.Mock).mockResolvedValue([dueProspect]);

      const result = await service.followUpsDue(OWNER_ID);

      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        "prospect.status NOT IN (:...closedStatuses)",
        expect.objectContaining({
          closedStatuses: [ProspectStatus.WON, ProspectStatus.LOST],
        }),
      );
    });
  });

  describe("completeFollowUp", () => {
    it("should set lastContactedAt and clear nextFollowUpAt when recurrence is NONE", async () => {
      const existing = mockProspect({ followUpRecurrence: FollowUpRecurrence.NONE });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.completeFollowUp(OWNER_ID, 1);

      expect(result.lastContactedAt).toBeInstanceOf(Date);
      expect(result.nextFollowUpAt).toBeNull();
      expect(mockActivityService.logFollowUpCompleted).toHaveBeenCalledWith(1, OWNER_ID);
    });

    it("should auto-schedule next follow-up for WEEKLY recurrence", async () => {
      const existing = mockProspect({ followUpRecurrence: FollowUpRecurrence.WEEKLY });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.completeFollowUp(OWNER_ID, 1);

      expect(result.nextFollowUpAt).toBeInstanceOf(Date);
      expect(result.nextFollowUpAt).not.toBeNull();
    });

    it("should auto-schedule next follow-up for DAILY recurrence", async () => {
      const existing = mockProspect({ followUpRecurrence: FollowUpRecurrence.DAILY });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.completeFollowUp(OWNER_ID, 1);

      expect(result.nextFollowUpAt).toBeInstanceOf(Date);
    });

    it("should auto-schedule next follow-up for MONTHLY recurrence", async () => {
      const existing = mockProspect({ followUpRecurrence: FollowUpRecurrence.MONTHLY });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.completeFollowUp(OWNER_ID, 1);

      expect(result.nextFollowUpAt).toBeInstanceOf(Date);
    });
  });

  describe("snoozeFollowUp", () => {
    it("should set nextFollowUpAt to now plus given days", async () => {
      const existing = mockProspect();
      (mockRepo.findOne as jest.Mock).mockResolvedValue(existing);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.snoozeFollowUp(OWNER_ID, 1, 3);

      expect(result.nextFollowUpAt).toBeInstanceOf(Date);
      expect(mockActivityService.logFollowUpSnoozed).toHaveBeenCalledWith(
        1,
        OWNER_ID,
        3,
        expect.any(Date),
      );
    });
  });

  describe("bulkUpdateStatus", () => {
    it("should update status for owned prospects only", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
      (mockRepo.update as jest.Mock).mockResolvedValue({ affected: 2 });

      const result = await service.bulkUpdateStatus(
        OWNER_ID,
        [1, 2, 999],
        ProspectStatus.CONTACTED,
      );

      expect(result.updated).toBe(2);
      expect(result.updatedIds).toEqual([1, 2]);
      expect(result.notFoundIds).toEqual([999]);
    });

    it("should return all ids as notFound when none are owned", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.bulkUpdateStatus(OWNER_ID, [10, 20], ProspectStatus.LOST);

      expect(result.updated).toBe(0);
      expect(result.updatedIds).toEqual([]);
      expect(result.notFoundIds).toEqual([10, 20]);
    });

    it("should not call update when no owned prospects found", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      await service.bulkUpdateStatus(OWNER_ID, [10], ProspectStatus.WON);

      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("bulkDelete", () => {
    it("should delete owned prospects and return result", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 3 }]);
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 2 });

      const result = await service.bulkDelete(OWNER_ID, [1, 2, 3]);

      expect(result.deleted).toBe(2);
      expect(result.deletedIds).toEqual([1, 3]);
      expect(result.notFoundIds).toEqual([2]);
    });

    it("should not call delete when no owned prospects found", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      await service.bulkDelete(OWNER_ID, [10]);

      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("exportToCsv", () => {
    it("should return CSV with headers and rows", async () => {
      const prospect = mockProspect({
        createdAt: testDate,
        updatedAt: testDate,
      });
      (mockRepo.find as jest.Mock).mockResolvedValue([prospect]);

      const csv = await service.exportToCsv(OWNER_ID);

      const lines = csv.split("\n");
      expect(lines[0]).toContain("ID,Company Name,Contact Name");
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain("Acme Industrial");
    });

    it("should return only headers when no prospects exist", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      const csv = await service.exportToCsv(OWNER_ID);

      const lines = csv.split("\n");
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("ID,Company Name");
    });

    it("should escape CSV fields containing commas", async () => {
      const prospect = mockProspect({
        companyName: "Acme, Inc.",
        createdAt: testDate,
        updatedAt: testDate,
      });
      (mockRepo.find as jest.Mock).mockResolvedValue([prospect]);

      const csv = await service.exportToCsv(OWNER_ID);

      expect(csv).toContain('"Acme, Inc."');
    });

    it("should escape CSV fields containing double quotes", async () => {
      const prospect = mockProspect({
        notes: 'He said "hello"',
        createdAt: testDate,
        updatedAt: testDate,
      });
      (mockRepo.find as jest.Mock).mockResolvedValue([prospect]);

      const csv = await service.exportToCsv(OWNER_ID);

      expect(csv).toContain('"He said ""hello"""');
    });

    it("should handle null fields as empty strings", async () => {
      const prospect = mockProspect({
        contactName: null,
        contactEmail: null,
        lastContactedAt: null,
        createdAt: testDate,
        updatedAt: testDate,
      });
      (mockRepo.find as jest.Mock).mockResolvedValue([prospect]);

      const csv = await service.exportToCsv(OWNER_ID);

      expect(csv).toBeDefined();
    });
  });

  describe("findDuplicates", () => {
    it("should detect duplicates by company name", async () => {
      const prospects = [
        mockProspect({ id: 1, companyName: "Acme Industrial" }),
        mockProspect({ id: 2, companyName: "acme industrial" }),
        mockProspect({ id: 3, companyName: "Different Company" }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.findDuplicates(OWNER_ID);

      const companyDupes = result.filter((d) => d.field === "Company Name");
      expect(companyDupes).toHaveLength(1);
      expect(companyDupes[0].prospects).toHaveLength(2);
    });

    it("should detect duplicates by email", async () => {
      const prospects = [
        mockProspect({ id: 1, contactEmail: "john@acme.co.za" }),
        mockProspect({ id: 2, contactEmail: "John@Acme.co.za" }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.findDuplicates(OWNER_ID);

      const emailDupes = result.filter((d) => d.field === "Email");
      expect(emailDupes).toHaveLength(1);
    });

    it("should detect duplicates by phone", async () => {
      const prospects = [
        mockProspect({ id: 1, contactPhone: "0821234567" }),
        mockProspect({ id: 2, contactPhone: "0821234567" }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.findDuplicates(OWNER_ID);

      const phoneDupes = result.filter((d) => d.field === "Phone");
      expect(phoneDupes).toHaveLength(1);
    });

    it("should return empty array when no duplicates exist", async () => {
      const prospects = [
        mockProspect({
          id: 1,
          companyName: "Company A",
          contactEmail: "a@a.com",
          contactPhone: "111",
        }),
        mockProspect({
          id: 2,
          companyName: "Company B",
          contactEmail: "b@b.com",
          contactPhone: "222",
        }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.findDuplicates(OWNER_ID);

      expect(result).toEqual([]);
    });

    it("should ignore null fields when checking duplicates", async () => {
      const prospects = [
        mockProspect({ id: 1, contactEmail: null }),
        mockProspect({ id: 2, contactEmail: null }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);

      const result = await service.findDuplicates(OWNER_ID);

      const emailDupes = result.filter((d) => d.field === "Email");
      expect(emailDupes).toHaveLength(0);
    });
  });

  describe("importFromCsv", () => {
    it("should import valid rows and return result", async () => {
      const rows = [{ companyName: "Import Co 1" }, { companyName: "Import Co 2" }];

      const saved = [
        mockProspect({ id: 10, companyName: "Import Co 1" }),
        mockProspect({ id: 11, companyName: "Import Co 2" }),
      ];
      (mockRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.importFromCsv(OWNER_ID, rows as any);

      expect(result.imported).toBe(2);
      expect(result.createdIds).toEqual([10, 11]);
      expect(result.skipped).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("should skip rows without company name", async () => {
      const rows = [{ companyName: "" }, { companyName: "Valid Co" }];

      const saved = [mockProspect({ id: 10, companyName: "Valid Co" })];
      (mockRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.importFromCsv(OWNER_ID, rows as any);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(1);
    });

    it("should reject invalid status values", async () => {
      const rows = [{ companyName: "Bad Status Co", status: "invalid_status" }];

      (mockRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRepo.save as jest.Mock).mockResolvedValue([]);

      const result = await service.importFromCsv(OWNER_ID, rows as any);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].error).toContain("Invalid status");
    });

    it("should reject invalid priority values", async () => {
      const rows = [{ companyName: "Bad Priority Co", priority: "super_urgent" }];

      (mockRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRepo.save as jest.Mock).mockResolvedValue([]);

      const result = await service.importFromCsv(OWNER_ID, rows as any);

      expect(result.skipped).toBe(1);
      expect(result.errors[0].error).toContain("Invalid priority");
    });

    it("should abort all when skipInvalid is false and invalid rows exist", async () => {
      const rows = [{ companyName: "" }, { companyName: "Valid Co" }];

      const result = await service.importFromCsv(OWNER_ID, rows as any, false);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it("should parse tags from semicolon-separated string", async () => {
      const rows = [{ companyName: "Tagged Co", tags: "mining; industrial; steel" }];

      (mockRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRepo.save as jest.Mock).mockResolvedValue([mockProspect({ id: 10 })]);

      await service.importFromCsv(OWNER_ID, rows as any);

      const createArg = (mockRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.tags).toEqual(["mining", "industrial", "steel"]);
    });

    it("should parse estimated value stripping currency symbols", async () => {
      const rows = [{ companyName: "Value Co", estimatedValue: "R500,000.00" }];

      (mockRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRepo.save as jest.Mock).mockResolvedValue([mockProspect({ id: 10 })]);

      await service.importFromCsv(OWNER_ID, rows as any);

      const createArg = (mockRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.estimatedValue).toBe(500000);
    });

    it("should default country to South Africa for imported rows", async () => {
      const rows = [{ companyName: "Local Import" }];

      (mockRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRepo.save as jest.Mock).mockResolvedValue([mockProspect({ id: 10 })]);

      await service.importFromCsv(OWNER_ID, rows as any);

      const createArg = (mockRepo.create as jest.Mock).mock.calls[0][0];
      expect(createArg.country).toBe("South Africa");
    });
  });

  describe("mergeProspects", () => {
    it("should merge secondary prospects into primary", async () => {
      const primary = mockProspect({
        id: 1,
        tags: ["mining"],
        notes: "Primary notes",
        estimatedValue: 100000,
        customFields: { sector: "heavy" },
      });
      const secondary = mockProspect({
        id: 2,
        tags: ["industrial"],
        notes: "Secondary notes",
        estimatedValue: 200000,
        customFields: { region: "north" },
      });

      (mockRepo.findOne as jest.Mock).mockResolvedValue(primary);
      (mockRepo.find as jest.Mock).mockResolvedValue([secondary]);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.mergeProspects(OWNER_ID, {
        primaryId: 1,
        mergeIds: [2],
      });

      expect(result.tags).toEqual(expect.arrayContaining(["mining", "industrial"]));
      expect(result.notes).toContain("Primary notes");
      expect(result.notes).toContain("Secondary notes");
      expect(result.estimatedValue).toBe(200000);
      expect(result.customFields).toEqual(
        expect.objectContaining({ sector: "heavy", region: "north" }),
      );
      expect(mockRepo.delete).toHaveBeenCalled();
      expect(mockActivityService.logMerged).toHaveBeenCalledWith(1, OWNER_ID, [2]);
    });

    it("should throw NotFoundException when merge prospect is not found", async () => {
      const primary = mockProspect({ id: 1 });
      (mockRepo.findOne as jest.Mock).mockResolvedValue(primary);
      (mockRepo.find as jest.Mock).mockResolvedValue([]);

      await expect(
        service.mergeProspects(OWNER_ID, { primaryId: 1, mergeIds: [999] }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should apply field overrides from dto", async () => {
      const primary = mockProspect({ id: 1, companyName: "Old Name" });
      const secondary = mockProspect({ id: 2 });

      (mockRepo.findOne as jest.Mock).mockResolvedValue(primary);
      (mockRepo.find as jest.Mock).mockResolvedValue([secondary]);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.mergeProspects(OWNER_ID, {
        primaryId: 1,
        mergeIds: [2],
        fieldOverrides: { companyName: "Merged Company" },
      });

      expect(result.companyName).toBe("Merged Company");
    });

    it("should keep highest estimated value when no override provided", async () => {
      const primary = mockProspect({
        id: 1,
        estimatedValue: 300000,
        tags: null,
        notes: null,
        customFields: null,
      });
      const secondary = mockProspect({
        id: 2,
        estimatedValue: 100000,
        tags: null,
        notes: null,
        customFields: null,
      });

      (mockRepo.findOne as jest.Mock).mockResolvedValue(primary);
      (mockRepo.find as jest.Mock).mockResolvedValue([secondary]);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.mergeProspects(OWNER_ID, {
        primaryId: 1,
        mergeIds: [2],
      });

      expect(result.estimatedValue).toBe(300000);
    });
  });

  describe("calculateScore", () => {
    it("should return score based on status", () => {
      const prospect = mockProspect({ status: ProspectStatus.PROPOSAL });

      const score = service.calculateScore(prospect);

      expect(score).toBeGreaterThan(0);
    });

    it("should give 0 status score for LOST prospects", () => {
      const prospect = mockProspect({
        status: ProspectStatus.LOST,
        priority: ProspectPriority.LOW,
        lastContactedAt: null,
        nextFollowUpAt: null,
        estimatedValue: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        streetAddress: null,
        city: null,
        notes: null,
      });

      const score = service.calculateScore(prospect);

      expect(score).toBe(5);
    });

    it("should increase score for higher estimated values", () => {
      const lowValue = mockProspect({
        status: ProspectStatus.NEW,
        estimatedValue: 10000,
        lastContactedAt: null,
        nextFollowUpAt: null,
      });
      const highValue = mockProspect({
        status: ProspectStatus.NEW,
        estimatedValue: 1000000,
        lastContactedAt: null,
        nextFollowUpAt: null,
      });

      const lowScore = service.calculateScore(lowValue);
      const highScore = service.calculateScore(highValue);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it("should increase score for higher priority", () => {
      const lowPriority = mockProspect({
        status: ProspectStatus.NEW,
        priority: ProspectPriority.LOW,
        estimatedValue: null,
        lastContactedAt: null,
        nextFollowUpAt: null,
      });
      const urgentPriority = mockProspect({
        status: ProspectStatus.NEW,
        priority: ProspectPriority.URGENT,
        estimatedValue: null,
        lastContactedAt: null,
        nextFollowUpAt: null,
      });

      const lowScore = service.calculateScore(lowPriority);
      const urgentScore = service.calculateScore(urgentPriority);

      expect(urgentScore).toBeGreaterThan(lowScore);
    });

    it("should cap score at 100", () => {
      const prospect = mockProspect({
        status: ProspectStatus.WON,
        priority: ProspectPriority.URGENT,
        estimatedValue: 10000000,
        lastContactedAt: testDate,
        nextFollowUpAt: fromISO("2030-01-01T00:00:00Z").toJSDate(),
        contactName: "Full",
        contactEmail: "full@test.com",
        contactPhone: "111",
        streetAddress: "123 St",
        city: "JHB",
        notes: "Complete",
      });

      const score = service.calculateScore(prospect);

      expect(score).toBeLessThanOrEqual(100);
    });

    it("should not go below 0", () => {
      const prospect = mockProspect({
        status: ProspectStatus.LOST,
        priority: ProspectPriority.LOW,
        estimatedValue: null,
        lastContactedAt: null,
        nextFollowUpAt: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        streetAddress: null,
        city: null,
        notes: null,
      });

      const score = service.calculateScore(prospect);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("should add completeness points for populated fields", () => {
      const sparse = mockProspect({
        status: ProspectStatus.NEW,
        priority: ProspectPriority.MEDIUM,
        estimatedValue: null,
        lastContactedAt: null,
        nextFollowUpAt: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        streetAddress: null,
        city: null,
        notes: null,
      });
      const complete = mockProspect({
        status: ProspectStatus.NEW,
        priority: ProspectPriority.MEDIUM,
        estimatedValue: null,
        lastContactedAt: null,
        nextFollowUpAt: null,
        contactName: "John",
        contactEmail: "john@test.com",
        contactPhone: "111",
        streetAddress: "123 St",
        city: "JHB",
        notes: "Some notes",
      });

      const sparseScore = service.calculateScore(sparse);
      const completeScore = service.calculateScore(complete);

      expect(completeScore).toBeGreaterThan(sparseScore);
    });
  });

  describe("updateScore", () => {
    it("should calculate and save score for a prospect", async () => {
      const prospect = mockProspect();
      (mockRepo.findOne as jest.Mock).mockResolvedValue(prospect);
      (mockRepo.save as jest.Mock).mockImplementation((p) => Promise.resolve(p));

      const result = await service.updateScore(OWNER_ID, 1);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.scoreUpdatedAt).toBeInstanceOf(Date);
    });
  });

  describe("recalculateAllScores", () => {
    it("should recalculate scores for all owner prospects", async () => {
      const prospects = [mockProspect({ id: 1 }), mockProspect({ id: 2 })];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockRepo.save as jest.Mock).mockResolvedValue(prospects);

      const result = await service.recalculateAllScores(OWNER_ID);

      expect(result.updated).toBe(2);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it("should return 0 updated when no prospects exist", async () => {
      (mockRepo.find as jest.Mock).mockResolvedValue([]);
      (mockRepo.save as jest.Mock).mockResolvedValue([]);

      const result = await service.recalculateAllScores(OWNER_ID);

      expect(result.updated).toBe(0);
    });
  });

  describe("bulkAssign", () => {
    it("should assign prospects to a user", async () => {
      const prospects = [mockProspect({ id: 1 }), mockProspect({ id: 2 })];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockRepo.save as jest.Mock).mockResolvedValue(prospects);

      const result = await service.bulkAssign(OWNER_ID, [1, 2], 200);

      expect(result.updated).toBe(2);
      expect(result.updatedIds).toEqual([1, 2]);
    });

    it("should unassign prospects when assignedToId is null", async () => {
      const prospects = [mockProspect({ id: 1, assignedToId: 200 })];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockRepo.save as jest.Mock).mockImplementation((arr) => Promise.resolve(arr));

      const result = await service.bulkAssign(OWNER_ID, [1], null);

      expect(result.updated).toBe(1);
      const savedProspects = (mockRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedProspects[0].assignedToId).toBeNull();
    });
  });

  describe("bulkTagOperation", () => {
    it("should add tags to prospects", async () => {
      const prospects = [
        mockProspect({ id: 1, tags: ["existing"] }),
        mockProspect({ id: 2, tags: null }),
      ];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockRepo.save as jest.Mock).mockImplementation((arr) => Promise.resolve(arr));

      const result = await service.bulkTagOperation(OWNER_ID, {
        ids: [1, 2],
        operation: "add",
        tags: ["new-tag"],
      });

      expect(result.updated).toBe(2);
      expect(mockActivityService.logTagsChanged).toHaveBeenCalledTimes(2);
    });

    it("should remove tags from prospects", async () => {
      const prospects = [mockProspect({ id: 1, tags: ["mining", "industrial"] })];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockRepo.save as jest.Mock).mockImplementation((arr) => Promise.resolve(arr));

      const result = await service.bulkTagOperation(OWNER_ID, {
        ids: [1],
        operation: "remove",
        tags: ["mining"],
      });

      expect(result.updated).toBe(1);
      const savedProspects = (mockRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedProspects[0].tags).toEqual(["industrial"]);
    });

    it("should set tags to null when all tags are removed", async () => {
      const prospects = [mockProspect({ id: 1, tags: ["only-tag"] })];
      (mockRepo.find as jest.Mock).mockResolvedValue(prospects);
      (mockRepo.save as jest.Mock).mockImplementation((arr) => Promise.resolve(arr));

      await service.bulkTagOperation(OWNER_ID, {
        ids: [1],
        operation: "remove",
        tags: ["only-tag"],
      });

      const savedProspects = (mockRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedProspects[0].tags).toBeNull();
    });
  });
});
