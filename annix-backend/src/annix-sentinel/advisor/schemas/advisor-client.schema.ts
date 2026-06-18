import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelAdvisorClientDocument = HydratedDocument<AnnixSentinelAdvisorClient>;

@Schema({
  collection: "comply_sa_advisor_clients",
  timestamps: { createdAt: false, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelAdvisorClient {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  advisorUserId: number;

  @Prop({ type: Number, required: true })
  clientCompanyId: number;

  @Prop({ type: Date, required: false })
  addedAt: Date;
}

export const AnnixSentinelAdvisorClientSchema = SchemaFactory.createForClass(
  AnnixSentinelAdvisorClient,
);
