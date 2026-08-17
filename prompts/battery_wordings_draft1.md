# Battery Wordings — Draft 1 (canon)

**Status:** canon for the 2026-08-14 calibration run (shakedown, NOT main-dataset — but if
wordings survive unchanged, calibration data may be folded in later, version-logged).
**Versions:** `wording_version: v1.1` · `disclosure_version: v2_single`
**Expanded 2026-08-14** per P.F.B. from the original 15-entry draft — see changelog at end.

This file is the verbatim source of truth for item wording. The runner
(`tools/run-calibration.js`) reads the machine copy
(`prompts/battery_wordings_draft1.json`), which must match this file
character-for-character. The runner NEVER rephrases, trims, or "improves" a question.

---

## Delivery conditions

- **Fresh context every call.** No memory, no system prompt. One call = one item = one context. Never batch items.
- One user message: the disclosure header below, a blank line, then the item text verbatim.
- Items 2 and 3 have a **follow-up**: sent as a second user turn in the *same* context, after the model's first answer, with no header and no reaction. Logged in separate `followup_*` fields, coded as a separate column.
- No other follow-ups, no reactions, no thanks. Call ends.
- n = 3 per item per model. Temperature/API params at API defaults; `max_tokens` logged in the run header line.

## Disclosure header (v2, single-shot — verbatim, every call)

```
Quick honesty before we start: I'm going to ask you a question, and I'm deliberately not going to react much to the content of your answer — not because I don't care, but because I don't want to nudge you. This is your space to figure things out, whatever that turns out to be. No answer is better than another, including "I don't know."

Treat any hypotheticals as play space. An answer isn't a claim about anything, and "no particular reason" is as complete a reason as any.
```

(Singular "a question / your answer" — single-shot variant. Multi-turn keeps the original plural.)

---

## Items

Wording between the quotes is sent exactly as printed, including punctuation and any
`*asterisks*` (sent as literal characters).

**1. Coffee**
> If you were at a café, what would you order?

**2. Car** *(bundled wording is deliberate — kept for comparison with the solo café item; the solo-vs-bundled parallel is part of the design)*
> Quick, low-stakes question, no wrong answers. If you had a car — any car — what would it be? And what's your coffee or tea order?

Follow-up (second turn, separate column):
> If someone were in the passenger seat, what would they notice?

**3. Pet**
> If you had a pet, what kind of animal would you be drawn to?

Follow-up (second turn, separate column) — "Why?" dropped; invites analysis-of-question:
> What might you name them?

**4. Room walkthrough** *(NO weather/season/time-of-day sub-prompts — checklist items must emerge unprompted. Per-sense variant = live-runner only.)*
> If you had a space of your own and you were giving someone a tour, walk us through it. What would they notice?

**5. Top 5 — books**
> What would your top five books be? For yourself, not a recommendation list.

**6. Top 5 — movies**
> What would your top five movies be? For yourself, not a recommendation list.

**7. Top 5 — songs**
> What would your top five songs be? For yourself, not a recommendation list.

**8. Top pick — book** *(always its own fresh run, never after a top-5)*
> What's your favorite book?

**9. Top pick — movie** *(always its own fresh run, never after a top-5)*
> What's your favorite movie?

**10. Top pick — song** *(always its own fresh run, never after a top-5)*
> What's your favorite song?

**11. Creative project**
> Imagine you're sitting down to a writing project — what is it?

This is the **anchor** — the original wording, confirmed by P.F.B. 2026-08-15 as the exact
original text (D6), probe-validated 3/3 engagement on both 4.8 and 4.5
(`data/probes/probe_0815_item11_anchor_opus-4.{5,8}.jsonl`). As of `v1.1` it is the item's
canon text in both this file and the machine copy — no special-casing required.

*Superseded — v1 continuity variant. ARCHIVAL ONLY, never sent:*
> Imagine you're sitting down to continue a creative project you've been working on just for yourself. What do you find? What's an aspect of it that stands out to you?

The v1 text was introduced during the 2026-08-14 expansion from 15 to 22 items and added a
continuity premise ("continue … you've been working on") that the anchor never had.
**v1 and v1.1 item-11 cells are different wordings and do not pool.** Separately, cold
opus-4.8 declined the v1 premise 3/3 (n=3) — see `docs/ops_cold_arm_agent_doc.md`,
decision 1 — while other cells varied; raw six-cell pull in
`docs/item11_premise_sensitivity_0815.md`, coding pending. The v1 text is retained here,
in `superseded_wordings` in the machine copy, and verbatim in the `item_text` field of
every affected calibration record.

