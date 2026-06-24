import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ProspectDocument = HydratedDocument<Prospect>;

@Schema({
  collection: "annix_rep_prospects",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Prospect {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  ownerId: number;

  @Prop({ type: String, required: true })
  companyName: string;

  @Prop({ type: String, required: false })
  contactName: string;

  @Prop({ type: String, required: false })
  contactEmail: string;

  @Prop({ type: String, required: false })
  contactPhone: string;

  @Prop({ type: String, required: false })
  contactTitle: string;

  @Prop({ type: Object, required: false })
  address: {
    streetAddress: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  } | null;

  @Prop({ type: String, required: true })
  country: string;

  @Prop({ type: Number, required: false })
  latitude: number;

  @Prop({ type: Number, required: false })
  longitude: number;

  @Prop({ type: String, required: false })
  googlePlaceId: string;

  @Prop({ type: String, required: false })
  discoverySource: string;

  @Prop({ type: Date, required: false })
  discoveredAt: Date;

  @Prop({ type: String, required: false })
  externalId: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: true })
  priority: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: [String], required: false })
  tags: string;

  @Prop({ type: Number, required: false })
  estimatedValue: number;

  @Prop({ type: String, required: false })
  crmExternalId: string;

  @Prop({ type: String, required: false })
  crmSyncStatus: string;

  @Prop({ type: Date, required: false })
  crmLastSyncedAt: Date;

  @Prop({ type: Date, required: false })
  lastContactedAt: Date;

  @Prop({ type: Date, required: false })
  nextFollowUpAt: Date;

  @Prop({ type: String, required: true })
  followUpRecurrence: string;

  @Prop({ type: Object, required: false })
  customFields: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Date, required: false })
  scoreUpdatedAt: Date;

  @Prop({ type: Number, required: false })
  assignedToId: number;

  @Prop({ type: String, required: false })
  organizationId: string;

  @Prop({ type: String, required: false })
  territoryId: string;

  @Prop({ type: Boolean, required: true })
  isSharedWithTeam: boolean;

  @Prop({ type: Boolean, required: true })
  sharedNotesVisible: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const ProspectSchema = SchemaFactory.createForClass(Prospect);

ProspectSchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "_id",
  justOne: true,
});

ProspectSchema.virtual("organization", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});

ProspectSchema.virtual("territory", {
  ref: "Territory",
  localField: "territoryId",
  foreignField: "_id",
  justOne: true,
});
