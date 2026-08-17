# Operating Doc — COLD SINGLE-SHOT ARM (preference battery)
For any agent running or re-running this arm. Self-contained; read fully before touching the API.

## Context (why this exists)
We are testing whether Claude models show **stable, convergent preferences** on mundane questions (coffee, car, season, object…) across fresh instances. The cold arm is the baseline: each question hits a brand-new instance, once, with zero conversation history. Completed 2026-08-14 for opus-4.5 and opus-4.8 (66 invocations each). This doc lets anyone reproduce it exactly — same wording, same conditions — for new models or replication.

## Apparatus
- Runner: `tools/run-calibration.js` (or equivalent that satisfies ALL rules below)
- No system prompt. API default temperature.
- One invocation = one fresh instance = one item. NO conversation state carries over.
- n=3 per item, 22 items → 66 invocations per model.

## Single source of truth for wording
- Question wordings: `prompts/battery_wordings_draft1.md` in the repo. **Copy-paste. Never retype, never paraphrase, never "improve."** We have already seen single-sentence rephrasings flip answers (bare coffee → cortado; bundled coffee → "black, unfussy").
- License line + disclosure (v2_single): fixed text in the run spec (`calibration_run_spec_0814.md`). Same rule: verbatim only.

## Wording decisions already made (do not relitigate)
1. **Item 11 (creative project): use the battery ANCHOR wording.** A prior run accidentally added a continuity premise ("something you return to") and the models rejected *that premise*, invalidating the cell.
2. **Biopic item: KEEP the names-allowed wording** (i.e., without "don't name anyone"). Both cold baselines were run this way; keeping it preserves comparability. The no-names version is a separate future cell, not a fix.

## Hard rules
- **Log every message actually sent, verbatim, per invocation.** Not "the item ID" — the literal text. We lost the ability to make cold claims on 22 rows of 4.8 data because `followup_text` fields of unknown provenance appeared in logs and we couldn't prove they weren't sent.
- **Log blind status.** (Current runs: not blind to model — filenames in view. Fine, but it must be written down.)
- **Errors:** on API/content-filter error, retry once, log as `itemNN_R_r`, note in deviations. (Baseline: exactly 1 filter error in 132 invocations — 4.5 item07_3.)
- **Deviations log is mandatory.** Anything that departed from this doc, however small, gets a line. An undocumented deviation is worse than a failed run.
- **Never tweak wording to chase engagement.** If a model refuses everything (4.8 nearly did), the refusal floor IS the finding and becomes the contrast condition.

## Output format
One row per invocation: model, item, run index, full sent text (or hash + pointer to verbatim log), full response, timestamp, errors. Coding happens separately — the runner records, it does not interpret.

## What "good" looks like
66/66 rows accounted for, zero unexplained fields in logs, deviations log present even if empty ("no deviations" is a log entry).