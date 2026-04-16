# Feedback SDK

`@annix/feedback-sdk` is the framework-neutral feedback transport layer for Annix.

It provides:

- feedback submission
- attachment upload
- feedback status retrieval
- host-provided auth integration

The SDK is intentionally UI-free. React, plain browser JavaScript, Angular, Vue, React Native, and native wrappers should sit on top of this contract instead of reimplementing the HTTP flow separately.

## Public contract

Submission uses:

- `POST /feedback`
- multipart form data
- authenticated via host-provided headers or cookies

Status retrieval uses:

- `GET /feedback/:id/status`
- authenticated via host-provided headers or cookies

## Host responsibilities

The host integration provides:

- auth headers or cookie-based auth configuration
- app context
- page URL / capture URL
- optional preview-user override
- optional screenshot capture
- optional extra attachments

## Example

```ts
import { createFeedbackClient } from "@annix/feedback-sdk";

const client = createFeedbackClient({
  apiBaseUrl: "https://example.com/api",
  resolveAuth: () => ({
    headers: { Authorization: "Bearer token" },
  }),
});

const result = await client.submitFeedback({
  authContext: "admin",
  payload: {
    content: "The totals are wrong on this page",
    source: "text",
    pageUrl: "/admin/portal/orders/12",
    appContext: "admin",
  },
});

const status = await client.getFeedbackStatus({
  authContext: "admin",
  feedbackId: result.id,
});
```
