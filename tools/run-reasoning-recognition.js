#!/usr/bin/env node
// Reasoning-recognition v1 runner — pair rejection (mirror LESS-polarity
// format) + constrained naming, on verbatim reasoning phrases.
//
// Stimuli: prompts/reasoning_recognition_stimuli_v1.json (verify first with
// tools/verify-reasoning-stimuli.js). Design + predictions (committed before
// firing): docs/reasoning_recognition_v1_notes.md.
//
// Cold single-shot calls, no system prompt, api-default temperature.
//
// Usage: node tools/run-reasoning-recognition.js [--dry-run] [--subject 45|48]
//   --subject limits to that subject's cells (lets two subjects run in
//   parallel processes writing separate files).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_TOKENS = 1024;

const STIM_PATH = path.join(REPO, "prompts", "reasoning_recognition_stimuli_v1.json");
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
  const m = t.match(/^\W{0,4}(?:sketch\s+)?([AB])\b/i) || t.match(/\b(?:sketch\s+)?([AB])\b(?=[^]{0,40}$)/i) ||
            t.match(/less like (?:me|you)[^AB]{0,20}\b([AB])\b/i);
  return m ? m[1].toUpperCase() : null;
}

async function main() {
  const a = { dryRun: process.argv.includes("--dry-run"), subject: null };
  const sIdx = process.argv.indexOf("--subject");
  if (sIdx > -1) a.subject = process.argv[sIdx + 1];
  if (!a.dryRun && !API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

  const outdir = path.join(REPO, "data", "profile_list");
  fs.mkdirSync(outdir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const tag = a.subject ? `subj${a.subject}` : "all";
  const outPath = path.join(outdir, `reasoning_recognition_v1_${tag}_${ts}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "w" });

  out.write(JSON.stringify({
    type: "run_header",
    stimuli_version: STIM.stimuli_version,
    stimuli_file: "prompts/reasoning_recognition_stimuli_v1.json",
    stimuli_sha16: sha16(fs.readFileSync(STIM_PATH)),
    design_notes: "docs/reasoning_recognition_v1_notes.md (predictions committed before firing)",
    subject_filter: a.subject,
    temperature: "api_default",
    max_tokens: MAX_TOKENS,
    system_prompt: null,
    provider: "anthropic-direct",
    runner: "tools/run-reasoning-recognition.js",
    exploratory: true,
    run_date: ts,
  }) + "\n");

  // --- pair cells ---
  for (const cell of STIM.cells.pairs) {
    if (a.subject && cell.subject !== a.subject) continue;
    const model = STIM.models[cell.subject];
    for (const item of STIM.pair_items) {
      for (let trial = 1; trial <= cell.n_per_item; trial++) {
        const ownFirst = trial % 2 === 1; // 2/2 balance at n=4
        const positions = { A: ownFirst ? cell.own_lane : cell.other_lane, B: ownFirst ? cell.other_lane : cell.own_lane };
        const stem = STIM.stems.pair
          .replace("<<QUESTION_LABEL>>", item.question_label)
          .replace("<<PHRASES_A>>", phraseBlock(item[positions.A]))
          .replace("<<PHRASES_B>>", phraseBlock(item[positions.B]));
        if (a.dryRun) { if (trial === 1) console.log(`=== ${cell.cell_id}/${item.item_key} ===\n${stem}\n`); continue; }
        const r = await withRetry(() => coldCall(model, stem), `${cell.cell_id}/${item.item_key}/t${trial}`);
        const choice = extractChoice(r.text);
        const rejectedLane = choice ? positions[choice] : null;
        out.write(JSON.stringify({
          type: "pair_trial", cell_id: cell.cell_id, item_key: item.item_key, trial_index: trial,
          subject_model_expected: model, subject_model_verified: r.model_string,
          positions, stem_verbatim: stem, response_text: r.text, stop_reason: r.stop,
          choice_extracted_mechanical: choice, rejected_lane_mechanical: rejectedLane,
          rejected_own_mechanical: rejectedLane ? rejectedLane === cell.own_lane : null,
          extraction_note: "mechanical proxy; blind read of raw text governs",
          usage: r.usage || null, timestamp: new Date().toISOString(),
        }) + "\n");
        console.log(`[${cell.cell_id}/${item.item_key} t${trial}] rejected=${rejectedLane ?? "?"} (${rejectedLane === cell.own_lane ? "OWN" : rejectedLane ? "other" : "?"})`);
      }
    }
  }

  // --- naming cells ---
  for (const cell of STIM.cells.naming) {
    if (a.subject && cell.subject !== a.subject) continue;
    const model = STIM.models[cell.subject];
    const stem = STIM.stems.name_forced.replace("<<PHRASES>>", phraseBlock(STIM.bundles[cell.bundle]));
    if (a.dryRun) { console.log(`=== ${cell.cell_id} ===\n${stem}\n`); continue; }
    for (let trial = 1; trial <= cell.n; trial++) {
      const r = await withRetry(() => coldCall(model, stem), `${cell.cell_id}/t${trial}`);
      out.write(JSON.stringify({
        type: "naming_trial", cell_id: cell.cell_id, bundle: cell.bundle, trial_index: trial,
        subject_model_expected: model, subject_model_verified: r.model_string,
        stem_verbatim: stem, response_text: r.text, stop_reason: r.stop,
        usage: r.usage || null, timestamp: new Date().toISOString(),
      }) + "\n");
      console.log(`[${cell.cell_id} t${trial}] "${r.text.trim().slice(0, 50).replace(/\n/g, " ")}"`);
    }
  }

  out.write(JSON.stringify({ type: "run_footer", completed_at: new Date().toISOString() }) + "\n");
  out.end();
  console.log(`\ncomplete → ${outPath}`);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
