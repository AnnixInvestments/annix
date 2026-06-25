export function isAnnixOrbitWhatsAppQuotaGateEnabled(): boolean {
  return process.env.ORBIT_WHATSAPP_QUOTA_GATE === "true";
}

export function assertAnnixOrbitWhatsAppQuotaGateConfigured(): void {
  if (!isAnnixOrbitWhatsAppQuotaGateEnabled()) {
    return;
  }
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || appSecret.trim() === "") {
    throw new Error(
      "ORBIT_WHATSAPP_QUOTA_GATE is enabled but WHATSAPP_APP_SECRET is not set. The WhatsApp inbound webhook would be unauthenticated, letting anyone forge the verification marker that bypasses the free-tier quota. Refusing to boot — set WHATSAPP_APP_SECRET or disable the gate.",
    );
  }
}
