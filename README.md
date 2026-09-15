# Home Charging Assessment

Home Charging Assessment is a Next.js application for collecting electric
vehicle home charger installation requests and reviewing them in a protected
admin portal.

Customers can start an assessment without registration, save each survey page as
a draft, refresh the browser and continue, open a resume link, review their
answers, and submit the completed request. Administrators can sign in with a
database-backed account, review assessments, search and filter records, inspect
submission details, edit approved customer contact fields, and monitor dashboard
statistics.

## Technologies

- Next.js 16
- React 19
- TypeScript
- App Router
- MongoDB Node.js Driver
- Tailwind CSS
- Zod
- React Hook Form
- bcryptjs
- Vitest
- tsx

The application uses the official MongoDB Node.js driver directly. It does not
use an ORM.

## Environment

Copy `.env.example` to `.env.local` for local development:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=home_charging_assessment
APP_URL=http://localhost:3000
ADMIN_SESSION_COOKIE_NAME=home_charging_admin_session
ADMIN_SESSION_DAYS=1
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=change-this-development-password
DRAFT_INACTIVITY_DAYS=7
ALLOW_DATABASE_RESET=false
RUN_MONGODB_INTEGRATION=false
```

Real `.env` and `.env.local` files are ignored by Git. Do not commit real
database URLs, administrator credentials, or production secrets.

## MongoDB Setup

Run MongoDB locally or provide a reachable `MONGODB_URI`. Then create indexes:

```bash
npm run db:indexes
```

Indexes are centralized in the repository layer and include admin session TTL,
assessment status, creation date, last activity, last completed step, completion
date, and frequently filtered nested customer, vehicle and charger fields.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The development server runs on `http://localhost:3000` by default.

## Seed Data

Seed data upserts one development administrator plus 50 sample assessments
(26 completed and 24 drafts) with realistic fictional customer, vehicle,
installation and charger values:

```bash
npm run seed
```

Set these variables before seeding:

```env
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=change-this-development-password
```

The seed script refuses to run in production. It upserts the administrator by
normalized email, updating its password and keeping the existing account ID.
Assessments have stable `seedId` values in the `home-charging-sample:` namespace,
protected by a unique sparse index. Repeated runs refresh only those 50 samples
instead of inserting another batch, retaining their database IDs and resume-token
hashes. Edits to these samples are overwritten on the next seed run.

Sample values are deterministic for the installed Faker version, and timestamps
are relative to one instant captured per run. Activity and update dates never
precede creation or exceed completion (for completed samples); no sample date is
in the future. The existing draft step distribution is preserved.

The seed process never deletes data. `ALLOW_DATABASE_RESET=true` is rejected
before any writes; leave it `false`. Manually
created assessments and records without these seed IDs are left untouched,
including samples from older seed versions that had no seed identifier. Those
legacy samples cannot be safely identified for automatic deduplication.

### Vehicle and charger catalogs

Dropdown options are read from MongoDB collections `vehicles` and `chargers`.
The document shapes are:

```ts
// vehicles
{ _id: ObjectId, manufacturer: string, models: { name: string, years: number[] }[], sortOrder?: number }
// chargers
{ _id: ObjectId, brand: string, models: string[], sortOrder?: number }
```

The normal index setup creates a unique `manufacturer` index for vehicles, a
unique `brand` index for chargers, and compound indexes on `sortOrder` plus each
name. Catalog records sort by those fields; nested models and years retain their
stored order. No assessment document shape changes: answers remain manufacturer,
model and year strings/numbers, or charger brand/model strings.

`scripts/catalog-seed-data.ts` contains the original three manufacturers and
three charger brands, with exactly the original models, years and ordering.
These arrays are seed inputs only, never a runtime application fallback.
`scripts/seed-catalogs.ts` upserts by manufacturer/brand and sets `sortOrder` to
preserve the dropdown ordering. Repeated runs update these catalog records while
retaining their IDs; records with other names remain untouched. The sample
assessment generator uses the same seed inputs so its answers remain valid.

