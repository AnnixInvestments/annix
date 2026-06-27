import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixExtractionRegionDocument = HydratedDocument<NixExtractionRegion>;

@Schema({
  collection: "nix_extraction_regions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixExtractionRegion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  documentCategory: string;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: Object, required: true })
  regionCoordinates: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  labelCoordinates: Record<string, unknown>;

  @Prop({ type: String, required: false })
  labelText: string;

  @Prop({ type: String, required: false })
  extractionPattern: string;

  @Prop({ type: String, required: false })
  sampleValue: string;

  @Prop({ type: Number, required: true })
  confidenceThreshold: number;

  @Prop({ type: Number, required: true })
  useCount: number;

  @Prop({ type: Number, required: true })
  successCount: number;

  @Prop({ type: Number, required: false })
  createdByUserId: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Boolean, required: true })
  isCustomField: boolean;

  @Prop({ type: Boolean, required: false })
  quarantined: boolean;

  @Prop({ type: String, required: false })
  scopeKind: string;

  @Prop({ type: String, required: false })
  scopeRef: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const NixExtractionRegionSchema = SchemaFactory.createForClass(NixExtractionRegion);
