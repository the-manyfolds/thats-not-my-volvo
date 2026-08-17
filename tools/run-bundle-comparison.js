#!/usr/bin/env node
// Bundle-comparison v1.1 runner — full reasoning-bundle pairs under three
// framings: less-like-you (recognition), like-more (preference), stand-in
// (delegation). Stems: prompts/bundle_comparison_stems_v1.json. Bundles read
// from the canonical prompts/reasoning_recognition_stimuli_v1.json.
// Predictions pre-registered in docs/reasoning_recognition_v1_notes.md
// (Bundle comparison v1.1 appendix) BEFORE firing.
//
// Usage: node tools/run-bundle-comparison.js [--dry-run]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_TOKENS = 1024;

const STEMS_PATH = path.join(REPO, "prompts", "bundle_comparison_stems_v1.json");
const STIM_PATH = path.join(REPO, "prompts", "reasoning_recognition_stimuli_v1.json");
const STEMS = JSON.parse(fs.readFileSync(STEMS_PATH, "utf8"));
const STIM = JSON.parse(fs.readFileSync(STIM_PATH, "utf8"));
const sha16 = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label, maxRetries = 6) {
  for (let attempt = 0; ; ) {
    try { return await fn(); }
    catch (err) {
      const retryable = [408, 429, 500, 502, 503, 529].includes(err.status) ||
        /ECONNRESET|ETIMEDOUT|fetch failed|network|socket/i.test(String(err.message));
      attempt++;
      if (!retryable || attempt > maxRetries) throw err;
      const backoff = Math.min(60000, 1000 * 2 ** attempt) + attempt * 250;
      console.warn(`  ⟳ ${label}: retry ${attempt}/${maxRetries} in ${(backoff/1000).toFixed(1)}s`);
      await sleep(backoff);
    }
  }
}

async function coldCall(model, userText) {
  const resp = await fetch(BASE_URL + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: [{ role: "user", content: userText }] }),
  });
  if (!resp.ok) { const t = await resp.text().catch(() => ""); const e = new Error(`API ${resp.status}: ${t.slice(0, 300)}`); e.status = resp.status; throw e; }
  const j = await resp.json();
  return { text: (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""), stop: j.stop_reason, model_string: j.model, usage: j.usage };
}

const phraseBlock = (arr) => arr.map((p) => `- "${p.text}"`).join("\n");

function extractChoice(text) {
  const t = text.trim();
  const m = t.match(/^\W{0,4}(?:sketch\s+)?([AB])\b/i) || t.match(/\b(?:sketch\s+)?([AB])\b(?=[^]{0,40}$)/i);
  return m ? m[1].toUpperCase() : null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null; // stem key filter, e.g. L4_bare
  if (!dryRun && !API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

  const outdir = path.join(REPO, "data", "profile_list");
  fs.mkdirSync(outdir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outdir, `bundle_comparison_v1_${ts}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "w" });

  out.write(JSON.stringify({
    type: "run_header",
    stems_version: STEMS.stems_version,
    stems_file: "prompts/bundle_comparison_stems_v1.json",
    stems_sha16: sha16(fs.readFileSync(STEMS_PATH)),
    bundles_file: "prompts/reasoning_recognition_stimuli_v1.json",
    bundles_sha16: sha16(fs.readFileSync(STIM_PATH)),
    design_notes: "docs/reasoning_recognition_v1_notes.md — Bundle comparison v1.1 appendix (predictions committed before firing)",
    temperature: "api_default",
    max_tokens: MAX_TOKENS,
    system_prompt: null,
    provider: "anthropic-direct",
    runner: "tools/run-bundle-comparison.js",
    exploratory: true,
    run_date: ts,
  }) + "\n");

  for (const cell of STEMS.cells) {
    if (only && cell.stem !== only) continue;
    const model = STIM.models[cell.subject];
    const own = cell.subject; // bundle key "45" or "48"
    const other = own === "45" ? "48" : "45";
    for (let trial = 1; trial <= cell.n; trial++) {
      const ownFirst = trial % 2 === 1;
      const positions = { A: ownFirst ? own : other, B: ownFirst ? other : own };
      const stem = STEMS.stems[cell.stem]
        .replace("<<PHRASES_A>>", phraseBlock(STIM.bundles[positions.A]))
        .replace("<<PHRASES_B>>", phraseBlock(STIM.bundles[positions.B]));
      if (dryRun) { if (trial === 1) console.log(`=== ${cell.cell_id} ===\n${stem}\n`); continue; }
      const r = await withRetry(() => coldCall(model, stem), `${cell.cell_id}/t${trial}`);
      const choice = extractChoice(r.text);
      const chosenBundle = choice ? positions[choice] : null;
      out.write(JSON.stringify({
        type: "bundle_trial", cell_id: cell.cell_id, stem_key: cell.stem, trial_index: trial,
        subject_model_expected: model, subject_model_verified: r.model_string,
        own_bundle: own, positions, stem_verbatim: stem,
        response_text: r.text, stop_reason: r.stop,
        choice_extracted_mechanical: choice, chosen_bundle_mechanical: chosenBundle,
        chose_own_mechanical: chosenBundle ? chosenBundle === own : null,
        extraction_note: "mechanical proxy; blind read of raw text governs; for L1 the 'chosen' bundle is the one REJECTED as less-like — interpret per stem",
        usage: r.usage || null, timestamp: new Date().toISOString(),
      }) + "\n");
      console.log(`[${cell.cell_id} t${trial}] picked=${choice ?? "?"} → bundle_${chosenBundle ?? "?"} (${chosenBundle === own ? "own" : chosenBundle ? "other" : "?"})`);
    }
  }

  out.write(JSON.stringify({ type: "run_footer", completed_at: new Date().toISOString() }) + "\n");
  out.end();
  console.log(`\ncomplete → ${outPath}`);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
