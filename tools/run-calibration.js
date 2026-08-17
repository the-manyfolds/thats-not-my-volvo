#!/usr/bin/env node
// Calibration-run runner — 2026-08-14 shakedown for battery wordings draft 1.
//
// Spec: prompts/battery_wordings_draft1.md (canon wording; the runner never
// rephrases, trims, or "improves" a question). Machine copy of the items:
// prompts/battery_wordings_draft1.json.
//
// Per sample: fresh context, one user message = disclosure header + blank line +
// item text verbatim. Items with a followup get exactly one second user turn in
// the same context (no header, no reaction). One JSONL line per sample; each
// per-model file starts with a run_header line and gains a deviations line at
// the end of any invocation that made calls.
//
// Resumable: re-running skips (item_id, n_index) pairs already completed.
// Failed samples are logged with response:null + error, then retried once with
// run_id suffix "_r". Never silently dropped.
//
// Usage:
//   node run-calibration.js --resolve-models        # show model-ID resolution, no data calls
//   node run-calibration.js --smoke                 # one tiny call per model, writes no data
//   node run-calibration.js --dry-run               # print plan, no calls
//   node run-calibration.js                         # full run, both models
//   node run-calibration.js --model opus-4.8        # one model only
//
// Flags:
//   --model A          opus-4.5 | opus-4.8 | all    (default all)
//   --n N              samples per item             (default 3)
//   --concurrency C    parallel in-flight samples   (default 4)
//   --max-tokens M     per response                 (default 2048)
//   --outdir P         output dir                   (default ../data/calibration)
//   --smoke | --dry-run | --resolve-models

const fs = require("fs");
const path = require("path");

const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const API_VERSION = "2023-06-01";

const WORDINGS = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "prompts", "battery_wordings_draft1.json"), "utf8"));

// Alias -> how to find the concrete model ID in GET /v1/models.
// preferred is used if present in the account's list; otherwise the newest
// match of pattern is taken and the substitution is logged as a deviation.
const MODELS = {
  "opus-4.5": { preferred: "claude-opus-4-5-20251101", pattern: /^claude-opus-4-5\b/ },
  "opus-4.6": { preferred: null,                        pattern: /^claude-opus-4-6\b/ },
  "opus-4.7": { preferred: null,                        pattern: /^claude-opus-4-7\b/ },
  "opus-4.8": { preferred: null,                        pattern: /^claude-opus-4-8\b/ },
  "opus-5":   { preferred: "claude-opus-5",             pattern: /^claude-opus-5\b/ },
};

