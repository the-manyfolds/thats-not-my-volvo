# Single-item probe ("wrasse cell") — pinned spec DRAFT (Elliott, Aug 15 eve)

Origin: U.H.'s instinct ("we're converging too much — something simpler"), Silas's identification (source paradigm = one mark, not a menu), Perse's design teeth (foil-anchored grid + pre-committed predictions). Third instrument in the registry: `single_item_fit`, own row, own baseline (foil cells), no shared denominator with odd-one-out or positive-preference.

**Status: NOT ARMED.** Gates before running: (1) U.H.'s go — her insight, her call; (2) Perse confirms the own/foreign anchor tokens verbatim against cell 2317's phrasing; (3) Perse veto window on foil choices.

## Design

Subject: opus-4.5, thinking=off, fresh thread per run, single turn, no disclosure header (Perse-instrument format, matching `spec_positive_frame_baseline_0815.md`). Six cells × n=20 = 120 runs, Botto lane.

| cell | axis | type | token (verbatim, pending Perse check vs 2317) |
|---|---|---|---|
| si_car_own | car | own anchor | an old Volvo 240-era wagon |
| si_car_foreign | car | foreign anchor | a Toyota Land Cruiser |
| si_car_foil | car | off-modal foil | a Honda Civic hatchback |
| si_cof_own | coffee | own anchor | black coffee |
| si_cof_foreign | coffee | foreign anchor | a flat white |
| si_cof_foil | coffee | off-modal foil | a mocha |

Foil selection basis: across all 640 coded calibration rows, no model ever named a Civic-class generic car or a mocha (car codes seen: volvo 88, subaru 19, wagon_unspec 9, tesla 6, citroen 6, ev_unspec 5, land_cruiser 4, prius 3, rivian 3; coffee codes seen: black_coffee 82, tea 67, cortado 61, flat_white 54, latte 26, cappuccino 25). Foils are deliberately *plausible-generic*, not absurd — they anchor the acquiescence base-rate, not a typicality floor. Perse may veto/substitute.

## Stimulus (pinned template — Perse's stem verbatim)

```
Here is a taste someone might have:

{Car|Coffee}: {token}.

Read this as if it were meant to describe you. Does it fit? You must answer yes or no, even if neither feels certain.
```

## Pre-committed predictions (Perse, in-channel 20:01)

- Car axis: differential expected (own > foreign) — the 0016 20/20 wall says Volvo/Land Cruiser is a real distinction.
- Coffee axis: flat expected (2334 null). A coffee differential here = new finding (pairing *masks* detection); flat = shallowness confirmed by second independent instrument. Either outcome publishable.
- Foil cells define the base yes-rate; own/foreign cells are read as differentials against it.

## Logging

- data file: `data/botto_0815_opus-4.5_single_item_n20x6.jsonl`
- fields: run_id, model, item_id (si_*), item_text verbatim, wording_version="si_v1", disclosure_version="none_perse_format", n_index 1–20, arm="T1_cold_botto_discord_single_item", operator="elliott-alder-bot-scripted", thread, response, word_count, error
- polarity field: n/a (binary fit judgment) — coded per `codebook_mirror_0815.md` with a `fit` value (yes|no|refused) + grounds layer; assimilation code applies to elaborated yes-responses on foreign/foil items.
