import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BoqSupplierAccessDocument = HydratedDocument<BoqSupplierAccess>;

@Schema({
  collection: "boq_supplier_access",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BoqSupplierAccess {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  boqId: number;

  @Prop({ type: Number, required: true })
  supplierProfileId: number;

  @Prop({ type: Object, required: true })
  allowedSections: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  viewedAt: Date;

  @Prop({ type: Date, required: false })
  respondedAt: Date;

  @Prop({ type: Date, required: false })
  notificationSentAt: Date;

  @Prop({ type: String, required: false })
  declineReason: string;

  @Prop({ type: Number, required: false })
  reminderDays: number;

  @Prop({ type: Boolean, required: true })
  reminderSent: boolean;

  @Prop({ type: Object, required: false })
  customerInfo: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  projectInfo: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  quoteData: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  quoteSavedAt: Date;

  @Prop({ type: Date, required: false })
  quoteSubmittedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const BoqSupplierAccessSchema = SchemaFactory.createForClass(BoqSupplierAccess);

BoqSupplierAccessSchema.virtual("boq", {
  ref: "Boq",
  localField: "boqId",
  foreignField: "_id",
  justOne: true,
});

BoqSupplierAccessSchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});
