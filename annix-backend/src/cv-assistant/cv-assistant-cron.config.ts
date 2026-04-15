export function isCvAssistantCronEnabled(): boolean {
  return process.env.CV_ASSISTANT_CRON_ENABLED === "true";
}
