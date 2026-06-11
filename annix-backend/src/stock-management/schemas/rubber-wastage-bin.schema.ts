import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberWastageBinDocument = HydratedDocument<RubberWastageBin>;

@Schema({
  collection: "sm_rubber_wastage_bin",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberWastageBin {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  colour: string;

  @Prop({ type: Number, required: true })
  currentWeightKg: number;

  @Prop({ type: Number, required: true })
  currentValueR: number;

  @Prop({ type: Number, required: false })
  locationId: number;

  @Prop({ type: Number, required: false })
  scrapRatePerKgR: number;

  @Prop({ type: Date, required: false })
  lastEmptiedAt: Date;

  @Prop({ type: Number, required: false })
  lastEmptiedValueR: number;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberWastageBinSchema = SchemaFactory.createForClass(RubberWastageBin);
