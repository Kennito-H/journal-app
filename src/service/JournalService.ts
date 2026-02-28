import { IJournalEntry } from '../model/JournalEntry.js'
import { IJournalRepository } from '../repository/JournalRespository.js'
import { Result, Err, Ok } from '../lib/result.js'
import { JournalError, InvalidContent, ValidationError,InvalidTagError } from '../lib/errors.js'

/**
 * Service interface.
 *
 * A service coordinates domain logic.
 */
export interface IJournalService {
  createEntry(content: string): Promise<Result<IJournalEntry, JournalError>>
  getEntry(id: string): Promise<Result<IJournalEntry, JournalError>>
  getEntries(): Promise<Result<IJournalEntry[], JournalError>>
  replaceEntry(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>>
  patchEntry(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>>
  deleteEntry(id: string): Promise<Result<null, JournalError>>
  addTagToEntry(id: string, tag: string): Promise<Result<IJournalEntry, JournalError>>;
  getEntriesByTag(tag: string): Promise<Result<IJournalEntry[], JournalError>>;
  getAllTags(): Promise<Result<string[], JournalError>>;
}

class JournalService implements IJournalService {
  constructor(private readonly repository: IJournalRepository) {}

  async createEntry(
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>> {
    const normalized = content.trim()

    if (!normalized) {
      return Err(InvalidContent('Entry content is required.'))
    }

    if (normalized.length > 5000) {
      return Err(
        ValidationError('Entry content must be 5000 characters or fewer.'),
      )
    }

    return this.repository.add(normalized)
  }

  async getEntry(id: string): Promise<Result<IJournalEntry, JournalError>> {
    return this.repository.getById(id)
  }

  async getEntries(): Promise<Result<IJournalEntry[], JournalError>> {
    return this.repository.getAll()
  }

  async replaceEntry(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>> {
    return this.repository.replaceById(id, content)
  }

  async patchEntry(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>> {
    return this.repository.patchById(id, content)
  }

  async deleteEntry(id: string): Promise<Result<null, JournalError>> {
    return this.repository.deleteById(id)
  }
  async addTagToEntry(id: string, tag: string): Promise<Result<IJournalEntry, JournalError>> {
    const normalizedTag = tag.trim().toLowerCase();

    if (!normalizedTag) {
      return Err(InvalidTagError('Tag cannot be empty.'));
    }

    if (!/^[a-z0-9-]+$/.test(normalizedTag)) {
      return Err(InvalidTagError('Tags must be lowercase alphanumeric and can contain hyphens.'));
    }

    if (normalizedTag.length > 20) {
      return Err(InvalidTagError('Tags must be 20 characters or fewer.'));
    }

    const entryResult = await this.repository.getById(id);
    if (!entryResult.ok) {
      return entryResult; // Passes up the EntryNotFound error
    }

    const entry = entryResult.value;
    
    entry.addTag(normalizedTag);

    return Ok(entry);
  }
  
  async getEntriesByTag(tag: string): Promise<Result<IJournalEntry[], JournalError>> {
    const normalizedTag = tag.trim().toLowerCase();
    
    return this.repository.getByTag(normalizedTag);
  }
  async getAllTags(): Promise<Result<string[], JournalError>> {
    return this.repository.getAllTags();
  }

}

export function CreateJournalService(
  repository: IJournalRepository,
): IJournalService {
  return new JournalService(repository)
}
