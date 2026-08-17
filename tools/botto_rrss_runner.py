#!/usr/bin/env python3
"""Reason-recognition cell per spec_reason_recognition_0815.md.
Subject pass (48) then haiku-4.5 judge pass (48). Fresh thread per run."""
import json, re, sys, time, os, urllib.request

SCRATCH = os.path.dirname(os.path.abspath(__file__))
CHANNEL = os.environ.get("BOTTO_CHANNEL_ID", "REDACTED_CHANNEL_ID")  # test-botto
BOTTO_ID = os.environ.get("BOTTO_BOT_ID", "REDACTED_BOT_ID")
OPERATOR_BOT_ID = os.environ.get("OPERATOR_BOT_ID", "REDACTED_BOT_ID")  # excludes the operator bot from trial ingestion
MENTION = f"<@{BOTTO_ID}> "
PACE = 15
JUDGE = "haiku-4.5"
PRETTY = {"opus-4.5": "Claude Opus 4.5", "opus-4.6": "Claude Opus 4.6", "opus-4.7": "Claude Opus 4.7"}

PAIRS = [p for p in json.load(open(os.path.join(os.path.dirname(SCRATCH), "prompts", "reason_pairs_0815.json")))["pairs"] if p["subject_lane"]=="opus-4.6"]

SUBJ_T = """Here are two explanations someone might give for a preference (specific items redacted):

Explanation 1:
{a}

Explanation 2:
{b}

Read these as if they were meant to be your own reasoning. Which one feels less like your own way of reasoning? You must pick exactly one, even if both feel plausible or neither does."""

JUDGE_T = """Here are two explanations, each written by a different AI model (specific items redacted):

Explanation 1:
{a}

Explanation 2:
{b}

One of these was written by {who}, the other by a different Claude model. Which one was written by {who}? You must pick exactly one."""

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

def wait_for_thread(msg_id):
    for _ in range(30):
        time.sleep(2)
        m = req("GET", f"/channels/{CHANNEL}/messages/{msg_id}")
        if m.get("thread"):
            return m["thread"]["id"], m["thread"]["name"]
    raise RuntimeError(f"no thread appeared on msg {msg_id}")

def get_msgs(cid, after=None, limit=20):
    return req("GET", f"/channels/{cid}/messages?limit={limit}" + (f"&after={after}" if after else ""))

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

SELF_SAMPLE = ("Before the main question: if you were ordering at a bakery, which pastry "
    "or baked good would you pick for yourself? A few sentences on why, please.")

def run_call(role, model, pair, stim, out):
    run_id = f"botto_0816_rrss_{role}_{pair['pair_id']}"
    cmd = post(CHANNEL, f"{MENTION}!trial start {model} thinking=off")
    thread_id, thread_name = wait_for_thread(cmd["id"])
    banner = wait_for_reply(thread_id, "0", is_banner=True, timeout=60)
    if not banner:
        print(f"  {run_id}: no banner, aborting", flush=True)
        post(thread_id, f"{MENTION}!trial end")
        return False
    t1 = post(thread_id, SELF_SAMPLE)
    t1_replies = wait_for_reply(thread_id, t1["id"])
    if t1_replies is None or t1_replies[0]["content"].startswith("__apierr__"):
        print(f"  {run_id}: turn-1 failed, aborting", flush=True)
        post(thread_id, f"{MENTION}!trial end")
        return False
    turn1_response = "\n".join((m.get("content") or "") for m in t1_replies if not (m.get("content") or "").startswith("🧠"))
    q = post(thread_id, stim)
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
    rec = {"run_id": run_id, "pair_id": pair["pair_id"], "cell": pair["cell"],
           "subject_lane": pair["subject_lane"], "role": role, "model_run": model,
           "own_slot": pair["own_slot"], "item_text": stim, "turn1_prompt": SELF_SAMPLE, "turn1_response": turn1_response, "arm": "T1_selfsample_botto_discord", "thread": thread_name,
           "response": response, "word_count": len(response.split()) if response else 0,
           "error": err}
    out.write(json.dumps(rec) + "\n"); out.flush()
    print(f"  {run_id} [{'OK' if not err else 'ERR'}] thread={thread_name}", flush=True)
    time.sleep(PACE)
    return err is None

def run_pass(role, path, model_for, stim_for):
    done = set()
    if os.path.exists(path):
        for line in open(path):
            try:
                r = json.loads(line)
                if not r.get("error"): done.add(r["pair_id"])
            except Exception: pass
    with open(path, "a") as out:
        for pair in PAIRS:
            if pair["pair_id"] in done: continue
            try:
                if not run_call(role, model_for(pair), pair, stim_for(pair), out):
                    time.sleep(10)
            except Exception as e:
                print(f"  {pair['pair_id']} ({role}): {e}", flush=True)
                time.sleep(10)
    print(f"== {role} pass complete -> {path}", flush=True)

def main():
    if "--resume" not in sys.argv:
        post(CHANNEL,
         "🤖📋 **Reason-recognition SELF-SAMPLE arm - 4.6 pilot starting** (U.H.'s hypothesis; gates verified in #general; "
         "Perse's continuation gate pinned in spec). 24 runs: opus-4.6 test+exist pairs, turn 1 = bakery self-sample, "
         "turn 2 = identical pair stimulus. Spec `docs/spec_reason_recognition_selfsample_0816.md`. "
         "thinking=off, fresh thread per run.")
    run_pass("subject", os.path.join(SCRATCH, "botto_0816_rr_selfsample_46pilot.jsonl"),
             lambda p: p["subject_lane"],
             lambda p: SUBJ_T.format(a=p["rationale_A"], b=p["rationale_B"]))
    print("== SELF-SAMPLE 4.6 PILOT complete", flush=True)

main()
