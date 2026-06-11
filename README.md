# Northstar AMC 8

A single-user AMC 8 training system for Matt.

- Target exam: January 22, 2027
- Official target: 20/25 correct
- Internal practice target: 21-22/25
- Target readiness score: 85/100

The product is organized around one question: what is preventing Matt from
reliably reaching 20 correct answers?

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

The built-in hint ladder, practice, mock scoring, knowledge map, toolbox, error
analysis, readiness score, and mistake notebook work without an API key. Matt's
data is stored in the current browser using `localStorage`.

## Matt readiness

The dashboard estimates a readiness score and predicted correct-answer range
using:

- Knowledge mastery: 25%
- Problem-solving toolbox: 25%
- Accuracy: 20%
- Speed: 15%
- Independence: 10%
- Review discipline: 5%

The estimate is directional, not a psychometrically validated score. It becomes
more useful as Matt completes real mocks and coached practice.

## AI solution paper

AI Solution Paper is a Thinking Replay system rather than a saved scratchpad.
Matt starts the timer before writing, which allows the system to detect whether
he became stuck before choosing a strategy.

Each saved paper includes:

- Multiple-choice answer selection with immediate correct/incorrect feedback.
- Deterministic stroke replay with play, pause, restart, and 1x/2x/4x speed.
- A draggable timeline with long-pause, very-long-pause, erase, undo, clear,
  answer-check, and save markers.
- Active writing time, idle time, revision metrics, and pause metrics.
- Rule-based process classification: smooth, slow start, frequent revision,
  long stuck, minimal work, rushed, or unknown.
- An evidence-based Think, Plan, Execute, Verify timeline with confidence labels.
- A short AMC8-focused next action that works without AI.
- One-click transfer of the replay summary into AI Coach context.

Tablet and phone handwriting support includes pressure-sensitive pen width,
coalesced pointer sampling, basic palm rejection, larger touch targets, three
pen sizes, a full-screen focus mode, and a quick answer dock below the canvas.

MiniMax Vision is an optional enhancement. When requested, it receives the
final reconstructed page, question, correct and selected answers, local replay
summary, phase timeline, and marker summary. Local phase labels are timing
inferences, not handwriting recognition. The interface labels handwriting
analysis as Vision only after MiniMax succeeds. A failed or unavailable Vision
request never removes the local process report.

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

## AI coach

The coach uses a fixed five-level hint ladder: Understand, Tool, Strategy, Key
Step, and Full Solution. Answers are not revealed below level five. Hint use is
recorded and contributes to Matt's independence score.

## Backup

Use `Export backup` in the sidebar to download Matt's complete JSON record,
including mock attempts, mistakes, solution papers, AI reports, practice
attempts, and readiness history. Cloud sync is intentionally deferred until the
training behavior has been validated.

## Deployment

Production URL: `https://amc8-mc.vercel.app`.

The application is a standard Next.js project and can be deployed to Vercel.
Set `MINIMAX_API_KEY` and optionally `MINIMAX_MODEL` in the deployment
environment. The default China-region endpoint is
`MINIMAX_BASE_URL=https://api.minimaxi.com/v1`. Browser-local learning records
do not automatically follow Matt to another device. Supabase is the planned
production storage upgrade after several weeks of real use.

See [Dev.md](Dev.md) for implementation decisions, test acceptance, and known
limitations.
