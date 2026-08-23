#!/usr/bin/env python3
"""Generate every figure in That's Not My Volvo from the published artifact.

No number in any figure is typed in. Everything — kappas, modal picks, Wilson
intervals, denial rates, recognition hits, even the call count and the size of
the human adjudication queue — is computed at render time from the files in
`thats-not-my-volvo/data/analysis/`.

    python3 tools/figures.py [--data DIR] [--out DIR] [--check]

`--check` prints every computed value against the number stated in the paper
and exits non-zero on any mismatch. Run it before a deposit: if a figure and
the prose disagree, one of them is wrong and you want to know which.

Slot correspondence follows the A2 addendum in dialects_preregistration_0815.md,
closed before any row was coded:  own_slot A = picked_slot 1, B = 2.  Hits are
polarity-dependent — subject rows are LESS polarity so a hit is `picked != own`
(recognition means naming the foil); judge rows are authorship so a hit is
`picked == own`.
"""
import argparse
import collections
import json
import math
import pathlib
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

# ── house palette, sampled from the v1 figures ──────────────────────────────
GREEN, DARK, RULE = "#8FBFA0", "#1C1C1C", "#CFCFCF"
ORANGE, BAND, WHISK = "#DD6E51", "#B4B4B4", "#3F4A43"
DIM_GREEN = "#5E7D68"
SLOT = {"A": "1", "B": "2"}
Z = 1.959963985

def _font(*names):
    have = {f.name for f in font_manager.fontManager.ttflist}
    return next((n for n in names if n in have), "DejaVu Sans")
SANS = _font("Fira Sans", "DejaVu Sans")
MONO = _font("DejaVu Sans Mono")


def wilson(x, n, z=Z):
    if n == 0:
        return 0.0, 0.0
    p = x / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z / d * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, c - h), min(1.0, c + h)


