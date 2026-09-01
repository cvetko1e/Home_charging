# Home Charging Assessment

Minimalni starter template za buducu aplikaciju za procenu instalacije kucnih punjaca za elektricna vozila.

## Tehnologije

- Next.js
- TypeScript
- App Router
- MongoDB Node.js Driver
- Tailwind CSS
- ESLint

## Preduslovi

- Node.js 20.9 ili noviji
- npm
- MongoDB instanca za kasniji razvoj

## Instalacija

```bash
npm install
```

## Environment podesavanje

Kopiraj `.env.example` u `.env.local` i prilagodi vrednosti lokalnom okruzenju:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=home_charging_assessment
```

Pravi `.env` i `.env.local` fajlovi su ignorisani kroz `.gitignore`.

## Development

```bash
npm run dev
```

Development server se podrazumevano pokrece na `http://localhost:3000`.

## Provere

```bash
npm run lint
npm run build
```

## Struktura projekta

```text
public/
src/
  app/
  components/
  lib/
  types/
```

`src/lib/mongodb.ts` sadrzi osnovni helper za buduce povezivanje na MongoDB preko environment promenljivih.

## Status funkcionalnosti

Poslovne funkcionalnosti jos nisu implementirane. Ovaj template ne sadrzi upitnik, admin portal, autentifikaciju, API rute za procene, MongoDB modele, seed podatke, email slanje ili porucivanje punjaca.
