const CHUNK_ERROR_RELOAD_KEY = "chunk-error-reload";
const RELOAD_COOLDOWN_MS = 10000;

export function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    error.message.includes("Failed to load chunk") ||
    error.message.includes("Loading chunk") ||
    error.message.includes("dynamically imported module")
  );
}

export function attemptChunkErrorRecovery(): boolean {
  const lastReload = sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY);
  const now = Date.now();

  if (!lastReload || now - Number(lastReload) > RELOAD_COOLDOWN_MS) {
    sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, String(now));
    window.location.reload();
    return true;
  }

  return false;
}