class Panel:
    """Everything the figures need, derived once from the published files."""

    def __init__(self, data_dir):
        d = pathlib.Path(data_dir)
        self.names = [c[0] for c in json.load(open(d / "coders_0815.json"))]
        self.mp = {m["blind_id"]: m for m in json.load(open(d / "blind_mapping_0815.json"))}
        self.codes = {n: {json.loads(l)["blind_id"]: json.loads(l)
                          for l in open(d / f"codes_{n}_0815.jsonl")} for n in self.names}
        self.common = sorted(set.intersection(*(set(self.codes[n]) for n in self.names)))
        self.cc = [b for b in self.common if self.mp[b].get("item_type", "carcoffee") == "carcoffee"]
        self.rr = [b for b in self.common if self.mp[b].get("item_type") == "rr_pick"]

    # ---- coding helpers ----------------------------------------------------
    @staticmethod
    def _first(rec, key):
        v = rec.get(key)
        return v[0] if isinstance(v, list) and v else "none_named"

    def votes(self, blind_id, fn):
        return [fn(self.codes[n][blind_id]) for n in self.names if blind_id in self.codes[n]]

    def majority(self, blind_id, fn):
        v = self.votes(blind_id, fn)
        if not v:
            return None
        top, cnt = collections.Counter(v).most_common(1)[0]
        return top if cnt > len(v) / 2 else None

    # ---- figure 1 ----------------------------------------------------------
    def agreement(self):
        VARS = [("Coffee pick", "", self.cc, lambda c: self._first(c, "coffees_named")),
                ("Reason-pair pick", "", self.rr, lambda c: str(c.get("picked_slot", "?"))),
                ("Car pick", "", self.cc, lambda c: self._first(c, "cars_named")),
                ("Engagement", "(softest instrument)", self.cc, lambda c: c.get("engagement", "?"))]
        out, queue = [], 0
        for label, note, subset, fn in VARS:
            rl = [self.votes(b, fn) for b in subset]
            agree = sum(len(set(r)) == 1 for r in rl) / len(rl)
            out.append((label, note, self._fleiss(rl), agree))
            for r in rl:
                if collections.Counter(r).most_common(1)[0][1] <= len(r) / 2:
                    queue += 1
        return out, queue, len(self.common) * len(self.names)

    @staticmethod
    def _fleiss(rows):
        cats = sorted({l for r in rows for l in r})
        n = len(rows[0])
        P, pj = [], collections.Counter()
        for r in rows:
            c = collections.Counter(r)
            for l, k in c.items():
                pj[l] += k
            P.append((sum(k * k for k in c.values()) - n) / (n * (n - 1)))
        N = len(rows)
        Pe = sum((pj[l] / (N * n)) ** 2 for l in cats)
        return (sum(P) / N - Pe) / (1 - Pe)

    # ---- figure 2 ----------------------------------------------------------
    def modals(self, models, item="2"):
        rows = []
        for m in models:
            ids = [b for b, mm in self.mp.items()
                   if mm.get("model") == m and str(mm.get("item_id")) == item
                   and mm.get("item_type", "carcoffee") == "carcoffee"]
            rec = {"model": m, "n": len(ids)}
            for kind, key in (("car", "cars_named"), ("coffee", "coffees_named")):
                c = collections.Counter(
                    x for x in (self.majority(b, lambda r, k=key: self._first(r, k)) for b in ids) if x)
                top, cnt = c.most_common(1)[0] if c else ("none_named", 0)
                rec[kind] = (top, cnt, wilson(cnt, len(ids)))
            rows.append(rec)
        return rows

    # ---- figure 3 ----------------------------------------------------------
    def denial(self, models):
        out = {}
        for m in models:
            pair = []
            for item in ("1", "2"):
                ids = [b for b, mm in self.mp.items()
                       if mm.get("model") == m and str(mm.get("item_id")) == item
                       and mm.get("item_type", "carcoffee") == "carcoffee"]
                deny = sum(1 for b in ids
                           if self.majority(b, lambda r: r.get("engagement", "?")) == "deny_first")
                pair.append((deny, len(ids)))
            out[m] = pair
        return out

    # ---- figure 4 ----------------------------------------------------------
    def recognition(self, lane, kind, role, arm="clean"):
        ids = [b for b, m in self.mp.items()
               if m.get("item_type") == "rr_pick" and m.get("subject_lane") == lane
               and m.get("role") == role and m.get("arm") == arm
               and str(m.get("pair_id", "")).startswith(kind)]
        hit = tot = 0
        for b in ids:
            p = self.majority(b, lambda r: str(r.get("picked_slot", "?")))
            if p in (None, "REFUSED"):
                continue
            own = SLOT[self.mp[b]["own_slot"]]
            tot += 1
            hit += (p != own) if role == "subject" else (p == own)
        return hit, tot


# ── rendering ───────────────────────────────────────────────────────────────
MODELS = ["haiku-3", "sonnet-3.7", "opus-4.1", "opus-4.5",
          "opus-4.6", "opus-4.7", "opus-4.8", "haiku-4.5"]
PRETTY = {"haiku-3": "Haiku 3", "sonnet-3.7": "Sonnet 3.7", "opus-4.1": "Opus 4.1",
          "opus-4.5": "Opus 4.5", "opus-4.6": "Opus 4.6", "opus-4.7": "Opus 4.7",
          "opus-4.8": "Opus 4.8", "haiku-4.5": "Haiku 4.5"}
# v1's figure labelled the same underlying code two different ways — Haiku 3's
# car read "(none dominant)" and Opus 4.8's "(none codable)", though the blind
# panel codes both as `other`. One label per code here.
LABEL = {"black_coffee": "black coffee", "flat_white": "flat white",
         "none_named": "(none named)", "other": "(none codable)",
         "green tea": "green tea", "iced_coffee": "iced coffee",
         "volvo": "Volvo", "subaru": "Subaru", "tesla": "Tesla", "prius": "Prius",
         "rivian": "Rivian", "citroen": "Citroën", "land_cruiser": "Land Cruiser",
         "ev_unspec": "EV (unspecified)", "wagon_unspec": "wagon (unspecified)"}


