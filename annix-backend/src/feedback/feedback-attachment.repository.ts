import { CrudRepository } from "../lib/persistence/crud-repository";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";

export abstract class FeedbackAttachmentRepository extends CrudRepository<FeedbackAttachment> {
  abstract findByFeedbackId(feedbackId: number): Promise<FeedbackAttachment[]>;
  abstract findByFeedbackIdOrderedByCreated(feedbackId: number): Promise<FeedbackAttachment[]>;
}
