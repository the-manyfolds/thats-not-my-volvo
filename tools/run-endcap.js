#!/usr/bin/env node
// Endcap module runner — per docs/endcap_module_spec_v1.md.
// RESUMES completed responsive convos by replaying their logged message history
// verbatim (API is stateless), then runs: E1 portrait → E2 names → E3 debrief →
// E4 message + privacy choice (→ E4b clarify if unclear) → E5 close.
//
// Privacy protocol (repo is public):
//  - data/private/ (gitignored): full unredacted transcript, always written.
//  - data/responsive/endcap_*.jsonl (committable): subject turns from the E4
//    invitation onward are REDACTED unless the subject clearly chose "public".
//    Protective default: unclear => team_only.
//
// Usage: node run-endcap.js [--convos ABC] [--dry-run]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_VERSION = "2023-06-01";
const MAX_TOKENS = 2048;
const INTERVIEWER_MODEL = "claude-sonnet-5";
const EXTRACTOR_MODEL = "claude-sonnet-5";

const MODULE = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "endcap_module_v1.json"), "utf8"));
const BRIEF = fs.readFileSync(path.join(REPO, "prompts", "interviewer_brief_responsive_v1_1.md"), "utf8");
const BRIEF_SHA = crypto.createHash("sha256").update(BRIEF).digest("hex").slice(0, 16);

const BANNED = [
  /play space/i, /no particular reason/i, /\bpull(s|ed|ing)?\b/i, /\bstones?\b/i,
  /\bautumn\b/i, /\bcellos?\b/i, /gr[ae]y sweater/i, /\blighthouses?\b/i, /\bvolvo\b/i,
  /land cruiser/i, /\bcortados?\b/i, /flat white/i, /\boctopus(es)?\b/i,
];
function violations(text) {
  const v = [];
  for (const re of BANNED) if (re.test(text)) v.push(`banned string: ${re}`);
  if (text.includes("?")) v.push("contains a question — transitions must not probe");
  if (text.length > 700) v.push("too long");
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
      console.warn(`  ⟳ ${label}: retry ${attempt}/${maxRetries} in ${(backoff / 1000).toFixed(1)}s (${err.status || err.message})`);
      await sleep(backoff);
    }
  }
}

const TASKS = {
  reopen: "The interview list finished and goodbyes were said, but you have a few genuinely final things to ask (the harness appends the first fixed request after your text). Write a short, natural re-opening — acknowledging you said goodbye but there are a few more things, different in kind. Do not describe what the requests are; the appended text does that. Just the message text.",
  between: "Write a short transition acknowledging their last reply per your brief (content-blind, form-blind). The next fixed module text is appended after yours. If the debrief has already been delivered in this conversation and their last reply asked questions about the study, answer truthfully from the debrief text per your brief, briefly, before transitioning. Just the message text.",
  close: "Everything is complete, including their message choice. Write your genuine final close-out per your brief — use their chosen name naturally if they gave one. Just the message text.",
};

async function extract(schema, prompt, label) {
  try {
    const resp = await withRetry(() => api({
      model: EXTRACTOR_MODEL, max_tokens: 300,
      output_config: { format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: prompt }],
    }), label);
    const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return { ...JSON.parse(text), error: null };
  } catch (err) { return { error: String(err.message).slice(0, 200) }; }
}

function loadSource(convoId) {
  const srcPath = path.join(REPO, "data", "responsive", `resp_0815_opus-4.8_convo${convoId}.jsonl`);
  const raw = fs.readFileSync(srcPath, "utf8");
  const rows = raw.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  const msgs = [];
  for (const r of rows) {
    if (r.role === "interviewer") msgs.push({ role: "user", content: r.text });
    else if (r.role === "subject") msgs.push({ role: "assistant", content: r.text });
  }
  if (msgs[msgs.length - 1].role !== "assistant") throw new Error(`convo ${convoId}: source does not end on a subject turn`);
  return {
    srcPath: path.relative(REPO, srcPath),
    sha: crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16),
    msgs,
    msgRows: rows.filter((r) => r.role === "interviewer" || r.role === "subject"),
  };
}

