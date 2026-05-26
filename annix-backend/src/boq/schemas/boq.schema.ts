import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BoqDocument = HydratedDocument<Boq>;

@Schema({
  collection: "boqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Boq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  boqNumber: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  totalQuantity: number;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  totalEstimatedCost: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  drawingId: number;

  @Prop({ type: Number, required: false })
  rfqId: number;

  @Prop({ type: Number, required: false })
  createdById: number;
}

export const BoqSchema = SchemaFactory.createForClass(Boq);

BoqSchema.virtual("drawing", {
  ref: "Drawing",
  localField: "drawingId",
  foreignField: "_id",
  justOne: true,
});

BoqSchema.virtual("rfq", { ref: "Rfq", localField: "rfqId", foreignField: "_id", justOne: true });

BoqSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdById",
  foreignField: "_id",
  justOne: true,
});

BoqSchema.virtual("lineItems", {
  ref: "BoqLineItem",
  localField: "_id",
  foreignField: "boqId",
  justOne: false,
});
