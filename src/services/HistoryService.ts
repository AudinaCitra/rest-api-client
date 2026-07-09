import type { HistoryEntry } from '../models/HistoryEntry';
import { HistoryRepository } from '../repositories/HistoryRepository';

/**
 * Service konseptual untuk history.
 * Runtime utama memakai HistoryRepository langsung melalui RequestService
 * dan IPC handler di src/main/index.ts.
 */
export class HistoryService {
  constructor(private readonly repo: HistoryRepository) {}

  list(): HistoryEntry[] {
    return this.repo.findAll();
  }

  clear(): void {
    this.repo.clear();
  }
}
