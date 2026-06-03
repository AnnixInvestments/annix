import { Injectable } from "@nestjs/common";
import { fromISO, fromJSDate, now } from "../../lib/datetime";
import { SeekerInterviewEvent } from "../entities/seeker-interview-event.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { SeekerInterviewEventRepository } from "../repositories/seeker-interview-event.repository";

export interface SeekerInterviewEventView {
  id: number;
  applyClickId: number | null;
  externalJobId: number | null;
  companyName: string | null;
  roleTitle: string | null;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string | null;
  locationAddress: string | null;
  notes: string | null;
  cancelledAt: string | null;
}

export interface CreateInterviewEventInput {
  applyClickId?: number | null;
  externalJobId?: number | null;
  companyName?: string | null;
  roleTitle?: string | null;
  startsAt: string;
  endsAt?: string | null;
  locationLabel?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
}

export interface UpdateInterviewEventInput {
  companyName?: string | null;
  roleTitle?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  locationLabel?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const dt = typeof value === "string" ? fromISO(value) : fromJSDate(value);
  return dt.isValid ? dt.toISO() : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const dt = fromISO(value);
  return dt.isValid ? dt.toJSDate() : null;
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class SeekerInterviewEventsService {
  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly interviewEventRepo: SeekerInterviewEventRepository,
  ) {}

  async listForSeeker(email: string | null): Promise<SeekerInterviewEventView[]> {
    if (!email) return [];
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return [];
    const events = await this.interviewEventRepo.listForCandidates(candidates.map((c) => c.id));
    return events.filter((event) => event.cancelledAt == null).map((event) => this.toView(event));
  }

  async create(
    email: string | null,
    input: CreateInterviewEventInput,
  ): Promise<SeekerInterviewEventView | null> {
    if (!email) return null;
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return null;
    const startsAt = parseDate(input.startsAt);
    if (!startsAt) return null;
    const created = await this.interviewEventRepo.create({
      candidateId: candidates[0].id,
      applyClickId: input.applyClickId ?? null,
      externalJobId: input.externalJobId ?? null,
      companyName: trimOrNull(input.companyName),
      roleTitle: trimOrNull(input.roleTitle),
      startsAt,
      endsAt: parseDate(input.endsAt),
      locationLabel: trimOrNull(input.locationLabel),
      locationAddress: trimOrNull(input.locationAddress),
      notes: trimOrNull(input.notes),
      cancelledAt: null,
    });
    return this.toView(created);
  }

  async update(
    email: string | null,
    id: number,
    input: UpdateInterviewEventInput,
  ): Promise<SeekerInterviewEventView | null> {
    const event = await this.ownedEvent(email, id);
    if (!event) return null;
    if (input.companyName !== undefined) event.companyName = trimOrNull(input.companyName);
    if (input.roleTitle !== undefined) event.roleTitle = trimOrNull(input.roleTitle);
    if (input.startsAt !== undefined) {
      const startsAt = parseDate(input.startsAt);
      if (startsAt) event.startsAt = startsAt;
    }
    if (input.endsAt !== undefined) event.endsAt = parseDate(input.endsAt);
    if (input.locationLabel !== undefined) event.locationLabel = trimOrNull(input.locationLabel);
    if (input.locationAddress !== undefined) {
      event.locationAddress = trimOrNull(input.locationAddress);
    }
    if (input.notes !== undefined) event.notes = trimOrNull(input.notes);
    const saved = await this.interviewEventRepo.save(event);
    return this.toView(saved);
  }

  async cancel(email: string | null, id: number): Promise<boolean> {
    const event = await this.ownedEvent(email, id);
    if (!event) return false;
    event.cancelledAt = now().toJSDate();
    await this.interviewEventRepo.save(event);
    return true;
  }

  private async ownedEvent(email: string | null, id: number): Promise<SeekerInterviewEvent | null> {
    if (!email) return null;
    const candidates = await this.candidateRepo.findByEmail(email);
    if (candidates.length === 0) return null;
    const candidateIds = new Set(candidates.map((c) => c.id));
    const event = await this.interviewEventRepo.findById(id);
    if (!event || !candidateIds.has(event.candidateId)) return null;
    return event;
  }

  private toView(event: SeekerInterviewEvent): SeekerInterviewEventView {
    return {
      id: event.id,
      applyClickId: event.applyClickId ?? null,
      externalJobId: event.externalJobId ?? null,
      companyName: event.companyName ?? null,
      roleTitle: event.roleTitle ?? null,
      startsAt: toIso(event.startsAt) ?? "",
      endsAt: toIso(event.endsAt),
      locationLabel: event.locationLabel ?? null,
      locationAddress: event.locationAddress ?? null,
      notes: event.notes ?? null,
      cancelledAt: toIso(event.cancelledAt),
    };
  }
}
