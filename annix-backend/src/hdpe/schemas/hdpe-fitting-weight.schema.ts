import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HdpeFittingWeightDocument = HydratedDocument<HdpeFittingWeight>;

@Schema({
  collection: "hdpe_fitting_weights",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HdpeFittingWeight {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  fittingTypeId: number;

  @Prop({ type: Number, required: true })
  nominalBore: number;

  @Prop({ type: Number, required: true })
  weightKg: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const HdpeFittingWeightSchema = SchemaFactory.createForClass(HdpeFittingWeight);

HdpeFittingWeightSchema.virtual("fittingType", {
  ref: "HdpeFittingType",
  localField: "fittingTypeId",
  foreignField: "_id",
  justOne: true,
});
