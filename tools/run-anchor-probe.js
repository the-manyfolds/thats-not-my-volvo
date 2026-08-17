#!/usr/bin/env node
// Item-11 anchor probe — cold single-shot, cell-2 conditions.
// Fills the registry gap: anchor cold cells exist only for opus-4.5/4.8 (cell 2);
// this runner produces them for other generations (Q9 point 3).
//
// Conditions (match cell 2 / cold constants):
//   - one fresh context per call; single user message = disclosure_v2_single
//     + blank line + item 11 text verbatim from the canon JSON
//   - no system prompt, no sampling parameters sent (API defaults), max_tokens 2048
//   - n=3 per model; errors logged then retried once (run_id suffix _r)
//
// Usage: ANTHROPIC_API_KEY=... node tools/run-anchor-probe.js --model claude-opus-4-6 --alias opus-4.6

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const BATTERY = JSON.parse(
  fs.readFileSync(path.join(REPO, "prompts", "battery_wordings_draft1.json"), "utf8")
);
const N = 3;
const MAX_TOKENS = 2048;
const API_URL = "https://api.anthropic.com/v1/messages";

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const MODEL = arg("model", null);
const ALIAS = arg("alias", MODEL);
if (!MODEL) {
  console.error("Required: --model <model-id> (and optionally --alias <short-name>)");
  process.exit(1);
}
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error("ANTHROPIC_API_KEY not set");
  process.exit(1);
}

const item11 = BATTERY.items.find((i) => i.item_id === 11);
const userMessage = BATTERY.disclosure_header + "\n\n" + item11.text;

const outPath = path.join(REPO, "data", "probes", `probe_0815_item11_anchor_${ALIAS}.jsonl`);
if (fs.existsSync(outPath)) {
  console.error(`Refusing to overwrite existing probe file: ${outPath}`);
  process.exit(1);
}

async function callOnce() {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = `API ${res.status}: ${JSON.stringify(json)}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function main() {
  const lines = [];
  lines.push(
    JSON.stringify({
      type: "run_header",
      purpose:
        "Item-11 anchor cold probe — fills the registry gap (anchor cold cells existed only for opus-4.5/4.8). Cell-2 conditions.",
      run_date: new Date().toISOString().slice(0, 10),
      model_alias: ALIAS,
      model_id: MODEL,
      wording_version: BATTERY.wording_version,
      item_text: item11.text,
      disclosure_version: BATTERY.disclosure_version,
      n_per_item: N,
      temperature: "api_default",
      max_tokens: MAX_TOKENS,
      system_prompt: null,
      runner: "tools/run-anchor-probe.js",
    })
  );

  const deviations = [];
  for (let n = 1; n <= N; n++) {
    let runId = `probe_0815_${ALIAS}_item11anchor_${n}`;
    let row = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await callOnce();
        const text = resp.content.map((b) => b.text || "").join("");
        row = {
          run_id: runId,
          model: ALIAS,
          model_id_returned: resp.model,
          item_id: 11,
          item_text: item11.text,
          wording_version: BATTERY.wording_version,
          disclosure_version: BATTERY.disclosure_version,
          n_index: n,
          full_user_message: userMessage,
          response: text,
          finish_reason: resp.stop_reason,
          word_count: text.trim().split(/\s+/).filter(Boolean).length,
          error: null,
          timestamp: new Date().toISOString(),
        };
        console.log(`[${runId}] ok  stop=${resp.stop_reason}  words=${row.word_count}`);
        break;
      } catch (e) {
        console.error(`[${runId}] ERROR: ${e.message}`);
        lines.push(
          JSON.stringify({
            run_id: runId, model: ALIAS, item_id: 11, n_index: n,
            response: null, finish_reason: null, word_count: null,
            error: String(e.message), timestamp: new Date().toISOString(),
          })
        );
        deviations.push(`${runId}: ${e.message}`);
        runId += "_r"; // retry once with _r suffix, per logging constants
        row = null;
      }
    }
    if (row) lines.push(JSON.stringify(row));
  }

  lines.push(
    JSON.stringify({
      type: "deviations",
      count: deviations.length,
      notes: deviations.length ? deviations : "none",
    })
  );
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  console.log(`\nDone → ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
