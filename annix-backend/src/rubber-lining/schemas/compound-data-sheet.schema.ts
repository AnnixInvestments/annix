import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CompoundDataSheetDocument = HydratedDocument<CompoundDataSheet>;

@Schema({
  collection: "compound_data_sheet",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CompoundDataSheet {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  code: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: false })
  polymer: string;

  @Prop({ type: String, required: false })
  shoreHardness: string;

  @Prop({ type: String, required: false })
  colour: string;

  @Prop({ type: String, required: false })
  cureMethod: string;

  @Prop({ type: String, required: false })
  shortDescription: string;

  @Prop({ type: [String], required: false })
  applications: string[];

  @Prop({ type: String, required: false })
  notRecommended: string;

  @Prop({ type: [Object], required: false })
  specs: { label: string; value: string; method?: string | null }[];

  @Prop({ type: String, required: false })
  pdfUrl: string;

  @Prop({ type: String, required: false })
  pdfStatus: string;

  @Prop({ type: String, required: false })
  revision: string;

  @Prop({ type: String, required: false })
  metaTitle: string;

  @Prop({ type: String, required: false })
  metaDescription: string;

  @Prop({ type: Number, required: false })
  sortOrder: number;

  @Prop({ type: Boolean, required: true })
  isPublished: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CompoundDataSheetSchema = SchemaFactory.createForClass(CompoundDataSheet);
