import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Meeting, MeetingStatus } from "./entities/meeting.entity";
import { MeetingRepository } from "./meeting.repository";

@Injectable()
export class MongoMeetingRepository
  extends MongoCrudRepository<Meeting>
  implements MeetingRepository
{
  constructor(@InjectModel("Meeting") model: Model<Meeting>) {
    super(model);
  }

  async findAllForSalesRep(salesRepId: number, limit: number): Promise<Meeting[]> {
    const docs = await this.documents
      .find({ salesRepId })
      .populate("prospect")
      .sort({ scheduledStart: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllBySalesRep(salesRepId: number): Promise<Meeting[]> {
    const docs = await this.documents.find({ salesRepId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findUpcoming(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: startDate, $lte: endDate },
        status: MeetingStatus.SCHEDULED,
      })
      .populate("prospect")
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByDateRange(salesRepId: number, startDate: Date, endDate: Date): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: startDate, $lte: endDate },
      })
      .populate("prospect")
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForSalesRep(salesRepId: number, id: number): Promise<Meeting | null> {
    const doc = await this.documents
      .findOne({ _id: id, salesRepId })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findTodays(salesRepId: number, dayStart: Date, dayEnd: Date): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: dayStart, $lte: dayEnd },
      })
      .populate("prospect")
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActive(salesRepId: number): Promise<Meeting | null> {
    const doc = await this.documents
      .findOne({ salesRepId, status: MeetingStatus.IN_PROGRESS })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findWithProspectInIds(salesRepId: number, ids: number[]): Promise<Meeting[]> {
    const docs = await this.documents
      .find({ salesRepId, _id: { $in: ids } })
      .populate("prospect")
      .sort({ scheduledStart: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByCalendarEventId(calendarEventId: number): Promise<Meeting | null> {
    const doc = await this.documents.findOne({ calendarEventId }).lean().exec();
    return this.toDomain(doc);
  }

  async findScheduledConflict(
    salesRepId: number,
    bufferStart: Date,
    bufferEnd: Date,
  ): Promise<Meeting | null> {
    const doc = await this.documents
      .findOne({
        salesRepId,
        status: MeetingStatus.SCHEDULED,
        scheduledStart: { $gte: bufferStart, $lte: bufferEnd },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findScheduledInDayTimes(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]> {
    const docs = await this.documents
      .find(
        {
          salesRepId,
          scheduledStart: { $gte: dayStart, $lte: dayEnd },
          status: MeetingStatus.SCHEDULED,
        },
        { scheduledStart: 1, scheduledEnd: 1 },
      )
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findCompletedInRange(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: start, $lte: end },
        status: MeetingStatus.COMPLETED,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findMeetingsOverTime(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: start, $lte: end },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findFutureForOverlapDetection(
    salesRepId: number,
    today: Date,
    futureDate: Date,
  ): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: today },
        scheduledEnd: { $lte: futureDate },
      })
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findInRangeWithProspect(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: start, $lte: end },
      })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findInRange(salesRepId: number, start: Date, end: Date): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: start, $lte: end },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByMeetingUrlForSalesRep(
    meetingUrl: string,
    salesRepId: number,
  ): Promise<Meeting | null> {
    const calendarEventModel = this.model.db.model<{ _id: number }>("CalendarEvent");
    const events = await calendarEventModel.find({ meetingUrl }, { _id: 1 }).lean().exec();
    const eventIds = events.map((event) => event._id);
    const doc = await this.documents
      .findOne({ salesRepId, calendarEventId: { $in: eventIds } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByTitleWindowForSalesRep(
    salesRepId: number,
    startWindow: Date,
    endWindow: Date,
    titleFragment: string,
  ): Promise<Meeting | null> {
    const doc = await this.documents
      .findOne({
        salesRepId,
        scheduledStart: { $gte: startWindow, $lte: endWindow },
        title: { $regex: titleFragment, $options: "i" },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findRecurringParents(salesRepId: number): Promise<Meeting[]> {
    const docs = await this.documents
      .find({ salesRepId, isRecurring: true, recurringParentId: null })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecurringChildren(salesRepId: number, parentIds: number[]): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        isRecurring: false,
        recurringParentId: { $in: parentIds },
      })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findScheduledChildren(parentId: number, salesRepId: number): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        recurringParentId: parentId,
        salesRepId,
        status: MeetingStatus.SCHEDULED,
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findChildrenOrdered(parentId: number, salesRepId: number): Promise<Meeting[]> {
    const docs = await this.documents
      .find({ recurringParentId: parentId, salesRepId })
      .populate("prospect")
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecurringSeriesParent(parentId: number, salesRepId: number): Promise<Meeting | null> {
    const doc = await this.documents
      .findOne({ _id: parentId, salesRepId, isRecurring: true })
      .populate("prospect")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async deleteFutureChildren(parentId: number, salesRepId: number, fromStart: Date): Promise<void> {
    await this.documents
      .deleteMany({
        recurringParentId: parentId,
        salesRepId,
        scheduledStart: { $gte: fromStart },
      })
      .exec();
  }

  async deleteAllChildren(parentId: number, salesRepId: number): Promise<void> {
    await this.documents.deleteMany({ recurringParentId: parentId, salesRepId }).exec();
  }

  async updateStatus(meetingId: number, status: MeetingStatus): Promise<void> {
    await this.documents.updateOne({ _id: meetingId }, { $set: { status } }).exec();
  }

  countByOrganizationInRange(organizationId: number, start: Date, end: Date): Promise<number> {
    return this.documents
      .countDocuments({
        organizationId,
        scheduledStart: { $gte: start, $lte: end },
      })
      .exec();
  }

  countCompletedBySalesRepInRange(
    salesRepId: number,
    organizationId: number,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.documents
      .countDocuments({
        salesRepId,
        organizationId,
        status: MeetingStatus.COMPLETED,
        actualEnd: { $gte: start, $lte: end },
      })
      .exec();
  }

  async findWithProspect(id: number): Promise<Meeting | null> {
    const doc = await this.documents.findById(id).populate("prospect").lean().exec();
    return this.toDomain(doc);
  }

  async findScheduledWithLocationForRoute(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: dayStart, $lte: dayEnd },
        status: MeetingStatus.SCHEDULED,
        latitude: { $ne: null },
        longitude: { $ne: null },
      })
      .populate("prospect")
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findScheduledOrInProgressWithProspect(
    salesRepId: number,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Meeting[]> {
    const docs = await this.documents
      .find({
        salesRepId,
        scheduledStart: { $gte: dayStart, $lte: dayEnd },
        status: { $in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS] },
      })
      .populate("prospect")
      .sort({ scheduledStart: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async saveMany(meetings: Meeting[]): Promise<Meeting[]> {
    return Promise.all(meetings.map((meeting) => this.save(meeting)));
  }

  async findAllWithProspectOrdered(salesRepId: number): Promise<Meeting[]> {
    const docs = await this.documents
      .find({ salesRepId })
      .populate("prospect")
      .sort({ scheduledStart: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countBySalesRep(salesRepId: number): Promise<number> {
    return this.documents.countDocuments({ salesRepId }).exec();
  }

  countBySalesRepCrmSynced(salesRepId: number): Promise<number> {
    return this.documents.countDocuments({ salesRepId, crmExternalId: { $ne: null } }).exec();
  }
}