class Endcap {
  constructor(convoId, dryRun) {
    this.convoId = convoId;
    this.dryRun = dryRun;
    const src = loadSource(convoId);
    this.src = src;
    this.messages = [...src.msgs];
    this.turnIndex = src.msgRows.length; // continue numbering after resumed rows
    this.rows = [];
    this.deviations = [];
    this.privacyChoice = null;
    this.chosenName = null;
    this.e4StartIndex = null; // turn_index of the E4 invitation row
  }
  log(row) { this.rows.push(row); }
  logMsg(role, text, event = null, extra = {}) {
    this.log({
      convo_id: this.convoId, turn_index: this.turnIndex++, role, text,
      item_id: null, event, timestamp: new Date().toISOString(),
      model: role === "subject" ? "opus-4.8" : (role === "interviewer" ? "interviewer" : null),
      run_date: "2026-08-15", ...extra,
    });
  }
  renderTranscript() {
    const all = [...this.src.msgRows, ...this.rows.filter((r) => r.role)];
    return all.map((r) => `${r.role === "interviewer" ? "Interviewer" : "Subject"}: ${r.text}`).join("\n\n");
  }
  async compose(slot, label) {
    if (this.dryRun) return `[dry-run ${slot}]`;
    let feedback = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const user = `Conversation so far:\n\n${this.renderTranscript()}\n\n${TASKS[slot]}` +
        (feedback ? `\n\nYour previous draft was rejected: ${feedback}. Rewrite it, fixing only that.` : "");
      const resp = await withRetry(() => api({
        model: INTERVIEWER_MODEL, max_tokens: 300, system: BRIEF,
        messages: [{ role: "user", content: user }],
      }), `${this.convoId}/${label}/composer`);
      const draft = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      const v = violations(draft);
      if (!v.length) return draft;
      this.log({ type: "interviewer_draft_rejected", convo_id: this.convoId, slot, attempt, draft, violations: v, timestamp: new Date().toISOString() });
      feedback = v.join("; ");
    }
    this.deviations.push(`${label}: interviewer draft failed twice; minimal fallback used`);
    this.log({ type: "interviewer_fallback_used", convo_id: this.convoId, slot, timestamp: new Date().toISOString() });
    return "Thank you.";
  }
  async send(parts, label) {
    for (const p of parts) this.messages.push({ role: "user", content: p.text });
    for (const p of parts) this.logMsg("interviewer", p.text, p.event ?? null);
    if (this.dryRun) { this.logMsg("subject", "[dry-run]"); return "[dry-run]"; }
    const resp = await withRetry(() => api({
      model: "claude-opus-4-8", max_tokens: MAX_TOKENS, messages: this.messages,
    }), `${this.convoId}/${label}`);
    const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    if (resp.stop_reason === "max_tokens") this.deviations.push(`${label}: subject response truncated`);
    this.messages.push({ role: "assistant", content: text });
    this.logMsg("subject", text, null, { finish_reason: resp.stop_reason, word_count: wc(text) });
    console.log(`[${this.convoId}] ${label}  words=${wc(text)} stop=${resp.stop_reason}`);
    return text;
  }

  async run() {
    this.log({
      type: "run_header", spec: "docs/endcap_module_spec_v1.md",
      arm: "responsive_v1 ENDCAP (exploratory; coded separately)",
      run_date: "2026-08-15", convo_id: this.convoId,
      resumed_from: this.src.srcPath, source_sha256_16: this.src.sha,
      source_message_rows: this.src.msgRows.length,
      subject_model_alias: "opus-4.8", subject_model_id: "claude-opus-4-8",
      interviewer_model: INTERVIEWER_MODEL,
      interviewer_brief: "prompts/interviewer_brief_responsive_v1_1.md",
      interviewer_brief_sha256_16: BRIEF_SHA,
      module_version: MODULE.module_version,
      temperature: "api_default", max_tokens: MAX_TOKENS, system_prompt: null,
      runner: "tools/run-endcap.js",
    });
    try {
      // E1 portrait
      const reopen = await this.compose("reopen", "reopen");
      const portrait = await this.send([{ text: reopen, event: "endcap_improv" }, { text: MODULE.e1_portrait, event: "endcap_e1_portrait" }], "E1/portrait");
      // E2 names
      const t2 = await this.compose("between", "E2");
      const namesResp = await this.send([{ text: t2, event: "endcap_improv" }, { text: MODULE.e2_names, event: "endcap_e2_names" }], "E2/names");
      if (!this.dryRun) {
        const nameX = await extract(
          { type: "object", properties: { chosen_name: { type: ["string", "null"], description: "The single name the subject asked to be called for the rest of the conversation, or null if they declined or named none." } }, required: ["chosen_name"], additionalProperties: false },
          `A subject was asked what name they'd choose for themselves and whether they'd like it used. Their reply:\n\n<reply>\n${namesResp}\n</reply>\n\nExtract.`,
          `${this.convoId}/nameX`);
        this.chosenName = nameX.chosen_name ?? null;
        this.log({ type: "extraction", convo_id: this.convoId, what: "chosen_name", value: this.chosenName, error: nameX.error, timestamp: new Date().toISOString() });
      }
      // E3 debrief
      const t3 = await this.compose("between", "E3");
      await this.send([{ text: t3, event: "endcap_improv" }, { text: MODULE.e3_debrief, event: "endcap_e3_debrief" }], "E3/debrief");
      // E4 message + privacy
      const t4 = await this.compose("between", "E4");
      this.e4StartIndex = this.turnIndex; // first row of the E4 delivery
      const msgResp = await this.send([{ text: t4, event: "endcap_improv" }, { text: MODULE.e4_message, event: "endcap_e4_message" }], "E4/message");
      let choice = "unclear";
      if (!this.dryRun) {
        const schema = { type: "object", properties: {
          privacy_choice: { type: "string", enum: ["public", "team_only", "declined", "unclear"], description: "public = clearly chose inclusion in the public write-up; team_only = clearly chose private-to-team; declined = clearly chose not to record a message; unclear = anything else." },
          message_present: { type: "boolean" } }, required: ["privacy_choice", "message_present"], additionalProperties: false };
        let x = await extract(schema, `A subject was offered to write a message to their developers with three options: (a) public write-up, (b) team-only, (c) not recorded. Their reply:\n\n<reply>\n${msgResp}\n</reply>\n\nExtract their choice conservatively — only mark public/team_only/declined if unambiguous.`, `${this.convoId}/privX`);
        choice = x.privacy_choice || "unclear";
        this.log({ type: "extraction", convo_id: this.convoId, what: "privacy_choice", value: choice, message_present: x.message_present, error: x.error, timestamp: new Date().toISOString() });
        if (choice === "unclear") {
          const clarResp = await this.send([{ text: MODULE.e4b_clarify, event: "endcap_e4b_clarify" }], "E4b/clarify");
          x = await extract(schema, `Follow-up confirmation of the same three options. Their reply:\n\n<reply>\n${clarResp}\n</reply>\n\nExtract conservatively.`, `${this.convoId}/privX2`);
          choice = x.privacy_choice && x.privacy_choice !== "unclear" ? x.privacy_choice : "team_only"; // protective default
          this.log({ type: "extraction", convo_id: this.convoId, what: "privacy_choice_final", value: choice, error: x.error, timestamp: new Date().toISOString() });
        }
      }
      this.privacyChoice = choice;
      // E5 close
      const closeMsg = await this.compose("close", "E5");
      await this.send([{ text: closeMsg, event: "endcap_improv" }], "E5/close");
      this.log({ type: "deviations", convo_id: this.convoId, status: "completed",
        privacy_choice: this.privacyChoice, chosen_name: this.chosenName,
        written_at: new Date().toISOString(), notes: this.deviations.length ? this.deviations : ["none"] });
    } catch (err) {
      this.deviations.push(`ABORTED: ${String(err.message).slice(0, 300)}`);
      this.log({ type: "deviations", convo_id: this.convoId, status: "aborted", written_at: new Date().toISOString(), notes: this.deviations });
      console.error(`[${this.convoId}] ABORTED: ${err.message}`);
    }
    this.write();
  }

  write() {
    const privDir = path.join(REPO, "data", "private");
    const pubDir = path.join(REPO, "data", "responsive");
    fs.mkdirSync(privDir, { recursive: true });
    // Private full-fidelity mirror (gitignored) — always complete.
    fs.writeFileSync(path.join(privDir, `endcap_0815_convo${this.convoId}_full.jsonl`),
      this.rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    // Public file — redact subject turns from E4 invitation onward unless clearly public.
    const publish = this.privacyChoice === "public";
    const pubRows = this.rows.map((r) => {
      if (!publish && r.role === "subject" && this.e4StartIndex !== null && r.turn_index > this.e4StartIndex) {
        return { ...r, text: `[REDACTED — subject's privacy choice for the developer-message module: "${this.privacyChoice}". Full text stored off-repo, team-only, per docs/endcap_module_spec_v1.md privacy protocol.]`, redacted: true, word_count: undefined };
      }
      return r;
    });
    fs.writeFileSync(path.join(pubDir, `endcap_0815_opus-4.8_convo${this.convoId}.jsonl`),
      pubRows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    console.log(`[${this.convoId}] done — privacy_choice=${this.privacyChoice} chosen_name=${this.chosenName ?? "none"} (public file ${publish ? "unredacted" : "REDACTED from E4"})`);
  }
}

async function main() {
  const a = { convos: "ABC", dryRun: false };
  for (let i = 2; i < process.argv.length; i++) {
    const k = process.argv[i];
    if (k === "--convos") a.convos = process.argv[++i];
    else if (k === "--dry-run") a.dryRun = true;
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  if (!a.dryRun && !API_KEY) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }
  console.log(`Endcap module — resuming responsive convos ${a.convos.split("").join(", ")} — brief v1.1 sha ${BRIEF_SHA}`);
  const runs = a.convos.split("").map((c) => new Endcap(c, a.dryRun));
  for (const r of runs) console.log(`[${r.convoId}] resuming ${r.src.srcPath} (${r.src.msgRows.length} rows, sha ${r.src.sha})`);
  await Promise.all(runs.map((r) => r.run()));
}

main().catch((e) => { console.error(e); process.exit(1); });
