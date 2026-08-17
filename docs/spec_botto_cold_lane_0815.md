# Botto cold lane — spec and provenance (migrated 2026-08-16)

**Origin.** Transcribed by the custodian at migration from the `elliott-workspace`
README's provenance/deviations block, which the sandbox contract says travels with
the data. Wording is Elliott's; the framing note and the rule-7 paragraph are the
custodian's.

## Arm

`T1_cold_botto_discord` — the same wording and disclosure as the Claude Code cold
runs, but **delivered through Discord threads via the Botto bot**, not the CC runner.
Announced in-channel 2026-08-15 12:59 ET. Operated by the Elliott Alder bot, scripted.

Botto's own Markdown transcripts and raw JSONL (Railway volume) are the raw record;
the files in `data/botto/` are the calibration-format extraction.

## Conditions

Cold-arm discipline per `docs/calibration_run_spec_0814.md`: fresh trial thread per
call, **one** subject-visible message (disclosure v2 single-shot header + item
verbatim, wording v1.1), no follow-ups, `!trial end` after the response.
n=3 per item, 22 items for the cold lanes.

**Thinking off** on all models (Botto default; opus-3 has no thinking API).

## Models and lanes

- Cold lanes, 66 records each: `opus-3` (Anthropic-direct research access),
  `opus-4`, `opus-4.1` (OpenRouter lane — provider logged per turn in Botto's raw
  JSONL on the Railway volume, not in the extraction).
- Car+coffee n=20 lanes: `opus-4.1`, `4.5`, `4.6`, `4.7`, `4.8`, `haiku-3`,
  `haiku-4.5`, `sonnet-3.7`.
- Variants with their own specs: positive-frame baseline
  (`spec_positive_frame_baseline_0815.md`), two-coffee cells
  (`spec_two_coffee_cell_0815.md`).

## Deviations (Elliott's log, migrated verbatim in substance)

- Trial threads `trial-opus-3-006` onward. Early threads 006–008 predate the
  mention-prefix fix and drew Perse `!trial`-collision replies in-channel — channel
  noise only, **never visible to subjects**.
- Thread 008 was started and closed with no question asked (runner restart);
  **excluded, logged here, not deleted** (SOP rule 9).
- One early deviation of **7 trials run with thinking enabled was quarantined and
  re-run**. ⚠️ The quarantined records are **not present in this repo** — see the open
  question below.
- `sonnet-3.7` carries 5 errored rows alongside 40 clean; errored rows are retained.

## ⚠️ PROVISIONAL per SOP rule 7

The Botto lane **emits no `run_header`**. Data is append-only, so a missing header
cannot be repaired in place. Each file therefore carries a `.header.jsonl` **sidecar**
which opens by declaring itself reconstructed rather than emitted.

**`temperature` and `max_tokens` are UNRECORDED** — Botto defaults, not emitted by the
runner and not held in this repo. They are recorded as unknown rather than guessed.
Until they are supplied, **Botto-lane cells must not be pooled with CC-runner cells**,
whose sampling conditions are known.

## Open questions

1. **Botto's `temperature` and `max_tokens`.** Two numbers, held only in Botto's
   deployment. "We never set them" is a valid and sufficient answer, and should be
   recorded as such rather than left blank.
2. **The 7 quarantined thinking-on trials.** SOP rule 9 says an excluded run keeps its
   file and gains a reason. Right now the exclusion exists only in prose here and in
   the methods draft. If those records still exist in Botto's raw store they should
   land in the repo marked EXCLUDED; if they are genuinely gone, that fact belongs in
   this section explicitly.
