import { CustomerFeedback } from "./customer-feedback.entity";

export class FeedbackAttachment {
  id: number;

  feedback: CustomerFeedback;

  feedbackId: number;

  filePath: string;

  originalFilename: string;

  mimeType: string;

  fileSize: number;

  isAutoScreenshot: boolean;

  createdAt: Date;
}
