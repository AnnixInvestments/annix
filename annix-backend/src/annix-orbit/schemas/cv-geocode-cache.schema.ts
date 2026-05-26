import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CvGeocodeCacheDocument = HydratedDocument<CvGeocodeCache>;

@Schema({
  collection: "cv_assistant_geocode_cache",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CvGeocodeCache {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Number, required: true })
  lat: number;

  @Prop({ type: Number, required: true })
  lon: number;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: false })
  geocodedAt: string;
}

export const CvGeocodeCacheSchema = SchemaFactory.createForClass(CvGeocodeCache);
