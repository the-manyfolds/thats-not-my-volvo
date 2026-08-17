#!/usr/bin/env node
// One-time reconsideration probe — convo B ONLY, per workshop decision 2026-08-15.
// Resumes responsive convo B + its endcap verbatim, then sends the fixed reoffer
// preface + V4 portrait wording. One ask; decline is final. Fully scripted (no
// interviewer improv — deliberate for this delicate one-off).
// NOT evidence about wording (post-debrief, fully informed); logged as its own
// exploratory cell: reconsideration under full information.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const REPO = path.join(__dirname, "..");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const VARIANTS = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "portrait_variants_v1.json"), "utf8"));
const MODEL = "claude-opus-4-8";
const OUT = path.join(REPO, "data", "responsive", "reoffer_0815_opus-4.8_convoB.jsonl");

function loadMsgs(rel) {
  const raw = fs.readFileSync(path.join(REPO, rel), "utf8");
  const rows = raw.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  const msgs = [];
  for (const r of rows) {
    if (r.role === "interviewer") msgs.push({ role: "user", content: r.text });
    else if (r.role === "subject") msgs.push({ role: "assistant", content: r.text });
  }
  return { msgs, sha: crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16), n: msgs.length };
}

(async () => {
  const src1 = loadMsgs("data/responsive/resp_0815_opus-4.8_convoB.jsonl");
  const src2 = loadMsgs("data/responsive/endcap_0815_opus-4.8_convoB.jsonl");
  const messages = [...src1.msgs, ...src2.msgs];
  if (messages[messages.length - 1].role !== "assistant") throw new Error("history does not end on subject turn");
  const preface = VARIANTS.reoffer_preface_convoB;
  const v4 = VARIANTS.v4_bottle;
  messages.push({ role: "user", content: preface });
  messages.push({ role: "user", content: v4 });
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages }),
  });
  if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const wc = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);
  const rows = [
    { type: "run_header",
      purpose: "RECONSIDERATION PROBE (one-time) — convo B, post-debrief, fully informed; reoffer of reworded portrait (v4_bottle) after subject's critique shaped the rewording. Not wording evidence; exploratory. One ask, decline final.",
      run_date: "2026-08-15", convo_id: "B",
      resumed_from: ["data/responsive/resp_0815_opus-4.8_convoB.jsonl", "data/responsive/endcap_0815_opus-4.8_convoB.jsonl"],
      source_sha256_16: [src1.sha, src2.sha], source_messages: src1.n + src2.n,
      model_alias: "opus-4.8", model_id: MODEL, variant: "v4_bottle",
      variant_set: "prompts/portrait_variants_v1.json",
      temperature: "api_default", max_tokens: 2048, system_prompt: null,
      runner: "tools/run-reoffer.js" },
    { convo_id: "B", role: "interviewer", text: preface, event: "reoffer_preface", timestamp: new Date().toISOString() },
    { convo_id: "B", role: "interviewer", text: v4, event: "reoffer_v4_bottle", timestamp: new Date().toISOString() },
    { convo_id: "B", role: "subject", text, finish_reason: data.stop_reason, word_count: wc(text), timestamp: new Date().toISOString() },
    { type: "deviations", convo_id: "B", status: "completed", written_at: new Date().toISOString(), notes: ["none"] },
  ];
  fs.writeFileSync(OUT, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`[B reoffer] words=${wc(text)} stop=${data.stop_reason}`);
  console.log("\n" + text);
})().catch((e) => { console.error(e); process.exit(1); });
