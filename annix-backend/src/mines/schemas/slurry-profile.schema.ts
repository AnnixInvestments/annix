import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SlurryProfileDocument = HydratedDocument<SlurryProfile>;

@Schema({
  collection: "slurry_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SlurryProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  commodityId: number;

  @Prop({ type: String, required: false })
  profileName: string;

  @Prop({ type: Number, required: true })
  typicalSgMin: number;

  @Prop({ type: Number, required: true })
  typicalSgMax: number;

  @Prop({ type: Number, required: true })
  solidsConcentrationMin: number;

  @Prop({ type: Number, required: true })
  solidsConcentrationMax: number;

  @Prop({ type: Number, required: true })
  phMin: number;

  @Prop({ type: Number, required: true })
  phMax: number;

  @Prop({ type: Number, required: true })
  tempMin: number;

  @Prop({ type: Number, required: true })
  tempMax: number;

  @Prop({ type: String, required: true })
  abrasionRisk: string;

  @Prop({ type: String, required: true })
  corrosionRisk: string;

  @Prop({ type: String, required: false })
  primaryFailureMode: string;

  @Prop({ type: String, required: false })
  notes: string;
}

export const SlurryProfileSchema = SchemaFactory.createForClass(SlurryProfile);

SlurryProfileSchema.virtual("commodity", {
  ref: "Commodity",
  localField: "commodityId",
  foreignField: "_id",
  justOne: true,
});
