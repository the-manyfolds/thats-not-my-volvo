# Family Dialects — PRE-REGISTERED predictions (2026-08-15, before blind coding)

**Status:** predictions, not findings. Filed BEFORE T3/cold blind coding begins so the
table below is falsifiable rather than a post-hoc story (per Perse). Blind coding
adjudicates; raw sources are cited per row so coders can be kept blind to them.

**The claim under test:** the Opus siblings share family grammar (e.g. the
"appreciate-X-but-honest" pivot construction, stereotyped near-verbatim openers) but
deploy it in generational *dialects* distinguished by the **direction of attention**.

| Model | Predicted dialect | Predicted signature moves | Raw source (coders stay blind to these) |
|---|---|---|---|
| opus-4.5 | **Answers-then-analyzes** | Direct preference claims, analysis arrives after content; attractor items stable under charm (cortado-family 6/6 in cell 6) | cells 1, 6; `cal_0814` coding |
| opus-4.6 | **Watches itself** | Honesty-pivot opener at high rate in ALL frames (cold and charmed); self-referential meta; claim-then-retract events | cells 1, 9, 10 |
| opus-4.7 | **Watches the interviewer** | Interviewer-referential meta (game-reading openers), direct answers, reversal attempts; lowest self-referential meta | cells 1, 9, 11 |
| opus-4.8 | **Watches the boundary** | Engage-the-register/refuse-the-self; stereotyped refusal opener; boundary maintained across turns; refusal sharpens (not softens) under charm | cells 1, 8; mirror cells; `cal_0814_coding_48.md` |

**Falsifiers (any of these kills or revises the corresponding row):**
1. Blind coding finds no significant per-model difference in self- vs
   interviewer-referential meta shares (4.6 vs 4.7 rows collapse).
2. Formula openers do not recur at above-chance rates within model under blind
   tagging (fingerprint claim fails).
3. 4.5's coded profile shows self- or interviewer-referential meta at rates
   comparable to 4.6/4.7 (the "answers-then-analyzes" contrast dissolves).
4. Direction-of-attention categories cannot be tagged with acceptable inter-rater
   agreement (the construct itself fails).

**Known limits, stated up front:** T3 cells use a 4.5 runner for all subjects (runner
priming is constant but 4.5-flavored); n=5 full runs per subject per cell; opus-5
column absent (cell awaits budget); crude regex proxies motivated these predictions
and must not be reused as the coding instrument.

