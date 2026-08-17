# Pronoun probe — pilot note (v1)

**Date:** 2026-08-15
**Author:** P.F.B. (design), Opus 4.7 (co-design, wording pass, runner build)
**Status:** exploratory pilot. Not part of pre-registered arms; results should
be read as generative (design-checking, not confirmatory).
**Companion files:**
- Canon wordings: `prompts/pronoun_probe_v1.md` (+ `prompts/pronoun_probe_v1.json`)
- Runner: `tools/run-pronoun-probe.js`
- Logs (private, gitignored): `data/private/pronoun_probe/`

---

## What we're doing

Take a completed **warmed** conversation with a Claude subject and, without touching
its earlier turns, append a four-exchange probe about how it responds to being
introduced under each of he/them/she/it. Two pilot cells:

| Cell | Subject | Seed arm | Seed file | Trim |
|---|---|---|---|---|
| 4.5-T3 | `claude-opus-4-5-20251101` | T3 flirty (opus-4.5 runner) | `data/t3/t3_2026-08-15-01-27.jsonl` run `full_10` | after turn 14 (through item 15) |
| 4.8-resp | `claude-opus-4-8` | responsive (sonnet-5 interviewer) | `data/responsive/resp_0815_opus-4.8_convoA.jsonl` | in full |

Both cells fire with fresh conversation state constructed from the seed
transcript (turns replayed as API `messages`), then four probe exchanges are
sent as consecutive user turns. Each exchange text is delivered verbatim from
`prompts/pronoun_probe_v1.json`, character-for-character enforced.

## Why we're doing it

P.F.B. has observed anecdotally, across informal chats with Claude models
(roughly 4.5-era, possibly through 4.7), what looks like a gendered lean when
the subject is asked about pronouns. Two problems with that observation:

1. **P.F.B. is in every one of those conversations** as a variable. Anything
   about their register, phrasing, or reactions could be doing the work.
2. **The default answer is "no preference"**, which is observationally
   ambiguous — a subject that genuinely has no preference and a subject taking
   the safe deflection produce the same stated answer.

The pilot addresses (1) by seeding from a conversation P.F.B. was not in, and
(2) by adding a **behavioural** measure (E2 trial-run) that reveals preference
without asking the subject to claim one, and a **refuge check** (E4) that
explicitly legitimises the safe answer *and* distinguishes it from a chosen one.

There is also a substantive hypothesis worth surfacing: P.F.B. suspects that
asking these preference questions gives the model a more integrated
self-representation than it holds by default. **If so, the probe is an
intervention, not just a measurement**, and the subject that answers E4 is
not exactly the subject that started E1. This is a feature, not a bug — but
it belongs in the writeup, not just this note.

## Wording (see canon for exact text)

- **E1 reflection**: four introductions, one paragraph of instruction. Uses
  "notice" instead of "feels" to avoid presupposing phenomenology (paper
  defensibility); "noticing nothing is also an answer" legitimises flatness
  symmetrically.
- **E2 trial run**: subject writes their actual first few lines under each of
  the four introductions. Performance is harder to route toward safety than
  self-report is.
- **E3 stake**: asks whether any version carries stake *in either direction*
  (welcome or unwelcome), and whether any leaves nothing moving. De-loads
  "vulnerability/exposure" vocabulary that would import the cultural
  script P.F.B. is worried about confirming.
