# Northstar AMC 8

An adaptive AMC 8 learning system for Matt and Chris. It combines a complete
knowledge map, past-contest mock mode, automatic scoring, an AI coach, a
spaced-review mistake notebook, and parent/admin oversight.

## Run locally

Requirements: Node.js 20.9 or newer.

```powershell
cd D:\AMC8\platform
Copy-Item .env.example .env.local
# Add MINIMAX_API_KEY only when AI chat is needed.
npm install
npm run dev
```

Open `http://localhost:3000`.

The repository already contains the application-ready contest dataset. The
optional `npm run import:materials` command rebuilds it only when the original
local `Material/` and `amc8-markdown/` folders are available.

The built-in hints, practice, mock scoring, knowledge map, and mistake notebook
work without an API key. Student data is stored in the current browser using
`localStorage`.

## Verification

```powershell
cd D:\AMC8\platform
npm run verify
npx playwright install chromium
npm run test:e2e
```

`verify` re-imports the local materials, runs ESLint and unit tests, and creates
a production build.

## Content model

- 27 AMC 8 PDFs: 1999-2020 and 2022-2026.
- 26 complete answer keys imported from the local Markdown files.
- 2026 is available as timed practice until its answer key is verified.
- 25 curriculum topics across six AMC 8 domains.
- Original AMC 8-style practice questions for guided coaching.

The PDF is the authoritative question display. OCR text is intentionally not
used for automatic scoring because formulas and diagrams contain extraction
errors.

## A/B crossover

Matt and Chris receive opposite coaching modes and switch every calendar week:

- Variant A: progressive hints first.
- Variant B: parallel worked example first.

The application records answer accuracy, hint use, and session completion per
student and variant. With only two learners, results are treated as
within-student directional evidence, not statistical significance.

## Deployment

The application is a standard Next.js project and can be deployed to Vercel.
Set `MINIMAX_API_KEY` and optionally `MINIMAX_MODEL` in the deployment
environment. The default China-region endpoint is
`MINIMAX_BASE_URL=https://api.minimaxi.com/v1`. Browser-local learning records
do not automatically follow a user to another device; a hosted database is the
next production upgrade.

See [Dev.md](Dev.md) for implementation decisions, test acceptance, and known
limitations.
