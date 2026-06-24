import { Test, TestingModule } from "@nestjs/testing";
import { Address } from "../../lib/value-objects";
import { AnnixRepAuthGuard } from "../auth";
import { Prospect } from "../entities/prospect.entity";
import { ColdCallSuggestion, RoutePlanningService, ScheduleGap } from "../services";
import { RouteController } from "./route.controller";

describe("RouteController", () => {
  let controller: RouteController;
  let service: jest.Mocked<RoutePlanningService>;

  const OWNER_ID = 100;
  const testDate = new Date("2026-01-15T10:00:00Z");

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
      owner: { id: OWNER_ID } as any,
      ownerId: OWNER_ID,
      companyName: "Acme Industrial",
      contactName: "John Doe",
      contactEmail: "john@example.com",
      contactPhone: "0821234567",
      contactTitle: "Procurement Manager",
      address: Address.fromParts({
        streetAddress: "10 Main Rd",
        city: "Johannesburg",
        province: "Gauteng",
        postalCode: "2000",
      }),
      country: "South Africa",
      latitude: -26.2041,
      longitude: 28.0473,
      googlePlaceId: null,
      discoverySource: null,
      discoveredAt: null,
      externalId: null,
      status: "new" as any,
      priority: "medium" as any,
      notes: null,
      tags: null,
      estimatedValue: null,
      crmExternalId: null,
      crmSyncStatus: null,
      crmLastSyncedAt: null,
      lastContactedAt: null,
      nextFollowUpAt: null,
      followUpRecurrence: "none" as any,
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

  const mockGap = (): ScheduleGap => ({
    startTime: testDate,
    endTime: new Date("2026-01-15T11:00:00Z"),
    durationMinutes: 60,
    precedingMeeting: null,
    followingMeeting: null,
    travelFromPrevious: null,
    travelToNext: null,
    effectiveAvailableMinutes: 45,
  });

  const mockSuggestion = (): ColdCallSuggestion => ({
    prospect: mockProspect(),
    distanceKm: 3.2,
    estimatedTravelMinutes: 8,
    reason: "New prospect needs initial contact",
    priority: "high",
    suggestedCallTime: testDate,
    gap: mockGap(),
  });

  beforeEach(async () => {
    const mockService = {
      scheduleGaps: jest.fn(),
      coldCallSuggestions: jest.fn(),
      optimizeRoute: jest.fn(),
      planDayRoute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [{ provide: RoutePlanningService, useValue: mockService }],
    })
      .overrideGuard(AnnixRepAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RouteController>(RouteController);
    service = module.get(RoutePlanningService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("coldCallSuggestions", () => {
    it("should pass query params to the service", async () => {
      service.coldCallSuggestions.mockResolvedValue([mockSuggestion()]);

      await controller.coldCallSuggestions(mockRequest as any, {
        date: "2026-01-15",
        currentLat: -26.2,
        currentLng: 28.0,
        maxSuggestions: 5,
      });

      expect(service.coldCallSuggestions).toHaveBeenCalledWith(
        OWNER_ID,
        expect.any(Date),
        -26.2,
        28.0,
        5,
      );
    });

    it("should flatten the embedded prospect address", async () => {
      service.coldCallSuggestions.mockResolvedValue([mockSuggestion()]);

      const result = await controller.coldCallSuggestions(mockRequest as any, {
        date: "2026-01-15",
      });

      const prospect = result[0].prospect as unknown as Record<string, unknown>;
      expect(prospect.streetAddress).toBe("10 Main Rd");
      expect(prospect.city).toBe("Johannesburg");
      expect(prospect.province).toBe("Gauteng");
      expect(prospect.postalCode).toBe("2000");
      expect(prospect).not.toHaveProperty("address");
      expect(prospect).not.toHaveProperty("owner");
    });

    it("should preserve all other suggestion fields", async () => {
      const suggestion = mockSuggestion();
      service.coldCallSuggestions.mockResolvedValue([suggestion]);

      const result = await controller.coldCallSuggestions(mockRequest as any, {
        date: "2026-01-15",
      });

      expect(result[0].distanceKm).toBe(suggestion.distanceKm);
      expect(result[0].estimatedTravelMinutes).toBe(suggestion.estimatedTravelMinutes);
      expect(result[0].reason).toBe(suggestion.reason);
      expect(result[0].priority).toBe(suggestion.priority);
      expect(result[0].suggestedCallTime).toBe(suggestion.suggestedCallTime);
      expect(result[0].gap).toBe(suggestion.gap);
    });
  });
});
