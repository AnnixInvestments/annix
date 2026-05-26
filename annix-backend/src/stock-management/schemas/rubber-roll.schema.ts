import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberRollDocument = HydratedDocument<RubberRoll>;

@Schema({
  collection: "sm_rubber_roll",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberRoll {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  rollNumber: string;

  @Prop({ type: String, required: false })
  compoundCode: string;

  @Prop({ type: Number, required: false })
  compoundId: number;

  @Prop({ type: String, required: false })
  colour: string;

  @Prop({ type: Number, required: false })
  widthMm: number;

  @Prop({ type: Number, required: false })
  thicknessMm: number;

  @Prop({ type: Number, required: false })
  lengthM: number;

  @Prop({ type: Number, required: false })
  weightKg: number;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: Date, required: false })
  receivedAt: Date;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  densityOverrideKgPerM3: number;

  @Prop({ type: Number, required: false })
  legacyRubberRollId: number;
}

export const RubberRollSchema = SchemaFactory.createForClass(RubberRoll);

RubberRollSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
