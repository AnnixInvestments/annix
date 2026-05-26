import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitEmailTemplateDocument = HydratedDocument<AnnixOrbitEmailTemplate>;

@Schema({
  collection: "cv_assistant_email_templates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitEmailTemplate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  kind: string;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String, required: true })
  bodyHtml: string;

  @Prop({ type: String, required: true })
  bodyText: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitEmailTemplateSchema = SchemaFactory.createForClass(AnnixOrbitEmailTemplate);

AnnixOrbitEmailTemplateSchema.virtual("company", {
  ref: "AnnixOrbitCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
