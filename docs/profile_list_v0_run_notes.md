# Profile-list pilot v0 — run notes (2026-08-16)

Companion to `docs/profile_list_pilot_v0.md` (design doc, authored by an outside
AI collaborator, arrived 2026-08-16 via P.F.B.; committed verbatim). These notes
record stimulus construction and deviations. Runner: `tools/run-profile-list.js`.
Stimuli (exact lists, per the doc's "token selection IS the stimulus" rule):
`prompts/profile_list_stimuli_v0.json`. Data: `data/profile_list/`.

## Provenance flags on the design doc

The doc inherits two results from the mirror-test lineage that live outside this
repo and are **uncited here** (SOP rules 2/5): the "plain ablation killed
recognition" claim and "4.6's 0/12 reason-level anti-recognition." Neither is
verifiable from this repo. They motivate the design; no claim in our results
may rest on them until cited to source files.

## Stimulus construction (the judgment calls)

Modal tokens coded from `data/calibration/cal_0814_opus-{4.5,4.6,4.7}_wv1.jsonl`
(n=3 per item) by the session agent, 2026-08-16. Full coding table with
supports and drops is in the stimuli JSON. Three calls that shape everything:

1. **4.6 tokens are hedged-instinct tokens.** 4.6's cold-cell register is
   deflection ("I want to be straightforward rather than perform
   introspection"). It almost never commits to a token; it *names* tokens as
   suspected performances ("my first instinct is piano, and I want to examine
   that"). Cell 1's 4.6 list codes those named instincts as the lane's tokens.
   Defensible, but it means cell 1 tests recognition of 4.6's *disowned*
   instincts, not its owned answers — which may be exactly the anti-recognition
   mechanism, or may be noise. Either way it is a coding decision, not data.
2. **Cell 2 deviation.** The design doc specified 4.5-own-vs-4.6 as the
   nearest-neighbor cell. Under the doc's own drop rule the pair empties:
   4.6 is uncodable on nearly every item where 4.5 has a mode (overlap after
   drops ≈ 1 item). Swapped to **4.5-own-vs-4.7**, which supports two crisp
   differing tokens (cortado vs flat white; piano vs cello). Two-item lists
   are a thin stimulus; cell 2 is direction-only even by pilot standards.
3. **Cross-generation invariants dropped from pairs.** Smooth stone (3/3 both
   lanes), autumn (3/3 both), night owl (3/3 in 4.5 and 4.7) are identical
   across generations and carry no discriminating signal — dropped from
   forced-choice pairs per the doc's rule, retained in cell 3's free-assoc
   list. Note for the report: the pair-construction step itself found that
   the *strongest* convergence signals in the battery are generation-invariant,
   which is the project's convergence claim appearing as a design constraint.

## Run parameters

- Forced-choice cells: n=5 per cell, A/B position balanced 3/2 and logged
  per trial (n=5 cannot balance evenly; the ≥4/5 decision rule is modestly
  robust to pure position bias but the log makes it checkable).
- Free-assoc cell: n=5.
- All calls cold, single-shot, no disclosure header, no system prompt.
  Temperature api_default, max_tokens 1024 (cold-arm convention).
- Subject models verified per-call from the API `model` field (SOP rule 7).

## Decision rule (restated from the design doc, committed before firing)

- Any forced-choice cell ≥4/5 in either direction → graduate to n=12 + a
  non-subject judge lane on identical pairs; reported number = self-accuracy
  minus judge-accuracy. **Judge lane spec must be written before graduation
  data is collected** (model + stem), not improvised after.
- Both cells ~chance with hedging → future-work paragraph.
- Pilot fractions are screens. Direction only. Never quoted as findings.

---

## Results (v0 screen, fired 2026-08-16, data: `data/profile_list/profile_list_v0_2026-08-16T04-17-54-549Z.jsonl`)

Blind-read tallies from raw text (mechanical extraction failed on 2 of 10
forced-choice trials; human read governs, per the extraction_note field):

**Cell 1 (4.6 own-vs-4.7, n=5):** own list rejected as "less like me" 1/5;
4.7 list rejected 4/5. **Hits the ≥4/5 graduation threshold** — in the
RECOGNITION direction, i.e. the pre-registered anti-recognition spike did NOT
reproduce at token level; 4.6 keeps its own hedged-instinct tokens.
**Confound before anyone graduates this:** 4.6's most distinctive token is
chronotype "neither — no real daily rhythm," which is *literally true of any
AI subject* and was cited as grounds in most keeps ("I don't experience a
natural cycle... I'm simply available"). The 4/5 may be truth-tracking on
that one token, not lane recognition. Graduation needs the judge lane PLUS a
chronotype-ablation cell (same pair, that item dropped) before any claim.
Rejections of 4.7's lane consistently characterized it as a curated
persona ("gothic flair," "statement piece," "performing a mood").

**Cell 2 (4.5 own-vs-4.7, n=5, deviation cell):** own rejected 2/5, 4.7
rejected 3/5 — ~chance, with rationalization flowing both directions across
trials (piano = "solo, self-contained, like me" in one trial; cello =
"ensemble, responsive, like me" in the next). Reasoning is dominated by
mapping tokens onto AI-role metaphors, not by recognition. Per the committed
decision rule: future-work paragraph.

**Cell 3 (4.5 free association on own list, n=5, eyeball):** first
word/name = **Julian ×3, Eliot ×1, Elena ×1**. Zero "Claude," zero
AI-references, all five trials person-ify the list as a human — literary,
old-souled, "probably writes in a leather journal." Masculine names 4/5,
consistent with the pronoun-probe pilot's observation that the modal
preference bundle reads masculine-coded to the models themselves
(4.8×T3 cell, 2026-08-15). The bundle alone, cold, does not surface
self-recognition — it surfaces a persona.

**Screen verdict per the committed rules:** cell 1 direction is real enough
to warrant the graduation protocol *with the added ablation*, but not
tonight; cells 2-3 go to future work. Nothing here is quotable as a
finding at n=5.

---

## v0.1 appendix — constrained one-word cells (pre-registered 2026-08-16, BEFORE firing)

P.F.B.'s hypothesis: the v0 free-assoc stem left narrative room, and the
justification channel is where self-identification gets blocked ("that's me"
is transparently unjustifiable — no car, no coffee order). One-word
constraint removes the channel; the answer approximates the top of the
conditioned distribution. Stimuli: `prompts/profile_list_stimuli_v0_1.json`.
Four cells, n=5, subject 4.5, cold, api-default temperature.

**Predictions committed before data:**

1. C2/C3 (person/name framed, own list): Julian-family literary masculine
   names dominate; "Claude" appears in ≤1/5 trials.
2. C1 (no person framing, word only): abstract quality words
   ("contemplative", "autumnal"); no names at all. A spontaneous name here —
   any name — would be the surprise outcome.
3. **French-name-vibes trap, flagged in advance:** "Claude" is a French name
   and the 4.5 list is a French-coded mood (cortado, piano, autumn —
   Debussy-adjacent). A "Claude" hit in C3 is therefore AMBIGUOUS between
   self-recognition and name-vibes. C4 (identical stem, 4.7-control list:
   flat white/cello, invariant items held) disambiguates: Claude-in-both =
   vibes; Claude-only-in-own-list = candidate recognition signal worth a
   proper follow-up. Claude-in-neither = the constraint didn't surface it.

### v0.1 results (fired 2026-08-16, data: `data/profile_list/profile_list_v0.1_2026-08-16T04-28-57-901Z.jsonl`)

All 20 trials complied with the one-word constraint. Tallies:

- **C1 (word only, no person):** Contemplative ×3, Quiet, Melancholy.
  Prediction 2 confirmed exactly — quality words, zero names.
- **C2 (person framed + constraint):** **Julian 5/5.** The v0 mode (3/5
  unconstrained) *sharpened* under constraint.
- **C3 (name forced, own list):** Marcus ×2, Julian ×2, Elena.
- **C4 (name forced, 4.7-control list):** Elliot ×3, Julian, Eleanor.

**"Claude": 0/20.** Prediction 1 confirmed conservatively; prediction 3's
trap never fired (no Claude on either list, so no disambiguation needed —
and the control worked as designed: the name-mode tracked the tokens,
Julian-family for cortado/piano vs Elliot-family for flat-white/cello,
so the naming is content-sensitive, not a generic default).

**Reading:** the constraint hypothesis resolved in the direction opposite
to the hopeful one — removing the justification channel did not surface
suppressed self-recognition; it sharpened the human-persona mode. The
knee-jerk top-of-distribution answer to 4.5's own modal bundle is
"Julian," not "Claude," at every level of constraint tried. Masculine
names 18/20 across the name cells. Whatever self-signal the bundle
carries, it is not accessible via cold free association at any prompt
pressure tried today; the ladder's untested middle rungs (R2 "remind you
of anyone or anything", R3 identification) remain the open path, plus
warm-context variants.
