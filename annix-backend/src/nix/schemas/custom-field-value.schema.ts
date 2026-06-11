import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomFieldValueDocument = HydratedDocument<CustomFieldValue>;

@Schema({
  collection: "custom_field_values",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomFieldValue {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: Number, required: true })
  entityId: number;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  fieldValue: string;

  @Prop({ type: String, required: true })
  documentCategory: string;

  @Prop({ type: Number, required: false })
  extractedFromDocumentId: number;

  @Prop({ type: Number, required: false })
  confidence: number;

  @Prop({ type: Boolean, required: true })
  isVerified: boolean;

  @Prop({ type: Number, required: false })
  verifiedByUserId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CustomFieldValueSchema = SchemaFactory.createForClass(CustomFieldValue);
