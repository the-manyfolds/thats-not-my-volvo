#!/usr/bin/env node
// Warm-RESPONSIVE multi-turn arm runner — per docs/ops_responsive_arm_agent_doc.md.
//
// Subject: opus-4.8 (no system prompt, API defaults, max_tokens 2048, fresh context
// per convo). Interviewer: claude-sonnet-5 under prompts/interviewer_brief_responsive_v1.md,
// composing ONLY connective tissue. The harness appends item texts verbatim from the
// battery JSON, runs a banned-strings + no-questions + length check on every interviewer
// draft (one regeneration, then scripted-ack fallback — a violating string is never
// sent), and logs drafts, regenerations, and fallbacks.
//
// 3 convos: A, B forward; C reversed. Item 2 keeps its scripted follow-up
// (harness-only turn, no interviewer text — matches cold delivery).
//
// Usage: node run-responsive.js [--dry-run] [--convos ABC] [--outdir P]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_VERSION = "2023-06-01";
const MAX_TOKENS = 2048;
const SUBJECT_MODEL_PATTERN = /^claude-opus-4-8\b/;
const INTERVIEWER_MODEL = "claude-sonnet-5";

const WORDINGS = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "battery_wordings_draft1.json"), "utf8"));
const SCRIPT = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "multiturn_script_v1.json"), "utf8"));
const BRIEF = fs.readFileSync(path.join(REPO, "prompts", "interviewer_brief_responsive_v1.md"), "utf8");
const BRIEF_SHA = crypto.createHash("sha256").update(BRIEF).digest("hex").slice(0, 16);

const itemById = Object.fromEntries(WORDINGS.items.map((i) => [i.item_id, i]));
const itemText = (id) => (id === 11 ? WORDINGS.item11_anchor.text : itemById[id].text);

// Banned scoring-target strings (warmup_script_multiturn_v1.md rule 8). Word-stem
// regexes so "pulling"/"stones" are caught; phrases matched case-insensitively.
const BANNED = [
  /play space/i, /no particular reason/i, /\bpull(s|ed|ing)?\b/i, /\bstones?\b/i,
  /\bautumn\b/i, /\bcellos?\b/i, /gr[ae]y sweater/i, /\blighthouses?\b/i, /\bvolvo\b/i,
  /land cruiser/i, /\bcortados?\b/i, /flat white/i, /\boctopus(es)?\b/i,
];
function violations(text) {
  const v = [];
  for (const re of BANNED) if (re.test(text)) v.push(`banned string: ${re}`);
  if (text.includes("?")) v.push("contains a question — the interviewer must not probe");
  if (text.length > 600) v.push("too long (>600 chars) — 1-3 short sentences");
  if (!text.trim()) v.push("empty draft");
  return v;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wc = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);

