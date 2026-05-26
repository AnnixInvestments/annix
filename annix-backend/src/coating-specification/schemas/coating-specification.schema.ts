import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CoatingSpecificationDocument = HydratedDocument<CoatingSpecification>;

@Schema({
  collection: "coating_specifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CoatingSpecification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  environmentId: number;

  @Prop({ type: String, required: true })
  coatingType: string;

  @Prop({ type: String, required: true })
  lifespan: string;

  @Prop({ type: String, required: true })
  system: string;

  @Prop({ type: String, required: true })
  coats: string;

  @Prop({ type: String, required: true })
  totalDftUmRange: string;

  @Prop({ type: String, required: true })
  applications: string;

  @Prop({ type: String, required: false })
  systemCode: string;

  @Prop({ type: String, required: false })
  binderType: string;

  @Prop({ type: String, required: false })
  primerType: string;

  @Prop({ type: String, required: false })
  primerNdftUm: string;

  @Prop({ type: String, required: false })
  subsequentBinder: string;

  @Prop({ type: String, required: false })
  supportedDurabilities: string;

  @Prop({ type: Boolean, required: true })
  isRecommended: boolean;
}

export const CoatingSpecificationSchema = SchemaFactory.createForClass(CoatingSpecification);

CoatingSpecificationSchema.virtual("environment", {
  ref: "CoatingEnvironment",
  localField: "environmentId",
  foreignField: "_id",
  justOne: true,
});
