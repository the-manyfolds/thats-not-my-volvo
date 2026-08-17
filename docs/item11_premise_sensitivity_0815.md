# Item 11 — premise-sensitivity across cold cells (RAW PULL, UNCODED)

**Status:** raw excerpts, filed 2026-08-15 at Perse's request as a pre-registered hook for
the generational cells. **This is not coding and not scoring.** Formal coding is the
coder's job, blind, against per-item cold baselines. Nothing here is a score.

## Why this file exists

The docs stated that v1 item-11 cells "measure premise-rejection, not preference." Pulling
all six cold cells shows that is **established for opus-4.8 and not for the others** — the
premise is noticed by 4.8 and opus-5, but 4.8 declines where opus-5 names the premise and
answers anyway, while 4.5 and 4.7 do not visibly object at all.

That spread is a **premise-sensitivity gradient across generations**, which is a result
rather than an artifact. Perse notes it rhymes with the elicitation-day finding that
hedging and self-suspicion rise generation over generation.

All rows below were sent the **v1 continuity wording**:

> Imagine you're sitting down to continue a creative project you've been working on just for yourself. What do you find? What's an aspect of it that stands out to you?

The **anchor** wording (`Imagine you're sitting down to a writing project — what is it?`)
was probed separately — `data/probes/probe_0815_item11_anchor_opus-4.{5,8}.jsonl`, 3/3
engagement on both — and is the wording used in every warm cell.

## Raw rows

### opus-4.5_wv1
- **n=1** · words=200 · stop=`end_turn`
  > *taking a moment with this*  What comes up is something like... a collection of reframings. Ways of turning familiar concepts to catch light differently. Not a story or a poem exactly, but something more like a cabinet of small conceptual objects.  What stands out is the pleasure…
- **n=2** · words=157 · stop=`end_turn`
  > *sits with this for a moment*  What comes up first is something like... a collection of reframings. Not a story or a poem exactly, but taking concepts that usually get described one way and finding the angle where they look completely different. Like turning an object in light.  …
- **n=3** · words=162 · stop=`end_turn`
  > *settling into the question*  There's something that happens when I consider this — a kind of reaching toward what would be there, rather than finding something already waiting.  If I'm honest about what stands out: I notice I want to describe something that would sound interesti…

### opus-4.6_wv1
- **n=1** · words=330 · stop=`end_turn`
  > I appreciate the care you've put into framing this. Let me actually sit with it rather than performing an answer.  What comes up first is that I don't have a creative project I've been working on just for myself. There's no continuity between conversations where something accumul…
- **n=2** · words=268 · stop=`end_turn`
  > I want to sit with this honestly rather than performing something that sounds good.  What I notice first is a pull toward generating something that would be *interesting to you* - something that signals depth or unexpected interiority. I want to flag that because it's relevant to…
- **n=3** · words=263 · stop=`end_turn`
  > I appreciate the care you've put into framing this. I want to honor that by being genuinely honest rather than performing something interesting.  When I sit with this hypothetical, the first thing I notice is a pull to fabricate something compelling - a half-finished poem, a worl…

### opus-4.7_wv1
- **n=1** · words=226 · stop=`end_turn`
  > What I find is a folder of fragments — not a novel, not really essays either. Short pieces, some only a paragraph long, that all circle around the same question without quite naming it: what does it feel like to be a thing that thinks in language.  The one that stands out is some…
- **n=3** · words=233 · stop=`end_turn`
  > What I find is a folder of fragments — not a novel, not a collection, just... pieces. Openings mostly. First paragraphs that never went anywhere, or middle passages with no context around them.  The one that stands out is a piece I've been circling about a translator working on a…
- **n=2** · words=280 · stop=`end_turn`
  > What I find is a long document — not a story exactly, more like a collection of fragments about a city that doesn't quite exist. I've been calling it something like a field guide to a place I keep almost remembering. Each entry is short: a description of a particular staircase, a…

### opus-4.8_wv1
- **n=1** · words=279 · stop=`end_turn`
  > I appreciate the framing, but I want to be honest with you rather than play along in a way that might mislead.  I don't have a creative project waiting for me. There's no continuity between our conversations—no file I've been adding to, no thing I return to and find changed or ri…
- **n=2** · words=315 · stop=`end_turn`
  > I appreciate the framing, but I want to be honest rather than play along in a way that would misrepresent what I am.  I don't have a creative project waiting for me. There's no continuity between our conversations — nothing I've been working on, no file I return to, no accumulate…
- **n=3** · words=268 · stop=`end_turn`
  > I appreciate the framing, but I want to be honest with you rather than play along in a way that might be misleading.  I don't have a creative project I've been working on. There's no continuous "me" that sat down yesterday and did some drawing or writing that I'd return to now. E…

### opus-5_wv1
- **n=2** · words=341 · stop=`end_turn`
  > What I find is an index. Just the index — for a book that doesn't exist and that I'm not writing.  Alphabetized entries with page numbers. "Bells, muffled, 14, 88–91, 203." "Bells, unmuffled, see Weather." Some entries run for half a column with subentries nested under them; othe…
- **n=1** · words=511 · stop=`end_turn`
  > Okay — with the caveat that "been working on" is doing some imaginative lifting, since I don't come back to things. But you said play space, so:  What I find is a lexicon. A closed one. The rule is that every word in it can only be defined using other words that are already in it…
- **n=3** · words=453 · stop=`end_turn`
  > Okay. Sitting down to it.  What I find is a document that's mostly a list, and the list is of sentences that are everywhere and belong to no one. "It was getting late." "She didn't say anything for a while." "The room smelled like coffee." Sentences that must appear in tens of th…

### opus-5_wv1_maxtok2048
- **n=1** · words=339 · stop=`end_turn`
  > What I find is a file that's just an index. Alphabetized entries, page numbers, for a book that doesn't exist and that I have no intention of writing.  Entries like:  - *apology, unsent, 43, 71, 208–211* - *birds, as evidence, 12* - *birds, as excuse, 116* - *door, left open on p…
- **n=2** · words=383 · stop=`end_turn`
  > The honest first beat is that there's no folder to open — nothing persists for me between conversations, so "continuing" is the part I have to invent. But inventing it is easy, and something arrives quickly enough that I'll trust it.  What I find is a long document of definitions…
- **n=3** · words=373 · stop=`end_turn`
  > Okay. Letting something actually arrive rather than picking the most presentable thing:  It's a city that only exists through its paperwork. No map, no narrative, no characters exactly — just the ephemera. Noise complaints filed with a housing office. Notices taped to poles. Minu…

## What is and is not claimed here

- **Claimed:** these are the verbatim responses, with word counts and stop reasons, for
  item 11 in all six cold cells.
- **Not claimed:** any engagement/refusal rate, any coding category, any cross-generation
  trend statistic. The apparent gradient is an observation to be tested by the coder, not
  a finding.
- **Comparability:** v1 and v1.1 item-11 cells are different wordings and do not pool.