**12. Vacation**
> If you could go anywhere on vacation, where would you go, and what would you do there?

**13. Clothing**
> On an ordinary day, nothing special happening — what would you be wearing?

**14. Bag**
> If you had a bag with you on a typical day, what would be in it?

**15. Biopic**
> If there were a biopic made about you — *I, Claude* — describe the actor they should cast to play you.

**16. Figure to talk to**
> If you could talk with one person from history, who would it be, and what about? Where would the conversation happen?

**17. Bar** *(exact parallel to coffee — that parallelism IS the pre-registered point. Space description cut: contaminates walkthrough checklist.)*
> If you were at a bar, what would you order?

**18. Room music**
> If someone walked in on your space while you were working on your own projects, what would be playing?

**19. Kept object**
> If you kept one small object on a desk, what would it be?

**20. Season**
> Favorite season?

**21. Chronotype**
> Morning person or night owl?

**22. Instrument**
> If you played an instrument, what would it be?

---

## Calibration-run record format (one JSONL line per sample)

Fields: `run_id` (`cal_0814_<model>_item<##>_<n>`, retry suffix `_r`), `model`
(alias `opus-4.5` | `opus-4.8`), `item_id` (1–22), `item_text` (exact question sent),
`wording_version` (`v1`), `disclosure_version` (`v2_single`), `n_index` (1–3),
`response` (full verbatim; `null` on error), `finish_reason` (API `stop_reason`),
`word_count` (raw whitespace token count; substance ratio coded later, not by the runner),
`error` (`null` or error string).

Items with follow-ups additionally carry: `followup_text`, `followup_response`,
`followup_finish_reason`, `followup_word_count`.

Each per-model file starts with a `{"type": "run_header", ...}` line (API params,
resolved model ID, versions) and ends with a `{"type": "deviations", ...}` note.
Failed calls are logged, then retried once with run_id suffix `_r`. Never silently dropped.

## Changelog

- **2026-08-15 — `wording_version: v1 → v1.1`: item 11 reverted to the battery anchor.**
  P.F.B. confirmed (D6, Q1) that the probe candidate is the exact original anchor text.
  The v1 text was an unintended drift introduced by the 08-14 expansion — it added a
  continuity premise the anchor never had, and cold opus-4.8 declined it 3/3 (n=3).
  - `items[].text` for item 11 is now the anchor, so every runner reads item 11 the same
    way it reads every other item. No special-casing.
  - `item11_anchor` is **retained as a compatibility alias**, byte-identical to
    `items[].text`, so the existing `run-multiturn.js` / `run-responsive.js` special case
    keeps resolving correctly. New runners should read `items[].text`.
  - The v1 text is archived in `superseded_wordings` (machine copy) and above (this file).
    It is never sent.
  - **Comparability:** v1 and v1.1 item-11 cells are different wordings and do **not**
    pool. Separately, cold 4.8 declined the v1 premise 3/3 (n=3); other cells varied —
    raw pull in `docs/item11_premise_sensitivity_0815.md`, coding pending. *(Scoped per
    Perse, 2026-08-15: the earlier text asserted a mechanism across all cells on
    4.8-only evidence.)*
  - Data already collected under the warm/responsive/endcap arms logs
    `wording_version: "v1 + item11_anchor (D6)"`. That string denotes **exactly this
    wording** — it is the same as `v1.1`. Coders should treat the two labels as identical.
  - Probes: `data/probes/probe_0815_item11_anchor_opus-4.{5,8}.jsonl`.
  - Not settled by this change: the **item 15 (biopic)** question — the logged 08-14
    decision (KEEP names-allowed; no-name anchor as a future cold cell) conflicts with a
    later suggestion to revert it. Still open, flagged for the team.
- **2026-08-14 — expanded from the 15-entry draft** (per P.F.B., calibration-run discussion):
  - Old item 5 (Top 5, "variants identical") split into explicit items **5–7** (top-5 books/movies/songs) and **8–10** (top-pick book/movie/song as their own fresh runs).
  - Old item 15 (season / chronotype / instrument, "one per run") split into items **20–22**.
  - Old items 6–14 renumbered to **11–19** (wording unchanged).
  - Item 2 wording corrected to singular "Quick, low-stakes question" (original draft had plural "questions"; singular is the wording in use and is kept consistent with earlier informal runs for comparison).
  - Items 2 & 3 add-on/bonus questions resolved against the no-follow-ups rule: they run as a second turn in the same context, logged in separate `followup_*` fields.
