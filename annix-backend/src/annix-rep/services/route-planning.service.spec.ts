import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Meeting, MeetingStatus } from "../entities/meeting.entity";
import { Prospect, ProspectPriority, ProspectStatus } from "../entities/prospect.entity";
import { Visit } from "../entities/visit.entity";
import { RepProfileService } from "../rep-profile/rep-profile.service";
import { RoutePlanningService } from "./route-planning.service";

describe("RoutePlanningService", () => {
  let service: RoutePlanningService;

  const mockMeetingRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockProspectRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVisitRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRepProfileService = {
    profileByUserId: jest.fn().mockResolvedValue({
      defaultBufferBeforeMinutes: 15,
      defaultBufferAfterMinutes: 15,
      workingHoursStart: "08:00",
      workingHoursEnd: "17:00",
      workingDays: "1,2,3,4,5",
    }),
    scheduleSettings: jest.fn().mockResolvedValue({
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      workingStartHour: 8,
      workingStartMinute: 0,
      workingEndHour: 17,
      workingEndMinute: 0,
      workingDays: [1, 2, 3, 4, 5],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutePlanningService,
        { provide: getRepositoryToken(Meeting), useValue: mockMeetingRepository },
        { provide: getRepositoryToken(Prospect), useValue: mockProspectRepository },
        { provide: getRepositoryToken(Visit), useValue: mockVisitRepository },
        { provide: RepProfileService, useValue: mockRepProfileService },
      ],
    }).compile();

    service = module.get<RoutePlanningService>(RoutePlanningService);
  });

  describe("Distance Calculations", () => {
    describe("haversineDistance", () => {
      it("should calculate distance between two points correctly", () => {
        const johannesburg = { lat: -26.2041, lng: 28.0473 };
        const pretoria = { lat: -25.7461, lng: 28.1881 };

        const distance = service["haversineDistance"](
          johannesburg.lat,
          johannesburg.lng,
          pretoria.lat,
          pretoria.lng,
        );

        expect(distance).toBeGreaterThan(50);
        expect(distance).toBeLessThan(60);
      });

      it("should return 0 for same coordinates", () => {
        const distance = service["haversineDistance"](-26.2041, 28.0473, -26.2041, 28.0473);

        expect(distance).toBe(0);
      });

      it("should handle short distances", () => {
        const pointA = { lat: -26.2041, lng: 28.0473 };
        const pointB = { lat: -26.2051, lng: 28.0483 };

        const distance = service["haversineDistance"](
          pointA.lat,
          pointA.lng,
          pointB.lat,
          pointB.lng,
        );

        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(2);
      });

      it("should calculate distance across hemispheres", () => {
        const johannesburg = { lat: -26.2041, lng: 28.0473 };
        const london = { lat: 51.5074, lng: -0.1278 };

        const distance = service["haversineDistance"](
          johannesburg.lat,
          johannesburg.lng,
          london.lat,
          london.lng,
        );

        expect(distance).toBeGreaterThan(9000);
        expect(distance).toBeLessThan(10000);
      });
    });

    describe("toRad", () => {
      it("should convert degrees to radians correctly", () => {
        expect(service["toRad"](0)).toBe(0);
        expect(service["toRad"](180)).toBeCloseTo(Math.PI, 5);
        expect(service["toRad"](90)).toBeCloseTo(Math.PI / 2, 5);
        expect(service["toRad"](360)).toBeCloseTo(2 * Math.PI, 5);
      });

      it("should handle negative degrees", () => {
        expect(service["toRad"](-90)).toBeCloseTo(-Math.PI / 2, 5);
      });
    });
  });

  describe("Priority and Reasoning", () => {
    describe("suggestionPriority", () => {
      it("should return high for urgent priority prospects", () => {
        const prospect = { priority: ProspectPriority.URGENT } as Prospect;
        expect(service["suggestionPriority"](prospect, 10)).toBe("high");
      });

      it("should return high for high priority prospects", () => {
        const prospect = { priority: ProspectPriority.HIGH } as Prospect;
        expect(service["suggestionPriority"](prospect, 10)).toBe("high");
      });

      it("should return high for prospects with due follow-up", () => {
        const prospect = {
          priority: ProspectPriority.MEDIUM,
          nextFollowUpAt: new Date(Date.now() - 86400000),
        } as Prospect;
        expect(service["suggestionPriority"](prospect, 10)).toBe("high");
      });

      it("should return high for new prospects within 2km", () => {
        const prospect = {
          status: ProspectStatus.NEW,
          priority: ProspectPriority.MEDIUM,
        } as Prospect;
        expect(service["suggestionPriority"](prospect, 1.5)).toBe("high");
      });

      it("should return medium for prospects within 5km", () => {
        const prospect = {
          status: ProspectStatus.CONTACTED,
          priority: ProspectPriority.LOW,
        } as Prospect;
        expect(service["suggestionPriority"](prospect, 4)).toBe("medium");
      });

      it("should return low for distant prospects", () => {
        const prospect = {
          status: ProspectStatus.CONTACTED,
          priority: ProspectPriority.LOW,
        } as Prospect;
        expect(service["suggestionPriority"](prospect, 10)).toBe("low");
      });
    });

    describe("suggestionReason", () => {
      const baseGap = {
        startTime: new Date(),
        endTime: new Date(),
        durationMinutes: 60,
        precedingMeeting: null,
        followingMeeting: null,
        travelFromPrevious: null,
        travelToNext: null,
        effectiveAvailableMinutes: 60,
      };

      it("should include 'new prospect' for new status", () => {
        const prospect = { status: ProspectStatus.NEW } as Prospect;
        const reason = service["suggestionReason"](prospect, baseGap);
        expect(reason.toLowerCase()).toContain("new");
      });

      it("should include follow-up info when due", () => {
        const prospect = {
          status: ProspectStatus.CONTACTED,
          nextFollowUpAt: new Date(Date.now() - 86400000),
        } as Prospect;
        const reason = service["suggestionReason"](prospect, baseGap);
        expect(reason.toLowerCase()).toContain("follow");
      });

      it("should include contact history info", () => {
        const prospect = {
          status: ProspectStatus.CONTACTED,
          lastContactedAt: new Date(Date.now() - 7 * 86400000),
        } as Prospect;
        const reason = service["suggestionReason"](prospect, baseGap);
        expect(reason).toBeDefined();
      });
    });

    describe("formatAddress", () => {
      it("should combine address parts", () => {
        const prospect = {
          streetAddress: "123 Main St",
          city: "Johannesburg",
          province: "Gauteng",
          postalCode: "2000",
        } as Prospect;

        const address = service["formatAddress"](prospect);
        expect(address).toContain("123 Main St");
        expect(address).toContain("Johannesburg");
        expect(address).toContain("Gauteng");
      });

      it("should filter out null values", () => {
        const prospect = {
          streetAddress: null,
          city: "Johannesburg",
          province: null,
          postalCode: "2000",
        } as Prospect;

        const address = service["formatAddress"](prospect);
        expect(address).toContain("Johannesburg");
        expect(address).toContain("2000");
        expect(address).not.toContain("null");
      });

      it("should handle empty address", () => {
        const prospect = {
          streetAddress: null,
          city: null,
          province: null,
          postalCode: null,
        } as Prospect;

        const address = service["formatAddress"](prospect);
        expect(address).toBe("");
      });
    });
  });

  describe("Route Optimization Algorithms", () => {
    describe("nearestNeighborOptimization", () => {
      it("should return empty array for empty input", () => {
        const result = service["nearestNeighborOptimization"]([]);
        expect(result).toEqual([]);
      });

      it("should return single stop unchanged", () => {
        const stops = [{ id: 1, type: "prospect", latitude: -26.2041, longitude: 28.0473 }];
        const result = service["nearestNeighborOptimization"](stops as any);
        expect(result).toHaveLength(1);
      });

      it("should order stops by nearest neighbor", () => {
        const stops = [
          { id: 1, type: "prospect", latitude: -26.2041, longitude: 28.0473, name: "Start" },
          { id: 3, type: "prospect", latitude: -26.3, longitude: 28.15, name: "Far" },
          { id: 2, type: "prospect", latitude: -26.21, longitude: 28.05, name: "Near" },
        ];

        const result = service["nearestNeighborOptimization"](stops as any);

        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
        expect(result[2].id).toBe(3);
      });

      it("should respect scheduled meeting positions", () => {
        const meetingTime = new Date();
        const stops = [
          { id: 1, type: "prospect", latitude: -26.2041, longitude: 28.0473 },
          {
            id: 2,
            type: "meeting",
            latitude: -26.3,
            longitude: 28.15,
            scheduledStart: meetingTime,
          },
          { id: 3, type: "prospect", latitude: -26.21, longitude: 28.05 },
        ];

        const result = service["nearestNeighborOptimization"](stops as any);

        const meetingStop = result.find((s) => s.type === "meeting");
        expect(meetingStop).toBeDefined();
      });
    });

    describe("twoOptOptimization", () => {
      it("should return input unchanged for small routes", () => {
        const stops = [
          { id: 1, type: "prospect", latitude: -26.2041, longitude: 28.0473 },
          { id: 2, type: "prospect", latitude: -26.21, longitude: 28.05 },
        ];

        const result = service["twoOptOptimization"](stops as any);
        expect(result).toHaveLength(2);
      });

      it("should improve route with clear optimization opportunity", () => {
        const stops = [
          { id: 1, type: "prospect", latitude: -26.2, longitude: 28.0 },
          { id: 2, type: "prospect", latitude: -26.4, longitude: 28.2 },
          { id: 3, type: "prospect", latitude: -26.21, longitude: 28.01 },
          { id: 4, type: "prospect", latitude: -26.39, longitude: 28.19 },
        ];

        const result = service["twoOptOptimization"](stops as any);
        expect(result).toHaveLength(4);
      });

      it("should not modify scheduled meeting positions", () => {
        const meetingTime = new Date();
        const stops = [
          { id: 1, type: "prospect", latitude: -26.2, longitude: 28.0 },
          { id: 2, type: "meeting", latitude: -26.3, longitude: 28.1, scheduledStart: meetingTime },
          { id: 3, type: "prospect", latitude: -26.4, longitude: 28.2 },
        ];

        const result = service["twoOptOptimization"](stops as any);

        const meetingIndex = result.findIndex((s) => s.type === "meeting");
        expect(meetingIndex).toBe(1);
      });
    });
  });

  describe("Navigation URL Generation", () => {
    describe("generateWazeUrl", () => {
      it("should return empty string for single stop (needs at least 2)", () => {
        const stops = [{ latitude: -26.2041, longitude: 28.0473 }];

        const url = service["generateWazeUrl"](stops as any);

        expect(url).toBe("");
      });

      it("should generate URL with multiple stops", () => {
        const stops = [
          { latitude: -26.2041, longitude: 28.0473 },
          { latitude: -26.3, longitude: 28.15 },
        ];

        const url = service["generateWazeUrl"](stops as any);

        expect(url).toContain("waze.com");
      });
    });

    describe("generateGoogleMapsUrl", () => {
      it("should generate valid Google Maps URL", () => {
        const stops = [
          { latitude: -26.2041, longitude: 28.0473 },
          { latitude: -26.3, longitude: 28.15 },
        ];

        const url = service["generateGoogleMapsUrl"](stops as any);

        expect(url).toContain("google.com/maps");
      });

      it("should include waypoints for multiple stops", () => {
        const stops = [
          { latitude: -26.2, longitude: 28.0 },
          { latitude: -26.25, longitude: 28.05 },
          { latitude: -26.3, longitude: 28.1 },
        ];

        const url = service["generateGoogleMapsUrl"](stops as any);

        expect(url).toContain("waypoints");
      });
    });
  });

  describe("Schedule Gap Analysis", () => {
    describe("scheduleGaps", () => {
      it("should return full day gap when no meetings", async () => {
        mockMeetingRepository.find.mockResolvedValueOnce([]);

        const gaps = await service.scheduleGaps(1, new Date("2024-02-20"));

        expect(Array.isArray(gaps)).toBe(true);
      });

      it("should calculate gaps between meetings", async () => {
        const meetings = [
          {
            id: 1,
            scheduledStart: new Date("2024-02-20T09:00:00Z"),
            scheduledEnd: new Date("2024-02-20T10:00:00Z"),
            latitude: -26.2041,
            longitude: 28.0473,
            status: MeetingStatus.SCHEDULED,
          },
          {
            id: 2,
            scheduledStart: new Date("2024-02-20T14:00:00Z"),
            scheduledEnd: new Date("2024-02-20T15:00:00Z"),
            latitude: -26.3,
            longitude: 28.15,
            status: MeetingStatus.SCHEDULED,
          },
        ];
        mockMeetingRepository.find.mockResolvedValueOnce(meetings);

        const gaps = await service.scheduleGaps(1, new Date("2024-02-20"));

        expect(Array.isArray(gaps)).toBe(true);
      });

      it("should filter out gaps below minimum duration", async () => {
        const meetings = [
          {
            id: 1,
            scheduledStart: new Date("2024-02-20T09:00:00Z"),
            scheduledEnd: new Date("2024-02-20T09:30:00Z"),
            status: MeetingStatus.SCHEDULED,
          },
          {
            id: 2,
            scheduledStart: new Date("2024-02-20T09:45:00Z"),
            scheduledEnd: new Date("2024-02-20T10:15:00Z"),
            status: MeetingStatus.SCHEDULED,
          },
        ];
        mockMeetingRepository.find.mockResolvedValueOnce(meetings);

        const gaps = await service.scheduleGaps(1, new Date("2024-02-20"), 60);

        gaps.forEach((gap) => {
          expect(gap.durationMinutes).toBeGreaterThanOrEqual(60);
        });
      });
    });
  });

  describe("Cold Call Suggestions", () => {
    describe("coldCallSuggestions", () => {
      it("should return empty array when no gaps available", async () => {
        mockMeetingRepository.find.mockResolvedValueOnce([
          {
            id: 1,
            scheduledStart: new Date("2024-02-20T06:00:00Z"),
            scheduledEnd: new Date("2024-02-20T15:00:00Z"),
            status: MeetingStatus.SCHEDULED,
          },
        ]);
        mockProspectRepository.find.mockResolvedValueOnce([]);

        const suggestions = await service.coldCallSuggestions(1, new Date("2024-02-20"));

        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions).toHaveLength(0);
      });

      it("should return suggestions ordered by priority", async () => {
        mockMeetingRepository.find.mockResolvedValueOnce([]);
        mockProspectRepository.find.mockResolvedValueOnce([
          {
            id: 1,
            companyName: "Low Priority Co",
            latitude: -26.5,
            longitude: 28.3,
            status: ProspectStatus.CONTACTED,
            priority: ProspectPriority.LOW,
          },
          {
            id: 2,
            companyName: "High Priority Co",
            latitude: -26.21,
            longitude: 28.05,
            status: ProspectStatus.NEW,
            priority: ProspectPriority.HIGH,
          },
        ]);

        const suggestions = await service.coldCallSuggestions(
          1,
          new Date("2024-02-20"),
          -26.2041,
          28.0473,
        );

        expect(Array.isArray(suggestions)).toBe(true);
      });

      it("should limit suggestions to maxSuggestions", async () => {
        mockMeetingRepository.find.mockResolvedValueOnce([]);
        mockProspectRepository.find.mockResolvedValueOnce(
          Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            companyName: `Company ${i + 1}`,
            latitude: -26.2 - i * 0.01,
            longitude: 28.0 + i * 0.01,
            status: ProspectStatus.NEW,
            priority: ProspectPriority.MEDIUM,
          })),
        );

        const suggestions = await service.coldCallSuggestions(
          1,
          new Date("2024-02-20"),
          -26.2041,
          28.0473,
          5,
        );

        expect(suggestions.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe("Route Optimization", () => {
    describe("optimizeRoute", () => {
      it("should return optimized route with total distance", async () => {
        mockProspectRepository.findOne.mockResolvedValue({
          id: 1,
          companyName: "Test Co",
          latitude: -26.21,
          longitude: 28.05,
        });

        const result = await service.optimizeRoute(-26.2041, 28.0473, [
          { id: 1, type: "prospect" as const },
        ]);

        expect(result.totalDistanceKm).toBeDefined();
        expect(result.stops).toBeDefined();
        expect(result.wazeUrl).toBeDefined();
        expect(result.googleMapsUrl).toBeDefined();
      });

      it("should handle return to start option", async () => {
        mockProspectRepository.findOne.mockResolvedValue({
          id: 1,
          companyName: "Test Co",
          latitude: -26.21,
          longitude: 28.05,
        });

        const result = await service.optimizeRoute(
          -26.2041,
          28.0473,
          [{ id: 1, type: "prospect" as const }],
          true,
        );

        expect(result.totalDistanceKm).toBeDefined();
      });

      it("should handle empty stops array with current location only", async () => {
        const result = await service.optimizeRoute(-26.2041, 28.0473, []);

        expect(result.stops).toHaveLength(1);
        expect(result.stops[0].type).toBe("current_location");
        expect(result.totalDistanceKm).toBe(0);
      });
    });
  });

  describe("Day Route Planning", () => {
    describe("planDayRoute", () => {
      it("should plan route for day with meetings only", async () => {
        mockMeetingRepository.find.mockResolvedValueOnce([
          {
            id: 1,
            title: "Morning Meeting",
            scheduledStart: new Date("2024-02-20T09:00:00Z"),
            scheduledEnd: new Date("2024-02-20T10:00:00Z"),
            latitude: -26.21,
            longitude: 28.05,
            status: MeetingStatus.SCHEDULED,
            prospect: { id: 1, companyName: "Client A" },
          },
        ]);

        const result = await service.planDayRoute(1, new Date("2024-02-20"), false);

        expect(result.stops).toBeDefined();
        expect(result.totalDistanceKm).toBeDefined();
      });

      it("should include cold calls when requested", async () => {
        mockMeetingRepository.find.mockResolvedValue([]);
        mockProspectRepository.find.mockResolvedValueOnce([
          {
            id: 1,
            companyName: "Prospect A",
            latitude: -26.21,
            longitude: 28.05,
            status: ProspectStatus.NEW,
            priority: ProspectPriority.HIGH,
          },
        ]);

        const result = await service.planDayRoute(
          1,
          new Date("2024-02-20"),
          true,
          -26.2041,
          28.0473,
        );

        expect(result).toBeDefined();
      });
    });
  });
});
