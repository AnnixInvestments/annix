import type {
  Assignment,
  AssignmentTask,
  RubricCriterion,
  TeacherNotes,
} from "@annix/product-data/teacher-assistant";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  type IBorderOptions,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { ANNIX_BRAND } from "./branding";

const HEX_NAVY = "323288";
const HEX_NAVY_DARK = "252560";
const HEX_ORANGE = "FFA500";
const HEX_NAVY_TINT = "F5F6FF";
const HEX_ORANGE_TINT = "FFF6E5";
const HEX_GRAY_BORDER = "D1D5DB";

const NO_BORDER: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

const CELL_BORDER: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: HEX_GRAY_BORDER };

export async function renderAssignmentDocx(assignment: Assignment): Promise<Buffer> {
  const doc = new Document({
    creator: ANNIX_BRAND.fullName,
    title: assignment.title,
    description: `Teacher Assistant assignment — ${assignment.subject} · ${assignment.topic}`,
    styles: {
      default: {
        document: {
          run: { font: "Inter", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children: [
          ...brandHeader(),
          titleBlock(assignment),
          metaLine(assignment),
          spacer(120),
          heading("Student brief"),
          briefBlock(assignment.studentBrief),
          ...optionalSection("Learning objective", assignment.learningObjective, [
            paragraph(assignment.learningObjective),
          ]),
          ...listSection("Success criteria", assignment.successCriteria),
          heading("Tasks"),
          ...assignment.tasks.flatMap(taskBlock),
          ...listSection("AI use rules", assignment.aiUseRules),
          ...listSection("Evidence checklist", assignment.evidenceChecklist),
          heading("Rubric"),
          rubricTable(assignment.rubric),
          spacer(120),
          heading("Teacher notes"),
          ...teacherNotesBlock(assignment.teacherNotes),
          ...optionalSection("Parent note", assignment.parentNote, [
            paragraph(assignment.parentNote),
          ]),
          ...listSection("Suggested student AI prompts", assignment.studentAiPromptStarters, true),
          ...partialExemplarsBlock(assignment.partialExemplars),
          ...workbookPagesBlock(assignment.optionalWorkbookPages),
          spacer(240),
          footerBar(),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function brandHeader(): Paragraph[] {
  return [
    new Paragraph({
      shading: { type: ShadingType.SOLID, color: HEX_NAVY, fill: HEX_NAVY },
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({ text: " A  ", bold: true, color: HEX_NAVY, size: 24 }),
        new TextRun({
          text: `   ${ANNIX_BRAND.name}`,
          bold: true,
          color: "FFFFFF",
          size: 28,
        }),
        new TextRun({
          text: `    ${ANNIX_BRAND.appName}`,
          color: "FFFFFF",
          size: 18,
        }),
        new TextRun({
          text: `         ${ANNIX_BRAND.domain}`,
          color: HEX_ORANGE,
          size: 16,
        }),
      ],
    }),
  ];
}

function titleBlock(assignment: Assignment): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { before: 240, after: 60 },
    children: [
      new TextRun({
        text: assignment.title,
        bold: true,
        color: HEX_NAVY,
        size: 44,
      }),
    ],
  });
}

function metaLine(assignment: Assignment): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: `${cap(assignment.subject)} · ${assignment.topic} · ages ${assignment.ageBucket} · ${assignment.duration} · ${assignment.outputType} · ${assignment.difficulty}`,
        color: "6B7280",
        size: 20,
      }),
    ],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: HEX_ORANGE, space: 4 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: HEX_NAVY,
        size: 26,
      }),
    ],
  });
}

function briefBlock(text: string): Paragraph {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, color: HEX_NAVY_TINT, fill: HEX_NAVY_TINT },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: HEX_ORANGE, space: 8 },
    },
    spacing: { before: 60, after: 120 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function paragraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function spacer(after = 60): Paragraph {
  return new Paragraph({ spacing: { after }, children: [] });
}

function bullet(text: string, monospace = false): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [
      new TextRun({
        text,
        size: 22,
        font: monospace ? "Consolas" : undefined,
        color: monospace ? HEX_NAVY_DARK : undefined,
      }),
    ],
  });
}

function listSection(title: string, items: string[], monospace = false): Paragraph[] {
  if (items.length === 0) return [];
  return [heading(title), ...items.map((item) => bullet(item, monospace))];
}

function optionalSection(title: string, source: string, content: Paragraph[]): Paragraph[] {
  if (!source) return [];
  return [heading(title), ...content];
}

function taskBlock(task: AssignmentTask): Paragraph[] {
  const blocks: Paragraph[] = [
    new Paragraph({
      shading: { type: ShadingType.CLEAR, color: "FAFBFF", fill: "FAFBFF" },
      border: {
        left: { style: BorderStyle.SINGLE, size: 18, color: HEX_NAVY, space: 8 },
      },
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({ text: `Step ${task.step}: `, bold: true, color: HEX_ORANGE, size: 22 }),
        new TextRun({ text: task.title, bold: true, color: HEX_NAVY, size: 22 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      indent: { left: 240 },
      children: [new TextRun({ text: task.studentInstruction, size: 22 })],
    }),
  ];

  if (task.requiredEvidence.length > 0) {
    blocks.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 240 },
        children: [
          labelRun("Evidence:"),
          new TextRun({ text: ` ${task.requiredEvidence.join(", ")}`, size: 20 }),
        ],
      }),
    );
  }

  if (task.reasoningPrompt) {
    blocks.push(promptBlock("Reasoning", task.reasoningPrompt));
  }

  if (task.aiCritique) {
    blocks.push(
      new Paragraph({
        shading: { type: ShadingType.CLEAR, color: HEX_ORANGE_TINT, fill: HEX_ORANGE_TINT },
        border: {
          left: { style: BorderStyle.SINGLE, size: 18, color: HEX_ORANGE, space: 8 },
        },
        spacing: { before: 80, after: 40 },
        indent: { left: 240 },
        children: [new TextRun({ text: "AI critique", bold: true, color: HEX_NAVY, size: 22 })],
      }),
      critiqueLine("Try this prompt", task.aiCritique.promptToTry),
      critiqueLine("Compare to your evidence", task.aiCritique.compareToEvidence),
      critiqueLine("Note issues", task.aiCritique.noteIssues),
      critiqueLine("Improve with personal input", task.aiCritique.improveWithPersonalInput),
    );
  }

  if (task.reflectionPrompt) {
    blocks.push(promptBlock("Reflection", task.reflectionPrompt));
  }

  return blocks;
}

