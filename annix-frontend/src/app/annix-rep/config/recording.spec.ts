import { describe, expect, it } from "vitest";
import {
  RECORDING_CHANNELS,
  RECORDING_CHUNK_INTERVAL_MS,
  RECORDING_MIME_TYPE,
  RECORDING_SAMPLE_RATE,
} from "./recording";

describe("recording constants", () => {
  it("should have RECORDING_SAMPLE_RATE of 16000", () => {
    expect(RECORDING_SAMPLE_RATE).toBe(16000);
  });

  it("should have RECORDING_CHANNELS of 1", () => {
    expect(RECORDING_CHANNELS).toBe(1);
  });

  it("should have RECORDING_CHUNK_INTERVAL_MS of 5000", () => {
    expect(RECORDING_CHUNK_INTERVAL_MS).toBe(5000);
  });

  it("should have RECORDING_MIME_TYPE that includes audio/webm", () => {
    expect(RECORDING_MIME_TYPE).toContain("audio/webm");
  });
});
