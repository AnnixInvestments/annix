import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BookingLinkDocument = HydratedDocument<BookingLink>;

@Schema({
  collection: "annix_rep_booking_links",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BookingLink {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  meetingDurationMinutes: number;

  @Prop({ type: Number, required: true })
  bufferBeforeMinutes: number;

  @Prop({ type: Number, required: true })
  bufferAfterMinutes: number;

  @Prop({ type: String, required: true })
  availableDays: string;

  @Prop({ type: Number, required: true })
  availableStartHour: number;

  @Prop({ type: Number, required: true })
  availableEndHour: number;

  @Prop({ type: Number, required: true })
  maxDaysAhead: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Object, required: false })
  customQuestions: Record<string, unknown>;

  @Prop({ type: String, required: true })
  meetingType: string;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const BookingLinkSchema = SchemaFactory.createForClass(BookingLink);

BookingLinkSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
