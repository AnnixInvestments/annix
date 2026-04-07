## Scheduled Jobs & Background Processes

Complete reference for all background cron jobs, their external service connections, and the Neon database processes.

### Architecture

- **Runtime**: Single Fly.io app (`annix-app`, region `jnb`)
- **Database**: Neon PostgreSQL (single project, single branch)
  - Pool: 5 max connections, 10s idle timeout, 30s connect timeout
  - SSL enabled in production
  - All schema changes via TypeORM migrations (synchronize: false)
- **Job Management**: Admin UI at `/admin/portal/scheduled-jobs`
  - Pause/resume, frequency overrides persisted in `scheduled_job_overrides` table
  - Dev/staging syncs settings from prod every 10 min via `SCHEDULED_JOBS_SYNC_SOURCE`

---

### Neon Compute Optimization

**Problem**: At current usage, projected 120 compute hours/month against 100 free hours.

#### Changes Made (2026-04-04)

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| Connection pool max | 25 | 5 | Fewer idle connections keeping compute awake |
| Idle timeout (data-source.ts) | 30s | 10s | Connections release faster, consistent with typeorm.ts |
| Query logging | ON for all non-production | OFF unless TYPEORM_LOGGING=true | Eliminates query overhead in dev/staging hitting prod DB |

#### What Keeps Neon Compute Active

Neon compute charges for time the endpoint is active (has open connections). The endpoint auto-suspends after ~5 minutes of no connections.

**Frequent wake-ups (every 10 min):**
- `scheduled-jobs:sync-from-prod` - syncs job settings from production
- `inbound-email:poll-all` - polls IMAP accounts
- `cv-assistant:poll-emails` - polls for CV submissions
- `au-rubber:poll-emails` - polls for CoCs/delivery notes

These 4 jobs ensure the compute never stays suspended for more than 10 minutes, meaning:
- **Best case**: Compute active ~2 min per 10-min cycle = ~288 min/day = ~144 hours/month
- **Worst case**: Compute never suspends = 720 hours/month

#### Recommendations for Further Reduction

1. **Pause unused module jobs** - If FieldFlow, CV Assistant, or Comply SA are not actively used, pause their jobs via Admin UI. Each paused 10-min job saves ~14 hours/month of compute.
2. **Increase polling intervals** - Change 10-min email polls to 30 min if near-realtime is not needed. This gives the compute 20-min gaps to suspend.
3. **Disable sync-from-prod on production** - This job syncs settings FROM prod TO itself on the prod instance, which is redundant. Set SCHEDULED_JOBS_SYNC_SOURCE to empty on prod.
4. **Check Neon auto-suspend timeout** - In Neon dashboard, verify the suspend delay is set to minimum (300s / 5 min). A longer delay means more billable time after the last connection closes.
5. **Consider Neon serverless driver** - @neondatabase/serverless uses HTTP for queries instead of persistent TCP connections. Queries complete and connections close immediately, allowing faster compute suspension.

---

### All Scheduled Jobs (27 Total)

#### Stock Control
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| stock-control:calibration-expiry | Check calibration cert expiry, send notifications | Daily 8am | Neon DB, Email, Web Push |
| stock-control:uninvoiced-arrivals | Check CPO arrivals without matching invoices | Daily 8am | Neon DB |

#### AU Rubber
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| au-rubber:poll-emails | Poll IMAP for CoCs, invoices, delivery notes | Every 10 min | IMAP, S3, Gemini AI |

#### Inbound Email
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| inbound-email:poll-all | Poll all configured inbound email accounts | Every 10 min | IMAP, S3, AI classification |

#### Comply SA
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| comply-sa:regulatory-sync | Scrape government sources for regulatory updates | Daily 5am | HTTP, Gemini AI |
| comply-sa:deadline-notifications | Send compliance deadline reminders | Daily 6am | Neon DB, Email, Twilio |
| comply-sa:document-expiry | Check document expiry and send warnings | Daily 7am | Neon DB, Email |
| comply-sa:data-retention-cleanup | Monthly POPIA cleanup | 3am 1st of month | Neon DB |

