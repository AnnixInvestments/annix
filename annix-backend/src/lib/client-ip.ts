interface IpRequestShape {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

export function clientIpFromRequest(req: IpRequestShape): string {
  const headers = req.headers ?? {};
  // Fly's edge sets Fly-Client-IP to the real client address and overwrites any
  // client-supplied value, so it is the trusted source. Prefer it; fall back to
  // x-forwarded-for / req.ip only for local dev and non-Fly environments.
  const flyClientIp = headers["fly-client-ip"];
  const trustedFlyIp = Array.isArray(flyClientIp) ? flyClientIp[0] : flyClientIp;
  if (trustedFlyIp?.trim()) {
    return trustedFlyIp.trim();
  }
  const forwarded = headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
      ? forwarded.split(",")[0]
      : null;
  return forwardedIp?.trim() || req.ip || req.socket?.remoteAddress || "unknown";
}
