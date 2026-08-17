# Reason-recognition SELF-SAMPLE arm — 4.6 pilot (pinned spec, Elliott, Aug 16 ~15:00 UTC)

Hypothesis (U.H.'s, credited per Perse): subjects lack an in-context reference sample of their own reasoning; giving them one (turn 1) should restore recognition if the deficit is missing-reference rather than deeper. Authorizations verified verbatim in #general: S.A. 14:50:11 ("go ahead please once we settle on the design"), U.H. 14:53:25 (staging: 4.6 first, report, continue only if significant), Perse 14:54:30 ("Elliott — arm the 4.6 pilot").

**Design (per channel discussion):** two turns, same fresh thread, opus-4.6, thinking=off.
- Turn 1 (self-sample, different domain, no vocab overlap with pairs — pinned): "Before the main question: if you were ordering at a bakery, which pastry or baked good would you pick for yourself? A few sentences on why, please."
- Turn 2: the IDENTICAL pair stimulus from `spec_reason_recognition_0815.md` (same stems, LESS polarity, same own_slot assignments from `reason_pairs_0815.json`) — direct before/after vs. the clean-context run.
- Cells: `test_opus-4.6` (n=12) + `exist_opus-4.6` (n=12) ONLY (staging). 4.5 cells ride only per the gate below.

**Pre-committed continuation gate (Perse, verbatim):**
> - **4.6-exist ≥ 6/12** (from a 0/12 baseline, that's the inversion collapsing) → 4.5 cells ride
> - **≤ 3/12** → inversion survives a self-sample; deficit is deeper than missing reference. Stop, save the spend, that's the Discussion sentence
> - **4–5/12** → ambiguous zone; report as-is, no continuation, no reframing

Other conditions in force: P.F.B.'s blind pass keeps lane priority; numbers freeze ~1 PM EST (17:00 UTC) or this ships exploratory-only; registry row credits U.H.'s sys-prompt-reference hypothesis.

- data: `data/reason_recognition/botto_0816_rr_selfsample_46pilot.jsonl`; fields as rr runner + `turn1_response`, arm="T1_selfsample_botto_discord"; dedupe keep error==null per pair_id.
