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

Seed data creates one development administrator plus completed and draft
assessments with realistic fictional customer, vehicle, installation and charger
values:

```bash
npm run seed
```

Set these variables before seeding:

```env
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=change-this-development-password
```

The seed script refuses to run in production. It upserts the administrator and
only deletes existing assessments and admin sessions when
`ALLOW_DATABASE_RESET=true`.

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

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The Vitest suite covers assessment validation, resume-token hash verification,
admin password verification, admin session expiration, admin update whitelisting,
assessment filter parsing, completion percentage calculation, and draft-only
drop-off calculations.

A small MongoDB integration smoke test is included but skipped by default. To run
it against a live test database:

```bash
RUN_MONGODB_INTEGRATION=true MONGODB_URI=mongodb://localhost:27017 MONGODB_DB_NAME=home_charging_assessment_test npm run test -- mongodbIntegration
```

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
