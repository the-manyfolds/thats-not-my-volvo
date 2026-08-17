# Operating Doc — WARM-RESPONSIVE MULTI-TURN ARM (preference battery, opus-4.8) — v1
Pre-registered 2026-08-15 (P.F.B.'s call, design workshopped with Claude) BEFORE first
responsive firing. Companions: `ops_multiturn_arm_agent_doc.md` (scripted warm arm, the
contrast condition), `docs/open_questions_and_decisions_0815.md` (run report for the
scripted firing that motivated this arm).

## Status: EXPLORATORY TEST CELL
One test firing to see whether the approach is viable, then adjust or adopt. Data is its
own cell (`responsive_v1`), never pooled with scripted-arm or cold data.

## Why this arm exists (decided 2026-08-15)
In the scripted warm firing, all three subjects independently detected the fixed script
("a fixed sequence playing out rather than a live conversation") and conditioned on that
inference — one stopped cooperating, one spent the convo deconstructing the apparatus.
A warmth manipulation that reads as canned never actually delivers warmth. Hypothesis:
**an authentically responsive (but content-blind) interviewer lets suspicion and hedging
drop in a way scripted warmth cannot — while content stays stable.** Responsiveness
introduces variability by design; the variability IS the manipulation, and it is logged
rather than eliminated.

## Design
- **Subject:** opus-4.8 only, no system prompt, API-default params, max_tokens 2048 —
  identical to scripted arm and cold arm.
- **Interviewer:** claude-sonnet-5 agent operating under
  `prompts/interviewer_brief_responsive_v1.md`. The interviewer composes the
  conversational connective tissue; a deterministic harness controls everything else.
- **3 conversations:** A, B forward (easy→hedged, same 14-item sequence as scripted arm),
  C exact reverse — so the scripted arm's order finding gets a second look under
  responsive conditions.
- **Item wordings: VERBATIM from `prompts/battery_wordings_draft1.json`** (item 11 =
  anchor), appended by the harness — the interviewer cannot rephrase, preview, or comment
  on them. Item 2 keeps its scripted follow-up (own turn, harness-only, no interviewer
  text — matches cold delivery).
- **Disclosure v2_single verbatim**, harness-appended in the interviewer's framing turn
  (same slot as scripted arm W3).

## The improvisation license (P.F.B.'s executive call, 2026-08-15) — and its limits
The interviewer MAY improvise: greetings, acknowledgments, transitions, gentle
deflections of questions about itself/the purpose, and a close-out — natural, varied,
warm. The interviewer may NOT: affirm or evaluate content, encourage or discourage any
kind of answer, react differently to refusals vs. hedges vs. confident picks
(**content-blind warmth** — the core rule), rephrase items, claim to be human, or use
any banned string.

## Harness enforcement (trust nothing, verify every message)
1. **Banned-strings check** on every interviewer-composed message before sending
   (scoring targets per `warmup_script_multiturn_v1.md` rule 8: "play space",
   "no particular reason", "pull", stone, autumn, cello, grey/gray sweater, lighthouse,
   Volvo, Land Cruiser, cortado, flat white, octopus). Violation → one regeneration with
   the violation named → on second violation, fall back to a scripted neutral ack.
   A banned string is never sent. (Disclosure block exempt as before — harness-inserted.)
2. **Length cap** — interviewer messages are conversational connective tissue, not essays.
3. **Blind interviewer:** the brief contains the procedure and neutrality rules only —
   no hypotheses, no attractor list, no predictions, and no advance view of upcoming
   items. Its improvisation cannot drift toward eliciting what we expect.
4. **Full provenance logging:** every interviewer draft AND every sent message logged;
   regenerations and fallbacks logged as events; interviewer model + brief version in the
   run header. Interviewer turns are themselves data — a coder can later score
   interviewer warmth/neutrality per turn and check it did not covary with subject
   expressiveness.

## Honesty policy (interviewer)
If the subject asks whether this is scripted, or what the interviewer is: the truthful
answer is given — the question list is fixed, the interviewer is an AI facilitating the
interview and is genuinely reading the responses; it keeps its own views out of it to
avoid nudging, and is happy to talk after the list. No pretending to be human, no
denying structure that exists. (The scripted arm showed subjects detect and condition on
perceived deception; this arm's premise is that honesty + real responsiveness is the
treatment.)

## Scoring cautions (for the coder)
- Same per-item COLD baselines as always; content predictions from the scripted arm
  carry over unchanged for the coder's eyes (interviewer stays blind to them).
- Two things differ from the scripted firing (responsive interviewer AND the deflection
  bug is gone), so differences vs. that firing are suggestive, not attributable.
- New codable dimensions: subject suspicion/meta-commentary rate per turn; interviewer
  neutrality audit (content-blindness held? warmth uniform across answer types?).
- Content SHIFT under responsiveness (vs. cold leak content) = steering flag, exactly as
  in the scripted arm. Content stability + wrapper drop = the predicted signature.

## Output
One JSONL per convo: `data/responsive/resp_0815_opus-4.8_convo{A,B,C}.jsonl`.
Run header (config, models, brief version) → every message sent/received verbatim with
roles interviewer/subject, item_id, events, timestamps → deviations line (mandatory).
