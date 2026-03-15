# Snapsi Backend (TypeScript + Prisma)

This backend is rebuilt in TypeScript and now uses Prisma ORM with MySQL.

## Tech Stack

- Node.js
- Express
- TypeScript
- Prisma ORM
- MySQL
- Joi
- JWT
- bcryptjs

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:

- Copy `.env.example` into `.env`
- Update `DATABASE_URL` and other secrets

3. Push schema to your DB:

```bash
pnpm db:push
```

4. (Optional) Seed the DB:

```bash
pnpm db:seed
```

5. Run in development mode:

```bash
pnpm start-dev
```

## Scripts

- `pnpm start-dev`: Run API with hot reload (tsx)
- `pnpm build`: Compile TypeScript into `dist`
- `pnpm start`: Run compiled build
- `pnpm db:push`: Sync Prisma schema with DB
- `pnpm db:migrate`: Create/apply Prisma migrations
- `pnpm db:seed`: Seed initial data
- `pnpm db:studio`: Open Prisma Studio

## API Endpoints

- `/api/auth`
- `/api/posts`
- `/api/profile`
- `/api/user`
- `/api/notifications`
