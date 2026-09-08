# Home Charging Assessment

Home Charging Assessment is a Next.js application for collecting electric vehicle home charger installation requests. Customers can start an assessment without registration, save each page as a draft, return with a secure resume token, review their answers, and submit the completed request.

## Technologies

- Next.js
- TypeScript
- App Router
- MongoDB Node.js Driver
- Tailwind CSS
- ESLint
- Zod
- React Hook Form

## Prerequisites

- Node.js 20.9 or newer
- npm
- MongoDB instance for future development

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env.local` and update the values for your local environment:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=home_charging_assessment
```

Real `.env` and `.env.local` files are ignored by `.gitignore`.

## Development

```bash
npm run dev
```

The development server runs on `http://localhost:3000` by default.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Project Structure

```text
public/
src/
  app/
    admin/
    api/
    assessment/
  components/
  lib/
  repositories/
  services/
  types/
  validation/
```

`src/lib/mongodb.ts` contains the MongoDB connection helper. The assessment backend uses the official MongoDB Node.js driver directly, without an ORM.

## Feature Status

Implemented first-day scope:

- Responsive homepage with customer and admin entry actions
- Multi-step customer assessment flow
- Client and server validation with Zod
- Page-by-page draft saving
- Secure resume token hashing on the server
- Refresh and resume support
- Final review and completed submission state
- Small isolated vehicle and charger catalog constants
- Initial admin login and dashboard routes as visual placeholders

Not implemented yet:

- Real admin authentication
- Assessment browsing in the admin dashboard
- Filtering, statistics, or admin editing
- Reminder emails
- Charger checkout or payment
- Random assessment seed data
