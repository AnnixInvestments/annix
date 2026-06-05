export function isInsightsCronEnabled(): boolean {
  return process.env.INSIGHTS_CRON_ENABLED === "true";
}