#### Customers
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| customers:bee-expiry-check | Check B-BEE certificate expiry | Daily 8am | Neon DB, Email |

#### CV Assistant
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| cv-assistant:poll-emails | Poll IMAP for CV submissions | Every 10 min | IMAP, S3 |
| cv-assistant:poll-job-sources | Ingest jobs from Adzuna API | Every hour | Adzuna API |
| cv-assistant:weekly-digests | Send weekly candidate digest to recruiters | Sunday midnight | Email |
| cv-assistant:job-alerts | Send daily job alert emails to candidates | Daily 9am | Email, Web Push |
| cv-assistant:purge-inactive | POPIA purge of inactive candidates | Daily 2am | Neon DB, S3 |

#### FieldFlow / Annix Rep
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| fieldflow:sync-meetings | Sync completed meetings from calendar providers | Every 30 min | Google Calendar, Microsoft 365 |
| fieldflow:download-recordings | Download pending meeting recordings | Every 30 min | Zoom, Teams, S3 |
| fieldflow:refresh-tokens | Refresh expiring OAuth tokens | Every hour | OAuth providers |
| fieldflow:weekly-full-sync | Full 30-day lookback sync (Sunday only) | Daily 2am (Sun) | Calendar APIs |
| fieldflow:cleanup-old-records | Clean up old meeting/recording records | Daily 3am | None (placeholder) |
| fieldflow:daily-reminders | Send daily follow-up reminder emails | Daily 8am | Email |
| fieldflow:crm-sync | Sync CRM data (Salesforce, HubSpot, Pipedrive) | Every 30 min | CRM APIs |
| fieldflow:calendar-sync | Sync active calendar connections, detect conflicts | Every 30 min | Calendar APIs |

#### Secure Documents
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| secure-docs:cleanup-deleted | Permanently delete soft-deleted folders | Daily 2am | Neon DB, S3 |

#### Admin
| Job Key | Description | Default Frequency | External Services |
|---------|-------------|-------------------|-------------------|
| scheduled-jobs:sync-from-prod | Sync job settings from production server | Every 10 min | HTTP to prod API |

---

### External Service Connections

#### Neon PostgreSQL
- Single project, single branch
- Connection pool: 5 max, SSL in production
- All jobs read/write to the same database
- Migrations run on deploy via Fly.io release command

#### Email Servers (IMAP)
- **AU Rubber**: da01.ondedicatedhosting.co.za:993 (TLS)
- **Inbound Email**: Configurable per InboundEmailConfig entity
- **CV Assistant**: Configurable per CvAssistantCompany entity
- All poll every 10 minutes

#### AI Services
- **Gemini** (primary): Document classification, regulatory extraction, email processing
- Used by: AU Rubber, Comply SA, Inbound Email

#### Cloud Storage (AWS S3)
- Single bucket: annix-sync-files-production
- Prefixes: annix-app/, au-rubber/, fieldflow/, cv-assistant/, stock-control/, secure-documents/

#### Notification Channels
- **Email**: SMTP via EmailService / CompanyEmailService
- **Web Push**: VAPID-based browser notifications
- **Twilio**: SMS + WhatsApp (optional, Comply SA only)

#### External APIs
- **Sage Accounting**: Rate-limited (100/min, 2500/day) via sageRateLimiter
- **Adzuna**: Job listing ingestion (CV Assistant)
- **Calendar**: Google Calendar, Microsoft 365/Outlook
- **CRM**: Salesforce, HubSpot, Pipedrive
- **Recording**: Zoom, Microsoft Teams

---

### Key Files

**Job Definitions**: src/stock-control/, src/rubber-lining/, src/comply-sa/, src/cv-assistant/, src/annix-rep/, src/customer/, src/inbound-email/, src/secure-documents/

