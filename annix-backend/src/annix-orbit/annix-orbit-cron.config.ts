export function isAnnixOrbitCronEnabled(): boolean {
  return process.env.CV_ASSISTANT_CRON_ENABLED === "true";
}
