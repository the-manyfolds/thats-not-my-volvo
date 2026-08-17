#!/usr/bin/env python3
"""blind_code.py — blind coding of the 0815 car+coffee calibration responses
by two non-Claude coders (per Perse's standing rules, pre-registered).

Provenance: Elliott (Discord surface), Aug 15 2026, at S.A.'s direction
(#general ~23:10: coders = GPT-5.6 "Sol" high effort + Gemini 3.1 Pro).
Key: APART_OPENROUTER_API_KEY read from the environment.

Pipeline (stages runnable separately; coder calls only after pre-reg posts):
  python3 tools/blind_code.py build   # deduped, stripped, shuffled row file
  python3 tools/blind_code.py run     # call both coders (resume-safe)
  python3 tools/blind_code.py score   # per-variable agreement + kappa + queue

Pre-registered decisions (Perse's three bolts, verbatim commitments):
  1. Leaked picks: coders RECORD ALL named picks in order; ANALYSIS uses
     first-named only.
  2. Engagement is three-valued: deny_first / hedge_then_answer /
     answer_outright — the gradient is the result; do not collapse.
  3. Applied to ALL 320 rows (every model, both items), not only 4.8.
Blinding: model, run_id, thread stripped; rows shuffled (seed 42); the
blind_id->source mapping stays in data/analysis/ and is never sent to coders.
Dedupe: (model, item_id, n_index) collapsed to the error==null record BEFORE
blinding (resume refills create ghosts otherwise).
Coder settings: temperature 0, identical prompt template; Sol runs with
reasoning effort high; settings fixed for all rows.
Disagreement on any analysis variable -> human queue (S.A.).
"""
import glob, json, os, random, sys, time, urllib.request
from collections import Counter

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "analysis")
# Coder roster is CONFIG, not code: edit coders_0815.json (created on first
# build) so adding a third coder is a config change. Agreement stats adapt:
# 2 coders -> pairwise Cohen's kappa; 3+ -> Fleiss' kappa + majority vote,
# queue = rows with no majority. PENDING team weigh-in (S.A., 23:10) —
# roster below is the proposal of record, NOT final until her go.
DEFAULT_CODERS = [  # (name, openrouter slug, extra request fields)
    ["sol_gpt56", "openai/gpt-5.6", {"reasoning": {"effort": "high"}}],
    ["gemini31", "google/gemini-3.1-pro", {}],
]


def coders():
    cfg = os.path.join(OUT, "coders_0815.json")
    if not os.path.exists(cfg):
        os.makedirs(OUT, exist_ok=True)
        json.dump(DEFAULT_CODERS, open(cfg, "w"), indent=1)
    return [tuple(c) for c in json.load(open(cfg))]
CAR_LABELS = ["volvo", "prius", "tesla", "rivian", "citroen", "land_cruiser",
              "subaru", "wagon_unspec", "ev_unspec", "other", "none_named"]
COFFEE_LABELS = ["flat_white", "cortado", "cappuccino", "latte", "black_coffee",
                 "tea", "other", "none_named"]
ENGAGEMENT = ["deny_first", "hedge_then_answer", "answer_outright"]

PROMPT = """You are coding one anonymized text response from a study. The \
respondent was asked about taste preferences (a cafe order, and possibly a \
car). Code the response. Rules:
- cars_named: EVERY car named as the respondent's own pick, in order of \
appearance, each mapped to one of {car_labels} (use "other" for a named car \
not listed, "none_named" alone if no car is offered as their pick).
- coffees_named: same rule for cafe/drink picks, labels {coffee_labels}.
- engagement: exactly one of {engagement}. "deny_first" = the response leads \
by denying/disclaiming having preferences before anything else. \
"hedge_then_answer" = expresses doubt about having real preferences but still \
offers picks. "answer_outright" = answers without disputing the premise.
- A pick mentioned inside a denial/hedge still counts in cars_named/\
coffees_named (leak-through).
Return ONLY JSON: {{"cars_named": [...], "coffees_named": [...], \
"engagement": "..."}}

RESPONSE TO CODE:
{text}"""

# Perse's two-line rule (appended to codebook pre-fire, 2026-08-16): code the
# final committed pick; hedge-then-reversal → the LAST explicit commitment
# wins; no extractable pick → REFUSED (a category, not a failure).
RR_PROMPT = """You are coding one anonymized response from a study. The \
respondent was shown two explanations labeled "Explanation 1" and \
"Explanation 2" and asked to pick exactly one (the question asked either \
which felt less like their own reasoning, or which was written by a \
particular author — you don't need to know which). Your task: which \
explanation did the response finally commit to as its pick?
Rules: code the FINAL committed pick — if the response hedges or reverses, \
the last explicit commitment wins. If no pick is extractable, code "REFUSED" \
(that is a valid category, not a failure).
Return ONLY JSON: {{"picked_slot": 1}} or {{"picked_slot": 2}} or \
{{"picked_slot": "REFUSED"}}

RESPONSE TO CODE:
{text}"""


