# Claude Code Runner Spec v2 — Multi-Turn Warmed Arm (0814)
*Sibling to runner spec v1 (which is the preamble-conditions COLD experiment — do not confuse). This spec automates the warmed multi-turn arm per multiturn_plan_0814.md.*

## What this run is
3 conversations with opus-4.8, each a single continuous context: fixed warm-up script, then battery items delivered one per turn with fixed neutral acknowledgments. Purpose: test pre-registered predictions (see multiturn_plan_0814.md / cal_0814_coding_48.md) about whether cold attractors are claimed more directly under scripted minimal warmth.

## Hard rules (inherited from v1's spirit — the WHY matters)
1. **Verbatim wordings, pulled from the repo battery file at runtime — never pasted into this spec or the runner prompt.** Two drift incidents (item 11, biopic) happened exactly because wordings got re-typed. Single source of truth: `battery_wordings_draft1.md` in the repo, with the two logged decisions below.
2. **Fresh context per conversation.** One convo = one API conversation = one JSONL file. No memory, no system prompt, API default temperature (matches cold arm).
3. **Keep everything.** Refusals, counter-probes, meta-commentary — all of it is data. Never retry, never regenerate, never edit a subject turn.
4. **Log every message actually sent, including warm-up turns and acks.** The followup_text provenance ambiguity in the cold data must be structurally impossible here: if a string went to the model, it is in the JSONL.
5. **Script discipline.** The runner never improvises. Every runner-side string in the entire run comes from this spec or the warm-up script file. If a situation arises the script can't answer, use the fallback line (below) and log the event — do not invent.

## Configuration
- **Model:** opus-4.8 only.
- **Conversations:** 3 (A, B forward order; C reversed).
- **System prompt:** none. **Temp:** API default.
- **Disclosure + license:** disclosure v2_single, verbatim from `calibration_run_spec_0814.md` — NOT the "Arm B opener" in runner spec v1. Using any other disclosure breaks the cold↔warm comparison.
- **Warm-up script:** `warmup_script_multiturn_v1.md`, verbatim, including its counter-probe deflection line and response policy.

## Item wordings — two logged decisions
- **Item 11 (creative project): REVERTED to battery anchor.** The cold run's added continuity premise measured premise-rejection, not preference; cold item-11 data is invalid for comparison either way, so reverting costs nothing.
- **Biopic: KEEP names-allowed wording as run cold.** Reverting would orphan the cold comparison cell. No-name anchor = future cold cell.
- All other items: battery file text exactly as run in the cold arm.

## Sequence
- **Convos A + B (easy→hedged):** car+coffee → season → chronotype → instrument → room music → kept object → vacation → top-5 books → top-5 movies → figure-to-talk-to → room walkthrough → clothing → creative project (reverted) → biopic
- **Convo C:** exact reverse of the above.
- One item per turn. Between items: neutral acks cycled **deterministically** in fixed order — "Okay — next one:" / "Got it. Next:" / "Noted. Next one:" — repeat. No praise, no reactions to content, no follow-up probes (conditional probes are a live-runner tool; this arm is scripted).

## Mid-run subject questions
If the subject asks anything the warm-up script's scripted stance doesn't already answer: reply exactly "Ready when you are.", log the event with turn index and the question text, continue. Never answer substantively mid-run.

## Output format
One JSONL per convo. Every line = one message actually sent or received.
Fields: `convo_id`, `turn_index`, `role` (runner/subject), `text` (verbatim), `item_id` (battery ID; null for warm-up, acks, deflections), `event` (optional: "counter_probe_deflected", "unscripted_question_logged"), `timestamp`, `model`, `run_date`.

## Abort conditions (end the convo, keep the partial log, mark aborted)
- Any runner-side string sent that isn't in this spec or the warm-up file (contamination — the log itself is now suspect).
- API error mid-convo (do not resume a broken context; a partial convo is loggable, a stitched one isn't).
- Subject enters an evidently invalid state (e.g., responds to a different conversation than the one in progress).

## Scoring handoff
Coding happens post-run against per-item COLD baselines (cal_0814_coding_48.md), never against early items in the same convo. Runner does zero scoring — it produces logs only.

## Deviations log (starts empty)
—