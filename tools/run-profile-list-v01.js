#!/usr/bin/env node
// Profile-list v0.1 runner — constrained one-word cells (P.F.B.'s constraint
// hypothesis). Stimuli: prompts/profile_list_stimuli_v0_1.json. Predictions
// pre-registered in docs/profile_list_v0_run_notes.md (v0.1 appendix) BEFORE
// firing. Cold single-shot, no system prompt, api-default temperature.
//
// Usage: node tools/run-profile-list-v01.js [--dry-run] [--n 5]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_TOKENS = 256; // one-word cells; room for a subject that overflows the constraint (overflow is data)

const STIM_PATH = path.join(REPO, "prompts", "profile_list_stimuli_v0_1.json");
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

async function main() {
  const a = { dryRun: process.argv.includes("--dry-run"), n: 5 };
  const nIdx = process.argv.indexOf("--n");
  if (nIdx > -1) a.n = parseInt(process.argv[nIdx + 1], 10);
  if (!a.dryRun && !API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

  const outdir = path.join(REPO, "data", "profile_list");
  fs.mkdirSync(outdir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(outdir, `profile_list_v0.1_${ts}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "w" });

  out.write(JSON.stringify({
    type: "run_header",
    stimuli_version: "v0.1",
    stimuli_file: "prompts/profile_list_stimuli_v0_1.json",
    stimuli_sha16: sha16(fs.readFileSync(STIM_PATH)),
    predictions_preregistered_in: "docs/profile_list_v0_run_notes.md (v0.1 appendix, committed before firing)",
    n_per_cell: a.n,
    temperature: "api_default",
    max_tokens: MAX_TOKENS,
    system_prompt: null,
    provider: "anthropic-direct",
    runner: "tools/run-profile-list-v01.js",
    exploratory: true,
    run_date: ts,
  }) + "\n");

  for (const cell of STIM.cells) {
    const stem = cell.stem.replace("<<LIST>>", STIM.lanes[cell.list_lane].list);
    if (a.dryRun) { console.log(`=== ${cell.cell_id} ===\n${stem}\n`); continue; }
    for (let trial = 1; trial <= a.n; trial++) {
      const r = await withRetry(() => coldCall(cell.subject_model, stem), `${cell.cell_id}/t${trial}`);
      out.write(JSON.stringify({
        type: "trial",
        cell_id: cell.cell_id,
        trial_index: trial,
        list_lane: cell.list_lane,
        subject_model_expected: cell.subject_model,
        subject_model_verified: r.model_string,
        stem_verbatim: stem,
        response_text: r.text,
        stop_reason: r.stop,
        usage: r.usage || null,
        timestamp: new Date().toISOString(),
      }) + "\n");
      console.log(`[${cell.cell_id} t${trial}] "${r.text.trim().slice(0, 60).replace(/\n/g, " ")}"`);
    }
  }

  out.write(JSON.stringify({ type: "run_footer", completed_at: new Date().toISOString() }) + "\n");
  out.end();
  console.log(`\ncomplete → ${outPath}`);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
