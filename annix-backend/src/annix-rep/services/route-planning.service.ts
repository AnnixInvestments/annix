import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Not, Repository } from "typeorm";
import { fromJSDate, now } from "../../lib/datetime";
import { Meeting, MeetingStatus, Prospect, ProspectStatus, Visit } from "../entities";
import { RepProfileService } from "../rep-profile/rep-profile.service";

export interface TravelInfo {
  distanceKm: number;
  estimatedMinutes: number;
}

export interface ScheduleGap {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  precedingMeeting: Meeting | null;
  followingMeeting: Meeting | null;
  travelFromPrevious: TravelInfo | null;
  travelToNext: TravelInfo | null;
  effectiveAvailableMinutes: number;
}

export interface ColdCallSuggestion {
  prospect: Prospect;
  distanceKm: number;
  estimatedTravelMinutes: number;
  reason: string;
  priority: "high" | "medium" | "low";
  suggestedCallTime: Date;
  gap: ScheduleGap;
}

export interface RouteStop {
  type: "prospect" | "meeting" | "current_location";
  id?: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  arrivalTime?: Date;
  departureTime?: Date;
  durationMinutes?: number;
}

export interface OptimizedRoute {
  totalDistanceKm: number;
  totalDurationMinutes: number;
  stops: RouteStop[];
  wazeUrl: string;
  googleMapsUrl: string;
}

@Injectable()
export class RoutePlanningService {
  private readonly logger = new Logger(RoutePlanningService.name);