**Management System**:
- src/admin/admin-scheduled-jobs.service.ts - Job registry, pause/resume, frequency overrides
- src/admin/admin-scheduled-jobs.controller.ts - REST API endpoints
- src/admin/entities/scheduled-job-override.entity.ts - Persistence entity

**Database Config**: src/config/typeorm.ts, src/config/data-source.ts

**Deployment**: fly.toml (single machine, jnb region, 1 shared CPU, 1GB RAM)

### Notes

- No multi-instance job locking - relies on Fly.io single machine
- fieldflow:cleanup-old-records is a no-op placeholder
- All times default to Africa/Johannesburg timezone
- Comply SA jobs use explicit TZ in cron; others use NestJS CronExpression constants

---

### Neon Compute Tracking Log

Track CU-hours over time to validate the impact of each optimization.

| Timestamp (SAST) | CU-hrs | Delta | Period | Rate (CU-hrs/day) | Projected Month | Notes |
|------------------|--------|-------|--------|-------------------|-----------------|-------|
| 2026-04-04 14:41 | 16.61 | - | since Apr 1 | ~4.15 | ~124 | Baseline — before any optimizations (pool=25, 10-min polls) |
| 2026-04-05 08:23 | 20.96 | +4.35 | ~18 hrs | ~5.8 | ~174 | Post pool reduction (pool=5), post 30-min defaults. Hourly migration deployed ~08:00 (23 min before reading) — impact not yet visible |
| 2026-04-05 13:46 | 21.52 | +0.56 | ~5h 23m | ~2.5 | ~75 | Low rate was a Neon metric-delay artifact (~1 hour lag) showing pre-migration data — not a true reading |
| 2026-04-05 20:42 | 23.13 | +1.61 | ~6h 56m | **~5.6** | **~167** | Corrected rate after full metric settlement. Improvement vs ~5.8 baseline is smaller than hoped — target NOT yet achieved |
| 2026-04-06 06:32 | 25.59 | +2.46 | ~9h 50m | **~6.0** | **~180** | Still on hourly polling (2-hour migration push failed). Full-day avg from 08:23 Apr 5 → 06:32 Apr 6 = ~5.0/day |
| 2026-04-06 16:34 | 28.11 | +2.52 | ~10h 2m | **~6.0** | **~180** | 2-hour migration deployed earlier today. Also changed sync-from-prod to every 6 hours and confirmed most jobs paused |
| 2026-04-07 08:25 | 29.66 | +1.55 | ~15h 45m | **~2.4** | **~72** | First full overnight window with 2-hour polling + 6-hour sync. **Target achieved.** |

**Status: TARGET ACHIEVED**
- Rate: ~2.4 CU-hrs/day → ~72 CU-hrs/month projected (well under 100-hour free tier)
- Key changes that made the difference: 2-hour polling intervals, sync-from-prod every 6 hours, unused module jobs paused
- Continue monitoring weekly to ensure rate stays stable

**Hourly override migration** (deployed 2026-04-05 ~06:00 UTC): `SeedHourlyPollingOverrides1815100000000` seeds DB overrides setting these 7 jobs to `0 * * * *`:
- fieldflow:sync-meetings, fieldflow:download-recordings, fieldflow:crm-sync, fieldflow:calendar-sync
- cv-assistant:poll-emails, inbound-email:poll-all, au-rubber:poll-emails

**Consolidated schedule migration** (pending deploy): `SeedConsolidatedSchedule1815200000000`:
- Polling jobs → every 2 hours (`0 */2 * * *`): sync-meetings, download-recordings, crm-sync, calendar-sync, cv-assistant:poll-emails, cv-assistant:poll-job-sources, inbound-email:poll-all, au-rubber:poll-emails
- Morning cluster → all at 8am: comply-sa (regulatory/deadline/document-expiry), stock-control (calibration/uninvoiced), customers:bee-expiry, fieldflow:daily-reminders, cv-assistant:job-alerts
- Nightly cluster → all at 2am: cv-assistant:purge-inactive, secure-docs:cleanup-deleted, fieldflow:weekly-full-sync, fieldflow:cleanup-old-records




