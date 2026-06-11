import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitProfileEeDisclosure } from "../entities/annix-orbit-profile.entity";

export type AnnixOrbitProfileDocument = HydratedDocument<AnnixOrbitProfile>;

@Schema({
  collection: "cv_assistant_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: false })
  companyId: number;

  @Prop({ type: String, required: true, default: "company" })
  userType: string;

  @Prop({ type: Number, required: true, default: 80 })
  matchAlertThreshold: number;

  @Prop({ type: Boolean, required: true, default: true })
  digestEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  pushEnabled: boolean;

  @Prop({ type: String, required: false })
  cvFilePath: string;

  // Optional seeker profile photo, shown to employers when visibility is on.
  @Prop({ type: String, default: null })
  photoFilePath: string | null;

  @Prop({ type: Boolean, default: true })
  photoVisibleToEmployers: boolean;

  @Prop({ type: String, required: false })
  rawCvText: string;

  @Prop({ type: String, required: false })
  cvExtractionStatus: string;

  @Prop({ type: Object, required: false })
  extractedCvData: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  nixGeneratedCv: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  nixGeneratedCvAt: Date;

  @Prop({ type: Date, required: false })
  cvUploadedAt: Date;

  @Prop({ type: Number, required: false, default: null })
  careerScore: number | null;

  @Prop({ type: Date, required: false, default: null })
  careerScoreGeneratedAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  firstJobsViewedAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  interviewPrepUsedAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  profileUpdatedAfterSuggestionAt: Date | null;

  @Prop({
    type: {
      populationGroup: String,
      gender: String,
      disabilityStatus: String,
      requiresAccommodation: Boolean,
      accommodationNotes: String,
      nationalityStatus: String,
      purposes: [String],
      consentTextVersionId: Number,
      consentGrantedAt: Date,
      consentSource: String,
      updatedAt: Date,
    },
    required: false,
    _id: false,
  })
  eeDisclosure: AnnixOrbitProfileEeDisclosure | null;

  @Prop({ type: String, required: false })
  deletionToken: string;

  @Prop({ type: Date, required: false })
  deletionTokenExpires: Date;

  @Prop({ type: String, required: false })
  calendarFeedToken: string;

  @Prop({ type: Date, required: false })
  calendarFeedTokenCreatedAt: Date;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: Boolean, required: false, default: true })
  interviewReminderEmail: boolean;

  @Prop({ type: Boolean, required: false, default: false })
  interviewReminderSms: boolean;

  @Prop({ type: Boolean, required: false, default: false })
  interviewReminderWhatsapp: boolean;

  @Prop({ type: Date, required: false })
  dismissWarningAcknowledgedAt: Date;

  @Prop({ type: String, required: false })
  selectedTier: string;

  @Prop({ type: Date, required: false })
  onboardingCompletedAt: Date;

  @Prop({ type: String, required: false })
  phoneType: string;

  @Prop({ type: String, required: false })
  ageGroup: string;

  @Prop({ type: Boolean, required: false, default: false })
  appGuideSeen: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixOrbitProfileSchema = SchemaFactory.createForClass(AnnixOrbitProfile);

AnnixOrbitProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

AnnixOrbitProfileSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
