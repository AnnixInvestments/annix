import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import { FollowUpRecurrence, Prospect, ProspectPriority, ProspectStatus } from "../entities";
import { ProspectActivityService, ProspectService } from "../services";
import { ProspectController } from "./prospect.controller";

describe("ProspectController", () => {
  let controller: ProspectController;
  let prospectService: jest.Mocked<ProspectService>;
  let activityService: jest.Mocked<ProspectActivityService>;

  const OWNER_ID = 100;
  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    annixRepUser: {
      userId: OWNER_ID,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

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
      notes: "Initial contact",
      tags: ["mining"],
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

  beforeEach(async () => {
    const mockProspectService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      markContacted: jest.fn(),
      remove: jest.fn(),
      findNearby: jest.fn(),
      countByStatus: jest.fn(),
      followUpsDue: jest.fn(),
      completeFollowUp: jest.fn(),
      snoozeFollowUp: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      bulkDelete: jest.fn(),
      exportToCsv: jest.fn(),
      findDuplicates: jest.fn(),
      importFromCsv: jest.fn(),
      mergeProspects: jest.fn(),
      bulkTagOperation: jest.fn(),
      bulkAssign: jest.fn(),
      recalculateAllScores: jest.fn(),
      calculateScore: jest.fn(),
      updateScore: jest.fn(),
    };

    const mockActivityService = {
      findByProspect: jest.fn(),
      logCreated: jest.fn(),
      logStatusChange: jest.fn(),
      logFieldsUpdated: jest.fn(),
      logContacted: jest.fn(),
      logTagsChanged: jest.fn(),
      logFollowUpCompleted: jest.fn(),
      logFollowUpSnoozed: jest.fn(),
      logMerged: jest.fn(),
      logActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProspectController],
      providers: [
        { provide: ProspectService, useValue: mockProspectService },
        { provide: ProspectActivityService, useValue: mockActivityService },
      ],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProspectController>(ProspectController);
    prospectService = module.get(ProspectService);
    activityService = module.get(ProspectActivityService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST / (create)", () => {
    it("should create a prospect and pass userId from request", async () => {
      const dto = {
        companyName: "New Prospect",
        priority: ProspectPriority.HIGH,
      };
      const created = mockProspect({ companyName: "New Prospect" });
      prospectService.create.mockResolvedValue(created);

      const result = await controller.create(mockRequest as any, dto);

      expect(result).toEqual(created);
      expect(prospectService.create).toHaveBeenCalledWith(OWNER_ID, dto);
    });
  });

  describe("GET / (findAll)", () => {
    it("should return all prospects for the authenticated user", async () => {
      const prospects = [mockProspect({ id: 1 }), mockProspect({ id: 2 })];
      prospectService.findAll.mockResolvedValue(prospects);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toEqual(prospects);
      expect(prospectService.findAll).toHaveBeenCalledWith(OWNER_ID);
    });

    it("should return empty array when no prospects exist", async () => {
      prospectService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toEqual([]);
    });
  });

  describe("GET /status/:status (findByStatus)", () => {
    it("should return prospects filtered by status", async () => {
      const prospects = [mockProspect({ status: ProspectStatus.QUALIFIED })];
      prospectService.findByStatus.mockResolvedValue(prospects);

      const result = await controller.findByStatus(mockRequest as any, ProspectStatus.QUALIFIED);

      expect(result).toEqual(prospects);
      expect(prospectService.findByStatus).toHaveBeenCalledWith(OWNER_ID, ProspectStatus.QUALIFIED);
    });
  });

  describe("GET /nearby (findNearby)", () => {
    it("should parse query params and call service", async () => {
      const prospects = [mockProspect()];
      prospectService.findNearby.mockResolvedValue(prospects);

      const result = await controller.findNearby(
        mockRequest as any,
        "-26.2041",
        "28.0473",
        "15",
        "10",
      );

      expect(result).toEqual(prospects);
      expect(prospectService.findNearby).toHaveBeenCalledWith(OWNER_ID, {
        latitude: -26.2041,
        longitude: 28.0473,
        radiusKm: 15,
        limit: 10,
      });
    });

    it("should handle optional radiusKm and limit", async () => {
      prospectService.findNearby.mockResolvedValue([]);

      await controller.findNearby(mockRequest as any, "-26.2041", "28.0473");

      expect(prospectService.findNearby).toHaveBeenCalledWith(OWNER_ID, {
        latitude: -26.2041,
        longitude: 28.0473,
        radiusKm: undefined,
        limit: undefined,
      });
    });
  });

  describe("GET /stats (countByStatus)", () => {
    it("should return status counts", async () => {
      const counts = {
        [ProspectStatus.NEW]: 5,
        [ProspectStatus.CONTACTED]: 3,
        [ProspectStatus.QUALIFIED]: 2,
        [ProspectStatus.PROPOSAL]: 1,
        [ProspectStatus.WON]: 0,
        [ProspectStatus.LOST]: 0,
      };
      prospectService.countByStatus.mockResolvedValue(counts);

      const result = await controller.countByStatus(mockRequest as any);

      expect(result).toEqual(counts);
      expect(prospectService.countByStatus).toHaveBeenCalledWith(OWNER_ID);
    });
  });

  describe("GET /follow-ups (followUpsDue)", () => {
    it("should return prospects with due follow-ups", async () => {
      const prospects = [mockProspect({ nextFollowUpAt: testDate })];
      prospectService.followUpsDue.mockResolvedValue(prospects);

      const result = await controller.followUpsDue(mockRequest as any);

      expect(result).toEqual(prospects);
      expect(prospectService.followUpsDue).toHaveBeenCalledWith(OWNER_ID);
    });
  });

  describe("GET /export/csv (exportCsv)", () => {
    it("should send CSV content in response", async () => {
      const csvContent = "ID,Company Name\n1,Acme Industrial";
      prospectService.exportToCsv.mockResolvedValue(csvContent);

      const mockRes = { send: jest.fn() };

      await controller.exportCsv(mockRequest as any, mockRes as any);

      expect(prospectService.exportToCsv).toHaveBeenCalledWith(OWNER_ID);
      expect(mockRes.send).toHaveBeenCalledWith(csvContent);
    });
  });

  describe("GET /duplicates (findDuplicates)", () => {
    it("should return duplicate groups", async () => {
      const duplicates = [
        {
          field: "Company Name",
          value: "acme industrial",
          prospects: [mockProspect({ id: 1 }), mockProspect({ id: 2 })],
        },
      ];
      prospectService.findDuplicates.mockResolvedValue(duplicates);

      const result = await controller.findDuplicates(mockRequest as any);

      expect(result).toEqual(duplicates);
      expect(prospectService.findDuplicates).toHaveBeenCalledWith(OWNER_ID);
    });
  });

  describe("PATCH /bulk/status (bulkUpdateStatus)", () => {
    it("should delegate to service with ids and status", async () => {
      const response = { updated: 2, updatedIds: [1, 2], notFoundIds: [] };
      prospectService.bulkUpdateStatus.mockResolvedValue(response);

      const result = await controller.bulkUpdateStatus(mockRequest as any, {
        ids: [1, 2],
        status: ProspectStatus.CONTACTED,
      });

      expect(result).toEqual(response);
      expect(prospectService.bulkUpdateStatus).toHaveBeenCalledWith(
        OWNER_ID,
        [1, 2],
        ProspectStatus.CONTACTED,
      );
    });
  });

  describe("DELETE /bulk (bulkDelete)", () => {
    it("should delegate to service with ids", async () => {
      const response = { deleted: 2, deletedIds: [1, 2], notFoundIds: [] };
      prospectService.bulkDelete.mockResolvedValue(response);

      const result = await controller.bulkDelete(mockRequest as any, { ids: [1, 2] });

      expect(result).toEqual(response);
      expect(prospectService.bulkDelete).toHaveBeenCalledWith(OWNER_ID, [1, 2]);
    });
  });

  describe("POST /import (importProspects)", () => {
    it("should import prospects with default skipInvalid true", async () => {
      const importResult = { imported: 2, skipped: 0, errors: [], createdIds: [10, 11] };
      prospectService.importFromCsv.mockResolvedValue(importResult);

      const dto = { rows: [{ companyName: "Import Co" }] };
      const result = await controller.importProspects(mockRequest as any, dto as any);

      expect(result).toEqual(importResult);
      expect(prospectService.importFromCsv).toHaveBeenCalledWith(OWNER_ID, dto.rows, true);
    });

    it("should pass skipInvalid false when specified", async () => {
      const importResult = {
        imported: 0,
        skipped: 1,
        errors: [{ row: 1, error: "Missing name" }],
        createdIds: [],
      };
      prospectService.importFromCsv.mockResolvedValue(importResult);

      const dto = { rows: [{ companyName: "" }], skipInvalid: false };
      await controller.importProspects(mockRequest as any, dto as any);

      expect(prospectService.importFromCsv).toHaveBeenCalledWith(OWNER_ID, dto.rows, false);
    });
  });

  describe("POST /merge (mergeProspects)", () => {
    it("should merge prospects and return primary", async () => {
      const merged = mockProspect({ id: 1, tags: ["mining", "industrial"] });
      prospectService.mergeProspects.mockResolvedValue(merged);

      const dto = { primaryId: 1, mergeIds: [2, 3] };
      const result = await controller.mergeProspects(mockRequest as any, dto);

      expect(result).toEqual(merged);
      expect(prospectService.mergeProspects).toHaveBeenCalledWith(OWNER_ID, dto);
    });
  });

  describe("PATCH /bulk/tags (bulkTagOperation)", () => {
    it("should delegate add tag operation to service", async () => {
      const response = { updated: 2, updatedIds: [1, 2] };
      prospectService.bulkTagOperation.mockResolvedValue(response);

      const dto = { ids: [1, 2], operation: "add" as const, tags: ["new-tag"] };
      const result = await controller.bulkTagOperation(mockRequest as any, dto);

      expect(result).toEqual(response);
      expect(prospectService.bulkTagOperation).toHaveBeenCalledWith(OWNER_ID, dto);
    });
  });

  describe("PATCH /bulk/assign (bulkAssign)", () => {
    it("should assign prospects to user", async () => {
      const response = { updated: 2, updatedIds: [1, 2] };
      prospectService.bulkAssign.mockResolvedValue(response);

      const dto = { ids: [1, 2], assignedToId: 200 };
      const result = await controller.bulkAssign(mockRequest as any, dto);

      expect(result).toEqual(response);
      expect(prospectService.bulkAssign).toHaveBeenCalledWith(OWNER_ID, [1, 2], 200);
    });

    it("should unassign prospects when assignedToId is null", async () => {
      const response = { updated: 1, updatedIds: [1] };
      prospectService.bulkAssign.mockResolvedValue(response);

      const dto = { ids: [1], assignedToId: null };
      await controller.bulkAssign(mockRequest as any, dto);

      expect(prospectService.bulkAssign).toHaveBeenCalledWith(OWNER_ID, [1], null);
    });
  });

  describe("POST /recalculate-scores (recalculateScores)", () => {
    it("should recalculate all scores for user", async () => {
      const response = { updated: 10 };
      prospectService.recalculateAllScores.mockResolvedValue(response);

      const result = await controller.recalculateScores(mockRequest as any);

      expect(result).toEqual(response);
      expect(prospectService.recalculateAllScores).toHaveBeenCalledWith(OWNER_ID);
    });
  });

  describe("GET /:id/activities (prospectActivities)", () => {
    it("should return mapped activities for a prospect", async () => {
      const activities = [
        {
          id: 1,
          prospectId: 1,
          userId: OWNER_ID,
          user: { firstName: "John", lastName: "Doe", email: "john@test.com" },
          activityType: "created",
          oldValues: null,
          newValues: { companyName: "Acme" },
          description: "Created prospect: Acme",
          createdAt: testDate,
        },
      ];
      prospectService.findOne.mockResolvedValue(mockProspect());
      activityService.findByProspect.mockResolvedValue(activities as any);

      const result = await controller.prospectActivities(mockRequest as any, 1);

      expect(result).toHaveLength(1);
      expect(result[0].userName).toBe("John Doe");
      expect(result[0].prospectId).toBe(1);
      expect(prospectService.findOne).toHaveBeenCalledWith(OWNER_ID, 1);
      expect(activityService.findByProspect).toHaveBeenCalledWith(1, 50);
    });

    it("should use provided limit parameter", async () => {
      prospectService.findOne.mockResolvedValue(mockProspect());
      activityService.findByProspect.mockResolvedValue([]);

      await controller.prospectActivities(mockRequest as any, 1, "10");

      expect(activityService.findByProspect).toHaveBeenCalledWith(1, 10);
    });

    it("should use email as userName when first/last name missing", async () => {
      const activities = [
        {
          id: 1,
          prospectId: 1,
          userId: OWNER_ID,
          user: { firstName: null, lastName: null, email: "anon@test.com" },
          activityType: "contacted",
          oldValues: null,
          newValues: null,
          description: "Marked as contacted",
          createdAt: testDate,
        },
      ];
      prospectService.findOne.mockResolvedValue(mockProspect());
      activityService.findByProspect.mockResolvedValue(activities as any);

      const result = await controller.prospectActivities(mockRequest as any, 1);

      expect(result[0].userName).toBe("anon@test.com");
    });

    it("should return null userName when user relation is missing", async () => {
      const activities = [
        {
          id: 1,
          prospectId: 1,
          userId: OWNER_ID,
          user: null,
          activityType: "created",
          oldValues: null,
          newValues: null,
          description: "Created",
          createdAt: testDate,
        },
      ];
      prospectService.findOne.mockResolvedValue(mockProspect());
      activityService.findByProspect.mockResolvedValue(activities as any);

      const result = await controller.prospectActivities(mockRequest as any, 1);

      expect(result[0].userName).toBeNull();
    });

    it("should throw NotFoundException if prospect does not exist", async () => {
      prospectService.findOne.mockRejectedValue(new NotFoundException("Prospect 999 not found"));

      await expect(controller.prospectActivities(mockRequest as any, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("GET /:id (findOne)", () => {
    it("should return a prospect by id", async () => {
      const prospect = mockProspect();
      prospectService.findOne.mockResolvedValue(prospect);

      const result = await controller.findOne(mockRequest as any, 1);

      expect(result).toEqual(prospect);
      expect(prospectService.findOne).toHaveBeenCalledWith(OWNER_ID, 1);
    });
  });

  describe("PATCH /:id (update)", () => {
    it("should update a prospect", async () => {
      const updated = mockProspect({ companyName: "Updated Name" });
      prospectService.update.mockResolvedValue(updated);

      const dto = { companyName: "Updated Name" };
      const result = await controller.update(mockRequest as any, 1, dto);

      expect(result).toEqual(updated);
      expect(prospectService.update).toHaveBeenCalledWith(OWNER_ID, 1, dto);
    });
  });

  describe("PATCH /:id/status/:status (updateStatus)", () => {
    it("should update prospect status", async () => {
      const updated = mockProspect({ status: ProspectStatus.QUALIFIED });
      prospectService.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateStatus(mockRequest as any, 1, ProspectStatus.QUALIFIED);

      expect(result).toEqual(updated);
      expect(prospectService.updateStatus).toHaveBeenCalledWith(
        OWNER_ID,
        1,
        ProspectStatus.QUALIFIED,
      );
    });
  });

  describe("POST /:id/contacted (markContacted)", () => {
    it("should mark prospect as contacted", async () => {
      const contacted = mockProspect({ lastContactedAt: testDate });
      prospectService.markContacted.mockResolvedValue(contacted);

      const result = await controller.markContacted(mockRequest as any, 1);

      expect(result).toEqual(contacted);
      expect(prospectService.markContacted).toHaveBeenCalledWith(OWNER_ID, 1);
    });
  });

  describe("POST /:id/complete-followup (completeFollowUp)", () => {
    it("should complete follow-up for prospect", async () => {
      const completed = mockProspect({ lastContactedAt: testDate, nextFollowUpAt: null });
      prospectService.completeFollowUp.mockResolvedValue(completed);

      const result = await controller.completeFollowUp(mockRequest as any, 1);

      expect(result).toEqual(completed);
      expect(prospectService.completeFollowUp).toHaveBeenCalledWith(OWNER_ID, 1);
    });
  });

  describe("POST /:id/snooze-followup (snoozeFollowUp)", () => {
    it("should snooze follow-up by given days", async () => {
      const snoozed = mockProspect({
        nextFollowUpAt: fromISO("2026-01-18T10:00:00Z").toJSDate(),
      });
      prospectService.snoozeFollowUp.mockResolvedValue(snoozed);

      const result = await controller.snoozeFollowUp(mockRequest as any, 1, { days: 3 });

      expect(result).toEqual(snoozed);
      expect(prospectService.snoozeFollowUp).toHaveBeenCalledWith(OWNER_ID, 1, 3);
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delete a prospect", async () => {
      prospectService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockRequest as any, 1);

      expect(result).toBeUndefined();
      expect(prospectService.remove).toHaveBeenCalledWith(OWNER_ID, 1);
    });
  });
});
