import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberOrderDocument = HydratedDocument<RubberOrder>;

@Schema({
  collection: "rubber_order",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberOrder {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: String, required: false })
  companyOrderNumber: string;

  @Prop({ type: Number, required: true })
  status: number;

  @Prop({ type: String, required: false })
  companyFirebaseUid: string;

  @Prop({ type: Number, required: false })
  companyId: number;

  @Prop({ type: String, required: false })
  createdByFirebaseUid: string;

  @Prop({ type: String, required: false })
  updatedByFirebaseUid: string;

  @Prop({ type: Object, required: true })
  statusHistory: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberOrderSchema = SchemaFactory.createForClass(RubberOrder);

RubberOrderSchema.virtual("company", {
  ref: "RubberCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

RubberOrderSchema.virtual("items", {
  ref: "RubberOrderItem",
  localField: "_id",
  foreignField: "orderId",
  justOne: false,
});