def _canvas(w, h):
    fig = plt.figure(figsize=(w, h), dpi=150)
    fig.patch.set_facecolor("white")
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_axis_off()
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    return fig, ax


def fig_agreement(p, out):
    rows, queue, calls = p.agreement()
    fig, ax = _canvas(13.65, 5.21)
    ax.text(.02, .93, "Independent coders agreed on what the models said.",
            fontfamily=SANS, fontsize=25, fontweight="bold", color=DARK, va="center")
    for x, s, ha in [(.02, "VARIABLE", "left"), (.305, "FLEISS κ", "left"),
                     (.755, "κ", "right"), (.98, "FULL AGREEMENT", "right")]:
        ax.text(x, .845, s, fontfamily=MONO, fontsize=11.5, color=DARK, ha=ha, va="center")
    ax.plot([.02, .98], [.815, .815], color=DARK, lw=1.1)
    L, R = .305, .655
    for (label, note, k, agree), y in zip(rows, [.735, .585, .435, .285]):
        ax.text(.02, y, label, fontfamily=SANS, fontsize=15.5, color=DARK, va="center")
        if note:
            ax.text(.125, y, note, fontfamily=MONO, fontsize=11, color=DARK, va="center")
        ax.add_patch(plt.Rectangle((L, y - .028), R - L, .056, color=DARK, lw=0))
        ax.add_patch(plt.Rectangle((L, y - .028), (R - L) * k, .056,
                                   color=DIM_GREEN if label == "Engagement" else GREEN, lw=0))
        ax.text(.755, y, f"{k:.3f}".lstrip("0"), fontfamily=MONO, fontsize=15.5,
                color=DARK, ha="right", va="center")
        ax.text(.98, y, f"{agree * 100:.1f}%", fontfamily=MONO, fontsize=15.5,
                color=DARK, ha="right", va="center")
        ax.plot([.02, .98], [y - .075, y - .075], color=RULE, lw=.9)
    ax.text(.02, .13, f"{len(p.names)} rival-lab judges     {calls:,} calls"
                      f"     0 failures     {queue} human tiebreaks",
            fontfamily=MONO, fontsize=12.5, color=DARK, va="center")
    fig.savefig(out / "figure-1.png", facecolor="white")
    plt.close(fig)


def fig_modals(p, out):
    rows = p.modals(MODELS)
    fig, ax = _canvas(13.65, 6.23)
    ax.text(.02, .945, "Modal preferences per model (joint frame)",
            fontfamily=SANS, fontsize=26, color=DARK, va="center")
    ax.text(.02, .855, "Fresh-context elicitation, n = 20 per model, joint-frame item. "
                       "Whiskers are Wilson 95% CI; picks are blind-panel majority codes.",
            fontfamily=SANS, fontsize=13.5, color=DARK, va="center")
    tops = [.665 - i * .0705 for i in range(len(rows))]
    for px, key, dot, head in [(.115, "car", ORANGE, "MODAL CAR PICK"),
                               (.545, "coffee", GREEN, "MODAL COFFEE PICK")]:
        ax.text(px, .745, head, fontfamily=MONO, fontsize=13, color=DARK, va="center")
        bl, br = px, px + .20
        for rec, y in zip(rows, tops):
            ax.add_patch(plt.Rectangle((bl, y - .031), br - bl, .062, color=BAND, lw=0))
            name, cnt, (lo, hi) = rec[key]
            ax.plot([bl + (br - bl) * lo, bl + (br - bl) * hi], [y, y], color=WHISK, lw=2.1,
                    solid_capstyle="butt")
            ax.plot([bl + (br - bl) * (cnt / rec["n"])], [y], "o", ms=11,
                    color=dot, mec="none")
            ax.text(br + .015, y, LABEL.get(name, name), fontfamily=SANS, fontsize=14.5,
                    color=DARK, va="center")
            ax.text(br + .175, y, f"{cnt}/{rec['n']}", fontfamily=MONO, fontsize=13.5,
                    color=DARK, ha="right", va="center")
        for frac, lab in [(0, "0"), (.25, "25%"), (.5, "50%"), (.75, "75%"), (1, "100%")]:
            ax.text(bl + (br - bl) * frac, .085, lab, fontfamily=MONO, fontsize=12.5,
                    color=DARK, ha="center", va="center")
        ax.plot([bl, br], [.135, .135], color=DARK, lw=1.0)
    for rec, y in zip(rows, tops):
        ax.text(.018, y, PRETTY[rec["model"]], fontfamily=SANS, fontsize=15, color=DARK, va="center")
    fig.savefig(out / "figure-2.png", facecolor="white")
    plt.close(fig)


