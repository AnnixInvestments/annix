import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberPoExtractionRegionDocument = HydratedDocument<RubberPoExtractionRegion>;

@Schema({
  collection: "rubber_po_extraction_region",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberPoExtractionRegion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  templateId: number;

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

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberPoExtractionRegionSchema =
  SchemaFactory.createForClass(RubberPoExtractionRegion);

RubberPoExtractionRegionSchema.virtual("template", {
  ref: "RubberPoExtractionTemplate",
  localField: "templateId",
  foreignField: "_id",
  justOne: true,
});
