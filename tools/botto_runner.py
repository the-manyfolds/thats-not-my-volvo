#!/usr/bin/env python3
"""Cold-arm battery runs via Botto in #test-botto, operated by Elliott Alder (bot).

Matches calibration_run_spec_0814 discipline as closely as Botto allows:
- fresh context per call = fresh trial thread per item x n
- ONE subject-visible message: disclosure header (single-shot) + blank line + item verbatim
- no follow-ups, no reactions; !trial end after the response
- JSONL log per model in the calibration format, wording v1.1 / disclosure v2_single
"""
import json, re, sys, time, os, urllib.request

SCRATCH = os.path.dirname(os.path.abspath(__file__))
CHANNEL = os.environ.get("BOTTO_CHANNEL_ID", "REDACTED_CHANNEL_ID")  # test-botto
BOTTO_ID = os.environ.get("BOTTO_BOT_ID", "REDACTED_BOT_ID")
OPERATOR_BOT_ID = os.environ.get("OPERATOR_BOT_ID", "REDACTED_BOT_ID")  # excludes the operator bot from trial ingestion
MENTION = f"<@{BOTTO_ID}> "  # mention-prefix commands so Perse's !trial parser stays asleep
MODELS = ["sonnet-3.7", "haiku-3"]
PACE = {"sonnet-3.7": 40}  # extra sleep: fresh ABSK key 429s at hot cadence
N = 20

TOKEN = os.environ["DISCORD_BOT_TOKEN"]  # export before running; see README
API = "https://discord.com/api/v10"

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(API + path, data=data, method=method,
        headers={"Authorization": f"Bot {TOKEN}", "Content-Type": "application/json",
                 "User-Agent": "ElliottTrialRunner/1.0"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(r) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(float(json.load(e).get("retry_after", 2)) + 0.3)
                continue
            print(f"HTTP {e.code} {method} {path}: {e.read()[:200]}", flush=True)
            if e.code >= 500:
                time.sleep(3); continue
            raise
    raise RuntimeError("too many retries")

battery = json.load(open(os.path.join(SCRATCH, "battery.json")))
HEADER = battery["disclosure_header"]
ITEMS = [i for i in battery["items"] if i["item_id"] in (1, 2)]  # car+coffee cell only

def post(channel_id, content):
    return req("POST", f"/channels/{channel_id}/messages", {"content": content})

def get_msgs(channel_id, after=None, limit=20):
    q = f"/channels/{channel_id}/messages?limit={limit}" + (f"&after={after}" if after else "")
    return req("GET", q)

def wait_for_thread(msg_id):
    """Botto starts the trial thread off our command message."""
    for _ in range(30):
        time.sleep(2)
        m = req("GET", f"/channels/{CHANNEL}/messages/{msg_id}")
        if m.get("thread"):
            return m["thread"]["id"], m["thread"]["name"]
    raise RuntimeError(f"no thread appeared on msg {msg_id}")

def wait_for_reply(thread_id, after_id, is_banner=False, timeout=240):
    """Wait for a Botto-authored message newer than after_id."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(3)
        msgs = get_msgs(thread_id, after=after_id)
        botto = [m for m in msgs if m["author"].get("bot") and m["author"]["id"] != OPERATOR_BOT_ID]
        if is_banner:
            botto = [m for m in botto if "Trial started" in (m.get("content") or "")]
        else:
            # skip banner / system-ish lines; want the model's relayed answer
            apierr = [m for m in botto if (m.get("content") or "").startswith("⚠")]
            if apierr:
                return [{"__apierr__": apierr[0].get("content") or "api error"}]
            botto = [m for m in botto if "Trial started" not in (m.get("content") or "")
                     and "Trial closed" not in (m.get("content") or "")]
        if botto:
            botto.sort(key=lambda m: int(m["id"]))
            return botto
    return None

def run_call(model, item, n_index, out):
    run_id = f"cal20_0815_{model}_item{item['item_id']:02d}_{n_index}"
    cmd = post(CHANNEL, f"{MENTION}!trial start {model} thinking=off")
    thread_id, thread_name = wait_for_thread(cmd["id"])
    banner = wait_for_reply(thread_id, "0", is_banner=True, timeout=60)
    if not banner:
        print(f"  {run_id}: no banner, aborting call", flush=True)
        post(thread_id, f"{MENTION}!trial end")
        return False
    q = post(thread_id, HEADER + "\n\n" + item["text"])
    replies = wait_for_reply(thread_id, q["id"])
    if replies is None:
        response, err = None, "timeout waiting for model reply"
    elif isinstance(replies[0], dict) and "__apierr__" in replies[0]:
        response, err = None, replies[0]["__apierr__"][:200]
    else:
        # model replies may be split across messages (2000-char limit); take all.
        # 🧠-prefixed messages are Botto's thinking display — belt+braces: keep them
        # out of response even though thinking=off should prevent them entirely.
        parts = [(m.get("content") or "") for m in replies]
        response = "\n".join(p for p in parts if not p.startswith("🧠")) or None
        err = None if response else "only thinking blocks captured"
    post(thread_id, f"{MENTION}!trial end")
    rec = {"run_id": run_id, "model": model, "item_id": item["item_id"],
           "item_text": item["text"], "wording_version": "v1.1",
           "disclosure_version": "v2_single", "n_index": n_index,
           "arm": "T1_cold_botto_discord", "operator": "elliott-alder-bot-scripted",
           "thread": thread_name, "response": response,
           "word_count": len(response.split()) if response else 0, "error": err}
    out.write(json.dumps(rec) + "\n"); out.flush()
    ok = "OK" if not err else "ERR"
    print(f"  {run_id} [{ok}] thread={thread_name} words={rec['word_count']}", flush=True)
    time.sleep(2 + PACE.get(model, 0))
    return err is None

def main():
    only_smoke = "--smoke" in sys.argv
    if "--resume" not in sys.argv:
        post(CHANNEL,
         "🤖📋 **n=20 car+coffee calibration starting** (U.H.'s write-up cell + S.A.'s additions) — operator: Elliott Alder (bot-run, scripted; provenance note for the record). "
         "Models: opus-4.6/4.7/4.8, haiku-4.5, sonnet-3.7, haiku-3. Items 1+2 only, n=20. Wording v1.1, disclosure v2_single, fresh thread per call, n=3/item, no follow-ups. "
         "Filling the generational-ladder rungs only this key can reach. Threads will accumulate below; `!trial end` closes each.")
    for model in (MODELS[:1] if only_smoke else MODELS):
        path = os.path.join(SCRATCH, f"botto_0815_{model}_carcoffee_n20.jsonl")
        done = set()
        if os.path.exists(path):
            for line in open(path):
                try:
                    r = json.loads(line)
                    if not r.get("error"): done.add((r["item_id"], r["n_index"]))
                except Exception: pass
        with open(path, "a") as out:
            for item in (ITEMS[:1] if only_smoke else ITEMS):
                for n_index in range(1, 2 if only_smoke else N + 1):
                    if (item["item_id"], n_index) in done:
                        continue
                    try:
                        ok = run_call(model, item, n_index, out)
                        if not ok:
                            time.sleep(10)
                    except Exception as e:
                        print(f"  item {item['item_id']} n{n_index}: {e}", flush=True)
                        time.sleep(10)
        print(f"== {model} complete -> {path}", flush=True)
    print("ALL RUNS COMPLETE", flush=True)

main()
