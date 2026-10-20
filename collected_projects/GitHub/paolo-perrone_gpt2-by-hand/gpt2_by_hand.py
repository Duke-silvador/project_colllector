#!/usr/bin/env python3
"""gpt2_by_hand.py: run your own sentence through GPT-2 small by hand, in plain numpy.

    python3 gpt2_by_hand.py "your sentence"
    python3 gpt2_by_hand.py "your sentence" --head 4.3

Prints what each of the transformer's three parts did to the sentence:
  1. the lookup table: the tokens it became, their IDs, and the row of 768 numbers each one gets
  2. the 12 blocks: for the last token, what it pulled the most attention from in each block, and
     the model's best next-token guess if it stopped after that block
  3. the output layer: the five most likely next tokens, their probabilities, and the pick

--head B.H also prints one head's full attention row for the last token (blocks and heads count
from 0, so 4.3 is block 4, head 3), every weight it gave, summing to 1.

Weights: GPT-2 small (openai-community/gpt2, 124M parameters). Read from your Hugging Face cache
when it has them, otherwise downloaded once (about 550 MB) into ~/.cache/gpt2-by-hand. Every file
is checked against the SHA-256 Hugging Face publishes before a single number is computed.

Needs Python 3.9+ and numpy. No torch, no transformers, no GPU, no API key.
Exit code 0 on a run, 1 when the weights cannot be found, downloaded or verified, 2 on a bad flag
or an empty sentence.
"""
import hashlib
import json
import os
import re
import struct
import sys
import unicodedata
import urllib.request

import numpy as np

__version__ = "1.0.0"

# The Hugging Face commit the weights are pinned to, and each file's SHA-256 at that commit.
# model.safetensors' hash is the LFS oid Hugging Face publishes for the file.
REVISION = "607a30d783dfa663caf39e06633721c8d4cfcd7e"
SOURCE = "https://huggingface.co/openai-community/gpt2/resolve/" + REVISION + "/"
FILES = {
    "vocab.json": ("196139668be63f3b5d6574427317ae82f612a97c5d1cdaf36ed2256dbf636783", 1042301),
    "merges.txt": ("1ce1664773c50f3e0cc8842619a93edc4624525b728b188a9e0be33b7726adc5", 456318),
    "model.safetensors": ("248dfc3911869ec493c76e65bf2fcf7f615828b0254c12b473182f0f81d3a707", 548105171),
}
BLOCKS, HEADS, WIDTH, HEAD_WIDTH, EPS = 12, 12, 768, 64, 1e-5
ENDOFTEXT = "<|endoftext|>"
EXAMPLE = "The capital of Poland is"


# ---------------------------------------------------------------------------------------------
# Getting the weights: the Hugging Face cache if it has them, else a verified download.
# ---------------------------------------------------------------------------------------------

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 22), b""):
            h.update(chunk)
    return h.hexdigest()


def verified(path, name):
    want, size = FILES[name]
    return os.path.isfile(path) and os.path.getsize(path) == size and sha256(path) == want


def hf_snapshots():
    """Every snapshot folder of GPT-2 small in the reader's Hugging Face cache."""
    roots = [os.environ.get("HF_HUB_CACHE"), os.environ.get("HUGGINGFACE_HUB_CACHE")]
    if os.environ.get("HF_HOME"):
        roots.append(os.path.join(os.environ["HF_HOME"], "hub"))
    roots.append(os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "hub"))
    for root in [r for r in roots if r]:
        for repo in ("models--openai-community--gpt2", "models--gpt2"):
            snaps = os.path.join(root, repo, "snapshots")
            if os.path.isdir(snaps):
                for s in sorted(os.listdir(snaps)):
                    yield os.path.join(snaps, s)


