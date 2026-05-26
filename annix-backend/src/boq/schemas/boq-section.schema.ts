import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BoqSectionDocument = HydratedDocument<BoqSection>;

@Schema({
  collection: "boq_sections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BoqSection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  boqId: number;

  @Prop({ type: String, required: true })
  sectionType: string;

  @Prop({ type: String, required: true })
  capabilityKey: string;

  @Prop({ type: String, required: true })
  sectionTitle: string;

  @Prop({ type: Object, required: true })
  items: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: true })
  itemCount: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const BoqSectionSchema = SchemaFactory.createForClass(BoqSection);

BoqSectionSchema.virtual("boq", {
  ref: "Boq",
  localField: "boqId",
  foreignField: "_id",
  justOne: true,
});
