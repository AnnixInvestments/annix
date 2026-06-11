import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NamibiaMineDocument = HydratedDocument<NamibiaMine>;

@Schema({
  collection: "namibia_mines",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NamibiaMine {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  mineName: string;

  @Prop({ type: String, required: true })
  operatingCompany: string;

  @Prop({ type: [String], required: true })
  aliases: string;

  @Prop({ type: Number, required: false })
  commodityId: number;

  @Prop({ type: String, required: false })
  region: string;

  @Prop({ type: String, required: false })
  district: string;

  @Prop({ type: String, required: false })
  nearestTown: string;

  @Prop({ type: String, required: false })
  physicalAddress: string;

  @Prop({ type: Number, required: false })
  latitude: number;

  @Prop({ type: Number, required: false })
  longitude: number;

  @Prop({ type: Number, required: false })
  elevationM: number;

  @Prop({ type: String, required: true })
  mineType: string;

  @Prop({ type: String, required: true })
  operationalStatus: string;

  @Prop({ type: String, required: false })
  climateZone: string;

  @Prop({ type: Number, required: false })
  annualRainfallMm: number;

  @Prop({ type: Number, required: false })
  meanTempMinC: number;

  @Prop({ type: Number, required: false })
  meanTempMaxC: number;

  @Prop({ type: Number, required: false })
  humidityAvgPercent: number;

  @Prop({ type: String, required: false })
  terrainType: string;

  @Prop({ type: Number, required: false })
  distanceToNearestPortKm: number;

  @Prop({ type: String, required: false })
  nearestPort: string;

  @Prop({ type: Number, required: false })
  distanceToCapitalKm: number;

  @Prop({ type: String, required: false })
  roadAccessQuality: string;

  @Prop({ type: String, required: false })
  primaryWaterSource: string;

  @Prop({ type: String, required: false })
  primaryPowerSource: string;

  @Prop({ type: String, required: false })
  environmentalConcerns: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const NamibiaMineSchema = SchemaFactory.createForClass(NamibiaMine);

NamibiaMineSchema.virtual("commodity", {
  ref: "Commodity",
  localField: "commodityId",
  foreignField: "_id",
  justOne: true,
});
