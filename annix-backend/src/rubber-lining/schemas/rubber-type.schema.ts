import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberTypeDocument = HydratedDocument<RubberType>;

@Schema({
  collection: "rubber_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  typeNumber: number;

  @Prop({ type: String, required: true })
  typeName: string;

  @Prop({ type: String, required: true })
  polymerCodes: string;

  @Prop({ type: String, required: true })
  polymerNames: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: Number, required: true })
  tempMinCelsius: number;

  @Prop({ type: Number, required: true })
  tempMaxCelsius: number;

  @Prop({ type: String, required: true })
  ozoneResistance: string;

  @Prop({ type: String, required: true })
  oilResistance: string;

  @Prop({ type: String, required: false })
  chemicalResistanceNotes: string;

  @Prop({ type: String, required: false })
  notSuitableFor: string;

  @Prop({ type: String, required: false })
  typicalApplications: string;
}

export const RubberTypeSchema = SchemaFactory.createForClass(RubberType);

RubberTypeSchema.virtual("specifications", {
  ref: "RubberSpecification",
  localField: "_id",
  foreignField: "rubberTypeId",
  justOne: false,
});
