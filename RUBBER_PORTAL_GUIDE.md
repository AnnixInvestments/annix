# Rubber Portal Migration Guide

This document maps the Firebase-hosted portal pages to their equivalents in the new Annix system.

## URL Mapping

| Firebase URL | New Route | Local Access |
|--------------|-----------|--------------|
| `/prices` | `/pricing` | `http://localhost:3000/pricing` |
| `/products/compound` | `/admin/portal/rubber/codings` | `http://localhost:3000/admin/portal/rubber/codings` |

## Rubber Portal Pages

All rubber portal pages are under the admin portal at `/admin/portal/rubber`.

| Page | Route | Local Access |
|------|-------|--------------|
| Dashboard | `/admin/portal/rubber` | `http://localhost:3000/admin/portal/rubber` |
| Orders List | `/admin/portal/rubber/orders` | `http://localhost:3000/admin/portal/rubber/orders` |
| Order Details | `/admin/portal/rubber/orders/[id]` | `http://localhost:3000/admin/portal/rubber/orders/{orderId}` |
| Companies | `/admin/portal/rubber/companies` | `http://localhost:3000/admin/portal/rubber/companies` |
| Products | `/admin/portal/rubber/products` | `http://localhost:3000/admin/portal/rubber/products` |
| Product Codings | `/admin/portal/rubber/codings` | `http://localhost:3000/admin/portal/rubber/codings` |
| Pricing Tiers | `/admin/portal/rubber/pricing-tiers` | `http://localhost:3000/admin/portal/rubber/pricing-tiers` |

## Calloff Request Details

The "Calloff Request Details" feature is part of the **Order Details page** at:
- Route: `/admin/portal/rubber/orders/[id]`
- Local: `http://localhost:3000/admin/portal/rubber/orders/{orderId}`

### What is a Calloff?

A Calloff tracks partial fulfillment/delivery events of order items. Each order item can have multiple calloffs that track:
- `quantity`: The quantity being called off
- `quantityRemaining`: Remaining quantity after this calloff
- `events`: Array of timestamped status updates

The Calloff Request Details section in the order page allows you to:
1. View existing calloffs for each line item
2. Add new calloffs to track partial deliveries
3. Track the remaining quantity for each order item

## Product Codings

The Product Codings page manages product attribute codes with tabs for each coding type:

| Type | Description |
|------|-------------|
| `COMPOUND` | Rubber compounds (e.g. NR, SBR, EPDM) |
| `COLOUR` | Product colours |
| `TYPE` | Rubber types |
| `HARDNESS` | Hardness values (IRHD) |
| `GRADE` | Product grades (A, B, C, D) |
| `CURING_METHOD` | Vulcanization methods |

## Pricing Tiers

Pricing tiers define pricing multipliers for companies:
- 100% = standard pricing
- Below 100% = discount (e.g. 90% = 10% discount)
- Above 100% = markup (e.g. 110% = 10% markup)

## Order Statuses

| Value | Label |
|-------|-------|
| -1 | New |
| 0 | Draft |
| 1 | Cancelled |
| 2 | Partially Submitted |
| 3 | Submitted |
| 4 | Manufacturing |
| 5 | Delivering |
| 6 | Complete |

## Running Locally

1. Start the backend:
   ```bash
   cd annix-backend
   pnpm run start:dev
   ```

2. Start the frontend:
   ```bash
   cd annix-frontend
   pnpm run dev
   ```

3. Access the rubber portal at `http://localhost:3000/admin/portal/rubber`
