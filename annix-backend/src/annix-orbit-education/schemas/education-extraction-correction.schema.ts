import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationExtractionCorrectionDocument = HydratedDocument<EducationExtractionCorrection>;

@Schema({
  collection: "orbit_education_extraction_corrections",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationExtractionCorrection {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: false })
  institutionId: string;

  @Prop({ type: String, required: true })
  fieldKey: string;

  @Prop({ type: Object, required: true })
  extractedValue: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  correctedValue: Record<string, unknown>;

  @Prop({ type: String, required: false })
  sourceUrl: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const EducationExtractionCorrectionSchema = SchemaFactory.createForClass(
  EducationExtractionCorrection,
);