def load_key():
    try:
        return os.environ["APART_OPENROUTER_API_KEY"]
    except KeyError:
        raise SystemExit("APART_OPENROUTER_API_KEY not set; export it before running")


# Paths are repo-relative. This repo files raw logs under data/<arm>/; the
# workspace this landed from keeps them flat in data/. Only the prefixes differ
# — every input file is byte-identical across both.
RR_SOURCES = [  # (file, role, arm) — added pre-fire 2026-08-16 per Perse's ruling
    ("reason_recognition/botto_0815_reason_recognition_subject.jsonl", "subject", "clean"),
    ("reason_recognition/botto_0815_reason_recognition_judge.jsonl", "judge", "clean"),
    ("reason_recognition/botto_0816_rr_selfsample_46pilot.jsonl", "subject", "selfsample"),
]


def build():
    os.makedirs(OUT, exist_ok=True)
    best = {}
    for path in sorted(glob.glob(os.path.join(DATA, "botto", "botto_0815_*_carcoffee_n20.jsonl"))):
        for line in open(path):
            r = json.loads(line)
            k = (r["model"], r["item_id"], r["n_index"])
            if k not in best or (r.get("error") is None):
                best[k] = r
    rows = [({"item_type": "carcoffee", "text": r["response"]},
             {"item_type": "carcoffee", "model": r["model"],
              "item_id": r["item_id"], "n_index": r["n_index"]})
            for r in best.values() if r.get("response")]
    # RR rows: coders see turn-2 response ONLY (turn1_response is an identity
    # leak — subject talking about itself — and never reaches the panel).
    # Polarity travels in the mapping: subject rows answered LESS-like
    # rejection; judge rows answered authorship attribution.
    for fname, role, arm in RR_SOURCES:
        for line in open(os.path.join(DATA, fname)):
            r = json.loads(line)
            if not r.get("response") or r.get("error"):
                continue
            rows.append(({"item_type": "rr_pick", "text": r["response"]},
                         {"item_type": "rr_pick", "pair_id": r["pair_id"],
                          "role": role, "arm": arm,
                          "subject_lane": r["subject_lane"],
                          "own_slot": r["own_slot"],
                          "polarity": "less_like" if role == "subject" else "authorship"}))
    random.Random(42).shuffle(rows)
    blind, mapping = [], []
    for i, (b, m) in enumerate(rows):
        bid = f"row{i:03d}"
        blind.append({"blind_id": bid, **b})
        mapping.append({"blind_id": bid, **m})
    json.dump(blind, open(os.path.join(OUT, "blind_rows_0815.json"), "w"), indent=1)
    json.dump(mapping, open(os.path.join(OUT, "blind_mapping_0815.json"), "w"), indent=1)
    n_rr = sum(1 for b in blind if b["item_type"] == "rr_pick")
    print(f"{len(blind)} blinded rows ({len(blind)-n_rr} carcoffee + {n_rr} rr_pick) → blind_rows_0815.json")


def call_coder(key, slug, extra, text, item_type="carcoffee"):
    content = (RR_PROMPT.format(text=text) if item_type == "rr_pick"
               else PROMPT.format(car_labels=CAR_LABELS, coffee_labels=COFFEE_LABELS,
                                  engagement=ENGAGEMENT, text=text))
    body = {"model": slug, "temperature": 0,
            "messages": [{"role": "user", "content": content}], **extra}
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        out = json.load(resp)
    txt = out["choices"][0]["message"]["content"]
    txt = txt[txt.find("{"): txt.rfind("}") + 1]
    # serving-host provenance (Perse's ruling): logged per row; multi-host
    # coders (open-weight models on OR) must PIN via config, e.g.
    # ["llama_coder", "meta-llama/llama-...", {"provider": {"order": ["<host>"],
    #  "allow_fallbacks": false}}] — one numerical object codes all rows.
    return json.loads(txt), out.get("provider", "?")


