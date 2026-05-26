import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BendCenterToFaceDocument = HydratedDocument<BendCenterToFace>;

@Schema({
  collection: "bend_center_to_face",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BendCenterToFace {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  bendType: string;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: Number, required: true })
  degrees: number;

  @Prop({ type: Number, required: true })
  centerToFaceMm: number;

  @Prop({ type: Number, required: true })
  radiusMm: number;

  @Prop({ type: Number, required: true })
  radians: number;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export const BendCenterToFaceSchema = SchemaFactory.createForClass(BendCenterToFace);
