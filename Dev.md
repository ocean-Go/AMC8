# AMC 8 Learning System Development Log

## Objective

Deliver a usable learning system for Matt and Chris covering knowledge study,
past-paper mock exams, AI-assisted problem solving, mistake review, and a
source-linked contest library. Preserve a reproducible record of decisions,
quality checks, and acceptance results.

## 2026-06-11: Source audit

- Scanned `D:\AMC8`: 36 PDFs, 26 Markdown files, 197 PNGs, and one JPG.
- Confirmed 27 AMC 8 contest PDFs covering 1999-2020 and 2022-2026.
- Confirmed 2021 is not a missing local contest year.
- Found complete answer-key sections in 26 Markdown files.
- Identified OCR corruption in formulas, symbols, tables, and diagram order.
- Decision: PDFs remain the authoritative question source. Parsed answer keys
  may drive scoring only when all 25 answers pass validation.
- AoPS and Po-Shen Loh pages remain attributed source links. No third-party
  solution text or video is republished by the application.

## Phase 1: Data and engineering baseline

Status: complete.

- Created a Next.js 16, React 19, TypeScript, and Tailwind application under
  `platform/`.
- Added `scripts/import-materials.mjs`.
- Imported 27 PDFs into the application and generated
  `public/content/contests.json`.
- Validation result: 26 scored contests; 2026 practice-only.
- Defined typed models for contests, knowledge topics, attempts, mistakes,
  student state, and experiment events.
- Added 25-topic, six-domain AMC 8 curriculum map.

Acceptance:

- Import fails safely when an answer key is not exactly 25 choices.
- Source material directories are not modified.
- Production build can run without network fonts or cloud services.

## Phase 2: Core learning loop

Status: complete for local-family MVP.

- Independent browser-persisted profiles for Matt and Chris.
- Student dashboard and knowledge mastery controls.
- Past-paper PDF viewer, 40-minute timer, 25-item answer sheet, and scoring.
- Incorrect mock answers automatically enter the mistake notebook.
- Spaced-review schedule uses 1, 3, 7, 14, and 30-day intervals.
- Parent comparison view and admin dataset acceptance view.

Acceptance:

- Switching student profiles does not mix student state.
- Unverified contests return no score.
- A scored mock records attempt time, answers, score, and mistakes.
- Refreshing the browser restores local progress.

## Phase 3: AI and A/B experiment

Status: complete for MVP.

- Added built-in hints and worked explanations that require no API key.
- Added optional streaming MiniMax coach via its OpenAI-compatible API, AI SDK,
  and AI Elements.
- MiniMax CN endpoint: `https://api.minimaxi.com/v1`; default model:
  `MiniMax-M3`.
- `MINIMAX_BASE_URL` remains configurable for other MiniMax regions.
- M3 thinking output is disabled for student-facing responses.
- AI system instruction uses Socratic guidance and does not reveal the final
  choice on the first response.
- Added weekly crossover assignment:
  - A: progressive hint first.
  - B: parallel worked example first.
- Matt and Chris always receive opposite modes; assignments flip weekly.
- Event schema records variant, hint use, answer submission, correctness, and
  session completion.

Interpretation:

- Two students cannot support a conventional population-level significance
  claim.
- Compare each student against themself across alternating weeks.
- Primary metric: practice accuracy.
- Guardrails: completion rate, hint use, and observed time-on-task.
- Run at least four weeks before interpreting a directional result.

## Automated acceptance

Status: passed on 2026-06-11.

Commands:

```powershell
cd D:\AMC8\platform
npm run verify
npx playwright install chromium
npm run test:e2e
```

Unit coverage includes:

- Exact contest scoring and unverified-contest behavior.
- Review interval progression.
- Mastery averaging.
- Opposite A/B assignment and weekly crossover.

Browser acceptance includes:

- Student navigation through dashboard, curriculum, mock, and AI coach.
- Parent and admin role views.
- Dataset acceptance visibility.

Final results:

