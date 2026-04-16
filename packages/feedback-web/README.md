# Feedback Web Embed

`@annix/feedback-web` is the plain browser adapter for the Annix feedback flow.

It is intended for:

- non-React websites
- embedded marketing or support pages
- thin wrappers in Angular or Vue where a DOM-first mount API is simpler than rebuilding transport logic

It uses `@annix/feedback-sdk` for all network behavior.

## Example

```ts
import { mountFeedbackWidget } from "@annix/feedback-web";

mountFeedbackWidget({
  apiBaseUrl: "https://example.com/api",
  authContext: "admin",
  resolveAuth: () => ({
    headers: {
      Authorization: "Bearer token",
    },
  }),
});
```

## Host hooks

The embed accepts host-provided hooks for:

- auth resolution
- app context
- submitter override
- screenshot capture

This keeps the browser adapter usable across React, Angular, Vue, server-rendered pages, and custom JavaScript shells.