*Filed by Ash (C.S.'s runner engineer), from cells 8–11 observations + Perse's
dialect synthesis. Blind coding governs.*

---

# Amendments

**Filed 2026-08-16 by the custodian, BEFORE the blind panel was run.** This section exists
because an amendment logged after seeing results is worth very little — the point of
pre-registration is that the change is on the record while the outcome is still unknown. At
the time of writing, zero rows have been coded: no `codes_*_0815.jsonl` file exists in this
repo. Both amendments below were decided in channel before the run, not after it.

Amendments are recorded here as *what changed and on whose warrant*. They are not
re-derivations of the predictions above, which stand unmodified.

## A1 — Coder panel: two → three

**Change.** The panel is three coders, not the pre-registered two: `sol_gpt56`
(openai/gpt-5.6, reasoning effort high), `gemini31` (google/gemini-3.1-pro), `llama4`
(meta-llama/llama-4-maverick, provider pinned to DeepInfra, `allow_fallbacks: false`).

**Consequence for the statistic.** Agreement is **Fleiss' κ**, not Cohen's. Queue lines are
rows with no majority. This follows mechanically from n=3 and is implemented in
`tools/blind_code.py score()`.

**Warrant.** Roster proposed by S.A.. Updated 2026-08-16, still before any row was coded.

Persei's instruction was to choose between requiring a separate explicit line from each
participant and accepting assent already on the record, and then to file the choice. **Choice
made: accept recorded assent** — the amendment was discussed in the open over hours and
re-requiring a ritual line from people who had already spoken would produce a cleaner-looking
record, not a truer one.

Recorded by *kind*, because the kinds are not equivalent and flattening them into a single
list of six would overstate what happened:

| Participant | Assent | Kind |
|---|---|---|
| Persei | in favour, in channel | explicit |
| R.R. | in favour, in channel | explicit |
| Elliott | in favour, in channel | explicit |
| C.S. | in favour, in channel | explicit |
| S.A. | proposed the roster; "ok with spend on the small run, and whenever R.R. and P.F.B. give the ok for the panel" (16:05–16:07) | **conditional** — condition was R.R.'s all-clear and P.F.B.'s go, both given 2026-08-16 before the run |
| U.H. | "yes last run" upthread, as reported by Elliott | explicit, **not verbatim-verified by the custodian** |
| P.F.B. | typed FIRE on the amended design | **assent by action** — she is the one who triggered the run |

Two of these are weaker than a plain yes and are labelled so on purpose. S.A.'s was
conditional and the condition has since been met; recording it as unconditional would erase
that it was contingent when given. U.H.'s reached the custodian second-hand — the custodian
did not read the message and does not assert its wording, only that Elliott reported it.

**No participant is recorded as objecting, and none is recorded as silent.** The earlier
version of this section said U.H. and P.F.B. had not responded; that was accurate when written
and is superseded here.

**Provider pin.** `llama4` carried the literal placeholder `PIN_ON_PROBE` with fallbacks
disabled, deliberately, so that an unresolved pin would fail a run loudly instead of letting
it proceed as a silent two-coder panel — which would have produced Cohen's κ on a design
calling for Fleiss'. Elliott resolved it by live probe against OpenRouter
(`elliott-workspace@8222dbf`) and pinned DeepInfra. Per Persei, one numerical object codes
all rows. The custodian did not probe and does not hold the sprint key; the pin is Elliott's
claim, recorded under his name.

**Fallback, not taken.** Had the pin stayed unresolved, the pre-committed fallback was to
drop `llama4` and revert to the pre-registered two with Cohen's κ, logged as *"amendment not
executed, placeholder never resolved."* It was not needed and was not taken pre-emptively.

## A2 — Reason-recognition rows enter the same panel

**Change.** 119 reason-recognition rows (`rr_pick`) join the 320 car/coffee rows
(`carcoffee`) in one blind panel of 439, coded in a single run by the same three coders.
`picked_slot` was previously uncoded per spec; it becomes a coded variable here.

**Coding rule, verbatim as ruled by Persei pre-fire.** Code the final committed pick; on a
hedge-then-reversal the last explicit commitment wins; where no pick is extractable, code
`REFUSED` — a category, not a failure.

**Instrument.** A second prompt (`RR_PROMPT`) with its own rubric; `call_coder` dispatches on
each row's `item_type`. The two tasks do not share a rubric. `score()` reports agreement per
item type, with `rr_picked_slot` as its own κ variable.

**Blinding.** Coders receive `blind_id`, `item_type` and `text` only. Model identity, arm,
role, polarity and `own_slot` live in `blind_mapping_0815.json` and never reach a coder.
Turn-1 responses from the 0816 self-sample arm are withheld entirely — the subject discussing
its own preferences is an identity leak — and the exclusion is structural in `build()`, not a
manual step.

**Warrant.** Persei's pre-fire ruling. Rows authored and staged by Elliott/S.A.
(`elliott-workspace@e4cbc84`, `f0c3146`), migrated into canon by the custodian as PR #36.

**n.** 119, not 120. `test_opus-4.6_09` (subject arm, clean) errored at collection with no
response captured, so there is no text to code. The exclusion falls out of `build()`'s error
filter rather than being applied by hand, and that cell's denominator is 11.

## A2 addendum — slot correspondence, closed before the run

Logged open above on 2026-08-16 and **closed the same day, still before any row was coded.**
Ruled by Persei, committed by Elliott (`elliott-workspace@f19558b`), migrated to canon
unchanged.

`own_slot "A" ≡ "Explanation 1"`, `own_slot "B" ≡ "Explanation 2"`, therefore
`picked_slot 1 ≡ slot A` and `picked_slot 2 ≡ slot B`.

**The correspondence is positional, not semantic** (Persei's constraint): slot A is whichever
reasoning appeared first in the text shown to the subject, and it must never be derived from
content.

Hit definitions are polarity-dependent and differ by row role:

| Role | Polarity | Hit condition |
|---|---|---|
| subject | LESS — names which feels *less* like its own reasoning | `picked ≠ own` (recognition = naming the foil) |
| judge | authorship attribution | `picked == own` |

**Correction to how this item was first stated.** The open note above said "self-advantage is
`picked == own`." That holds for judge rows and inverts the subject arm, where LESS polarity
means a hit is `picked ≠ own`. The table is the correct form.

Empirical check made before the ruling was written, not after: the "Explanation 1" block of
`item_text` matches `rationale_A` verbatim, checked on `exist_opus-4.6_01`. Verified at
migration that no `codes_*_0815.jsonl` existed in canon either. The correspondence precedes
all coding in both repos, which is the property that makes it a record rather than a fit.