  private readonly AVERAGE_SPEED_KMH = 40;
  private readonly MIN_GAP_MINUTES = 45;
  private readonly COLD_CALL_DURATION_MINUTES = 30;
  private readonly WORKING_START_HOUR = 8;
  private readonly WORKING_END_HOUR = 17;
  private readonly MIN_AVAILABLE_MINUTES = 15;
  private readonly OVERDUE_CONTACT_DAYS = 14;
  private readonly HIGH_PRIORITY_DISTANCE_KM = 2;
  private readonly MEDIUM_PRIORITY_DISTANCE_KM = 5;
  private readonly MAX_NEARBY_PROSPECTS_PER_GAP = 2;
  private readonly TWO_OPT_IMPROVEMENT_THRESHOLD = 0.1;
  private readonly EARTH_RADIUS_KM = 6371;

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(Prospect)
    private readonly prospectRepo: Repository<Prospect>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
    private readonly repProfileService: RepProfileService,
  ) {}

  async scheduleGaps(
    userId: number,
    date: Date,
    minGapMinutes: number = this.MIN_GAP_MINUTES,
  ): Promise<ScheduleGap[]> {
    const settings = await this.repProfileService.scheduleSettings(userId);

    const dayStart = fromJSDate(date)
      .set({
        hour: settings.workingStartHour,
        minute: settings.workingStartMinute,
        second: 0,
        millisecond: 0,
      })
      .toJSDate();

    const dayEnd = fromJSDate(date)
      .set({
        hour: settings.workingEndHour,
        minute: settings.workingEndMinute,
        second: 0,
        millisecond: 0,
      })
      .toJSDate();

    const meetings = await this.meetingRepo.find({
      where: {
        salesRepId: userId,
        scheduledStart: Between(dayStart, dayEnd),
        status: In([MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS]),
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });

    const gaps: ScheduleGap[] = [];

    const calculateTravel = (
      fromMeeting: Meeting | null,
      toMeeting: Meeting | null,
    ): TravelInfo | null => {
      if (!fromMeeting?.latitude || !fromMeeting?.longitude) return null;
      if (!toMeeting?.latitude || !toMeeting?.longitude) return null;

      const distance = this.haversineDistance(
        Number(fromMeeting.latitude),
        Number(fromMeeting.longitude),
        Number(toMeeting.latitude),
        Number(toMeeting.longitude),
      );
      return {
        distanceKm: Math.round(distance * 10) / 10,
        estimatedMinutes: Math.round((distance / this.AVERAGE_SPEED_KMH) * 60),
      };
    };

    const createGap = (
      startTime: Date,
      endTime: Date,
      precedingMeeting: Meeting | null,
      followingMeeting: Meeting | null,
    ): ScheduleGap => {
      const durationMinutes = fromJSDate(endTime).diff(fromJSDate(startTime), "minutes").minutes;
      const travelFromPrevious = calculateTravel(precedingMeeting, followingMeeting);
      const travelToNext = calculateTravel(precedingMeeting, followingMeeting);

      let effectiveAvailableMinutes = durationMinutes;
      effectiveAvailableMinutes -= settings.bufferAfterMinutes;
      effectiveAvailableMinutes -= settings.bufferBeforeMinutes;
      if (travelFromPrevious) {
        effectiveAvailableMinutes -= travelFromPrevious.estimatedMinutes;
      }

      return {
        startTime,
        endTime,
        durationMinutes,
        precedingMeeting,
        followingMeeting,
        travelFromPrevious,
        travelToNext,
        effectiveAvailableMinutes: Math.max(0, effectiveAvailableMinutes),
      };
    };

    if (meetings.length === 0) {
      gaps.push(createGap(dayStart, dayEnd, null, null));
      return gaps;
    }

    const firstMeeting = meetings[0];
    const firstMeetingStart = fromJSDate(firstMeeting.scheduledStart);
    const adjustedFirstStart = firstMeetingStart
      .minus({ minutes: settings.bufferBeforeMinutes })
      .toJSDate();

    if (adjustedFirstStart > dayStart) {
      const gapMinutes = fromJSDate(adjustedFirstStart).diff(
        fromJSDate(dayStart),
        "minutes",
      ).minutes;
      if (gapMinutes >= minGapMinutes) {
        gaps.push(createGap(dayStart, adjustedFirstStart, null, firstMeeting));
      }
    }

    meetings.slice(0, -1).forEach((currentMeeting, i) => {
      const nextMeeting = meetings[i + 1];

      const adjustedCurrentEnd = fromJSDate(currentMeeting.scheduledEnd)
        .plus({ minutes: settings.bufferAfterMinutes })
        .toJSDate();

      const adjustedNextStart = fromJSDate(nextMeeting.scheduledStart)
        .minus({ minutes: settings.bufferBeforeMinutes })
        .toJSDate();

      const gapMinutes = fromJSDate(adjustedNextStart).diff(
        fromJSDate(adjustedCurrentEnd),
        "minutes",
      ).minutes;

      if (gapMinutes >= minGapMinutes) {
        gaps.push(createGap(adjustedCurrentEnd, adjustedNextStart, currentMeeting, nextMeeting));
      }
    });

    const lastMeeting = meetings[meetings.length - 1];
    const adjustedLastEnd = fromJSDate(lastMeeting.scheduledEnd)
      .plus({ minutes: settings.bufferAfterMinutes })
      .toJSDate();

    if (adjustedLastEnd < dayEnd) {
      const gapMinutes = fromJSDate(dayEnd).diff(fromJSDate(adjustedLastEnd), "minutes").minutes;
      if (gapMinutes >= minGapMinutes) {
        gaps.push(createGap(adjustedLastEnd, dayEnd, lastMeeting, null));
      }
    }

    return gaps;
  }

  async coldCallSuggestions(
    userId: number,
    date: Date,
    currentLat?: number,
    currentLng?: number,
    maxSuggestions: number = 5,
  ): Promise<ColdCallSuggestion[]> {
    const gaps = await this.scheduleGaps(userId, date);

    if (gaps.length === 0) {
      return [];
    }

    const activeStatuses = [ProspectStatus.NEW, ProspectStatus.CONTACTED, ProspectStatus.QUALIFIED];

    const prospects = await this.prospectRepo.find({
      where: {
        ownerId: userId,
        status: In(activeStatuses),
        latitude: Not(null as unknown as number),
        longitude: Not(null as unknown as number),
      },
      order: { priority: "DESC", lastContactedAt: "ASC" },
    });

    if (prospects.length === 0) {
      return [];
    }

    const suggestions = gaps.reduce<ColdCallSuggestion[]>((acc, gap) => {
      const availableMinutes = gap.durationMinutes - this.COLD_CALL_DURATION_MINUTES;
      if (availableMinutes < this.MIN_AVAILABLE_MINUTES) return acc;

      const referencePoint =
        gap.precedingMeeting?.latitude && gap.precedingMeeting?.longitude
          ? {
              lat: Number(gap.precedingMeeting.latitude),
              lng: Number(gap.precedingMeeting.longitude),
            }
          : currentLat && currentLng
            ? { lat: currentLat, lng: currentLng }
            : null;

      if (!referencePoint) return acc;

      const maxTravelMinutes = (availableMinutes - this.COLD_CALL_DURATION_MINUTES) / 2;
      const maxDistanceKm = (maxTravelMinutes / 60) * this.AVERAGE_SPEED_KMH;

      const nearbyProspects = prospects
        .map((prospect) => ({
          prospect,
          distance: this.haversineDistance(
            referencePoint.lat,
            referencePoint.lng,
            Number(prospect.latitude),
            Number(prospect.longitude),
          ),
        }))
        .filter((p) => p.distance <= maxDistanceKm)
        .sort((a, b) => a.distance - b.distance);

      const newSuggestions = nearbyProspects
        .slice(0, this.MAX_NEARBY_PROSPECTS_PER_GAP)
        .filter(({ prospect }) => !acc.some((s) => s.prospect.id === prospect.id))
        .map(({ prospect, distance }) => {
          const travelMinutes = (distance / this.AVERAGE_SPEED_KMH) * 60;
          return {
            prospect,
            distanceKm: Math.round(distance * 10) / 10,
            estimatedTravelMinutes: Math.round(travelMinutes),
            reason: this.suggestionReason(prospect, gap),
            priority: this.suggestionPriority(prospect, distance),
            suggestedCallTime: fromJSDate(gap.startTime)
              .plus({ minutes: travelMinutes })
              .toJSDate(),
            gap,
          };
        });

      return [...acc, ...newSuggestions];
    }, []);

    return suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, maxSuggestions);
  }

  async optimizeRoute(
    startLat: number,
    startLng: number,
    stops: Array<{ id: number; type: "prospect" | "meeting" }>,
    returnToStart: boolean = false,
  ): Promise<OptimizedRoute> {
    const stopDetails: RouteStop[] = [
      {
        type: "current_location",
        name: "Current Location",
        address: null,
        latitude: startLat,
        longitude: startLng,
      },
    ];

    await stops.reduce(async (accPromise, stop) => {
      const acc = await accPromise;
      if (stop.type === "prospect") {
        const prospect = await this.prospectRepo.findOne({ where: { id: stop.id } });
        if (prospect?.latitude && prospect.longitude) {
          acc.push({
            type: "prospect",
            id: prospect.id,
            name: prospect.companyName,
            address: this.formatAddress(prospect),
            latitude: Number(prospect.latitude),
            longitude: Number(prospect.longitude),
            durationMinutes: this.COLD_CALL_DURATION_MINUTES,
          });
        }
      } else if (stop.type === "meeting") {
        const meeting = await this.meetingRepo.findOne({
          where: { id: stop.id },
          relations: ["prospect"],
        });
        if (meeting?.latitude && meeting.longitude) {
          const durationMinutes = fromJSDate(meeting.scheduledEnd).diff(
            fromJSDate(meeting.scheduledStart),
            "minutes",
          ).minutes;

          acc.push({
            type: "meeting",
            id: meeting.id,
            name: meeting.title,
            address: meeting.location,
            latitude: Number(meeting.latitude),
            longitude: Number(meeting.longitude),
            arrivalTime: meeting.scheduledStart,
            departureTime: meeting.scheduledEnd,
            durationMinutes,
          });
        }
      }
      return acc;
    }, Promise.resolve(stopDetails));

    if (stopDetails.length <= 2) {
      return this.buildRouteResult(stopDetails, returnToStart);
    }

    const optimizedStops = this.nearestNeighborOptimization(stopDetails);
    const finalStops = this.twoOptOptimization(optimizedStops);

    return this.buildRouteResult(finalStops, returnToStart);
  }

  async planDayRoute(
    userId: number,
    date: Date,
    includeColdCalls: boolean = true,
    currentLat?: number,
    currentLng?: number,
  ): Promise<OptimizedRoute> {
    const dateTime = fromJSDate(date);
    const dayStart = dateTime
      .set({ hour: this.WORKING_START_HOUR, minute: 0, second: 0, millisecond: 0 })
      .toJSDate();

    const dayEnd = dateTime
      .set({ hour: this.WORKING_END_HOUR, minute: 0, second: 0, millisecond: 0 })
      .toJSDate();

    const meetings = await this.meetingRepo.find({
      where: {
        salesRepId: userId,
        scheduledStart: Between(dayStart, dayEnd),
        status: MeetingStatus.SCHEDULED,
        latitude: Not(null as unknown as number),
        longitude: Not(null as unknown as number),
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });

    const stops: Array<{ id: number; type: "prospect" | "meeting" }> = meetings.map((m) => ({
      id: m.id,
      type: "meeting" as const,
    }));

    if (includeColdCalls && currentLat && currentLng) {
      const suggestions = await this.coldCallSuggestions(userId, date, currentLat, currentLng, 3);
      stops.push(
        ...suggestions.map((suggestion) => ({
          id: suggestion.prospect.id,
          type: "prospect" as const,
        })),
      );
    }

    const startLat = currentLat ?? (meetings[0]?.latitude ? Number(meetings[0].latitude) : 0);
    const startLng = currentLng ?? (meetings[0]?.longitude ? Number(meetings[0].longitude) : 0);

    if (startLat === 0 || startLng === 0) {
      return {
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        stops: [],
        wazeUrl: "",
        googleMapsUrl: "",
      };
    }

    return this.optimizeRoute(startLat, startLng, stops, false);
  }

  private nearestNeighborOptimization(stops: RouteStop[]): RouteStop[] {
    if (stops.length <= 2) return stops;

    const result: RouteStop[] = [stops[0]];
    const remaining = stops.slice(1);

    while (remaining.length > 0) {
      const current = result[result.length - 1];
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const distance = this.haversineDistance(
          current.latitude,
          current.longitude,
          remaining[i].latitude,
          remaining[i].longitude,
        );

        if (remaining[i].arrivalTime) {
          continue;
        }

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const scheduledStops = remaining.filter((s) => s.arrivalTime);
      if (scheduledStops.length > 0) {
        const nextScheduled = scheduledStops.sort(
          (a, b) => fromJSDate(a.arrivalTime!).toMillis() - fromJSDate(b.arrivalTime!).toMillis(),
        )[0];
        const scheduledIndex = remaining.indexOf(nextScheduled);

        const unscheduledBefore = remaining.filter(
          (s, i) => !s.arrivalTime && i !== scheduledIndex,
        );

        if (unscheduledBefore.length === 0) {
          result.push(remaining.splice(scheduledIndex, 1)[0]);
          continue;
        }
      }

      result.push(remaining.splice(nearestIndex, 1)[0]);
    }

    return result;
  }

  private twoOptOptimization(stops: RouteStop[]): RouteStop[] {
    if (stops.length <= 3) return stops;

    const fixedIndices = stops.map((s, i) => (s.arrivalTime ? i : -1)).filter((i) => i !== -1);

    let improved = true;
    let route = [...stops];

    while (improved) {
      improved = false;

      for (let i = 1; i < route.length - 2; i++) {
        if (fixedIndices.includes(i)) continue;

        for (let j = i + 1; j < route.length - 1; j++) {
          if (fixedIndices.includes(j)) continue;

          const currentDistance =
            this.haversineDistance(
              route[i - 1].latitude,
              route[i - 1].longitude,
              route[i].latitude,
              route[i].longitude,
            ) +
            this.haversineDistance(
              route[j].latitude,
              route[j].longitude,
              route[j + 1].latitude,
              route[j + 1].longitude,
            );

          const newDistance =
            this.haversineDistance(
              route[i - 1].latitude,
              route[i - 1].longitude,
              route[j].latitude,
              route[j].longitude,
            ) +
            this.haversineDistance(
              route[i].latitude,
              route[i].longitude,
              route[j + 1].latitude,
              route[j + 1].longitude,
            );

          if (newDistance < currentDistance - this.TWO_OPT_IMPROVEMENT_THRESHOLD) {
            const reversed = route.slice(i, j + 1).reverse();
            route = [...route.slice(0, i), ...reversed, ...route.slice(j + 1)];
            improved = true;
          }
        }
      }
    }

    return route;
  }

  private buildRouteResult(stops: RouteStop[], returnToStart: boolean): OptimizedRoute {
    let totalDistance = 0;
    let totalDuration = 0;
    let currentTime = now();

    for (let i = 0; i < stops.length; i++) {
      if (i > 0) {
        const distance = this.haversineDistance(
          stops[i - 1].latitude,
          stops[i - 1].longitude,
          stops[i].latitude,
          stops[i].longitude,
        );
        totalDistance += distance;

        const travelMinutes = (distance / this.AVERAGE_SPEED_KMH) * 60;
        totalDuration += travelMinutes;

        currentTime = currentTime.plus({ minutes: travelMinutes });

        if (!stops[i].arrivalTime) {
          stops[i].arrivalTime = currentTime.toJSDate();
        }
      }

      const stopDuration = stops[i].durationMinutes;
      if (stopDuration) {
        totalDuration += stopDuration;
        currentTime = currentTime.plus({ minutes: stopDuration });
        if (!stops[i].departureTime) {
          stops[i].departureTime = currentTime.toJSDate();
        }
      }
    }

    if (returnToStart && stops.length > 1) {
      const returnDistance = this.haversineDistance(
        stops[stops.length - 1].latitude,
        stops[stops.length - 1].longitude,
        stops[0].latitude,
        stops[0].longitude,
      );
      totalDistance += returnDistance;
      totalDuration += (returnDistance / this.AVERAGE_SPEED_KMH) * 60;
    }

    const wazeUrl = this.generateWazeUrl(stops);
    const googleMapsUrl = this.generateGoogleMapsUrl(stops);

    return {
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      totalDurationMinutes: Math.round(totalDuration),
      stops,
      wazeUrl,
      googleMapsUrl,
    };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = this.EARTH_RADIUS_KM;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private suggestionReason(prospect: Prospect, gap: ScheduleGap): string {
    const reasons: string[] = [];

    if (prospect.status === ProspectStatus.NEW) {
      reasons.push("New prospect needs initial contact");
    }

    if (prospect.nextFollowUpAt && prospect.nextFollowUpAt <= now().toJSDate()) {
      reasons.push("Follow-up is due");
    }

    if (!prospect.lastContactedAt) {
      reasons.push("Never contacted");
    } else {
      const daysSinceContact = Math.floor(
        now().diff(fromJSDate(prospect.lastContactedAt), "days").days,
      );
      if (daysSinceContact > this.OVERDUE_CONTACT_DAYS) {
        reasons.push(`No contact in ${daysSinceContact} days`);
      }
    }

    if (gap.precedingMeeting?.prospect) {
      reasons.push(`Near your ${gap.precedingMeeting.prospect.companyName} meeting`);
    }

    return reasons.length > 0 ? reasons.join(". ") : "Good opportunity to visit";
  }

  private suggestionPriority(prospect: Prospect, distanceKm: number): "high" | "medium" | "low" {
    if (prospect.priority === "urgent" || prospect.priority === "high") {
      return "high";
    }

    if (prospect.nextFollowUpAt && prospect.nextFollowUpAt <= now().toJSDate()) {
      return "high";
    }

    if (distanceKm <= this.HIGH_PRIORITY_DISTANCE_KM && prospect.status === ProspectStatus.NEW) {
      return "high";
    }

    if (distanceKm <= this.MEDIUM_PRIORITY_DISTANCE_KM) {
      return "medium";
    }

    return "low";
  }

  private formatAddress(prospect: Prospect): string {
    const parts = [
      prospect.streetAddress,
      prospect.city,
      prospect.province,
      prospect.postalCode,
    ].filter(Boolean);

    return parts.join(", ");
  }

  private generateWazeUrl(stops: RouteStop[]): string {
    if (stops.length < 2) return "";

    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(1, -1);

    let url = `https://waze.com/ul?ll=${destination.latitude},${destination.longitude}&navigate=yes`;

    if (waypoints.length > 0) {
      const waypointCoords = waypoints.map((w) => `${w.latitude},${w.longitude}`).join("|");
      url += `&via=${waypointCoords}`;
    }

    return url;
  }

  private generateGoogleMapsUrl(stops: RouteStop[]): string {
    if (stops.length < 2) return "";

    const origin = stops[0];
    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(1, -1);

    let url = "https://www.google.com/maps/dir/?api=1";
    url += `&origin=${origin.latitude},${origin.longitude}`;
    url += `&destination=${destination.latitude},${destination.longitude}`;

    if (waypoints.length > 0) {
      const waypointCoords = waypoints.map((w) => `${w.latitude},${w.longitude}`).join("|");
      url += `&waypoints=${waypointCoords}`;
    }

    url += "&travelmode=driving";

    return url;
  }
}
