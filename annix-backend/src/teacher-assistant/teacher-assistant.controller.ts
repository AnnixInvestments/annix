import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
import { Body, Controller, Header, Post, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ExportAssignmentDocxDto } from "./dto/export-docx.dto";
import { ExportAssignmentPdfDto } from "./dto/export-pdf.dto";
import { GenerateAssignmentDto } from "./dto/generate-assignment.dto";
import { RegenerateSectionDto } from "./dto/regenerate-section.dto";
import { TeacherAssistantAuthGuard } from "./guards/teacher-assistant-auth.guard";
import {
  type AssignmentDocxResult,
  AssignmentDocxService,
} from "./services/assignment-docx.service";
import { AssignmentGeneratorService } from "./services/assignment-generator.service";
import { AssignmentPdfService } from "./services/assignment-pdf.service";

@Controller("teacher-assistant")
@UseGuards(TeacherAssistantAuthGuard)
export class TeacherAssistantController {
  constructor(
    private readonly generator: AssignmentGeneratorService,
    private readonly pdf: AssignmentPdfService,
    private readonly docx: AssignmentDocxService,
  ) {}

  @Post("generate")
  async generate(@Body() body: GenerateAssignmentDto): Promise<Assignment> {
    const input = this.toAssignmentInput(body);
    return this.generator.generate(input);
  }

  @Post("regenerate-section")
  async regenerateSection(@Body() body: RegenerateSectionDto): Promise<Assignment> {
    const input = this.toAssignmentInput(body.input);
    return this.generator.regenerateSection(input, body.section, body.existingAssignment);
  }

  @Post("export/pdf")
  @Header("Content-Type", "application/pdf")
  async exportPdf(
    @Body() body: ExportAssignmentPdfDto,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const buffer = await this.pdf.render(body.assignment);
    const filename = pdfFilename(body.assignment.title);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(buffer.length));
    res.end(buffer);
  }

  @Post("export/docx")
  async exportDocx(@Body() body: ExportAssignmentDocxDto): Promise<AssignmentDocxResult> {
    return this.docx.render(body.assignment);
  }

  private toAssignmentInput(dto: GenerateAssignmentDto): AssignmentInput {
    return {
      subject: dto.subject,
      topic: dto.topic,
      ageBucket: dto.ageBucket,
      studentAge: dto.studentAge,
      duration: dto.duration,
      outputType: dto.outputType,
      difficulty: dto.difficulty,
      differentiation: dto.differentiation,
      learningObjective: dto.learningObjective?.trim() || null,
      allowAiUse: dto.allowAiUse,
    };
  }
}

function pdfFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "assignment"}.pdf`;
}
