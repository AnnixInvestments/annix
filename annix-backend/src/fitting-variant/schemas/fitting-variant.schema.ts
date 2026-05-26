import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FittingVariantDocument = HydratedDocument<FittingVariant>;

@Schema({
  collection: "fitting_variants",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FittingVariant {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  fittingId: number;
}

export const FittingVariantSchema = SchemaFactory.createForClass(FittingVariant);

FittingVariantSchema.virtual("fitting", {
  ref: "Fitting",
  localField: "fittingId",
  foreignField: "_id",
  justOne: true,
});

FittingVariantSchema.virtual("bores", {
  ref: "FittingBore",
  localField: "_id",
  foreignField: "variantId",
  justOne: false,
});

FittingVariantSchema.virtual("dimensions", {
  ref: "FittingDimension",
  localField: "_id",
  foreignField: "variantId",
  justOne: false,
});
