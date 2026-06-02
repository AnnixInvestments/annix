import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type {
  AnnixOrbitPlacementInvoiceStatus,
  AnnixOrbitPlacementStatus,
} from "../entities/annix-orbit-placement.entity";

export type AnnixOrbitPlacementDocument = HydratedDocument<AnnixOrbitPlacement>;

@Schema({
  collection: "orbit_placements",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitPlacement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  clientId: number;

  @Prop({ type: String, required: true })
  candidateName: string;

  @Prop({ type: String, required: true })
  jobTitle: string;

  @Prop({ type: Number, required: false })
  salary: number;

  @Prop({ type: Number, required: false })
  placementFee: number;

  @Prop({ type: String, required: false })
  startDate: string;

  @Prop({ type: String, required: false })
  guaranteeUntil: string;

  @Prop({ type: String, required: false, default: "offer_accepted" })
  status: AnnixOrbitPlacementStatus;

  @Prop({ type: String, required: false, default: "not_invoiced" })
  invoiceStatus: AnnixOrbitPlacementInvoiceStatus;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitPlacementSchema = SchemaFactory.createForClass(AnnixOrbitPlacement);
