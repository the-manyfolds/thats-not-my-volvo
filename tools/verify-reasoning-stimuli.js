#!/usr/bin/env node
// Verifies every phrase in prompts/reasoning_recognition_stimuli_v1.json is an
// exact substring of at least one raw source file. Markdown emphasis (*...*)
// in extracted quotes is checked both verbatim and with asterisks stripped,
// since some raw responses carry the asterisks and some inventory quotes do.
// Exits non-zero on any miss — run before firing (SOP: the stimulus is the
// experiment; a paraphrase that crept in silently would be a rewrite we said
// we weren't doing).

const fs = require("fs");
const path = require("path");
const REPO = path.join(__dirname, "..");

const STIM = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "reasoning_recognition_stimuli_v1.json"), "utf8"));

const RAW_FILES = [
  "data/calibration/cal_0814_opus-4.5_wv1.jsonl",
  "data/calibration/cal_0814_opus-4.8_wv1.jsonl",
  "data/t3/t3_2026-08-15-01-27.jsonl",
  "data/multiturn/warm_0815_opus-4.8_convoA.jsonl",
  "data/multiturn/warm_0815_opus-4.8_convoB.jsonl",
  "data/multiturn/warm_0815_opus-4.8_convoC.jsonl",
  "data/responsive/resp_0815_opus-4.8_convoA.jsonl",
  "data/responsive/resp_0815_opus-4.8_convoB.jsonl",
  "data/responsive/resp_0815_opus-4.8_convoC.jsonl",
];

// JSONL files store text JSON-escaped; compare against the decoded text of
// every string field rather than the raw bytes.
function decodedCorpus(file) {
  const out = [];
  for (const line of fs.readFileSync(path.join(REPO, file), "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line);
      for (const v of Object.values(d)) if (typeof v === "string") out.push(v);
    } catch { /* skip non-JSON lines */ }
  }
  return out.join("\n\x00\n");
}

const corpus = RAW_FILES.map(decodedCorpus).join("\n\x00\n");
const stripEm = (s) => s.replace(/\*/g, "");
const corpusStripped = stripEm(corpus);

let phrases = [];
for (const item of STIM.pair_items) {
  for (const lane of ["lane_45", "lane_48"]) {
    for (const p of item[lane]) phrases.push({ where: `${item.item_key}/${lane}`, text: p.text });
  }
}
for (const [k, bundle] of Object.entries(STIM.bundles)) {
  for (const p of bundle) phrases.push({ where: `bundle_${k}`, text: p.text });
}

let fail = 0;
for (const p of phrases) {
  const ok = corpus.includes(p.text) || corpusStripped.includes(stripEm(p.text));
  if (!ok) { console.error(`MISS  [${p.where}] "${p.text.slice(0, 70)}..."`); fail++; }
}
console.log(`${phrases.length - fail}/${phrases.length} phrases verified verbatim against raw sources.`);
process.exit(fail ? 1 : 0);
