import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BoqLineItemDocument = HydratedDocument<BoqLineItem>;

@Schema({
  collection: "boq_line_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BoqLineItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  lineNumber: number;

  @Prop({ type: String, required: false })
  itemCode: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  itemType: string;

  @Prop({ type: String, required: true })
  unitOfMeasure: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: false })
  unitWeightKg: number;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  unitPrice: number;

  @Prop({ type: Number, required: false })
  totalPrice: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  drawingReference: string;

  @Prop({ type: Object, required: false })
  specifications: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  boqId: number;
}

export const BoqLineItemSchema = SchemaFactory.createForClass(BoqLineItem);

BoqLineItemSchema.virtual("boq", {
  ref: "Boq",
  localField: "boqId",
  foreignField: "_id",
  justOne: true,
});
