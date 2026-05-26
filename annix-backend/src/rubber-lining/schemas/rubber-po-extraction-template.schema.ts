import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberPoExtractionTemplateDocument = HydratedDocument<RubberPoExtractionTemplate>;

@Schema({
  collection: "rubber_po_extraction_template",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberPoExtractionTemplate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  formatHash: string;

  @Prop({ type: String, required: false })
  templateName: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Number, required: true })
  useCount: number;

  @Prop({ type: Number, required: true })
  successCount: number;

  @Prop({ type: Number, required: false })
  createdByUserId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberPoExtractionTemplateSchema = SchemaFactory.createForClass(
  RubberPoExtractionTemplate,
);

RubberPoExtractionTemplateSchema.virtual("company", {
  ref: "RubberCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

RubberPoExtractionTemplateSchema.virtual("regions", {
  ref: "RubberPoExtractionRegion",
  localField: "_id",
  foreignField: "templateId",
  justOne: false,
});
