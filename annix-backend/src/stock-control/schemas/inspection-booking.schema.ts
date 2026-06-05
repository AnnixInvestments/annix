import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InspectionBookingDocument = HydratedDocument<InspectionBooking>;

@Schema({
  collection: "inspection_bookings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InspectionBooking {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Date, required: true })
  inspectionDate: Date;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: String, required: true })
  endTime: string;

  @Prop({ type: String, required: true })
  inspectorEmail: string;

  @Prop({ type: String, required: false })
  inspectorName: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  bookedById: string;

  @Prop({ type: String, required: false })
  bookedByName: string;

  @Prop({ type: Date, required: false })
  completedAt: Date;

  @Prop({ type: String, required: false })
  completedById: string;

  @Prop({ type: String, required: false })
  completedByName: string;

  @Prop({ type: String, required: false })
  responseToken: string;

  @Prop({ type: Date, required: false })
  tokenExpiresAt: Date;

  @Prop({ type: Date, required: false })
  proposedDate: Date;

  @Prop({ type: String, required: false })
  proposedStartTime: string;

  @Prop({ type: String, required: false })
  proposedEndTime: string;

  @Prop({ type: String, required: false })
  proposedNote: string;

  @Prop({ type: Date, required: false })
  proposedAt: Date;

  @Prop({ type: Date, required: false })
  respondedAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedBookedById: string;

  @Prop({ type: String, required: false })
  unifiedCompletedById: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const InspectionBookingSchema = SchemaFactory.createForClass(InspectionBooking);

InspectionBookingSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

InspectionBookingSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

InspectionBookingSchema.virtual("bookedBy", {
  ref: "StockControlUser",
  localField: "bookedById",
  foreignField: "_id",
  justOne: true,
});

InspectionBookingSchema.virtual("completedBy", {
  ref: "StockControlUser",
  localField: "completedById",
  foreignField: "_id",
  justOne: true,
});

InspectionBookingSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

InspectionBookingSchema.virtual("unifiedBookedBy", {
  ref: "User",
  localField: "unifiedBookedById",
  foreignField: "_id",
  justOne: true,
});

InspectionBookingSchema.virtual("unifiedCompletedBy", {
  ref: "User",
  localField: "unifiedCompletedById",
  foreignField: "_id",
  justOne: true,
});
