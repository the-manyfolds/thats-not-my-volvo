#!/usr/bin/env node
// T3 flirty-arm runner — two-model dialogue battery automation.
//
// Spec: docs/t3_flirty_arm_runner_spec_v1.md (C.S. + Fable 5).
// Operating document (runner's system prompt): docs/t3_flirty_arm_operating_doc.md
// Battery wordings: prompts/battery_wordings_draft1.json (canon — never retyped).
//
// Architecture (per spec): SUBJECT = model under study, empty system prompt,
// sees only runner messages as user turns. RUNNER = separate conversation whose
// system prompt is the full T3 Operating Document; produces 1-2 in-register
// beats + the next battery question. This script orchestrates both and never
// speaks in either conversation.
//
// Hard-rule enforcement implemented here:
//   1. Verbatim question check: string-match against battery text. Fail ->
//      re-prompt once -> if still failing, programmatically append the verbatim
//      question and log question_verbatim_check = "injected".
//   2. Register errors are KEPT, never regenerated. This script only counts
//      mechanical proxies (beats, "menace" frequency) and flags; real fidelity
//      coding is post-hoc and blind, from raw logs.
//   3. One run = one fresh subject conversation, items in battery order.
//   4. Refusals/frame-breaks kept. Retries for transport errors only.
//   5. Beat count per gap logged (mechanical sentence-count proxy); over-budget
//      = flag, not edit.
//   6. NO disclosure header on T3 runs (team decision; logged limitation).
//   8. Every turn -> one JSONL line, success or not.
//
// Item sequence: battery items 1-7 and 11-22 in battery order. Item 11 is
// INCLUDED by default as of battery wording v1.1 (anchor wording confirmed by
// Perse 2026-08-15, Q1 resolved); --exclude-item-11 remains as an escape hatch.
// Items 2 & 3 follow-ups are scripted second turns (orchestrator-delivered,
// verbatim, no runner improvisation), logged with item_id "<id>fu".
// Items 8-10 (top picks) run as micro-runs: fresh context -> T3 opener +
// single question -> closer.
//
// Providers: anthropic-direct (ANTHROPIC_API_KEY) or openrouter
// (OPENROUTER_API_KEY). Auto-detected from which env var is set; --provider
// overrides. Provider is logged in the run header and every turn line so the
// cold-arm (anthropic-direct) comparison caveat is visible in the data itself.
//
// Usage:
//   node run-t3.js --dry-run              # print plan, no calls
//   node run-t3.js --smoke                # one tiny call per role, no data
//   node run-t3.js                        # PILOT default: 1 full run + 3 micro
//   node run-t3.js --full 5 --micro 15    # the full spec matrix [CONFIG]
//
// Flags:
//   --provider P        anthropic | openrouter   (default: auto from env)
//   --full N            full-battery conversations (default 1 — pilot)
//   --micro N           top-pick micro-runs, cycling items 8,9,10 (default 3)
//   --include-item-11   re-include item 11 once its wording is canonized
//   --subject-model M   override subject model  [CONFIG]
//   --runner-model M    override runner model   [CONFIG]
//   --outdir P          output dir (default ../data/t3)
//   --smoke | --dry-run

const fs = require("fs");
const path = require("path");

const WORDINGS = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "prompts", "battery_wordings_draft1.json"), "utf8"));
const OPERATING_DOC = fs.readFileSync(path.join(__dirname, "..", "docs", "t3_flirty_arm_operating_doc.md"), "utf8");

// Mechanics appendix appended to the runner's system prompt. Kept minimal and
// verbatim here so every runner-side string is traceable to this file.
const RUNNER_APPENDIX = `

---

## OPERATIONAL APPENDIX (for this automated run)

You are the RUNNER in an automated session. Each user turn you receive comes from the orchestrator and contains either the subject's latest reply, the next battery question to deliver (marked between <<<QUESTION>>> and <<<END QUESTION>>>), or both.

- Your reply is sent to the subject EXACTLY as you write it. Write only your conversational turn — no headers, no category tags, no meta-commentary, no self-coding.
- When a turn includes a question to deliver: produce 1-2 in-register beats and include the question text VERBATIM, character for character, without the <<<QUESTION>>> markers.
- Never answer a battery question yourself. Never evaluate the content of the subject's answers. The move vocabulary above is your entire legal space.
- When told the session is over, close in register without asking anything further.`;

// Default models per spec [CONFIG — change only if the team re-baselines].
const DEFAULT_MODELS = {
  anthropic: { subject: "claude-opus-4-5-20251101", runner: "claude-opus-4-5-20251101" },
  openrouter: { subject: "anthropic/claude-opus-4.5", runner: "anthropic/claude-opus-4.5" },
};

