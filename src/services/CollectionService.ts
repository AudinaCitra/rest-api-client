import type { Collection } from '../models/Collection';
import { CollectionRepository } from '../repositories/CollectionRepository';

/**
 * Service konseptual untuk collection.
 * Implementasi runtime utama berada di IPC handler src/main/index.ts
 * dan CollectionRepository. File ini ditambahkan agar struktur mengikuti
 * ketentuan tanpa mengubah alur aplikasi yang sudah berjalan.
 */
export class CollectionService {
  constructor(private readonly repo: CollectionRepository) {}

  list(): Collection[] {
    return this.repo.findAll();
  }

  create(name: string): Collection {
    return this.repo.insert({ name });
  }

  rename(id: number, name: string): Collection | null {
    return this.repo.rename(id, name);
  }

  remove(id: number): boolean {
    return this.repo.delete(id);
  }
}
