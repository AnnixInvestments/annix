# FieldFlow API Documentation

This document describes the FieldFlow API for building integrations and custom workflows.

## Overview

The FieldFlow API is a RESTful API that allows you to:
- Manage prospects programmatically
- Create and update meetings
- Retrieve analytics data
- Sync with external systems

## Base URL

```
Production: https://api.annix.co.za/fieldflow/v1
```

## Authentication

All API requests require authentication using a Bearer token.

### Obtaining an API Token

1. Log in to FieldFlow
2. Go to **Settings → API**
3. Click **Generate API Token**
4. Copy and store the token securely

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer your_api_token_here
```

### Token Security

- Tokens don't expire but can be revoked
- Store tokens securely (use environment variables)
- Never commit tokens to source control
- One token per integration recommended

## Rate Limits

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Standard | 60 | 10,000 |
| Premium | 300 | 100,000 |

Rate limit headers:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1699920000
```

## API Endpoints

### Prospects

#### List Prospects

```http
GET /prospects
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (new, contacted, qualified, proposal, won, lost) |
| limit | integer | Results per page (default: 50, max: 100) |
| offset | integer | Pagination offset |
| search | string | Search term |

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "companyName": "ABC Corporation",
      "contactName": "John Smith",
      "contactEmail": "john@abc.com",
      "contactPhone": "+27821234567",
      "status": "qualified",
      "priority": "high",
      "estimatedValue": 50000,
      "latitude": -26.2041,
      "longitude": 28.0473,
      "city": "Johannesburg",
      "province": "Gauteng",
      "tags": ["manufacturing", "pumps"],
      "createdAt": "2024-01-15T08:30:00Z",
      "updatedAt": "2024-01-20T14:22:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0
  }
}
```

#### Get Prospect

```http
GET /prospects/{id}
```

**Response:**
```json
{
  "id": 123,
  "companyName": "ABC Corporation",
  "contactName": "John Smith",
  "contactEmail": "john@abc.com",
  "contactPhone": "+27821234567",
  "contactTitle": "Procurement Manager",
  "status": "qualified",
  "priority": "high",
  "estimatedValue": 50000,
  "streetAddress": "123 Main Road",
  "city": "Johannesburg",
  "province": "Gauteng",
  "postalCode": "2000",
  "latitude": -26.2041,
  "longitude": 28.0473,
  "tags": ["manufacturing", "pumps"],
  "notes": "Met at trade show",
  "customFields": {
    "industry": "Mining",
    "employees": "50-100"
  },
  "createdAt": "2024-01-15T08:30:00Z",
  "updatedAt": "2024-01-20T14:22:00Z"
}
```

#### Create Prospect

```http
POST /prospects
```

**Request Body:**
```json
{
  "companyName": "XYZ Ltd",
  "contactName": "Jane Doe",
  "contactEmail": "jane@xyz.co.za",
  "contactPhone": "+27839876543",
  "status": "new",
  "priority": "medium",
  "city": "Cape Town",
  "province": "Western Cape",
  "tags": ["IT", "software"]
}
```

**Response:** `201 Created`
```json
{
  "id": 124,
  "companyName": "XYZ Ltd",
  ...
}
```

#### Update Prospect

```http
PATCH /prospects/{id}
```

**Request Body:**
```json
{
  "status": "contacted",
  "notes": "Had initial call, interested in pumps"
}
```

**Response:** `200 OK`

#### Delete Prospect

```http
DELETE /prospects/{id}
```

**Response:** `204 No Content`

#### Bulk Update Status

```http
POST /prospects/bulk/status
```

**Request Body:**
```json
{
  "ids": [123, 124, 125],
  "status": "contacted"
}
```

### Meetings

#### List Meetings

