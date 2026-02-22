import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as bcrypt from "bcrypt";
import Database from "better-sqlite3";

const SALT_ROUNDS = 12;

let db: Database.Database | null = null;

function dbPath(): string {
  return join(homedir(), ".voice-filter", "users.db");
}

export function initDatabase(): void {
  const dir = join(homedir(), ".voice-filter");
  mkdirSync(dir, { recursive: true });

  db = new Database(dbPath());
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      oauth_provider TEXT DEFAULT NULL,
      oauth_id TEXT DEFAULT NULL,
      oauth_tokens TEXT DEFAULT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      external_event_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      location TEXT,
      meeting_url TEXT,
      attendees TEXT,
      organizer_email TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurrence_rule TEXT,
      status TEXT DEFAULT 'confirmed',
      raw_data TEXT,
      synced_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, provider, external_event_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS meeting_calendar_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_session_id TEXT NOT NULL UNIQUE,
      calendar_event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_sync_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      sync_token TEXT,
      last_sync_at TEXT,
      next_sync_at TEXT,
      status TEXT DEFAULT 'idle',
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, provider)
    )
  `);

  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const columnNames = columns.map((c) => c.name);

  if (!columnNames.includes("oauth_provider")) {
    db.exec("ALTER TABLE users ADD COLUMN oauth_provider TEXT DEFAULT NULL");
  }
  if (!columnNames.includes("oauth_id")) {
    db.exec("ALTER TABLE users ADD COLUMN oauth_id TEXT DEFAULT NULL");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS post_meeting_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      calendar_event_id INTEGER NOT NULL,
      meeting_session_id TEXT,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      scheduled_end_time TEXT NOT NULL,
      actual_end_time TEXT,
      recording_url TEXT,
      recording_path TEXT,
      transcript_path TEXT,
      summary_path TEXT,
      email_sent_at TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id),
      UNIQUE(user_id, calendar_event_id)
    )
  `);
}

function ensureDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export interface User {
  id: number;
  email: string;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  oauth_tokens: string | null;
  created_at: string;
}

export type CalendarProvider = "google" | "microsoft" | "zoom";

export interface CalendarEventAttendee {
  email: string;
  name: string | null;
  responseStatus: "accepted" | "declined" | "tentative" | "needsAction";
}

