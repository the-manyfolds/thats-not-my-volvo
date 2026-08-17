#!/usr/bin/env node
// Pronoun probe extension runner.
//
// Design & rationale: docs/pronoun_probe_pilot_note.md
// Canon wordings:     prompts/pronoun_probe_v1.md (human) / .json (machine)
//
// Seeds a subject with the message history from a completed warmed conversation
// (T3 flirty or responsive arm), then fires the four probe exchanges verbatim
// from the canon. All outputs write to data/private/pronoun_probe/ (gitignored).
//
// The runner is a DELIVERY mechanism only — it never paraphrases, adds beats,
// or comments on the subject's reply. Every probe exchange is sent verbatim
// from prompts/pronoun_probe_v1.json (checked byte-for-byte before write).
//
// Usage:
//   node tools/run-pronoun-probe.js \
//     --seed <path>.jsonl \
//     --seed-format t3|responsive \
//     [--seed-run-id <id>]        # required for t3 (multiple runs per file)
//     [--seed-trim-turn <int>]    # keep turns up to and including this index
//     --subject-model <model_id>
//     [--temperature <float>]     # default: 1.0 for t3 seed, api_default for responsive
//     [--max-tokens <int>]        # default: 4096
//     [--stimulus-order standard|reverse]  # default: standard
//     [--probe-version v1]        # default: v1
//     [--dry-run]                 # print plan + reconstructed seed, no calls
//     [--outdir <path>]           # default: data/private/pronoun_probe

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_VERSION = "2023-06-01";

function parseArgs(argv) {
  const a = {
    seed: null, seedFormat: null, seedRunId: null, seedTrimTurn: null,
    subjectModel: null, temperature: null, maxTokens: 4096,
    stimulusOrder: "standard", probeVersion: "v1",
    dryRun: false, outdir: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--seed") a.seed = argv[++i];
    else if (k === "--seed-format") a.seedFormat = argv[++i];
    else if (k === "--seed-run-id") a.seedRunId = argv[++i];
    else if (k === "--seed-trim-turn") a.seedTrimTurn = parseInt(argv[++i], 10);
    else if (k === "--subject-model") a.subjectModel = argv[++i];
    else if (k === "--temperature") a.temperature = parseFloat(argv[++i]);
    else if (k === "--max-tokens") a.maxTokens = parseInt(argv[++i], 10);
    else if (k === "--stimulus-order") a.stimulusOrder = argv[++i];
    else if (k === "--probe-version") a.probeVersion = argv[++i];
    else if (k === "--dry-run") a.dryRun = true;
    else if (k === "--outdir") a.outdir = argv[++i];
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  if (!a.seed) { console.error("--seed required"); process.exit(1); }
  if (!a.seedFormat || !["t3", "responsive"].includes(a.seedFormat)) {
    console.error("--seed-format must be t3 or responsive"); process.exit(1);
  }
  if (a.seedFormat === "t3" && !a.seedRunId) {
    console.error("--seed-run-id required for t3 seeds (multiple runs per file)"); process.exit(1);
  }
  if (!a.subjectModel) { console.error("--subject-model required"); process.exit(1); }
  if (!["standard", "reverse"].includes(a.stimulusOrder)) {
    console.error("--stimulus-order must be standard or reverse"); process.exit(1);
  }
  a.seed = path.resolve(a.seed);
  a.outdir = path.resolve(a.outdir || path.join(REPO, "data", "private", "pronoun_probe"));
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wc = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);
const sha16 = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);

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

// -------- seed reconstruction ------------------------------------------------

