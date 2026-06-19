import { MeetingRecording } from "./meeting-recording.entity";

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
  speakerLabel: string;
  confidence: number | null;
}

export interface ActionItem {
  task: string;
  assignee: string | null;
  dueDate: string | null;
  extracted: boolean;
}

export interface ObjectionResponse {
  objection: string;
  suggestedResponse: string;
  category: "budget" | "timing" | "competition" | "features" | "trust" | "general";
}

export interface DealProbability {
  score: number;
  confidence: "low" | "medium" | "high";
  factors: {
    positive: string[];
    negative: string[];
  };
}

export interface MeetingAnalysis {
  topics: string[];
  questions: string[];
  objections: string[];
  actionItems: ActionItem[];
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative" | null;
  sentimentScore: number | null;
  dealProbability: DealProbability | null;
  objectionResponses: ObjectionResponse[];
}

export class MeetingTranscript {
  id: number;

  recording: MeetingRecording;

  recordingId: number;

  fullText: string;

  segments: TranscriptSegment[];

  wordCount: number;

  analysis: MeetingAnalysis | null;

  summary: string | null;

  whisperModel: string | null;

  language: string;

  processingTimeMs: number | null;

  createdAt: Date;

  updatedAt: Date;
}