When an operator runs the existing `npm run seed` command in development, catalog
upserts run after index setup and before sample assessments. It still requires
the documented development admin credentials and refuses production execution.
No catalog is automatically seeded at startup or during a build. Until records
are supplied, catalog endpoints return a safe 503 and catalog-dependent saves are
blocked. Production catalogs can be populated through the normal database
administration process using the document shapes above.

The public, read-only endpoints return:

```json
{ "vehicles": [{ "manufacturer": "Tesla", "models": [{ "name": "Model 3", "years": [2022, 2023, 2024, 2025, 2026] }] }] }
```

```json
{ "chargers": [{ "brand": "Wallbox", "models": ["Pulsar Plus", "Pulsar Max"] }] }
```

`GET /api/vehicles` and `GET /api/chargers` expose only those public fields; IDs,
ordering metadata and internal fields are excluded. Success responses use
`Cache-Control: public, max-age=300, s-maxage=300`; errors use `no-store`. Routes
remain dynamic so builds do not read MongoDB or bake in catalog snapshots.

Survey components fetch these endpoints through client-only loaders/hooks, show
accessible loading/failure messages with retry, and block selection submission
until data is available. Changing manufacturer clears model and year; changing
model clears year; changing charger brand clears its model. Loading and retrying
never reset saved answers. Historical options that have been removed remain
visible in disabled options and require a current valid choice when edited.

Shared Zod schemas validate structure, required fields and text limits without
database imports. Catalog refinements receive catalog data explicitly. Before
saving steps 2 and 6, the service queries MongoDB directly and validates the
selected combination, independent of client/proxy caches. Empty or unusable
catalogs fail closed. Declining a charger requires no catalog choice; the service
discards irrelevant charger fields, matching the checkbox's existing behavior.
Loading/resuming and completion of previously saved answers do not depend on a
new catalog read; completion still checks all required sections. This preserves
historical answers when catalog entries change.

## Admin Portal

Use the seeded administrator credentials to sign in at `/admin/login`.

Admin authentication stores normalized emails and bcrypt password hashes in the
`admins` collection. Admin sessions use opaque random tokens. Only a hash of the
session token is stored in MongoDB, and the raw token is sent only in an
`HttpOnly`, `SameSite=Lax` cookie with an expiration date. Production cookies use
the `Secure` flag. Logout invalidates the database session and clears the cookie.

Protected admin pages validate the real database session server-side. Admin API
routes also validate the database session independently.

The dashboard includes:

- total, completed and draft assessment counts
- completion percentage
- inactive draft count based on `DRAFT_INACTIVITY_DAYS`
- draft-only drop-off counts by last completed survey step
- recently submitted assessments
- server-side pagination, sorting, search and filters

Filters include draft/completed status, creation date range, last completed
step, customer name, email, vehicle manufacturer, vehicle model, and charger
purchase choice.

The assessment detail page displays all customer survey sections, status,
submission date, last activity date, missing sections, and internal admin notes.
Administrators can edit only first name, last name, email, phone number and
internal admin notes. Updates are validated with Zod and do not accept arbitrary
MongoDB update objects.

## Customer Resume Security

Resume tokens are generated as opaque random tokens. MongoDB stores only the
SHA-256 token hash. New draft creation sets an `HttpOnly` resume cookie and does
not return the raw token in the normal browser response.

Existing resume links with `assessmentId` and `resumeToken` query parameters
still work. The client exchanges the token for the `HttpOnly` cookie through the
resume endpoint and immediately removes the raw token from the address bar with
history replacement. The browser stores only the assessment id in localStorage so
refresh can restore the draft with the cookie-backed session.

## Checks

### Error handling architecture

Expected service failures use `Result<T, ServiceError>` from `src/types/result.ts`.
The error contains an application code, a safe message and optional validation
details. Services never choose HTTP statuses. Assessment lookup/save/submission,
admin login/session validation, admin detail/update and query parsing return
results; every API/page caller checks `success` before accessing `data`.

