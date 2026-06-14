import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitTaskDocument = HydratedDocument<AnnixOrbitTask>;

@Schema({
  collection: "orbit_tasks",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitTask {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  ownerUserId: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: Date, required: false })
  dueDate: Date | null;

  @Prop({ type: Boolean, required: false, default: false })
  done: boolean;

  @Prop({ type: Number, required: false })
  relatedCandidateId: number | null;

  @Prop({ type: String, required: false })
  notes: string | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixOrbitTaskSchema = SchemaFactory.createForClass(AnnixOrbitTask);
