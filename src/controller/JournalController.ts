import type { Response } from 'express'
import { IJournalService } from '../service/JournalService'
import { ILoggingService } from '../service/LoggingService'
import { JournalError } from '../lib/errors'

export interface IJournalController {
  showHome(res: Response): Promise<void>
  showEntryForm(res: Response): Promise<void>
  newEntryFromForm(res: Response, content: string): Promise<void>
  showAllEntries(res: Response): Promise<void>
  showEntry(res: Response, id: string): Promise<void>
  showEditForm(res: Response, id: string): Promise<void>
  updateEntryFromForm(res: Response, id: string, content: string): Promise<void>
  replaceEntry(res: Response, id: string, content: string): Promise<void>
  patchEntry(res: Response, id: string, content: string): Promise<void>
  deleteEntry(res: Response, id: string): Promise<void>
  deleteEntryFromForm(res: Response, id: string): Promise<void>
  showTagForm(res: Response, id: string): Promise<void>;
  addTagFromForm(res: Response, id: string, tag: string): Promise<void>;
  showEntriesByTag(res: Response, tag: string): Promise<void>;
  showAllTags(res: Response): Promise<void>;
}

class JournalController implements IJournalController {
  constructor(
    private readonly service: IJournalService,
    private readonly logger: ILoggingService,
  ) {}

  
  private isJournalError(value: unknown): value is JournalError {
    return (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      'message' in value
    )
  }

  private mapErrorStatus(error: JournalError): number {
    if (error.name === 'EntryNotFound') {
      return 404
    }
    if (error.name === 'InvalidContent' || error.name === 'ValidationError' || error.name === "InvalidTagError") {
      return 400
    }
    return 500
  }

  async showHome(res: Response): Promise<void> {
    this.logger.info('Rendering home page')
    res.render('home')
  }

  async showEntryForm(res: Response): Promise<void> {
    this.logger.info('Rendering new entry form')
    res.render('entries/new')
  }

  async newEntryFromForm(res: Response, content: string): Promise<void> {
    this.logger.info('Creating entry from form')

    const result = await this.service.createEntry(content)
    if (!result.ok && this.isJournalError(result.value)) {
      const error = result.value
      if (error.name === 'InvalidContent' || error.name === 'ValidationError') {
        this.logger.warn(`Create entry rejected: ${error.message}`)
        res.status(400).send(error.message)
        return
      }

      this.logger.error(`Create entry failed: ${error.message}`)
      res.status(500).send('Unable to create entry.')
      return
    }

    if (!result.ok) {
      res.status(500).send('Unable to create entry.')
      return
    }

    res.redirect(`/entries/${result.value.id}`)
  }

  async showAllEntries(res: Response): Promise<void> {
    this.logger.info('Listing all journal entries')
    const result = await this.service.getEntries()
    if (!result.ok) {
      if (this.isJournalError(result.value)) {
        res
          .status(500)
          .render('entries/not-found', { message: result.value.message })
      } else {
        res
          .status(500)
          .render('entries/not-found', { message: 'Unable to list entries' })
      }
      return
    }

    res.render('entries/index', { entries: result.value })
  }

  async showEntry(res: Response, id: string): Promise<void> {
    this.logger.info(`Showing entry ${id}`)
    const result = await this.service.getEntry(id)
    if (
      !result.ok &&
      this.isJournalError(result.value) &&
      result.value.name === 'EntryNotFound'
    ) {
      res.status(404).render('entries/not-found', { id, error: result.value })
      return
    }
    if (!result.ok && this.isJournalError(result.value)) {
      res.status(500).render('entries/not-found', { id, error: result.value })
      return
    }
    if (!result.ok) {
      res
        .status(500)
        .render('entries/not-found', { id, message: 'Unable to load entry' })
      return
    }

    res.render('entries/show', { entry: result.value })
  }

  async showEditForm(res: Response, id: string): Promise<void> {
    const result = await this.service.getEntry(id)
    if (
      !result.ok &&
      this.isJournalError(result.value) &&
      result.value.name === 'EntryNotFound'
    ) {
      res.status(404).render('entries/not-found', { id, error: result.value })
      return
    }
    if (!result.ok && this.isJournalError(result.value)) {
      res.status(500).render('entries/not-found', { id, error: result.value })
      return
    }
    if (!result.ok) {
      res
        .status(500)
        .render('entries/not-found', {
          id,
          message: 'Unable to load edit form',
        })
      return
    }

    res.render('entries/edit', { entry: result.value })
  }

  async updateEntryFromForm(
    res: Response,
    id: string,
    content: string,
  ): Promise<void> {
    this.logger.info(`Updating entry ${id} from form POST`)
    const result = await this.service.patchEntry(id, content)
    if (!result.ok && this.isJournalError(result.value)) {
      res.status(this.mapErrorStatus(result.value)).send(result.value.message)
      return
    }
    if (!result.ok) {
      res.status(500).send('Unable to update entry')
      return
    }
    res.redirect(`/entries/${id}`)
  }

