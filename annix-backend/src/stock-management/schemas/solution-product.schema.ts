import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SolutionProductDocument = HydratedDocument<SolutionProduct>;

@Schema({
  collection: "sm_solution_product",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SolutionProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  activeIngredient: string;

  @Prop({ type: Number, required: false })
  concentrationPct: number;

  @Prop({ type: Number, required: false })
  densityKgPerL: number;

  @Prop({ type: String, required: false })
  hazardClassification: string;

  @Prop({ type: String, required: false })
  storageRequirement: string;

  @Prop({ type: Number, required: false })
  shelfLifeMonths: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const SolutionProductSchema = SchemaFactory.createForClass(SolutionProduct);

SolutionProductSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
