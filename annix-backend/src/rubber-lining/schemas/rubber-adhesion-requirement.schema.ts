import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberAdhesionRequirementDocument = HydratedDocument<RubberAdhesionRequirement>;

@Schema({
  collection: "rubber_adhesion_requirements",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberAdhesionRequirement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rubberTypeId: number;

  @Prop({ type: String, required: true })
  vulcanizationMethod: string;

  @Prop({ type: Number, required: true })
  minAdhesionNPerMm: number;

  @Prop({ type: String, required: true })
  testStandard: string;
}

export const RubberAdhesionRequirementSchema =
  SchemaFactory.createForClass(RubberAdhesionRequirement);

RubberAdhesionRequirementSchema.virtual("rubberType", {
  ref: "RubberType",
  localField: "rubberTypeId",
  foreignField: "_id",
  justOne: true,
});
