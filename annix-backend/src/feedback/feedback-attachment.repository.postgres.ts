import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FeedbackAttachment } from "./entities/feedback-attachment.entity";
import { FeedbackAttachmentRepository } from "./feedback-attachment.repository";

@Injectable()
export class PostgresFeedbackAttachmentRepository
  extends TypeOrmCrudRepository<FeedbackAttachment>
  implements FeedbackAttachmentRepository
{
  constructor(@InjectRepository(FeedbackAttachment) repository: Repository<FeedbackAttachment>) {
    super(repository);
  }

  findByFeedbackId(feedbackId: number): Promise<FeedbackAttachment[]> {
    return this.repository.find({ where: { feedbackId }, order: { createdAt: "ASC" } });
  }

  findByFeedbackIdOrderedByCreated(feedbackId: number): Promise<FeedbackAttachment[]> {
    return this.repository.find({ where: { feedbackId }, order: { createdAt: "ASC" } });
  }
}
