import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import FormData from "form-data";
import { Repository } from "typeorm";
import { TranscriptResponseDto, TranscriptWithSegmentsDto, UpdateTranscriptDto } from "../dto";
import {
  type ActionItem,
  type DealProbability,
  type MeetingAnalysis,
  MeetingRecording,
  MeetingTranscript,
  type ObjectionResponse,
  RecordingProcessingStatus,
  type SpeakerSegment,
  type TranscriptSegment,
} from "../entities";

interface WhisperSegment {
  start_time: number;
  end_time: number;
  text: string;
  confidence: number | null;
}

interface WhisperResponse {
  text: string;
  segments: WhisperSegment[];
  language: string;
  language_probability: number;
  duration: number;
  processing_time_ms: number;
  model: string;
}

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly whisperUrl: string;
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(MeetingRecording)
    private readonly recordingRepo: Repository<MeetingRecording>,
    @InjectRepository(MeetingTranscript)
    private readonly transcriptRepo: Repository<MeetingTranscript>,
    private readonly configService: ConfigService,
  ) {
    this.whisperUrl = this.configService.get<string>("WHISPER_API_URL") ?? "http://localhost:8000";
    this.uploadDir = this.configService.get<string>("UPLOAD_DIR") ?? "./uploads";
  }

  async transcribeRecording(recordingId: number): Promise<MeetingTranscript> {
    const recording = await this.recordingRepo.findOne({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException("Recording not found");
    }

    const existingTranscript = await this.transcriptRepo.findOne({
      where: { recordingId },
    });

    if (existingTranscript) {
      this.logger.log(`Transcript already exists for recording ${recordingId}`);
      return existingTranscript;
    }

    recording.processingStatus = RecordingProcessingStatus.TRANSCRIBING;
    await this.recordingRepo.save(recording);

    try {
      const audioPath = path.join(this.uploadDir, recording.storagePath);

      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      const whisperResponse = await this.callWhisperApi(audioPath, recording.originalFilename);

      const alignedSegments = this.alignSpeakerLabels(
        whisperResponse.segments,
        recording.speakerSegments ?? [],
        recording.speakerLabels ?? {},
      );

      const analysis = this.analyzeTranscript(alignedSegments);

      const fullText = alignedSegments.map((s) => s.text).join(" ");

      const transcript = this.transcriptRepo.create({
        recordingId,
        fullText,
        segments: alignedSegments,
        wordCount: fullText.split(/\s+/).filter((w) => w.length > 0).length,
        analysis,
        whisperModel: whisperResponse.model,
        language: whisperResponse.language,
        processingTimeMs: whisperResponse.processing_time_ms,
      });

      const saved = await this.transcriptRepo.save(transcript);

      recording.processingStatus = RecordingProcessingStatus.COMPLETED;
      await this.recordingRepo.save(recording);

      this.logger.log(
        `Transcript created for recording ${recordingId}: ${saved.wordCount} words, ${alignedSegments.length} segments`,
      );

      return saved;
    } catch (error) {
      recording.processingStatus = RecordingProcessingStatus.FAILED;
      recording.processingError = error instanceof Error ? error.message : "Transcription failed";
      await this.recordingRepo.save(recording);

      this.logger.error(`Transcription failed for recording ${recordingId}: ${error}`);
      throw error;
    }
  }

  private async callWhisperApi(
    audioPath: string,
    filename: string | null,
  ): Promise<WhisperResponse> {
    const formData = new FormData();

    const audioStream = fs.createReadStream(audioPath);
    formData.append("file", audioStream, {
      filename: filename ?? "audio.webm",
      contentType: "audio/webm",
    });

    const response = await fetch(`${this.whisperUrl}/transcribe`, {
      method: "POST",
      body: formData as unknown as BodyInit,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    return (await response.json()) as WhisperResponse;
  }

  private alignSpeakerLabels(
    whisperSegments: WhisperSegment[],
    speakerSegments: SpeakerSegment[],
    speakerLabels: Record<string, string>,
  ): TranscriptSegment[] {
    if (speakerSegments.length === 0) {
      return whisperSegments.map((seg) => ({
        startTime: seg.start_time,
        endTime: seg.end_time,
        text: seg.text,
        speakerLabel: "Speaker",
        confidence: seg.confidence,
      }));
    }

    return whisperSegments.map((whisperSeg) => {
      const midPoint = (whisperSeg.start_time + whisperSeg.end_time) / 2;

      let bestMatch: SpeakerSegment | null = null;
      let bestOverlap = 0;

      for (const speakerSeg of speakerSegments) {
        const overlapStart = Math.max(whisperSeg.start_time, speakerSeg.startTime);
        const overlapEnd = Math.min(whisperSeg.end_time, speakerSeg.endTime);
        const overlap = Math.max(0, overlapEnd - overlapStart);

        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestMatch = speakerSeg;
        }

        if (midPoint >= speakerSeg.startTime && midPoint <= speakerSeg.endTime) {
          bestMatch = speakerSeg;
          break;
        }
      }

      const rawLabel = bestMatch?.speakerLabel ?? "Speaker";
      const displayLabel = speakerLabels[rawLabel] ?? rawLabel;

      return {
        startTime: whisperSeg.start_time,
        endTime: whisperSeg.end_time,
        text: whisperSeg.text,
        speakerLabel: displayLabel,
        confidence: whisperSeg.confidence,
      };
    });
  }

  private analyzeTranscript(segments: TranscriptSegment[]): MeetingAnalysis {
    const fullText = segments.map((s) => s.text).join(" ");
    const sentences = fullText.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const topics = this.extractTopics(sentences);
    const questions = this.extractQuestions(sentences);
    const objections = this.extractObjections(sentences);
    const actionItems = this.extractActionItems(sentences);
    const keyPoints = this.extractKeyPoints(sentences);
    const { sentiment, sentimentScore } = this.analyzeSentiment(fullText);
    const dealProbability = this.calculateDealProbability(
      fullText,
      objections,
      sentiment,
      actionItems,
    );
    const objectionResponses = this.generateObjectionResponses(objections);

    return {
      topics,
      questions,
      objections,
      actionItems,
      keyPoints,
      sentiment,
      sentimentScore,
      dealProbability,
      objectionResponses,
    };
  }

  private extractTopics(sentences: string[]): string[] {
    const topicPatterns = [
      /\b(discuss(?:ed|ing)?|talk(?:ed|ing)? about|regarding|about|concerning)\s+(.+?)(?:\.|,|$)/gi,
      /\b(project|product|service|solution|system|platform|feature|requirement)\s*:\s*(.+?)(?:\.|,|$)/gi,
    ];

    const topics = new Set<string>();

    for (const sentence of sentences) {
      for (const pattern of topicPatterns) {
        const matches = sentence.matchAll(pattern);
        for (const match of matches) {
          const topic = match[2]?.trim();
          if (topic && topic.length > 3 && topic.length < 100) {
            topics.add(this.capitalizeFirst(topic));
          }
        }
      }
    }

    const keywordTopics = this.extractKeywordTopics(sentences.join(" "));
    keywordTopics.forEach((t) => topics.add(t));

    return Array.from(topics).slice(0, 10);
  }

  private extractKeywordTopics(text: string): string[] {
    const businessKeywords = [
      "pricing",
      "budget",
      "timeline",
      "deadline",
      "delivery",
      "implementation",
      "integration",
      "migration",
      "support",
      "maintenance",
      "training",
      "onboarding",
      "contract",
      "agreement",
      "proposal",
      "quote",
      "specification",
      "requirement",
    ];

    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of businessKeywords) {
      if (lowerText.includes(keyword)) {
        found.push(this.capitalizeFirst(keyword));
      }
    }

    return found.slice(0, 5);
  }

  private extractQuestions(sentences: string[]): string[] {
    const questions: string[] = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();

      if (trimmed.includes("?")) {
        questions.push(trimmed);
        continue;
      }

      const questionStarters = [
        /^(how|what|when|where|why|who|which|can|could|would|will|do|does|is|are|have|has)\b/i,
      ];

      for (const pattern of questionStarters) {
        if (pattern.test(trimmed) && trimmed.length > 10) {
          questions.push(`${trimmed}?`);
          break;
        }
      }
    }

    return questions.slice(0, 15);
  }

  private extractObjections(sentences: string[]): string[] {
    const objectionPatterns = [
      /\b(concern(?:ed)?|worried|issue|problem|challenge|difficult|expensive|costly|budget|afford|time|complex)\b/i,
      /\b(not sure|don't think|can't|won't|shouldn't|unable|hesitant)\b/i,
      /\b(competitor|alternative|other option|consider(?:ing)?)\b/i,
    ];

    const objections: string[] = [];

    for (const sentence of sentences) {
      for (const pattern of objectionPatterns) {
        if (pattern.test(sentence)) {
          objections.push(sentence.trim());
          break;
        }
      }
    }

    return objections.slice(0, 10);
  }

  private extractActionItems(sentences: string[]): ActionItem[] {
    const actionPatterns = [
      /\b(will|shall|going to|need to|have to|must|should)\s+(send|email|call|follow up|schedule|arrange|prepare|create|update|review|check|confirm|get back)\b/i,
      /\b(action|todo|task|next step)s?:?\s*(.+)/i,
      /\b(let me|I'll|we'll|I will|we will)\s+(send|email|call|follow up|schedule|arrange|prepare|create|update|review|check|confirm|get back)\b/i,
    ];

    const assigneePatterns = [
      /\b([A-Z][a-z]+)\s+will\b/,
      /\b([A-Z][a-z]+)\s+to\s+(send|email|call|follow up|schedule)/,
    ];

    const actionItems: ActionItem[] = [];

    for (const sentence of sentences) {
      for (const pattern of actionPatterns) {
        if (pattern.test(sentence)) {
          let assignee: string | null = null;

          for (const assigneePattern of assigneePatterns) {
            const match = sentence.match(assigneePattern);
            if (match) {
              assignee = match[1];
              break;
            }
          }

          actionItems.push({
            task: sentence.trim(),
            assignee,
            dueDate: null,
            extracted: true,
          });
          break;
        }
      }
    }

    return actionItems.slice(0, 15);
  }

  private extractKeyPoints(sentences: string[]): string[] {
    const keyPointIndicators = [
      /\b(important|key|main|critical|essential|significant|notably|specifically)\b/i,
      /\b(agreed|decided|confirmed|concluded|summariz(?:e|ing))\b/i,
      /\b(bottom line|in summary|to summarize|in conclusion|the point is)\b/i,
    ];

    const keyPoints: string[] = [];

    for (const sentence of sentences) {
      for (const pattern of keyPointIndicators) {
        if (pattern.test(sentence) && sentence.trim().length > 20) {
          keyPoints.push(sentence.trim());
          break;
        }
      }
    }

    if (keyPoints.length < 3 && sentences.length > 5) {
      const longSentences = sentences.filter((s) => s.trim().length > 50).slice(0, 3);
      keyPoints.push(...longSentences.map((s) => s.trim()));
    }

    return keyPoints.slice(0, 10);
  }

  private analyzeSentiment(text: string): {
    sentiment: "positive" | "neutral" | "negative" | null;
    sentimentScore: number | null;
  } {
    const positiveWords = [
      "great",
      "excellent",
      "good",
      "perfect",
      "happy",
      "pleased",
      "excited",
      "interested",
      "agree",
      "love",
      "wonderful",
      "fantastic",
      "amazing",
      "impressive",
      "beneficial",
      "valuable",
      "helpful",
      "appreciate",
      "thank",
      "yes",
      "definitely",
      "absolutely",
    ];

    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "poor",
      "disappointed",
      "unhappy",
      "frustrated",
      "annoyed",
      "disagree",
      "hate",
      "problem",
      "issue",
      "concern",
      "worried",
      "difficult",
      "expensive",
      "costly",
      "no",
      "not",
      "can't",
      "won't",
      "unfortunately",
    ];

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, "");
      if (positiveWords.includes(cleanWord)) positiveCount++;
      if (negativeWords.includes(cleanWord)) negativeCount++;
    }

    const total = positiveCount + negativeCount;

    if (total === 0) {
      return { sentiment: "neutral", sentimentScore: 0 };
    }

    const score = (positiveCount - negativeCount) / total;

    let sentiment: "positive" | "neutral" | "negative";
    if (score > 0.2) {
      sentiment = "positive";
    } else if (score < -0.2) {
      sentiment = "negative";
    } else {
      sentiment = "neutral";
    }

    return { sentiment, sentimentScore: Math.round(score * 100) / 100 };
  }

  private calculateDealProbability(
    fullText: string,
    objections: string[],
    sentiment: "positive" | "neutral" | "negative" | null,
    actionItems: ActionItem[],
  ): DealProbability {
    const lowerText = fullText.toLowerCase();
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];
    let score = 50;

    const buyingSignals = [
      {
        pattern: /\b(when can we start|ready to move forward|let's proceed|sign the contract)\b/i,
        weight: 15,
        label: "Strong buying intent expressed",
      },
      {
        pattern: /\b(send (me |us )?(the |a )?proposal|quote|pricing)\b/i,
        weight: 10,
        label: "Requested proposal/pricing",
      },
      {
        pattern: /\b(timeline|implementation|rollout|go.?live)\b/i,
        weight: 8,
        label: "Discussing implementation timeline",
      },
      {
        pattern: /\b(budget (is )?(approved|available|ready))\b/i,
        weight: 12,
        label: "Budget confirmed available",
      },
      {
        pattern: /\b(decision.?maker|ceo|cfo|board|executive)\b/i,
        weight: 5,
        label: "Decision makers involved",
      },
      {
        pattern: /\b(perfect|exactly what we need|this is great)\b/i,
        weight: 8,
        label: "Strong positive feedback",
      },
      {
        pattern: /\b(next steps|follow.?up|schedule|meeting)\b/i,
        weight: 6,
        label: "Next steps discussed",
      },
      {
        pattern: /\b(we('ve| have) decided|our choice is|going with)\b/i,
        weight: 15,
        label: "Decision made in favor",
      },
    ];

    const warningSignals = [
      {
        pattern: /\b(not (in |the )?budget|too expensive|can't afford)\b/i,
        weight: -15,
        label: "Budget concerns raised",
      },
      {
        pattern: /\b(need to think|get back to you|discuss internally)\b/i,
        weight: -8,
        label: "Delayed decision making",
      },
      {
        pattern: /\b(competitor|alternative|other (vendor|option|solution))\b/i,
        weight: -10,
        label: "Considering competitors",
      },
      {
        pattern: /\b(not (a )?priority|maybe (next|later)|not now)\b/i,
        weight: -12,
        label: "Low priority indicated",
      },
      {
        pattern: /\b(concerned|worried|hesitant|unsure|skeptical)\b/i,
        weight: -6,
        label: "Expressed hesitation",
      },
      {
        pattern: /\b(no (budget|timeline|deadline))\b/i,
        weight: -10,
        label: "No urgency or budget",
      },
      {
        pattern: /\b(just (looking|exploring|researching))\b/i,
        weight: -8,
        label: "Early exploration phase",
      },
    ];

    for (const signal of buyingSignals) {
      if (signal.pattern.test(lowerText)) {
        score += signal.weight;
        positiveFactors.push(signal.label);
      }
    }

    for (const signal of warningSignals) {
      if (signal.pattern.test(lowerText)) {
        score += signal.weight;
        negativeFactors.push(signal.label);
      }
    }

    if (sentiment === "positive") {
      score += 10;
      positiveFactors.push("Overall positive sentiment");
    } else if (sentiment === "negative") {
      score -= 10;
      negativeFactors.push("Overall negative sentiment");
    }

    if (actionItems.length >= 3) {
      score += 8;
      positiveFactors.push("Multiple action items agreed");
    } else if (actionItems.length === 0) {
      score -= 5;
      negativeFactors.push("No concrete action items");
    }

    const objectionCount = objections.length;
    if (objectionCount === 0) {
      score += 5;
      positiveFactors.push("No objections raised");
    } else if (objectionCount >= 3) {
      score -= 10;
      negativeFactors.push("Multiple objections raised");
    }

    score = Math.max(0, Math.min(100, score));

    const totalSignals = positiveFactors.length + negativeFactors.length;
    let confidence: "low" | "medium" | "high";
    if (totalSignals < 3) {
      confidence = "low";
    } else if (totalSignals < 6) {
      confidence = "medium";
    } else {
      confidence = "high";
    }

    return {
      score,
      confidence,
      factors: {
        positive: positiveFactors.slice(0, 5),
        negative: negativeFactors.slice(0, 5),
      },
    };
  }

  private generateObjectionResponses(objections: string[]): ObjectionResponse[] {
    const responseTemplates: Record<
      string,
      { category: ObjectionResponse["category"]; responses: string[] }
    > = {
      budget: {
        category: "budget",
        responses: [
          "I understand budget is a concern. Let's explore flexible payment options or a phased implementation that fits your financial planning.",
          "Many of our clients found that the ROI justified the investment within the first year. Would you like me to share some case studies?",
          "We offer different pricing tiers. Let me see if there's a package that better aligns with your budget while still meeting your core needs.",
        ],
      },
      expensive: {
        category: "budget",
        responses: [
          "While the initial investment may seem significant, consider the long-term cost savings and efficiency gains. Shall we calculate the potential ROI together?",
          "Let's break down the value proposition - often what seems expensive upfront delivers significant savings over time.",
        ],
      },
      time: {
        category: "timing",
        responses: [
          "I understand timing is important. Our implementation team is flexible and can work around your schedule to minimize disruption.",
          "We can start with a pilot program that requires minimal time investment, allowing you to see results before committing fully.",
        ],
      },
      competitor: {
        category: "competition",
        responses: [
          "That's great that you're evaluating options thoroughly. What specific features or capabilities are most important in your comparison?",
          "I'd be happy to provide a detailed comparison highlighting our unique differentiators. What aspects matter most to your team?",
        ],
      },
      alternative: {
        category: "competition",
        responses: [
          "Exploring alternatives is smart. May I ask what criteria you're using to evaluate? I want to ensure I'm addressing your specific needs.",
          "I appreciate your due diligence. What would help you feel confident in making a decision?",
        ],
      },
      complex: {
        category: "features",
        responses: [
          "I hear your concern about complexity. We provide comprehensive onboarding and training to ensure a smooth transition.",
          "Our solution is designed to be intuitive. Most teams are fully productive within the first two weeks. Would a demo help address your concerns?",
        ],
      },
      difficult: {
        category: "features",
        responses: [
          "We've designed our solution with ease of use in mind. Let me show you how straightforward the core workflows are.",
          "Our support team is available 24/7 to help with any challenges. Many clients were surprised at how quickly their teams adapted.",
        ],
      },
      trust: {
        category: "trust",
        responses: [
          "Building trust is important to us. I can connect you with existing clients in your industry who can share their experience.",
          "We have a proven track record with companies like yours. Would case studies or references help build your confidence?",
        ],
      },
      worried: {
        category: "trust",
        responses: [
          "Your concerns are valid. Let's address them one by one so you feel completely comfortable moving forward.",
          "I want to make sure all your concerns are addressed. Can you tell me more about what's worrying you?",
        ],
      },
      concern: {
        category: "general",
        responses: [
          "Thank you for sharing your concerns. Let me address each one to ensure we find the right solution for you.",
          "I appreciate your honesty. Understanding your concerns helps me better tailor our solution to your needs.",
        ],
      },
    };

    return objections.map((objection) => {
      const lowerObjection = objection.toLowerCase();
      let matchedCategory: ObjectionResponse["category"] = "general";
      let suggestedResponse =
        "Thank you for raising this point. Let's discuss how we can address your specific needs and find a solution that works for you.";

      for (const [keyword, template] of Object.entries(responseTemplates)) {
        if (lowerObjection.includes(keyword)) {
          matchedCategory = template.category;
          suggestedResponse =
            template.responses[Math.floor(Math.random() * template.responses.length)];
          break;
        }
      }

      return {
        objection,
        suggestedResponse,
        category: matchedCategory,
      };
    });
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async transcript(recordingId: number): Promise<TranscriptWithSegmentsDto | null> {
    const transcript = await this.transcriptRepo.findOne({
      where: { recordingId },
    });

    if (!transcript) {
      return null;
    }

    return this.toTranscriptWithSegments(transcript);
  }

  async transcriptByMeeting(meetingId: number): Promise<TranscriptWithSegmentsDto | null> {
    const recording = await this.recordingRepo.findOne({
      where: { meetingId },
    });

    if (!recording) {
      return null;
    }

    return this.transcript(recording.id);
  }

  async deleteTranscript(recordingId: number): Promise<void> {
    const transcript = await this.transcriptRepo.findOne({
      where: { recordingId },
    });

    if (transcript) {
      await this.transcriptRepo.remove(transcript);
      this.logger.log(`Transcript deleted for recording ${recordingId}`);
    }
  }

  async retranscribe(recordingId: number): Promise<MeetingTranscript> {
    await this.deleteTranscript(recordingId);
    return this.transcribeRecording(recordingId);
  }

  async updateSegments(
    userId: number,
    transcriptId: number,
    dto: UpdateTranscriptDto,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptRepo.findOne({
      where: { id: transcriptId },
      relations: ["recording", "recording.meeting"],
    });

    if (!transcript) {
      throw new NotFoundException("Transcript not found");
    }

    if (transcript.recording.meeting.salesRepId !== userId) {
      throw new NotFoundException("Transcript not found");
    }

    const updatedSegments = transcript.segments.map((segment, index) => {
      const update = dto.segments.find((u) => u.index === index);
      if (!update) {
        return segment;
      }
      return {
        ...segment,
        speakerLabel: update.speakerLabel ?? segment.speakerLabel,
        text: update.text ?? segment.text,
      };
    });

    const invalidIndices = dto.segments
      .filter((u) => u.index < 0 || u.index >= transcript.segments.length)
      .map((u) => u.index);

    if (invalidIndices.length > 0) {
      throw new BadRequestException(`Invalid segment indices: ${invalidIndices.join(", ")}`);
    }

    transcript.segments = updatedSegments;
    transcript.fullText = updatedSegments.map((s) => s.text).join(" ");
    transcript.wordCount = transcript.fullText.split(/\s+/).filter((w) => w.length > 0).length;

    const saved = await this.transcriptRepo.save(transcript);

    this.logger.log(`Transcript ${transcriptId} updated: ${dto.segments.length} segments modified`);

    return this.toTranscriptWithSegments(saved);
  }

  private toTranscriptResponse(transcript: MeetingTranscript): TranscriptResponseDto {
    return {
      id: transcript.id,
      recordingId: transcript.recordingId,
      fullText: transcript.fullText,
      wordCount: transcript.wordCount,
      summary: transcript.summary,
      analysis: transcript.analysis,
      whisperModel: transcript.whisperModel,
      language: transcript.language,
      processingTimeMs: transcript.processingTimeMs,
      createdAt: transcript.createdAt,
    };
  }

  private toTranscriptWithSegments(transcript: MeetingTranscript): TranscriptWithSegmentsDto {
    return {
      ...this.toTranscriptResponse(transcript),
      segments: transcript.segments,
    };
  }
}
