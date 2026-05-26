import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberWastageEntryDocument = HydratedDocument<RubberWastageEntry>;

@Schema({
  collection: "sm_rubber_wastage_entry",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberWastageEntry {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  wastageBinId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  weightKgAdded: number;

  @Prop({ type: Number, required: false })
  sourceOffcutProductId: number;

  @Prop({ type: Number, required: false })
  sourceIssuanceRowId: number;

  @Prop({ type: Number, required: false })
  sourcePurchaseBatchId: number;

  @Prop({ type: Number, required: true })
  costPerKgAtEntry: number;

  @Prop({ type: Number, required: true })
  totalCostR: number;

  @Prop({ type: String, required: false })
  addedAt: string;

  @Prop({ type: Number, required: false })
  addedByStaffId: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const RubberWastageEntrySchema = SchemaFactory.createForClass(RubberWastageEntry);

RubberWastageEntrySchema.virtual("wastageBin", {
  ref: "RubberWastageBin",
  localField: "wastageBinId",
  foreignField: "_id",
  justOne: true,
});
