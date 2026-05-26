import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SaMineDocument = HydratedDocument<SaMine>;

@Schema({
  collection: "sa_mines",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SaMine {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  mineName: string;

  @Prop({ type: String, required: true })
  operatingCompany: string;

  @Prop({ type: [String], required: true })
  aliases: string;

  @Prop({ type: Number, required: true })
  commodityId: number;

  @Prop({ type: String, required: true })
  province: string;

  @Prop({ type: String, required: false })
  district: string;

  @Prop({ type: String, required: false })
  physicalAddress: string;

  @Prop({ type: String, required: true })
  mineType: string;

  @Prop({ type: String, required: true })
  operationalStatus: string;

  @Prop({ type: Number, required: false })
  latitude: number;

  @Prop({ type: Number, required: false })
  longitude: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SaMineSchema = SchemaFactory.createForClass(SaMine);

SaMineSchema.virtual("commodity", {
  ref: "Commodity",
  localField: "commodityId",
  foreignField: "_id",
  justOne: true,
});
