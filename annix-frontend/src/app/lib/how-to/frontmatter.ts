export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  body: string;
}

export const parseFrontmatter = (raw: string): ParsedFrontmatter => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const yaml = match[1];
  const body = match[2];
  const data: Record<string, unknown> = {};

  yaml.split(/\r?\n/).forEach((line) => {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) return;
    const key = kv[1];
    const value = kv[2].trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      data[key] =
        inner.length === 0 ? [] : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else if (/^-?\d+(\.\d+)?$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  });

  return { data, body };
};

export const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

export const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" ? value : fallback;

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
