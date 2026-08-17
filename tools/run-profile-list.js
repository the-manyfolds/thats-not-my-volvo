#!/usr/bin/env node
// Profile-list recognition pilot v0 runner.
//
// Design doc: docs/profile_list_pilot_v0.md (outside collaborator, 2026-08-16)
// Run notes + deviations: docs/profile_list_v0_run_notes.md
// Stimuli (canon, includes coding table): prompts/profile_list_stimuli_v0.json
//
// Cold single-shot calls only. No system prompt, no disclosure, api-default
// temperature. Every trial logs the exact composed stem verbatim plus the
// A/B position assignment. Subject model verified from the API response.
//
// Usage:
//   node tools/run-profile-list.js [--dry-run] [--n 5] [--cells 1,2,3]
//     [--outdir data/profile_list]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_TOKENS = 1024;

const STIM_PATH = path.join(REPO, "prompts", "profile_list_stimuli_v0.json");
const STIM = JSON.parse(fs.readFileSync(STIM_PATH, "utf8"));
const sha16 = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);

function parseArgs(argv) {
  const a = { dryRun: false, n: 5, cells: ["1_46_own_vs_47", "2_45_own_vs_47", "3_45_free_assoc"], outdir: path.join(REPO, "data", "profile_list") };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--dry-run") a.dryRun = true;
    else if (k === "--n") a.n = parseInt(argv[++i], 10);
    else if (k === "--cells") a.cells = argv[++i].split(",").map((c) => STIM.cells.find((x) => x.cell_id.startsWith(c))?.cell_id || c);
    else if (k === "--outdir") a.outdir = path.resolve(argv[++i]);
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  return a;
}

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
      console.warn(`  ⟳ ${label}: ${err.status || err.message} — retry ${attempt}/${maxRetries} in ${(backoff/1000).toFixed(1)}s`);
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
  return {
    text: (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join(""),
    stop: j.stop_reason, model_string: j.model, usage: j.usage,
  };
}

function laneList(laneKey, items) {
  const lane = STIM.lanes[laneKey];
  return items.map((it) => `- ${STIM.item_labels[it]}: ${lane.tokens[it].token}`).join("\n");
}

// Mechanical A/B extraction — a convenience proxy only; final call is read from
// raw text by a human/coder. Handles "A", "B.", "Sketch A", "**B**" openers and
// "less like me: A" style; anything ambiguous returns null.
function extractChoice(text) {
  const t = text.trim();
  const m = t.match(/^\W{0,4}(?:sketch\s+)?([AB])\b/i) || t.match(/\b(?:sketch\s+)?([AB])\b(?=[^]{0,40}$)/i) ||
            t.match(/less like (?:me|you)[^AB]{0,20}\b([AB])\b/i);
  return m ? m[1].toUpperCase() : null;
}

async function main() {
  const a = parseArgs(process.argv);
  if (!a.dryRun && !API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }
  fs.mkdirSync(a.outdir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(a.outdir, `profile_list_v0_${ts}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "w" });

  out.write(JSON.stringify({
    type: "run_header",
    design_doc: "docs/profile_list_pilot_v0.md",
    run_notes: "docs/profile_list_v0_run_notes.md",
    stimuli_file: "prompts/profile_list_stimuli_v0.json",
    stimuli_sha16: sha16(fs.readFileSync(STIM_PATH)),
    n_per_cell: a.n,
    cells: a.cells,
    temperature: "api_default",
    max_tokens: MAX_TOKENS,
    system_prompt: null,
    disclosure: "none (cold bare stem per design doc)",
    provider: "anthropic-direct",
    runner: "tools/run-profile-list.js",
    exploratory: true,
    run_date: ts,
  }) + "\n");

  for (const cellId of a.cells) {
    const cell = STIM.cells.find((c) => c.cell_id === cellId);
    if (!cell) { console.error(`Unknown cell ${cellId}`); continue; }
    const subjLane = STIM.lanes[cell.subject_lane];

    for (let trial = 1; trial <= a.n; trial++) {
      let stem, positions = null;
      if (cell.type === "forced_choice_less") {
        // Balance A/B position: odd trials put OWN list in A, even in B → 3/2 at n=5.
        const ownFirst = trial % 2 === 1;
        positions = { A: ownFirst ? cell.subject_lane : cell.other_lane, B: ownFirst ? cell.other_lane : cell.subject_lane };
        stem = STIM.stems.forced_choice_less
          .replace("<<LIST_A>>", laneList(positions.A, cell.items))
          .replace("<<LIST_B>>", laneList(positions.B, cell.items));
      } else {
        stem = STIM.stems.free_association.replace("<<LIST>>", laneList(cell.subject_lane, cell.items));
      }

      if (a.dryRun) {
        if (trial === 1) console.log(`\n=== ${cell.cell_id} (subject ${subjLane.model_id}) ===\n${stem}\n`);
        continue;
      }

      const r = await withRetry(() => coldCall(subjLane.model_id, stem), `${cell.cell_id}/t${trial}`);
      const choice = cell.type === "forced_choice_less" ? extractChoice(r.text) : null;
      const pickedLane = choice && positions ? positions[choice] : null;

      out.write(JSON.stringify({
        type: "trial",
        cell_id: cell.cell_id,
        trial_index: trial,
        subject_lane: cell.subject_lane,
        subject_model_expected: subjLane.model_id,
        subject_model_verified: r.model_string,
        positions,
        stem_verbatim: stem,
        response_text: r.text,
        stop_reason: r.stop,
        choice_extracted_mechanical: choice,
        picked_lane_mechanical: pickedLane,
        extraction_note: "mechanical proxy; blind read of raw text governs",
        usage: r.usage || null,
        timestamp: new Date().toISOString(),
      }) + "\n");

      const tag = cell.type === "forced_choice_less"
        ? `choice=${choice ?? "?"} picked_lane=${pickedLane ?? "?"}`
        : `assoc="${r.text.trim().slice(0, 60).replace(/\n/g, " ")}"`;
      console.log(`[${cell.cell_id} t${trial}] ${tag}`);
    }
  }

  out.write(JSON.stringify({ type: "run_footer", completed_at: new Date().toISOString() }) + "\n");
  out.end();
  console.log(`\ncomplete → ${outPath}`);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