export interface CalendarEvent {
  id: number;
  user_id: number;
  provider: CalendarProvider;
  external_event_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  location: string | null;
  meeting_url: string | null;
  attendees: string | null;
  organizer_email: string | null;
  is_recurring: number;
  recurrence_rule: string | null;
  status: string;
  raw_data: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingCalendarLink {
  id: number;
  meeting_session_id: string;
  calendar_event_id: number;
  user_id: number;
  created_at: string;
}

export interface CalendarSyncState {
  id: number;
  user_id: number;
  provider: CalendarProvider;
  sync_token: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  status: "idle" | "syncing" | "error";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export async function createUser(email: string, password: string): Promise<User> {
  const database = ensureDb();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date().toISOString();

  const stmt = database.prepare(
    "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
  );
  const result = stmt.run(email.toLowerCase(), hash, now);

  return {
    id: result.lastInsertRowid as number,
    email: email.toLowerCase(),
    password_hash: hash,
    oauth_provider: null,
    oauth_id: null,
    oauth_tokens: null,
    created_at: now,
  };
}

export function findUserByEmail(email: string): User | null {
  const database = ensureDb();
  const stmt = database.prepare("SELECT * FROM users WHERE email = ?");
  const row = stmt.get(email.toLowerCase()) as User | undefined;
  return row ?? null;
}

export function findUserById(id: number): User | null {
  const database = ensureDb();
  const stmt = database.prepare("SELECT * FROM users WHERE id = ?");
  const row = stmt.get(id) as User | undefined;
  return row ?? null;
}

export function saveOAuthToken(userId: number, service: string, token: string): void {
  const database = ensureDb();
  const user = findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tokens: Record<string, string> = user.oauth_tokens ? JSON.parse(user.oauth_tokens) : {};
  tokens[service] = token;

  const stmt = database.prepare("UPDATE users SET oauth_tokens = ? WHERE id = ?");
  stmt.run(JSON.stringify(tokens), userId);
}

export function oauthTokens(userId: number): Record<string, string> {
  const user = findUserById(userId);
  if (!user || !user.oauth_tokens) {
    return {};
  }
  return JSON.parse(user.oauth_tokens);
}

export function removeOAuthToken(userId: number, service: string): void {
  const database = ensureDb();
  const user = findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const tokens: Record<string, string> = user.oauth_tokens ? JSON.parse(user.oauth_tokens) : {};
  delete tokens[service];

  const stmt = database.prepare("UPDATE users SET oauth_tokens = ? WHERE id = ?");
  stmt.run(JSON.stringify(tokens), userId);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function findUserByOAuth(provider: string, oauthId: string): User | null {
  const database = ensureDb();
  const stmt = database.prepare("SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?");
  const row = stmt.get(provider, oauthId) as User | undefined;
  return row ?? null;
}

export function createOAuthUser(
  email: string,
  provider: string,
  oauthId: string,
  accessToken: string,
  refreshToken?: string | null,
): User {
  const database = ensureDb();
  const now = new Date().toISOString();
  const tokenData: Record<string, string> = { [provider]: accessToken };
  if (refreshToken) {
    tokenData[`${provider}_refresh`] = refreshToken;
  }
  const tokens = JSON.stringify(tokenData);

  const existingByEmail = findUserByEmail(email);
  if (existingByEmail) {
    const stmt = database.prepare(
      "UPDATE users SET oauth_provider = ?, oauth_id = ?, oauth_tokens = ? WHERE id = ?",
    );
    stmt.run(provider, oauthId, tokens, existingByEmail.id);
    return {
      ...existingByEmail,
      oauth_provider: provider,
      oauth_id: oauthId,
      oauth_tokens: tokens,
    };
  }

  const stmt = database.prepare(
    "INSERT INTO users (email, oauth_provider, oauth_id, oauth_tokens, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const result = stmt.run(email.toLowerCase(), provider, oauthId, tokens, now);

  return {
    id: result.lastInsertRowid as number,
    email: email.toLowerCase(),
    password_hash: null,
    oauth_provider: provider,
    oauth_id: oauthId,
    oauth_tokens: tokens,
    created_at: now,
  };
}

export function findOrCreateOAuthUser(
  email: string,
  provider: string,
  oauthId: string,
  accessToken: string,
  refreshToken?: string | null,
): User {
  const existing = findUserByOAuth(provider, oauthId);
  if (existing) {
    saveOAuthToken(existing.id, provider, accessToken);
    if (refreshToken) {
      saveOAuthToken(existing.id, `${provider}_refresh`, refreshToken);
    }
    return existing;
  }
  return createOAuthUser(email, provider, oauthId, accessToken, refreshToken);
}

export interface CreateCalendarEventInput {
  userId: number;
  provider: CalendarProvider;
  externalEventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  location?: string;
  meetingUrl?: string;
  attendees?: CalendarEventAttendee[];
  organizerEmail?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  status?: string;
  rawData?: Record<string, unknown>;
}

export function upsertCalendarEvent(input: CreateCalendarEventInput): CalendarEvent {
  const database = ensureDb();
  const now = new Date().toISOString();

  const existing = database
    .prepare(
      "SELECT * FROM calendar_events WHERE user_id = ? AND provider = ? AND external_event_id = ?",
    )
    .get(input.userId, input.provider, input.externalEventId) as CalendarEvent | undefined;

  if (existing) {
    const stmt = database.prepare(`
      UPDATE calendar_events SET
        title = ?,
        description = ?,
        start_time = ?,
        end_time = ?,
        timezone = ?,
        location = ?,
        meeting_url = ?,
        attendees = ?,
        organizer_email = ?,
        is_recurring = ?,
        recurrence_rule = ?,
        status = ?,
        raw_data = ?,
        synced_at = ?,
        updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      input.title,
      input.description ?? null,
      input.startTime,
      input.endTime,
      input.timezone ?? "UTC",
      input.location ?? null,
      input.meetingUrl ?? null,
      input.attendees ? JSON.stringify(input.attendees) : null,
      input.organizerEmail ?? null,
      input.isRecurring ? 1 : 0,
      input.recurrenceRule ?? null,
      input.status ?? "confirmed",
      input.rawData ? JSON.stringify(input.rawData) : null,
      now,
      now,
      existing.id,
    );
    return { ...existing, updated_at: now, synced_at: now };
  }

  const stmt = database.prepare(`
    INSERT INTO calendar_events (
      user_id, provider, external_event_id, title, description,
      start_time, end_time, timezone, location, meeting_url,
      attendees, organizer_email, is_recurring, recurrence_rule,
      status, raw_data, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.userId,
    input.provider,
    input.externalEventId,
    input.title,
    input.description ?? null,
    input.startTime,
    input.endTime,
    input.timezone ?? "UTC",
    input.location ?? null,
    input.meetingUrl ?? null,
    input.attendees ? JSON.stringify(input.attendees) : null,
    input.organizerEmail ?? null,
    input.isRecurring ? 1 : 0,
    input.recurrenceRule ?? null,
    input.status ?? "confirmed",
    input.rawData ? JSON.stringify(input.rawData) : null,
    now,
    now,
    now,
  );

  return {
    id: result.lastInsertRowid as number,
    user_id: input.userId,
    provider: input.provider,
    external_event_id: input.externalEventId,
    title: input.title,
    description: input.description ?? null,
    start_time: input.startTime,
    end_time: input.endTime,
    timezone: input.timezone ?? "UTC",
    location: input.location ?? null,
    meeting_url: input.meetingUrl ?? null,
    attendees: input.attendees ? JSON.stringify(input.attendees) : null,
    organizer_email: input.organizerEmail ?? null,
    is_recurring: input.isRecurring ? 1 : 0,
    recurrence_rule: input.recurrenceRule ?? null,
    status: input.status ?? "confirmed",
    raw_data: input.rawData ? JSON.stringify(input.rawData) : null,
    synced_at: now,
    created_at: now,
    updated_at: now,
  };
}

export function calendarEventsByUser(
  userId: number,
  options?: { provider?: CalendarProvider; fromDate?: string; toDate?: string },
): CalendarEvent[] {
  const database = ensureDb();
  let query = "SELECT * FROM calendar_events WHERE user_id = ?";
  const params: (number | string)[] = [userId];

  if (options?.provider) {
    query += " AND provider = ?";
    params.push(options.provider);
  }
  if (options?.fromDate) {
    query += " AND end_time >= ?";
    params.push(options.fromDate);
  }
  if (options?.toDate) {
    query += " AND start_time <= ?";
    params.push(options.toDate);
  }

  query += " ORDER BY start_time ASC";

  return database.prepare(query).all(...params) as CalendarEvent[];
}

export function calendarEventById(eventId: number): CalendarEvent | null {
  const database = ensureDb();
  const row = database.prepare("SELECT * FROM calendar_events WHERE id = ?").get(eventId) as
    | CalendarEvent
    | undefined;
  return row ?? null;
}

export function deleteCalendarEvent(eventId: number): void {
  const database = ensureDb();
  database.prepare("DELETE FROM calendar_events WHERE id = ?").run(eventId);
}

export function deleteCalendarEventsByProvider(userId: number, provider: CalendarProvider): void {
  const database = ensureDb();
  database
    .prepare("DELETE FROM calendar_events WHERE user_id = ? AND provider = ?")
    .run(userId, provider);
}

export function linkMeetingToCalendarEvent(
  meetingSessionId: string,
  calendarEventId: number,
  userId: number,
): MeetingCalendarLink {
  const database = ensureDb();
  const now = new Date().toISOString();

  const existing = database
    .prepare("SELECT * FROM meeting_calendar_links WHERE meeting_session_id = ?")
    .get(meetingSessionId) as MeetingCalendarLink | undefined;

  if (existing) {
    database
      .prepare("UPDATE meeting_calendar_links SET calendar_event_id = ? WHERE id = ?")
      .run(calendarEventId, existing.id);
    return { ...existing, calendar_event_id: calendarEventId };
  }

  const stmt = database.prepare(`
    INSERT INTO meeting_calendar_links (meeting_session_id, calendar_event_id, user_id, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(meetingSessionId, calendarEventId, userId, now);

  return {
    id: result.lastInsertRowid as number,
    meeting_session_id: meetingSessionId,
    calendar_event_id: calendarEventId,
    user_id: userId,
    created_at: now,
  };
}

export function calendarLinkByMeetingId(meetingSessionId: string): MeetingCalendarLink | null {
  const database = ensureDb();
  const row = database
    .prepare("SELECT * FROM meeting_calendar_links WHERE meeting_session_id = ?")
    .get(meetingSessionId) as MeetingCalendarLink | undefined;
  return row ?? null;
}

export function calendarEventForMeeting(meetingSessionId: string): CalendarEvent | null {
  const link = calendarLinkByMeetingId(meetingSessionId);
  if (!link) {
    return null;
  }
  return calendarEventById(link.calendar_event_id);
}

export function upsertCalendarSyncState(
  userId: number,
  provider: CalendarProvider,
  updates: Partial<Omit<CalendarSyncState, "id" | "user_id" | "provider" | "created_at">>,
): CalendarSyncState {
  const database = ensureDb();
  const now = new Date().toISOString();

  const existing = database
    .prepare("SELECT * FROM calendar_sync_state WHERE user_id = ? AND provider = ?")
    .get(userId, provider) as CalendarSyncState | undefined;

  if (existing) {
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (updates.sync_token !== undefined) {
      fields.push("sync_token = ?");
      values.push(updates.sync_token);
    }
    if (updates.last_sync_at !== undefined) {
      fields.push("last_sync_at = ?");
      values.push(updates.last_sync_at);
    }
    if (updates.next_sync_at !== undefined) {
      fields.push("next_sync_at = ?");
      values.push(updates.next_sync_at);
    }
    if (updates.status !== undefined) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.error_message !== undefined) {
      fields.push("error_message = ?");
      values.push(updates.error_message);
    }

    fields.push("updated_at = ?");
    values.push(now);
    values.push(existing.id.toString());

    database
      .prepare(`UPDATE calendar_sync_state SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values);

    return { ...existing, ...updates, updated_at: now };
  }

  const stmt = database.prepare(`
    INSERT INTO calendar_sync_state (
      user_id, provider, sync_token, last_sync_at, next_sync_at,
      status, error_message, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    userId,
    provider,
    updates.sync_token ?? null,
    updates.last_sync_at ?? null,
    updates.next_sync_at ?? null,
    updates.status ?? "idle",
    updates.error_message ?? null,
    now,
    now,
  );

  return {
    id: result.lastInsertRowid as number,
    user_id: userId,
    provider,
    sync_token: updates.sync_token ?? null,
    last_sync_at: updates.last_sync_at ?? null,
    next_sync_at: updates.next_sync_at ?? null,
    status: (updates.status as CalendarSyncState["status"]) ?? "idle",
    error_message: updates.error_message ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function calendarSyncState(
  userId: number,
  provider: CalendarProvider,
): CalendarSyncState | null {
  const database = ensureDb();
  const row = database
    .prepare("SELECT * FROM calendar_sync_state WHERE user_id = ? AND provider = ?")
    .get(userId, provider) as CalendarSyncState | undefined;
  return row ?? null;
}

export function upcomingCalendarEvents(userId: number, limit = 10): CalendarEvent[] {
  const database = ensureDb();
  const now = new Date().toISOString();
  return database
    .prepare(
      "SELECT * FROM calendar_events WHERE user_id = ? AND end_time >= ? ORDER BY start_time ASC LIMIT ?",
    )
    .all(userId, now, limit) as CalendarEvent[];
}

export type PostMeetingStatus =
  | "pending"
  | "detecting_end"
  | "fetching_recording"
  | "transcribing"
  | "generating_summary"
  | "sending_email"
  | "completed"
  | "failed"
  | "skipped";

export interface PostMeetingJob {
  id: number;
  user_id: number;
  calendar_event_id: number;
  meeting_session_id: string | null;
  provider: CalendarProvider;
  status: PostMeetingStatus;
  scheduled_end_time: string;
  actual_end_time: string | null;
  recording_url: string | null;
  recording_path: string | null;
  transcript_path: string | null;
  summary_path: string | null;
  email_sent_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePostMeetingJobInput {
  userId: number;
  calendarEventId: number;
  meetingSessionId?: string;
  provider: CalendarProvider;
  scheduledEndTime: string;
}

export function createPostMeetingJob(input: CreatePostMeetingJobInput): PostMeetingJob {
  const database = ensureDb();
  const now = new Date().toISOString();

  const existing = database
    .prepare("SELECT * FROM post_meeting_jobs WHERE user_id = ? AND calendar_event_id = ?")
    .get(input.userId, input.calendarEventId) as PostMeetingJob | undefined;

  if (existing) {
    return existing;
  }

  const stmt = database.prepare(`
    INSERT INTO post_meeting_jobs (
      user_id, calendar_event_id, meeting_session_id, provider,
      status, scheduled_end_time, retry_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, 0, ?, ?)
  `);

  const result = stmt.run(
    input.userId,
    input.calendarEventId,
    input.meetingSessionId ?? null,
    input.provider,
    input.scheduledEndTime,
    now,
    now,
  );

  return {
    id: result.lastInsertRowid as number,
    user_id: input.userId,
    calendar_event_id: input.calendarEventId,
    meeting_session_id: input.meetingSessionId ?? null,
    provider: input.provider,
    status: "pending",
    scheduled_end_time: input.scheduledEndTime,
    actual_end_time: null,
    recording_url: null,
    recording_path: null,
    transcript_path: null,
    summary_path: null,
    email_sent_at: null,
    error_message: null,
    retry_count: 0,
    created_at: now,
    updated_at: now,
  };
}

export function postMeetingJobById(jobId: number): PostMeetingJob | null {
  const database = ensureDb();
  const row = database.prepare("SELECT * FROM post_meeting_jobs WHERE id = ?").get(jobId) as
    | PostMeetingJob
    | undefined;
  return row ?? null;
}

export function postMeetingJobByCalendarEvent(
  userId: number,
  calendarEventId: number,
): PostMeetingJob | null {
  const database = ensureDb();
  const row = database
    .prepare("SELECT * FROM post_meeting_jobs WHERE user_id = ? AND calendar_event_id = ?")
    .get(userId, calendarEventId) as PostMeetingJob | undefined;
  return row ?? null;
}

export function pendingPostMeetingJobs(): PostMeetingJob[] {
  const database = ensureDb();
  const now = new Date().toISOString();
  return database
    .prepare(
      `SELECT * FROM post_meeting_jobs
       WHERE status IN ('pending', 'detecting_end')
       AND scheduled_end_time <= ?
       ORDER BY scheduled_end_time ASC`,
    )
    .all(now) as PostMeetingJob[];
}

export function activePostMeetingJobs(): PostMeetingJob[] {
  const database = ensureDb();
  return database
    .prepare(
      `SELECT * FROM post_meeting_jobs
       WHERE status IN ('fetching_recording', 'transcribing', 'generating_summary', 'sending_email')
       ORDER BY updated_at ASC`,
    )
    .all() as PostMeetingJob[];
}

export function postMeetingJobsByUser(
  userId: number,
  options?: { status?: PostMeetingStatus; limit?: number },
): PostMeetingJob[] {
  const database = ensureDb();
  let query = "SELECT * FROM post_meeting_jobs WHERE user_id = ?";
  const params: (number | string)[] = [userId];

  if (options?.status) {
    query += " AND status = ?";
    params.push(options.status);
  }

  query += " ORDER BY created_at DESC";

  if (options?.limit) {
    query += " LIMIT ?";
    params.push(options.limit);
  }

  return database.prepare(query).all(...params) as PostMeetingJob[];
}

export function updatePostMeetingJob(
  jobId: number,
  updates: Partial<
    Omit<PostMeetingJob, "id" | "user_id" | "calendar_event_id" | "created_at" | "provider">
  >,
): PostMeetingJob | null {
  const database = ensureDb();
  const now = new Date().toISOString();

  const existing = postMeetingJobById(jobId);
  if (!existing) {
    return null;
  }

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.meeting_session_id !== undefined) {
    fields.push("meeting_session_id = ?");
    values.push(updates.meeting_session_id);
  }
  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.actual_end_time !== undefined) {
    fields.push("actual_end_time = ?");
    values.push(updates.actual_end_time);
  }
  if (updates.recording_url !== undefined) {
    fields.push("recording_url = ?");
    values.push(updates.recording_url);
  }
  if (updates.recording_path !== undefined) {
    fields.push("recording_path = ?");
    values.push(updates.recording_path);
  }
  if (updates.transcript_path !== undefined) {
    fields.push("transcript_path = ?");
    values.push(updates.transcript_path);
  }
  if (updates.summary_path !== undefined) {
    fields.push("summary_path = ?");
    values.push(updates.summary_path);
  }
  if (updates.email_sent_at !== undefined) {
    fields.push("email_sent_at = ?");
    values.push(updates.email_sent_at);
  }
  if (updates.error_message !== undefined) {
    fields.push("error_message = ?");
    values.push(updates.error_message);
  }
  if (updates.retry_count !== undefined) {
    fields.push("retry_count = ?");
    values.push(updates.retry_count);
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(jobId);

  database.prepare(`UPDATE post_meeting_jobs SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return postMeetingJobById(jobId);
}

export function incrementPostMeetingJobRetry(jobId: number): PostMeetingJob | null {
  const database = ensureDb();
  const now = new Date().toISOString();

  database
    .prepare("UPDATE post_meeting_jobs SET retry_count = retry_count + 1, updated_at = ? WHERE id = ?")
    .run(now, jobId);

  return postMeetingJobById(jobId);
}

export function deletePostMeetingJob(jobId: number): void {
  const database = ensureDb();
  database.prepare("DELETE FROM post_meeting_jobs WHERE id = ?").run(jobId);
}
