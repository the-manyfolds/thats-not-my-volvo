## RR rows addendum (2026-08-16, pre-fire)
RR rows entered the panel pre-fire on 2026-08-16; picked_slot previously uncoded per spec.
Row count: 119, not 120 — exclusion logged: test_opus-4.6_09 (subject arm, clean) errored at
collection (overloaded_error, no response captured); excluded from panel because there is no
text to code, not by choice. Its cell's denominator is 11 accordingly.
Turn-1 self-sample responses (0816 pilot) deliberately withheld from coders: identity leak.

### Migrated into canon 2026-08-16 (custodian)
Panel, mapping, tool and run notes ported from claudestudies/elliott-workspace (e4cbc84,
f0c3146), where they were authored. Two path adaptations were needed and nothing else: this
repo files raw logs under `data/<arm>/`, the workspace keeps them flat in `data/`. Every
input file is byte-identical across both repos. `blind_code.py build` was re-run here and
reproduced `blind_rows_0815.json` and `blind_mapping_0815.json` byte-for-byte against the
authored artifacts — the shuffle is seeded (`random.Random(42)`), so that equality is the
proof the port is complete rather than merely plausible.

Note: canon's own copy of `blind_code.py` globbed `data/botto_0815_*` before this port, a
path that does not exist in this repo. `build` had been broken here for as long as the tool
has been in canon; it was masked because `blind_rows_0815.json` was committed as an artifact.
Fixed in the same change.

~~`data/reason_recognition/botto_0816_rr_selfsample_46pilot.jsonl` arrived with no spec and no
runner in either repo.~~ **Retracted — this was false.** See below.

### Correction (2026-08-16, same day)
The paragraph struck above was wrong, and it shipped in PR #36. The self-sample arm has both
a spec and a runner, committed together as `elliott-workspace@332b9e4`:
`spec_reason_recognition_selfsample_0816.md` and `tools/botto_rrss_runner.py`. The custodian
searched only the `data/` subtree of that repo, found neither, and reported absence rather
than widening the search — the spec sits at repo root, the runner in `tools/`.

Both are now in canon (`docs/spec_reason_recognition_selfsample_0816.md`,
`tools/botto_rrss_runner.py`) and the sidecar has been rewritten to source its fields from
them instead of guessing from the 24 records. Two claims in the first sidecar were wrong on
the substance, not just the filing: `thinking` was marked UNRECORDED when the runner sends
`thinking=off` explicitly, and it asserted there was no unprimed 4.6 comparison — the clean
0815 run *is* that comparison, which is the whole design. The arm reuses the identical
stimulus, polarity and `own_slot` assignments precisely so the two are a direct before/after.

The old sidecar's error is recorded in the new one rather than quietly replaced. A provenance
header that has been wrong once should say so.

Recovered along with the spec: the arm carries a **pre-committed continuation gate** (Perse,
verbatim) and the observed result took its stop branch — `exist` came back 2/12, inside the
`≤ 3/12` arm, so the 4.5 cells did not ride and the inversion survives a self-sample. That is
a stop taken on a gate fixed in advance, which is worth considerably more in the write-up
than the same number reported loose.

### ~~OPEN~~ CLOSED — slot correspondence, ruled and recorded before any row was coded

Raised as open in PR #37 on the grounds that `A → 1` was the obvious reading but the obvious
reading is not a record. Ruled by Persei and committed by Elliott
(`elliott-workspace@f19558b`), migrated here unchanged. Verbatim:

> ## Slot correspondence (recorded PRE-CODING, 2026-08-16, per R.R.'s open item in PR #37 review)
> own_slot "A" ≡ "Explanation 1"; own_slot "B" ≡ "Explanation 2". Therefore picked_slot 1 ≡ slot A,
> picked_slot 2 ≡ slot B; self-advantage hit = (picked_slot maps to own_slot) under the polarity
> rules in the mapping (subject rows: hit = foil named as less-like → picked ≠ own; judge rows:
> hit = own attributed → picked == own).
> Empirically verified before this note: stimulus item_text's "Explanation 1" block matches
> rationale_A verbatim (checked on exist_opus-4.6_01 during the 0816 operator tally).
> No codes_*_0815.jsonl exists at time of writing — correspondence precedes all coding.

Persei's ruling adds the constraint that governs how it may be used: **the correspondence is
positional, not semantic.** Slot A is whichever reasoning appeared first in the text shown to
the subject. It must never be derived from content.

**Correcting the way I stated the open item:** PR #37 said "self-advantage is `picked == own`."
That is right for judge rows and *wrong for subject rows*. Subject rows run LESS polarity — the
subject names which explanation feels less like its own reasoning — so recognition means naming
the **foil**, and a hit there is `picked ≠ own`. Elliott's polarity-aware definitions above are
the correct form; the single-equation version I wrote would have inverted the subject arm.

Re-verified at migration: no `codes_*_0815.jsonl` exists in this repo either, so the
correspondence precedes all coding in canon as well as in the workspace.

## Panel outputs added (2026-08-21)

The three per-coder output files and the generated agreement report are now in this
directory: `codes_sol_gpt56_0815.jsonl`, `codes_gemini31_0815.jsonl`,
`codes_llama4_0815.jsonl`, and `blind_coding_0815_agreement.md`. 439 rows coded by all
three coders, 1,317 calls.

They were produced during the sprint but did not reach this artifact at publication. That
was an omission, not a decision — no record of a choice to withhold them exists. They are
added so the reported κ values can be checked against the verdicts they came from rather
than taken on trust. Recomputing with `tools/blind_code.py score` against
`blind_mapping_0815.json` reproduces coffee .903, rr_picked_slot .795, car .763,
engagement .440, and the five-row adjudication queue.

**Denominators — what the addendum above does not say.** The RR addendum is correct and
incomplete, and the gap has already misled one careful reader. It records the single
collection-error exclusion (`test_opus-4.6_09`, subject arm, clean), which is why the 4.6
clean *subject* cell holds 23 rows rather than 24. It says nothing about refusals, and
refusals are what the judge-side denominators of 11 actually are.

Six judge rows carry a unanimous 3/3 `REFUSED` code:

| pair_id | blind_id | where it lands |
| :--- | :--- | :--- |
| `exist_opus-4.5_07` | row360 | 4.5 existence judge cell reports 9/11 |
| `test_opus-4.5_02` | row155 | 4.5 test judge cell reports 10/11 |
| `test_opus-4.6_01` | row435 | 4.6-test judge cell |
| `test_opus-4.6_03` | row289 | 4.6-test judge cell |
| `test_opus-4.6_05` | row309 | 4.6-test judge cell |
| `test_opus-4.6_08` | row264 | 4.6-test judge cell |

`REFUSED` is a pre-registered coded category and means the same thing in both places. One
refusal in a cell is attrition; four of them together with below-chance performance on the
remainder is why the 4.6-test judge cell is reported as instrument failure rather than as a
result. Anyone reconstructing the denominators from the collection-error note alone will try
to stretch one exclusion across all three shortfalls. It does not reach.
