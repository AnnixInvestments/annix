import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ReconciliationEventDocument = HydratedDocument<ReconciliationEvent>;

@Schema({
  collection: "reconciliation_events",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ReconciliationEvent {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  reconciliationItemId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  eventType: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: false })
  referenceNumber: string;

  @Prop({ type: String, required: true })
  performedByName: string;

  @Prop({ type: Number, required: false })
  performedById: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const ReconciliationEventSchema = SchemaFactory.createForClass(ReconciliationEvent);

ReconciliationEventSchema.virtual("reconciliationItem", {
  ref: "ReconciliationItem",
  localField: "reconciliationItemId",
  foreignField: "_id",
  justOne: true,
});
