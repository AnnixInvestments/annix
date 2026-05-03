import { skyInvestigatorFixture } from "@annix/product-data/teacher-assistant";
import { renderAssignmentHtml } from "./assignment.template";

describe("renderAssignmentHtml", () => {
  it("renders the title in the page", () => {
    const html = renderAssignmentHtml(skyInvestigatorFixture);
    expect(html).toContain(skyInvestigatorFixture.title);
  });

  it("includes every task step", () => {
    const html = renderAssignmentHtml(skyInvestigatorFixture);
    skyInvestigatorFixture.tasks.forEach((task) => {
      expect(html).toContain(`Step ${task.step}`);
      expect(html).toContain(task.title);
    });
  });

  it("includes the rubric criteria", () => {
    const html = renderAssignmentHtml(skyInvestigatorFixture);
    skyInvestigatorFixture.rubric.forEach((row) => {
      expect(html).toContain(row.criterion);
    });
  });

  it("includes parent note and student AI prompt starters", () => {
    const html = renderAssignmentHtml(skyInvestigatorFixture);
    expect(html).toContain("Parent note");
    expect(html).toContain("Your child will photograph the sky");
    skyInvestigatorFixture.studentAiPromptStarters.forEach((p) => {
      const noQuotes = p.replace(/['"]/g, "");
      expect(html.replace(/&#39;|&quot;/g, "")).toContain(noQuotes);
    });
  });

  it("escapes user input to prevent HTML injection", () => {
    const malicious = {
      ...skyInvestigatorFixture,
      title: "<script>alert(1)</script>",
    };
    const html = renderAssignmentHtml(malicious);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
