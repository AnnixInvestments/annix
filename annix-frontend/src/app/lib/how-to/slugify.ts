import type { HowToHeading } from "./types";

export const slugifyHeading = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const extractHeadings = (body: string): HowToHeading[] => {
  const lines = body.split(/\r?\n/);

  const result = lines.reduce<{ inCode: boolean; headings: HowToHeading[] }>(
    (state, line) => {
      if (line.trim().startsWith("```")) {
        return { inCode: !state.inCode, headings: state.headings };
      }
      if (state.inCode) return state;

      const match = line.match(/^(#{2,3})\s+(.+?)\s*$/);
      if (!match) return state;

      const level = match[1].length === 2 ? 2 : 3;
      const text = match[2].trim();
      return {
        inCode: state.inCode,
        headings: [...state.headings, { level, text, anchor: slugifyHeading(text) }],
      };
    },
    { inCode: false, headings: [] },
  );

  return result.headings;
};
