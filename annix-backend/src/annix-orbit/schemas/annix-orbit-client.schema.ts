import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitClientStatus } from "../entities/annix-orbit-client.entity";

export type AnnixOrbitClientDocument = HydratedDocument<AnnixOrbitClient>;

@Schema({
  collection: "orbit_clients",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitClient {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  industry: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: String, required: false })
  contactName: string;

  @Prop({ type: String, required: false })
  contactEmail: string;

  @Prop({ type: String, required: false })
  contactPhone: string;

  @Prop({ type: Number, required: false })
  feePercentage: number;

  @Prop({ type: String, required: false })
  paymentTerms: string;

  @Prop({ type: String, required: false, default: "prospect" })
  status: AnnixOrbitClientStatus;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitClientSchema = SchemaFactory.createForClass(AnnixOrbitClient);
