import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type VisitDocument = HydratedDocument<Visit>;

@Schema({
  collection: "annix_rep_visits",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Visit {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  prospectId: number;

  @Prop({ type: Number, required: true })
  salesRepId: number;

  @Prop({ type: String, required: true })
  visitType: string;

  @Prop({ type: Date, required: false })
  scheduledAt: Date;

  @Prop({ type: Date, required: false })
  startedAt: Date;

  @Prop({ type: Date, required: false })
  endedAt: Date;

  @Prop({ type: Number, required: false })
  checkInLatitude: number;

  @Prop({ type: Number, required: false })
  checkInLongitude: number;

  @Prop({ type: Number, required: false })
  checkOutLatitude: number;

  @Prop({ type: Number, required: false })
  checkOutLongitude: number;

  @Prop({ type: String, required: false })
  outcome: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  contactMet: string;

  @Prop({ type: String, required: false })
  nextSteps: string;

  @Prop({ type: Date, required: false })
  followUpDate: Date;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);

VisitSchema.virtual("prospect", {
  ref: "Prospect",
  localField: "prospectId",
  foreignField: "_id",
  justOne: true,
});

VisitSchema.virtual("salesRep", {
  ref: "User",
  localField: "salesRepId",
  foreignField: "_id",
  justOne: true,
});
