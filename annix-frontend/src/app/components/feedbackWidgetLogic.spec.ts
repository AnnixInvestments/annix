import { describe, expect, it } from "vitest";
import {
  contentValidationMessage,
  displayContent,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  isFileAllowed,
  isSubmitDisabled,
  MAX_ATTACHMENTS,
  remainingAttachmentSlots,
} from "./feedbackWidgetLogic";

describe("isSubmitDisabled", () => {
  it("returns true when content is empty", () => {
    expect(isSubmitDisabled("", false, false)).toBe(true);
  });

  it("returns true when content is only whitespace", () => {
    expect(isSubmitDisabled("   ", false, false)).toBe(true);
    expect(isSubmitDisabled("\n\t", false, false)).toBe(true);
  });

  it("returns true when content is shorter than minimum length", () => {
    expect(isSubmitDisabled("too short", false, false)).toBe(true);
    expect(isSubmitDisabled("123456789", false, false)).toBe(true);
  });

  it("returns false when content meets minimum length", () => {
    expect(isSubmitDisabled("1234567890", false, false)).toBe(false);
    expect(isSubmitDisabled("This is valid feedback text", false, false)).toBe(false);
  });

  it("returns true when isSubmitting is true even with valid content", () => {
    expect(isSubmitDisabled("This is valid feedback", true, false)).toBe(true);
  });

  it("returns true when isListening is true even with valid content", () => {
    expect(isSubmitDisabled("This is valid feedback", false, true)).toBe(true);
  });

  it("returns true when both isSubmitting and isListening are true", () => {
    expect(isSubmitDisabled("This is valid feedback", true, true)).toBe(true);
  });

  it("handles exactly 10 characters (boundary)", () => {
    expect(isSubmitDisabled("1234567890", false, false)).toBe(false);
  });

  it("handles 9 characters (just under boundary)", () => {
    expect(isSubmitDisabled("123456789", false, false)).toBe(true);
  });

  it("allows long content", () => {
    const longContent = "A".repeat(5000);
    expect(isSubmitDisabled(longContent, false, false)).toBe(false);
  });

  it("trims content for empty check but uses raw length for min check", () => {
    expect(isSubmitDisabled("  abc  ", false, false)).toBe(true);
    expect(isSubmitDisabled("  abcdefghij  ", false, false)).toBe(false);
  });

  it("handles content with newlines", () => {
    expect(isSubmitDisabled("line1\nline2\nline3", false, false)).toBe(false);
  });

  it("handles unicode content correctly", () => {
    expect(isSubmitDisabled("Testing unicode chars!", false, false)).toBe(false);
  });

  it("handles content that is all caps (Wendy-style input)", () => {
    expect(isSubmitDisabled("LINE MISSING WITH ITEM NO. AND DESCRIPTION.", false, false)).toBe(
      false,
    );
  });
});

describe("isFileAllowed", () => {
  it("allows image types", () => {
    expect(isFileAllowed("image/png")).toBe(true);
    expect(isFileAllowed("image/jpeg")).toBe(true);
    expect(isFileAllowed("image/gif")).toBe(true);
    expect(isFileAllowed("image/webp")).toBe(true);
  });

  it("allows PDF files", () => {
    expect(isFileAllowed("application/pdf")).toBe(true);
  });

  it("allows Word documents", () => {
    expect(isFileAllowed("application/msword")).toBe(true);
    expect(
      isFileAllowed("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe(true);
  });

  it("allows Excel files", () => {
    expect(isFileAllowed("application/vnd.ms-excel")).toBe(true);
    expect(isFileAllowed("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(
      true,
    );
  });

  it("rejects text files", () => {
    expect(isFileAllowed("text/plain")).toBe(false);
  });

  it("rejects video files", () => {
    expect(isFileAllowed("video/mp4")).toBe(false);
  });

  it("rejects audio files", () => {
    expect(isFileAllowed("audio/mpeg")).toBe(false);
  });

  it("rejects executables", () => {
    expect(isFileAllowed("application/x-msdownload")).toBe(false);
  });

  it("rejects zip files", () => {
    expect(isFileAllowed("application/zip")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isFileAllowed("")).toBe(false);
  });
});

describe("remainingAttachmentSlots", () => {
  it("returns max when no attachments exist", () => {
    expect(remainingAttachmentSlots(0)).toBe(MAX_ATTACHMENTS);
  });

  it("returns correct remaining count", () => {
    expect(remainingAttachmentSlots(1)).toBe(4);
    expect(remainingAttachmentSlots(3)).toBe(2);
  });

  it("returns 0 when at max", () => {
    expect(remainingAttachmentSlots(MAX_ATTACHMENTS)).toBe(0);
  });

  it("returns 0 when over max (should not happen but safe)", () => {
    expect(remainingAttachmentSlots(MAX_ATTACHMENTS + 1)).toBe(0);
  });
});

describe("displayContent", () => {
  it("returns content when not listening", () => {
    expect(displayContent("hello", "interim", false)).toBe("hello");
  });

  it("appends interim transcript when listening", () => {
    expect(displayContent("hello ", "world", true)).toBe("hello world");
  });

  it("returns just interim when content is empty and listening", () => {
    expect(displayContent("", "speaking now", true)).toBe("speaking now");
  });

  it("returns empty string when nothing available", () => {
    expect(displayContent("", "", false)).toBe("");
    expect(displayContent("", "", true)).toBe("");
  });
});

describe("contentValidationMessage", () => {
  it("returns null for empty content (no message needed yet)", () => {
    expect(contentValidationMessage("")).toBe(null);
  });

  it("returns min length message when content is too short", () => {
    expect(contentValidationMessage("hi")).toBe(`min ${FEEDBACK_MIN_LENGTH}`);
    expect(contentValidationMessage("123456789")).toBe(`min ${FEEDBACK_MIN_LENGTH}`);
  });

  it("returns null when content meets minimum length", () => {
    expect(contentValidationMessage("1234567890")).toBe(null);
  });

  it("returns null for long content", () => {
    expect(contentValidationMessage("A".repeat(100))).toBe(null);
  });
});

describe("constants", () => {
  it("has expected values", () => {
    expect(FEEDBACK_MIN_LENGTH).toBe(10);
    expect(FEEDBACK_MAX_LENGTH).toBe(5000);
    expect(MAX_ATTACHMENTS).toBe(5);
  });
});
