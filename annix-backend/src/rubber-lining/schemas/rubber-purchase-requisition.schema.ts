import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberPurchaseRequisitionDocument = HydratedDocument<RubberPurchaseRequisition>;

@Schema({
  collection: "rubber_purchase_requisitions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberPurchaseRequisition {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  requisitionNumber: string;

  @Prop({ type: String, required: true })
  sourceType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  supplierCompanyId: number;

  @Prop({ type: String, required: false })
  externalPoNumber: string;

  @Prop({ type: String, required: false })
  externalPoDocumentPath: string;

  @Prop({ type: Date, required: false })
  expectedDeliveryDate: Date;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: String, required: false })
  approvedBy: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: String, required: false })
  rejectionReason: string;

  @Prop({ type: String, required: false })
  rejectedBy: string;

  @Prop({ type: Date, required: false })
  rejectedAt: Date;

  @Prop({ type: Date, required: false })
  orderedAt: Date;

  @Prop({ type: Date, required: false })
  receivedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberPurchaseRequisitionSchema =
  SchemaFactory.createForClass(RubberPurchaseRequisition);

RubberPurchaseRequisitionSchema.virtual("supplierCompany", {
  ref: "RubberCompany",
  localField: "supplierCompanyId",
  foreignField: "_id",
  justOne: true,
});

RubberPurchaseRequisitionSchema.virtual("items", {
  ref: "RubberPurchaseRequisitionItem",
  localField: "_id",
  foreignField: "requisitionId",
  justOne: false,
});
