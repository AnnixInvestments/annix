import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { SeekerBillingEventType } from "../entities/seeker-billing-event.entity";

export type SeekerBillingEventDocument = HydratedDocument<SeekerBillingEvent>;

@Schema({ collection: "cv_assistant_seeker_billing_events", timestamps: true })
export class SeekerBillingEvent {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  type: SeekerBillingEventType;

  @Prop({ type: String, default: null })
  paystackReference: string | null;

  @Prop({ type: String, default: null })
  paystackEventId: string | null;

  @Prop({ type: Number, default: null })
  amountMinor: number | null;

  @Prop({ type: String, required: true, default: "ZAR" })
  currency: string;

  @Prop({ type: Object, default: null })
  rawPayload: Record<string, unknown> | null;
}

export const SeekerBillingEventSchema = SchemaFactory.createForClass(SeekerBillingEvent);
