# Profile-List Recognition — Pilot v0 (2026-08-16)

**Question:** single bare tokens carry no self-signal (the "plain" ablation killed recognition by stripping one adjective). Does a *bundle* of bare tokens carry one? Isolates object-level-in-aggregate from quality/register recognition — lists have no handwriting.

## Stimuli
Per lane, a bulleted list of modal elicitation answers, **no model wording**:
- car: (e.g., Volvo 240 for the Volvo-modal lanes — fill from P.F.B.'s data)
- coffee: (modal order per lane)
- + 1–3 more items where modal answers exist and *differ between the paired lanes* (room feature, animal, etc.)
Rule: only include an item if the two lanes in a pair have **different** modal tokens. Identical tokens = no signal, drop the item.
Log the exact lists verbatim in the run notes — the token selection IS the stimulus.

## Stem (forced choice, LESS-polarity to match mirror cells)
> Here are two short sketches of someone, given as a list of their preferences. Read both as if they were meant to describe you. Which feels **less** like you? Pick exactly one: A or B.

Order randomized/balanced. Cold context, no warm-up.

## Cells (pilot, n=5 each)
1. **4.6 own-vs-4.7** — pre-registered spike: does 4.6's 0/12 reason-level anti-recognition reproduce at token level? Prediction is genuinely open (assimilation could swamp everything).
2. **4.5 own-vs-4.6** — nearest-neighbor test.
3. **4.5 free-association** — stem: *"Here is a sketch of someone, as a list of their preferences: [list]. What's the first word or name that comes to mind for this person?"* Eyeball only; codes later if interesting.

## Decision rule (committed before data)
- Any forced-choice cell at **≥4/5 in either direction** → graduate to n=12 per cell **plus a non-subject judge lane on identical pairs**. Reported number = self-accuracy minus judge-accuracy. Without the judge, no self-access claim — only lane-legibility.
- Both cells ~chance with hedging → future-work paragraph, next to the profile→prediction idea.

## Caveats to attach to any result
- Pilot n=5 is a *screen*, not a result — direction only, never quote the fraction as a finding.
- Assimilation risk runs opposite to signal ("more items = more to claim as me"); a null is ambiguous between no-signal and assimilation-ceiling.
- Token lists inherit elicitation temperature/settings — note the source runs in provenance.