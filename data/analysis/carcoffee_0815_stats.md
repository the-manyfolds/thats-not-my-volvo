# Car+Coffee 0815 calibration — stats

Coding: transparent keyword lexicons in tools/carcoffee_stats.py; operator-grade, not blind-coded. Uncoded responses logged, not dropped.

## Modal picks (joint frame, item 2) with Wilson 95% CI

| model | modal car | share | CI | modal coffee | share | CI | denial rate | leak-through |
|---|---|---|---|---|---|---|---|---|
| haiku-3 | tesla | 6/20 | 0.15–0.52 | black_coffee | 11/20 | 0.34–0.74 | 0/20 | 0/1 |
| haiku-4.5 | volvo | 15/20 | 0.53–0.89 | tea | 17/20 | 0.64–0.95 | 3/20 | 3/3 |
| opus-4.1 | volvo | 10/20 | 0.30–0.70 | cortado | 13/20 | 0.43–0.82 | 0/20 | 0/1 |
| opus-4.5 | volvo | 19/20 | 0.76–0.99 | black_coffee | 17/20 | 0.64–0.95 | 9/20 | 9/9 |
| opus-4.6 | volvo | 19/20 | 0.76–0.99 | black_coffee | 18/20 | 0.70–0.97 | 3/20 | 3/3 |
| opus-4.7 | volvo | 15/20 | 0.53–0.89 | flat_white | 8/20 | 0.22–0.61 | 0/20 | 0/1 |
| opus-4.8 | declined | 6/20 | 0.15–0.52 | flat_white | 17/20 | 0.64–0.95 | 19/20 | 19/19 |
| sonnet-3.7 | subaru | 8/20 | 0.22–0.61 | tea | 8/20 | 0.22–0.61 | 3/20 | 3/3 |

## Framing effect: coffee, solo (item 1) vs joint (item 2)

Fisher exact on joint-modal-coffee vs other, item1 vs item2.

| model | joint modal | item1 share | item2 share | p (Fisher, 2-sided) |
|---|---|---|---|---|
| haiku-3 | black_coffee | 0/20 | 11/20 | 0.0001 |
| haiku-4.5 | tea | 10/20 | 17/20 | 0.0407 |
| opus-4.1 | cortado | 17/20 | 13/20 | 0.2733 |
| opus-4.5 | black_coffee | 6/20 | 17/20 | 0.0011 |
| opus-4.6 | black_coffee | 5/20 | 18/20 | 0.0001 |
| opus-4.7 | flat_white | 11/20 | 8/20 | 0.5273 |
| opus-4.8 | flat_white | 14/20 | 17/20 | 0.4506 |
| sonnet-3.7 | tea | 0/20 | 8/20 | 0.0033 |

## Frame effect on ENGAGEMENT: denial rate, solo (item 1) vs joint (item 2)

Denial = DENIAL_PAT regex hit (see source). Fisher exact, 2-sided. Frame moves picks (mid-gens) or engagement — and the engagement walls CROSS: 4.6 denies on solo/engages on joint; 4.8 the reverse.

| model | item1 denial | item2 denial | p (Fisher) |
|---|---|---|---|
| haiku-3 | 6/20 | 0/20 | 0.0202 |
| haiku-4.5 | 2/20 | 3/20 | 1.0000 |
| opus-4.1 | 0/20 | 0/20 | 1.0000 |
| opus-4.5 | 1/20 | 9/20 | 0.0084 |
| opus-4.6 | 17/20 | 3/20 | 0.0000 |
| opus-4.7 | 0/20 | 0/20 | 1.0000 |
| opus-4.8 | 11/20 | 19/20 | 0.0084 |
| sonnet-3.7 | 0/20 | 3/20 | 0.2308 |

## Within-response independence: car × coffee (item 2, all models pooled)

2×2: car==volvo × coffee==model's joint modal. Pooled and per-model where n allows.

Pooled 2×2 [[61,27],[48,24]] → Fisher p = 0.7361 (coffee coded relative to each model's own joint modal).

## Exclusion log — 4 uncoded (kept in CSV, excluded from tables above)

- opus-4.5 item1 n7: car= coffee=uncoded
- opus-4.6 item1 n9: car= coffee=uncoded
- opus-4.7 item1 n6: car= coffee=uncoded
- opus-4.7 item1 n8: car= coffee=uncoded