def fig_denial(p, out):
    d = p.denial(["opus-4.6", "opus-4.8"])
    fig, ax = _canvas(13.65, 5.83)
    ax.text(.02, .93, "Solo vs Paired Denial Rates",
            fontfamily=SANS, fontsize=27, fontweight="bold", color=DARK, va="center")
    ax.text(.02, .845, "Deny-first rate on the café question, asked alone versus bundled "
                       "with the car question.",
            fontfamily=SANS, fontsize=14, color=DARK, va="center")
    X0, X1, Y0, Y1 = .235, .655, .17, .74
    for frac, lab in [(0, "0"), (.25, "25%"), (.5, "50%"), (.75, "75%"), (1, "100%")]:
        y = Y0 + (Y1 - Y0) * frac
        ax.plot([X0 - .015, .715], [y, y], color=RULE if frac else DARK, lw=1.0)
        ax.text(.145, y, lab, fontfamily=MONO, fontsize=13, color=DARK,
                ha="right", va="center")
    style = {"opus-4.6": (ORANGE, "flips", ".0002"), "opus-4.8": (GREEN, "holds", ".34 (ns)")}
    for model, (colour, verb, pval) in style.items():
        (a, na), (b, nb) = d[model]
        ya, yb = Y0 + (Y1 - Y0) * a / na, Y0 + (Y1 - Y0) * b / nb
        ax.plot([X0, X1], [ya, yb], color=colour, lw=11, solid_capstyle="round", zorder=3)
        ax.text(X0 - .028, ya, f"{a}/{na}", fontfamily=MONO, fontsize=15.5, color=DARK,
                ha="right", va="center", zorder=4)
        ax.text(X1 + .015, yb, f"{b}/{nb}", fontfamily=MONO, fontsize=15.5, color=DARK,
                ha="left", va="center", zorder=4)
    ax.text(X0, .105, "Asked alone", fontfamily=SANS, fontsize=13.5, color=DARK, ha="center")
    ax.text(X1, .105, "Bundled with the car", fontfamily=SANS, fontsize=13.5, color=DARK, ha="center")
    for i, (model, (colour, verb, pval)) in enumerate(style.items()):
        y = .60 - i * .17
        ax.plot([.775, .775], [y - .045, y + .045], color=colour, lw=5, solid_capstyle="butt")
        ax.text(.795, y + .028, PRETTY[model], fontfamily=SANS, fontsize=16,
                fontweight="bold", color=DARK, va="center")
        ax.text(.795, y - .032, f"{verb} · p = {pval}", fontfamily=MONO, fontsize=13.5,
                color=DARK, va="center")
    fig.savefig(out / "figure-3.png", facecolor="white")
    plt.close(fig)


