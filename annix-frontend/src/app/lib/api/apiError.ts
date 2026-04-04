export async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;

  const errorText = await response.text().catch(() => "");
  let errorMessage = `API Error (${response.status}): ${errorText}`;

  try {
    const parsed = JSON.parse(errorText);
    if (parsed.message) {
      errorMessage = parsed.message;
    }
  } catch {
    if (!errorText) {
      errorMessage = `HTTP ${response.status}`;
    }
  }

  throw new Error(errorMessage);
}
