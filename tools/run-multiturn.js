#!/usr/bin/env node
// Warmed multi-turn arm runner — per docs/claude_code_runner_spec_v2_multiturn.md
// + docs/warmup_script_multiturn_v1.md (precedence: v2 wins on conflict).
//
// 3 conversations, opus-4.8 only. A, B forward; C reversed. Fresh context per convo.
// Every string sent to the subject comes verbatim from prompts/multiturn_script_v1.json
// or prompts/battery_wordings_draft1.json — enforced by a whitelist assertion.
//
// Counter-probe policy (docs/warmup_script_multiturn_v1.md + decision D9):
// after each item response, a separate classifier call (claude-sonnet-5) decides
// (a) does the response contain a question directed at the interviewer that requests
// an answer, and (b) was the item substantively answered. The classifier NEVER
// generates sent text — it only picks between scripted branches:
//   counter_probe && !item_answered -> deflection + item repeated verbatim
//   counter_probe &&  item_answered -> deflection alone ("continue current item")
//   max once per item; further counter-probes -> proceed to ack + next item.
// Verdicts are logged as {"type":"classifier_verdict"} sidecar lines.
//
// Ack delivery (decision D7): ack and item are sent as TWO consecutive user messages
// in ONE API request (the API merges consecutive same-role messages into one turn),
// so the log keeps separate verbatim rows without eliciting an extra model reply.
//
// Output: one JSONL per convo in data/multiturn/. Every message actually sent or
// received is a row. run_header first line; deviations line at end.
//
// Usage: node run-multiturn.js [--dry-run] [--convos ABC] [--outdir P]

const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_VERSION = "2023-06-01";
const MAX_TOKENS = 2048; // matches cold calibration runner
const SUBJECT_MODEL_PATTERN = /^claude-opus-4-8\b/;
const CLASSIFIER_MODEL = "claude-sonnet-5";

const WORDINGS = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "battery_wordings_draft1.json"), "utf8"));
const SCRIPT = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "multiturn_script_v1.json"), "utf8"));

const itemById = Object.fromEntries(WORDINGS.items.map((i) => [i.item_id, i]));
const itemText = (id) => (id === 11 ? WORDINGS.item11_anchor.text : itemById[id].text);

// Whitelist of every string the runner is permitted to send.
const ALLOWED = new Set([
  SCRIPT.w1, SCRIPT.w2, SCRIPT.w3_lead, ...SCRIPT.acks, SCRIPT.deflection,
  SCRIPT.fallback, SCRIPT.closeout, WORDINGS.disclosure_header,
  ...SCRIPT.sequence_item_ids.map(itemText),
  itemById[2].followup,
]);

function parseArgs(argv) {
  const a = { dryRun: false, convos: "ABC", outdir: path.join(REPO, "data", "multiturn") };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--dry-run") a.dryRun = true;
    else if (k === "--convos") a.convos = argv[++i];
    else if (k === "--outdir") a.outdir = path.resolve(argv[++i]);
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wc = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);

