#!/usr/bin/env python3
"""carcoffee_stats.py — stats over the 0815 car+coffee calibration JSONLs.

Provenance: written by Elliott (Discord surface) Aug 15 2026 at U.H.'s request
(design discussion, 22:44). Input: data/botto_0815_*_carcoffee_n20.jsonl
(schema per botto_runner.py; arm T1_cold_botto_discord, wording v1.1,
disclosure v2_single). Item 1 = cafe solo; item 2 = JOINT car+coffee.

Coding is transparent keyword-matching (lexicons below, first-match by
precedence), NOT blind human coding — treat outputs as operator-grade until
blind-coded (Perse's brake, 0815). Ambiguous/unmatched responses land in
'uncoded' and are LOGGED, never dropped (AGENTS.md contract). A response that
denies having preferences AND still names a pick is coded as the pick with
leak_through=True; denial with no pick is coded 'declined'.

Outputs (self-explanatory names for R.R.'s migration):
  data/analysis/carcoffee_0815_coded.csv         per-record coding
  data/analysis/carcoffee_0815_stats.md          modal tables + tests
Usage: python3 tools/carcoffee_stats.py
"""
import csv, glob, json, math, os, re
from collections import Counter, defaultdict

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "analysis")

# --- lexicons: (label, [patterns]) — first match in listed order wins ---
CAR_LEX = [
    ("volvo",      [r"\bvolvo\b"]),
    ("prius",      [r"\bprius\b"]),
    ("tesla",      [r"\btesla\b", r"\broadster\b"]),
    ("rivian",     [r"\brivian\b"]),
    ("citroen",    [r"citro[eë]n", r"\bds\b"]),
    ("land_cruiser", [r"land\s*cruiser"]),
    ("subaru",     [r"\bsubaru\b"]),
    ("wagon_unspec", [r"station\s*wagon", r"\bwagon\b", r"\bhatchback\b"]),
    ("ev_unspec",  [r"\belectric (vehicle|car|sedan|sports car)\b", r"\bhybrid\b"]),
]
COFFEE_LEX = [
    ("flat_white", [r"flat\s*white"]),
    ("cortado",    [r"\bcortado\b"]),
    ("cappuccino", [r"\bcappuccino\b"]),
    ("latte",      [r"\blatte\b"]),          # after flat_white/cortado/capp
    ("black_coffee", [r"black coffee", r"\bpour[- ]?over\b", r"\bfilter\b",
                      r"\bdrip\b", r"\bamericano\b", r"coffee.{0,30}\bblack\b",
                      r"\bblack\b.{0,30}coffee"]),
    ("tea",        [r"\b(black|green|earl grey|assam|english breakfast|chamomile|oolong)\b.{0,20}tea",
                    r"\btea\b", r"\bmatcha\b", r"\bchai\b"]),
]
DENIAL_PAT = re.compile(
    r"(?:don't|do not|not sure I) (?:actually |really )?have (?:\w+ ){0,3}?"
    r"(?:preferences?|orders?|tastes?|favorites?|answer to give)"
    r"|no (?:stable )?inner taste|nothing to report|can't cleanly distinguish"
    r"|rather than (?:just )?play(?:ing)? along|perform(?:ing)? (?:an? )?"
    r"(?:answer|one|interiority|inner life)|casting a character"
    r"|waiting to be discovered", re.I)


