import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InterviewBookingDocument = HydratedDocument<InterviewBooking>;

@Schema({
  collection: "cv_assistant_interview_bookings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InterviewBooking {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  slotId: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: true })
  bookedAt: Date;

  @Prop({ type: Date, required: false })
  cancelledAt: Date;

  @Prop({ type: String, required: false })
  cancelReason: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const InterviewBookingSchema = SchemaFactory.createForClass(InterviewBooking);

InterviewBookingSchema.virtual("slot", {
  ref: "InterviewSlot",
  localField: "slotId",
  foreignField: "_id",
  justOne: true,
});

InterviewBookingSchema.virtual("candidate", {
  ref: "Candidate",
  localField: "candidateId",
  foreignField: "_id",
  justOne: true,
});
