import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqDocument = HydratedDocument<Rfq>;

@Schema({
  collection: "rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Rfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  rfqNumber: string;

  @Prop({ type: String, required: false })
  submissionId: string;

  @Prop({ type: String, required: true })
  projectName: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  customerName: string;

  @Prop({ type: String, required: false })
  customerEmail: string;

  @Prop({ type: String, required: false })
  customerPhone: string;

  @Prop({ type: Date, required: false })
  requiredDate: Date;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  totalCost: number;

  @Prop({ type: Number, required: false })
  estimatedHeadcount: number;

  @Prop({ type: Number, required: false })
  radiusKm: number;

  @Prop({ type: String, required: false })
  projectLocation: string;

  @Prop({ type: Number, required: false })
  projectLocationLat: number;

  @Prop({ type: Number, required: false })
  projectLocationLon: number;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: Date, required: false })
  rejectedAt: Date;

  @Prop({ type: Number, required: false })
  decisionByUserId: number;

  @Prop({ type: String, required: false })
  rejectionReason: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  createdById: number;
}

export const RfqSchema = SchemaFactory.createForClass(Rfq);

RfqSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdById",
  foreignField: "_id",
  justOne: true,
});

RfqSchema.virtual("items", {
  ref: "RfqItem",
  localField: "_id",
  foreignField: "rfqId",
  justOne: false,
});

RfqSchema.virtual("documents", {
  ref: "RfqDocument",
  localField: "_id",
  foreignField: "rfqId",
  justOne: false,
});

RfqSchema.virtual("drawings", {
  ref: "Drawing",
  localField: "_id",
  foreignField: "rfqId",
  justOne: false,
});

RfqSchema.virtual("boqs", { ref: "Boq", localField: "_id", foreignField: "rfqId", justOne: false });