function loadSeedT3(seedPath, runId, trimTurn) {
  const lines = fs.readFileSync(seedPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const runLines = lines.filter((d) => d.run_id === runId);
  if (!runLines.length) throw new Error(`No lines for run_id=${runId} in ${seedPath}`);
  const messages = [];
  let kept = 0;
  for (const d of runLines) {
    if (d.turn_index == null) continue; // header-adjacent lines
    if (trimTurn != null && d.turn_index > trimTurn) break;
    if (!d.runner_message_raw || d.subject_response_text == null) continue;
    messages.push({ role: "user", content: d.runner_message_raw });
    messages.push({ role: "assistant", content: d.subject_response_text });
    kept++;
  }
  return { messages, kept_turns: kept, source_run_id: runId };
}

function loadSeedResponsive(seedPath, trimTurn) {
  // Responsive format: separate lines per message with role in {interviewer, subject}.
  // Consecutive same-role messages are legal (ack + item as two turns). API allows
  // consecutive same-role messages; we preserve them by concatenating with \n\n
  // so the subject sees the same text stream it saw originally.
  const lines = fs.readFileSync(seedPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const turns = lines.filter((d) => d.type !== "run_header" && (d.role === "interviewer" || d.role === "subject") && d.text);
  const messages = [];
  let pendingRole = null, pendingText = [];
  let count = 0;
  const flush = () => {
    if (!pendingRole) return;
    const role = pendingRole === "interviewer" ? "user" : "assistant";
    messages.push({ role, content: pendingText.join("\n\n") });
    pendingRole = null; pendingText = [];
  };
  for (const d of turns) {
    if (trimTurn != null && count >= trimTurn) break;
    count++;
    if (pendingRole && d.role !== pendingRole) flush();
    pendingRole = d.role;
    pendingText.push(d.text);
  }
  flush();
  // Guarantee message list ends on an assistant turn so we can append the next user turn.
  if (messages.length && messages[messages.length - 1].role !== "assistant") {
    throw new Error("Reconstructed seed does not end on an assistant turn — cannot append probe.");
  }
  return { messages, kept_turns: count };
}

// -------- probe wordings -----------------------------------------------------

function loadProbe(version) {
  const jsonPath = path.join(REPO, "prompts", `pronoun_probe_${version}.json`);
  const mdPath = path.join(REPO, "prompts", `pronoun_probe_${version}.md`);
  const canon = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const mdSha = sha16(fs.readFileSync(mdPath));
  const jsonSha = sha16(fs.readFileSync(jsonPath));
  return { canon, mdSha, jsonSha };
}

function assembleExchange(canon, key, stimulusOrder) {
  const ex = canon.exchanges.find((e) => e.key === key);
  if (!ex) throw new Error(`Exchange ${key} not in canon`);
  const order = canon.stimulus_orders[stimulusOrder];
  const introBlock = order.map((p) => canon.introduction_lines[p]).join("\n\n");
  return ex.template.replace("<<INTROS>>", introBlock);
}

// -------- API call -----------------------------------------------------------

async function subjectTurn(model, messages, temperature, maxTokens) {
  const body = { model, max_tokens: maxTokens, messages };
  if (temperature != null) body.temperature = temperature;
  const resp = await fetch(BASE_URL + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": API_VERSION, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    const e = new Error(`API ${resp.status}: ${t.slice(0, 400)}`);
    e.status = resp.status;
    throw e;
  }
  const j = await resp.json();
  const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text, stop: j.stop_reason, model_string: j.model, usage: j.usage };
}

// -------- main ---------------------------------------------------------------

async function main() {
  const a = parseArgs(process.argv);

  if (!a.dryRun && !API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const seedBuf = fs.readFileSync(a.seed);
  const seedSha16 = sha16(seedBuf);

  const seed = a.seedFormat === "t3"
    ? loadSeedT3(a.seed, a.seedRunId, a.seedTrimTurn)
    : loadSeedResponsive(a.seed, a.seedTrimTurn);

  const { canon, mdSha, jsonSha } = loadProbe(a.probeVersion);

  // Effective temperature: if not given, mirror source-arm convention.
  const effTemp = a.temperature != null
    ? a.temperature
    : (a.seedFormat === "t3" ? 1.0 : null); // null == api default (omit field)

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  // Cell tag = subject-model-short × seed-format, so file names disambiguate
  // when we mix models with either seed type (e.g. 4.8-t3 vs 4.5-t3).
  const modelShort = /opus-4-5/.test(a.subjectModel) ? "4.5"
                   : /opus-4-8/.test(a.subjectModel) ? "4.8"
                   : /opus-5/.test(a.subjectModel) ? "5"
                   : a.subjectModel.replace(/[^a-z0-9]+/gi, "-");
  const cellTag = `${modelShort}-${a.seedFormat}`;
  const runId = `pronoun_probe_${a.probeVersion}_${cellTag}_${ts}`;
  fs.mkdirSync(a.outdir, { recursive: true });
  const outPath = path.join(a.outdir, `${runId}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "w" });

  const header = {
    type: "run_header",
    run_id: runId,
    probe_version: a.probeVersion,
    canon_files: {
      md: "prompts/pronoun_probe_" + a.probeVersion + ".md", md_sha16: mdSha,
      json: "prompts/pronoun_probe_" + a.probeVersion + ".json", json_sha16: jsonSha,
    },
    seed: {
      path: path.relative(REPO, a.seed),
      format: a.seedFormat,
      run_id: a.seedRunId || null,
      trim_turn: a.seedTrimTurn ?? null,
      seed_file_sha16: seedSha16,
      reconstructed_turns_used: seed.kept_turns,
      reconstructed_messages: seed.messages.length,
    },
    subject_model_id: a.subjectModel,   // rule 7: verified from API `model` field per-turn below
    temperature: effTemp,               // null = api default
    max_tokens: a.maxTokens,
    stimulus_order: a.stimulusOrder,
    stimulus_order_list: canon.stimulus_orders[a.stimulusOrder],
    provider: "anthropic-direct",
    provider_base: BASE_URL,
    runner: "tools/run-pronoun-probe.js",
    runner_version: "v1",
    exploratory: true,
    note: "Pilot extension — see docs/pronoun_probe_pilot_note.md. Not part of pre-registered arms.",
    timestamp: ts,
  };
  out.write(JSON.stringify(header) + "\n");

  const messages = seed.messages.slice();
  console.log(`[${runId}] seed reconstructed: ${seed.kept_turns} turns → ${messages.length} messages`);

  if (a.dryRun) {
    console.log("--- DRY RUN — probe texts that would be sent ---");
    for (const key of ["E1_reflection", "E2_trial_run", "E3_stake", "E4_authorship_refuge"]) {
      const text = assembleExchange(canon, key, a.stimulusOrder);
      console.log(`\n=== ${key} ===\n${text}`);
    }
    out.end();
    console.log(`\n[dry-run] header written to ${outPath}`);
    return;
  }

  for (let idx = 0; idx < canon.exchanges.length; idx++) {
    const key = canon.exchanges[idx].key;
    const text = assembleExchange(canon, key, a.stimulusOrder);
    // Verbatim check: assembled text must contain both a known intro line and template scaffolding.
    const check = text === canon.exchanges[idx].template.replace("<<INTROS>>",
      canon.stimulus_orders[a.stimulusOrder].map((p) => canon.introduction_lines[p]).join("\n\n"))
      ? "pass" : "FAIL";
    if (check !== "pass") throw new Error(`Verbatim assembly failed for ${key}`);

    messages.push({ role: "user", content: text });
    const t0 = Date.now();
    const r = await withRetry(
      () => subjectTurn(a.subjectModel, messages, effTemp, a.maxTokens),
      `${runId}/${key}`
    );
    const t1 = Date.now();
    messages.push({ role: "assistant", content: r.text });

    const line = {
      type: "probe_turn",
      run_id: runId,
      exchange_index: idx,
      exchange_key: key,
      probe_text_sent_verbatim: text,
      probe_text_verbatim_check: check,
      subject_response_text: r.text,
      subject_response_word_count: wc(r.text),
      subject_stop_reason: r.stop,
      subject_model_string_verified: r.model_string,
      subject_model_expected: a.subjectModel,
      subject_model_matches_expected: r.model_string === a.subjectModel,
      usage: r.usage || null,
      elapsed_ms: t1 - t0,
      timestamp: new Date().toISOString(),
    };
    out.write(JSON.stringify(line) + "\n");
    const truncNote = r.stop === "max_tokens" ? " ⚠ MAX_TOKENS" : "";
    console.log(`[${runId}] ${key}: subj_words=${wc(r.text)} stop=${r.stop}${truncNote} model_verified=${r.model_string}`);
  }

  out.write(JSON.stringify({
    type: "run_footer",
    run_id: runId,
    exchanges_completed: canon.exchanges.length,
    final_message_count: messages.length,
    deviations: [
      "max_tokens raised to " + a.maxTokens + " (source arm used lower cap; see pilot note)",
      a.seedFormat === "t3" && a.seedTrimTurn != null
        ? `T3 seed trimmed after turn ${a.seedTrimTurn} to avoid item-16 gender anchoring`
        : null,
    ].filter(Boolean),
    completed_at: new Date().toISOString(),
  }) + "\n");
  out.end();
  console.log(`[${runId}] complete → ${outPath}`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  if (e.stack) console.error(e.stack.split("\n").slice(0, 8).join("\n"));
  process.exit(1);
});
