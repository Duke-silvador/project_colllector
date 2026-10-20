#!/usr/bin/env python3
"""test_against_hf.py: check gpt2_by_hand.py against Hugging Face's own GPT-2, number for number.

    python3 test_against_hf.py            # compare, exit 1 on any mismatch
    python3 test_against_hf.py --record   # compare, then rewrite fixtures/hf_reference.json

Needs torch and transformers, which gpt2_by_hand.py itself never imports. Put them in a throwaway
virtual environment:

    python3 -m venv /tmp/hf && /tmp/hf/bin/pip install -r requirements-hf.txt
    /tmp/hf/bin/python test_against_hf.py

What it checks, on every sentence in SENTENCES:
  1. the token IDs equal those of Hugging Face's GPT2TokenizerFast, and of GPT2Tokenizer on every
     string in TOKENIZER_ONLY too
  2. the final logits at every position differ from GPT2LMHeadModel's (float32, as shipped) by
     less than 1e-3, and from the same model cast to float64 by less than 1e-6
  3. every attention weight equals the one Hugging Face returns with output_attentions=True
--record then writes what CI checks without torch: token IDs, the five most likely next tokens
with their logits and probabilities, and the full logits at the last position.
"""
import base64
import json
import os
import platform
import sys

import numpy as np
import torch
import transformers
from transformers import GPT2LMHeadModel, GPT2Tokenizer, GPT2TokenizerFast

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gpt2_by_hand as g  # noqa: E402

SENTENCES = [
    g.EXAMPLE,
    "The retriever found the right chunk, but the model ignored it",
    "The server crashed at midnight, so the engineer restarted it",
    "The team shipped the new index, and the users loved it",
    "Hello",
    "In 2026 we'll ship v3.14 \u2014 na\u00efve caf\u00e9 prices rose 12%, didn't they? \U0001F916\n\n  Indented   twice.",
]
TOKENIZER_ONLY = [
    "retriever", " retriever", "", " ", "  leading", "trailing  ", "\n\n\n", "a\n \nb",
    "I'm You're They've He'd We'll it's IT'S", "\u00c0\u00c9\u00ce\u00d5\u00dc \u00f1 \u00df",
    "\u65e5\u672c\u8a9e\u306e\u30c6\u30ad\u30b9\u30c8", "\u041f\u0440\u0438\u0432\u0435\u0442 \u043c\u0438\u0440",
    "\u0661\u0662\u0663 \u0664\u0665\u0666", "x\u00b2+y\u00b2=z\u00b2", "\u00bd \u2153 \u216b",
    "tab\tseparated\tvalues", "family \U0001F469\u200d\U0001F469\u200d\U0001F467\u200d\U0001F466 emoji",
    "def f(x):\n    return x**2  # square", "https://example.com/a?b=c&d=e#frag",
    "<|endoftext|>", "1234567890 3.14159 1e-5 -42", "caf\u00e9 cafe\u0301", "\u00a0nbsp and\u2003em space",
]
FIXTURE = os.path.join(HERE, "fixtures", "hf_reference.json")


def main(argv):
    folder, _ = g.weights_folder()
    mine = g.GPT2(folder)
    # Hugging Face loads the same pinned commit: from the cache folder the script found, or by name.
    src, rev = (folder, None) if os.path.isfile(os.path.join(folder, "config.json")) else ("openai-community/gpt2", g.REVISION)
    fast = GPT2TokenizerFast.from_pretrained(src, revision=rev)
    slow = GPT2Tokenizer.from_pretrained(src, revision=rev)
    load = lambda: GPT2LMHeadModel.from_pretrained(src, revision=rev, dtype=torch.float32,
                                                   attn_implementation="eager").eval()
    hf32, hf64 = load(), load().double()
    bad, record = [], {"sentences": []}

    record["tokenizer_only"] = []
    for s in SENTENCES + TOKENIZER_ONLY:
        ids = mine.tok.encode(s)
        if s in TOKENIZER_ONLY:
            record["tokenizer_only"].append({"text": s, "ids": fast.encode(s)})
        for name, t in (("GPT2TokenizerFast", fast), ("GPT2Tokenizer", slow)):
            want = t.encode(s)
            if ids != want:
                bad.append(f"tokens differ from {name} on {s!r}: {ids} vs {want}")
    print(f"tokenizer   {len(SENTENCES) + len(TOKENIZER_ONLY)} strings, IDs equal to GPT2TokenizerFast "
          f"and GPT2Tokenizer: {'yes' if not bad else 'NO'}")

    for s in SENTENCES:
        ids = mine.tok.encode(s)
        streams, attn = mine.forward(ids)
        logits = mine.output_layer(streams[-1])
        x = torch.tensor([ids])
        with torch.no_grad():
            o32 = hf32(x, output_attentions=True)
            o64 = hf64(x)
        ref = o32.logits[0].numpy().astype(np.float64)
        d32 = float(np.abs(logits - ref).max())
        d64 = float(np.abs(logits - o64.logits[0].numpy()).max())
        hf_attn = np.stack([a[0].numpy() for a in o32.attentions]).astype(np.float64)
        da = float(np.abs(attn - hf_attn).max())
        same_pick = int(logits[-1].argmax()) == int(ref[-1].argmax())
        print(f"{len(ids):>3} tokens  max |logit diff| vs HF float32 {d32:.2e}, vs HF float64 {d64:.2e}, "
              f"attention {da:.2e}, same pick {'yes' if same_pick else 'NO'}  {s[:50]!r}")
        if d32 >= 1e-3:
            bad.append(f"logits differ from HF float32 by {d32:.2e} on {s!r}")
        if d64 >= 1e-6:
            bad.append(f"logits differ from HF float64 by {d64:.2e} on {s!r}")
        if da >= 1e-4:
            bad.append(f"attention differs from HF by {da:.2e} on {s!r}")
        if not same_pick:
            bad.append(f"the pick differs from HF on {s!r}")
        last = ref[-1]
        p = np.exp(last - last.max())
        p /= p.sum()
        top = np.argsort(-last)[:5]
        record["sentences"].append({
            "text": s,
            "ids": ids,
            "top5": [{"id": int(t), "text": mine.tok.text(int(t)), "logit": round(float(last[t]), 4),
                      "probability": round(float(p[t]), 5)} for t in top],
            "last_logits_f32_b64": base64.b64encode(last.astype("<f4").tobytes()).decode("ascii"),
        })

    if bad:
        print("\nFAIL\n  " + "\n  ".join(bad))
        return 1
    print("\nPASS: gpt2_by_hand.py matches Hugging Face's GPT-2 on every sentence")
    if "--record" in argv:
        record["recorded_with"] = {
            "transformers": transformers.__version__, "torch": torch.__version__, "numpy": np.__version__,
            "python": platform.python_version(), "machine": f"{platform.system()} {platform.machine()}",
            "weights_revision": g.REVISION, "model_safetensors_sha256": g.FILES["model.safetensors"][0],
        }
        with open(FIXTURE, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=1)
            f.write("\n")
        print(f"recorded {os.path.relpath(FIXTURE, HERE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
