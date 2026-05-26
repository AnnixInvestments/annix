import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CoatingEnvironmentDocument = HydratedDocument<CoatingEnvironment>;

@Schema({
  collection: "coating_environments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CoatingEnvironment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  standardId: number;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  surfacePreparation: string;
}

export const CoatingEnvironmentSchema = SchemaFactory.createForClass(CoatingEnvironment);

CoatingEnvironmentSchema.virtual("standard", {
  ref: "CoatingStandard",
  localField: "standardId",
  foreignField: "_id",
  justOne: true,
});

CoatingEnvironmentSchema.virtual("specifications", {
  ref: "CoatingSpecification",
  localField: "_id",
  foreignField: "environmentId",
  justOne: false,
});
