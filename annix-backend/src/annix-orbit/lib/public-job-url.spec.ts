import { orbitPublicBaseUrl, orbitPublicJobUrl } from "./public-job-url";

describe("orbit public job URL", () => {
  const original = process.env.ORBIT_PUBLIC_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.ORBIT_PUBLIC_URL;
    else process.env.ORBIT_PUBLIC_URL = original;
  });

  it("defaults to the Orbit prod host with the canonical /jobs/{ref} path", () => {
    delete process.env.ORBIT_PUBLIC_URL;
    expect(orbitPublicBaseUrl()).toBe("https://orbit.annix.co.za");
    expect(orbitPublicJobUrl("JOB-ABC123")).toBe("https://orbit.annix.co.za/jobs/JOB-ABC123");
  });

  it("honours the ORBIT_PUBLIC_URL override and strips trailing slashes", () => {
    process.env.ORBIT_PUBLIC_URL = "https://cv.staging.annix.co.za/";
    expect(orbitPublicJobUrl("JOB-X")).toBe("https://cv.staging.annix.co.za/jobs/JOB-X");
  });
});
