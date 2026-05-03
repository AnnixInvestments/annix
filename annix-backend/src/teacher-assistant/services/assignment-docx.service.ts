import { createHash } from "node:crypto";
import type { Assignment } from "@annix/product-data/teacher-assistant";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { uploadDocument } from "../../lib/app-storage-helper";
import {
  type IStorageService,
  STORAGE_SERVICE,
  StorageArea,
} from "../../storage/storage.interface";
import { renderAssignmentDocx } from "../templates/assignment.docx-template";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PRESIGNED_URL_TTL_SECONDS = 60 * 60;

export interface AssignmentDocxResult {
  filename: string;
  storagePath: string;
  presignedUrl: string;
  byteSize: number;
}

@Injectable()
export class AssignmentDocxService {
  private readonly logger = new Logger(AssignmentDocxService.name);

  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
  ) {}

  async render(assignment: Assignment): Promise<AssignmentDocxResult> {
    this.logger.log(`Rendering Teacher Assistant DOCX: "${assignment.title}"`);
    const buffer = await renderAssignmentDocx(assignment);
    const filename = filenameFor(assignment.title);
    const subPath = storageSubPath(assignment, filename);

    const upload = await uploadDocument(
      this.storage,
      buffer,
      filename,
      DOCX_MIME,
      StorageArea.TEACHER_ASSISTANT,
      "exports",
      subPath,
    );

    const presignedUrl = await this.storage.presignedUrl(upload.path, PRESIGNED_URL_TTL_SECONDS);

    return {
      filename,
      storagePath: upload.path,
      presignedUrl,
      byteSize: upload.size,
    };
  }
}

function storageSubPath(assignment: Assignment, filename: string): string {
  const hash = createHash("sha256")
    .update(`${assignment.title}|${assignment.subject}|${assignment.topic}|${Date.now()}`)
    .digest("hex")
    .slice(0, 16);
  return `${assignment.subject}/${hash}/${filename}`;
}

function filenameFor(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "assignment"}.docx`;
}