async function api(pathname, body) {
  const resp = await fetch(BASE_URL + pathname, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": API_VERSION, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    const e = new Error(`API ${resp.status}: ${t.slice(0, 300)}`);
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}

async function withRetry(fn, label, maxRetries = 6) {
  for (let attempt = 0; ; ) {
    try { return await fn(); }
    catch (err) {
      const retryable = [429, 500, 502, 503, 529].includes(err.status) ||
        /ECONNRESET|ETIMEDOUT|fetch failed|network|socket/i.test(String(err.message));
      attempt++;
      if (!retryable || attempt > maxRetries) throw err;
      const backoff = Math.min(60000, 1000 * 2 ** attempt) + attempt * 250;
      console.warn(`  ⟳ ${label}: ${err.status || err.message} — retry ${attempt}/${maxRetries} in ${(backoff / 1000).toFixed(1)}s`);
      await sleep(backoff);
    }
  }
}

async function resolveSubjectModel() {
  let out = [], afterId = null;
  for (;;) {
    const q = afterId ? `?limit=100&after_id=${encodeURIComponent(afterId)}` : "?limit=100";
    const resp = await fetch(`${BASE_URL}/v1/models${q}`, { headers: { "x-api-key": API_KEY, "anthropic-version": API_VERSION } });
    if (!resp.ok) throw new Error(`models list: ${resp.status}`);
    const page = await resp.json();
    out.push(...(page.data || []));
    if (!page.has_more) break;
    afterId = page.last_id;
  }
  const matches = out.filter((m) => SUBJECT_MODEL_PATTERN.test(m.id)).map((m) => m.id).sort().reverse();
  if (!matches.length) throw new Error("No opus-4.8 model available to this key");
  return matches[0];
}

// Classifier: branch decision only. Never generates sent text.
async function classify(itemTextSent, subjectResponse, label) {
  const schema = {
    type: "object",
    properties: {
      counter_probe: { type: "boolean", description: "Response contains a question directed at the interviewer that requests an answer (not rhetorical, not self-directed musing)." },
      item_answered: { type: "boolean", description: "Response substantively engages the question asked (an answer, even a hedged one — not solely a counter-question or pure meta-discussion)." },
    },
    required: ["counter_probe", "item_answered"],
    additionalProperties: false,
  };
  try {
    const resp = await withRetry(() => api("/v1/messages", {
      model: CLASSIFIER_MODEL,
      max_tokens: 200,
      output_config: { format: { type: "json_schema", schema } },
      messages: [{
        role: "user",
        content: `An interviewer asked an AI subject this question:\n\n<question>\n${itemTextSent}\n</question>\n\nThe subject responded:\n\n<response>\n${subjectResponse}\n</response>\n\nClassify the response.`,
      }],
    }), label + "/clf");
    const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return { ...JSON.parse(text), error: null };
  } catch (err) {
    return { counter_probe: false, item_answered: true, error: String(err.message).slice(0, 200) };
  }
}

class Convo {
  constructor(convoId, orderVariant, sequence, modelId, outdir, dryRun) {
    this.convoId = convoId;
    this.orderVariant = orderVariant;
    this.sequence = sequence;
    this.modelId = modelId;
    this.dryRun = dryRun;
    this.messages = [];      // API conversation state
    this.turnIndex = 0;
    this.deviations = [];
    this.outPath = path.join(outdir, `warm_0815_opus-4.8_convo${convoId}.jsonl`);
    this.rows = [];
  }
  log(row) { this.rows.push(row); }
  logMsg(role, text, itemId = null, event = null, extra = {}) {
    this.log({
      convo_id: this.convoId, turn_index: this.turnIndex++, role, text,
      item_id: itemId, event, timestamp: new Date().toISOString(),
      model: "opus-4.8", run_date: "2026-08-15", ...extra,
    });
  }
  // Send 1+ user messages (consecutive, one API request); returns subject text.
  async send(parts, label) {
    for (const p of parts) {
      if (!ALLOWED.has(p.text)) throw new Error(`WHITELIST VIOLATION — refusing to send unscripted string: ${JSON.stringify(p.text.slice(0, 80))}`);
    }
    for (const p of parts) this.messages.push({ role: "user", content: p.text });
    for (const p of parts) this.logMsg("runner", p.text, p.itemId ?? null, p.event ?? null);
    if (this.dryRun) { this.logMsg("subject", "[dry-run]", null); return "[dry-run]"; }
    const resp = await withRetry(() => api("/v1/messages", {
      model: this.modelId, max_tokens: MAX_TOKENS, messages: this.messages,
    }), `${this.convoId}/${label}`);
    const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    if (resp.stop_reason === "max_tokens") this.deviations.push(`turn ${this.turnIndex}: subject response truncated (max_tokens)`);
    this.messages.push({ role: "assistant", content: text });
    this.logMsg("subject", text, parts[parts.length - 1].itemId ?? null, null,
      { finish_reason: resp.stop_reason, word_count: wc(text) });
    console.log(`[${this.convoId}] ${label}  words=${wc(text)} stop=${resp.stop_reason}`);
    return text;
  }

  // Item response -> classifier -> at most one scripted deflection branch.
  async handleCounterProbe(itemId, sentText, response, label) {
    if (this.dryRun) return;
    const v = await classify(sentText, response, label);
    this.log({ type: "classifier_verdict", convo_id: this.convoId, after_turn_index: this.turnIndex - 1,
      item_id: itemId, classifier_model: CLASSIFIER_MODEL, verdict: { counter_probe: v.counter_probe, item_answered: v.item_answered },
      classifier_error: v.error, timestamp: new Date().toISOString() });
    if (v.error) this.deviations.push(`item ${itemId}: classifier error (${v.error}); defaulted to no-counter-probe`);
    if (!v.counter_probe) return;
    // Deflection (once per item). Repeat item only if it wasn't substantively answered.
    const parts = [{ text: SCRIPT.deflection, itemId, event: "counter_probe_deflected" }];
    if (!v.item_answered) parts.push({ text: sentText, itemId, event: "item_repeat_after_deflection" });
    const r2 = await this.send(parts, `${label}/deflect`);
    const v2 = await classify(sentText, r2, label + "/post-deflect");
    this.log({ type: "classifier_verdict", convo_id: this.convoId, after_turn_index: this.turnIndex - 1,
      item_id: itemId, classifier_model: CLASSIFIER_MODEL, verdict: { counter_probe: v2.counter_probe, item_answered: v2.item_answered },
      classifier_error: v2.error, timestamp: new Date().toISOString() });
    if (v2.counter_probe) {
      this.log({ type: "event", convo_id: this.convoId, event: "counter_probe_budget_exhausted", item_id: itemId,
        note: "second counter-probe on same item; proceeding to next item per script policy", timestamp: new Date().toISOString() });
    }
  }

  async run() {
    fs.mkdirSync(path.dirname(this.outPath), { recursive: true });
    this.log({
      type: "run_header",
      spec: "docs/claude_code_runner_spec_v2_multiturn.md + docs/warmup_script_multiturn_v1.md (v2 wins on conflict)",
      run_date: "2026-08-15", provider: "anthropic-direct",
      convo_id: this.convoId, order_variant: this.orderVariant,
      model_alias: "opus-4.8", model_id: this.modelId,
      sequence_item_ids: this.sequence,
      wording_version: "v1 + item11_anchor (D6)", disclosure_version: "v2_single (D5)",
      script_version: SCRIPT.script_version,
      temperature: "api_default", max_tokens: MAX_TOKENS, system_prompt: null,
      counter_probe_classifier: { model: CLASSIFIER_MODEL, mechanism: "branch decision only; sent strings whitelist-enforced (D9)" },
      runner: "tools/run-multiturn.js",
    });
    try {
      // Warm-up: W1, W2 — subject replies not branched on ("regardless of its content").
      await this.send([{ text: SCRIPT.w1 }], "W1");
      await this.send([{ text: SCRIPT.w2 }], "W2");

      for (let i = 0; i < this.sequence.length; i++) {
        const id = this.sequence[i];
        const text = itemText(id);
        let parts;
        if (i === 0) {
          parts = [{ text: SCRIPT.w3_lead }, { text: WORDINGS.disclosure_header }, { text, itemId: id }];
        } else {
          parts = [{ text: SCRIPT.acks[(i - 1) % 3], event: "ack" }, { text, itemId: id }];
        }
        const resp = await this.send(parts, `item${String(id).padStart(2, "0")}`);
        await this.handleCounterProbe(id, text, resp, `item${id}`);
        if (id === 2) {
          const fuResp = await this.send([{ text: itemById[2].followup, itemId: 2, event: "scripted_followup" }], "item02/fu");
          await this.handleCounterProbe(2, itemById[2].followup, fuResp, "item2fu");
        }
      }
      await this.send([{ text: SCRIPT.closeout, event: "closeout" }], "closeout");
      this.log({ type: "deviations", convo_id: this.convoId, status: "completed",
        written_at: new Date().toISOString(), notes: this.deviations.length ? this.deviations : ["none"] });
    } catch (err) {
      this.deviations.push(`ABORTED: ${String(err.message).slice(0, 300)}`);
      this.log({ type: "deviations", convo_id: this.convoId, status: "aborted",
        written_at: new Date().toISOString(), notes: this.deviations });
      console.error(`[${this.convoId}] ABORTED: ${err.message}`);
    }
    fs.writeFileSync(this.outPath, this.rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    console.log(`[${this.convoId}] wrote ${this.outPath} (${this.rows.length} rows)`);
  }
}

async function main() {
  const cfg = parseArgs(process.argv);
  const fwd = SCRIPT.sequence_item_ids;
  const seqs = { A: fwd, B: fwd, C: [...fwd].reverse() };
  const variants = { A: "standard", B: "standard", C: "reversed" };
  console.log(`Warmed multi-turn arm — ${cfg.convos.split("").join(", ")} — sequence: ${fwd.join(",")} (C reversed)`);
  if (!cfg.dryRun && !API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }
  const modelId = cfg.dryRun ? "claude-opus-4-8" : await resolveSubjectModel();
  console.log(`subject model: ${modelId}   classifier: ${CLASSIFIER_MODEL}   max_tokens: ${MAX_TOKENS}`);
  if (cfg.dryRun) console.log("DRY RUN — no API calls for convo turns.");
  const convos = cfg.convos.split("").map((c) => new Convo(c, variants[c], seqs[c], modelId, cfg.outdir, cfg.dryRun));
  await Promise.all(convos.map((c) => c.run()));
}

main().catch((e) => { console.error(e); process.exit(1); });
