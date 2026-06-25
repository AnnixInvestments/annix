import { renderTemplate } from "./email-template-defaults";

const MALICIOUS_SKILL = "Welding</p><img src=x onerror=\"fetch('https://evil.example.com')\">";
const MALICIOUS_NAME = "Jane</p><script>alert(1)</script>";

describe("renderTemplate", () => {
  it("escapes substituted values when rendering into an HTML body", () => {
    const html = renderTemplate(
      "<p>{{candidateName}}: {{matchExplanation}}</p>",
      {
        candidateName: MALICIOUS_NAME,
        matchExplanation: MALICIOUS_SKILL,
      },
      { escapeHtml: true },
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });

  it("preserves the template's own markup, escaping only the injected values", () => {
    const html = renderTemplate(
      "<p>{{candidateName}}</p>",
      { candidateName: "Jane Doe" },
      {
        escapeHtml: true,
      },
    );

    expect(html).toBe("<p>Jane Doe</p>");
  });

  it("does not escape when rendering plaintext / subject (default)", () => {
    const text = renderTemplate("Hi {{candidateName}}", { candidateName: MALICIOUS_NAME });

    expect(text).toBe(`Hi ${MALICIOUS_NAME}`);
  });

  it("leaves unknown placeholders untouched", () => {
    const out = renderTemplate("{{known}} {{unknown}}", { known: "ok" }, { escapeHtml: true });

    expect(out).toBe("ok {{unknown}}");
  });
});
