"""cool-cache-box — Database engineer · PostgreSQL · remote

拿来练手的小仓库
"""
import sys
from collections import Counter


def collect(stream):
    return [line.rstrip("\n") for line in stream if line.strip()]


def report(lines):
    c = Counter(lines)
    for k, v in c.most_common():
        print(f"{v:>4}  {k}")
    print(f"---\n{len(c)} unique / {len(lines)} lines")


def main() -> int:
    data = collect(sys.stdin)
    if not data:
        print("no input", file=sys.stderr)
        return 1
    report(data)
    return 0


if __name__ == "__main__":
    sys.exit(main())
