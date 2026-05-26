export function isAnnixOrbitCronEnabled(): boolean {
  return (
    (process.env.ANNIX_ORBIT_CRON_ENABLED ?? process.env.ANNIX_ORBIT_CRON_ENABLED) === "true"
  );
}
