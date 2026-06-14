import { Injectable, NotFoundException } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { CreateAnnixOrbitTaskDto, UpdateAnnixOrbitTaskDto } from "../dto/annix-orbit-task.dto";
import { AnnixOrbitTask } from "../entities/annix-orbit-task.entity";
import { AnnixOrbitTaskRepository } from "../repositories/annix-orbit-task.repository";

function isoDateOf(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

@Injectable()
export class AnnixOrbitTaskService {
  constructor(private readonly taskRepo: AnnixOrbitTaskRepository) {}

  findForCompany(companyId: number): Promise<AnnixOrbitTask[]> {
    return this.taskRepo.findByCompany(companyId);
  }

  create(companyId: number, userId: number, dto: CreateAnnixOrbitTaskDto): Promise<AnnixOrbitTask> {
    return this.taskRepo.create({
      companyId,
      ownerUserId: userId,
      title: dto.title.trim(),
      dueDate: dto.dueDate ?? null,
      done: dto.done ?? false,
      relatedCandidateId: dto.relatedCandidateId ?? null,
      notes: dto.notes ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitTaskDto,
  ): Promise<AnnixOrbitTask> {
    const task = await this.taskRepo.findByIdForCompany(id, companyId);
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate;
    if (dto.done !== undefined) task.done = dto.done;
    if (dto.relatedCandidateId !== undefined) task.relatedCandidateId = dto.relatedCandidateId;
    if (dto.notes !== undefined) task.notes = dto.notes;
    return this.taskRepo.save(task);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const task = await this.taskRepo.findByIdForCompany(id, companyId);
    if (!task) {
      throw new NotFoundException("Task not found");
    }
    await this.taskRepo.deleteById(id);
  }

  // Count of open tasks due on or before today — the dashboard Tasks card.
  async dueTodayCount(companyId: number): Promise<number> {
    const today = DateTime.now().toISODate() ?? new Date().toISOString().slice(0, 10);
    const tasks = await this.taskRepo.findByCompany(companyId);
    return tasks.reduce((acc, task) => {
      if (task.done) return acc;
      const due = isoDateOf(task.dueDate);
      return due !== null && due <= today ? acc + 1 : acc;
    }, 0);
  }
}
