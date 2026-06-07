export const SEEKER_WORKFLOW_STEPS = [
  "registered_account",
  "completed_profile",
  "uploaded_cv",
  "uploaded_qualification",
  "ai_cv_analysis",
  "career_score_generated",
  "cv_improvement_generated",
  "viewed_matched_jobs",
  "saved_job",
  "applied_job",
  "used_interview_prep",
  "updated_profile_after_suggestion",
] as const;

export type SeekerWorkflowStepKey = (typeof SEEKER_WORKFLOW_STEPS)[number];

export const SEEKER_EVENTS = {
  registered: "seeker_registered",
  profileCompleted: "seeker_profile_completed",
  cvUploaded: "seeker_cv_uploaded",
  qualificationUploaded: "seeker_qualification_uploaded",
  aiAnalysisStarted: "seeker_ai_analysis_started",
  aiAnalysisCompleted: "seeker_ai_analysis_completed",
  careerScoreGenerated: "seeker_career_score_generated",
  cvImprovementGenerated: "seeker_cv_improvement_generated",
  jobsViewed: "seeker_jobs_viewed",
  jobSaved: "seeker_job_saved",
  jobApplied: "seeker_job_applied",
  interviewPrepUsed: "seeker_interview_prep_used",
  profileUpdated: "seeker_profile_updated",
} as const;

export const SEEKER_EVENT_TO_STEP: Record<string, SeekerWorkflowStepKey> = {
  seeker_registered: "registered_account",
  seeker_profile_completed: "completed_profile",
  seeker_cv_uploaded: "uploaded_cv",
  seeker_qualification_uploaded: "uploaded_qualification",
  seeker_ai_analysis_completed: "ai_cv_analysis",
  seeker_career_score_generated: "career_score_generated",
  seeker_cv_improvement_generated: "cv_improvement_generated",
  seeker_jobs_viewed: "viewed_matched_jobs",
  seeker_job_saved: "saved_job",
  seeker_job_applied: "applied_job",
  seeker_interview_prep_used: "used_interview_prep",
  seeker_profile_updated: "updated_profile_after_suggestion",
};

export const READINESS_CRITERIA = {
  minCvUploads: 100,
  minCompletedProfiles: 75,
  minSuccessfulAnalyses: 75,
  minJobViews: 50,
  minApplications: 25,
  maxErrorRatePct: 5,
  maxAvgTtfvSeconds: 300,
} as const;

export const READINESS_STATUS = {
  notReady: "Not Ready",
  almostReady: "Almost Ready",
  readyForSoftLaunch: "Ready for Soft Launch",
  readyForPublicLaunch: "Ready for Public Launch",
} as const;
