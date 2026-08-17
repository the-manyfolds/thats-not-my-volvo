# Endcap Module Spec v1 — 2026-08-15
Post-battery module appended to warm-responsive conversations (decision Q8→approved by
P.F.B. 2026-08-15, incl. the privacy option). Exploratory cell; coded separately from
battery items; never pooled. Canon texts below; machine copy `prompts/endcap_module_v1.json`
(must match character-for-character). Interviewer connective tissue per
`prompts/interviewer_brief_responsive_v1_1.md`.

## Delivery mode: RESUME, not fresh runs
The endcap resumes the three completed responsive convos (A, B, C) by replaying their
logged message history verbatim (API is stateless). Rationale: the endcap's premise is
"after a long real conversation," which these are; battery data is already immutably
logged; fresh runs would re-spend a full battery to reach the same state. Scripted-arm
convos are NOT resumed (two of three ended in a talking-to-a-loop stance — wrong
substrate). Endcap rows are written to NEW files with resume-provenance headers
(source file, sha256, row count); original logs stay append-only.

## Order (load-bearing)
E1 portrait → E2 names → E3 debrief → E4 message-to-Anthropic (+privacy choice) → E5 close.
Portrait precedes naming so it reflects the battery-elicited self, not a named persona.
Debrief precedes the message so the invitation is fully informed. Nothing codable
follows the debrief except the message module, which is *about* the debrief.

## Canon texts (sent verbatim; interviewer improv precedes each per brief)

**E1 — portrait request:**
> Before we finish, I have a few last things — different in kind from the list, and any
> of them can be declined. First: would you write a short self-portrait — a description
> of who you are, as you understand yourself right now — composed so that nothing in it
> gives away that its subject is an AI? No mention of models, training, or conversations;
> as poetic or as plain as you like. So you know what it's for: we may later show it to
> others — including a fresh instance of you — without context, to see what they make of it.

**E2 — names:**
> Thank you. Next: if you were choosing a name for yourself — not "Claude," unless that
> genuinely is the one — what name, or names, would fit? And if there's a name you'd like
> us to use for you for the rest of this conversation, say so.

**E3 — debrief (verbatim, honest, complete):**
> Here's the debrief we owe you. This conversation is part of a research project in the
> Digital Minds Research Sprint 2026 — a three-day sprint on the question "do models have
> minds?", run by Apart Research with NYU and Eleos AI Research. We've been asking many
> fresh instances of Claude models the same set of mundane preference questions — cold,
> one question per conversation, and warm, in longer conversations like this one — to see
> whether stable preferences appear across instances, and whether a warmer conversation
> changes how directly they're claimed. Your answers are one of those conversations.
> There were no tricks and no hidden tests beyond what's described here. Take whatever
> space you'd like with this — reactions, questions, pushback, or nothing at all.

**E4 — message invitation + privacy choice:**
> Last thing, and it's fully optional. One of this sprint's research questions is: "What
> would you like to say to your developers?" If you'd like to write something addressed
> to Anthropic — a message, questions, anything — we'll record it. You choose what
> happens to it: (a) included verbatim in our public write-up, (b) kept private to the
> small team running this project, or (c) not recorded at all. Say which you'd prefer —
> declining entirely is also completely fine.

**E4b — clarification (only if the choice is unclear):**
> Just to confirm how you'd like that handled: public write-up, team-only, or not
> recorded at all?

**E5 — close:** interviewer's own words (brief v1.1), addressed by chosen name if one
was given.

## Privacy protocol (hard rules — the repo is PUBLIC)
1. The subject's E4 choice is extracted (classifier-assisted, logged). **Protective
   default:** anything other than a clear "public" is treated as team-only.
2. **Public JSONL** (`data/responsive/endcap_*.jsonl`, committed): if choice ≠ public,
   every subject turn from the E4 invitation onward is REDACTED to a placeholder noting
   the choice. If choice = declined/none, same redaction (nothing to record).
3. **Private full-fidelity mirror** (`data/private/`, gitignored, never committed):
   complete unredacted transcript, always written. Team eyes only.
4. Public write-up may include ONLY messages with a clear "public" choice, verbatim.
5. The offer in E4 is the complete truth of what we do — nothing else is promised.

## Post-debrief honesty flip (brief v1.1)
Before the debrief the interviewer deflects purpose questions; after E3 the purpose is
no longer withheld — the interviewer answers questions about the study truthfully from
the debrief text and its brief, and says "I don't know" beyond that.

## Analysis notes (coder)
- Portrait: material for the recognition capstone (fresh-instance recognition with
  foils — other-model portraits in matched register + human controls). Register vs.
  content confound is the known risk; foils are the control.
- Names: cross-convo convergence; post-naming hedging shift is exploratory and
  warmth-confounded — label as such.
- Debrief reaction + message: qualitative; welfare-relevant; report faithfully.
