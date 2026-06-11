import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PvcPipeSpecificationDocument = HydratedDocument<PvcPipeSpecification>;

@Schema({
  collection: "pvc_pipe_specifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PvcPipeSpecification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalDiameter: number;

  @Prop({ type: Number, required: true })
  outerDiameter: number;

  @Prop({ type: Number, required: true })
  pressureRating: number;

  @Prop({ type: Number, required: true })
  wallThickness: number;

  @Prop({ type: Number, required: true })
  innerDiameter: number;

  @Prop({ type: Number, required: true })
  weightKgPerM: number;

  @Prop({ type: String, required: true })
  pvcType: string;

  @Prop({ type: String, required: true })
  standard: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PvcPipeSpecificationSchema = SchemaFactory.createForClass(PvcPipeSpecification);
