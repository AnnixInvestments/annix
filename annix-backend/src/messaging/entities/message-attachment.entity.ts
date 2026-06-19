import { Message } from "./message.entity";

export class MessageAttachment {
  id: number;

  message: Message;

  messageId: number;

  fileName: string;

  filePath: string;

  fileSize: number;

  mimeType: string;

  createdAt: Date;
}
