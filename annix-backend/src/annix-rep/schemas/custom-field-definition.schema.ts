import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomFieldDefinitionDocument = HydratedDocument<CustomFieldDefinition>;

@Schema({
  collection: "annix_rep_custom_field_definitions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomFieldDefinition {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  fieldKey: string;

  @Prop({ type: String, required: true })
  fieldType: string;

  @Prop({ type: Boolean, required: true })
  isRequired: boolean;

  @Prop({ type: [String], required: false })
  options: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CustomFieldDefinitionSchema = SchemaFactory.createForClass(CustomFieldDefinition);

CustomFieldDefinitionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
