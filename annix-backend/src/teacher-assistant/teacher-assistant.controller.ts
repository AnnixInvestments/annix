import type { Assignment, AssignmentInput } from "@annix/product-data/teacher-assistant";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { GenerateAssignmentDto } from "./dto/generate-assignment.dto";
import { RegenerateSectionDto } from "./dto/regenerate-section.dto";
import { AssignmentGeneratorService } from "./services/assignment-generator.service";

@Controller("teacher-assistant")
@UseGuards(AdminAuthGuard)
export class TeacherAssistantController {
  constructor(private readonly generator: AssignmentGeneratorService) {}

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
