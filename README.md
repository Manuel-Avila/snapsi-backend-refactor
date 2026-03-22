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

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ONE_TIME_USD`
- `STRIPE_PRICE_SUBSCRIPTION_MONTHLY_USD`

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

## Run with Docker Compose

1. Ensure your `.env` file exists (copy from `.env.example` if needed) and set required secrets.
2. Build and start the stack:

```bash
docker compose up --build -d
```

3. Follow app logs:

```bash
docker compose logs -f app
```

4. Stop containers:

```bash
docker compose down
```

Notes:

- The API is exposed on `http://localhost:3000`.
- MySQL data is persisted in the `mysql_data` volume.
- The app waits for MySQL health and runs `prisma db push` on startup.

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
- `/api/payments`
- `/api/webhooks/stripe`

### Payments Routes

- `POST /api/payments/checkout-session`
- `GET /api/payments/billing-status`
- `GET /api/payments/history`
- `POST /api/payments/subscription/cancel`

### Stripe Webhook Route

- `POST /api/webhooks/stripe`
