import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnsiB169FittingTypeDocument = HydratedDocument<AnsiB169FittingType>;

@Schema({
  collection: "ansi_b16_9_fitting_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnsiB169FittingType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;
}

export const AnsiB169FittingTypeSchema = SchemaFactory.createForClass(AnsiB169FittingType);

AnsiB169FittingTypeSchema.virtual("dimensions", {
  ref: "AnsiB169FittingDimension",
  localField: "_id",
  foreignField: "fittingTypeId",
  justOne: false,
});
