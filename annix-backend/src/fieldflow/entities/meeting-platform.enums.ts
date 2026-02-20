export enum MeetingPlatform {
  ZOOM = "zoom",
  TEAMS = "teams",
  GOOGLE_MEET = "google_meet",
}

export enum PlatformConnectionStatus {
  ACTIVE = "active",
  ERROR = "error",
  DISCONNECTED = "disconnected",
  TOKEN_EXPIRED = "token_expired",
}

export enum PlatformRecordingStatus {
  PENDING = "pending",
  DOWNLOADING = "downloading",
  DOWNLOADED = "downloaded",
  PROCESSING = "processing",
  TRANSCRIBING = "transcribing",
  COMPLETED = "completed",
  FAILED = "failed",
  NO_RECORDING = "no_recording",
}
