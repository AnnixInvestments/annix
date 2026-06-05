import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HdpeFittingTypeDocument = HydratedDocument<HdpeFittingType>;

@Schema({
  collection: "hdpe_fitting_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HdpeFittingType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  numButtwelds: number;

  @Prop({ type: Boolean, required: true })
  isMolded: boolean;

  @Prop({ type: Boolean, required: true })
  isFabricated: boolean;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const HdpeFittingTypeSchema = SchemaFactory.createForClass(HdpeFittingType);

HdpeFittingTypeSchema.virtual("weights", {
  ref: "HdpeFittingWeight",
  localField: "_id",
  foreignField: "fittingTypeId",
  justOne: false,
});