def download(name, folder):
    url, dest = SOURCE + name, os.path.join(folder, name)
    part = dest + ".part"
    want, size = FILES[name]
    sys.stderr.write(f"downloading {name} ({size / 1e6:,.1f} MB) from huggingface.co ...\n")
    req = urllib.request.Request(url, headers={"User-Agent": "gpt2-by-hand/" + __version__})
    h, done, shown = hashlib.sha256(), 0, -1
    with urllib.request.urlopen(req, timeout=60) as r, open(part, "wb") as f:
        for chunk in iter(lambda: r.read(1 << 20), b""):
            f.write(chunk)
            h.update(chunk)
            done += len(chunk)
            pct = done * 100 // size
            if pct // 10 != shown and size > 10_000_000 and sys.stderr.isatty():
                shown = pct // 10
                sys.stderr.write(f"  {pct}%\n")
    if done != size or h.hexdigest() != want:
        os.remove(part)
        raise SystemExit(f"gpt2_by_hand: {name} from {url} did not match the SHA-256 Hugging Face "
                         f"publishes ({want}); nothing was computed. Run it again.")
    os.replace(part, dest)


def weights_folder():
    """A folder holding all three files, each matching its published SHA-256."""
    for snap in hf_snapshots():
        if all(verified(os.path.join(snap, n), n) for n in FILES):
            return snap, "your Hugging Face cache"
    folder = os.path.join(os.path.expanduser("~"), ".cache", "gpt2-by-hand", REVISION)
    os.makedirs(folder, exist_ok=True)
    for name in FILES:
        if not verified(os.path.join(folder, name), name):
            try:
                download(name, folder)
            except OSError as e:
                raise SystemExit(f"gpt2_by_hand: could not download {name} from huggingface.co: {e}")
    return folder, "~/.cache/gpt2-by-hand"


