import { IJournalEntry, createJournalEntry } from '../model/JournalEntry.js'
import { Result, Ok, Err } from '../lib/result.js'
import {
  JournalError,
  EntryNotFound,
  ValidationError,
} from '../lib/errors.js'

/**
 * Repository interface.
 *
 * A repository is "how we talk to storage".
 * Today it's in-memory, later it can be a database.
 */
export interface IJournalRepository {
  add(content: string): Promise<Result<IJournalEntry, JournalError>>
  getById(id: string): Promise<Result<IJournalEntry, JournalError>>
  getAll(): Promise<Result<IJournalEntry[], JournalError>>
  replaceById(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>>
  patchById(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>>
  deleteById(id: string): Promise<Result<null, JournalError>>
}

class JournalRepository implements IJournalRepository {
  private entries: IJournalEntry[] = []
  private nextId = 1

  add(content: string): Promise<Result<IJournalEntry, JournalError>> {
    if (!content) {
      return Promise.resolve(
        Err(ValidationError('Repository received empty content.')),
      )
    }
    const entry = createJournalEntry(String(this.nextId++), content)
    this.entries.push(entry)
    return Promise.resolve(Ok(entry))
  }

  getById(id: string): Promise<Result<IJournalEntry, JournalError>> {
    const found = this.entries.find(entry => entry.id === id)
    if (!found) {
      return Promise.resolve(
        Err(EntryNotFound(`Journal entry with id ${id} not found`)),
      )
    }
    return Promise.resolve(Ok(found))
  }

  getAll(): Promise<Result<IJournalEntry[], JournalError>> {
    return Promise.resolve(Ok(this.entries))
  }

  replaceById(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>> {
    for (let i = 0; i < this.entries.length; i += 1) {
      if (this.entries[i].id === id) {
        this.entries[i].content = content
        this.entries[i].updatedAt = new Date()
        return Promise.resolve(Ok(this.entries[i]))
      }
    }
    return Promise.resolve(
      Err(EntryNotFound(`Journal entry with id ${id} not found`)),
    )
  }

  patchById(
    id: string,
    content: string,
  ): Promise<Result<IJournalEntry, JournalError>> {
    return this.replaceById(id, content)
  }

  deleteById(id: string): Promise<Result<null, JournalError>> {
    for (let i = 0; i < this.entries.length; i += 1) {
      if (this.entries[i].id === id) {
        this.entries.splice(i, 1)
        return Promise.resolve(Ok(null))
      }
    }
    return Promise.resolve(
      Err(EntryNotFound(`Journal entry with id ${id} not found`)),
    )
  }
}

export function CreateJournalRepository(): IJournalRepository {
  return new JournalRepository()
}
