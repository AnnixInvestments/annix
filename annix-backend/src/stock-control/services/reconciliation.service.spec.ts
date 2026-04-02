import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  ReconciliationEvent,
  ReconciliationEventType,
} from "../entities/reconciliation-event.entity";
import {
  ReconciliationItem,
  ReconciliationSourceType,
  ReconciliationStatus,
} from "../entities/reconciliation-item.entity";
import { ReconciliationService } from "./reconciliation.service";

const COMPANY_ID = 1;
const JOB_CARD_ID = 100;

const createUser = (overrides: Partial<{ id: number; companyId: number; name: string }> = {}) => ({
  id: overrides.id ?? 10,
  companyId: overrides.companyId ?? COMPANY_ID,
  name: overrides.name ?? "Test User",
});

const createItem = (overrides: Partial<ReconciliationItem> = {}): ReconciliationItem =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    jobCardId: JOB_CARD_ID,
    itemDescription: "Steel Pipe 6in",
    itemCode: "SP-006",
    sourceDocumentId: null,
    sourceType: ReconciliationSourceType.MANUAL,
    quantityOrdered: 10,
    quantityReleased: 0,
    quantityShipped: 0,
    quantityMps: 0,
    reconciliationStatus: ReconciliationStatus.PENDING,
    notes: null,
    sortOrder: 0,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  }) as ReconciliationItem;

const createEvent = (overrides: Partial<ReconciliationEvent> = {}): ReconciliationEvent =>
  ({
    id: 1,
    reconciliationItemId: 1,
    companyId: COMPANY_ID,
    eventType: ReconciliationEventType.QA_RELEASE,
    quantity: 5,
    referenceNumber: null,
    performedByName: "Test User",
    performedById: 10,
    notes: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  }) as ReconciliationEvent;