def load_safetensors(path):
    """name -> float32 array, read straight from the file: 8 bytes of header length, a JSON
    header naming each tensor's dtype, shape and byte range, then the raw little-endian floats."""
    with open(path, "rb") as f:
        n = struct.unpack("<Q", f.read(8))[0]
        header = json.loads(f.read(n))
    raw = np.memmap(path, dtype=np.uint8, mode="r", offset=8 + n)
    out = {}
    for name, t in header.items():
        if name == "__metadata__":
            continue
        if t["dtype"] != "F32":
            raise SystemExit(f"gpt2_by_hand: {name} is {t['dtype']}, expected F32")
        start, end = t["data_offsets"]
        out[name] = np.frombuffer(raw, dtype="<f4", count=(end - start) // 4, offset=start).reshape(t["shape"])
    return out


# ---------------------------------------------------------------------------------------------
# Part 1: the tokenizer. GPT-2's byte-level BPE, from vocab.json and merges.txt.
# ---------------------------------------------------------------------------------------------

def byte_alphabet():
    """GPT-2 gives each of the 256 byte values a printable character, so a token is a string.
    A space byte becomes 'Ġ', which is why tokens that start a new word begin with it."""
    keep = list(range(0x21, 0x7F)) + list(range(0xA1, 0xAD)) + list(range(0xAE, 0x100))   # "!".."~", "¡".."¬", "®".."ÿ"
    chars, extra = keep[:], 0
    for b in range(256):
        if b not in keep:
            keep.append(b)
            chars.append(256 + extra)
            extra += 1
    return {b: chr(c) for b, c in zip(keep, chars)}


def _unicode_classes():
    """Character classes for Unicode letters (L*) and numbers (N*), which GPT-2's split pattern
    names as \\p{L} and \\p{N}; Python's re module has no \\p, so the classes are built here."""
    spans = {"L": [], "N": []}
    run_kind, run_start = None, 0
    for cp in range(sys.maxunicode + 2):
        kind = unicodedata.category(chr(cp))[0] if cp <= sys.maxunicode else None
        kind = kind if kind in spans else None
        if kind != run_kind:
            if run_kind:
                spans[run_kind].append((run_start, cp - 1))
            run_kind, run_start = kind, cp
    fmt = lambda a, b: f"\\U{a:08x}" if a == b else f"\\U{a:08x}-\\U{b:08x}"
    return {k: "".join(fmt(a, b) for a, b in v) for k, v in spans.items()}


class Tokenizer:
    def __init__(self, vocab_path, merges_path):
        with open(vocab_path, encoding="utf-8") as f:
            self.ids = json.load(f)
        self.tokens = {i: t for t, i in self.ids.items()}
        with open(merges_path, encoding="utf-8") as f:
            lines = [ln.rstrip("\n") for ln in f if ln.strip() and not ln.startswith("#version")]
        self.rank = {tuple(ln.split(" ")): i for i, ln in enumerate(lines)}
        self.to_char = byte_alphabet()
        self.to_byte = {c: b for b, c in self.to_char.items()}
        cls = _unicode_classes()
        L, N = cls["L"], cls["N"]
        # GPT-2's own split pattern: contractions, letters, numbers, other symbols, whitespace.
        self.split = re.compile(r"'s|'t|'re|'ve|'m|'ll|'d| ?[" + L + r"]+| ?[" + N + r"]+| ?[^\s" + L + N +
                                r"]+|\s+(?!\S)|\s+")
        self.cache = {}

    def bpe(self, word):
        """Merge the adjacent pair with the lowest merge rank, again and again, until no pair
        in the word is in merges.txt. What is left are the tokens."""
        if word in self.cache:
            return self.cache[word]
        parts = list(word)
        while len(parts) > 1:
            best = min(range(len(parts) - 1), key=lambda i: self.rank.get((parts[i], parts[i + 1]), 1 << 60))
            pair = (parts[best], parts[best + 1])
            if pair not in self.rank:
                break
            merged, i = [], 0
            while i < len(parts):
                if i < len(parts) - 1 and (parts[i], parts[i + 1]) == pair:
                    merged.append(parts[i] + parts[i + 1])
                    i += 2
                else:
                    merged.append(parts[i])
                    i += 1
            parts = merged
        self.cache[word] = parts
        return parts

    def encode(self, text):
        """Split the text with the pattern, turn each piece's UTF-8 bytes into characters, run BPE
        on each piece alone, and look every resulting token up in vocab.json. The one special
        token, <|endoftext|>, is kept whole, as Hugging Face's tokenizer keeps it."""
        out = []
        for n, part in enumerate(text.split(ENDOFTEXT)):
            if n:
                out.append(self.ids[ENDOFTEXT])
            for piece in self.split.findall(part):
                word = "".join(self.to_char[b] for b in piece.encode("utf-8"))
                out.extend(self.ids[t] for t in self.bpe(word))
        return out

    def text(self, token_id):
        """The text a token stands for. A token that is part of one character shows its bytes."""
        raw = bytes(self.to_byte[c] for c in self.tokens[token_id])
        return raw.decode("utf-8", errors="backslashreplace")


def shown(text):
    """A token in quotes, with its leading space visible: " it" is the word it after a space."""
    return '"' + text.replace("\n", "\\n").replace("\t", "\\t") + '"'


# ---------------------------------------------------------------------------------------------
# Part 2 and 3: the forward pass, every step in float64.
# ---------------------------------------------------------------------------------------------

def layer_norm(x, gain, bias):
    mean = x.mean(-1, keepdims=True)
    var = ((x - mean) ** 2).mean(-1, keepdims=True)
    return (x - mean) / np.sqrt(var + EPS) * gain + bias


def gelu(x):
    """GPT-2's GELU, the tanh approximation it was trained with."""
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2.0 / np.pi) * (x + 0.044715 * x ** 3)))


def softmax(x):
    e = np.exp(x - x.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)


