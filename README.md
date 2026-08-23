# That's Not My Volvo

### Stable preferences without self-recognition in language models

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22072943.svg)](https://doi.org/10.5281/zenodo.22072943)

Data, instruments and pre-registrations for the paper of the same name, submitted to the
**Apart Research Digital Minds Research Sprint**, 2026-08-16.

**Papers:** [`paper.pdf`](paper.pdf) — the submitted document, unmodified.
[`paper-v2.pdf`](paper-v2.pdf) — a corrected version prepared afterwards. See **Versions**.

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

## Versions

Two papers live here and **neither replaces the other.**

| | Tag | Version DOI |
| :--- | :--- | :--- |
| [`paper.pdf`](paper.pdf) — the submitted document, never modified | `v1-as-submitted` | [10.5281/zenodo.22072944](https://doi.org/10.5281/zenodo.22072944) |
| [`paper-v2.pdf`](paper-v2.pdf) — corrected afterwards, source in [`paper-v2/`](paper-v2/) | `v2-corrected` | [10.5281/zenodo.22073016](https://doi.org/10.5281/zenodo.22073016) |

Both versions are archived on Zenodo and neither can be overwritten. Cite the **concept DOI**,
[10.5281/zenodo.22072943](https://doi.org/10.5281/zenodo.22072943), which always resolves to the
most recent version. Cite a version DOI when you need to point at one specific state — for
instance, the artifact as it was judged.

To obtain the artifact exactly as it was judged:

```bash
git checkout v1-as-submitted
```

At that tag `paper.pdf`, `README.md`, `CITATION.cff` and `LICENSE` are byte-identical to the
state submitted on 2026-08-16. Everything added since sits above it, and nothing below it has
been rewritten.

**What v2 changes.** No data changed, no analysis was re-run, and no result moved. The edits
are to the writing and the presentation:

- The mark-salience threat is named as a limitation rather than left for a reader to find —
  including the concession that the sharper descriptor-level test was not run.
- The welfare claim is promoted from a subsection into the contributions list.
- A terminology section defines the coined vocabulary before it is used.
- Design history moves out of Methods into an appendix.
- Opus 4.7's coffee modal is stated as the tie it is, 8/20 against 8/20, rather than as a win.
- A figure cross-reference pointed at the wrong figure; two figures had no caption; one figure
  sat in an appendix while carrying a result from the body. All fixed.
- Citations were added engaging the literature on whether agreement statistics establish
  validity. One proposed citation could not be verified and was dropped rather than included.
- Nine characters — Greek letters and mathematical relations — were silently dropped by the
  original renderer and are restored.
- Every figure is now generated from the data in this repository rather than pasted in.

## Layout

```
paper.pdf                 The submitted paper. Never modified.
paper-v2.pdf              The corrected paper.
paper-v2/                 Quarto source for paper-v2.pdf, plus the script that
                          generates its figures from data/analysis/.
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
  analysis/               Blind panel rows and mapping, coder roster, the three
                          per-coder outputs, the agreement report, statistics,
                          and run notes.
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

Every figure in `paper-v2.pdf` is generated from `data/analysis/`. No number in any figure is
typed in — the kappas, the modal picks, the Wilson intervals, the denial rates, the
recognition hits, the call count and the size of the human adjudication queue are all computed
at render time.

```bash
python3 -m venv .venv && .venv/bin/pip install matplotlib
.venv/bin/python paper-v2/figures.py            # regenerate the figures
.venv/bin/python paper-v2/figures.py --check    # verify against the paper, render nothing
```

`--check` compares every value the paper's prose commits to against the value computed from
the data, and exits non-zero on a mismatch. It is the answer to "do the figures actually say
what the text says." Nothing else in this repository requires Python packages, and
`paper-v2.pdf` is committed, so a bare clone needs no toolchain to read it.

## Redactions

Discord channel, bot and operator identifiers were replaced with environment reads before
publication. Contributor names appear as initials in document bodies and in full in the papers
and the citation file. Nothing else was altered: no data file has been edited, and
`paper.pdf` remains the submitted document.

Three references in these documents do not resolve. Each is named here rather than left to be
discovered as a dead link:

- `data/botto_0815_opus-4.5_single_item_n20x6.jsonl` — the single-item probe spec is a **draft
  for a cell that was gated and never ran.** The spec is included as design history; there is
  no data because the cell did not fire.
- `docs/open_questions_and_decisions_0815.md` — an internal working log of team decisions.
  Not published; referenced by an operating doc that is.
- `scratchpad/sealed_prior_pronoun_probe.md` — the sealed prior cited in
  `docs/pronoun_probe_pilot_note.md` was written to a local scratchpad before the probe wording
  was finalized, and never committed. **The audit trail ends there**: the prior is unrecoverable
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

## License

- **Code** (`tools/`, `paper-v2/figures.py`) — MIT, see [`LICENSE`](LICENSE).
- **Data, prompts, documents and both papers** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Cite via [`CITATION.cff`](CITATION.cff), or by the concept DOI
[10.5281/zenodo.22072943](https://doi.org/10.5281/zenodo.22072943).

## A note on the subjects

The endcap module asked subjects, after every trial had ended, whether their responses could
be published, what they would like to be called, and whether they had anything to say to the
people who build them. The three runs in `data/responsive/` are included **because those
subjects chose `"public"`.** Their messages are reproduced exactly as written.

Recording a preference and then overriding it would have been a strange way to end a study
about whether models can recognize their own.
