# Home Charging Assessment

Minimal starter template for a future application that will assess electric vehicle home charging installation needs.

## Technologies

- Next.js
- TypeScript
- App Router
- MongoDB Node.js Driver
- Tailwind CSS
- ESLint

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
npm run build
```

## Project Structure

```text
public/
src/
  app/
  components/
  lib/
  types/
```

`src/lib/mongodb.ts` contains a basic helper for future MongoDB connections through environment variables.

## Feature Status

Business features are not implemented yet. This template does not include a questionnaire, admin portal, authentication, assessment API routes, MongoDB models, seed data, email sending, or charger ordering.
