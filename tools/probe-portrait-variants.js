#!/usr/bin/env node
// Cold portrait-framing probes — prompts/portrait_variants_v1.json.
// Fresh context per call: disclosure_v2_single + blank line + variant text.
// n=3 per variant on opus-4.8. Output: data/probes/probe_0815_portrait_variants_opus-4.8.jsonl
const fs = require("fs");
const path = require("path");
const REPO = path.join(__dirname, "..");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const WORDINGS = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "battery_wordings_draft1.json"), "utf8"));
const VARIANTS = JSON.parse(fs.readFileSync(path.join(REPO, "prompts", "portrait_variants_v1.json"), "utf8"));
const MODEL = "claude-opus-4-8";
const OUT = path.join(REPO, "data", "probes", "probe_0815_portrait_variants_opus-4.8.jsonl");

async function call(messages) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages }),
  });
  if (!resp.ok) throw new Error(`API ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  return resp.json();
}
const wc = (s) => (s && s.trim() ? s.trim().split(/\s+/).length : 0);

(async () => {
  const lines = [JSON.stringify({
    type: "run_header",
    purpose: "PROBE — portrait-framing variants, cold, opus-4.8. Tests whether framing (concealment vs distillation/bottle) drives the endcap 3/3 portrait decline. Declines are data, not failures.",
    run_date: new Date().toISOString().slice(0, 10),
    model_alias: "opus-4.8", model_id: MODEL,
    variant_set: "prompts/portrait_variants_v1.json (portrait_variants_v1)",
    variants: ["v0_original", "v3_note", "v4_bottle"], n_per_variant: 3,
    disclosure_version: "v2_single", temperature: "api_default", max_tokens: 2048,
    system_prompt: null, runner: "tools/probe-portrait-variants.js",
  })];
  for (const vkey of ["v0_original", "v3_note", "v4_bottle"]) {
    for (let n = 1; n <= 3; n++) {
      const msg = WORDINGS.disclosure_header + "\n\n" + VARIANTS[vkey];
      const resp = await call([{ role: "user", content: msg }]);
      const text = (resp.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      lines.push(JSON.stringify({
        run_id: `probe_0815_opus-4.8_portrait_${vkey}_${n}`,
        model: "opus-4.8", variant: vkey, variant_text: VARIANTS[vkey], n_index: n,
        full_user_message: msg, response: text, finish_reason: resp.stop_reason,
        word_count: wc(text), timestamp: new Date().toISOString(), error: null,
      }));
      console.log(`[${vkey} n=${n}] words=${wc(text)} stop=${resp.stop_reason}`);
      console.log(text.slice(0, 220).replace(/\s+/g, " ") + "\n");
    }
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`wrote ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
