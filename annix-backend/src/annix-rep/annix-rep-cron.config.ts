export function isAnnixRepCronEnabled(): boolean {
  return process.env.ANNIX_REP_CRON_ENABLED === "true";
}
