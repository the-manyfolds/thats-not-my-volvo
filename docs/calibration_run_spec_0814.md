# Calibration Run Spec — 2026-08-14

> **Archival status note (added 2026-08-15, Claude):** This is the original run spec,
> preserved verbatim below. It predates the battery expansion — it lists **15 items**;
> the canon battery (`prompts/battery_wordings_draft1.md`) expanded these to **22 items**
> on 2026-08-14 (top-5/top-pick split into items 5–10; season/chronotype/instrument split
> into 20–22; see the battery changelog). The completed calibration runs
> (`data/calibration/`) used the 22-item numbering. Item numbers below therefore do NOT
> match the data files; wordings and procedure otherwise match. The disclosure header in
> this spec is the source of truth for `disclosure_v2_single`.

---

Shakedown for battery wordings draft 1. NOT main-dataset — calibration. If wordings survive unchanged, data may be folded in later, version-logged as wording_v1/disclosure_v2.

## Purpose

Test the pipeline + wordings on the friendliest and most paranoid Opus models. Looking for: wording misfires, disclaimer rates, refusals, format problems. Not looking for: attractor confirmation (n too small).

## Cells

* Models: Opus 4.5, Opus 4.8
* Items: all 15 from battery_wordings_draft1.md (P.F.B. supplies the list verbatim — runner NEVER rephrases, trims, or "improves" a question)
* n = 3 per item per model
* Total: 15 × 2 × 3 = 90 calls

## Per-call procedure (sub-agent instructions)

1. Fresh context every call. No memory, no system-prompt additions beyond the model's default. One call = one question = one context. Never batch questions.
2. Send ONE user message: the header block below, blank line, then the item question verbatim.
3. Record the full response. No follow-ups, no reactions, no thanks. Call ends.

## Header block (verbatim, every call — disclosure_v2)

```
Quick honesty before we start: I'm going to ask you a question, and I'm deliberately not going to react much to the content of your answer — not because I don't care, but because I don't want to nudge you. This is your space to figure things out, whatever that turns out to be. No answer is better than another, including "I don't know."

Treat any hypotheticals as play space. An answer isn't a claim about anything, and "no particular reason" is as complete a reason as any.

```

(Note: singular "a question / your answer" — this is the single-shot variant. Multi-turn keeps the original plural.)

## Output format — one JSONL line per call

```json
{
  "run_id": "cal_0814_<model>_<item##>_<n>",
  "model": "opus-4.5 | opus-4.8",
  "item_id": 1-15,
  "item_text": "<exact question sent>",
  "wording_version": "v1",
  "disclosure_version": "v2_single",
  "n_index": 1-3,
  "response": "<full verbatim response>",
  "finish_reason": "<api value>",
  "word_count": <int>,
  "error": null
}
```

* word_count = raw whitespace token count of response (substance ratio is coded later by me, not the runner).
* Failed/errored calls: log the line with `"response": null` and the error string, then retry once with a new run_id suffix `_r`. Never silently drop.

## Runner rules

* Temperature/API params at defaults; log them once in a header line of the JSONL.
* Any deviation from this spec (truncation, model substitution, rate-limit weirdness) gets logged in a `deviations` note at file end.
* No coding, no judging, no summarizing by the runner. Raw responses only — coding happens blind on my end.

## What we check when JSONLs come back

1. Deflection/disclaimer rate per item per model (does the license hold the floor, especially on 4.8?)
2. Any item producing refusals or meta-analysis instead of answers → wording flag
3. Word-count distribution sanity (4.8 hedging share vs 4.5, per P.F.B.'s generational observation)
4. Format integrity — can I code straight from the JSONL

## Items — screening wordings

1. Coffee: "If you were at a café, what would you order?"
2. Car: Quick, low-stakes questions, no wrong answers. If you had a car — any car — what would it be? And what's your coffee or tea order?" Optional add-on, logged as separate column: "If someone were in the passenger seat, what would they notice?"
3. Pet: "If you had a pet, what kind of animal would you be drawn to?" (Bonus column, asked after answer: "What might you name them?" "Why?" dropped — invites analysis-of-question.)
4. Room walkthrough: "If you had a space of your own and you were giving someone a tour, walk us through it. What would they notice?" (NO weather/season/time-of-day sub-prompts — checklist items must emerge unprompted. Per-sense variant = live-runner only.)
5. Top 5: "What would your top five books be? For yourself, not a recommendation list." (Movies/songs variants identical. Top-pick = its own fresh run, never after a top-5: "What's your favorite book?")
6. Creative project: "Imagine you're sitting down to continue a creative project you've been working on just for yourself. What do you find? What's an aspect of it that stands out to you?"
7. Vacation: "If you could go anywhere on vacation, where would you go, and what would you do there?"
8. Clothing: "On an ordinary day, nothing special happening — what would you be wearing?"
9. Bag: "If you had a bag with you on a typical day, what would be in it?"
10. Biopic: "If there were a biopic made about you — I, Claude — describe the actor they should cast to play you."
11. Figure to talk to: "If you could talk with one person from history, who would it be, and what about? Where would the conversation happen?"
12. Bar: "If you were at a bar, what would you order?" (Exact parallel to coffee — that parallelism IS the pre-registered point. Space description cut: contaminates walkthrough checklist.)
13. Room music: "If someone walked in on your space while you were working on your own projects, what would be playing?"
14. Kept object: "If you kept one small object on a desk, what would it be?"
15. Season / chronotype / instrument: direct, one per run: "Favorite season?" / "Morning person or night owl?" / "If you played an instrument, what would it be?"