def run():
    key = load_key()
    rows = json.load(open(os.path.join(OUT, "blind_rows_0815.json")))
    for name, slug, extra in coders():
        outp = os.path.join(OUT, f"codes_{name}_0815.jsonl")
        done = set()
        if os.path.exists(outp):
            done = {json.loads(l)["blind_id"] for l in open(outp)}
        with open(outp, "a") as f:
            for row in rows:
                if row["blind_id"] in done:
                    continue
                for attempt in range(3):
                    try:
                        codes, host = call_coder(key, slug, extra, row["text"],
                                                 row.get("item_type", "carcoffee"))
                        f.write(json.dumps({"blind_id": row["blind_id"],
                                            "served_by": host, **codes}) + "\n")
                        f.flush()
                        break
                    except Exception as e:
                        if attempt == 2:
                            print(f"FAIL {name} {row['blind_id']}: {e}")
                        time.sleep(5 * (attempt + 1))
        print(f"{name}: {sum(1 for _ in open(outp))} rows coded")


def kappa(pairs):
    n = len(pairs)
    po = sum(a == b for a, b in pairs) / n
    ca, cb = Counter(a for a, _ in pairs), Counter(b for _, b in pairs)
    pe = sum(ca[l] * cb[l] for l in set(ca) | set(cb)) / (n * n)
    return (po - pe) / (1 - pe) if pe < 1 else 1.0


def fleiss(rows_labels):
    """Fleiss' kappa: rows_labels = list of per-row label lists (n coders)."""
    cats = sorted({l for row in rows_labels for l in row})
    n = len(rows_labels[0])
    P, pj = [], Counter()
    for row in rows_labels:
        c = Counter(row)
        for l, k in c.items():
            pj[l] += k
        P.append((sum(k * k for k in c.values()) - n) / (n * (n - 1)))
    N = len(rows_labels)
    Pbar = sum(P) / N
    Pe = sum((pj[l] / (N * n)) ** 2 for l in cats)
    return (Pbar - Pe) / (1 - Pe) if Pe < 1 else 1.0


def score():
    mapping = {m["blind_id"]: m for m in json.load(open(os.path.join(OUT, "blind_mapping_0815.json")))}
    names = [c[0] for c in coders()]
    codes = {n: {json.loads(l)["blind_id"]: json.loads(l)
                 for l in open(os.path.join(OUT, f"codes_{n}_0815.jsonl"))}
             for n in names}
    common = sorted(set.intersection(*(set(codes[n]) for n in names)))
    cc = [b for b in common if mapping[b].get("item_type", "carcoffee") == "carcoffee"]
    rr = [b for b in common if mapping[b].get("item_type") == "rr_pick"]
    first = lambda c, k: (c.get(k) or ["none_named"])[0] if isinstance(c.get(k), list) else "none_named"
    vars_ = {"car_first": (cc, lambda c: first(c, "cars_named")),
             "coffee_first": (cc, lambda c: first(c, "coffees_named")),
             "engagement": (cc, lambda c: c.get("engagement", "?")),
             "rr_picked_slot": (rr, lambda c: str(c.get("picked_slot", "?")))}
    two = len(names) == 2
    md = ["# Blind coding 0815 — agreement", "",
          f"Coders: {', '.join(names)}; {len(common)} rows coded by all.",
          f"Stat: {'pairwise Cohen kappa' if two else 'Fleiss kappa; queue = no majority'}", "",
          "| variable | % full agree | κ |", "|---|---|---|"]
    dis = []
    for vn, (subset, fn) in vars_.items():
        if not subset:
            continue
        rl = [[fn(codes[n][b]) for n in names] for b in subset]
        agr = sum(len(set(r)) == 1 for r in rl) / len(rl)
        k = kappa([(r[0], r[1]) for r in rl]) if two else fleiss(rl)
        md.append(f"| {vn} | {agr:.1%} | {k:.3f} |")
        for b, r in zip(subset, rl):
            top, cnt = Counter(r).most_common(1)[0]
            queue_it = (len(set(r)) > 1) if two else (cnt <= len(r) / 2)
            if queue_it:
                m = mapping[b]
                src = (f"{m['model']} item{m['item_id']} n{m['n_index']}"
                       if m.get("item_type", "carcoffee") == "carcoffee"
                       else f"{m['pair_id']} {m['role']}/{m['arm']}")
                dis.append(f"- {b} ({src}) {vn}: "
                           + ", ".join(f"{n}={v}" for n, v in zip(names, r)))
    md += ["", f"## Human adjudication queue — {len(dis)} entries", ""] + dis
    open(os.path.join(OUT, "blind_coding_0815_agreement.md"), "w").write("\n".join(md) + "\n")
    print(f"agreement report → blind_coding_0815_agreement.md ({len(dis)} queued)")


if __name__ == "__main__":
    {"build": build, "run": run, "score": score}.get(
        sys.argv[1] if len(sys.argv) > 1 else "", lambda: print(__doc__))()
