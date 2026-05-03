import { describe, expect, it } from "vitest";
import { FIXTURES } from "./fixtures";
import { aiSafeSignalsHit, isTooFluffy, validateAssignment } from "./validation";

const REQUIRED_AI_SAFE_SIGNALS = 3;

describe("quality gates — fixture set", () => {
  it("every fixture passes structural validation", () => {
    FIXTURES.forEach((fixture) => {
      const result = validateAssignment(fixture);
      if (!result.valid) {
        // Provide useful failure output if a fixture drifts
        // biome-ignore lint/suspicious/noConsole: surfaces the failing fixture during test runs
        console.error(`Fixture "${fixture.title}" failed:`, result.failures);
      }
      expect(result.valid).toBe(true);
    });
  });

  it("every fixture passes the fluffiness check", () => {
    FIXTURES.forEach((fixture) => {
      const result = isTooFluffy(fixture);
      if (!result.valid) {
        // biome-ignore lint/suspicious/noConsole: surfaces the failing fixture during test runs
        console.error(`Fixture "${fixture.title}" too fluffy:`, result.failures);
      }
      expect(result.valid).toBe(true);
    });
  });

  it("every fixture triggers at least 3 AI-safe signals", () => {
    FIXTURES.forEach((fixture) => {
      const signals = aiSafeSignalsHit(fixture);
      if (signals.length < REQUIRED_AI_SAFE_SIGNALS) {
        // biome-ignore lint/suspicious/noConsole: surfaces the failing fixture during test runs
        console.error(
          `Fixture "${fixture.title}" only triggered ${signals.length} signals:`,
          signals,
        );
      }
      expect(signals.length).toBeGreaterThanOrEqual(REQUIRED_AI_SAFE_SIGNALS);
    });
  });
});
