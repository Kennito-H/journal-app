import path from 'node:path'
import { IApp } from './contracts'
import express, { RequestHandler } from 'express'
import { Request, Response } from 'express'
import Layouts from 'express-ejs-layouts'
import { IJournalController } from './controller/JournalController'
import { ILoggingService } from './service/LoggingService'

// Type for async route handlers, which return a Promise
type AsyncRequestHandler = RequestHandler

// Helper to wrap async route handlers and catch errors
function asyncHandler(fn: AsyncRequestHandler) {
  return function (req: Request, res: Response, next: any) {
    return Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export class ExpressApp implements IApp {
  private readonly app: express.Express

  constructor(
    private readonly controller: IJournalController,
    private readonly logger: ILoggingService,
  ) {
    this.app = express()
    this.registerMiddleware()
    this.registerTemplating()
    this.registerRoutes()
  }

  registerMiddleware(): void {
    this.app.use(express.static('static'))
    this.app.use(Layouts)
  }

  registerTemplating(): void {
    this.app.set('view engine', 'ejs')
    this.app.set('views', path.join(process.cwd(), 'views'))
    this.app.set('layout', 'layouts/base')
  }

  registerRoutes(): void {
    const controller = this.controller

    this.app.get(
      '/',
      asyncHandler(async (_req, res) => {
        this.logger.info('GET /')
        await this.controller.showHome(res)
      }),
    )

    this.app.get(
      '/entries/new',
      asyncHandler(async (_req, res) => {
        await controller.showEntryForm(res)
      }),
    )

    this.app.post(
      '/entries/new',
      express.urlencoded({ extended: true }),
      asyncHandler(async (req, res) => {
        const raw = req.body.content
        const content = typeof raw === 'string' ? raw.trim() : ''

        if (!content) {
          this.logger.warn(
            'POST /entries/new rejected: content missing or empty',
          )
          res.status(400).send('Entry content is required.')
          return
        }

        await controller.newEntryFromForm(res, content)
      }),
    )

    this.app.get(
      '/entries',
      asyncHandler(async (_req, res) => {
        await controller.showAllEntries(res)
      }),
    )

    this.app.get(
      '/entries/:id',
      asyncHandler(async (req, res) => {
        const id = req.params.id as string
        await controller.showEntry(res, id)
      }),
    )

    this.app.get(
      '/entries/:id/edit',
      asyncHandler(async (req, res) => {
        this.logger.info(`GET /entries/${req.params.id}/edit`)
        const id = req.params.id as string
        await this.controller.showEditForm(res, id)
      }),
    )

    this.app.post(
      '/entries/:id/edit',
      express.urlencoded({ extended: true }),
      asyncHandler(async (req, res) => {
        this.logger.info(`POST /entries/${req.params.id}/edit`)
        const id = req.params.id as string
        const content = req.body.content as string
        await this.controller.updateEntryFromForm(res, id, content)
      }),
    )

    this.app.post(
      '/entries/:id/delete',
      asyncHandler(async (req, res) => {
        this.logger.info(`POST /entries/${req.params.id}/delete`)
        const id = req.params.id as string
        await this.controller.deleteEntryFromForm(res, id)
      }),
    )

    this.app.put(
      '/api/entries/:id',
      express.json(),
      asyncHandler(async (req, res) => {
        this.logger.info(`PUT /api/entries/${req.params.id}`)
        const id = req.params.id as string
        const content = req.body.content as string
        await this.controller.replaceEntry(res, id, content)
      }),
    )

    this.app.patch(
      '/api/entries/:id',
      express.json(),
      asyncHandler(async (req, res) => {
        this.logger.info(`PATCH /api/entries/${req.params.id}`)
        const id = req.params.id as string
        const content = req.body.content as string
        await this.controller.patchEntry(res, id, content)
      }),
    )

    this.app.delete(
      '/api/entries/:id',
      asyncHandler(async (req, res) => {
        this.logger.info(`DELETE /api/entries/${req.params.id}`)
        const id = req.params.id as string
        await this.controller.deleteEntry(res, id)
      }),
    )

    this.app.get(
      '/entries/:id/tags/new',
      asyncHandler(async (req, res) => {
        const id = req.params.id as string;
        await controller.showTagForm(res, id);
      }),
    )

    this.app.post(
      '/entries/:id/tags',
      express.urlencoded({ extended: true }),
      asyncHandler(async (req, res) => {
        const id = req.params.id as string;
        // Safely extract the tag from the parsed body
        const rawTag = req.body.tag;
        const tag = typeof rawTag === 'string' ? rawTag : '';
        
        await controller.addTagFromForm(res, id, tag);
      }),
    )

    this.app.get(
      '/tags/:tag',
      asyncHandler(async (req, res) => {
        const tag = req.params.tag as string;
        await controller.showEntriesByTag(res, tag);
      }),
    )

    this.app.get(
      '/tags',
      asyncHandler(async (_req, res) => {
        await controller.showAllTags(res);
      }),
    )
  }

  getExpressApp(): express.Express {
    return this.app
  }
}

export const CreateApp = (
  controller: IJournalController,
  logger: ILoggingService,
): ExpressApp => new ExpressApp(controller, logger)
