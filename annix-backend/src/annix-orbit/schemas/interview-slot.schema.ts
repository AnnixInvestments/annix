import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InterviewSlotDocument = HydratedDocument<InterviewSlot>;

@Schema({
  collection: "cv_assistant_interview_slots",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InterviewSlot {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobPostingId: number;

  @Prop({ type: Date, required: true })
  startsAt: Date;

  @Prop({ type: Date, required: true })
  endsAt: Date;

  @Prop({ type: String, required: false })
  locationLabel: string;

  @Prop({ type: String, required: false })
  locationAddress: string;

  @Prop({ type: Number, required: false })
  locationLat: number;

  @Prop({ type: Number, required: false })
  locationLng: number;

  @Prop({ type: Number, required: true })
  capacity: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Boolean, required: true })
  isCancelled: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const InterviewSlotSchema = SchemaFactory.createForClass(InterviewSlot);

InterviewSlotSchema.virtual("company", {
  ref: "AnnixOrbitCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

InterviewSlotSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});

InterviewSlotSchema.virtual("bookings", {
  ref: "InterviewBooking",
  localField: "_id",
  foreignField: "slotId",
  justOne: false,
});
