import type { TranscriptEntry } from "../meeting/types.js";
import type { ActionItem, MeetingSummary, MeetingSummaryAttendee } from "./types.js";

interface SummaryGeneratorOptions {
  openaiApiKey: string;
  model?: string;
}

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class SummaryGenerator {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: SummaryGeneratorOptions) {
    this.apiKey = options.openaiApiKey;
    this.model = options.model ?? "gpt-4o";
  }

  async generateSummary(
    title: string,
    date: string,
    durationSeconds: number,
    transcript: TranscriptEntry[],
    attendeeEmails: Map<string, string>,
  ): Promise<MeetingSummary> {
    const fullTranscript = this.formatTranscript(transcript);
    const attendees = this.analyzeAttendees(transcript, attendeeEmails);
    const duration = this.formatDuration(durationSeconds);

    const aiSummary = await this.callOpenAI(title, fullTranscript);

    return {
      title,
      date,
      duration,
      attendees,
      keyPoints: aiSummary.keyPoints,
      actionItems: aiSummary.actionItems,
      decisions: aiSummary.decisions,
      nextSteps: aiSummary.nextSteps,
      fullTranscript,
    };
  }

  private formatTranscript(transcript: TranscriptEntry[]): string {
    return transcript
      .map((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `[${time}] ${entry.speakerName}: ${entry.text}`;
      })
      .join("\n");
  }

  private analyzeAttendees(
    transcript: TranscriptEntry[],
    attendeeEmails: Map<string, string>,
  ): MeetingSummaryAttendee[] {
    const speakerStats = new Map<string, { speakingTime: number; contributions: number }>();

    for (const entry of transcript) {
      const name = entry.speakerName;
      const existing = speakerStats.get(name) ?? { speakingTime: 0, contributions: 0 };

      const wordCount = entry.text.split(/\s+/).length;
      const estimatedSeconds = wordCount * 0.4;

      speakerStats.set(name, {
        speakingTime: existing.speakingTime + estimatedSeconds,
        contributions: existing.contributions + 1,
      });
    }

    return Array.from(speakerStats.entries()).map(([name, stats]) => ({
      name,
      email: attendeeEmails.get(name) ?? null,
      speakingTime: Math.round(stats.speakingTime),
      contributions: stats.contributions,
    }));
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  private async callOpenAI(title: string, transcript: string): Promise<{
    keyPoints: string[];
    actionItems: ActionItem[];
    decisions: string[];
    nextSteps: string[];
  }> {
    const systemPrompt = `You are a meeting summarization assistant. Analyze the meeting transcript and extract:
1. Key Points: The main topics and important information discussed
2. Action Items: Tasks that were assigned or need to be done, with assignee if mentioned
3. Decisions: Any decisions that were made during the meeting
4. Next Steps: Follow-up actions or future plans mentioned

Respond in JSON format:
{
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": [{"description": "task", "assignee": "name or null", "dueDate": "date or null", "priority": "high|medium|low"}, ...],
  "decisions": ["decision 1", "decision 2", ...],
  "nextSteps": ["step 1", "step 2", ...]
}`;

    const userPrompt = `Meeting Title: ${title}

Transcript:
${transcript}

Please analyze this meeting and provide a summary.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    try {
      const parsed = JSON.parse(content) as {
        keyPoints?: string[];
        actionItems?: Array<{
          description: string;
          assignee?: string;
          dueDate?: string;
          priority?: string;
        }>;
        decisions?: string[];
        nextSteps?: string[];
      };

      return {
        keyPoints: parsed.keyPoints ?? [],
        actionItems: (parsed.actionItems ?? []).map((item) => ({
          description: item.description,
          assignee: item.assignee ?? null,
          dueDate: item.dueDate ?? null,
          priority: (item.priority as "high" | "medium" | "low") ?? "medium",
        })),
        decisions: parsed.decisions ?? [],
        nextSteps: parsed.nextSteps ?? [],
      };
    } catch {
      return {
        keyPoints: ["Unable to parse meeting summary"],
        actionItems: [],
        decisions: [],
        nextSteps: [],
      };
    }
  }

  formatAsHtml(summary: MeetingSummary): string {
    const attendeeRows = summary.attendees
      .map(
        (a) =>
          `<tr><td>${a.name}</td><td>${a.email ?? "-"}</td><td>${Math.round(a.speakingTime / 60)}m</td><td>${a.contributions}</td></tr>`,
      )
      .join("");

    const keyPoints = summary.keyPoints.map((p) => `<li>${p}</li>`).join("");

    const actionItems = summary.actionItems
      .map(
        (a) =>
          `<li><strong>${a.description}</strong>${a.assignee ? ` (${a.assignee})` : ""}${a.dueDate ? ` - Due: ${a.dueDate}` : ""} <span class="priority-${a.priority}">[${a.priority}]</span></li>`,
      )
      .join("");

    const decisions = summary.decisions.map((d) => `<li>${d}</li>`).join("");
    const nextSteps = summary.nextSteps.map((s) => `<li>${s}</li>`).join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Meeting Summary: ${summary.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #16213e; margin-top: 30px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f5f5f5; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
    .priority-high { color: #d32f2f; font-weight: bold; }
    .priority-medium { color: #f57c00; }
    .priority-low { color: #388e3c; }
    .transcript { background: #f9f9f9; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${summary.title}</h1>
  <div class="meta">
    <p><strong>Date:</strong> ${summary.date} | <strong>Duration:</strong> ${summary.duration}</p>
  </div>

  <h2>Participants</h2>
  <table>
    <thead><tr><th>Name</th><th>Email</th><th>Speaking Time</th><th>Contributions</th></tr></thead>
    <tbody>${attendeeRows}</tbody>
  </table>

  <h2>Key Points</h2>
  <ul>${keyPoints || "<li>No key points identified</li>"}</ul>

  <h2>Action Items</h2>
  <ul>${actionItems || "<li>No action items identified</li>"}</ul>

  <h2>Decisions Made</h2>
  <ul>${decisions || "<li>No decisions recorded</li>"}</ul>

  <h2>Next Steps</h2>
  <ul>${nextSteps || "<li>No next steps identified</li>"}</ul>

  <h2>Full Transcript</h2>
  <div class="transcript">${summary.fullTranscript}</div>

  <div class="footer">
    <p>Generated by Voice Filter Meeting Assistant</p>
  </div>
</body>
</html>`;
  }

  formatAsText(summary: MeetingSummary): string {
    const lines: string[] = [
      `MEETING SUMMARY: ${summary.title}`,
      `${"=".repeat(50)}`,
      `Date: ${summary.date}`,
      `Duration: ${summary.duration}`,
      "",
      "PARTICIPANTS",
      "-".repeat(30),
    ];

    for (const a of summary.attendees) {
      lines.push(`- ${a.name}${a.email ? ` (${a.email})` : ""} - ${Math.round(a.speakingTime / 60)}m speaking`);
    }

    lines.push("", "KEY POINTS", "-".repeat(30));
    for (const point of summary.keyPoints) {
      lines.push(`* ${point}`);
    }

    lines.push("", "ACTION ITEMS", "-".repeat(30));
    for (const item of summary.actionItems) {
      lines.push(`[${item.priority.toUpperCase()}] ${item.description}`);
      if (item.assignee) {
        lines.push(`   Assignee: ${item.assignee}`);
      }
      if (item.dueDate) {
        lines.push(`   Due: ${item.dueDate}`);
      }
    }

    lines.push("", "DECISIONS", "-".repeat(30));
    for (const decision of summary.decisions) {
      lines.push(`- ${decision}`);
    }

    lines.push("", "NEXT STEPS", "-".repeat(30));
    for (const step of summary.nextSteps) {
      lines.push(`- ${step}`);
    }

    lines.push("", "FULL TRANSCRIPT", "-".repeat(30), summary.fullTranscript);

    return lines.join("\n");
  }
}