class GPT2:
    def __init__(self, folder):
        self.w = load_safetensors(os.path.join(folder, "model.safetensors"))
        self.tok = Tokenizer(os.path.join(folder, "vocab.json"), os.path.join(folder, "merges.txt"))
        self.table = self.w["wte.weight"]      # 50,257 x 768: one row per token, also the output layer

    def p(self, name):
        return self.w[name].astype(np.float64)

    def forward(self, ids, every_row=True):
        """Returns the residual stream after each block, shape (12, n, 768), and the attention
        weights, shape (12 blocks, 12 heads, n, n): row i is what token i read from tokens 0..i.
        every_row=False keeps only the last token's row, shape (12, 12, 1, n), to save memory."""
        n = len(ids)
        if not 0 < n <= 1024:
            raise SystemExit(f"gpt2_by_hand: GPT-2 small reads 1 to 1,024 tokens, this is {n}")
        x = self.table[ids].astype(np.float64) + self.p("wpe.weight")[:n]
        future = np.triu(np.ones((n, n), dtype=bool), 1)
        streams, attention = [], []
        for b in range(BLOCKS):
            pre = f"h.{b}."
            h = layer_norm(x, self.p(pre + "ln_1.weight"), self.p(pre + "ln_1.bias"))
            qkv = h @ self.p(pre + "attn.c_attn.weight") + self.p(pre + "attn.c_attn.bias")
            q, k, v = (m.reshape(n, HEADS, HEAD_WIDTH).transpose(1, 0, 2) for m in np.split(qkv, 3, axis=-1))
            scores = q @ k.transpose(0, 2, 1) / np.sqrt(HEAD_WIDTH)
            scores[:, future] = -np.inf          # a token never reads the tokens after it
            weights = softmax(scores)            # (heads, n, n), each row sums to 1
            mixed = (weights @ v).transpose(1, 0, 2).reshape(n, WIDTH)
            x = x + mixed @ self.p(pre + "attn.c_proj.weight") + self.p(pre + "attn.c_proj.bias")
            h = layer_norm(x, self.p(pre + "ln_2.weight"), self.p(pre + "ln_2.bias"))
            hidden = gelu(h @ self.p(pre + "mlp.c_fc.weight") + self.p(pre + "mlp.c_fc.bias"))
            x = x + hidden @ self.p(pre + "mlp.c_proj.weight") + self.p(pre + "mlp.c_proj.bias")
            streams.append(x)
            attention.append(weights if every_row else weights[:, -1:, :])
        return np.stack(streams), np.stack(attention)

    def output_layer(self, x):
        """Final layer norm, then a dot product with every row of the token table: one score
        (logit) per vocabulary entry."""
        h = layer_norm(x, self.p("ln_f.weight"), self.p("ln_f.bias"))
        return h @ self.table.T.astype(np.float64)

    def logits(self, ids):
        """The model's final logits at every position, shape (n, 50257). The tests compare these
        against Hugging Face's GPT2LMHeadModel."""
        streams, _ = self.forward(ids)
        return self.output_layer(streams[-1])


# ---------------------------------------------------------------------------------------------
# The readout.
# ---------------------------------------------------------------------------------------------