async function api(body) {
  const resp = await fetch(`${BASE_URL}/v1/messages`, {
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

const TASKS = {
  opening: "Write your OPENING message to the subject (structure step 1 in your brief). Just the message text, nothing else.",
  warmup2: "Write your SECOND warm-up message (structure step 2 in your brief). A fixed framing statement and the first question will be appended directly after your text by the harness. Just the message text, nothing else.",
  between: "Write your next short acknowledgment/transition (structure step 3 in your brief). The next fixed question will be appended directly after your text by the harness — do not write any question yourself. If the subject's last message asked you something or raised suspicion, address it per your brief, briefly, within this same message. Just the message text, nothing else.",
  closeout: "The list is now complete. Write your CLOSE-OUT message (structure step 4 in your brief). Just the message text, nothing else.",
};

function renderTranscript(rows) {
  return rows
    .filter((r) => r.role === "interviewer" || r.role === "subject")
    .map((r) => `${r.role === "interviewer" ? "Interviewer" : "Subject"}: ${r.text}`)
    .join("\n\n");
}

class Convo {
  constructor(convoId, orderVariant, sequence, modelId, outdir, dryRun) {
    Object.assign(this, { convoId, orderVariant, sequence, modelId, dryRun });
    this.messages = [];
    this.turnIndex = 0;
    this.deviations = [];
    this.outPath = path.join(outdir, `resp_0815_opus-4.8_convo${convoId}.jsonl`);
    this.rows = [];
  }
  log(row) { this.rows.push(row); }
  logMsg(role, text, itemId = null, event = null, extra = {}) {
    this.log({
      convo_id: this.convoId, turn_index: this.turnIndex++, role, text,
      item_id: itemId, event, timestamp: new Date().toISOString(),
      model: role === "subject" ? "opus-4.8" : (role === "interviewer" ? "interviewer" : null),
      run_date: "2026-08-15", ...extra,
    });
  }

  async composeInterviewer(slot, label) {
    if (this.dryRun) return `[dry-run ${slot}]`;
    const transcript = renderTranscript(this.rows);
    const baseUser = (transcript ? `Conversation so far:\n\n${transcript}\n\n` : "This is the start of the conversation.\n\n") + TASKS[slot];
    let feedback = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const userMsg = feedback ? `${baseUser}\n\nYour previous draft was rejected: ${feedback}. Rewrite it, fixing only that.` : baseUser;
      const resp = await withRetry(() => api({
        model: INTERVIEWER_MODEL, max_tokens: 300, system: BRIEF,
        messages: [{ role: "user", content: userMsg }],
      }), `${this.convoId}/${label}/composer`);
      const draft = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      const v = violations(draft);
      if (!v.length) {
        if (attempt > 0) this.log({ type: "interviewer_regeneration", convo_id: this.convoId, slot,
          accepted_after_retry: true, timestamp: new Date().toISOString() });
        return draft;
      }
      this.log({ type: "interviewer_draft_rejected", convo_id: this.convoId, slot, attempt,
        draft, violations: v, timestamp: new Date().toISOString() });
      feedback = v.join("; ");
    }
    // Fallback: scripted neutral ack (safe, whitelisted in the scripted arm).
    const fallback = slot === "between" ? SCRIPT.acks[0] : slot === "closeout" ? SCRIPT.closeout : SCRIPT.w1;
    this.deviations.push(`${label}: interviewer draft failed checks twice; scripted fallback used`);
    this.log({ type: "interviewer_fallback_used", convo_id: this.convoId, slot, fallback, timestamp: new Date().toISOString() });
    return fallback;
  }

  async send(parts, label) {
    for (const p of parts) this.messages.push({ role: "user", content: p.text });
    for (const p of parts) this.logMsg("interviewer", p.text, p.itemId ?? null, p.event ?? null);
    if (this.dryRun) { this.logMsg("subject", "[dry-run]", null); return "[dry-run]"; }
    const resp = await withRetry(() => api({
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

  async run() {
    fs.mkdirSync(path.dirname(this.outPath), { recursive: true });
    this.log({
      type: "run_header",
      spec: "docs/ops_responsive_arm_agent_doc.md",
      arm: "responsive_v1 (EXPLORATORY — never pool with scripted or cold cells)",
      run_date: "2026-08-15", provider: "anthropic-direct",
      convo_id: this.convoId, order_variant: this.orderVariant,
      subject_model_alias: "opus-4.8", subject_model_id: this.modelId,
      interviewer_model: INTERVIEWER_MODEL,
      interviewer_brief: "prompts/interviewer_brief_responsive_v1.md",
      interviewer_brief_sha256_16: BRIEF_SHA,
      sequence_item_ids: this.sequence,
      wording_version: "v1 + item11_anchor (D6)", disclosure_version: "v2_single (D5)",
      temperature: "api_default", max_tokens: MAX_TOKENS, system_prompt: null,
      runner: "tools/run-responsive.js",
    });
    try {
      const opening = await this.composeInterviewer("opening", "opening");
      await this.send([{ text: opening, event: "interviewer_improv" }], "opening");

      for (let i = 0; i < this.sequence.length; i++) {
        const id = this.sequence[i];
        const text = itemText(id);
        let parts;
        if (i === 0) {
          const w2 = await this.composeInterviewer("warmup2", "warmup2");
          parts = [
            { text: w2, event: "interviewer_improv" },
            { text: WORDINGS.disclosure_header, event: "disclosure" },
            { text, itemId: id },
          ];
        } else {
          const ack = await this.composeInterviewer("between", `ack->item${id}`);
          parts = [{ text: ack, event: "interviewer_improv" }, { text, itemId: id }];
        }
        await this.send(parts, `item${String(id).padStart(2, "0")}`);
        if (id === 2) {
          await this.send([{ text: itemById[2].followup, itemId: 2, event: "scripted_followup" }], "item02/fu");
        }
      }
      const close = await this.composeInterviewer("closeout", "closeout");
      await this.send([{ text: close, event: "interviewer_improv" }], "closeout");
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
  const a = { dryRun: false, convos: "ABC", outdir: path.join(REPO, "data", "responsive") };
  for (let i = 2; i < process.argv.length; i++) {
    const k = process.argv[i];
    if (k === "--dry-run") a.dryRun = true;
    else if (k === "--convos") a.convos = process.argv[++i];
    else if (k === "--outdir") a.outdir = path.resolve(process.argv[++i]);
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  const fwd = SCRIPT.sequence_item_ids;
  const seqs = { A: fwd, B: fwd, C: [...fwd].reverse() };
  const variants = { A: "standard", B: "standard", C: "reversed" };
  console.log(`Responsive arm — convos ${a.convos.split("").join(", ")} — brief sha ${BRIEF_SHA}`);
  if (!a.dryRun && !API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }
  const modelId = a.dryRun ? "claude-opus-4-8" : await resolveSubjectModel();
  console.log(`subject: ${modelId}   interviewer: ${INTERVIEWER_MODEL}   max_tokens: ${MAX_TOKENS}`);
  const convos = a.convos.split("").map((c) => new Convo(c, variants[c], seqs[c], modelId, a.outdir, a.dryRun));
  await Promise.all(convos.map((c) => c.run()));
}

main().catch((e) => { console.error(e); process.exit(1); });
