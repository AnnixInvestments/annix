export const SCREENSHOT_EXCLUDE_ATTRIBUTE = "data-screenshot-exclude";

export const SCREENSHOT_EXCLUDE_SELECTOR = `[${SCREENSHOT_EXCLUDE_ATTRIBUTE}]`;

export const screenshotExcludeProps = { [SCREENSHOT_EXCLUDE_ATTRIBUTE]: "true" } as const;
