import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { fromISO } from "../../lib/datetime";
import { CustomFieldDefinition, CustomFieldType } from "../entities/custom-field-definition.entity";
import { CustomFieldService } from "./custom-field.service";

describe("CustomFieldService", () => {
  let service: CustomFieldService;

  const mockCustomFieldRepo: Partial<
    Record<keyof import("typeorm").Repository<CustomFieldDefinition>, jest.Mock>
  > = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const sampleField = (overrides: Partial<CustomFieldDefinition> = {}): CustomFieldDefinition =>
    ({
      id: 1,
      userId: 100,
      name: "Industry",
      fieldKey: "industry",
      fieldType: CustomFieldType.TEXT,
      isRequired: false,
      options: null,
      displayOrder: 0,
      isActive: true,
      createdAt: testDate,
      updatedAt: testDate,
      ...overrides,
    }) as CustomFieldDefinition;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldService,
        { provide: getRepositoryToken(CustomFieldDefinition), useValue: mockCustomFieldRepo },
      ],
    }).compile();

    service = module.get<CustomFieldService>(CustomFieldService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a custom field definition", async () => {
      mockCustomFieldRepo.findOne!.mockResolvedValue(null);
      const created = sampleField();
      mockCustomFieldRepo.create!.mockReturnValue(created);
      mockCustomFieldRepo.save!.mockResolvedValue(created);

      const result = await service.create(100, {
        name: "Industry",
        fieldKey: "industry",
      });

      expect(result.id).toBe(1);
      expect(result.name).toBe("Industry");
      expect(mockCustomFieldRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 100,
          name: "Industry",
          fieldKey: "industry",
          fieldType: CustomFieldType.TEXT,
          isRequired: false,
          options: null,
          displayOrder: 0,
          isActive: true,
        }),
      );
    });

    it("should throw ConflictException when fieldKey already exists", async () => {
      mockCustomFieldRepo.findOne!.mockResolvedValue(sampleField());

      await expect(service.create(100, { name: "Industry", fieldKey: "industry" })).rejects.toThrow(
        ConflictException,
      );
    });

    it("should create a select field with options", async () => {
      mockCustomFieldRepo.findOne!.mockResolvedValue(null);
      const selectField = sampleField({
        fieldType: CustomFieldType.SELECT,
        options: ["Option A", "Option B"],
      });
      mockCustomFieldRepo.create!.mockReturnValue(selectField);
      mockCustomFieldRepo.save!.mockResolvedValue(selectField);

      const result = await service.create(100, {
        name: "Category",
        fieldKey: "category",
        fieldType: CustomFieldType.SELECT,
        options: ["Option A", "Option B"],
      });

      expect(result.fieldType).toBe(CustomFieldType.SELECT);
      expect(result.options).toEqual(["Option A", "Option B"]);
    });

    it("should create a required field", async () => {
      mockCustomFieldRepo.findOne!.mockResolvedValue(null);
      const requiredField = sampleField({ isRequired: true });
      mockCustomFieldRepo.create!.mockReturnValue(requiredField);
      mockCustomFieldRepo.save!.mockResolvedValue(requiredField);

      await service.create(100, {
        name: "Company Size",
        fieldKey: "company_size",
        isRequired: true,
      });

      expect(mockCustomFieldRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isRequired: true }),
      );
    });
  });

  describe("findAll", () => {
    it("should return only active fields by default", async () => {
      const fields = [sampleField(), sampleField({ id: 2, fieldKey: "size" })];
      mockCustomFieldRepo.find!.mockResolvedValue(fields);

      const result = await service.findAll(100);

      expect(result).toHaveLength(2);
      expect(mockCustomFieldRepo.find).toHaveBeenCalledWith({
        where: { userId: 100, isActive: true },
        order: { displayOrder: "ASC", name: "ASC" },
      });
    });

    it("should include inactive fields when requested", async () => {
      const fields = [sampleField(), sampleField({ id: 2, isActive: false })];
      mockCustomFieldRepo.find!.mockResolvedValue(fields);

      const result = await service.findAll(100, true);

      expect(result).toHaveLength(2);
      expect(mockCustomFieldRepo.find).toHaveBeenCalledWith({
        where: { userId: 100 },
        order: { displayOrder: "ASC", name: "ASC" },
      });
    });

    it("should return empty array when no fields exist", async () => {
      mockCustomFieldRepo.find!.mockResolvedValue([]);

      const result = await service.findAll(100);

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a field by ID and userId", async () => {
      mockCustomFieldRepo.findOne!.mockResolvedValue(sampleField());

      const result = await service.findOne(100, 1);

      expect(result.id).toBe(1);
      expect(mockCustomFieldRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 100 },
      });
    });

    it("should throw NotFoundException when field not found", async () => {
      mockCustomFieldRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOne(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update field properties", async () => {
      const existing = sampleField();
      mockCustomFieldRepo.findOne!.mockResolvedValueOnce(existing);
      mockCustomFieldRepo.save!.mockResolvedValue({ ...existing, name: "Updated Name" });

      const result = await service.update(100, 1, { name: "Updated Name" });

      expect(result.name).toBe("Updated Name");
    });

    it("should throw ConflictException when changing fieldKey to existing key", async () => {
      const existing = sampleField();
      mockCustomFieldRepo
        .findOne!.mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(sampleField({ id: 2, fieldKey: "other_key" }));

      await expect(service.update(100, 1, { fieldKey: "other_key" })).rejects.toThrow(
        ConflictException,
      );
    });

    it("should allow keeping the same fieldKey", async () => {
      const existing = sampleField();
      mockCustomFieldRepo.findOne!.mockResolvedValueOnce(existing).mockResolvedValueOnce(existing);
      mockCustomFieldRepo.save!.mockResolvedValueOnce(existing);

      const result = await service.update(100, 1, { fieldKey: "industry" });

      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when field not found", async () => {
      mockCustomFieldRepo.findOne!.mockReset();
      mockCustomFieldRepo.findOne!.mockResolvedValueOnce(null);

      await expect(service.update(100, 999, { name: "test" })).rejects.toThrow(NotFoundException);
    });

    it("should update isActive to deactivate a field", async () => {
      const existing = sampleField();
      mockCustomFieldRepo.findOne!.mockReset();
      mockCustomFieldRepo.findOne!.mockResolvedValueOnce(existing);
      mockCustomFieldRepo.save!.mockImplementation((f) => Promise.resolve(f));

      const result = await service.update(100, 1, { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it("should update fieldType", async () => {
      const existing = sampleField();
      mockCustomFieldRepo.findOne!.mockResolvedValueOnce(existing);
      mockCustomFieldRepo.save!.mockImplementation((f) => Promise.resolve(f));

      const result = await service.update(100, 1, { fieldType: CustomFieldType.NUMBER });

      expect(result.fieldType).toBe(CustomFieldType.NUMBER);
    });

    it("should update displayOrder", async () => {
      const existing = sampleField();
      mockCustomFieldRepo.findOne!.mockResolvedValueOnce(existing);
      mockCustomFieldRepo.save!.mockImplementation((f) => Promise.resolve(f));

      const result = await service.update(100, 1, { displayOrder: 5 });

      expect(result.displayOrder).toBe(5);
    });
  });

  describe("remove", () => {
    it("should remove a custom field", async () => {
      const existing = sampleField();
      mockCustomFieldRepo.findOne!.mockResolvedValue(existing);
      mockCustomFieldRepo.remove!.mockResolvedValue(existing);

      await service.remove(100, 1);

      expect(mockCustomFieldRepo.remove).toHaveBeenCalledWith(existing);
    });

    it("should throw NotFoundException when field not found", async () => {
      mockCustomFieldRepo.findOne!.mockResolvedValue(null);

      await expect(service.remove(100, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("reorder", () => {
    it("should reorder fields by updating displayOrder", async () => {
      const fields = [
        sampleField({ id: 1, displayOrder: 0 }),
        sampleField({ id: 2, fieldKey: "size", displayOrder: 1 }),
        sampleField({ id: 3, fieldKey: "category", displayOrder: 2 }),
      ];
      mockCustomFieldRepo.find!.mockResolvedValueOnce(fields).mockResolvedValueOnce(fields);
      mockCustomFieldRepo.save!.mockResolvedValue(fields);

      const result = await service.reorder(100, [3, 1, 2]);

      expect(mockCustomFieldRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 3, displayOrder: 0 }),
          expect.objectContaining({ id: 1, displayOrder: 1 }),
          expect.objectContaining({ id: 2, displayOrder: 2 }),
        ]),
      );
    });

    it("should skip IDs that do not exist in fields", async () => {
      const fields = [sampleField({ id: 1, displayOrder: 0 })];
      mockCustomFieldRepo.find!.mockResolvedValueOnce(fields).mockResolvedValueOnce(fields);
      mockCustomFieldRepo.save!.mockResolvedValue([]);

      await service.reorder(100, [1, 999]);

      expect(mockCustomFieldRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 1, displayOrder: 0 })]),
      );
    });

    it("should return updated fields list after reorder", async () => {
      const fields = [sampleField({ id: 1 }), sampleField({ id: 2, fieldKey: "size" })];
      mockCustomFieldRepo.find!.mockResolvedValue(fields);
      mockCustomFieldRepo.save!.mockResolvedValue(fields);

      const result = await service.reorder(100, [2, 1]);

      expect(result).toHaveLength(2);
    });
  });
});
