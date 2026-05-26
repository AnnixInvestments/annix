import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberAuCocDocument = HydratedDocument<RubberAuCoc>;

@Schema({
  collection: "rubber_au_cocs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberAuCoc {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  cocNumber: string;

  @Prop({ type: Number, required: true })
  customerCompanyId: number;

  @Prop({ type: String, required: false })
  poNumber: string;

  @Prop({ type: String, required: false })
  deliveryNoteRef: string;

  @Prop({ type: Number, required: false })
  sourceDeliveryNoteId: number;

  @Prop({ type: Object, required: false })
  extractedRollData: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  generatedPdfPath: string;

  @Prop({ type: String, required: false })
  sentToEmail: string;

  @Prop({ type: Date, required: false })
  sentAt: Date;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  approvedByName: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: String, required: true })
  readinessStatus: string;

  @Prop({ type: Object, required: false })
  readinessDetails: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  lastAutoProcessedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberAuCocSchema = SchemaFactory.createForClass(RubberAuCoc);

RubberAuCocSchema.virtual("customerCompany", {
  ref: "RubberCompany",
  localField: "customerCompanyId",
  foreignField: "_id",
  justOne: true,
});

RubberAuCocSchema.virtual("sourceDeliveryNote", {
  ref: "RubberDeliveryNote",
  localField: "sourceDeliveryNoteId",
  foreignField: "_id",
  justOne: true,
});
