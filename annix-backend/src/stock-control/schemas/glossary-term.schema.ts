import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type GlossaryTermDocument = HydratedDocument<GlossaryTerm>;

@Schema({
  collection: "sc_glossary_terms",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class GlossaryTerm {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  abbreviation: string;

  @Prop({ type: String, required: true })
  term: string;

  @Prop({ type: String, required: true })
  definition: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Boolean, required: true })
  isCustom: boolean;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const GlossaryTermSchema = SchemaFactory.createForClass(GlossaryTerm);

GlossaryTermSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

GlossaryTermSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
