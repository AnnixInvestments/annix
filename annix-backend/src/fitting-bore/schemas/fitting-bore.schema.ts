import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FittingBoreDocument = HydratedDocument<FittingBore>;

@Schema({
  collection: "fitting_bores",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FittingBore {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  borePositionName: string;

  @Prop({ type: Number, required: false })
  nominalOutsideDiameterId: number;

  @Prop({ type: Number, required: false })
  variantId: number;
}

export const FittingBoreSchema = SchemaFactory.createForClass(FittingBore);

FittingBoreSchema.virtual("nominalOutsideDiameter", {
  ref: "NominalOutsideDiameterMm",
  localField: "nominalOutsideDiameterId",
  foreignField: "_id",
  justOne: true,
});

FittingBoreSchema.virtual("variant", {
  ref: "FittingVariant",
  localField: "variantId",
  foreignField: "_id",
  justOne: true,
});
