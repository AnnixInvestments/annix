import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CoatingStandardDocument = HydratedDocument<CoatingStandard>;

@Schema({
  collection: "coating_standards",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CoatingStandard {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  generalSurfacePreparation: string;

  @Prop({ type: String, required: false })
  notes: string;
}

export const CoatingStandardSchema = SchemaFactory.createForClass(CoatingStandard);

CoatingStandardSchema.virtual("environments", {
  ref: "CoatingEnvironment",
  localField: "_id",
  foreignField: "standardId",
  justOne: false,
});
