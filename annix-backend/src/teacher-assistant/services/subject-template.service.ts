import {
  type Subject,
  type SubjectTemplate,
  subjectTemplates,
} from "@annix/product-data/teacher-assistant";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SubjectTemplateService {
  templateFor(subject: Subject): SubjectTemplate {
    return subjectTemplates[subject];
  }

  isExperimental(subject: string): boolean {
    return !(subject in subjectTemplates);
  }
}