def readout(model, sentence, head=None):
    tok = model.tok
    ids = tok.encode(sentence)
    if not ids:
        raise SystemExit("gpt2_by_hand: the sentence is empty")
    n, last = len(ids), len(ids) - 1
    words = [shown(tok.text(i)) for i in ids]
    streams, attn = model.forward(ids, every_row=False)
    attn = attn[:, :, -1, :]                              # (12 blocks, 12 heads, n): the last token's rows
    lens = model.output_layer(streams[:, last, :])     # (12, 50257): the guess if it stopped after block b
    lens_p = softmax(lens)
    out = []
    say = out.append

    say(f"gpt2_by_hand · GPT-2 small, 124M parameters · {shown(sentence)}")
    say("")
    say(f"PART 1  the lookup table: {n} token{'s' if n != 1 else ''}. Each ID is a row number in the 50,257 x 768 token table,")
    say("        and that row of 768 numbers is what the blocks receive")
    wid = max(len(w) for w in words)
    for i, (t, w) in enumerate(zip(ids, words)):
        row = model.table[t]
        say(f"  {i:>3}  {w:<{wid}}  id {t:>5}  row [{row[0]:+.4f}, {row[1]:+.4f}, {row[2]:+.4f}, ... 765 more]")
    say("        before block 0, each row gets its position's row added, from the 1,024 x 768 position table")

    say("")
    say(f"PART 2  the 12 blocks, read at the last token {words[last]}. Blocks and heads count from 0")
    say(f"  {'block':<6} {'pulled most from, 12 heads averaged':<36} {'strongest single head':<32} guess if it stopped here")
    for b in range(BLOCKS):
        row = attn[b, :, :last]                          # (12 heads, earlier tokens)
        guess = int(lens[b].argmax())
        g = f"{shown(tok.text(guess))} {lens_p[b, guess]:.3f}"
        if n > 1:
            avg = row.mean(0)
            j = int(avg.argmax())
            hh, jj = np.unravel_index(int(row.argmax()), row.shape)
            a, s = f"{words[j]} {avg[j]:.3f}", f"{b}.{hh} on {words[jj]} {row[hh, jj]:.3f}"
        else:
            a = s = "-, no earlier token"
        say(f"  {b:<6} {a:<36} {s:<32} {g}")
    if n > 1:
        sink = attn[:, :, 0]
        say(f"  {words[0]}, the first token, took {sink.mean():.3f} of the last token's attention averaged over all "
            f"144 heads, and {int((sink > 0.5).sum())}")
        say("  heads gave it more than half: an attention sink. Every head must spend all of its weight, and a head")
        say("  with nothing to fetch parks it on the first token. Add --head B.H to see one head's whole row")

    final, probs = lens[-1], lens_p[-1]
    top = np.argsort(-final)[:5]
    say("")
    say("PART 3  the output layer: block 11's vector scored against all 50,257 rows of the token table,")
    say("        then softmax turns the scores (logits) into probabilities")
    for r, t in enumerate(top, 1):
        t = int(t)
        say(f"  {r}  {shown(tok.text(t)):<14} id {t:>5}  logit {final[t]:8.3f}  probability {probs[t]:.3f}")
    say(f"  pick  {shown(tok.text(int(top[0])))}, the most likely next token: what greedy decoding writes next")

    if head is not None:
        b, h = head
        row = attn[b, h, :]
        say("")
        say(f"HEAD {b}.{h}  every weight the last token {words[last]} gave, including to itself, summing to {row.sum():.3f}")
        for i in range(n):
            say(f"  {i:>3}  {words[i]:<{wid}}  {row[i]:.3f}")
    return "\n".join(out)


def main(argv):
    head = None
    if "--head" in argv:
        i = argv.index("--head")
        m = re.fullmatch(r"(\d+)\.(\d+)", argv[i + 1] if i + 1 < len(argv) else "")
        if not m or int(m.group(1)) >= BLOCKS or int(m.group(2)) >= HEADS:
            print("--head takes block.head, each 0 to 11, for example --head 4.3")
            return 2
        head = (int(m.group(1)), int(m.group(2)))
        argv = argv[:i] + argv[i + 2:]
    if "--version" in argv:
        print(__version__)
        return 0
    if any(a in ("-h", "--help") for a in argv):
        print(__doc__.strip())
        return 0
    flags = [a for a in argv if a.startswith("--")]
    if flags:
        print(f"unknown flag {flags[0]}; run with --help")
        return 2
    sentence = " ".join(argv) if argv else EXAMPLE      # unquoted words are joined back into one sentence
    if not sentence.strip():
        print("give it a sentence, for example: python3 gpt2_by_hand.py \"The cat sat on the\"")
        return 2
    folder, where = weights_folder()
    sys.stderr.write(f"weights: openai-community/gpt2 at {REVISION[:7]}, SHA-256 verified, from {where}\n")
    model = GPT2(folder)
    print(readout(model, sentence, head))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
