import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberProductDocument = HydratedDocument<RubberProduct>;

@Schema({
  collection: "rubber_product",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: false })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: false })
  specificGravity: number;

  @Prop({ type: String, required: false })
  compoundOwnerFirebaseUid: string;

  @Prop({ type: String, required: false })
  compoundFirebaseUid: string;

  @Prop({ type: String, required: false })
  typeFirebaseUid: string;

  @Prop({ type: Number, required: false })
  costPerKg: number;

  @Prop({ type: String, required: false })
  colourFirebaseUid: string;

  @Prop({ type: String, required: false })
  hardnessFirebaseUid: string;

  @Prop({ type: String, required: false })
  curingMethodFirebaseUid: string;

  @Prop({ type: String, required: false })
  gradeFirebaseUid: string;

  @Prop({ type: Number, required: false })
  tensileStrengthMpa: number;

  @Prop({ type: Number, required: false })
  elongationAtBreak: number;

  @Prop({ type: Number, required: false })
  markup: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberProductSchema = SchemaFactory.createForClass(RubberProduct);
