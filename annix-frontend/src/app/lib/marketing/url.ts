export function externalHref(url: string): string {
  const trimmed = url.trim();
  if (trimmed === "") {
    return "";
  }
  if (/^(https?:)?\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