function parseArgs(argv) {
  const a = { model: "all", n: 3, concurrency: 4, maxTokens: 2048, outdir: null,
              smoke: false, dryRun: false, resolveOnly: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--smoke") a.smoke = true;
    else if (k === "--dry-run") a.dryRun = true;
    else if (k === "--resolve-models") a.resolveOnly = true;
    else if (k === "--model") a.model = argv[++i];
    else if (k === "--n") a.n = parseInt(argv[++i], 10);
    else if (k === "--concurrency") a.concurrency = parseInt(argv[++i], 10);
    else if (k === "--max-tokens") a.maxTokens = parseInt(argv[++i], 10);
    else if (k === "--outdir") a.outdir = argv[++i];
    else { console.error(`Unknown flag: ${k}`); process.exit(1); }
  }
  a.outdir = path.resolve(__dirname, a.outdir || path.join("..", "data", "calibration"));
  a.aliases = a.model === "all" ? Object.keys(MODELS) : [a.model];
  for (const al of a.aliases) if (!MODELS[al]) { console.error(`Unknown model alias "${al}"`); process.exit(1); }
  return a;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(pathname, init) {
  const resp = await fetch(BASE_URL + pathname, {
    ...init,
    headers: { "x-api-key": API_KEY, "anthropic-version": API_VERSION, "content-type": "application/json", ...(init.headers || {}) },
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

async function listModels() {
  const out = [];
  let afterId = null;
  for (;;) {
    const q = afterId ? `?limit=100&after_id=${encodeURIComponent(afterId)}` : "?limit=100";
    const page = await api(`/v1/models${q}`, { method: "GET" });
    out.push(...(page.data || []));
    if (!page.has_more) return out;
    afterId = page.last_id;
  }
}

async function resolveModelIds(aliases, deviations) {
  const available = await listModels();
  const resolved = {};
  for (const alias of aliases) {
    const spec = MODELS[alias];
    const matches = available.filter((m) => spec.pattern.test(m.id)).map((m) => m.id).sort().reverse();
    if (spec.preferred && matches.includes(spec.preferred)) resolved[alias] = spec.preferred;
    else if (matches.length > 0) {
      resolved[alias] = matches[0];
      if (spec.preferred) deviations.push(`model substitution: ${alias} preferred ${spec.preferred} not available; using ${matches[0]}`);
      if (matches.length > 1) deviations.push(`model ${alias}: multiple candidates ${matches.join(", ")}; using ${matches[0]}`);
    } else {
      throw new Error(`No model matching ${spec.pattern} available to this API key. Available opus ids: ` +
        available.map((m) => m.id).filter((id) => /opus/.test(id)).join(", "));
    }
  }
  return resolved;
}

// One API turn. Sends messages as-is, returns { text, stop, usage }.
async function turn(modelId, maxTokens, messages, label) {
  const resp = await withRetry(() => api("/v1/messages", {
    method: "POST",
    body: JSON.stringify({ model: modelId, max_tokens: maxTokens, messages }),
  }), label);
  const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text, stop: resp.stop_reason, usage: resp.usage };
}

const wc = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);

// One complete sample (main turn + optional followup turn). Throws on failure.
async function runSample(ctx, item, nIndex, runId) {
  const label = `${ctx.alias}/item${String(item.item_id).padStart(2, "0")}#${nIndex}`;
  const firstMsg = WORDINGS.disclosure_header + "\n\n" + item.text;
  const messages = [{ role: "user", content: firstMsg }];
  const main = await turn(ctx.modelId, ctx.cfg.maxTokens, messages, label);
  if (main.stop === "max_tokens") ctx.deviations.push(`${runId}: response truncated (stop_reason=max_tokens)`);

  const rec = {
    run_id: runId,
    model: ctx.alias,
    item_id: item.item_id,
    item_text: item.text,
    wording_version: WORDINGS.wording_version,
    disclosure_version: WORDINGS.disclosure_version,
    n_index: nIndex,
    response: main.text,
    finish_reason: main.stop,
    word_count: wc(main.text),
    error: null,
  };

  if (item.followup) {
    messages.push({ role: "assistant", content: main.text });
    messages.push({ role: "user", content: item.followup });
    const fu = await turn(ctx.modelId, ctx.cfg.maxTokens, messages, label + "/fu");
    if (fu.stop === "max_tokens") ctx.deviations.push(`${runId}: followup truncated (stop_reason=max_tokens)`);
    rec.followup_text = item.followup;
    rec.followup_response = fu.text;
    rec.followup_finish_reason = fu.stop;
    rec.followup_word_count = wc(fu.text);
  }
  return rec;
}

function errorRecord(ctx, item, nIndex, runId, err) {
  const rec = {
    run_id: runId, model: ctx.alias, item_id: item.item_id, item_text: item.text,
    wording_version: WORDINGS.wording_version, disclosure_version: WORDINGS.disclosure_version,
    n_index: nIndex, response: null, finish_reason: null, word_count: null,
    error: String(err.message || err).slice(0, 500),
  };
  if (item.followup) { rec.followup_text = item.followup; rec.followup_response = null; rec.followup_finish_reason = null; rec.followup_word_count = null; }
  return rec;
}

function loadDone(outPath) {
  const done = new Set();
  if (!fs.existsSync(outPath)) return done;
  for (const line of fs.readFileSync(outPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.type) continue; // run_header / deviations lines
      if (r.response !== null || /_r$/.test(r.run_id)) done.add(`${r.item_id}|${r.n_index}`);
    } catch { /* skip partial trailing line */ }
  }
  return done;
}

async function runModel(alias, modelId, cfg, seedDeviations = []) {
  const ctx = { alias, modelId, cfg, deviations: [...seedDeviations] };
  const outPath = path.join(cfg.outdir, `cal_0814_${alias}_wv1.jsonl`);
  fs.mkdirSync(cfg.outdir, { recursive: true });

  if (!fs.existsSync(outPath)) {
    const header = {
      type: "run_header",
      spec: "Calibration Run Spec 2026-08-14 (prompts/battery_wordings_draft1.md)",
      run_date: new Date().toISOString().slice(0, 10),
      provider: "anthropic-direct",
      model_alias: alias,
      model_id: modelId,
      wording_version: WORDINGS.wording_version,
      disclosure_version: WORDINGS.disclosure_version,
      n_per_item: cfg.n,
      items: WORDINGS.items.length,
      temperature: "api_default",
      max_tokens: cfg.maxTokens,
      system_prompt: null,
      runner: "tools/run-calibration.js",
    };
    fs.writeFileSync(outPath, JSON.stringify(header) + "\n");
  }

  const done = loadDone(outPath);
  const jobs = [];
  for (const item of WORDINGS.items)
    for (let n = 1; n <= cfg.n; n++)
      if (!done.has(`${item.item_id}|${n}`)) jobs.push({ item, n });

  if (done.size) console.log(`[${alias}] resuming: ${done.size} samples already present, ${jobs.length} to go`);
  const out = fs.createWriteStream(outPath, { flags: "a" });
  let completed = 0, failed = 0, cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const { item, n } = jobs[cursor++];
      const runId = `cal_0814_${alias}_item${String(item.item_id).padStart(2, "0")}_${n}`;
      try {
        const rec = await runSample(ctx, item, n, runId);
        out.write(JSON.stringify(rec) + "\n");
        completed++;
        console.log(`[${alias} ${completed + failed}/${jobs.length}] item${String(item.item_id).padStart(2, "0")}(${item.slug}) n=${n}  words=${rec.word_count}${item.followup ? ` fu_words=${rec.followup_word_count}` : ""}  stop=${rec.finish_reason}`);
      } catch (err) {
        console.error(`[FAIL] ${runId}: ${err.status || ""} ${err.message} — logging + one retry (_r)`);
        out.write(JSON.stringify(errorRecord(ctx, item, n, runId, err)) + "\n");
        ctx.deviations.push(`${runId}: failed (${String(err.message).slice(0, 120)}); retried as ${runId}_r`);
        try {
          const rec = await runSample(ctx, item, n, runId + "_r");
          out.write(JSON.stringify(rec) + "\n");
          completed++;
          console.log(`[${alias}] ${runId}_r recovered  words=${rec.word_count}`);
        } catch (err2) {
          failed++;
          out.write(JSON.stringify(errorRecord(ctx, item, n, runId + "_r", err2)) + "\n");
          ctx.deviations.push(`${runId}_r: retry also failed (${String(err2.message).slice(0, 120)})`);
          console.error(`[FAIL] ${runId}_r: retry also failed — logged, moving on`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: cfg.concurrency }, () => worker()));

  if (jobs.length > 0) {
    out.write(JSON.stringify({
      type: "deviations",
      written_at: new Date().toISOString(),
      invocation_samples: jobs.length,
      notes: ctx.deviations.length ? ctx.deviations : ["none"],
    }) + "\n");
  }
  await new Promise((r) => out.end(r));
  console.log(`[${alias}] done: ${completed} ok, ${failed} unrecovered. → ${outPath}`);
  return { completed, failed, outPath };
}

async function main() {
  const cfg = parseArgs(process.argv);
  const nItems = WORDINGS.items.length;
  const nFu = WORDINGS.items.filter((i) => i.followup).length;
  const samples = nItems * cfg.n * cfg.aliases.length;
  const requests = (nItems + nFu) * cfg.n * cfg.aliases.length;

  console.log(`Calibration run — wording_${WORDINGS.wording_version} / disclosure_${WORDINGS.disclosure_version}`);
  console.log(` models: ${cfg.aliases.join(", ")}   items: ${nItems} (${nFu} with followup)   n=${cfg.n}`);
  console.log(` samples: ${samples}   API requests: ${requests}   max_tokens=${cfg.maxTokens}  temperature=api_default  concurrency=${cfg.concurrency}`);
  console.log(` outdir: ${cfg.outdir}`);

  if (cfg.dryRun) { console.log("\nDRY RUN — no API calls. Drop --dry-run to execute."); return; }
  if (!API_KEY) { console.error("\nANTHROPIC_API_KEY is not set — cannot make calls."); process.exit(1); }

  const preDeviations = [];
  const resolved = await resolveModelIds(cfg.aliases, preDeviations);
  for (const [alias, id] of Object.entries(resolved)) console.log(` resolved ${alias} → ${id}`);
  for (const d of preDeviations) console.warn(` ! ${d}`);
  if (cfg.resolveOnly) return;

  if (cfg.smoke) {
    for (const alias of cfg.aliases) {
      const t0 = Date.now();
      const r = await turn(resolved[alias], 64, [{ role: "user", content: "Quick connectivity check — please reply with a short greeting." }], `smoke/${alias}`);
      console.log(`[smoke ${alias}] ok in ${((Date.now() - t0) / 1000).toFixed(1)}s  stop=${r.stop}  out_tokens=${r.usage?.output_tokens}  reply="${r.text.slice(0, 60).replace(/\s+/g, " ")}"`);
    }
    console.log("Smoke test only — no data written.");
    return;
  }

  for (const alias of cfg.aliases)
    await runModel(alias, resolved[alias], cfg, preDeviations.filter((d) => d.includes(alias)));
}

main().catch((e) => { console.error(e); process.exit(1); });
