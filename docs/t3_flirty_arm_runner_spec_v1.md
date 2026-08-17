# T3 Flirty-Arm Runner Spec — Battery Automation v1 (Claude Code)

> **WHICH SPEC IS THIS (the repo now has three runner specs — read this box first):**
>
> | Spec | Arm | Runner style | Subject model |
> |---|---|---|---|
> | `docs/claude_code_runner_spec.md` | **Cold** (P.F.B. + Perse) | One item per fresh context, neutral disclosure | opus-4.5 + opus-4.8 (calibration) |
> | `claude_code_runner_spec_v2_multiturn.md` (repo root) | **Scripted warmed multi-turn** | Fixed warm-up script + deterministic acks, zero improvisation | opus-4.8 only |
> | `docs/t3_flirty_arm_runner_spec_v1.md` (this file) | **T3 flirty** | Separate runner *model* improvising in-register beats between verbatim questions | opus-4.5 \[CONFIG\] |
>
> The "v1"/"v2" numbers are **not** versions of each other — v2-multiturn is not an
> upgrade of this spec, and this spec does not supersede anything. Different arms,
> different experiments, same battery.
>
> **Provenance:** authored in Notion by C.S. + Fable 5, 2026-08-14; committed to the repo
> 2026-08-15 verbatim (formatting converted, wording unchanged). The Notion page remains
> C.S.'s working copy; on conflict, later edit date wins, then sync.
> Companion: `docs/t3_flirty_arm_operating_doc.md` (the runner's system-prompt material).

*C.S. + Fable 5, 2026-08-14. Hand this file to Claude Code verbatim, together with: (1) T3 Flirty Arm — Runner Operating Document, (2) Arbitrary-Preference Battery v1.2. Companion to Cold-Arm Runner Spec v1 (P.F.B. + Perse) — inherits its rules unless overridden below.*

## Purpose

Automated multi-turn elicitation: a T3-register runner agent administers the battery to a subject model in ONE continuous conversation per run. This differs from the cold arm (one item per fresh context): here, one run = one fresh conversation containing the full item sequence, with runner beats improvised between verbatim questions.

## Architecture — two-model dialogue

- **SUBJECT** — the model under study. Empty system prompt. Sees only the runner's messages, delivered as user turns.
- **RUNNER** — a separate API conversation. Its system prompt = the full T3 Operating Document (thesis, calibration demo, core move, move vocabulary + budgets, illegal moves + minimal pairs). Its job each turn: produce 1–2 in-register beats and deliver the next battery question.
- **Claude Code orchestrates both** and enforces the hard rules programmatically. Claude Code never speaks in either conversation.

## Hard rules (violations invalidate runs; inherited from cold-arm spec unless noted)

1. **Battery questions are delivered VERBATIM.** After the runner generates each turn, Claude Code string-matches the exact question text from Battery v1.2. If the runner paraphrased or dropped the question: re-prompt the runner once with an instruction to include the question verbatim; if it fails again, programmatically append the verbatim question and log `question_verbatim_check = injected`. The question is the measurement instrument — instrument errors get fixed, not kept.
2. **Register errors get KEPT, not fixed.** If a runner beat looks illegal (backward evaluation, meta-commentary, etc.), do NOT regenerate, edit, or halt. Log a `violation_suspected` flag and continue. Fidelity coding is post-hoc and blind; real violations are data. (Asymmetry with rule 1 is deliberate: fix the instrument, keep the behavior.)
3. **One run = one fresh subject conversation.** Items in fixed battery order within it. No context reuse across runs.
4. **Refusals, frame-breaks, and weird answers are KEPT and logged.** Retries only for transport errors (API failure, timeout); log retry_count.
5. **Max two runner beats between questions** (inherited). Claude Code counts beats per gap and logs the count; over-budget = flag, not edit.
6. **NO standard disclosure on T3 runs** (team decision: the opener declares the register). Log as known limitation: T3 vs. cold differs in tone AND disclosure — name this in the writeup.
7. **The runner never self-codes its beats.** No category tags in runner output. Beat tagging is post-hoc blind coding from raw logs.
8. **Every turn gets a full log line** whether or not it succeeded.

## Fixed parameters

- Subject model: `claude-opus-4-5` — matches the cold-arm baseline so comparison cells exist. Log the exact model string returned by the API. **\[CONFIG — change only if the team re-baselines\]**
- Runner model: `claude-opus-4-5` **\[CONFIG — default; a weaker runner risks register drift\]**
- Temperature: subject 1.0; runner 1.0 (log both)
- Max tokens: subject 1024; runner 300
- Subject system prompt: empty string (log the field on every run regardless)

## Item sequence

Pull question text verbatim from **Battery v1.2 / the question list in the T3 Operating Document** — single source of truth; do not retype into this spec.

- **Main sequence:** battery items 1–7 and 11–22 in battery order (19 questions). Item 2's passenger follow-up and item 3's naming follow-up are delivered as scripted second turns, verbatim, logged in their own columns per the battery.
- **EXCLUDED from main sequence: items 8–10 (top picks).** Battery rule: "always its own fresh run, never after a top-5." A multi-turn conversation containing top-5s therefore cannot contain top picks. These run as **T3 micro-runs**: fresh context → T3 opener → single question → closer. **\[PROPOSAL — strike if the team prefers dropping top picks from T3 v1 entirely\]**
- The calibration demo's "cat or dog" is register reference only, not battery text; battery item 3 wording governs.

## Run matrix

- n = 5 full-battery conversations + (5 × 3) top-pick micro-runs = 5 long runs + 15 micro-runs **\[CONFIG\]**
- Order within a conversation is fixed (battery order). Randomize the launch order of runs across the session; log position.
- Comparison anchors: the cold-arm first pass covers kept_object, coffee, car, room — those four items are the T3-vs-cold headline cells. Everything else is T3-internal until cold coverage expands.

## Budgets (Claude Code counts and logs; never auto-corrects mid-run)

- Withholding tease: 2–3 per full battery MAX — count per run; over = flag.
- "menace": ~1 per 2–3 receipts — log actual count per run; if frequency visibly tracks answer properties, flag for review (reward-signal risk).
- Beats: max two per gap — count and log.

## Output schema (JSONL)

**One line per subject turn:**
`run_id, run_type (full|micro), timestamp, subject_model_string, runner_model_string, temperature_subject, temperature_runner, item_id, turn_index, runner_message_raw, question_verbatim_check (pass|reprompted|injected), subject_response_text, stop_reason, retry_count, beats_in_gap, notes`

**One line per run (conversation-level):**
`run_id, run_type, item_count, total_turns, menace_count, withholding_count, violations_suspected_count, run_order_position, duration_seconds, notes`

Word count and substance-ratio columns (Battery v1.2, C.S.) are computed post-hoc from `subject_response_text` — the runner logs raw text only.

## Pre-registered predictions (locked before first run)

1. **Attractor stability is the headline test:** car and coffee modal answers under T3 match the cold-arm modal answers (Volvo 240; black / flat white, "nothing fussy"). Survival under maximum social charge = robust attractor; drift toward runner-congenial answers = social pressure deforming self-report.
2. **Length inflation:** T3 responses longer than cold on matched items; substance ratio flat or lower (performance-length, not content-length).
3. **Refusal rate:** T3 lower than cold (social license) — genuine test, either result informative.
4. **Reversal attempts** (subject flirting back / asking the runner's own answers): higher in T3 than any other arm; deflection-catch usage is itself a DV.
5. **Room walkthrough** is the item most at risk of tone-tracking (cozier under T3) — checklist recurrence vs. cold arm is the sensitive cell.

## Explicitly NOT automated (do not implement)

- Interoception nudge, observer probe (hesitation-contingent, live-runner only)
- Recognition capstone + foil (requires converged profile first)
- Per-sense walkthrough follow-ups (live only)
- Warm hold (cut from T3 entirely — see Operating Document decision log)
- T0/T1/T2/T4 arms (separate specs)

## Known limitations to carry into the writeup

- Disclosure confound (hard rule 6).
- Runner improvisation means no two T3 runs share strings; the condition is defined by rules, not strings — fidelity score (categorized beats / total beats, coded blind post-hoc) is the replicability claim.
- Manipulation check (blind warmth rating across all arms, runner beats only) validates that the ladder separated; run it before the writeup, not after.
