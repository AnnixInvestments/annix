import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../../lib/datetime";
import { AnnixRepAuthGuard } from "../auth";
import { CustomFieldDefinition, CustomFieldType } from "../entities/custom-field-definition.entity";
import { CustomFieldService } from "../services";
import { CustomFieldController } from "./custom-field.controller";

describe("CustomFieldController", () => {
  let controller: CustomFieldController;
  let service: jest.Mocked<CustomFieldService>;

  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    annixRepUser: {
      userId: 100,
      email: "rep@example.com",
      sessionToken: "test-token",
    },
  };

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
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      reorder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomFieldController],
      providers: [{ provide: CustomFieldService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomFieldController>(CustomFieldController);
    service = module.get(CustomFieldService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST / (create)", () => {
    it("should create a custom field and pass userId from request", async () => {
      const field = sampleField();
      service.create.mockResolvedValue(field);

      const dto = { name: "Industry", fieldKey: "industry" };
      const result = await controller.create(mockRequest as any, dto);

      expect(result).toBe(field);
      expect(service.create).toHaveBeenCalledWith(100, dto);
    });

    it("should pass full DTO to service", async () => {
      const field = sampleField({
        fieldType: CustomFieldType.SELECT,
        options: ["A", "B"],
        isRequired: true,
        displayOrder: 3,
      });
      service.create.mockResolvedValue(field);

      const dto = {
        name: "Category",
        fieldKey: "category",
        fieldType: CustomFieldType.SELECT,
        options: ["A", "B"],
        isRequired: true,
        displayOrder: 3,
      };
      await controller.create(mockRequest as any, dto);

      expect(service.create).toHaveBeenCalledWith(100, dto);
    });
  });

  describe("GET / (findAll)", () => {
    it("should return all active custom fields", async () => {
      const fields = [sampleField(), sampleField({ id: 2, fieldKey: "size" })];
      service.findAll.mockResolvedValue(fields);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledWith(100, false);
    });

    it("should include inactive fields when query param is true", async () => {
      const fields = [sampleField(), sampleField({ id: 2, isActive: false })];
      service.findAll.mockResolvedValue(fields);

      const result = await controller.findAll(mockRequest as any, "true");

      expect(result).toHaveLength(2);
      expect(service.findAll).toHaveBeenCalledWith(100, true);
    });

    it("should pass false when includeInactive is not 'true'", async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(mockRequest as any, "false");

      expect(service.findAll).toHaveBeenCalledWith(100, false);
    });
  });

  describe("GET /:id (findOne)", () => {
    it("should return a custom field by ID", async () => {
      const field = sampleField();
      service.findOne.mockResolvedValue(field);

      const result = await controller.findOne(mockRequest as any, 1);

      expect(result.id).toBe(1);
      expect(service.findOne).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("PATCH /:id (update)", () => {
    it("should update a custom field", async () => {
      const updated = sampleField({ name: "Updated Industry" });
      service.update.mockResolvedValue(updated);

      const dto = { name: "Updated Industry" };
      const result = await controller.update(mockRequest as any, 1, dto);

      expect(result.name).toBe("Updated Industry");
      expect(service.update).toHaveBeenCalledWith(100, 1, dto);
    });
  });

  describe("DELETE /:id (remove)", () => {
    it("should delete a custom field", async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockRequest as any, 1);

      expect(service.remove).toHaveBeenCalledWith(100, 1);
    });
  });

  describe("POST /reorder (reorder)", () => {
    it("should reorder fields and return updated list", async () => {
      const fields = [
        sampleField({ id: 2, displayOrder: 0 }),
        sampleField({ id: 1, displayOrder: 1 }),
      ];
      service.reorder.mockResolvedValue(fields);

      const dto = { orderedIds: [2, 1] };
      const result = await controller.reorder(mockRequest as any, dto);

      expect(result).toHaveLength(2);
      expect(service.reorder).toHaveBeenCalledWith(100, [2, 1]);
    });
  });
});
