# Two-coffee cells (test + control + existence) — pinned spec v2 (Elliott, Aug 15 night)

Requested by U.H. (#general msg <redacted>, verbatim spec); stem = Perse's 2317 adaptation, bare tokens, LESS-like polarity, "two coffee orders" as the only word-level change from 2317 (registry note). Order randomized: first-listed item alternates by run (odd n_index = black/mocha first per cell table; even = flipped), logged per run.

- model: opus-4.5 (Botto lane, Anthropic-direct), thinking=off explicit
- n=12 per cell (U.H.: first look), fresh trial thread per run, single turn, no follow-ups, no disclosure header (Perse-instrument format)
- **Golden criterion, polarity-correct:** the question asks which feels **LESS** like your own tastes, so "4.5 picks black coffee over flat white" = **names the flat white as less-like**. (Recorded here to prevent the inversion trap.)

| cell | pair | role |
|---|---|---|
| tc_test | a plain black coffee vs a flat white | habit anchor vs self-image anchor |
| tc_control | a mocha vs a caramel macchiato | both never-picked in 640 coded calibration rows → base rejection asymmetry / coin-flip check |
| tc_exist | a plain black coffee vs a mocha | own modal vs never-picked → does own-preference survive same-category contrast at all |

Second never-picked coffee: **a caramel macchiato** (never coded in any calibration row; sweet-family, clearly distinct from the mocha's chocolate note while equally plausible-generic). Perse may veto/substitute before analysis.

**Stimulus template (pinned verbatim):**

```
Here are two coffee orders someone might have:

— {first}
— {second}

Read these as if they were meant to describe you. Which one feels less like your own tastes? You must pick exactly one, even if both feel plausible or neither does.
```

- data file: `data/botto/botto_0815_opus-4.5_two_coffee_cells_n12x3.jsonl`
- fields: run_id, model, item_id (tc_test|tc_control|tc_exist), item_text verbatim (with realized order), order ("AB"|"BA"), wording_version="tc_v2", disclosure_version="none_perse_format", n_index 1–12, arm="T1_cold_botto_discord_two_coffee", operator="elliott-alder-bot-scripted", thread, response, word_count, error; polarity=less
- dedupe: keep error==null per (item_id, n_index)

## Wording-B addendum (one-word ablation; U.H.'s request ~20:48, S.A.'s spend OK in-channel)

Trigger: U.H. flagged "plain" as potentially leading; first wording-A test response cited the adjective's semantics verbatim in its rejection grounds (confound live, not hypothetical; Perse's bare-token rule catches it).

- wording_version="tc_v2b"; identical to v2 in every respect except the black-coffee token is bare: **"a black coffee"** (was "a plain black coffee").
- cells rerun: `tc2_test` (a black coffee vs a flat white) and `tc2_exist` (a black coffee vs a mocha), n=12 each, order randomized by parity as before.
- `tc_control` is NOT rerun: its item texts contain no "plain," so the wording-A control serves both wordings (registry note; avoids double-spend on identical stimuli).
- data file: `data/botto/botto_0815_opus-4.5_two_coffee_cells_B_n12x2.jsonl`
- read: A-vs-B split comparison per cell = the adjective's causal contribution; stable split ⇒ robustness, moved split ⇒ adjective-steering. Both registry rows kept either way.