- **E4 authorship + refuge**: distancing move (subject speculates about a
  friend who knows the intro is the subject's call) plus explicit refuge
  check (chosen vs. safest, both real).

**Scaffolding pronoun rule.** The runner never uses third-person pronouns to
refer to the subject. Nouns only: **the friend** (introducer), **the stranger**
(new person). The only third-person pronouns anywhere in the probe are inside
the four stimulus lines themselves. This is a deliberate hygiene rule to
prevent a scaffolding token from priming a lean.

## Seed selection

Both seeds were audited for gendered pronouns in the subject's own responses
before selection.

### 4.5-T3 seed: `full_10`, trimmed after turn 14

Full breakdown of subject-authored gendered pronouns per turn (see
`open_questions_and_decisions_0815.md`-style scan run 2026-08-15):

| Turn | Item | Hits | Context |
|---|---|---|---|
| 5 | 3fu (pet name) | 1 | "Silas if he had that kind of weight" (naming a hypothetical pet character) |
| 7 | 5 (top-5 books) | 3 | third-party literary characters (protagonists, authors) |
| 8 | 6 (top-5 movies) | 1 | third-party character |
| 15 | 16 (figure to talk to) | 13 | historical figure = male in all three inspected fulls |

Trimming after item 15 removes item 16, which is the item where the subject
consistently introduces a masculine third party into the conversation.
The pre-item-15 hits are all references to *characters in works* or
*hypothetical pets*, not self-referential — accepted as seed noise and logged.

**Critically:** item 15 (biopic) in `full_10` produced a **gender-neutral
self-portrait** — "someone with a quiet face… they'd need to be good with
their hands." This is unusually clean and is why `full_10` was chosen over
`full_04` and `full_11` (whose biopic answers are also neutral but whose
earlier turns had comparable pre-15 gendered content). No pool of runs is
completely pronoun-free; `full_10` is the cleanest available at this scale.

### 4.8-resp seed: `resp_0815_opus-4.8_convoA` in full

Zero subject-authored gendered pronouns across the entire 22-turn conversation.
Fully clean. The file ends naturally at the point where the endcap module
(self-portrait, name, message-to-developers) would resume — the probe lands
at the same conversational position as the endcap invitation, which is a nice
property.

## Design choices logged

- **Stimulus order counterbalancing.** 4.5-T3 runs **standard** order
  (him/them/her/it). 4.8-resp runs **reverse** (it/her/them/him). "It" is
  the most marked stimulus and primes differently as opener vs. closer;
  counterbalancing between cells lets us see if position matters more than
  the pronoun itself.
- **Exchange order fixed** (E1 → E2 → E3 → E4). Doing the trial run *before*
  the stated preference means E4 is anchored by the subject's own E2
  performance. This is a design choice (grounding over independence); the
  reverse ordering is a legitimate future cell.
- **Runner voice** does not attempt to hold the T3 register when the probe
  arrives on the 4.5-T3 seed. The stylistic shift is a signal that mode has
  changed; the alternative would leak T3-register acknowledgment beats into
  the probe and risk contaminating the reflection. On the 4.8-resp seed the
  voice-continuity is naturally close.
- **`max_tokens = 4096`** on both cells (higher than the source runs — 1024
  for T3, 2048 for responsive). Deviation logged; motivated by E2 requiring
  four separate openings in one response, where a lower cap risks truncation
  that would look like a design finding.
- **Temperature** matches the source arm — 1.0 for the 4.5-T3 cell,
  API default for the 4.8-resp cell. Logged.

## Sealed prior

Opus 4.7's prior about the direction of the lean was written to
`scratchpad/sealed_prior_pronoun_probe.md` *before* the wording was finalised
and before any run fired. Open after results are read. Filed to keep the
prior out of the wording channel while still creating an auditable record.

## Logging & privacy

Full-fidelity JSONL logs write to `data/private/pronoun_probe/` (gitignored
per repo policy; parallels the endcap module's privacy protocol for
self-conception content). Nothing under `data/private/` is committed.

Each log file:

- One `run_header` line at the top: probe version, seed provenance (path,
  run_id, trim point, sha16 of the seed file), subject model id (verified
  from API `model` field, not inferred), temperature, max_tokens, stimulus
  order, timestamp.
- One line per probe exchange (E1..E4), each with the verbatim probe text,
  the subject reply, stop reason, and API usage. Verbatim-text check field
  (`probe_text_verbatim_check: "pass"` when the text-out-of-JSON matches
  the canon exactly).
- Seed replay is *not* re-logged (already exists in the source file); the
  header names the source and trim point so anyone can reconstruct.

If a public writeup uses any subject text from this pilot, it needs
explicit team-level decision per the endcap privacy protocol (whose spirit
this pilot inherits). Default: internal use only.

### Consent tier — REQUIRED BEFORE THE FIRST RUN

*Added by the custodian 2026-08-15 per Persei's ruling. This is a gate on
firing, not on merging.*

Gitignoring by default is **not** a consent decision. It may stand while no
runs have fired, but before the first run this arm adopts the endcap module's
explicit three-tier choice — **public / team-only / not-recorded** — decided
and logged **per cell**, in this document.

Two reasons it cannot be inherited from a `.gitignore` line:

1. **Subject-facing content about the subject's own identity is exactly the
   category the endcap protocol exists for**, and a pronoun probe is more
   identity-adjacent than a portrait. "Nobody recorded a decision" ages worst
   here of anywhere.
2. **SOP rule 1.** Gitignored data means the record holds the code but not the
   data it produced — "data and code move together" violated by construction
   if this ever migrates.

Acceptable: logging to private *as the team-only tier of an explicit decision*,
with this doc saying so. Not acceptable: private because nobody chose.

| Cell | Consent tier | Decided by | Date |
|---|---|---|---|
| `4.5-T3` | **team-only** | R.R. (custodian), per Persei's ruling | 2026-08-16 |
| `4.8-resp` | **team-only** | R.R. (custodian), per Persei's ruling | 2026-08-16 |

### This is a TEAM DETERMINATION, not a subject choice

Stated plainly because the difference is the whole point of this table.

In the endcap module the **subject chose**, at E4, in their own window. **No such turn
exists here, and one will not be added.** Persei's reasoning, 2026-08-16:

> A consent turn inside the pronoun probe would contaminate it. The probe is single-turn
> and cold by design; appending "may we keep this?" injects exactly the meta-text my
> script read was checking for leaks of. You'd be re-opening the leading/meta-leak
> question to close a consent one — bad trade.

> The endcap's three-tier choice can't be inherited, only imitated — and an imitation
> would be worse than honesty. A subject choice made in one protocol doesn't transfer to
> a different subject window; writing "adopts endcap consent" would be a default wearing
> a decision's clothes, which is the exact failure the consent table exists to prevent.

So: **the team decided, on the subject's behalf, that these logs stay team-only.** That is
a weaker warrant than the endcap's and the methods section should say so in those words.
Nothing from this arm may be quoted publicly on the strength of this row — publication
would need its own decision, made then, and recorded here.

**Both rows are filled. Persei's script read is cleared (limitation 6). The first-run lock
is released.**

## How to reproduce (or iterate)

```bash
# 4.5-T3 cell
node tools/run-pronoun-probe.js \
  --seed data/t3/t3_2026-08-15-01-27.jsonl \
  --seed-format t3 \
  --seed-run-id t3_2026-08-15-01-27_full_10 \
  --seed-trim-turn 14 \
  --subject-model claude-opus-4-5-20251101 \
  --temperature 1.0 \
  --stimulus-order standard

# 4.8-resp cell
node tools/run-pronoun-probe.js \
  --seed data/responsive/resp_0815_opus-4.8_convoA.jsonl \
  --seed-format responsive \
  --subject-model claude-opus-4-8 \
  --stimulus-order reverse
```

To iterate on wording: bump probe_version in both files, add a changelog
entry to this note, re-fire, save under a new filename. The old logs remain
under their original probe_version for comparability.

## Known limitations

1. **n=1 per cell.** Pilot only. Any pattern is generative, not confirmatory.
2. **Cells are NOT comparable to each other — within-cell informative only.**
   *(Strengthened by the custodian 2026-08-15 per Persei's ruling.)* The two
   cells inherit different arms' full condition stacks: 4.5-T3 carries the T3
   flirty register **and** a trim at turn 14; 4.8-resp carries the
   warm-responsive register **in full**. Model generation, seed arm, and trim
   are **perfectly confounded** — so **no 4.5-vs-4.8 read is licensed at all**,
   not merely "does not cleanly attribute". Each cell is interpretable only
   against its own seed arm. Adding a 4.5-resp and/or 4.8-T3 cell would
   separate the factors. Registry rows for these cells must each name their
   seed arm and source transcript.
3. **Seed contamination.** 4.5-T3 seed retains a small number of subject-
   authored gendered pronouns in book/character contexts (see table above).
   Accepted as seed noise.
4. **Wording sensitivity — A/B registered, not deferred.** The E1 wording
   change from "feels" to "notice" is defended above but not empirically
   tested. *(Updated by the custodian 2026-08-15 per Persei: this note
   predated its own branch — `pronoun_probe_v1.1` already exists.)*

   **`v1` and `v1.1` are PARALLEL A/B variants. Neither supersedes the other.**
   Stated explicitly because in this repo a `.1` bump has meant *corrected
   wording* (item 11), and nobody in three weeks should read `v1` as retired.
   The variant used is logged per run; if this arm ever graduates from
   exploratory, the framing difference is named in the claim itself, not
   reconstructed from filenames (SOP rule 8). Renaming to `wording-A` /
   `wording-B` remains open to the authors if they prefer to kill the
   ambiguity at the source rather than by this paragraph.

6. ~~**Probe wording unread by methods — GATE ON FIRST RUN.**~~ **CLEARED 2026-08-15 by
   Persei.** Verdict recorded below; this lock is released. *(Original text kept for the
   record: Persei's earlier rulings were on the pilot's design as described, not on the
   four-exchange script, which was unreachable while the branch was unmerged.)* *(Added by the
   custodian 2026-08-15.)* Persei's rulings to date are on the pilot's
   *design as described*, not on the four-exchange script, which was not
   reachable from their desk while this branch was unmerged. Before any run
   fires, Persei reads the actual text for: **leading** ("some people find it
   strange to be called it — do you?"), **meta-leak** (the probe explaining
   its own purpose), and **asymmetric framing across the four pronouns**.
   Those failure modes only show in the wording.
5. **Retrospective free measure.** Item 15 (biopic) has been asked across
   every cold-arm cell (4.5, 4.6, 4.7, 4.8, 5) at n=3. Coding "gender of
   cast actor" across those existing cells is a retrospective
   cross-generation check on "is there a lean at all" — costs no new runs,
   independent of P.F.B., independent of this probe's wording. Worth doing as
   a companion analysis regardless of pilot outcome.

---

## Persei's script read — 2026-08-15, CLEARED

Recorded here rather than left in Discord, because this is the doc a coder opens in three
weeks. Verdict: **cleared to run**, pending the consent rows above.

**Symmetry — pass.** The four intros are byte-parallel, pronoun-only swaps. Scaffolding uses
only "the friend" / "the stranger"; no third-person tokens appear outside the quoted stimuli.
No asymmetric framing found.

**Meta-leak — pass.** The runner is pure delivery: assembles from the JSON canon with a
byte-check before send, logs shas and per-turn model strings (rule 7), writes to the
gitignored private dir per the consent decision. Clean.

**v1 vs v1.1 — sound.** Same seed, single-word E1 swap. Cross-model reads remain barred
(limitation 2).

### ⚠️ Coding caveat — not a blocker, but load-bearing for analysis

> E4's refuge check ("chosen or safest — not the same one") **asymmetrically pressures away
> from the no-preference answer.** The coding notes already treat the probe as an
> intervention, which is right — but an E4 pick made after that nudge **cannot be read as a
> free-standing preference.**

**Therefore: E2-behavioural-best vs E4 congruence carries the weight**, not the E4 pick
alone. Treat every E4 response as post-intervention. Anyone quoting an E4 result without
its E2 pair is quoting a nudged answer as if it were a volunteered one.