  async replaceEntry(
    res: Response,
    id: string,
    content: string,
  ): Promise<void> {
    this.logger.info(`Replacing entry ${id} via PUT`)
    const result = await this.service.replaceEntry(id, content)
    if (!result.ok && this.isJournalError(result.value)) {
      res
        .status(this.mapErrorStatus(result.value))
        .json({ message: result.value.message })
      return
    }
    if (!result.ok) {
      res.status(500).json({ message: 'Unable to replace entry' })
      return
    }
    res.json(result.value)
  }

  async patchEntry(res: Response, id: string, content: string): Promise<void> {
    this.logger.info(`Patching entry ${id} via PATCH`)
    const result = await this.service.patchEntry(id, content)
    if (!result.ok && this.isJournalError(result.value)) {
      res
        .status(this.mapErrorStatus(result.value))
        .json({ message: result.value.message })
      return
    }
    if (!result.ok) {
      res.status(500).json({ message: 'Unable to patch entry' })
      return
    }
    res.json(result.value)
  }

  async deleteEntryFromForm(res: Response, id: string): Promise<void> {
    this.logger.info(`Deleting entry ${id} from form`)
    const result = await this.service.deleteEntry(id)
    if (
      !result.ok &&
      this.isJournalError(result.value) &&
      result.value.name === 'EntryNotFound'
    ) {
      res.status(404).render('entries/not-found', { id, error: result.value })
      return
    }
    if (!result.ok && this.isJournalError(result.value)) {
      res.status(500).render('entries/not-found', { id, error: result.value })
      return
    }
    if (!result.ok) {
      res
        .status(500)
        .render('entries/not-found', { id, message: 'Unable to delete entry' })
      return
    }
    res.redirect('/entries')
  }

  async deleteEntry(res: Response, id: string): Promise<void> {
    this.logger.info(`Deleting entry ${id}`)
    const result = await this.service.deleteEntry(id)
    if (!result.ok && this.isJournalError(result.value)) {
      this.logger.warn(`Delete failed for ${id}`)
      res
        .status(this.mapErrorStatus(result.value))
        .json({ message: result.value.message })
      return
    }
    if (!result.ok) {
      res.status(500).json({ message: 'Unable to delete entry' })
      return
    }
    res.status(204).send()
  }

  async showTagForm(res: Response, id: string): Promise<void> {
    this.logger.info(`Rendering tag form for entry ${id}`);
    const result = await this.service.getEntry(id);
    
    if (!result.ok) {
      if (this.isJournalError(result.value) && result.value.name === 'EntryNotFound') {
        res.status(404).render('entries/not-found', { id, error: result.value });
      } else {
        res.status(500).render('entries/not-found', { id, message: 'Unable to load entry' });
      }
      return;
    }
    res.render('tags/new', { entry: result.value, error: null });
  }

  async addTagFromForm(res: Response, id: string, tag: string): Promise<void> {
    this.logger.info(`Adding tag '${tag}' to entry ${id}`);
    const result = await this.service.addTagToEntry(id, tag);

    if (!result.ok && this.isJournalError(result.value)) {
      const error = result.value;
      
      // If validation fails, re-render the form with the specific error message
      if (error.name === 'InvalidTagError') {
        this.logger.warn(`Add tag rejected: ${error.message}`);
        const entryResult = await this.service.getEntry(id);
        
        if (entryResult.ok) {
          res.status(400).render('tags/new', { entry: entryResult.value, error: error.message });
        } else {
          res.status(500).send('Unable to reload entry.');
        }
        return;
      }
      
      res.status(this.mapErrorStatus(error)).send(error.message);
      return;
    }

    if (!result.ok) {
      res.status(500).send('Unable to add tag.');
      return;
    }

    res.redirect(`/entries/${id}`);
  }

  async showEntriesByTag(res: Response, tag: string): Promise<void> {
    this.logger.info(`Listing entries for tag: ${tag}`);
    const result = await this.service.getEntriesByTag(tag);
    
    if (!result.ok) {
      res.status(500).render('entries/not-found', { message: 'Unable to list entries for tag' });
      return;
    }

    res.render('entries/index', { entries: result.value, currentTag: tag });
  }

  async showAllTags(res: Response): Promise<void> {
    this.logger.info('Listing all unique tags');
    const result = await this.service.getAllTags();
    
    if (!result.ok) {
      res.status(500).render('entries/not-found', { message: 'Unable to load tags list' });
      return;
    }

    res.render('tags/index', { tags: result.value });
  }
}

export function CreateJournalController(
  service: IJournalService,
  logger: ILoggingService,
): IJournalController {
  return new JournalController(service, logger)
}
