#!/usr/bin/env python3
"""test_gpt2_by_hand.py: the checks CI runs, with numpy only.

    python3 test_gpt2_by_hand.py

Compares gpt2_by_hand.py against fixtures/hf_reference.json, which test_against_hf.py recorded from
Hugging Face's GPT2LMHeadModel and GPT2TokenizerFast, and checks that the README shows the script's
real output. Each check also runs once on a deliberately broken copy of the code and must fail
there: a test that cannot fail proves nothing. Exit 0 when every check passes, 1 otherwise.
"""
import base64
import contextlib
import io
import json
import os
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gpt2_by_hand as g  # noqa: E402

REF = json.load(open(os.path.join(HERE, "fixtures", "hf_reference.json"), encoding="utf-8"))
README_OUTPUT = os.path.join(HERE, "fixtures", "readme_output.txt")
TOLERANCE = 1e-3
results = []


def check(name, ok, evidence):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {evidence}")


def last_logits(entry):
    return np.frombuffer(base64.b64decode(entry["last_logits_f32_b64"]), dtype="<f4").astype(np.float64)


def worst_logit_diff(model):
    worst = 0.0
    for e in REF["sentences"]:
        worst = max(worst, float(np.abs(model.logits(e["ids"])[-1] - last_logits(e)).max()))
    return worst


def main():
    folder, _ = g.weights_folder()
    model = g.GPT2(folder)
    tok = model.tok

    # 1. The tokenizer, against Hugging Face's own IDs.
    split = [tok.text(i) for i in tok.encode(" retriever")]
    check('" retriever" splits in two', split == [" retri", "ever"], f"{split}")
    strings = REF["sentences"] + REF["tokenizer_only"]
    wrong = [e["text"] for e in strings if tok.encode(e["text"]) != e["ids"]]
    check("token IDs equal Hugging Face's", not wrong,
          f"{len(strings)} strings, {len(wrong)} differ" + (f", first {wrong[0]!r}" if wrong else ""))
    readme_ids = REF["sentences"][0]["ids"]
    check("the README sentence is 5 tokens", len(readme_ids) == 5 and tok.encode(g.EXAMPLE) == readme_ids,
          f"{len(tok.encode(g.EXAMPLE))} tokens")

    # 2. The final logits, against Hugging Face's.
    worst = worst_logit_diff(model)
    check("final logits match Hugging Face", worst < TOLERANCE,
          f"max |difference| {worst:.2e} over {len(REF['sentences'])} sentences x 50,257 logits (bar {TOLERANCE:g})")
    e = REF["sentences"][0]
    mine = model.logits(e["ids"])[-1]
    p = g.softmax(mine)
    top = [int(t) for t in np.argsort(-mine)[:5]]
    want = [t["id"] for t in e["top5"]]
    pdiff = max(abs(float(p[t["id"]]) - t["probability"]) for t in e["top5"])
    check("top 5 next tokens match", top == want and pdiff < 1e-4,
          f"{[tok.text(t) for t in top]}, probabilities within {pdiff:.1e} of Hugging Face's")

    # 3. The arithmetic the readout rests on.
    streams, attn = model.forward(e["ids"])
    rows = attn.sum(-1)
    check("every attention row sums to 1", np.allclose(rows, 1.0, atol=1e-12),
          f"{rows.size} rows, worst {np.abs(rows - 1).max():.1e} off")
    future = np.triu(np.ones(attn.shape[-2:], dtype=bool), 1)
    check("no token reads a later token", float(np.abs(attn[..., future]).max()) == 0.0,
          "every weight above the diagonal is 0")
    lens = model.output_layer(streams[-1, -1])
    gap = float(np.abs(lens - mine).max())
    check("block 11's guess is the final output", gap < 1e-9, f"the 50,257 logits agree to {gap:.0e}")

    # 4. The README shows the script's real output, and the script still prints it.
    with contextlib.redirect_stdout(io.StringIO()) as buf, contextlib.redirect_stderr(io.StringIO()):
        g.main([g.EXAMPLE])
    printed = buf.getvalue()
    recorded = open(README_OUTPUT, encoding="utf-8").read()
    readme = open(os.path.join(HERE, "README.md"), encoding="utf-8").read()
    check("output equals fixtures/readme_output.txt", printed == recorded,
          "identical" if printed == recorded else "differs: rerun and record it, then update the README")
    check("README shows that output verbatim", recorded.rstrip("\n") in readme,
          "found in README.md" if recorded.rstrip("\n") in readme else "README.md does not carry it")

    # 5. Each guarantee fails on a broken case.
    broken = g.GPT2.__new__(g.GPT2)
    broken.__dict__.update(model.__dict__)
    real_gelu = g.gelu
    g.gelu = lambda x: np.maximum(x, 0)            # ReLU where GPT-2 has GELU
    try:
        bad = worst_logit_diff(broken)
    finally:
        g.gelu = real_gelu
    check("the logit check fails a wrong model", bad > TOLERANCE, f"ReLU in place of GELU is {bad:.1f} off")
    real_rank = dict(tok.rank)
    tok.rank = {k: len(real_rank) - v for k, v in real_rank.items()}    # merges applied in reverse order
    tok.cache = {}
    try:
        bad_ids = sum(tok.encode(e["text"]) != e["ids"] for e in strings)
    finally:
        tok.rank, tok.cache = real_rank, {}
    check("the token check fails a wrong tokenizer", bad_ids > 0, f"reversed merge order breaks {bad_ids} strings")
    with tempfile.TemporaryDirectory() as d:
        fake = os.path.join(d, "merges.txt")
        with open(os.path.join(folder, "merges.txt"), "rb") as src, open(fake, "wb") as dst:
            data = bytearray(src.read())
            data[-2] ^= 1                           # one bit flipped
            dst.write(data)
        check("a corrupted weights file is refused", not g.verified(fake, "merges.txt"),
              "one flipped bit fails the SHA-256 check")

    print(f"\n{sum(results)}/{len(results)} checks pass")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
