import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type OrbitOutreachAssetDocument = HydratedDocument<OrbitOutreachAsset>;

@Schema({
  collection: "cv_assistant_outreach_assets",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class OrbitOutreachAsset {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  slot: string;

  @Prop({ type: String, required: false, default: null })
  label: string | null;

  @Prop({ type: String, required: true })
  storagePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  contentType: string;

  @Prop({ type: Number, required: true, default: 0 })
  fileSize: number;
}

export const OrbitOutreachAssetSchema = SchemaFactory.createForClass(OrbitOutreachAsset);
