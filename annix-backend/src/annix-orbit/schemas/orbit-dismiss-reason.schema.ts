import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type OrbitDismissReasonDocument = HydratedDocument<OrbitDismissReason>;

@Schema({
  collection: "orbit_dismiss_reasons",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class OrbitDismissReason {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: false, default: null })
  muteAction: string | null;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const OrbitDismissReasonSchema = SchemaFactory.createForClass(OrbitDismissReason);
