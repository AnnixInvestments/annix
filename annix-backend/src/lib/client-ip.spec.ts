import { clientIpFromRequest } from "./client-ip";

describe("clientIpFromRequest", () => {
  it("prefers the trusted Fly-Client-IP header over a spoofable x-forwarded-for", () => {
    const ip = clientIpFromRequest({
      headers: {
        "fly-client-ip": "203.0.113.9",
        "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      },
      ip: "10.0.0.99",
    });
    expect(ip).toBe("203.0.113.9");
  });

  it("falls back to the first x-forwarded-for hop when Fly-Client-IP is absent", () => {
    const ip = clientIpFromRequest({
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" },
      ip: "10.0.0.99",
    });
    expect(ip).toBe("203.0.113.7");
  });

  it("handles x-forwarded-for given as an array", () => {
    const ip = clientIpFromRequest({
      headers: { "x-forwarded-for": ["198.51.100.5", "10.0.0.1"] },
    });
    expect(ip).toBe("198.51.100.5");
  });

  it("falls back to req.ip when there is no forwarded header", () => {
    const ip = clientIpFromRequest({ headers: {}, ip: "192.0.2.4" });
    expect(ip).toBe("192.0.2.4");
  });

  it("falls back to the socket remote address", () => {
    const ip = clientIpFromRequest({ headers: {}, socket: { remoteAddress: "192.0.2.55" } });
    expect(ip).toBe("192.0.2.55");
  });

  it("returns 'unknown' when no source is available", () => {
    expect(clientIpFromRequest({})).toBe("unknown");
  });
});
