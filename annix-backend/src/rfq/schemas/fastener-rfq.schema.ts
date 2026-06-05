import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FastenerRfqDocument = HydratedDocument<FastenerRfq>;

@Schema({
  collection: "fastener_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FastenerRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  fastenerCategory: string;

  @Prop({ type: String, required: true })
  specificType: string;

  @Prop({ type: String, required: true })
  size: string;

  @Prop({ type: String, required: false })
  grade: string;

  @Prop({ type: String, required: false })
  material: string;

  @Prop({ type: String, required: false })
  finish: string;

  @Prop({ type: String, required: false })
  threadType: string;

  @Prop({ type: String, required: false })
  standard: string;

  @Prop({ type: Number, required: false })
  lengthMm: number;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  rfqItemId: number;
}

export const FastenerRfqSchema = SchemaFactory.createForClass(FastenerRfq);

FastenerRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