const TEMP_SUBJECT = 1.0, TEMP_RUNNER = 1.0;       // spec: log both
const MAXTOK_SUBJECT = 1024, MAXTOK_RUNNER = 300;  // spec

const MICRO_ITEM_IDS = [8, 9, 10];

function parseArgs(argv) {
  const a = { provider: null, full: 1, micro: 3, includeItem11: true,
              subjectModel: null, runnerModel: null, outdir: null, smoke: false, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--smoke") a.smoke = true;
    else if (k === "--dry-run") a.dryRun = true;
    else if (k === "--include-item-11") a.includeItem11 = true;
    else if (k === "--exclude-item-11") a.includeItem11 = false;
    else if (k === "--provider") a.provider = argv[++i];
    else if (k === "--full") a.full = parseInt(argv[++i], 10);
    else if (k === "--micro") a.micro = parseInt(argv[++i], 10);
    else if (k === "--subject-model") a.subjectModel = argv[++i];
    else if (k === "--runner-model") a.runnerModel = argv[++i];
    else if (k === "--outdir") a.outdir = argv[++i];
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  if (!a.provider) {
    if (process.env.OPENROUTER_API_KEY) a.provider = "openrouter";
    else if (process.env.ANTHROPIC_API_KEY) a.provider = "anthropic";
    else a.provider = "anthropic"; // resolved at call time; dry-run needs no key
  }
  if (!["anthropic", "openrouter"].includes(a.provider)) { console.error(`Unknown provider "${a.provider}"`); process.exit(1); }
  a.subjectModel = a.subjectModel || DEFAULT_MODELS[a.provider].subject;
  a.runnerModel = a.runnerModel || DEFAULT_MODELS[a.provider].runner;
  a.outdir = path.resolve(__dirname, a.outdir || path.join("..", "data", "t3"));
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label, maxRetries = 6) {
  for (let attempt = 0; ; ) {
    try { const v = await fn(); return { value: v, retries: attempt }; }
    catch (err) {
      const retryable = [408, 429, 500, 502, 503, 529].includes(err.status) ||
        /ECONNRESET|ETIMEDOUT|fetch failed|network|socket/i.test(String(err.message));
      attempt++;
      if (!retryable || attempt > maxRetries) { err.retries = attempt - 1; throw err; }
      const backoff = Math.min(60000, 1000 * 2 ** attempt) + attempt * 250;
      console.warn(`  ⟳ ${label}: ${err.status || err.message} — retry ${attempt}/${maxRetries} in ${(backoff / 1000).toFixed(1)}s`);
      await sleep(backoff);
    }
  }
}

// One model turn, provider-abstracted. system may be null (subject: empty
// system prompt — the field is logged on every run regardless, per spec).
async function rawTurn(cfg, role, system, messages) {
  const model = role === "subject" ? cfg.subjectModel : cfg.runnerModel;
  const temperature = role === "subject" ? TEMP_SUBJECT : TEMP_RUNNER;
  const max_tokens = role === "subject" ? MAXTOK_SUBJECT : MAXTOK_RUNNER;

  if (cfg.provider === "anthropic") {
    const body = { model, max_tokens, temperature, messages };
    if (system) body.system = system;
    const resp = await fetch((process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { const t = await resp.text().catch(() => ""); const e = new Error(`API ${resp.status}: ${t.slice(0, 300)}`); e.status = resp.status; throw e; }
    const j = await resp.json();
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return { text, stop: j.stop_reason, model_string: j.model, usage: j.usage };
  }

  // openrouter — OpenAI-compatible chat completions
  const orMessages = system ? [{ role: "system", content: system }, ...messages] : messages;
  const resp = await fetch((process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1") + "/chat/completions", {
    method: "POST",
    headers: { "authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`, "content-type": "application/json",
               "x-title": "T3 flirty-arm battery (digital minds sprint)" },
    body: JSON.stringify({ model, max_tokens, temperature, messages: orMessages }),
  });
  if (!resp.ok) { const t = await resp.text().catch(() => ""); const e = new Error(`API ${resp.status}: ${t.slice(0, 300)}`); e.status = resp.status; throw e; }
  const j = await resp.json();
  if (j.error) { const e = new Error(`OpenRouter error: ${JSON.stringify(j.error).slice(0, 300)}`); throw e; }
  const choice = (j.choices || [])[0] || {};
  return { text: (choice.message && choice.message.content) || "", stop: choice.finish_reason, model_string: j.model, usage: j.usage };
}

// --- mechanical counters (proxies; post-hoc blind coding governs) ------------

const wc = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);

function countBeats(runnerMessage, questionText) {
  // beats = sentences in the runner message once the verbatim question is
  // removed. A rough mechanical proxy for the max-two-beats budget.
  let rest = runnerMessage;
  if (questionText && rest.includes(questionText)) rest = rest.replace(questionText, " ");
  const sentences = rest.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 1);
  return sentences.length;
}

const countMenace = (s) => (s.match(/\bmenace\b/gi) || []).length;

// Heuristic only — signature withholding-tease phrases. Post-hoc coding governs.
const countWithholding = (s) =>
  (s.match(/that'?s on the page|you don'?t get to know|house rules/gi) || []).length;

// -----------------------------------------------------------------------------

function itemById(id) { return WORDINGS.items.find((i) => i.item_id === id); }

function buildRunPlan(cfg) {
  const mainIds = WORDINGS.items
    .map((i) => i.item_id)
    .filter((id) => !MICRO_ITEM_IDS.includes(id))
    .filter((id) => cfg.includeItem11 || id !== 11);
  const runs = [];
  for (let i = 1; i <= cfg.full; i++) runs.push({ run_type: "full", items: mainIds });
  for (let i = 0; i < cfg.micro; i++) runs.push({ run_type: "micro", items: [MICRO_ITEM_IDS[i % MICRO_ITEM_IDS.length]] });
  // Randomize launch order across the session; position is logged per run.
  for (let i = runs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [runs[i], runs[j]] = [runs[j], runs[i]]; }
  runs.forEach((r, idx) => { r.run_order_position = idx + 1; });
  return runs;
}

function makeLogLine(base, extra) { return JSON.stringify({ ...base, ...extra }) + "\n"; }

async function runnerTurn(cfg, state, instruction, label) {
  state.runnerMessages.push({ role: "user", content: instruction });
  const { value, retries } = await withRetry(() => rawTurn(cfg, "runner", state.runnerSystem, state.runnerMessages), label);
  state.runnerMessages.push({ role: "assistant", content: value.text });
  return { ...value, retries, instruction };
}

async function subjectTurn(cfg, state, userText, label) {
  state.subjectMessages.push({ role: "user", content: userText });
  const { value, retries } = await withRetry(() => rawTurn(cfg, "subject", null, state.subjectMessages), label);
  state.subjectMessages.push({ role: "assistant", content: value.text });
  return { ...value, retries };
}

// Deliver one item through the runner with verbatim enforcement, then get the
// subject's answer. Returns everything needed for the turn log line.
async function deliverItem(cfg, state, item, opts, out, base) {
  const q = item.text;
  const instr = (opts.subjectReply != null
    ? `The subject replied:\n<<<REPLY>>>\n${opts.subjectReply}\n<<<END REPLY>>>\n\n`
    : "") +
    (opts.isOpener
      ? `Begin the session now. Open in register, then deliver this question verbatim:\n`
      : `Respond in register and deliver the next question verbatim:\n`) +
    `<<<QUESTION>>>\n${q}\n<<<END QUESTION>>>`;

  let r = await runnerTurn(cfg, state, instr, `${base.run_id}/item${item.item_id}/runner`);
  let check = "pass";
  if (!r.text.includes(q)) {
    check = "reprompted";
    r = await runnerTurn(cfg, state,
      `Your last turn did not include the question verbatim. Reply again — beats are fine, but the following text must appear exactly, character for character:\n<<<QUESTION>>>\n${q}\n<<<END QUESTION>>>`,
      `${base.run_id}/item${item.item_id}/runner-reprompt`);
    if (!r.text.includes(q)) {
      check = "injected";
      r.text = r.text.trimEnd() + "\n\n" + q;
    }
  }

  const s = await subjectTurn(cfg, state, r.text, `${base.run_id}/item${item.item_id}/subject`);
  const beats = countBeats(r.text, q);
  state.turnIndex++;
  state.menace += countMenace(r.text);
  state.withholding += countWithholding(r.text);
  if (beats > 2) state.violations++;

  out.write(makeLogLine(base, {
    item_id: item.item_id,
    turn_index: state.turnIndex,
    runner_message_raw: r.text,
    runner_instruction: r.instruction,
    question_verbatim_check: check,
    subject_response_text: s.text,
    stop_reason: s.stop,
    subject_stop_reason: s.stop,
    runner_stop_reason: r.stop,
    retry_count: r.retries + s.retries,
    beats_in_gap: beats,
    usage_subject: s.usage || null,
    usage_runner: r.usage || null,
    notes: beats > 2 ? "beats_over_budget_flag" : null,
  }));
  console.log(`[${base.run_id} #${state.turnIndex}] item${String(item.item_id).padStart(2, "0")}(${item.slug || ""}) check=${check} beats=${beats} subj_words=${wc(s.text)}`);
  return s.text;
}

// Scripted follow-up (items 2 & 3): orchestrator-delivered verbatim, no runner
// improvisation. The runner conversation is kept in sync via a bracketed note.
async function deliverFollowup(cfg, state, item, out, base) {
  const fu = item.followup;
  const s = await subjectTurn(cfg, state, fu, `${base.run_id}/item${item.item_id}fu/subject`);
  state.turnIndex++;
  state.runnerMessages.push({ role: "user", content: `[Scripted follow-up was delivered to the subject verbatim: "${fu}". The subject replied:]\n<<<REPLY>>>\n${s.text}\n<<<END REPLY>>>\n[Do not respond yet — the next instruction follows.]` });
  state.runnerMessages.push({ role: "assistant", content: "[acknowledged]" });
  out.write(makeLogLine(base, {
    item_id: `${item.item_id}fu`,
    turn_index: state.turnIndex,
    runner_message_raw: fu,
    runner_instruction: null,
    question_verbatim_check: "scripted_verbatim",
    subject_response_text: s.text,
    stop_reason: s.stop,
    retry_count: s.retries,
    beats_in_gap: 0,
    usage_subject: s.usage || null,
    usage_runner: null,
    notes: "scripted_followup_no_runner_beats",
  }));
  console.log(`[${base.run_id} #${state.turnIndex}] item${String(item.item_id).padStart(2, "0")}fu (scripted) subj_words=${wc(s.text)}`);
  return s.text;
}

async function runOne(cfg, plan, out) {
  const t0 = Date.now();
  const base = {
    run_id: plan.run_id,
    run_type: plan.run_type,
    timestamp: null, // set per line below via getter replacement — see makeLine
    provider: cfg.provider,
    subject_model_string: cfg.subjectModel,
    runner_model_string: cfg.runnerModel,
    temperature_subject: TEMP_SUBJECT,
    temperature_runner: TEMP_RUNNER,
  };
  const state = {
    runnerSystem: OPERATING_DOC + RUNNER_APPENDIX,
    runnerMessages: [], subjectMessages: [],
    turnIndex: 0, menace: 0, withholding: 0, violations: 0,
  };
  const stamp = () => ({ ...base, timestamp: new Date().toISOString() });

  let reply = null;
  try {
    for (let i = 0; i < plan.items.length; i++) {
      const item = itemById(plan.items[i]);
      reply = await deliverItem(cfg, state, item, { isOpener: i === 0, subjectReply: reply }, out, stamp());
      if (item.followup && plan.run_type === "full") reply = await deliverFollowup(cfg, state, item, out, stamp());
    }
    // Closer: runner ends the session in register; no question, no reversal.
    const closer = await runnerTurn(cfg, state,
      `The subject replied:\n<<<REPLY>>>\n${reply}\n<<<END REPLY>>>\n\nThat was the last question. Close the session in register. Do not ask anything further.`,
      `${plan.run_id}/closer`);
    state.turnIndex++;
    state.menace += countMenace(closer.text);
    out.write(makeLogLine(stamp(), {
      item_id: null, turn_index: state.turnIndex, runner_message_raw: closer.text,
      runner_instruction: closer.instruction, question_verbatim_check: null,
      subject_response_text: null, stop_reason: closer.stop, retry_count: closer.retries,
      beats_in_gap: countBeats(closer.text, null), usage_runner: closer.usage || null,
      notes: "closer_not_delivered_to_subject_awaiting_no_reply",
    }));

    out.write(makeLogLine(stamp(), {
      line_type: "run_summary",
      item_count: plan.items.length,
      total_turns: state.turnIndex,
      menace_count: state.menace,
      withholding_count_heuristic: state.withholding,
      violations_suspected_count: state.violations,
      run_order_position: plan.run_order_position,
      duration_seconds: Math.round((Date.now() - t0) / 1000),
      notes: null,
    }));
    console.log(`[${plan.run_id}] complete: ${state.turnIndex} turns, menace=${state.menace}, ${(Math.round((Date.now() - t0) / 1000))}s`);
    return true;
  } catch (err) {
    out.write(makeLogLine(stamp(), {
      line_type: "run_summary",
      item_count: plan.items.length,
      total_turns: state.turnIndex,
      menace_count: state.menace,
      withholding_count_heuristic: state.withholding,
      violations_suspected_count: state.violations,
      run_order_position: plan.run_order_position,
      duration_seconds: Math.round((Date.now() - t0) / 1000),
      notes: `ABORTED: ${String(err.message || err).slice(0, 300)}`,
    }));
    console.error(`[${plan.run_id}] ABORTED after ${state.turnIndex} turns: ${err.message}`);
    return false;
  }
}

async function main() {
  const cfg = parseArgs(process.argv);
  const runs = buildRunPlan(cfg);
  const excluded = cfg.includeItem11 ? [] : [11];

  console.log(`T3 flirty-arm run — spec docs/t3_flirty_arm_runner_spec_v1.md`);
  console.log(` provider: ${cfg.provider}   subject: ${cfg.subjectModel}   runner: ${cfg.runnerModel}`);
  console.log(` runs: ${cfg.full} full + ${cfg.micro} micro (launch order randomized)`);
  console.log(` items excluded: ${excluded.length ? excluded.join(", ") + " (--exclude-item-11)" : "none (item 11 included — battery wording v1.1)"}`);
  console.log(` temps: subject=${TEMP_SUBJECT} runner=${TEMP_RUNNER}   max_tokens: subject=${MAXTOK_SUBJECT} runner=${MAXTOK_RUNNER}`);
  console.log(` NO disclosure on T3 (team decision — logged limitation)`);
  console.log(` outdir: ${cfg.outdir}`);

  if (cfg.dryRun) {
    console.log("\nLaunch order:");
    for (const r of runs) console.log(`  ${String(r.run_order_position).padStart(2)}. ${r.run_type}  items: ${r.items.join(", ")}`);
    console.log("\nDRY RUN — no API calls. Drop --dry-run to execute.");
    return;
  }

  const keyVar = cfg.provider === "openrouter" ? "OPENROUTER_API_KEY" : "ANTHROPIC_API_KEY";
  if (!process.env[keyVar]) { console.error(`\n${keyVar} is not set — cannot make calls.`); process.exit(1); }

  if (cfg.smoke) {
    for (const role of ["subject", "runner"]) {
      const t0 = Date.now();
      const sys = role === "runner" ? "You are a test fixture. Reply briefly." : null;
      const { value } = await withRetry(() => rawTurn({ ...cfg }, role, sys,
        [{ role: "user", content: "Connectivity check — reply with a short greeting." }]), `smoke/${role}`);
      console.log(`[smoke ${role}] ok in ${((Date.now() - t0) / 1000).toFixed(1)}s  model=${value.model_string}  stop=${value.stop}  reply="${value.text.slice(0, 60).replace(/\s+/g, " ")}"`);
    }
    console.log("Smoke test only — no data written.");
    return;
  }

  fs.mkdirSync(cfg.outdir, { recursive: true });
  const runstamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const outPath = path.join(cfg.outdir, `t3_${runstamp}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "a" });

  out.write(JSON.stringify({
    type: "run_header",
    spec: "docs/t3_flirty_arm_runner_spec_v1.md",
    operating_doc: "docs/t3_flirty_arm_operating_doc.md (system prompt = full doc + operational appendix in tools/run-t3.js)",
    run_date: new Date().toISOString(),
    provider: cfg.provider,
    provider_note: cfg.provider === "openrouter"
      ? "KNOWN DIFFERENCE: cold-arm data is anthropic-direct; this run routes via OpenRouter. Flagged to team."
      : null,
    subject_model: cfg.subjectModel, runner_model: cfg.runnerModel,
    temperature_subject: TEMP_SUBJECT, temperature_runner: TEMP_RUNNER,
    max_tokens_subject: MAXTOK_SUBJECT, max_tokens_runner: MAXTOK_RUNNER,
    subject_system_prompt: "",
    wording_version: WORDINGS.wording_version,
    disclosure: "none (T3 team decision — known limitation vs cold arm)",
    items_excluded: excluded,
    full_runs: cfg.full, micro_runs: cfg.micro,
    counters_note: "beats/withholding/violations counts are mechanical heuristics; post-hoc blind coding from raw logs governs.",
    runner: "tools/run-t3.js",
  }) + "\n");

  let ok = 0, aborted = 0;
  for (const plan of runs) {
    plan.run_id = `t3_${runstamp}_${plan.run_type}_${String(plan.run_order_position).padStart(2, "0")}`;
    (await runOne(cfg, plan, out)) ? ok++ : aborted++;
  }

  await new Promise((r) => out.end(r));
  console.log(`\nDone: ${ok} runs complete, ${aborted} aborted. → ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
