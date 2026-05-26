import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberDimensionOverrideDocument = HydratedDocument<RubberDimensionOverride>;

@Schema({
  collection: "rubber_dimension_overrides",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberDimensionOverride {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  itemType: string;

  @Prop({ type: Number, required: false })
  nbMm: number;

  @Prop({ type: Number, required: false })
  odMm: number;

  @Prop({ type: String, required: false })
  schedule: string;

  @Prop({ type: Number, required: true })
  pipeLengthMm: number;

  @Prop({ type: String, required: false })
  flangeConfig: string;

  @Prop({ type: Number, required: true })
  calculatedWidthMm: number;

  @Prop({ type: Number, required: true })
  calculatedLengthMm: number;

  @Prop({ type: Number, required: true })
  overrideWidthMm: number;

  @Prop({ type: Number, required: true })
  overrideLengthMm: number;

  @Prop({ type: Number, required: true })
  usageCount: number;

  @Prop({ type: Date, required: true })
  lastUsedAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberDimensionOverrideSchema = SchemaFactory.createForClass(RubberDimensionOverride);

RubberDimensionOverrideSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

RubberDimensionOverrideSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
