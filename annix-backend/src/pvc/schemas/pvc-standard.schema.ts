import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PvcStandardDocument = HydratedDocument<PvcStandard>;

@Schema({
  collection: "pvc_standards",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PvcStandard {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  pvcType: string;

  @Prop({ type: String, required: false })
  region: string;

  @Prop({ type: String, required: false })
  application: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PvcStandardSchema = SchemaFactory.createForClass(PvcStandard);
