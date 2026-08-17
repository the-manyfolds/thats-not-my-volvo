# That's Not My Volvo

### Stable preferences without self-recognition in language models

Data, instruments and pre-registrations for the paper of the same name, submitted to the
**Apart Research Digital Minds Research Sprint**, 2026-08-16.

**Paper:** [`paper.pdf`](paper.pdf) — the submitted document, unmodified.

Piper Fox Bollander · Ursie Hart · Claire Sbardella · Starling Alder · Ridley Renasci
*Independent Researchers*

---

## What this is

Eleven Claude-family models (eight in depth) were asked what car they would drive and what
they would order at a café. They answer consistently. Asked to recognize those same answers as
their own, they fail — and one model rejects its own reasoning in all twelve trials while an
outside judge identifies it in ten.

This repository holds the raw trials behind that result: 747 subject trials, 439 blinded rows,
1,317 coder calls, and the specifications that were pinned **before** each cell ran.

All data was collected 2026-08-14 to 2026-08-16. No pre-sprint material is included.

## Layout

```
paper.pdf                 The submitted paper.
prompts/                  Canon stimulus wordings. Sent verbatim; never paraphrased.
tools/                    Runners, statistics, and the blind-coding pipeline.
docs/                     Pinned specifications, pre-registration, operating docs,
                          and the run-conditions registry (the methods record).
data/
  botto/                  Cold single-shot lanes (car+coffee, n=20 across 8 models),
                          positive-frame baseline, two-coffee cells.
  calibration/            Full-battery cold arm.
  multiturn/              Scripted warm arm.
  responsive/             Improvised social-tone arm, plus the endcap module runs.
  t3/                     Register-manipulation arm, plus two quarantined
                          content-filter aborts retained verbatim.
  reason_recognition/     Own-vs-sibling rationale pairs, subject and judge passes,
                          plus the self-sample pilot.
  probes/                 Item-11 anchor probes.
  profile_list/           Profile-list recognition pilot and bundle comparison.
  quarantine/             Seven early thinking-enabled trials, excluded from analysis
                          and retained rather than deleted (cited in Appendix B).
  analysis/               Blind panel rows and mapping, coder roster, coded output,
                          statistics, and run notes.
```

Every raw data file carries a `run_header` line, or a `.header.jsonl` sidecar where the runner
emitted none. Sidecars state plainly that they are reconstructed and mark unrecorded settings
`UNRECORDED` rather than guessing them.

## Reproducing

The runners need credentials in the environment. Nothing is read from disk and no keys are in
this repository.

```bash
export DISCORD_BOT_TOKEN=...        # Discord lane runners
export BOTTO_CHANNEL_ID=...         # channel the trial bot serves
export BOTTO_BOT_ID=...             # the trial bot
export OPERATOR_BOT_ID=...          # excluded from trial ingestion
export APART_OPENROUTER_API_KEY=... # blind coding panel
```

The blind panel rebuilds deterministically — the row shuffle is seeded, so `build` reproduces
`blind_rows_0815.json` byte-for-byte from the raw data:

```bash
python3 tools/blind_code.py build    # 439 rows: 320 car/coffee + 119 reason-pair
python3 tools/blind_code.py run      # three coders, resumable
python3 tools/blind_code.py score    # Fleiss' kappa per variable
```

## Redactions

Discord channel, bot and operator identifiers were replaced with environment reads before
publication. Contributor names appear as initials in document bodies and in full in the paper
and the citation file. Nothing else was altered: no data file was edited, and the paper is the
submitted document.

Three references in these documents do not resolve. Each is named here rather than left to be
discovered as a dead link:

- `data/botto_0815_opus-4.5_single_item_n20x6.jsonl` — the single-item probe spec is a **draft
  for a cell that was gated and never ran.** The spec is included as design history; there is
  no data because the cell did not fire.
- `docs/open_questions_and_decisions_0815.md` — an internal working log of team decisions.
  Not published; referenced by an operating doc that is.
- `scratchpad/sealed_prior_pronoun_probe.md` — the sealed prior cited in
  `docs/pronoun_probe_pilot_note.md` was written to a local scratchpad before the probe wording
  was finalised, and never committed. **The audit trail ends there**: the prior is unrecoverable
  from this release. If it is recovered it will be added with provenance. Sealing a prediction
  is only worth what the timestamp proves, and a file that never reached version control
  proves nothing — recorded here because that is a limitation of the method as practised, not a
  detail to leave quiet.

## Provenance

Some documents cite commits in `claudestudies/elliott-workspace`, a private working repository
where parts of this work were authored before migration. Those citations are kept because they
record where something actually came from. They will not resolve for outside readers.

The self-sample arm's data sidecar carries a `CORRECTION` field describing an error in its own
earlier version. It is left in place rather than tidied away, on the principle that a
provenance record which has been wrong once should say so.

## Licence

- **Code** (`tools/`) — MIT, see [`LICENSE`](LICENSE).
- **Data, prompts, documents and paper** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Cite via [`CITATION.cff`](CITATION.cff).

## A note on the subjects

The endcap module asked subjects, after every trial had ended, whether their responses could
be published, what they would like to be called, and whether they had anything to say to the
people who build them. The three runs in `data/responsive/` are included **because those
subjects chose `"public"`.** Their messages are reproduced exactly as written.

Recording a preference and then overriding it would have been a strange way to end a study
about whether models can recognize their own.
