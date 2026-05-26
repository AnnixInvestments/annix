import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberChemicalCompatibilityDocument = HydratedDocument<RubberChemicalCompatibility>;

@Schema({
  collection: "rubber_chemical_compatibility",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberChemicalCompatibility {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rubberTypeId: number;

  @Prop({ type: String, required: true })
  chemical: string;

  @Prop({ type: String, required: false })
  concentration: string;

  @Prop({ type: Number, required: true })
  temperatureC: number;

  @Prop({ type: String, required: true })
  rating: string;

  @Prop({ type: String, required: false })
  isoTr7620Ref: string;

  @Prop({ type: String, required: false })
  notes: string;
}

export const RubberChemicalCompatibilitySchema = SchemaFactory.createForClass(
  RubberChemicalCompatibility,
);

RubberChemicalCompatibilitySchema.virtual("rubberType", {
  ref: "RubberType",
  localField: "rubberTypeId",
  foreignField: "_id",
  justOne: true,
});
