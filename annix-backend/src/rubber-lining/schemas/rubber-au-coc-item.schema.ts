import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberAuCocItemDocument = HydratedDocument<RubberAuCocItem>;

@Schema({
  collection: "rubber_au_coc_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberAuCocItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: true })
  auCocId: number;

  @Prop({ type: Number, required: true })
  rollStockId: number;

  @Prop({ type: Object, required: false })
  testDataSummary: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const RubberAuCocItemSchema = SchemaFactory.createForClass(RubberAuCocItem);

RubberAuCocItemSchema.virtual("auCoc", {
  ref: "RubberAuCoc",
  localField: "auCocId",
  foreignField: "_id",
  justOne: true,
});

RubberAuCocItemSchema.virtual("rollStock", {
  ref: "RubberRollStock",
  localField: "rollStockId",
  foreignField: "_id",
  justOne: true,
});