```http
GET /meetings
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |
| startDate | string | ISO date (from) |
| endDate | string | ISO date (to) |
| prospectId | integer | Filter by prospect |

**Response:**
```json
{
  "data": [
    {
      "id": 456,
      "title": "Product Demo",
      "meetingType": "in_person",
      "status": "scheduled",
      "scheduledStart": "2024-01-25T10:00:00Z",
      "scheduledEnd": "2024-01-25T11:00:00Z",
      "location": "Client Office",
      "prospect": {
        "id": 123,
        "companyName": "ABC Corporation"
      }
    }
  ]
}
```

#### Create Meeting

```http
POST /meetings
```

**Request Body:**
```json
{
  "title": "Follow-up Discussion",
  "meetingType": "phone",
  "scheduledStart": "2024-01-26T14:00:00Z",
  "scheduledEnd": "2024-01-26T14:30:00Z",
  "prospectId": 123,
  "description": "Discuss proposal details"
}
```

#### Update Meeting

```http
PATCH /meetings/{id}
```

#### Cancel Meeting

```http
POST /meetings/{id}/cancel
```

#### Get Meeting Transcript

```http
GET /meetings/{id}/transcript
```

**Response:**
```json
{
  "meetingId": 456,
  "segments": [
    {
      "speaker": "Rep",
      "text": "Thanks for meeting with me today.",
      "startTime": 0,
      "endTime": 2.5
    },
    {
      "speaker": "Client",
      "text": "My pleasure. Let's discuss the proposal.",
      "startTime": 2.8,
      "endTime": 5.2
    }
  ]
}
```

#### Get Meeting Summary

```http
GET /meetings/{id}/summary
```

### Analytics

#### Get Dashboard Stats

```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "meetingsThisWeek": 8,
  "meetingsThisMonth": 24,
  "prospectsActive": 45,
  "pipelineValue": 850000,
  "conversionRate": 0.32
}
```

#### Get Prospect Funnel

```http
GET /analytics/funnel
```

**Response:**
```json
{
  "stages": [
    { "status": "new", "count": 25 },
    { "status": "contacted", "count": 18 },
    { "status": "qualified", "count": 12 },
    { "status": "proposal", "count": 8 },
    { "status": "won", "count": 5 },
    { "status": "lost", "count": 3 }
  ]
}
```

### Webhooks

Configure webhooks to receive real-time notifications.

#### Webhook Events

| Event | Description |
|-------|-------------|
| prospect.created | New prospect added |
| prospect.updated | Prospect modified |
| prospect.status_changed | Status changed |
| meeting.created | Meeting scheduled |
| meeting.completed | Meeting finished |
| meeting.cancelled | Meeting cancelled |

#### Webhook Payload

```json
{
  "event": "prospect.status_changed",
  "timestamp": "2024-01-20T14:22:00Z",
  "data": {
    "id": 123,
    "previousStatus": "new",
    "newStatus": "contacted",
    "companyName": "ABC Corporation"
  }
}
```

#### Register Webhook

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-system.com/fieldflow-webhook",
  "events": ["prospect.created", "meeting.completed"],
  "secret": "your_webhook_secret"
}
```

### Custom Fields

#### List Custom Fields

```http
GET /custom-fields
```

#### Create Custom Field

```http
POST /custom-fields
```

**Request Body:**
```json
{
  "name": "Industry Sector",
  "fieldType": "dropdown",
  "options": ["Mining", "Manufacturing", "IT", "Retail"],
  "required": false
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "contactEmail",
      "value": "invalid-email"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource doesn't exist |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Pagination

All list endpoints support pagination:

```http
GET /prospects?limit=25&offset=50
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 156,
    "limit": 25,
    "offset": 50,
    "hasMore": true
  }
}
```

## Filtering and Sorting

### Filtering

Use query parameters:
```http
GET /prospects?status=qualified&priority=high
```

### Sorting

```http
GET /prospects?sort=createdAt&order=desc
```

## SDKs and Libraries

Official SDKs coming soon for:
- JavaScript/TypeScript
- Python
- C#

## Testing

Use the sandbox environment for testing:
```
Sandbox: https://sandbox.annix.co.za/fieldflow/v1
```

Sandbox data is reset weekly.

## Support

For API support:
- Email: api-support@annix.co.za
- Documentation updates: Check this page regularly

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial release |

## Related Guides

- [CRM Integration Guide](./CRM_INTEGRATION_GUIDE.md)
- [Setup Guide](./SETUP_GUIDE.md)