`src/app/api/_utils.ts` maps codes to HTTP statuses and retains the wire format
`{ error: { message, details? } }`. Codes and `success` flags are internal and do
not appear in API responses. As before, absent details are omitted from JSON;
Zod errors use `{ formErrors, fieldErrors }`. Existing error messages, successful
payloads, cookie behavior and authorization order are retained.

The remaining conventions are intentional:

- Repository lookups/conditional updates return documents or `null`; services
  interpret those storage outcomes as domain results. Infrastructure errors may
  throw and retain their original error object and stack.
- Operations with no expected business failure (draft creation, list/statistics
  retrieval, logout, password/token helpers and development-admin setup) return
  explicitly typed data or `void`. Their infrastructure/programming failures
  propagate; they do not need artificial success-only result wrappers.
- Services use Zod `safeParse`. HTTP boundary schemas may still use Zod `parse`;
  route catches format those validation errors centrally. `readJsonBody` returns
  an `INVALID_REQUEST` result for malformed JSON and propagates unexpected body
  read failures. It has no assessment-specific dependency.
- Server pages render expected failures through the existing error panels.
  Page authentication deliberately calls Next.js `redirect` outside a catch.
  API catches call Next.js `unstable_rethrow` before classifying/logging errors
  so framework control flow is preserved.
- MongoDB configuration failures use `DatabaseConfigurationError`; driver
  server-selection failures are classified by type in `src/lib/database-errors.ts`.
  `DATABASE_CONFIGURATION_ERROR` preserves the existing missing-variable 500
  responses; `DATABASE_UNAVAILABLE` preserves the server-selection 503 response.
  Other driver failures retain the generic 500 response. There is no error-message or
  error-name matching. Unknown failures return `An unexpected error occurred.`
  with 500. Route catches log the original error server-side (including its
  stack/cause); raw errors, credentials, database URLs and tokens are never
  serialized into error responses.

The baseline is commit `34f5799`, including the earlier `2f50fe2` fixes, the
AssessmentFlow/step and dashboard component extractions, shared display/ObjectId
helpers, protected-layout authentication, deterministic seed upserts and stable
sorting. This refactor retains those changes. Repository update filters, MongoDB
document schemas, survey behavior and admin field permissions are unchanged.

### Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The Vitest suite covers assessment validation, resume-token hash verification,
admin password verification, admin session expiration, admin update whitelisting,
assessment filter parsing and sorting, completion percentage calculation,
draft-only drop-off calculations, and seed timestamp ordering, deterministic
generation and idempotent upserts using an in-memory collection mock.

Error-handling tests exercise real service logic with mocked repositories across
all API routes: malformed JSON, Zod field/form errors, invalid credentials
(including bcrypt comparison for missing/inactive accounts), missing assessments,
conflicts, missing personal details, expired/invalid sessions, typed MongoDB
failures, original-error logging, safe unexpected responses, framework redirects
and unchanged successful payloads/cookies. Live MongoDB checks remain opt-in.

A small MongoDB integration smoke test is included but skipped by default. To run
it against a live test database:

```bash
RUN_MONGODB_INTEGRATION=true MONGODB_URI=mongodb://localhost:27017 MONGODB_DB_NAME=home_charging_assessment_test npm run test -- mongodbIntegration
```

Integration tests require all three variables explicitly, including a database
name containing `test`. They insert isolated assessment/catalog fixtures with
unique names and never reset a database or invoke the seed script. They also
verify live public catalog mapping and choice validation. Use a disposable test
database; fixtures are retained rather than deleting existing records.

Unit tests cover catalog public-field mapping and indexes, endpoint envelopes
and cache headers, dynamic combination validation, unavailable catalog save
guards, client dependency helpers, loading/error states, preserved selections,
dependency resets, and idempotent catalog upserts. They require no live MongoDB.

## Production Build

```bash
npm run build
npm run start
```

Set production MongoDB and cookie-related environment variables before starting
the application.

## Known Limitations

- Reminder emails are not implemented.
- Charger checkout and payment are not implemented.
- Local end-to-end workflow verification requires a running MongoDB database.
