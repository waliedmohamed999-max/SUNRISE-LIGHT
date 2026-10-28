# Sunrise Light — مصنع ضوء الشروق

Corporate website, interactive **Packaging Design Studio**, customer portal, quotation (RFQ) workflow and factory admin dashboard for a custom cardboard & paper packaging manufacturer.

> «من فكرتك إلى عبوتك... صمّمها بنفسك ودع التصنيع علينا.»

Arabic (RTL) is the primary language; English (LTR) is fully supported at `/en`.

---

## Quick start (development)

Requirements: Node 22+, Docker (for PostgreSQL).

```bash
cp .env.example .env            # then edit secrets
docker compose up -d db         # PostgreSQL 16 on localhost:5433
npm install
npx prisma migrate deploy       # apply migrations
npm run db:seed                 # reference data + first super admin (SEED_ADMIN_* in .env)
npm run dev                     # http://localhost:3000
```

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` to reach `/ar/admin`. **Change that password** (create a new super admin under *Users*, then deactivate the seeded one).

### Tests

```bash
npm test                                        # unit tests (geometry, mapping, reflow, upload security, RBAC)
BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node tests/e2e-smoke.mjs   # full workflow; needs a staff account
npm run typecheck && npm run lint
```

The end-to-end script registers a throw-away customer, uploads a logo, saves a design, submits an RFQ, walks it through technical review → pricing → sent quotation → customer approval, and checks access control (other customers, CSRF, staff-only endpoints, final statuses).

---

## Architecture

| Layer | Technology |
| --- | --- |
| Web app | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| REST API | Next.js route handlers under `src/app/api` (see note below) |
| Database | PostgreSQL 16 + Prisma ORM (`prisma/schema.prisma`, migrations in `prisma/migrations`) |
| 2D editor | Konva / react-konva |
| 3D preview | three.js + React Three Fiber + Drei |
| Auth | Server-side sessions (httpOnly cookie, SHA-256-hashed tokens in `sessions`), bcrypt passwords, RBAC enforced in every API route |
| Files | Private storage outside `/public`, served only through authorised routes |

**Deviation from the brief:** the brief recommends a separate NestJS backend. This build uses Next.js route handlers as the REST API to ship one deployable unit; the API is isolated under `src/app/api` and `src/lib`, so it can be moved to NestJS later without changing the data model or the client.

### Source map

```
src/packaging/          Parametric packaging engine (pure TS, shared by browser and server)
  types.ts              Surface orientation conventions, dieline types
  geometry.ts           Panel helpers, cut-line derivation from folds
  templates/            shipping-carton (FEFCO 0201), mailer-box (0427 family), folding-carton (reverse tuck end)
  engine.ts             Registry + dimension validation
  svg.ts                SVG dieline export
src/design/             Design document (zod schema), reflow, canvas rendering, history (undo/redo)
src/components/studio/  Studio UI: Konva surface editor, dieline view, panels, read-only preview
src/components/three/   BoxModel (6 textured planes, hinged lid), viewer, hero scene
src/lib/                auth, rbac, api wrapper (CSRF origin check, rate limit, errors), storage,
                        upload-security, notifications, quotes workflow, catalog, audit
src/app/[locale]/       Pages (ar/en): site, studio, quote, account, quotation document, admin
src/app/api/            REST endpoints
prisma/                 Schema, migrations, seed
tests/                  Vitest unit tests + end-to-end smoke script
```

### How the studio stays consistent

One `DesignDocument` (JSON, millimetres) drives everything. Each surface is rasterised once by `src/design/render.ts`; the same canvases are used as **3D textures**, for the **dieline composite** (with per-panel source rectangles and rotations defined by the template — e.g. RSC top artwork is split across the two major flaps, one rotated 180°), for **exports** and for the **isometric thumbnail**. The Konva editor draws elements with the same renderer, so Arabic text shaping and image placement match exactly. Changing dimensions regenerates geometry from the template formulas and reflows artwork (centres keep their relative position; oversize elements shrink).

---

## Feature status

| Area | Status |
| --- | --- |
| Homepage, products, category, services, about, portfolio, contact, FAQ, privacy, terms (ar/en) | ✅ Working. Copy for about/services/contact is editable in admin; empty values show a clear placeholder. Portfolio is empty until real, approved projects are added. |
| Live 3D hero (procedural boxes + WebGL fallback) | ✅ |
| Studio: 3 templates, dynamic L×W×H (mm/cm), limits, colours per face, text (Arabic/English, 5 OFL fonts), logo upload, move/resize/rotate/duplicate/delete/lock/layer order, snap, zoom/pan, undo/redo, safe-area & DPI warnings | ✅ |
| 3D preview: orbit, zoom, preset views, lid opening, live texture updates | ✅ |
| Cut & fold layout view, SVG dieline export, PNG and JSON export | ✅ (preview quality — see limitations) |
| Save / autosave / local guest draft / rename / duplicate / delete / reopen, version snapshots | ✅ |
| RFQ: 4-step flow, frozen design version + spec snapshot + preview image, RFQ numbering | ✅ |
| Customer portal: designs, quotes, status history, technical feedback, approve / request revision / cancel, notifications, profile & company | ✅ |
| Admin: overview, RFQ search/filter/assign/status/notes/feedback, manual pricing + send, quotation document, templates (limits → new version, printable faces, materials, validation flag), materials & finishing, customers, contact messages, website content/FAQ/portfolio, users & roles, audit log | ✅ |
| Roles: Super Admin, Factory Manager, Sales, Technical Reviewer, Customer — enforced server-side | ✅ |
| Gift boxes, food packaging, paper cups, paper bags, custom packaging | ⏳ Listed as **Coming soon**. Each needs a geometry engine in `src/packaging/templates` (cups need a conical/frustum engine). |
| Automatic pricing | ⏳ Intentionally off. `pricing_rules` holds an **inactive** model of the future factors; quotations are entered manually by staff. |
| Email notifications | ⚙️ Implemented (Resend API). **Disabled until `RESEND_API_KEY` and `EMAIL_FROM` are set**; until then emails are recorded as `SKIPPED` and only in-app notifications are delivered. |
| PDF quotation | ⚙️ Printable bilingual HTML document → *Print / Save as PDF* (correct Arabic shaping). Server-side PDF files require headless Chromium — see `docs/DEPLOYMENT.md`. |
| S3 object storage | ⚙️ Storage is behind a driver interface; only the `local` driver ships. Implementing `s3` is a ~40-line task (steps in `docs/DEPLOYMENT.md`). |

### Known limitations (deliberate, not hidden)

- **Dielines are visual approximations.** Board thickness, flute allowances, slot widths and glue-flap specifics are not applied. Every template ships with `dielineValidated = false`; the UI and SVG say "requires technical review". Only a Technical Reviewer / Manager can mark a template validated after checking it against the factory's own dies.
- **Seeded data are placeholders**: dimension limits, materials (marked *not factory-approved*), finishing options. The factory must confirm or edit them in the admin before launch.
- Rate limiting is in-memory (single instance). Use Redis for multiple instances.
- No password-reset flow yet (needs a configured email provider).

See `docs/DEPLOYMENT.md` for production setup, security notes and the roadmap.
