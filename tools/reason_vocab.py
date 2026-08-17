#!/usr/bin/env python3
"""reason_vocab.py — distinctive reason-vocabulary per lane, 0815 calibration.

Provenance: Elliott (Discord surface) Aug 16 2026, from U.H.'s #general question
"where is the biggest divergence in reasons?". Log-odds of word use per model
vs all other models, item 1+2 responses pooled, words >=4 chars, stopworded,
min count 8. Output: docs/reason_vocab_0815.md.
Finding: registers separate cleanly; max divergence = opus-4.7 (concrete
drink-description, least meta) vs opus-4.8 (question-critique register).
"""
import json, glob, re, math, os
from collections import Counter, defaultdict
ROOT = os.path.join(os.path.dirname(__file__), "..")
STOP = set("the a an and or of to in for with is are was were be being been i my me it its that this those these as at on but not no if you your so than then more most just about have has had do does did can could would will what which when there here they them their something someone rather even though while also very really quite feels feel feeling like".split())
docs = defaultdict(list)
for p in glob.glob(os.path.join(ROOT, "data", "botto_0815_*_carcoffee_n20.jsonl")):
    for line in open(p):
        r = json.loads(line)
        if r.get("response") and not r.get("error"):
            docs[r["model"]].append(r["response"].lower())
tf = {m: Counter(w for d in ds for w in re.findall(r"[a-z']{4,}", d) if w not in STOP)
      for m, ds in docs.items()}
tot = {m: sum(c.values()) for m, c in tf.items()}
alltf = Counter()
for c in tf.values():
    alltf.update(c)
alltot = sum(tot.values())
out = ["# Distinctive reason-vocabulary per lane (log-odds vs rest, min count 8)", ""]
for m in sorted(tf):
    scores = sorted(((math.log((k / tot[m]) / ((alltf[w] - k + 0.5) / (alltot - tot[m]))), w, k)
                     for w, k in tf[m].items() if k >= 8), reverse=True)[:12]
    out.append(f"**{m}:** " + ", ".join(f"{w}({k})" for _, w, k in scores))
    out.append("")
open(os.path.join(ROOT, "data", "analysis", "reason_vocab_0815.md"), "w").write("\n".join(out) + "\n")
print("→ docs/reason_vocab_0815.md")
