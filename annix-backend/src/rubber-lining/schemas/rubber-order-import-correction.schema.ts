import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberOrderImportCorrectionDocument = HydratedDocument<RubberOrderImportCorrection>;

@Schema({
  collection: "rubber_order_import_corrections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberOrderImportCorrection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  companyId: string;

  @Prop({ type: String, required: false })
  companyName: string;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  correctedValue: string;

  @Prop({ type: String, required: false })
  correctedBy: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const RubberOrderImportCorrectionSchema = SchemaFactory.createForClass(
  RubberOrderImportCorrection,
);

RubberOrderImportCorrectionSchema.virtual("company", {
  ref: "RubberCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