describe("ReconciliationService", () => {
  let service: ReconciliationService;

  const mockItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    remove: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn(),
  };

  const mockEventRepo = {
    find: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: getRepositoryToken(ReconciliationItem),
          useValue: mockItemRepo,
        },
        {
          provide: getRepositoryToken(ReconciliationEvent),
          useValue: mockEventRepo,
        },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  describe("itemsForJobCard", () => {
    it("should return items with their events grouped by item id", async () => {
      const items = [createItem({ id: 1 }), createItem({ id: 2, itemDescription: "Flange 6in" })];
      const events = [
        createEvent({ id: 10, reconciliationItemId: 1 }),
        createEvent({ id: 11, reconciliationItemId: 1 }),
        createEvent({ id: 12, reconciliationItemId: 2 }),
      ];

      mockItemRepo.find.mockResolvedValue(items);
      mockEventRepo.find.mockResolvedValue(events);

      const result = await service.itemsForJobCard(COMPANY_ID, JOB_CARD_ID);

      expect(result).toHaveLength(2);
      expect(result[0].events).toHaveLength(2);
      expect(result[1].events).toHaveLength(1);
      expect(mockItemRepo.find).toHaveBeenCalledWith({
        where: { companyId: COMPANY_ID, jobCardId: JOB_CARD_ID },
        order: { sortOrder: "ASC", createdAt: "ASC" },
      });
    });

    it("should return empty array when no items exist", async () => {
      mockItemRepo.find.mockResolvedValue([]);

      const result = await service.itemsForJobCard(COMPANY_ID, JOB_CARD_ID);

      expect(result).toEqual([]);
      expect(mockEventRepo.find).not.toHaveBeenCalled();
    });

    it("should return items with empty events when no events exist", async () => {
      const items = [createItem({ id: 1 })];
      mockItemRepo.find.mockResolvedValue(items);
      mockEventRepo.find.mockResolvedValue([]);

      const result = await service.itemsForJobCard(COMPANY_ID, JOB_CARD_ID);

      expect(result).toHaveLength(1);
      expect(result[0].events).toEqual([]);
    });
  });

  describe("addItem", () => {
    it("should create a new item with correct sort order", async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxSort: 2 }),
      };
      mockItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const data = {
        itemDescription: "Steel Pipe 8in",
        itemCode: "SP-008",
        quantityOrdered: 20,
      };

      const result = await service.addItem(COMPANY_ID, JOB_CARD_ID, data, createUser());

      expect(mockItemRepo.create).toHaveBeenCalledWith({
        companyId: COMPANY_ID,
        jobCardId: JOB_CARD_ID,
        itemDescription: "Steel Pipe 8in",
        itemCode: "SP-008",
        sourceType: ReconciliationSourceType.MANUAL,
        quantityOrdered: 20,
        reconciliationStatus: ReconciliationStatus.PENDING,
        sortOrder: 3,
      });
      expect(mockItemRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should default sort order to 0 when no items exist", async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxSort: null }),
      };
      mockItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const data = {
        itemDescription: "Flange 6in",
        itemCode: null,
        quantityOrdered: 5,
      };

      await service.addItem(COMPANY_ID, JOB_CARD_ID, data, createUser());

      expect(mockItemRepo.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0 }));
    });

    it("should default sort order to 0 when getRawOne returns null", async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      mockItemRepo.createQueryBuilder.mockReturnValue(mockQb);

      const data = {
        itemDescription: "Flange 6in",
        itemCode: null,
        quantityOrdered: 5,
      };

      await service.addItem(COMPANY_ID, JOB_CARD_ID, data, createUser());

      expect(mockItemRepo.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 0 }));
    });
  });

  describe("updateItem", () => {
    it("should update an existing item", async () => {
      const existing = createItem({ id: 5 });
      mockItemRepo.findOne.mockResolvedValue(existing);
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateItem(COMPANY_ID, 5, {
        itemDescription: "Updated Pipe",
      });

      expect(result.itemDescription).toBe("Updated Pipe");
      expect(mockItemRepo.save).toHaveBeenCalled();
    });

    it("should recalculate status to PARTIAL when released > 0", async () => {
      const existing = createItem({ id: 5, quantityOrdered: 10, quantityReleased: 3 });
      mockItemRepo.findOne.mockResolvedValue(existing);
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateItem(COMPANY_ID, 5, { notes: "updated" });

      expect(result.reconciliationStatus).toBe(ReconciliationStatus.PARTIAL);
    });

    it("should throw NotFoundException when item does not exist", async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(COMPANY_ID, 999, { itemDescription: "Nope" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteItem", () => {
    it("should delete an existing item", async () => {
      const existing = createItem({ id: 5 });
      mockItemRepo.findOne.mockResolvedValue(existing);

      await service.deleteItem(COMPANY_ID, 5);

      expect(mockItemRepo.remove).toHaveBeenCalledWith(existing);
    });

    it("should throw NotFoundException when item does not exist", async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteItem(COMPANY_ID, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("recordEvent", () => {
    it("should record QA_RELEASE events and increment quantityReleased", async () => {
      const item = createItem({
        id: 1,
        quantityOrdered: 10,
        quantityReleased: 0,
        quantityShipped: 0,
      });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockEventRepo.save.mockImplementation((entity) => Promise.resolve({ id: 50, ...entity }));
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.recordEvent(
        COMPANY_ID,
        JOB_CARD_ID,
        ReconciliationEventType.QA_RELEASE,
        [{ reconciliationItemId: 1, quantity: 5 }],
        "REF-001",
        createUser(),
        "Release batch 1",
      );

      expect(result).toHaveLength(1);
      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: ReconciliationEventType.QA_RELEASE,
          quantity: 5,
          referenceNumber: "REF-001",
        }),
      );
      expect(item.quantityReleased).toBe(5);
      expect(item.reconciliationStatus).toBe(ReconciliationStatus.PARTIAL);
    });

    it("should record POLYMER_DN events and increment quantityShipped", async () => {
      const item = createItem({
        id: 1,
        quantityOrdered: 10,
        quantityReleased: 0,
        quantityShipped: 0,
      });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockEventRepo.save.mockImplementation((entity) => Promise.resolve({ id: 51, ...entity }));
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.recordEvent(
        COMPANY_ID,
        JOB_CARD_ID,
        ReconciliationEventType.POLYMER_DN,
        [{ reconciliationItemId: 1, quantity: 3 }],
        null,
        createUser(),
        null,
      );

      expect(item.quantityShipped).toBe(3);
      expect(item.reconciliationStatus).toBe(ReconciliationStatus.PARTIAL);
    });

    it("should record MPS_DN events and increment quantityMps", async () => {
      const item = createItem({
        id: 1,
        quantityOrdered: 10,
        quantityReleased: 0,
        quantityShipped: 0,
        quantityMps: 0,
      });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockEventRepo.save.mockImplementation((entity) => Promise.resolve({ id: 52, ...entity }));
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.recordEvent(
        COMPANY_ID,
        JOB_CARD_ID,
        ReconciliationEventType.MPS_DN,
        [{ reconciliationItemId: 1, quantity: 7 }],
        null,
        createUser(),
        null,
      );

      expect(item.quantityMps).toBe(7);
    });

    it("should set status to COMPLETE when shipped >= ordered and released >= ordered", async () => {
      const item = createItem({
        id: 1,
        quantityOrdered: 10,
        quantityReleased: 10,
        quantityShipped: 5,
      });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockEventRepo.save.mockImplementation((entity) => Promise.resolve({ id: 53, ...entity }));
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.recordEvent(
        COMPANY_ID,
        JOB_CARD_ID,
        ReconciliationEventType.POLYMER_DN,
        [{ reconciliationItemId: 1, quantity: 5 }],
        null,
        createUser(),
        null,
      );

      expect(item.quantityShipped).toBe(10);
      expect(item.reconciliationStatus).toBe(ReconciliationStatus.COMPLETE);
    });

    it("should set status to DISCREPANCY when shipped exceeds ordered", async () => {
      const item = createItem({
        id: 1,
        quantityOrdered: 10,
        quantityReleased: 10,
        quantityShipped: 8,
      });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockEventRepo.save.mockImplementation((entity) => Promise.resolve({ id: 54, ...entity }));
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.recordEvent(
        COMPANY_ID,
        JOB_CARD_ID,
        ReconciliationEventType.POLYMER_DN,
        [{ reconciliationItemId: 1, quantity: 5 }],
        null,
        createUser(),
        null,
      );

      expect(item.quantityShipped).toBe(13);
      expect(item.reconciliationStatus).toBe(ReconciliationStatus.DISCREPANCY);
    });

    it("should set status to DISCREPANCY when released exceeds ordered", async () => {
      const item = createItem({
        id: 1,
        quantityOrdered: 10,
        quantityReleased: 8,
        quantityShipped: 0,
      });
      mockItemRepo.findOne.mockResolvedValue(item);
      mockEventRepo.save.mockImplementation((entity) => Promise.resolve({ id: 55, ...entity }));
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.recordEvent(
        COMPANY_ID,
        JOB_CARD_ID,
        ReconciliationEventType.QA_RELEASE,
        [{ reconciliationItemId: 1, quantity: 5 }],
        null,
        createUser(),
        null,
      );

      expect(item.quantityReleased).toBe(13);
      expect(item.reconciliationStatus).toBe(ReconciliationStatus.DISCREPANCY);
    });

    it("should handle multiple items in a single call", async () => {
      const item1 = createItem({
        id: 1,
        quantityOrdered: 10,
        quantityReleased: 0,
        quantityShipped: 0,
      });
      const item2 = createItem({
        id: 2,
        quantityOrdered: 20,
        quantityReleased: 0,
        quantityShipped: 0,
      });

      mockItemRepo.findOne.mockResolvedValueOnce(item1).mockResolvedValueOnce(item2);
      mockEventRepo.save.mockImplementation((entity) => Promise.resolve({ id: 60, ...entity }));
      mockItemRepo.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.recordEvent(
        COMPANY_ID,
        JOB_CARD_ID,
        ReconciliationEventType.QA_RELEASE,
        [
          { reconciliationItemId: 1, quantity: 5 },
          { reconciliationItemId: 2, quantity: 10 },
        ],
        "REF-002",
        createUser(),
        null,
      );

      expect(result).toHaveLength(2);
      expect(item1.quantityReleased).toBe(5);
      expect(item2.quantityReleased).toBe(10);
    });

    it("should throw NotFoundException when item does not exist", async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordEvent(
          COMPANY_ID,
          JOB_CARD_ID,
          ReconciliationEventType.QA_RELEASE,
          [{ reconciliationItemId: 999, quantity: 5 }],
          null,
          createUser(),
          null,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("summary", () => {
    it("should return aggregated summary for a job card", async () => {
      const items = [
        createItem({
          id: 1,
          quantityOrdered: 10,
          quantityReleased: 10,
          quantityShipped: 10,
          quantityMps: 5,
          reconciliationStatus: ReconciliationStatus.COMPLETE,
        }),
        createItem({
          id: 2,
          quantityOrdered: 20,
          quantityReleased: 5,
          quantityShipped: 0,
          quantityMps: 0,
          reconciliationStatus: ReconciliationStatus.PARTIAL,
        }),
        createItem({
          id: 3,
          quantityOrdered: 15,
          quantityReleased: 0,
          quantityShipped: 0,
          quantityMps: 0,
          reconciliationStatus: ReconciliationStatus.PENDING,
        }),
        createItem({
          id: 4,
          quantityOrdered: 8,
          quantityReleased: 12,
          quantityShipped: 10,
          quantityMps: 3,
          reconciliationStatus: ReconciliationStatus.DISCREPANCY,
        }),
      ];

      mockItemRepo.find.mockResolvedValue(items);

      const result = await service.summary(COMPANY_ID, JOB_CARD_ID);

      expect(result).toEqual({
        totalItems: 4,
        totalOrdered: 53,
        totalReleased: 27,
        totalShipped: 20,
        totalMps: 8,
        pending: 1,
        partial: 1,
        complete: 1,
        discrepancy: 1,
      });
    });

    it("should return zero summary when no items exist", async () => {
      mockItemRepo.find.mockResolvedValue([]);

      const result = await service.summary(COMPANY_ID, JOB_CARD_ID);

      expect(result).toEqual({
        totalItems: 0,
        totalOrdered: 0,
        totalReleased: 0,
        totalShipped: 0,
        totalMps: 0,
        pending: 0,
        partial: 0,
        complete: 0,
        discrepancy: 0,
      });
    });

    it("should correctly count single item summary", async () => {
      const items = [
        createItem({
          id: 1,
          quantityOrdered: 100,
          quantityReleased: 50,
          quantityShipped: 25,
          quantityMps: 10,
          reconciliationStatus: ReconciliationStatus.PARTIAL,
        }),
      ];

      mockItemRepo.find.mockResolvedValue(items);

      const result = await service.summary(COMPANY_ID, JOB_CARD_ID);

      expect(result).toEqual({
        totalItems: 1,
        totalOrdered: 100,
        totalReleased: 50,
        totalShipped: 25,
        totalMps: 10,
        pending: 0,
        partial: 1,
        complete: 0,
        discrepancy: 0,
      });
    });
  });
});