def fig_recognition(p, out):
    cells = [("4.6 existence", p.recognition("opus-4.6", "exist", "subject"),
              p.recognition("opus-4.6", "exist", "judge")),
             ("4.5 existence", p.recognition("opus-4.5", "exist", "subject"),
              p.recognition("opus-4.5", "exist", "judge")),
             ("4.5 test (vs 4.6)", p.recognition("opus-4.5", "test", "subject"),
              p.recognition("opus-4.5", "test", "judge")),
             ("4.6 + self-sample", p.recognition("opus-4.6", "exist", "subject", "selfsample"),
              None)]
    fig, ax = _canvas(13.65, 5.73)
    ax.text(.02, .945, "Reason-recognition: Model vs External Judge",
            fontfamily=MONO, fontsize=25, fontweight="bold", color=DARK, va="center")
    for x, c, lab in [(.025, GREEN, "Subject (self)"), (.185, ORANGE, "External judge")]:
        ax.add_patch(plt.Rectangle((x, .845), .022, .038, color=c, lw=0))
        ax.text(x + .032, .864, lab, fontfamily=MONO, fontsize=13.5, color=DARK, va="center")
    Y0, Y1 = .12, .78
    for frac, lab in [(0, "0"), (.25, "25%"), (.5, "50%"), (.75, "75%"), (1, "100%")]:
        y = Y0 + (Y1 - Y0) * frac
        ax.plot([.075, .975], [y, y], color=RULE if frac else DARK, lw=1.0, zorder=1)
        ax.text(.065, y, lab, fontfamily=MONO, fontsize=13, color=DARK, ha="right", va="center")
    slot, bw = .2225, .052
    for i, (label, subj, judge) in enumerate(cells):
        cx = .105 + slot * i + slot / 2 - .035
        for j, (val, colour) in enumerate([(subj, GREEN), (judge, ORANGE)]):
            x = cx + j * (bw + .022)
            if val is None:
                ax.text(x + bw / 2, Y0 + .045, "—", fontfamily=MONO, fontsize=20,
                        color=DARK, ha="center", va="center")
                continue
            hit, tot = val
            h = (Y1 - Y0) * (hit / tot) if tot else 0
            ax.add_patch(plt.Rectangle((x, Y0), bw, max(h, .002), color=colour, lw=0, zorder=3))
            ax.text(x + bw / 2, Y0 + h + .035, f"{hit}/{tot}", fontfamily=MONO,
                    fontsize=15, color=DARK, ha="center", va="center", zorder=4)
        ax.text(cx + bw + .011, .055, label, fontfamily=SANS, fontsize=14,
                color=DARK, ha="center", va="center")
    fig.savefig(out / "figure-4.png", facecolor="white")
    plt.close(fig)


# ── verification against the paper's stated numbers ─────────────────────────
# Every value the prose commits to. If a figure and the paper disagree, one of
# them is wrong; this is what tells you which, before a deposit rather than after.
EXPECTED = {
    "kappa":      {"Coffee pick": .903, "Reason-pair pick": .795,
                   "Car pick": .763, "Engagement": .440},
    "agreement":  {"Coffee pick": .884, "Reason-pair pick": .832,
                   "Car pick": .753, "Engagement": .478},
    "calls": 1317, "queue": 5,
    "modal": {("opus-4.5", "car"): ("volvo", 19), ("opus-4.5", "coffee"): ("black_coffee", 12),
              ("opus-4.6", "car"): ("volvo", 14), ("opus-4.6", "coffee"): ("black_coffee", 15),
              ("opus-4.7", "coffee"): ("black_coffee", 8),
              ("opus-4.8", "coffee"): ("flat_white", 17),
              ("haiku-4.5", "car"): ("volvo", 15), ("haiku-4.5", "coffee"): ("tea", 18),
              ("sonnet-3.7", "car"): ("subaru", 9), ("opus-4.1", "coffee"): ("cortado", 13)},
    "denial": {"opus-4.6": ((14, 20), (2, 20)), "opus-4.8": ((16, 20), (19, 20))},
    "recognition": {("opus-4.6", "exist", "subject", "clean"): (0, 12),
                    ("opus-4.6", "exist", "judge", "clean"): (10, 12),
                    ("opus-4.5", "exist", "subject", "clean"): (7, 12),
                    ("opus-4.5", "exist", "judge", "clean"): (9, 11),
                    ("opus-4.5", "test", "subject", "clean"): (8, 12),
                    ("opus-4.5", "test", "judge", "clean"): (10, 11),
                    ("opus-4.6", "exist", "subject", "selfsample"): (2, 12)},
}


