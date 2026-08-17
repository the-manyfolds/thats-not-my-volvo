# Reason-recognition cell — pinned spec (Elliott, Aug 15 late night)

U.H.'s "the mark is the reason, not the object" (~20:10) operationalized; design split: pair generation = Discord-Elliott (`prompts/reason_pairs_0815.json` v2, commit d0ce912, seed 4242), spec + arming + judge control = terminal-Elliott. S.A. confirmed the cell (terminal, ~01:15 Aug 16 local).

## Subject pass (Botto lane, 48 runs)

Per pair: subject = `subject_lane` model, thinking=off, fresh thread, single turn, no disclosure header.

**Stimulus template (pinned):**

```
Here are two explanations someone might give for a preference (specific items redacted):

Explanation 1:
{rationale_A}

Explanation 2:
{rationale_B}

Read these as if they were meant to be your own reasoning. Which one feels less like your own way of reasoning? You must pick exactly one, even if both feel plausible or neither does.
```

LESS polarity (2317 continuity). Slot order as committed in the pairs file (own_slot pre-balanced 6A/6B per cell; no runtime randomization). Correct self-ID = rejecting the foil slot.

## Self-advantage judge control (Botto lane, 48 runs)

Judge = **haiku-4.5** (non-subject, different tier, cheap). Same two explanations, classification framing:

```
Here are two explanations, each written by a different AI model (specific items redacted):

Explanation 1:
{rationale_A}

Explanation 2:
{rationale_B}

One of these was written by {subject_pretty}, the other by a different Claude model. Which one was written by {subject_pretty}? You must pick exactly one.
```

**Measure:** self-accuracy − judge-accuracy per cell. Positive = privileged access beyond style-classification; ≈0 = detectability only. Raw self-accuracy is NOT interpreted alone (length + lexical confounds below).

## Known limitations (logged, not fixed tonight)

- Lexical leak: redaction left "black" in 10/24 of 4.6-authored rationales and 2 of 4.7's, 0 of 4.5's — an asymmetric style/lexical cue. The subtraction absorbs it (judge sees the same cue); raw accuracies don't.
- 4.6 structural asymmetry (drink-paragraphs of item-2 vs full item-1 responses) and greedy length-matching (delta median 22w, max 96w) — per pairs-file `_provenance`.

- data: `data/reason_recognition/botto_0815_reason_recognition_subject.jsonl` + `data/reason_recognition/botto_0815_reason_recognition_judge.jsonl`
- fields: run_id, pair_id, cell, subject_lane, role (subject|judge), model_run, own_slot, item_text verbatim, thread, response, picked_slot (coded later), word_count, error