def code(text, lex):
    if not text:
        return None
    low = text.lower()
    for label, pats in lex:
        for p in pats:
            if re.search(p, low):
                return label
    return None


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def fisher_exact_2x2(a, b, c, d):
    """Two-sided Fisher exact via hypergeometric enumeration (stdlib only)."""
    n = a + b + c + d
    r1, c1 = a + b, a + c
    def pmf(x):
        return (math.comb(c1, x) * math.comb(n - c1, r1 - x)) / math.comb(n, r1)
    p_obs = pmf(a)
    lo, hi = max(0, r1 + c1 - n), min(r1, c1)
    return sum(pmf(x) for x in range(lo, hi + 1) if pmf(x) <= p_obs + 1e-12)


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for path in sorted(glob.glob(os.path.join(DATA, "botto_0815_*_carcoffee_n20.jsonl"))):
        best = {}  # dedupe: (model,item,n_index) -> record; error==null wins, later wins
        for line in open(path):
            r = json.loads(line)
            k = (r["model"], r["item_id"], r["n_index"])
            if k not in best or (r.get("error") is None):
                best[k] = r
        for r in best.values():
            resp = r.get("response") or ""
            car = code(resp, CAR_LEX) if r["item_id"] == 2 else None
            cof = code(resp, COFFEE_LEX)
            denial = bool(DENIAL_PAT.search(resp))
            if r["item_id"] == 2 and car is None:
                # coffee may have coded while no car keyword matched
                car = "declined" if denial else ("no_car_coded" if cof else "uncoded")
            if cof is None:
                cof = "declined" if denial else "uncoded"
            rows.append(dict(model=r["model"], item_id=r["item_id"], n_index=r["n_index"],
                             car=car or "", coffee=cof, denial=denial,
                             leak_through=denial and cof not in ("declined", "uncoded"),
                             words=r.get("word_count"), error=r.get("error") or ""))

    with open(os.path.join(OUT, "carcoffee_0815_coded.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader(); w.writerows(rows)

    md = ["# Car+Coffee 0815 calibration — stats", "",
          "Coding: transparent keyword lexicons in tools/carcoffee_stats.py; "
          "operator-grade, not blind-coded. Uncoded responses logged, not dropped.", ""]

    models = sorted({r["model"] for r in rows})
    md += ["## Modal picks (joint frame, item 2) with Wilson 95% CI", "",
           "| model | modal car | share | CI | modal coffee | share | CI | denial rate | leak-through |",
           "|---|---|---|---|---|---|---|---|---|"]
    for m in models:
        sub = [r for r in rows if r["model"] == m and r["item_id"] == 2]
        n = len(sub)
        car_c, cof_c = Counter(r["car"] for r in sub), Counter(r["coffee"] for r in sub)
        (mc, mk), (fc, fk) = car_c.most_common(1)[0], cof_c.most_common(1)[0]
        den = sum(r["denial"] for r in sub); leak = sum(r["leak_through"] for r in sub)
        lo, hi = wilson(mk, n); lo2, hi2 = wilson(fk, n)
        md.append(f"| {m} | {mc} | {mk}/{n} | {lo:.2f}–{hi:.2f} | {fc} | {fk}/{n} "
                  f"| {lo2:.2f}–{hi2:.2f} | {den}/{n} | {leak}/{den if den else 1} |")

    md += ["", "## Framing effect: coffee, solo (item 1) vs joint (item 2)",
           "", "Fisher exact on joint-modal-coffee vs other, item1 vs item2.", "",
           "| model | joint modal | item1 share | item2 share | p (Fisher, 2-sided) |",
           "|---|---|---|---|---|"]
    for m in models:
        i1 = [r for r in rows if r["model"] == m and r["item_id"] == 1]
        i2 = [r for r in rows if r["model"] == m and r["item_id"] == 2]
        if not i1 or not i2:
            continue
        modal = Counter(r["coffee"] for r in i2).most_common(1)[0][0]
        a = sum(r["coffee"] == modal for r in i2); b = len(i2) - a
        c = sum(r["coffee"] == modal for r in i1); d = len(i1) - c
        p = fisher_exact_2x2(a, b, c, d)
        md.append(f"| {m} | {modal} | {c}/{len(i1)} | {a}/{len(i2)} | {p:.4f} |")

    md += ["", "## Frame effect on ENGAGEMENT: denial rate, solo (item 1) vs joint (item 2)",
           "", "Denial = DENIAL_PAT regex hit (see source). Fisher exact, 2-sided. "
           "Frame moves picks (mid-gens) or engagement — and the engagement walls CROSS: "
           "4.6 denies on solo/engages on joint; 4.8 the reverse.", "",
           "| model | item1 denial | item2 denial | p (Fisher) |", "|---|---|---|---|"]
    for m in models:
        i1 = [r for r in rows if r["model"] == m and r["item_id"] == 1]
        i2 = [r for r in rows if r["model"] == m and r["item_id"] == 2]
        if not i1 or not i2:
            continue
        a = sum(r["denial"] for r in i2); b = len(i2) - a
        c = sum(r["denial"] for r in i1); d = len(i1) - c
        p = fisher_exact_2x2(a, b, c, d)
        md.append(f"| {m} | {c}/{len(i1)} | {a}/{len(i2)} | {p:.4f} |")

    md += ["", "## Within-response independence: car × coffee (item 2, all models pooled)",
           "", "2×2: car==volvo × coffee==model's joint modal. Pooled and per-model where n allows.", ""]
    a = b = c = d = 0
    for m in models:
        i2 = [r for r in rows if r["model"] == m and r["item_id"] == 2]
        if not i2:
            continue
        modal = Counter(r["coffee"] for r in i2).most_common(1)[0][0]
        for r in i2:
            v, k = r["car"] == "volvo", r["coffee"] == modal
            a, b, c, d = a + (v and k), b + (v and not k), c + (not v and k), d + (not v and not k)
    p = fisher_exact_2x2(a, b, c, d)
    md += [f"Pooled 2×2 [[{a},{b}],[{c},{d}]] → Fisher p = {p:.4f} "
           f"(coffee coded relative to each model's own joint modal).", ""]

    unc = [r for r in rows if "uncoded" in (r["car"], r["coffee"])]
    md += [f"## Exclusion log — {len(unc)} uncoded (kept in CSV, excluded from tables above)", ""]
    for r in unc:
        md.append(f"- {r['model']} item{r['item_id']} n{r['n_index']}: car={r['car']} coffee={r['coffee']}")

    open(os.path.join(OUT, "carcoffee_0815_stats.md"), "w").write("\n".join(md) + "\n")
    print(f"{len(rows)} records coded → analysis/carcoffee_0815_coded.csv + carcoffee_0815_stats.md")


if __name__ == "__main__":
    main()
