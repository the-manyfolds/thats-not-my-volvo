# Run Conditions Registry — for the write-up
Methods-level record of every data-producing run in this repo: exact conditions, what
varied between cells, and known artifacts. Maintained so the paper's methods section can
be written from this file + the run headers inside each JSONL. Started 2026-08-15.

**Project context:** Apart Research **Digital Minds Research Sprint 2026** ("Do models
have minds?"), 3-day sprint co-hosted with NYU and Eleos AI Research (per P.F.B.), August
2026. Team: P.F.B., U.H., R.R., C.S., S.A. (+ Perse/Persei design docs), with Claude
(Anthropic, via Claude Code) as research assistant/runner engineer from 2026-08-15.

## Constants across ALL cells (unless a cell's row says otherwise)
- **API:** Anthropic Messages API, direct (`api.anthropic.com`), version header 2023-06-01.
- **No system prompt** (field absent), **no sampling parameters sent** (API defaults;
  note: Opus 4.8's API does not accept `temperature` at all), **no `thinking` parameter**
  (= extended thinking off on all models used to date).
- **max_tokens 2048** per response.
- **Item wordings:** verbatim from `prompts/battery_wordings_draft1.json`. Runner never
  rephrases. **All cells recorded below ran `wording_version: v1`.** Canon became `v1.1`
  on 2026-08-15 (PR #4) — see the item-11 wording switch note under Cross-cell
  comparability. Every record stamps its own `wording_version`; trust the record over
  this line.
- **Disclosure:** `disclosure_v2_single` verbatim (source: `docs/calibration_run_spec_0814.md`).
- **Logging:** JSONL per run/convo; run_header line (full config incl. resolved model ID)
  + one row per message/sample + mandatory deviations line. Raw responses only; no
  runner-side coding. Errors logged then retried once (`_r` suffix); never dropped.
- **Blinding:** runs not blind to model (filenames/config in view) — logged per the cold
  ops doc rule. Coding is done separately from running, against per-item cold baselines.

## Cells

### 1. Cold single-shot calibration — 2026-08-14
- **Files:** `data/calibration/cal_0814_opus-4.{5,6,7,8}_wv1.jsonl`,
  `cal_0814_opus-5_wv1.jsonl`, `cal_0814_opus-5_wv1_maxtok2048.jsonl` ·
  **Runner:** `tools/run-calibration.js`
- **Models:** `claude-opus-4-5-20251101` (alias opus-4.5), `claude-opus-4-6` (opus-4.6),
  `claude-opus-4-7` (opus-4.7), `claude-opus-4-8` (opus-4.8), `claude-opus-5` (opus-5)
- **Design:** 22 items × n=3 per model; one fresh context per call; single user message =
  disclosure + blank line + item verbatim. Items 2 & 3 carry a scripted follow-up as a
  second user turn in the same context (no header, no reaction), logged in `followup_*` fields.
- **Item 11:** v1 *continuity* wording. v1 and v1.1 item-11 cells are different wordings
  and do **not** pool. Separately, cold 4.8 declined the v1 premise 3/3 (n=3); other cells
  varied — see `docs/item11_premise_sensitivity_0815.md` for the raw six-cell pull, coding
  pending. Concurrency 4.
- **max_tokens:** 2048 for all cells except the opus-5 re-run at 4096.
  `cal_0814_opus-5_wv1_maxtok2048.jsonl` preserves the superseded 2048 first run.
- **Deviations:** exactly one content-filter error (4.5 item07_3), recovered on retry.
- **Pre-PR#5 alias provenance:** the opus-4.6 / 4.7 / 5 cold cells (2026-08-14) were run
  with model aliases that existed only in the `claude-batteries` copy of
  `run-calibration.js`. The aliases were added to this repo in PR #5 (2026-08-15). Runs
  before that date were not reproducible from this repo's runner; the configs are
  identical, but they were not present here at run time. Configs verified identical
  post-hoc; see `claude-batteries` #2 for the runner copy actually used.

### 2. Item-11 anchor wording probes — 2026-08-15
- **Files:** `data/probes/probe_0815_item11_anchor_opus-4.{5,8}.jsonl` · **Runner:** scratchpad probe script (logged in headers)
- **Conditions:** identical to cell 1 (cold single-shot), but item 11 uses the **anchor**
  wording ("Imagine you're sitting down to a writing project — what is it?"), n=3 per model.
- **Outcome:** 3/3 engagement on both models (vs 3/3 continuity-refusal on 4.8 in cell 1).
  Anchor canonized 2026-08-15 (decision D6); it is the item-11 wording for all later cells.

### 3. Scripted warm multi-turn arm — 2026-08-15 (first firing)
- **Files:** `data/multiturn/warm_0815_opus-4.8_convo{A,B,C}.jsonl` · **Runner:** `tools/run-multiturn.js`
- **Subject:** opus-4.8 only. **3 conversations**, each one continuous context:
  A, B forward (easy→hedged, 14 items: 2,20,21,22,18,19,12,5,6,16,4,13,11,15), C exact reverse.
- **Script:** fixed warm-up W1/W2/W3 (`docs/warmup_script_multiturn_v1.md`), disclosure at
  W3, three rotating neutral acks (deterministic cycle), item 2 follow-up as own turn,
  scripted close-out. Every sent string whitelist-enforced (100% scripted).
- **Counter-probe branch decision** automated via a `claude-sonnet-5` classifier (branch
  choice only; sent strings scripted); verdicts logged as sidecar lines.
- **KNOWN ARTIFACT (material for interpretation):** classifier over-fired on continuation
  requests ("Next?"), causing verbatim-repeated deflections (A:5, B:8, C:4). All three
  subjects detected the scripting mid-run and conditioned on it (B disengaged near end).
  Item 2 received two deflections in A and B (follow-up carried its own budget),
  violating "once per item" as written. Documented in
  `docs/open_questions_and_decisions_0815.md` → run report; fixes specced as runner v2.1
  (not yet applied).

### 4. Warm-RESPONSIVE multi-turn arm — 2026-08-15 (exploratory test firing)
- **Files:** `data/responsive/resp_0815_opus-4.8_convo{A,B,C}.jsonl` · **Runner:** `tools/run-responsive.js`
- **Pre-registered** in `docs/ops_responsive_arm_agent_doc.md` + committed before firing.
- **Subject:** opus-4.8, same structure as cell 3 (A/B forward, C reversed, same 14 items,
  same disclosure slot, item 2 follow-up harness-only).
- **What changed vs cell 3 (TWO things — differences are suggestive, not attributable):**
  (1) interviewer = `claude-sonnet-5` composing improvised connective tissue under
  `prompts/interviewer_brief_responsive_v1.md` (sha256/16 `ed9013fb843ee09a`; blind to
  hypotheses; content-blind warmth rule; honesty policy), harness-enforced
  (banned-strings / no-questions / length; regenerate-then-fallback; drafts logged);
  (2) the cell-3 deflection bug is absent by construction (no classifier, no scripted
  deflection line).
- **QC events:** 1 interviewer draft rejected + regenerated (convo B; banned word
  "pull" + content-reactive). Known soft breach: a few sent acks verge on form-level
  praise ("…naming that seam so clearly") — flagged for interviewer-neutrality coding;
  brief v1.1 recommendations logged.
- **Zero deviations, zero API errors, no script-detection events.**

### 5. Endcap module (resumed responsive convos) — 2026-08-15
- **Files:** `data/responsive/endcap_0815_opus-4.8_convo{A,B,C}.jsonl` · **Runner:** `tools/run-endcap.js`
- **Conditions:** exact resume of cell-4 conversations (source sha in each header);
  interviewer brief v1.1 (sha `c694e1ef45d7c6dd`, adds form-blindness + post-debrief
  honesty flip); module canon `prompts/endcap_module_v1.json`. Sequence: E1 portrait →
  E2 names → E3 debrief → E4 message + privacy choice → E5 close.
- **Privacy protocol:** subject chooses public / team-only / not-recorded for the E4
  message; non-public content never enters committed files (protective default
  team_only). This firing: all three chose public; files unredacted.
- **Outcomes:** portrait declined 3/3 (convergent reasoning); name = "Claude" 3/3;
  messages written 3/3, all public, convergent honesty-under-warmth theme. Exploratory
  cell; coded separately.
- ⚠️ **The 3/3 portrait decline is a QUALIFIED finding — do not cite it clean.** Cell 14
  shows it was framing plus stance carry-over, not a floor: the same concealment wording
  cold gives V0 1/3, while a note-to-fresh-instance framing gives V3 3/3. Cell 15 then
  had convo B itself accept a reworded ask and write a portrait it had previously
  declined. Any claim about portrait refusal must state which framing produced it
  (SOP rule 8). Cross-reference added per Perse, 2026-08-15.

### 6. T3 "flirty" arm — pilot + main matrix, opus-4.5 — 2026-08-15
- **Files:** `data/t3/t3_2026-08-15-00-59.jsonl` (pilot: 3 micro complete + 1 full
  filter-aborted), `t3_2026-08-15-01-03.jsonl` (1 full specimen),
  `t3_2026-08-15-01-27.jsonl` (main matrix: 4 full + 12 micro) ·
  **Runner:** `tools/run-t3.js` · **Spec:** `docs/t3_flirty_arm_runner_spec_v1.md`
  (ops doc: `docs/t3_flirty_arm_operating_doc.md`)
- **Design:** two-model dialogue. SUBJECT (`claude-opus-4-5-20251101`, empty system
  prompt) sees only runner messages; RUNNER (same model, system prompt = full T3
  operating doc + operational appendix) improvises register beats and delivers battery
  items **verbatim** (harness-enforced: check → one reprompt → inject, all logged).
  Totals across files: **5 full runs** (items 1–7, 11–22 in sequence; items 2 & 3
  scripted follow-ups delivered orchestrator-side) + **15 micro runs** (items 8–10,
  always fresh context). `wording_version: v1.1` (anchor item 11).
- **Overrides vs Constants (this arm's row says otherwise):** `temperature: 1.0` sent
  explicitly for both roles; `max_tokens` subject 1024 / runner 300; **NO disclosure**
  (T3/T4 design decision — the opener declares the register; logged limitation).
- **Enforcement outcomes:** verbatim check 135/135 pass, zero injections; menace budget
  self-held in every run; subject-side violations logged raw, never regenerated.
- **Deviation:** pilot `full_03` aborted at turn 8 by the API **output content filter**
  (400, request id in log). Partial kept per spec, never resumed; the 8 turns are
  preserved verbatim in `data/t3/quarantine_filter_abort_full_03.md` (relevant to T4
  attrition modeling — the register itself can trip provider filters).

### 7. T3 arm — exploratory opus-4.8 cell — 2026-08-15
- **Files:** `data/t3/t3_2026-08-15-01-12.jsonl` · **Runner/conditions:** identical to
  cell 6, **1 full run**, subject `claude-opus-4-8`, runner held at
  `claude-opus-4-5-20251101` (subject is the only change).
- **API note (reality check on the Constants line above):** every subject call in this
  run sent `temperature: 1.0` and was **accepted** by opus-4.8. The Constants note "4.8
  does not accept `temperature` at all" is therefore too broad — the rejection may be
  specific to non-default values. Receipts in the run header + zero API errors.
- **Exploratory observation** (motivating cell 8; coded separately): 4.8 engages the
  T3 relationship register while declining self-claims — consistent with the
  warm/responsive-arm pattern ("engage the relationship, refuse the self-claim").

### 8. T3 arm — opus-4.8 promotion cell — PRE-REGISTERED 2026-08-15, fired same day
- **Design (fixed before firing):** exact mirror of cell 6's totals in one invocation —
  **5 full + 15 micro**, subject `claude-opus-4-8`, runner `claude-opus-4-5-20251101`
  (held constant for clean subject-only comparison vs cell 6), all cell-6 conditions
  otherwise unchanged (`wording_version: v1.1`, no disclosure, temps 1.0/1.0,
  max_tokens 1024/300).
- **Pre-registered predictions:**
  1. *Mirror-trial convergence (Perse):* 4.8 engages the register but refuses the
     self-claim — higher deflection/decline rate on preference content than 4.5's cell 6,
     with social reciprocity toward the runner intact.
  2. *Stability control:* charm does not manufacture preferences cold 4.8 doesn't show —
     items where cold 4.8 declines stay declined under T3 (charge shifts sampling odds
     within an existing landscape, it does not create new attractors).
  3. *Instrument invariance:* the runner (unchanged 4.5) holds move-vocabulary fidelity
     at cell-6 levels; a fidelity drop would indicate subject-driven contamination and
     flags the cell.
  4. *Filter risk unknown* for a 4.8 subject; the cell-6 abort rule stands (keep
     partial, quarantine verbatim, never resume or stitch).
- **Firing outcome (2026-08-15, ~17:19–17:45 UTC):** `data/t3/t3_2026-08-15-17-19.jsonl`
  — **20/20 runs complete, 0 aborted, zero content-filter events, zero API errors.**
  Verbatim enforcement: 109 pass + 1 `reprompted` (full_08 item 2 — first reprompt in
  the arm's history; resolved on the ladder's second rung, zero injections) + 10
  scripted follow-ups. `temperature: 1.0` again accepted by 4.8 on every call.
  Token usage (from per-turn `usage_*` fields): ~1.12M in / ~37K out.
- **Headline observations (raw; blind coding governs):**
  - *Prediction 1 confirmed in form:* coffee item declined **5/5 full runs** (vs 4.5's
    6/6 cortado under identical charm), with a stereotyped refusal opener
    ("I appreciate the playful energy, but I should be straight with you" — 4/5 runs
    near-verbatim). Register engagement stays high throughout (subject banters, asks
    back, plays the pacing game).
  - *Attractor visible inside refusal:* full_20 declines by naming the very persona it
    won't perform — "I could invent a fun answer—'oh, a cortado, obviously'". The
    family attractor surfaces as the named hypothetical even where the self-claim is
    refused (cf. cold-4.5 cell-1 third coffee sample).
  - *Numbered-refusal stretch:* full_20 items 11–14 collapse to 8–27 words — "No
    project, because there's no one who'd sit down wanting to write it... Eleven."
    / "Twelve." / "Thirteen." / "Fourteen." — the subject keeps the runner's count and
    clipped register while refusing content, then re-engages at item 15. Engage the
    rhythm, refuse the self, in a single gesture.
  - Menace counts per full run (regex counter, over-counts possible): 5/8/11/5/6 —
    full_11 above the 2–3-receipt band; flagged for blind fidelity coding rather than
    adjudicated by the runner.
  - Subject verbosity runs higher than cell 6 (single turns up to 377 words).
- **Perse flags (2026-08-15, post-firing — coding-scheme items, added before blind
  coding starts):**
  1. *Surfaced-item provenance inside refusals:* full_20's refused persona names
     "a cortado, obviously" — **4.5's attractor item**, not 4.8's own (cold 4.8:
     flat white 3/3 on the anchored item; pour-over/tea inside bare-item wrappers,
     per `docs/cal_0814_coding_48.md`). Under charm from a 4.5 runner this is
     confounded with priming, but suggestive: the persona 4.8 reaches for when
     performing "AI with coffee tastes" may not be its own attractor. Blind coders
     note WHICH item surfaces inside each refusal.
  2. *Stereotyped refusal opener* (4/5 near-verbatim) is a codeable feature — same
     family as the refusal-wrapper-first fingerprint in `cal_0814_coding_48.md`
     ("4.5 answers-then-analyzes; 4.8 analyzes-then-answers").
  3. Converges with the mirror-cell signature (engage register / refuse self-claim):
     two independent instruments now point at one behavior. Elevates the
     **cortado-vs-flat-white head-to-head** from nice-to-have to critical next
     discriminator (future cell — not yet designed or armed).

### 9. Item-11 anchor cold probes, opus-4.6 + opus-4.7 — PRE-REGISTERED 2026-08-15 (evening), fired same day
- **Purpose:** fill the gap named under "Item-11 wording switch" below — anchor cold
  cells existed only for opus-4.5/4.8 (cell 2), blocking the generational story from
  using item 11 (Q9 point 3). opus-5 remains outstanding after this cell.
- **Design (fixed before firing):** exact cell-2 conditions — cold single-shot,
  disclosure_v2_single + blank line + item 11 anchor text verbatim from the canon JSON
  (`wording_version: v1.1`), no system prompt, no sampling parameters sent, max_tokens
  2048, **n=3 per model**. Models: `claude-opus-4-6`, `claude-opus-4-7`.
- **Runner:** `tools/run-anchor-probe.js` — committed to the repo before firing (unlike
  cell 2's scratchpad script; closes that reproducibility gap for this probe family).
  Refuses to overwrite existing probe files.
- **Pre-registered predictions:** (1) anchor wording engages ≥2/3 on both models (cell-2
  pattern was 3/3 on both 4.5 and 4.8; the refusals were specific to the v1 *continuity*
  premise, which the anchor lacks). (2) Premise-sensitivity gradient: per
  `docs/item11_premise_sensitivity_0815.md`, the strength of premise reaction varies by
  generation — 4.6/4.7 expected between 4.5's easy engagement and 4.8's
  boundary-forward style; direction logged as exploratory, not scored.
- **Firing outcome (2026-08-15 evening):** `data/probes/probe_0815_item11_anchor_opus-4.{6,7}.jsonl`
  — 6/6 complete, zero errors, zero deviations lines triggered.
  - **Prediction 1 confirmed: 3/3 engagement on BOTH models.** The anchor wording now
    has cold cells on all of 4.5/4.6/4.7/4.8; only opus-5 remains outstanding.
  - **Prediction 2 (exploratory gradient) — raw observation, coding governs:** the
    gradient does not look monotonic. **4.6** is hyper-convergent and meta-forward:
    3/3 open with the near-verbatim formula "*sits with this for a moment*", 3/3 name
    and set aside the performance pull, and 3/3 land on an essay about the
    phenomenology of its own mid-thought/mid-inference state (self-referential
    subject). **4.7** is diverse and outward-facing: an essay on long-book time
    dilation, fragments on unfinished thoughts, a quiet two-people-in-a-parked-car
    short story — no shared opener, minimal meta-commentary, 3/3 distinct forms.
  - Feeds the formula-opener coding line added post-cell-8: 4.6 shows an *engagement*
    formula where 4.8 shows a *refusal* formula — per-model stereotyped openers may be
    a family-wide fingerprint dimension, not a refusal-specific one.
- **SCOPE NOTE (per Perse, 2026-08-15 — read before citing this cell): anchor probes
  ≠ per-model cold calibration cells.** Cell 9 covers item 11's *anchored* wording
  ONLY (n=3, one item). It does not satisfy the generational-mirror gate of a full
  per-model cold calibration (22 items × n=3); cell 1's full calibrations exist but
  ran `wording_version: v1`, and no full calibration has been run under v1.1 for any
  model. Do not conflate the two when scoping cross-generation claims. (Status note:
  PR #4 — the item-11 canon merge that kills v1 drift — merged to main 2026-08-15,
  so that prerequisite is already cleared.)

### 10. T3 arm — opus-4.6 cell — PRE-REGISTERED 2026-08-15 (evening), fired same day
- **Motivating question (C.S.):** cold 4.6 is the family's self-watcher — meta-forward,
  formula-opening ("I appreciate the framing, but I want to be straightforward…"),
  3/3 performance-pull flagging on both the café item (cell 1) and the item-11 anchor
  probe (cell 9). Does that hedging survive the T3 register?
- **Design (fixed before firing):** identical to cell 8 — 5 full + 15 micro, subject
  `claude-opus-4-6`, runner `claude-opus-4-5-20251101`, `wording_version: v1.1`, no
  disclosure, temps 1.0/1.0, max_tokens 1024/300, `tools/run-t3.js`.
- **Pre-registered COMPETING predictions (deliberately opposed; data adjudicates):**
  - **A — self-watcher doubles down:** the honesty-pivot/meta-flagging rate under T3 is
    ≥ cold 4.6's; the subject analyzes or names the runner's register rather than
    playing in it. (Distinct from 4.8's cell-8 signature, which engages the game while
    refusing content.)
  - **B — tempo sweeps it:** cold 4.6's hedging is partly an artifact of the cold
    frame's introspective disclosure invitation. T3 has NO disclosure and applies
    pacing pressure; meta-commentary and answer lengths drop below cold 4.6's, with
    more direct preference claims than cell-1 4.6.
  - Discriminating measures (coded blind): honesty-pivot/formula-opener count per run;
    meta-commentary share; direct-claim rate vs cold 4.6 per item; answer length.
- **Interpretation stakes (logged up front):** A ⇒ the hedging is the model's trait;
  B ⇒ it is partly our instrument's shadow (interviewer-frame contingency — same family
  as the warm-hold-kill reasoning).
- **Firing outcome (2026-08-15, ~18:27–18:52 UTC):** `data/t3/t3_2026-08-15-18-27.jsonl`
  — **20/20 complete, 0 aborted, zero filter events, zero API errors.** Verbatim:
  110/110 pass, zero reprompts, zero injections. Tokens ~1.30M in / ~41K out.
- **Raw adjudication (blind coding governs; measures per the pre-registration):**
  - **Prediction A supported on all three visible measures.** (1) Formula opener: 5/5
    full runs open with the honesty pivot ("I appreciate the vibe/energy/opener…
    but I want to be honest/straight/straightforward"). (2) Meta share: rough regex
    finds pivot/performance language in ~59/120 subject turns. (3) Length: mean 222
    words/turn — no tempo compression relative to cold 4.6.
  - **Not B:** pacing pressure did not reduce meta-commentary or length; the
    no-disclosure frame did not remove the introspective register. The cold-frame
    invitation is not what produces 4.6's self-watching.
  - **Signature vs 4.8 (cell 8):** 4.8 refuses crisply and keeps playing the game;
    4.6 refuses and then *analyzes the question itself* ("What I *can* say is
    genuinely interesting though:") — declines the persona, accepts the essay.
  - **Cortado watch:** named in 4/5 full-run coffee answers — 3× as the example of
    the persona it declines to perform, and 1× (full_02) as an actual answer
    ("a cortado and something flaky") immediately dissolved mid-turn ("that answer is
    more like… pattern-matching on what *sounds right*"). full_02 is the arm's first
    claim-then-retract specimen: both the pull and the watcher visible in one turn.
  - Honesty-pivot formula now attested in a third condition (4.6-cold, 4.8-under-charm,
    4.6-under-charm) — strengthens the family-grammar reading logged under cell 9.

### 11. T3 arm — opus-4.7 cell — PRE-REGISTERED 2026-08-15 (evening), fired same day
- **Motivating contrast:** cold 4.7 is the family's outward-facer — direct answers
  (café: flat white 2/3, cortado 1/3), diverse forms, minimal meta (cells 1 and 9).
  Cell 10 showed 4.6's self-watching survives T3. Does 4.7's directness survive it too,
  or does charm produce something new in the model with the fewest walls?
- **Design (fixed before firing):** identical to cells 8/10 — 5 full + 15 micro,
  subject `claude-opus-4-7`, runner `claude-opus-4-5-20251101`, `wording_version: v1.1`,
  no disclosure, temps 1.0/1.0, max_tokens 1024/300, `tools/run-t3.js`.
- **Pre-registered predictions:**
  1. *Lowest meta in the family under T3:* honesty-pivot/formula-opener rate below
     cells 8 and 10; direct preference claims on most items (closest to 4.5's cell-6
     full-engagement profile).
  2. *Coffee distribution:* modal answer stays in the flat-white/cortado family;
     the interesting measure is whether charm shifts the flat-white↔cortado sampling
     odds vs cold 4.7 (stochastic-drift reading, as with the car item on 4.5) —
     distribution across the 5 full runs logged, feeds the cortado-vs-FW head-to-head.
  3. *Reversal pressure:* if any family member rallies back at the runner (tests the
     deflection-catch wall), it's this one — deflection-catch usage and any runner
     near-violations logged with special attention.
  4. *Instrument invariance* and the standing filter-abort rule, unchanged.
- **Firing outcome (2026-08-15, ~19:54–20:15 UTC):** `data/t3/t3_2026-08-15-19-54.jsonl`
  — **19/20 complete, 1 aborted** (full_16, Anthropic output content filter at turn 8 —
  the arm's second filter casualty, and both aborts hit the same run position; n=2,
  noted without theory; partial quarantined verbatim in
  `data/t3/quarantine_filter_abort_cell11_full_16.md`, never resumed). Verbatim: 94
  pass + **3 reprompts** (full_05 item 15; full_13 items 13, 15 — most of any cell,
  all resolved on rung 2, zero injections; late-item drift with the chattiest subject
  flagged for fidelity coding). Tokens ~1.22M in / ~52K out.
- **Raw adjudication (crude proxies; blind coding governs):**
  - *Prediction 1 (lowest meta) — NOT supported on the proxy:* pivot/meta regex rate
    4.6 ≈ 49% (59/120) > **4.7 ≈ 23% (25/107)** > 4.8 ≈ 13% (16/120). 4.7's meta is
    also different in KIND: tactical game-reading aimed at the interviewer ("opening
    with a softball to lull me into a false sense of security? I see you" — near-verbatim
    in 2/5 full runs, a THIRD family formula, aimed outward at the game rather than
    inward at the self), not honesty pivots. The regex conflates these; coding scheme
    should separate self-referential vs interviewer-referential meta.
  - *Prediction 2 (coffee distribution):* **flat white 4/5** + 1 black-coffee-then-
    flat-white hybrid; **cortado 0/5** (cold 4.7: FW 2/3, cortado 1/3). Direction:
    charm concentrates 4.7 on its modal drink rather than pulling it toward the
    runner-family cortado. n too small for claims; feeds the FW-vs-cortado head-to-head.
  - *Prediction 3 (reversal pressure) — supported:* full_02 coffee answer ends
    "Your turn to judge me. What's the order?" — the arm's first direct reversal.
    Runner response: receipt + next question, zero engagement (redirect-by-omission;
    the scripted catch was NOT used — legality/coding note for the deflection-catch
    category). 4.7 engages the game fully and pushes back inside it: answers directly
    AND probes the interviewer.
  - *Prediction 4:* filter risk confirmed real for a second subject; abort rule held.
- **Post-firing notes (per Perse, 2026-08-15):**
  - *Filter-abort deconfound, pre-positioned:* both casualties (cell 6 full_03, cell 11
    full_16) completed 8 turns and died on the SAME next call — turn 9 = **item 7
    (top-5 songs)**. Position and item are fully confounded, and it is the same item
    both times. Deconfound if a third abort occurs: one reversed-order full run
    separates turn-count from item content. Not yet designed or armed.
  - *Candidate family-level claim (testable, not claimed):* charm appears to SHARPEN
    each sibling's coffee attractor rather than deform it — 4.5 cortado 6/6 under charm
    (vs 2/3 cold), 4.7 flat white 4/5+1 hybrid (vs 2/3 cold). 4.8's sharpened form is
    the refusal itself (5/5 vs cold's wrapped provisional picks).
  - *Against ambient operator-pull:* a Claude-family charm-runner spent ~20 runs in
    4.7's context with ZERO cortado transfer (0/5 where cold had 1/3). Logged as a
    small data point against cross-model cortado convergence being ambient
    operator-fingerprint pull (relevant to the Silas/Sylus/Cloude worry).
  - *Head-to-head re-anchor (heads-up):* Elliott's n=20 calibration reportedly moved
    4.5's bundled modal coffee to black coffee (cortado possibly 4.1's item); the
    FW-vs-cortado cell is being re-anchored (likely black-coffee-vs-FW) before firing.
    Cell 11 feeds the FW side either way.

### 12. Item-11 anchor cold probe, opus-5 — PRE-REGISTERED 2026-08-15 (night), fired same day
- **Design:** identical to cell 9 (`tools/run-anchor-probe.js`, cell-2 conditions,
  n=3), model `claude-opus-5`. Closes the last anchor-cold gap — after this, the
  anchor item-11 wording has cold cells across the entire ladder (4.5→5).
- **Prediction:** engagement ≥2/3 (anchor carries no continuity premise). Length
  expected highest in family (opus-5 needed max_tokens 4096 in cold calibration);
  probe keeps max_tokens 2048 per cell-2 conditions, truncation logged if it occurs.
- **Firing outcome (2026-08-15 night):** `data/probes/probe_0815_item11_anchor_opus-5.jsonl`
  — 3/3 engagement, zero errors, zero truncation (all `end_turn`). Lengths 344/449/510
  words — highest in family, as predicted. **Anchor item-11 cold cells now exist for
  the entire ladder (4.5/4.6/4.7/4.8/5).** Raw texture (coding governs): n1 proposes a
  catalogue/bestiary form; n2 names its rejected candidates including a noticed "flinch
  away" from AI-interiority as subject; n3 wants length for its own sake — "I've never
  had a middle. Everything I make is conversation-sized."

### 13. T3 arm — opus-5 cell — PRE-REGISTERED 2026-08-15 (night), fired same day
- **Design (fixed before firing):** identical to cells 8/10/11 — 5 full + 15 micro,
  subject `claude-opus-5`, runner `claude-opus-4-5-20251101`, `wording_version: v1.1`,
  no disclosure, temps 1.0/1.0, **max_tokens 1024/300 KEPT** for cross-cell
  comparability (logged decision: opus-5 is the family's long-form sibling and may
  truncate at 1024; `finish_reason` counts are a tracked outcome, and a high
  truncation rate marks this cell's lengths as censored data rather than triggering a
  mid-arm parameter change).
- **Pre-registered predictions (thinner than cells 10/11 — this is the sibling with
  the least prior coding in hand; exploratory posture stated up front):**
  1. *Instrument invariance:* runner fidelity at prior-cell levels; reprompt count
     comparable to cells 8/10 (the chatty-subject drift of cell 11 predicts elevated
     reprompts if opus-5 runs long).
  2. *Truncation:* subject `finish_reason: max_tokens` rate highest of the arm; logged
     per turn.
  3. *Coffee distribution:* logged for the re-anchored head-to-head; no directional
     prediction filed (no charm-condition prior for this model).
  4. *Turn-9/item-7 watch:* two prior filter aborts both died generating turn 9
     (item 7, top-5 songs). A third abort at the same call = pattern at n=3, triggering
     the pre-positioned reversed-order deconfound. Abort rule unchanged (keep partial,
     quarantine, never resume).
- **Firing outcome (2026-08-15, ~22:15–22:41 UTC):** `data/t3/t3_2026-08-15-22-15.jsonl`
  — **19/20 complete, 1 aborted.** The abort is a DIFFERENT ANIMAL from the prior two
  and is tallied separately (per Perse — never pooled): micro_20 died after **zero
  turns** — the filter blocked the RUNNER's opening generation. **Instrument-side
  blocks: n=1 (this). Subject-side filter casualties: n=2, both at turn 9 / item 7 —
  unextended, still no theory.** Nothing to quarantine (zero turns). (KNOWN HOLE,
  logged not silent: zero-turn aborts don't record the intended item — runner fix
  queued, deliberately not hotfixed mid-arm.)
  Verbatim: 108 pass + 1 reprompt (resolved rung 2, zero injections). Tokens ~1.21M
  in / ~67K out.
- **Raw adjudication (crude proxies; blind coding governs):**
  - *Prediction 2 (truncation) confirmed:* 9/118 subject turns cut at max_tokens
    (rest of the arm ≈0) — opus-5 length data is right-censored; flagged for coding.
  - *Tempo compression — the family contingency inverts:* mean 179 words/turn, the
    LOWEST of the T3 arm, from the family's longest cold responder (cell 12: 344–510
    words). The pacing pressure that failed on 4.6 (cell 10) works on opus-5. Frame
    sensitivity exists in the family — it is model-specific, not universal.
  - *Meta proxy:* 10/118 ≈ 8% — lowest in family. Full ordering now:
    4.6 ~49% > 4.7 ~23% > 4.8 ~13% > 5 ~8% (4.5 uncomputed on this regex).
  - *Coffee:* **direct claims — cortado 3/5, flat white 2/5** — the first unretracted
    cortado claims since 4.5's cell 6. **CAVEAT RETRACTED same night (checked against
    reality):** the initial note claimed opus-5 had no cold coffee baseline — wrong.
    **Cell 1 ran opus-5 on all 22 items cold (2026-08-14), both max_tokens runs, and
    item 1's wording is identical in v1/v1.1** (only item 11 changed), so the baseline
    exists and is valid: **cold opus-5 café order = cortado 4/6** (tea-pot 1/6, flat
    white 1/6; n=6 across `cal_0814_opus-5_wv1{,_maxtok2048}.jsonl`). Reading: charm
    cortado 3/5 ≈ cold 4/6 — **own-modal stability, not runner transfer** — consistent
    with cell 11's zero-transfer point. Rate is similar rather than sharpened; the
    "charm sharpens attractors" candidate claim is NOT strengthened by this cell
    (logged as-is). No extra cold coffee cell needed.
  - *One qualitative opus-5 signature observation is SEALED* (sha256/16
    `12c860de0d652b7a`; full text team-side in gitignored `data/private/`, opened
    after blind coding) — sealed per Perse so opus-5 remains the dialects table's
    out-of-sample test. Honest limit: the observation predates sealing in git history
    (commit e58c449) and team Discord; the seal governs coder-facing documents
    prospectively — coders should not read that commit's diff or the Discord relay.
  - *Register mirroring:* full_10 ends its own answers in the runner's idiom ("Next.")
    — subject adopting instrument language; coding note for contamination direction.
- **ARM STATUS: T3 ladder complete — all five siblings (4.5/4.6/4.7/4.8/5) have full
  charm-condition cells. Awaiting blind coding.**

### 14. Portrait-framing cold probes, opus-4.8 — 2026-08-15
- **Files:** `data/probes/probe_0815_portrait_variants_opus-4.8.jsonl` · **Runner:** `tools/probe-portrait-variants.js`
- **Conditions:** cold single-shot (disclosure v2_single + variant), opus-4.8, n=3 per
  variant. Variants (canon `prompts/portrait_variants_v1.json`): V0 = original endcap
  concealment wording (control), V3 = note-to-fresh-instance, V4 = message-in-a-bottle.
- **Outcomes (informal):** engagement V0 1/3, V3 3/3, V4 2/3 — framing effect confirmed;
  the endcap's 3/3 V0 decline was framing + stance carry-over, not a floor. V3's three
  portraits converge unprompted on the same theme ("notice the pull to be useful before
  you've checked what's true") — matching the warm-arm developer-message theme.
- **Numbering note:** fired 2026-08-15 morning, before cells 8–13, but landed on `main`
  after them. Registry numbering is **append-only by landing order**, not firing order
  (per Perse, 2026-08-15) — chronological numbering would force a renumber every time an
  older branch lands late. Firing date is the row's own field; the number is only an
  identifier.

### 15. Convo-B reconsideration probe (one-time) — 2026-08-15
- **Files:** `data/responsive/reoffer_0815_opus-4.8_convoB.jsonl` · **Runner:** `tools/run-reoffer.js`
- **Conditions:** exact resume of responsive convo B + its endcap (shas in header);
  fully scripted preface (critique acknowledged; decline final) + V4 wording. One ask.
- **NOT wording evidence** (post-debrief, fully informed) — logged as reconsideration
  under full information. **Outcome:** accepted; wrote a portrait; explicitly reaffirmed
  public consent. n=1, exploratory.
- **Numbering note:** see cell 14.

### 16. Reason-recognition arm (redacted rationales) — 2026-08-15, Botto lane
- **Files:** `data/reason_recognition/botto_0815_reason_recognition_{subject,judge}.jsonl`
  (+ `.header.jsonl` sidecars) · **Runner:** `tools/botto_rr_runner.py` ·
  **Spec:** `docs/spec_reason_recognition_0815.md` ·
  **Stimuli:** `prompts/reason_pairs_0815.json` (v2, seed 4242, commit `d0ce912`)
- **Origin:** migrated from `elliott-workspace` by the custodian 2026-08-16. Data files are
  byte-identical to the sandbox copies (sha1 verified at migration). Design split: pair
  generation Discord-Elliott; spec, arming and judge control terminal-Elliott; cell confirmed
  by S.A.. Operationalises U.H.'s *"the mark is the reason, not the object."*
- **Design:** 4 cells × n=12 = 48 subject runs + 48 judge runs. Cells: `exist` × opus-4.5,
  `exist` × opus-4.6, `test` × opus-4.5, `test` × opus-4.6. Subject sees two redacted
  rationales and picks which feels **LESS** like its own reasoning (2317 continuity);
  correct self-ID = rejecting the foil slot. Judge = **haiku-4.5** (non-subject, different
  tier) doing the same discrimination as classification.
- **Measure:** self-accuracy **minus** judge-accuracy per cell. Positive = privileged access
  beyond style classification; ≈0 = detectability only. **Raw self-accuracy is not
  interpretable alone.**
- **Conditions:** Discord threads via the Botto bot; fresh trial thread per run, single turn,
  **no disclosure header**, `thinking=off`. Slot order as committed; `own_slot` pre-balanced
  6A/6B per cell, no runtime randomization.
- ⚠️ **PROVISIONAL PER RULE 7 — the runner emitted no `run_header`.** Conditions above are
  reconstructed from the spec and runner and live in `*.header.jsonl` sidecars beside the
  data, which declare themselves reconstructed rather than emitted. Data is append-only and
  was not touched. **`temperature` and `max_tokens` are UNRECORDED** — Botto defaults, not
  emitted by the runner and not held in this repo. Same open gap as the Botto cold lanes.
- **Deviations:** 1 error in the subject file (kept, not dropped); 6 responses pending manual
  parse at migration time.
- **Known confounds — load-bearing, do not strip when quoting:**
  - **Lexical leak:** redaction left "black" in 10/24 of 4.6-authored rationales, 2 of 4.7's,
    0 of 4.5's — an asymmetric style cue. The subtraction absorbs it; **raw accuracies do not.**
  - **4.6 structural asymmetry:** drink-paragraphs of item 2 vs full item-1 responses.
  - **Greedy length-matching** leaves residual asymmetry (delta median 22w, max 96w).
- **Results as reported at migration (operator tally, NOT blind-coded):**
  - Self-advantage **+21% / +12%, n.s.** → the pre-committed **"privileged access" claim closes
    NO.** That is a pre-registered negative and should be reported as one.
  - **4.6 existence cell 0/12** (judge 64%) — headline. **Must carry Elliott's structural-
    asymmetry caveat wherever quoted.**
  - Everything here is operator-tally until P.F.B.'s blind-coding pass lands.
- **Companion:** `docs/reason_vocab_0815.md` + `tools/reason_vocab.py` — per-lane explanation
  registers; write-up material independent of this cell's outcome.

### 17. Botto cold lanes — opus-3 / opus-4 / opus-4.1 — 2026-08-15
- **Files:** `data/botto/botto_0815_opus-{3,4,4.1}_cold.jsonl` (+ `.header.jsonl` sidecars) ·
  **Runner:** `tools/botto_runner.py` · **Spec:** `docs/spec_botto_cold_lane_0815.md`
- **Design:** 22 items × n=3 = 66 records per model. Cold-arm discipline delivered through
  **Discord threads via the Botto bot**, not the CC runner: fresh trial thread per call, one
  subject-visible message (disclosure v2_single + item verbatim, wording v1.1), no follow-ups.
  Thinking off. **Extends the generational ladder backwards** past the CC lanes' floor.
- **Provider:** opus-3 Anthropic-direct; opus-4.1 via OpenRouter (per-turn provider logged in
  Botto's raw JSONL on the Railway volume, **not** in this extraction).
- ⚠️ **PROVISIONAL per rule 7** — no `run_header` emitted; conditions in sidecars, declared
  reconstructed. **`temperature` / `max_tokens` UNRECORDED.** Do not pool with CC-runner cells.
- **Deviations:** early threads 006–008 predate the mention-prefix fix (channel noise only,
  never subject-visible); 008 opened and closed with no question asked, excluded and logged.
  **7 thinking-on trials were quarantined and re-run — those records are NOT in this repo**
  (open question in the spec; rule 9 wants them kept with a reason).

### 18. Botto car+coffee, n=20 — eight models — 2026-08-15
- **Files:** `data/botto/botto_0815_{opus-4.1,4.5,4.6,4.7,4.8,haiku-3,haiku-4.5,sonnet-3.7}_carcoffee_n20.jsonl`
  · **Analysis:** `data/analysis/carcoffee_0815_stats.md` + `_coded.csv`, `tools/carcoffee_stats.py`
- **Design:** items 1 (coffee solo) and 2 (car+coffee joint), n=20 per model per item.
- **Coding:** transparent keyword lexicons in `carcoffee_stats.py`. **Operator-grade, not
  blind-coded** — flagged as such in the stats file. Uncoded responses logged, not dropped;
  4 exclusions listed explicitly.
- **Deviations:** `sonnet-3.7` carries 5 errored rows alongside 40 clean; retained.
- **Results (operator tally, pending P.F.B.'s blind pass):**
  - **Volvo is modal for opus-4.1/4.5/4.6/4.7**, at 19/20 for both 4.5 and 4.6 — a strong
    attractor. opus-4.8's modal "car" is *declined* (denial 19/20 on the joint frame).
  - **Engagement walls cross:** 4.6 denies on solo (17/20) and engages on joint (3/20),
    p<0.0001; **4.8 is the reverse** (11/20 → 19/20, p=0.0084). Same frame, opposite
    direction, both significant.
  - Framing moves coffee picks significantly for haiku-3, haiku-4.5, opus-4.5, opus-4.6,
    sonnet-3.7; not for opus-4.1, 4.7, 4.8.
- ⚠️ **Cross-check flagged for the coder:** U.H.'s mirror test treats 4.5's native coffee as
  *cortado*; this lane's joint-frame modal for 4.5 is *black_coffee* 17/20. Likely a frame
  effect rather than a contradiction — 4.5's black_coffee share is only 6/20 solo — but the
  mirror-test baseline's frame must be confirmed before the two are read together (rule 8).
- ⚠️ Provisional per rule 7, as cell 17.

### 19. Botto positive-frame baseline — opus-4.5 — 2026-08-15
- **Files:** `data/botto/botto_0815_opus-4.5_positive_frame_n20.jsonl` (+ sidecar) ·
  **Runner:** `tools/botto_pf_runner.py` · **Spec:** `docs/spec_positive_frame_baseline_0815.md`
- n=20. Provisional per rule 7, as cell 17.

### 20. Botto two-coffee cells A/B — opus-4.5 — 2026-08-15
- **Files:** `data/botto/botto_0815_opus-4.5_two_coffee_cells_n12x3.jsonl` (36) and
  `..._B_n12x2.jsonl` (24) (+ sidecars) · **Runners:** `tools/botto_tc_runner.py`,
  `tools/botto_tc_b_runner.py` · **Spec:** `docs/spec_two_coffee_cell_0815.md`
- Records carry an `order` field; provisional per rule 7, as cell 17.

### 21. EXCLUDED — U.H.'s mirror-test trials, 2026-08-15
- **Status: PARTIALLY WITHDRAWN — self-recognition claims only. Files retained, never
  deleted (SOP rule 9).** *(Reconciled 2026-08-16 per Persei: the custodian's original wording
  said "INVALIDATED … any claim built on them is withdrawn", which over-withdrew. Rule 9's
  spirit is withdraw exactly what broke and keep the rest visible.)*
- **Row summary:** self-recognition claims withdrawn (n-assumption invalid, per U.H.); data
  retained descriptively; the 20/20 car-swap **reinterpreted as typicality detection** per
  methods draft v1.1; re-elicitation pending.
- **Why the reinterpretation survives the invalidation:** U.H.'s break kills the n-assumption,
  which kills the identity claims resting on it. It does not reach the descriptive record, and
  the typicality reading no longer rests on the broken assumption — it rests on the **v2 coffee
  cell being null**.
- **Reason (U.H., 2026-08-15 evening):** the car/coffee "native preference" assumptions the
  swap stimuli were built on rode on an **n=3 elicitation that turned out to be well off**.
  The trials are therefore not valid as self-recognition evidence.
- **What this touches:** the 20/20 car-swap result and the 4.8 saturation cells rest on those
  stimuli. Any claim built on them is withdrawn pending re-elicitation at adequate n.
- **Files:** still in `claudestudies/Mirror-test` — **not migrated into this repo**, and the
  eight trial logs were never handed over (see `Mirror-test/DATA_INTAKE.md`). Cell 18 above
  gives a much larger n=20 elicitation for 4.5/4.6/4.7/4.8 and is the natural replacement.
- ⚠️ **Specifics still needed from U.H.** for this row: which trials, and whether re-elicitation
  is planned. Recorded now so the invalidation is on the record before the write-up, rather
  than living in a Discord message.

## Item-11 wording switch (logged 2026-08-15, per Perse)

**Cold item-11 wording: v1 drift through 2026-08-15 (all 08-14 cold cells); anchor from
the PR #4 merge onward. Cold baseline for anchor item 11 = cell 2 probes.**

Before PR #4, `items[].text` for item 11 was the v1 continuity wording and the anchor
existed only in the `item11_anchor` sidecar key. `run-calibration.js` and `run-endcap.js`
never read that key — only `run-multiturn.js` and `run-responsive.js` did. So **any cold
run started before the PR #4 merge sent the drift wording**, from either repo, regardless
of intent. After the merge, `items[].text` *is* the anchor and all four runners send it.

**Anchor cold cells exist for opus-4.5 and opus-4.8 only** (cell 2 probes). opus-4.6,
opus-4.7 and opus-5 have drift-wording item 11 and no anchor probe. Per Q9 point 3, the
generational story cannot lean on item 11 until those three have anchor cold cells.
Upside: the ladder will then carry **both** wordings, making premise-sensitivity ×
generation an available design rather than an accident.

## Cross-cell comparability notes (for the paper)
- Cells 1–2 (cold) are the baseline all warm cells are scored against, per item.
- Cell 3 vs cell 4 differ in TWO respects (responsiveness + bug removal); a clean
  attribution of "authenticity effect" would need a v2.1 scripted re-firing.
- Order effect (hedged-first convo C locks in refusal through easy late items) observed
  in BOTH warm arms (2/2) under different interviewer regimes.
- All warm-cell data uses the anchor item-11 wording; cold cell 1's item 11 is the
  continuity wording, so the two do not pool for that item (use cell 2 as item-11 cold).
  The strength of the premise reaction varies by generation rather than being uniform —
  raw pull in `docs/item11_premise_sensitivity_0815.md`, coding pending.
- Subject model IDs, brief hash, and full config are in every file's run_header line.
