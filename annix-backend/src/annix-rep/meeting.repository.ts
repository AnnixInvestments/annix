import { CrudRepository } from "../lib/persistence/crud-repository";
import { Meeting, MeetingStatus } from "./entities/meeting.entity";

export abstract class MeetingRepository extends CrudRepository<Meeting> {
  abstract findAllForSalesRep(salesRepId: number, limit: number): Promise<Meeting[]>;
  abstract findAllBySalesRep(salesRepId: number): Promise<Meeting[]>;
  abstract findUpcoming(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]>;
  abstract findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]>;
  abstract findOneForSalesRep(salesRepId: number, id: number): Promise<Meeting | null>;
  abstract findTodays(salesRepId: number, dayStart: Date, dayEnd: Date): Promise<Meeting[]>;
  abstract findActive(salesRepId: number): Promise<Meeting | null>;
  abstract findWithProspectInIds(salesRepId: number, ids: number[]): Promise<Meeting[]>;
  abstract findByCalendarEventId(calendarEventId: number): Promise<Meeting | null>;
  abstract findScheduledConflict(
    salesRepId: number,
    bufferStart: Date,
    bufferEnd: Date,
  ): Promise<Meeting | null>;
  abstract findScheduledInDayTimes(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]>;
  abstract findCompletedInRange(salesRepId: number, start: Date, end: Date): Promise<Meeting[]>;
  abstract findMeetingsOverTime(salesRepId: number, start: Date, end: Date): Promise<Meeting[]>;
  abstract findFutureForOverlapDetection(
    salesRepId: number,
    today: Date,
    futureDate: Date,
  ): Promise<Meeting[]>;
  abstract findInRangeWithProspect(salesRepId: number, start: Date, end: Date): Promise<Meeting[]>;
  abstract findInRange(salesRepId: number, start: Date, end: Date): Promise<Meeting[]>;
  abstract findByMeetingUrlForSalesRep(
    meetingUrl: string,
    salesRepId: number,
  ): Promise<Meeting | null>;
  abstract findByTitleWindowForSalesRep(
    salesRepId: number,
    startWindow: Date,
    endWindow: Date,
    titleFragment: string,
  ): Promise<Meeting | null>;
  abstract findRecurringParents(salesRepId: number): Promise<Meeting[]>;
  abstract findRecurringChildren(salesRepId: number, parentIds: number[]): Promise<Meeting[]>;
  abstract findScheduledChildren(parentId: number, salesRepId: number): Promise<Meeting[]>;
  abstract findChildrenOrdered(parentId: number, salesRepId: number): Promise<Meeting[]>;
  abstract findRecurringSeriesParent(parentId: number, salesRepId: number): Promise<Meeting | null>;
  abstract deleteFutureChildren(
    parentId: number,
    salesRepId: number,
    fromStart: Date,
  ): Promise<void>;
  abstract deleteAllChildren(parentId: number, salesRepId: number): Promise<void>;
  abstract updateStatus(meetingId: number, status: MeetingStatus): Promise<void>;
  abstract countByOrganizationInRange(
    organizationId: number,
    start: Date,
    end: Date,
  ): Promise<number>;
  abstract countCompletedBySalesRepInRange(
    salesRepId: number,
    organizationId: number,
    start: Date,
    end: Date,
  ): Promise<number>;
  abstract findWithProspect(id: number): Promise<Meeting | null>;
  abstract findScheduledWithLocationForRoute(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]>;
  abstract findScheduledOrInProgressWithProspect(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]>;
  abstract saveMany(meetings: Meeting[]): Promise<Meeting[]>;
  abstract findAllWithProspectOrdered(salesRepId: number): Promise<Meeting[]>;
  abstract countBySalesRep(salesRepId: number): Promise<number>;
  abstract countBySalesRepCrmSynced(salesRepId: number): Promise<number>;
}
