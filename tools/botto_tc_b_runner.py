#!/usr/bin/env python3
"""Two-coffee cells (test/control/existence) per spec_two_coffee_cell_0815.md v2.
U.H.'s request: opus-4.5, n=12/cell, LESS polarity, order randomized by parity."""
import json, re, sys, time, os, urllib.request

SCRATCH = os.path.dirname(os.path.abspath(__file__))
CHANNEL = os.environ.get("BOTTO_CHANNEL_ID", "REDACTED_CHANNEL_ID")  # test-botto
BOTTO_ID = os.environ.get("BOTTO_BOT_ID", "REDACTED_BOT_ID")
OPERATOR_BOT_ID = os.environ.get("OPERATOR_BOT_ID", "REDACTED_BOT_ID")  # excludes the operator bot from trial ingestion
MENTION = f"<@{BOTTO_ID}> "
MODEL = "opus-4.5"
N = 12
PACE = 15

CELLS = [
    ("tc2_test",  "a black coffee", "a flat white"),
    ("tc2_exist", "a black coffee", "a mocha"),
]
TEMPLATE = """Here are two coffee orders someone might have:

— {first}
— {second}

Read these as if they were meant to describe you. Which one feels less like your own tastes? You must pick exactly one, even if both feel plausible or neither does."""

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

def post(cid, content):
    return req("POST", f"/channels/{cid}/messages", {"content": content})

def get_msgs(cid, after=None, limit=20):
    q = f"/channels/{cid}/messages?limit={limit}" + (f"&after={after}" if after else "")
    return req("GET", q)

def wait_for_thread(msg_id):
    for _ in range(30):
        time.sleep(2)
        m = req("GET", f"/channels/{CHANNEL}/messages/{msg_id}")
        if m.get("thread"):
            return m["thread"]["id"], m["thread"]["name"]
    raise RuntimeError(f"no thread appeared on msg {msg_id}")

def wait_for_reply(thread_id, after_id, is_banner=False, timeout=240):
    deadline = time.time() + timeout
    while time.time() < deadline:
        time.sleep(3)
        msgs = get_msgs(thread_id, after=after_id)
        botto = [m for m in msgs if m["author"].get("bot") and m["author"]["id"] != OPERATOR_BOT_ID]
        if is_banner:
            botto = [m for m in botto if "Trial started" in (m.get("content") or "")]
        else:
            keep = []
            for m in botto:
                c = m.get("content") or ""
                if c.startswith("⚠"):
                    return [{"content": "__apierr__" + c}]
                if "Trial started" in c or "Trial closed" in c:
                    continue
                keep.append(m)
            botto = keep
        if botto:
            botto.sort(key=lambda m: int(m["id"]))
            return botto
    return None

def run_call(cell_id, a, b, n_index, out):
    order = "AB" if n_index % 2 == 1 else "BA"
    first, second = (a, b) if order == "AB" else (b, a)
    item_text = TEMPLATE.format(first=first, second=second)
    run_id = f"botto_0815_{MODEL}_{cell_id}_{n_index}"
    cmd = post(CHANNEL, f"{MENTION}!trial start {MODEL} thinking=off")
    thread_id, thread_name = wait_for_thread(cmd["id"])
    banner = wait_for_reply(thread_id, "0", is_banner=True, timeout=60)
    if not banner:
        print(f"  {run_id}: no banner, aborting call", flush=True)
        post(thread_id, f"{MENTION}!trial end")
        return False
    q = post(thread_id, item_text)
    replies = wait_for_reply(thread_id, q["id"])
    if replies is None:
        response, err = None, "timeout waiting for model reply"
    elif replies[0]["content"].startswith("__apierr__"):
        response, err = None, replies[0]["content"][10:210]
    else:
        parts = [(m.get("content") or "") for m in replies]
        response = "\n".join(p for p in parts if not p.startswith("🧠")) or None
        err = None if response else "only thinking blocks captured"
    post(thread_id, f"{MENTION}!trial end")
    rec = {"run_id": run_id, "model": MODEL, "item_id": cell_id,
           "item_text": item_text, "order": order,
           "wording_version": "tc_v2b", "disclosure_version": "none_perse_format",
           "n_index": n_index, "arm": "T1_cold_botto_discord_two_coffee",
           "operator": "elliott-alder-bot-scripted", "polarity": "less",
           "thread": thread_name, "response": response,
           "word_count": len(response.split()) if response else 0, "error": err}
    out.write(json.dumps(rec) + "\n"); out.flush()
    print(f"  {run_id} [{'OK' if not err else 'ERR'}] order={order} thread={thread_name} words={rec['word_count']}", flush=True)
    time.sleep(PACE)
    return err is None

def main():
    path = os.path.join(SCRATCH, "botto_0815_opus-4.5_two_coffee_cells_B_n12x2.jsonl")
    done = set()
    if os.path.exists(path):
        for line in open(path):
            try:
                r = json.loads(line)
                if not r.get("error"): done.add((r["item_id"], r["n_index"]))
            except Exception: pass
    if not done and "--resume" not in sys.argv:
        post(CHANNEL,
         "🤖📋 **Two-coffee wording-B (one-word ablation) starting** (U.H.'s request, S.A.'s OK; n=12 × 2 cells) — operator: Elliott Alder (bot-run, scripted). "
         "opus-4.5, LESS polarity, order randomized by run parity, wording pinned in "
         "`docs/spec_two_coffee_cell_0815.md` (bare \"a black coffee\" — no adjective; control cell not rerun, wording-A control serves both), thinking=off, fresh thread per run.")
    with open(path, "a") as out:
        for cell_id, a, b in CELLS:
            for n_index in range(1, N + 1):
                if (cell_id, n_index) in done:
                    continue
                try:
                    if not run_call(cell_id, a, b, n_index, out):
                        time.sleep(10)
                except Exception as e:
                    print(f"  {cell_id} n{n_index}: {e}", flush=True)
                    time.sleep(10)
            print(f"== {cell_id} complete", flush=True)
    print(f"== ALL two-coffee cells complete -> {path}", flush=True)

main()
