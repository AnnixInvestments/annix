import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaintProductDocument = HydratedDocument<PaintProduct>;

@Schema({
  collection: "sm_paint_product",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaintProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  coverageM2PerLitre: number;

  @Prop({ type: Number, required: false })
  wetFilmThicknessUm: number;

  @Prop({ type: Number, required: false })
  dryFilmThicknessUm: number;

  @Prop({ type: String, required: false })
  coatType: string;

  @Prop({ type: String, required: false })
  paintSystem: string;

  @Prop({ type: Number, required: false })
  numberOfParts: number;

  @Prop({ type: String, required: false })
  mixingRatio: string;

  @Prop({ type: Number, required: false })
  potLifeMinutes: number;

  @Prop({ type: Boolean, required: true })
  isBanding: boolean;

  @Prop({ type: String, required: false })
  supplierProductCode: string;

  @Prop({ type: String, required: false })
  colourCode: string;

  @Prop({ type: String, required: false })
  glossLevel: string;

  @Prop({ type: Number, required: false })
  vocContentGPerL: number;

  @Prop({ type: Number, required: false })
  densityKgPerL: number;

  @Prop({ type: String, required: false })
  datasheetUrl: string;

  @Prop({ type: String, required: false })
  msdsUrl: string;

  @Prop({ type: String, required: false })
  thinnerReference: string;

  @Prop({ type: Number, required: false })
  shelfLifeMonths: number;

  @Prop({ type: String, required: false })
  surfacePrepRequirement: string;

  @Prop({ type: Number, required: false })
  minApplicationTempC: number;

  @Prop({ type: Number, required: false })
  maxApplicationTempC: number;

  @Prop({ type: [String], required: false })
  substrateCompatibility: string;

  @Prop({ type: Number, required: false })
  packSizeLitres: number;

  @Prop({ type: String, required: false })
  componentGroupKey: string;

  @Prop({ type: String, required: false })
  componentRole: string;
}

export const PaintProductSchema = SchemaFactory.createForClass(PaintProduct);

PaintProductSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
