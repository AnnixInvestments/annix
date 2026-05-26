import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Meeting, MeetingStatus } from "./entities/meeting.entity";
import { MeetingRepository } from "./meeting.repository";

@Injectable()
export class PostgresMeetingRepository
  extends TypeOrmCrudRepository<Meeting>
  implements MeetingRepository
{
  constructor(@InjectRepository(Meeting) repository: Repository<Meeting>) {
    super(repository);
  }

  findAllForSalesRep(salesRepId: number, limit: number): Promise<Meeting[]> {
    return this.repository.find({
      where: { salesRepId },
      relations: ["prospect"],
      order: { scheduledStart: "DESC" },
      take: limit,
    });
  }

  findAllBySalesRep(salesRepId: number): Promise<Meeting[]> {
    return this.repository.find({ where: { salesRepId } });
  }

  findUpcoming(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(startDate, endDate),
        status: MeetingStatus.SCHEDULED,
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(startDate, endDate),
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  findOneForSalesRep(salesRepId: number, id: number): Promise<Meeting | null> {
    return this.repository.findOne({
      where: { id, salesRepId },
      relations: ["prospect"],
    });
  }

  findTodays(salesRepId: number, dayStart: Date, dayEnd: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(dayStart, dayEnd),
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  findActive(salesRepId: number): Promise<Meeting | null> {
    return this.repository.findOne({
      where: {
        salesRepId,
        status: MeetingStatus.IN_PROGRESS,
      },
      relations: ["prospect"],
    });
  }

  findWithProspectInIds(salesRepId: number, ids: number[]): Promise<Meeting[]> {
    return this.repository
      .createQueryBuilder("meeting")
      .where("meeting.sales_rep_id = :salesRepId", { salesRepId })
      .andWhere("meeting.id IN (:...meetingIds)", { meetingIds: ids })
      .leftJoinAndSelect("meeting.prospect", "prospect")
      .orderBy("meeting.scheduled_start", "DESC")
      .getMany();
  }

  findByCalendarEventId(calendarEventId: number): Promise<Meeting | null> {
    return this.repository.findOne({ where: { calendarEventId } });
  }

  findScheduledConflict(
    salesRepId: number,
    bufferStart: Date,
    bufferEnd: Date,
  ): Promise<Meeting | null> {
    return this.repository.findOne({
      where: {
        salesRepId,
        status: MeetingStatus.SCHEDULED,
        scheduledStart: Between(bufferStart, bufferEnd),
      },
    });
  }

  findScheduledInDayTimes(salesRepId: number, dayStart: Date, dayEnd: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(dayStart, dayEnd),
        status: MeetingStatus.SCHEDULED,
      },
      select: ["scheduledStart", "scheduledEnd"],
    });
  }

  findCompletedInRange(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(start, end),
        status: MeetingStatus.COMPLETED,
      },
    });
  }

  findMeetingsOverTime(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(start, end),
      },
    });
  }

  findFutureForOverlapDetection(
    salesRepId: number,
    today: Date,
    futureDate: Date,
  ): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: MoreThanOrEqual(today),
        scheduledEnd: LessThanOrEqual(futureDate),
      },
      order: { scheduledStart: "ASC" },
    });
  }

  findInRangeWithProspect(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(start, end),
      },
      relations: ["prospect"],
    });
  }

  findInRange(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(start, end),
      },
    });
  }

  findByMeetingUrlForSalesRep(meetingUrl: string, salesRepId: number): Promise<Meeting | null> {
    return this.repository
      .createQueryBuilder("m")
      .leftJoin("m.calendarEvent", "e")
      .where("e.meeting_url = :url", { url: meetingUrl })
      .andWhere("m.sales_rep_id = :userId", { userId: salesRepId })
      .getOne();
  }

  findByTitleWindowForSalesRep(
    salesRepId: number,
    startWindow: Date,
    endWindow: Date,
    titleFragment: string,
  ): Promise<Meeting | null> {
    return this.repository
      .createQueryBuilder("m")
      .where("m.sales_rep_id = :userId", { userId: salesRepId })
      .andWhere("m.scheduled_start >= :start", { start: startWindow })
      .andWhere("m.scheduled_start <= :end", { end: endWindow })
      .andWhere("m.title ILIKE :title", { title: `%${titleFragment}%` })
      .getOne();
  }

  findRecurringParents(salesRepId: number): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        isRecurring: true,
        recurringParentId: null as unknown as number,
      },
      relations: ["prospect"],
    });
  }

  findRecurringChildren(salesRepId: number, parentIds: number[]): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        isRecurring: false,
        recurringParentId: In(parentIds),
      },
      relations: ["prospect"],
    });
  }

  findScheduledChildren(parentId: number, salesRepId: number): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        recurringParentId: parentId,
        salesRepId,
        status: MeetingStatus.SCHEDULED,
      },
    });
  }

  findChildrenOrdered(parentId: number, salesRepId: number): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        recurringParentId: parentId,
        salesRepId,
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  findRecurringSeriesParent(parentId: number, salesRepId: number): Promise<Meeting | null> {
    return this.repository.findOne({
      where: { id: parentId, salesRepId, isRecurring: true },
      relations: ["prospect"],
    });
  }

  async deleteFutureChildren(parentId: number, salesRepId: number, fromStart: Date): Promise<void> {
    await this.repository.delete({
      recurringParentId: parentId,
      salesRepId,
      scheduledStart: MoreThanOrEqual(fromStart),
    });
  }

  async deleteAllChildren(parentId: number, salesRepId: number): Promise<void> {
    await this.repository.delete({
      recurringParentId: parentId,
      salesRepId,
    });
  }

  async updateStatus(meetingId: number, status: MeetingStatus): Promise<void> {
    await this.repository.update({ id: meetingId }, { status });
  }

  countByOrganizationInRange(organizationId: number, start: Date, end: Date): Promise<number> {
    return this.repository.count({
      where: {
        organizationId,
        scheduledStart: Between(start, end),
      },
    });
  }

  countCompletedBySalesRepInRange(
    salesRepId: number,
    organizationId: number,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.repository.count({
      where: {
        salesRepId,
        organizationId,
        status: MeetingStatus.COMPLETED,
        actualEnd: Between(start, end),
      },
    });
  }

  findWithProspect(id: number): Promise<Meeting | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["prospect"],
    });
  }

  findScheduledWithLocationForRoute(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(dayStart, dayEnd),
        status: MeetingStatus.SCHEDULED,
        latitude: Not(null as unknown as number) as unknown as number,
        longitude: Not(null as unknown as number) as unknown as number,
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  findScheduledOrInProgressWithProspect(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]> {
    return this.repository.find({
      where: {
        salesRepId,
        scheduledStart: Between(dayStart, dayEnd),
        status: In([MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS]),
      },
      relations: ["prospect"],
      order: { scheduledStart: "ASC" },
    });
  }

  saveMany(meetings: Meeting[]): Promise<Meeting[]> {
    return this.repository.save(meetings);
  }

  findAllWithProspectOrdered(salesRepId: number): Promise<Meeting[]> {
    return this.repository.find({
      where: { salesRepId },
      relations: ["prospect"],
      order: { scheduledStart: "DESC" },
    });
  }

  countBySalesRep(salesRepId: number): Promise<number> {
    return this.repository.count({ where: { salesRepId } });
  }

  countBySalesRepCrmSynced(salesRepId: number): Promise<number> {
    return this.repository.count({
      where: { salesRepId, crmExternalId: Not(IsNull()) },
    });
  }
}