function promptBlock(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 240 },
    children: [labelRun(label), new TextRun({ text: ` ${value}`, italics: true, size: 22 })],
  });
}

function critiqueLine(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 30 },
    indent: { left: 480 },
    bullet: { level: 0 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: HEX_NAVY, size: 20 }),
      new TextRun({ text: value, size: 20 }),
    ],
  });
}

function labelRun(text: string): TextRun {
  return new TextRun({
    text,
    bold: true,
    size: 18,
    color: "6B7280",
    allCaps: true,
  });
}

function rubricTable(rubric: RubricCriterion[]): Table {
  const headerCells = ["Criterion", "Excellent", "Good", "Satisfactory", "Needs Work"].map(
    (text) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, color: HEX_NAVY, fill: HEX_NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
          }),
        ],
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
      }),
  );

  const bodyRows = rubric.map(
    (row) =>
      new TableRow({
        children: [
          rubricCell(row.criterion, true),
          rubricCell(row.excellent),
          rubricCell(row.good),
          rubricCell(row.satisfactory),
          rubricCell(row.needsWork),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2000, 2000, 2000, 2000, 2000],
    rows: [new TableRow({ tableHeader: true, children: headerCells }), ...bodyRows],
  });
}

function rubricCell(text: string, isCriterion = false): TableCell {
  return new TableCell({
    shading: isCriterion
      ? { type: ShadingType.CLEAR, color: HEX_NAVY_TINT, fill: HEX_NAVY_TINT }
      : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 20,
            bold: isCriterion,
            color: isCriterion ? HEX_NAVY : undefined,
          }),
        ],
      }),
    ],
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
    },
  });
}

function teacherNotesBlock(notes: TeacherNotes): Paragraph[] {
  const rows: { label: string; value: string }[] = [
    { label: "Setup", value: notes.setup },
    { label: "Setup time", value: notes.setupTime },
    { label: "Materials", value: notes.materialsNeeded.join(", ") },
    { label: "Common misconceptions", value: notes.commonMisconceptions.join("; ") },
    { label: "Marking guidance", value: notes.markingGuidance },
    { label: "Support option", value: notes.supportOption },
    { label: "Extension option", value: notes.extensionOption },
  ];

  return rows
    .filter((row) => row.value)
    .map(
      (row) =>
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: `${row.label}: `, bold: true, color: HEX_NAVY, size: 22 }),
            new TextRun({ text: row.value, size: 22 }),
          ],
        }),
    );
}

function partialExemplarsBlock(exemplars: Assignment["partialExemplars"]): Paragraph[] {
  if (exemplars.length === 0) return [];
  return [
    heading("Partial exemplars"),
    ...exemplars.flatMap((ex) => [
      new Paragraph({
        spacing: { before: 80, after: 30 },
        children: [labelRun(ex.forCriterion)],
      }),
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 240 },
        children: [
          new TextRun({ text: "Strong: ", bold: true, color: "047857", size: 22 }),
          new TextRun({ text: ex.strongElement, size: 22 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 240 },
        children: [
          new TextRun({ text: "Weak: ", bold: true, color: "B91C1C", size: 22 }),
          new TextRun({ text: ex.weakElement, size: 22 }),
        ],
      }),
    ]),
  ];
}

function workbookPagesBlock(pages: Assignment["optionalWorkbookPages"]): Paragraph[] {
  if (pages.length === 0) return [];
  return [
    heading("Workbook pages"),
    ...pages.flatMap((page) => [
      new Paragraph({
        spacing: { before: 100, after: 30 },
        children: [new TextRun({ text: page.pageTitle, bold: true, color: HEX_NAVY, size: 24 })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: page.content, size: 22 })],
      }),
      ...(page.imagePromptHint
        ? [
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: `Suggested image: ${page.imagePromptHint}`,
                  italics: true,
                  size: 18,
                  color: "6B7280",
                }),
              ],
            }),
          ]
        : []),
    ]),
  ];
}

function footerBar(): Paragraph {
  return new Paragraph({
    shading: { type: ShadingType.CLEAR, color: HEX_NAVY, fill: HEX_NAVY },
    border: {
      top: { style: BorderStyle.SINGLE, size: 12, color: HEX_ORANGE, space: 4 },
    },
    spacing: { before: 200, after: 0 },
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text: `  Generated by ${ANNIX_BRAND.name} ${ANNIX_BRAND.appName}        `,
        color: "FFFFFF",
        size: 18,
      }),
      new TextRun({
        text: ANNIX_BRAND.domain,
        color: HEX_ORANGE,
        size: 18,
      }),
    ],
  });
}

function cap(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