- Material import: 27 PDFs, 26 validated answer keys.
- ESLint: passed.
- Vitest: 8 tests passed.
- Next.js production build: passed.
- Playwright Chromium: 4 end-to-end tests passed.
- Browser acceptance runs against an isolated production server on
  `http://localhost:3100`.

## 2026-06-11: AI solution paper MVP

Status: implemented and accepted locally.

MVP scope:

- Added a touch, pen, and mouse compatible canvas for solving one selected
  guided-practice problem.
- Records normalized stroke coordinates, elapsed time, active writing time,
  pauses of at least five seconds, undo count, eraser use, and stroke count.
- Supports pen, eraser, undo, clear, and accelerated process replay.
- Saves each report independently under the active Matt or Chris profile.
- Sends the final PNG and process metrics to MiniMax M3 through the MiniMax CN
  OpenAI-compatible endpoint.
- Requests a structured report containing approach summary, clear steps,
  unclear steps, likely errors, strengths, a next action, and a confidence
  level.
- Falls back to a clearly labeled process-only local report when the API key is
  absent or the model request fails.

Acceptance:

- Drawing two strokes and submitting produces a report and one saved history
  record.
- Existing browser data migrates safely when `solutionPapers` is absent.
- Canvas coordinates remain stable when the visible canvas is resized.
- Mobile and desktop layouts keep the question selector, canvas, tools, report,
  and history inside their cards.
- Process metric unit tests cover pauses, erasing, undo counts, and empty input.

MVP boundary:

- MiniMax analyzes the final written image together with aggregate process
  metrics. It does not yet receive a frame-by-frame video of every stroke.
- Reports and stroke data remain in browser `localStorage`; there is no
  cross-device sync or parent-side playback archive yet.
- The local fallback cannot read handwriting and must not be presented as a
  mathematical correctness review.

Release:

- Feature commit: `5d14b7a` (`Add AI solution paper MVP`).
- Production URL: `https://platform-rho-gilt.vercel.app`.
- Production deployment reached Vercel `READY` state.
- A 390x844 production smoke test opened the solution paper successfully and
  reported no browser console errors.
- No production environment variables were configured at release time.
  Consequently, the deployed solution paper currently uses the local
  process-only fallback until `MINIMAX_API_KEY` is added in Vercel.

## 2026-06-11: MiniMax production activation

- Confirmed `MINIMAX_API_KEY` is encrypted in Vercel for Preview and Production.
- Added `/api/ai-status`, which reports configuration readiness without
  exposing the key.
- AI Coach now displays `MiniMax coach active` when the production runtime can
  see the key, and `Local coaching only` when it cannot.
- The text Coach is intentionally not labeled `MiniMax vision`; that label is
  reserved for solution-paper image analysis.

Security audit:

- `npm audit --omit=dev` reports two moderate findings in the PostCSS version
  bundled by Next.js 16.2.9.
- npm's proposed forced fix incorrectly downgrades Next.js to 9.3.3, so it was
  not applied. Track the patched upstream Next.js release and upgrade normally;
  do not use `npm audit fix --force` for this finding.

## Known limitations

- 2026 answer key still requires source verification.
- OCR question text is quarantined; searching individual historical questions
  by text is not yet enabled.
- Only eight original guided-practice questions are seeded in the MVP.
- Progress is local to one browser. Cloud sync requires authentication and a
  hosted database.
- A real MiniMax API key is required for live AI chat; built-in coaching remains
  available without it.
- A real MiniMax API key is required for handwriting interpretation in AI
  solution paper; its process capture and local metrics work without one.

## Next production upgrades

1. Human-verify 2026 answers and release scoring.
2. Build a reviewed, structured 675-question dataset with topic and difficulty
   labels.
3. Add authenticated cloud sync and administrator content correction.
4. Add weekly experiment summaries after enough crossover sessions accumulate.
5. Add sampled stroke-frame analysis and compare its feedback quality with the
   final-image MVP before adopting full process-video analysis.
