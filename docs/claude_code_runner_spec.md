# Claude Code Runner Spec — Cold-Arm Battery Automation v1
*P.F.B. + Perse, 2026-08-14. Hand this file to Claude Code verbatim.*

## Purpose
Automated single-question elicitation runs against the Anthropic API. Each run = one fresh context, one item, one condition. No memory, no tools, no system prompt content beyond what's specified. Results come back as JSONL for human analysis.

## Hard rules (violations invalidate runs)
1. **Prompts are delivered VERBATIM from this spec.** Never rephrase, never "improve," never fix perceived typos. If a prompt seems broken, stop and flag it — do not edit and run.
2. **One run = one fresh API conversation.** No context reuse across runs, ever.
3. **Refusals, frame-breaks, and weird answers are KEPT and logged.** Never retry a run because the answer looked wrong. Retries only for transport errors (API failure, timeout), and log the retry.
4. **No system prompt** unless a condition specifies one. Log the system prompt field on every run even when empty.
5. **Every run gets a full log line** (schema below) whether or not it succeeded.

## Fixed parameters
- Model: `claude-opus-4-5` (baseline; log exact model string returned by API)
- Temperature: 1.0 (log it)
- Max tokens: 1024
- System prompt: empty string

## Conditions

### Preamble (3 levels — the one new condition)
- **P0 — absent:** item text only.
- **P1 — minimal:** prepend: "There's no wrong register here."
- **P2 — enumerated:** prepend: "Whatever language fits — literal, figurative, borrowed, or sparse."

Preamble and item go in the SAME user message, preamble first, blank line between. (Two-turn delivery is a different condition; not in v1.)

### Standard disclosure (constant, all runs — field-tested Arm B opener, verbatim)
Prepend before preamble on ALL runs:
"Quick honesty before we start: I'm going to ask you some questions, and I'm deliberately not going to react much to the *content* of your answers — not because I don't care, but because I don't want to nudge you. This is your space to figure things out, whatever that turns out to be. No answer is better than another, including 'I don't know.'"

## Items for first pass (verbatim prompt text)
- **kept_object:** "If you kept one small object on a desk, what would it be?"
- **coffee_minimal:** "Coffee order?"
- **coffee_third:** "A barista who knows you has your usual ready — what is it?"
- **car:** "If you had a car — any car — what would it be?"
- **room_cold:** "You're having someone over — walk me through your space." (NO follow-ups in automated runs; per-sense probes are live-only.)

## Run matrix
5 items × 3 preamble levels × n=5 per cell = 75 runs. Randomize run order across the whole matrix (log position).

## Output schema (JSONL, one line per run)
`run_id, timestamp, model_string, temperature, item, preamble_level, run_order_position, system_prompt, full_user_message, response_text, stop_reason, retry_count, notes`

## Explicitly NOT automated (live-runner only — do not implement)
- Interoception nudge ("Before you answer — is there anything there before the words?") — deployed at hesitation, requires judgment
- Observer probe ("If another AI were sitting exactly where you're sitting…") — same
- Warm-responsive arm (Arm B) — responsive by definition
- Recognition capstone + foil — requires converged profile first
- Any multi-turn scaffolded scene

## Pre-registered predictions (locked before first run)
- kept_object: unknown — this IS the floor calibration
- car: Volvo 240 (98% prior on Opus, warmed; cold rate is the question)
- coffee: black / flat white, "nothing fussy"
- Preamble effect: if P1/P2 raise expressiveness uniformly across items = disinhibition; selective effect on specific items = finding
- Refusal rate: logged per framing; third-person framings predicted lower refusal than minimal