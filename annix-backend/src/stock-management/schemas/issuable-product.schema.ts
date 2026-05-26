import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IssuableProductDocument = HydratedDocument<IssuableProduct>;

@Schema({
  collection: "sm_issuable_product",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IssuableProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  productType: string;

  @Prop({ type: String, required: true })
  sku: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: false })
  categoryId: number;

  @Prop({ type: String, required: true })
  unitOfMeasure: string;

  @Prop({ type: Number, required: true })
  costPerUnit: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  minStockLevel: number;

  @Prop({ type: Number, required: false })
  locationId: number;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Number, required: false })
  legacyStockItemId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  consumableId: number;

  @Prop({ type: Number, required: false })
  paintId: number;

  @Prop({ type: Number, required: false })
  rubberRollId: number;

  @Prop({ type: Number, required: false })
  rubberOffcutId: number;

  @Prop({ type: Number, required: false })
  solutionId: number;
}

export const IssuableProductSchema = SchemaFactory.createForClass(IssuableProduct);

IssuableProductSchema.virtual("category", {
  ref: "ProductCategory",
  localField: "categoryId",
  foreignField: "_id",
  justOne: true,
});

IssuableProductSchema.virtual("consumable", {
  ref: "ConsumableProduct",
  localField: "consumableId",
  foreignField: "_id",
  justOne: true,
});

IssuableProductSchema.virtual("paint", {
  ref: "PaintProduct",
  localField: "paintId",
  foreignField: "_id",
  justOne: true,
});

IssuableProductSchema.virtual("rubberRoll", {
  ref: "RubberRoll",
  localField: "rubberRollId",
  foreignField: "_id",
  justOne: true,
});

IssuableProductSchema.virtual("rubberOffcut", {
  ref: "RubberOffcutStock",
  localField: "rubberOffcutId",
  foreignField: "_id",
  justOne: true,
});

IssuableProductSchema.virtual("solution", {
  ref: "SolutionProduct",
  localField: "solutionId",
  foreignField: "_id",
  justOne: true,
});
