import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HdpePipeSpecificationDocument = HydratedDocument<HdpePipeSpecification>;

@Schema({
  collection: "hdpe_pipe_specifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HdpePipeSpecification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalBore: number;

  @Prop({ type: Number, required: true })
  outerDiameter: number;

  @Prop({ type: Number, required: true })
  sdr: number;

  @Prop({ type: Number, required: true })
  wallThickness: number;

  @Prop({ type: Number, required: true })
  innerDiameter: number;

  @Prop({ type: Number, required: true })
  weightKgPerM: number;

  @Prop({ type: Number, required: false })
  pressureRatingPn: number;

  @Prop({ type: String, required: true })
  materialGrade: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const HdpePipeSpecificationSchema = SchemaFactory.createForClass(HdpePipeSpecification);
