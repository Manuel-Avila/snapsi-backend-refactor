# Project Guidelines

## Code Style
- Use TypeScript strict mode and explicit Express types (`Request`, `Response`, `NextFunction`).
- Keep ESM + NodeNext compatibility (`"type": "module"`) and use `.js` extensions for relative imports.
- Controllers should use `async (req: Request, res: Response): Promise<void>`.
- Keep functions small and prefer early returns for invalid or unauthorized states.
- Follow naming and data-shape patterns already used in `src/controllers`, `src/models`, `src/validators`.

## Architecture
- Keep endpoint flow layered: router -> middleware (`validate`, `verifyToken`, `multer` when needed) -> controller -> model.
- Routers compose middleware and handlers only. Do not place Prisma or business logic in routers.
- Controllers own HTTP concerns: status codes, response payload shape, auth checks, and model orchestration.
- Models own Prisma queries and DTO mapping.
- Validators define Joi schemas and are wired in routers via `validateReq`.
- Shared infrastructure belongs in `src/config`; reusable domain utilities in `src/utils`.

## Routing and Middleware Conventions
- Use `validate(schema, "params" | "query" | "body")` in routers, not controllers.
- For auth routes, include `verifyToken` and rely on typed `req.user` from `src/types/express/index.d.ts`.
- Keep route specificity in mind (static routes before dynamic params), e.g. `/bookmarks` before `/:postId`.
- For file uploads, follow existing order: `verifyToken -> upload.single("image") -> validate(body) -> controller`.

## Build and Run
- Install: `pnpm install`
- Dev server: `pnpm start-dev`
- Build: `pnpm build`
- Production run: `pnpm start`
- DB sync: `pnpm db:push`
- DB migrate: `pnpm db:migrate`
- Seed data: `pnpm db:seed`
- Prisma Studio: `pnpm db:studio`
- Prisma client generation: `pnpm prisma:generate`
- Tests are not implemented (`pnpm test` intentionally fails by design).

## Controller and Response Conventions
- Always guard auth first in protected handlers: `const userId = req.user?.id; if (!userId) { res.status(401)...; return; }`.
- Use explicit and consistent status codes (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`).
- Preserve JSON consistency with clear keys such as `message`, entity payload keys (`post`, `user`, `comment`), and pagination key `nextCursor`.
- Keep try/catch in controllers and return user-safe error messages.

## Model and Prisma Conventions
- Keep Prisma calls inside `src/models` (controllers should not query Prisma directly).
- Follow DB mapping conventions: Prisma camelCase fields mapped to snake_case DB columns via `@map`.
- Preserve API response mappings in models (snake_case payload fields such as `profile_picture_url`, `image_cloudinary_id`).
- Prefer `select` for lightweight existence checks and focused fetching.
- Handle known Prisma errors in controllers (`PrismaClientKnownRequestError`, especially `P2002`, `P2003`).

## Pagination Pattern
- Reuse `handlePaginatedRequest` for cursor pagination endpoints.
- Keep the `limit`/`cursor` query contract used across list endpoints.
- Return pagination as `{ <dataKey>: [...], nextCursor }`.

## Upload and Media Pattern
- Keep Multer in-memory uploads and Cloudinary streaming via `cloudinaryUtils`.
- Persist Cloudinary `public_id` in DB for future cleanup.
- When create/update fails after upload, attempt rollback with `deleteFile(publicId)`.

## Environment Notes
- Required environment variables include: `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- If Prisma schema changes, run `pnpm prisma:generate` (or a DB command that triggers generation) before starting the app.
- Docker setup expects MySQL health checks before app startup (`depends_on: condition: service_healthy`).
- Production container currently runs Prisma DB sync on startup; avoid startup assumptions that skip DB readiness.
