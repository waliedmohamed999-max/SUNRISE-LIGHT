# Deployment & operations

## Environments

Use three separate environments, each with its own database, storage bucket and `.env`:

| Env | `APP_ENV` | Notes |
| --- | --- | --- |
| development | `development` | `docker compose up -d db`, `npm run dev` |
| staging | `staging` | Same image as production. `robots.txt` disallows everything unless `APP_ENV=production`. |
| production | `production` | |

Hosting and storage regions are configuration only (database URL, bucket endpoint). If the platform serves customers in Saudi Arabia, prefer Saudi-hosted infrastructure and have the data-handling reviewed against the PDPL — this codebase does **not** claim regulatory compliance on its own.

## Docker

```bash
docker compose --profile app up -d --build   # db + app on :3000
# first run only — seed from a checkout of the repo, pointing at the same database:
DATABASE_URL=postgresql://sunrise:...@localhost:5433/sunrise_light npm run db:seed
```

The app container runs `prisma migrate deploy` on start, then `node server.js` (Next.js standalone output). Uploaded files live in the `uploads` volume mounted at `/app/storage` — back it up together with the database.

Put a TLS-terminating reverse proxy (nginx, Caddy, a cloud load balancer) in front. Session cookies are `Secure` in production, so HTTPS is required. Forward `Host` unchanged (the CSRF check compares `Origin` to `Host`/`X-Forwarded-Host`).

## Required configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Public origin, used for sitemap, canonical URLs, email links |
| `APP_ENV` | `development` / `staging` / `production` |
| `STORAGE_DRIVER`, `STORAGE_DIR` | `local` (default) |
| `MAX_UPLOAD_MB` | Upload limit (default 10) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SALES_TEAM_EMAIL` | Optional. Without them, no email is sent (recorded as `SKIPPED`). |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First super admin, used only by the seed script |

Never commit `.env`.

## Implementing S3 storage

`src/lib/storage.ts` defines `put / get / remove`. To add S3 (or any S3-compatible private bucket):

1. `npm i @aws-sdk/client-s3`
2. Add an `s3Driver()` using `PutObjectCommand`, `GetObjectCommand` (read `Body.transformToByteArray()`), `DeleteObjectCommand`, configured from `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
3. Return it from `selectDriver()` when `STORAGE_DRIVER=s3`. Keep the bucket **private**; files continue to be served through `/api/assets/[id]`, which enforces ownership.

## Server-side PDF quotations

The quotation document (`/[locale]/quotation/[offerId]`) is print-optimised HTML so Arabic is shaped correctly. To store PDF files automatically, add a job that opens that URL in headless Chromium (Playwright `page.pdf({ format: "A4", printBackground: true })`) with a staff session, then saves the result through `storage.put` and links it from `quotations_documents`.

## Backups & monitoring

- Database: daily `pg_dump` (or managed-database PITR), retained off-site; test restores.
- Files: back up the storage volume / enable bucket versioning.
- Errors: API errors are logged with `console.error("[api]", …)`; ship stdout to your log platform and add an error tracker (e.g. Sentry) in `src/lib/api.ts`.
- Audit: security-relevant actions are in `audit_logs` (Admin → Audit log).

## Security checklist

Implemented: hashed session tokens, bcrypt (cost 12), server-side RBAC on every admin route, owner checks on designs/assets/RFQs, CSRF origin check on all mutations, zod validation of every request body, content-based upload validation (magic bytes, pixel limits), SVG sanitising (DOMPurify + rejection of entities/external references), private file delivery with a restrictive CSP, rate limits (login, register, upload, RFQ, contact), security headers, audit log, soft delete for designs referenced by RFQs, optimistic concurrency on status changes.

Before launch: replace the seeded admin password, put Redis behind the rate limiter if running more than one instance, add password reset (needs email), and run a dependency audit (`npm audit`).

## Roadmap

1. Factory confirms materials, limits and finishing in the admin; technical team validates each dieline and ticks *Dieline engineering-validated*.
2. Configure the email provider; add password reset and email verification.
3. Add engines for gift boxes (lid & base), paper bags and paper cups (frustum geometry with curved artwork mapping).
4. When the factory provides validated pricing rules, implement a calculator that reads `pricing_rules` and show indicative prices next to — not instead of — manual quotations.
5. Server-side PDF generation and S3 storage as described above.