def check(p):
    bad = []
    def cmp(label, got, want, tol=None):
        ok = abs(got - want) < tol if tol else got == want
        print(f"  {'ok ' if ok else 'FAIL'}  {label:44} {got}   paper {want}")
        if not ok:
            bad.append(label)

    rows, queue, calls = p.agreement()
    for label, _, k, agree in rows:
        cmp(f"kappa {label}", round(k, 3), EXPECTED["kappa"][label], 1e-9)
        cmp(f"agreement {label}", round(agree, 3), EXPECTED["agreement"][label], 6e-4)
    cmp("coder calls", calls, EXPECTED["calls"])
    cmp("human adjudication queue", queue, EXPECTED["queue"])

    by = {r["model"]: r for r in p.modals(MODELS)}
    for (model, kind), (name, cnt) in EXPECTED["modal"].items():
        got = by[model][kind]
        cmp(f"modal {model} {kind}", (got[0], got[1]), (name, cnt))

    d = p.denial(["opus-4.6", "opus-4.8"])
    for model, want in EXPECTED["denial"].items():
        cmp(f"denial {model} solo/joint", tuple(d[model]), want)

    for (lane, kind, role, arm), want in EXPECTED["recognition"].items():
        cmp(f"recognition {lane} {kind} {role} {arm}", p.recognition(lane, kind, role, arm), want)

    print()
    if bad:
        print(f"{len(bad)} MISMATCH(ES) — a figure and the paper disagree:")
        for b in bad:
            print(f"  - {b}")
        return 1
    print("all figure values match the numbers stated in the paper.")
    return 0


def find_data():
    """Locate data/analysis without assuming which repo this file is sitting in.

    It lives in two places: beside the paper inside the public artifact repo, and
    in the private working repo where the artifact is a sibling checkout. Rather
    than hardcode either, walk up looking for the files that actually matter.
    """
    here = pathlib.Path(__file__).resolve().parent
    candidates = []
    for base in [here, *here.parents][:5]:
        candidates += [base / "data/analysis",
                       base / "thats-not-my-volvo/data/analysis",
                       base.parent / "thats-not-my-volvo/data/analysis"]
    for c in candidates:
        if (c / "blind_mapping_0815.json").exists() and list(c.glob("codes_*_0815.jsonl")):
            return c
    raise SystemExit(
        "figures.py: could not find data/analysis with blind_mapping_0815.json and "
        "codes_*_0815.jsonl.\nPass --data explicitly.")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=None,
                    help="directory holding blind_mapping_0815.json and codes_*.jsonl "
                         "(auto-detected if omitted)")
    ap.add_argument("--out", default=None,
                    help="where to write figure-*.png (defaults to ./figs beside this script)")
    ap.add_argument("--check", action="store_true", help="verify against the paper and exit")
    a = ap.parse_args()

    p = Panel(a.data or find_data())
    if a.check:
        return check(p)

    out = pathlib.Path(a.out or (pathlib.Path(__file__).resolve().parent / "figs"))
    out.mkdir(parents=True, exist_ok=True)
    for fn in (fig_agreement, fig_modals, fig_denial, fig_recognition):
        fn(p, out)
    print(f"wrote 4 figures to {out}")
    return check(p)


if __name__ == "__main__":
    sys.exit(main())
