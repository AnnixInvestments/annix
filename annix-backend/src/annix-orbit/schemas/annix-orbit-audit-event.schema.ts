import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitAuditAction } from "../entities/annix-orbit-audit-event.entity";

export type AnnixOrbitAuditEventDocument = HydratedDocument<AnnixOrbitAuditEvent>;

@Schema({
  collection: "orbit_audit_events",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitAuditEvent {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  actorUserId: number;

  @Prop({ type: String, required: true })
  actorName: string;

  @Prop({ type: String, required: true })
  action: AnnixOrbitAuditAction;

  @Prop({ type: Number, required: false })
  candidateId: number;

  @Prop({ type: Number, required: false })
  submissionId: number;

  @Prop({ type: Number, required: false })
  shortlistId: number;

  @Prop({ type: Number, required: false })
  clientId: number;

  @Prop({ type: String, required: false })
  detail: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitAuditEventSchema = SchemaFactory.createForClass(AnnixOrbitAuditEvent);
