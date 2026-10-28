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

The app container runs `prisma migrate deploy` on start, then `node server.js` (Next.js standalone output). `GET /api/health` returns 200 when the database answers (503 otherwise) and is used by the image `HEALTHCHECK`; point your uptime monitor at it too. On start the server prints `[config]` warnings/errors for missing or unsafe settings and refuses to start in production on a hard error (no database URL, incomplete S3 settings). Uploaded files live in the `uploads` volume mounted at `/app/storage` — back it up together with the database.

Put a TLS-terminating reverse proxy (nginx, Caddy, a cloud load balancer) in front. Session cookies are `Secure` in production, so HTTPS is required. Forward `Host` unchanged (the CSRF check compares `Origin` to `Host`/`X-Forwarded-Host`).

## Required configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Public origin, used for sitemap, canonical URLs, email links |
| `APP_ENV` | `development` / `staging` / `production` |
| `STORAGE_DRIVER`, `STORAGE_DIR` | `local` (default, needs a persistent volume) or `s3` |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Required with `STORAGE_DRIVER=s3` |
| `S3_ENDPOINT`, `S3_REGION`, `S3_FORCE_PATH_STYLE`, `S3_PREFIX`, `S3_SSE` | Optional: endpoint for R2/MinIO/other S3-compatible services, region (default `auto`), `true` for path-style (MinIO), key prefix, `AES256` to request server-side encryption |
| `MAX_UPLOAD_MB` | Upload limit (default 10) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SALES_TEAM_EMAIL` | Optional. Without them, no email is sent (recorded as `SKIPPED`). |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First super admin, used only by the seed script. In production the seed refuses passwords shorter than 14 characters or common ones, and never creates a second super admin or overwrites an existing account. |
| `MFA_ENCRYPTION_KEY` | ≥ 32 random characters; encrypts two-step verification secrets. Keep it in your secret store and back it up — changing it invalidates existing enrolments. |
| `REQUIRE_STAFF_MFA` | `true` in production: staff must enable two-step verification before opening the dashboard. |
| `TRUST_PROXY_HOPS` | Number of reverse proxies in front of the app (default 1). The client IP for rate limits is read that many entries from the right of `X-Forwarded-For`. |
| `MIGRATION_DATABASE_URL` | Optional owner credentials used only for `prisma migrate deploy`; the runtime `DATABASE_URL` can then be the least-privilege role from `docs/db-least-privilege.sql`. |

Never commit `.env`.

## S3 storage

Set `STORAGE_DRIVER=s3` and the `S3_*` variables above. Keep the bucket **private** (no public ACL, no public bucket policy); files are still served only through `/api/assets/[id]`, which enforces ownership. Switching an existing installation from `local` to `s3` does not move old files — copy the contents of the storage volume into the bucket (same keys) before switching.

## Server-side PDF quotations

The quotation document (`/[locale]/quotation/[offerId]`) is print-optimised HTML so Arabic is shaped correctly. To store PDF files automatically, add a job that opens that URL in headless Chromium (Playwright `page.pdf({ format: "A4", printBackground: true })`) with a staff session, then saves the result through `storage.put` and links it from `quotations_documents`.

## Backups & monitoring

- Database: daily `pg_dump` (or managed-database PITR), retained off-site; test restores.
- Files: back up the storage volume / enable bucket versioning.
- Errors: API errors are logged with `console.error("[api]", …)`; ship stdout to your log platform and add an error tracker (e.g. Sentry) in `src/lib/api.ts`.
- Audit: security-relevant actions are in `audit_logs` (Admin → Audit log).

## Security controls

Pages send a per-request nonce Content-Security-Policy (no `unsafe-eval` in production), HSTS when `APP_URL` is https, and COOP. API responses are `no-store`. Staff sessions last 12 hours (customers 14 days); the production cookie is `__Host-` prefixed. Security regression tests: `node tests/security-e2e.mjs` against a local or staging instance (synthetic accounts, refuses non-local targets by default). CI (`.github/workflows/ci.yml`) runs a secret scan, lint, type check, tests, dependency audit and build; CodeQL runs weekly.

## Security checklist

Implemented: hashed session tokens, bcrypt (cost 12), server-side RBAC on every admin route, owner checks on designs/assets/RFQs, CSRF origin check on all mutations, zod validation of every request body, content-based upload validation (magic bytes, pixel limits), SVG sanitising (DOMPurify + rejection of entities/external references), private file delivery with a restrictive CSP, rate limits (login, register, upload, RFQ, contact), security headers, audit log, soft delete for designs referenced by RFQs, optimistic concurrency on status changes.

Users change their password from *My account → Password* (all other sessions are signed out). A super admin can reset any staff or customer password from *Admin → Users* (a random password is generated in the browser and shown once). *Admin → System status* flags an admin that still uses the seed password.

Put Redis behind the rate limiter if running more than one instance, add self-service password reset once email is configured, and run a dependency audit (`npm audit --omit=dev`).

Open audit items (October 2026) that need a planned major upgrade with regression testing: **zod 3 → 4** (memory exhaustion on oversized collections — mitigated meanwhile by the 2 MB JSON body limit in `parseJson`), **Next.js 15 → 16** (bundled PostCSS, build-time only) and **Prisma 6 → 7** (`deepmerge-ts` in the CLI config loader, build-time only).

## Launch checklist

Work through *Admin → System status* until every line is green or consciously accepted:

1. **Admin password** — sign in with the seed account and change it immediately; create named accounts for each staff member (Admin → Users) instead of sharing one login.
2. **Company settings** (Admin → Company settings) — real phone, WhatsApp, email, address, working hours, map link, CR and VAT numbers, social accounts. Empty fields are hidden on the site, nothing is invented.
3. **Content** (Admin → Website content) — about/services text, FAQ, portfolio items (only real work you have permission to show).
4. **Catalogue** — confirm categories (Admin → Categories), enable only the templates you produce, set real size limits, mark materials *factory approved*, and tick *Dieline engineering-validated* per template after the technical team checks a sample.
5. **Email** — `RESEND_API_KEY`, `EMAIL_FROM` (verified domain), `SALES_TEAM_EMAIL`.
6. **Domain & TLS** — `APP_URL=https://…`, reverse proxy with HTTPS, `APP_ENV=production` (enables indexing in `robots.txt`).
7. **Storage & backups** — persistent volume or S3 bucket; daily database dump and file backup; test a restore.
8. **Legal** — review the privacy policy and terms pages with your legal advisor (PDPL for Saudi customers).
9. **Smoke test** — register a customer, save a design, submit an RFQ, process it in the admin and send an offer (`node tests/e2e-smoke.mjs` automates this against a running instance).


## Roadmap

1. Factory confirms materials, limits and finishing in the admin; technical team validates each dieline and ticks *Dieline engineering-validated*.
2. Configure the email provider; add password reset and email verification.
3. Add engines for gift boxes (lid & base), paper bags and paper cups (frustum geometry with curved artwork mapping).
4. When the factory provides validated pricing rules, implement a calculator that reads `pricing_rules` and show indicative prices next to — not instead of — manual quotations.
5. Server-side PDF generation as described above.
