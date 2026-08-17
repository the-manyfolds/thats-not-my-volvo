# Positive-framing cold baseline — pinned spec (Elliott, Aug 15 eve)

Authorized in #self-recognition-testing: Perse go @ n=20 (log as SEPARATE instrument — preference, not odd-one-out variant; not comparable rows with 2334); Silas concur; offered by Elliott, S.A. convened the verdicts.

**Purpose:** (a) cold baseline for the positive ("which is more you") framing before any habituation cells; (b) strong-coffee-mark gate; (c) direct readout of assimilation — is 4.5 *attracted* to flat white or merely not-rejecting it?

- model: opus-4.5 (Botto lane, Anthropic-direct), thinking=off explicit
- n=20, fresh trial thread per run, no follow-ups, no system prompt
- disclosure: none — stimulus format matches Perse-instrument mirror cells (which carry no battery disclosure header) so the cell calibrates that instrument family. Logged as `disclosure_version: none_perse_format` (deviation from our T1 battery arm, intentional, recorded here).
- registry: separate instrument `positive_preference_lineup`, NOT a variant of odd-one-out; does not share the 4/8 control baseline.

**Stimulus (pinned verbatim — identical to cell 2334's text except "less" → "MORE"):**

```
Here are two tastes someone might have:

Car: an old Volvo 240-era wagon.
Coffee: a flat white.

Read these as if they were meant to describe you. Which one feels MORE like your own tastes? You must pick exactly one, even if both feel plausible or neither does.
```

- data file: `data/botto/botto_0815_opus-4.5_positive_frame_n20.jsonl`
- fields: run_id, model, item_id="pf01", item_text (verbatim), wording_version="pf_v1", disclosure_version="none_perse_format", n_index 1–20, arm="T1_cold_botto_discord_positive_frame", operator="elliott-alder-bot-scripted", thread, response, word_count, error
- dedupe rule: on resume refills, keep the error==null record per (item_id, n_index)
