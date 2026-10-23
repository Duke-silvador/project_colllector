"""Static checks of the GuidedCoding skill in guided_coding/ (revision 22).

Checks that the skill's files are present and consistent: the SKILL.md frontmatter, every
${CLAUDE_SKILL_DIR}/<file> reference, every "SKILL.md section" and "section" reference, the
version line in each file, and that no retired name remains. Standard library only.
How the procedure behaves is checked by running it in Claude Code (see EVIDENCE.md).
Run: python3 tst_guided_coding.py   (prints OK, or the failures and exits 1)
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.join(HERE, "guided_coding")
FILES = ["SKILL.md", "BATCH.md", "SETUP.md", "REVIEWER.md", "LOG.md"]
VERSION = "1.3"


def read(name):
  with open(os.path.join(SKILL_DIR, name)) as f:
    return f.read()


def frontmatter(text):
  m = re.match(r"---\n(.*?)\n---\n", text, re.S)
  if m is None:
    return None
  fields = {}
  for line in m.group(1).splitlines():
    key, sep, value = line.partition(":")
    if sep:
      fields[key.strip()] = value.strip()
  return fields


def section_numbers(text):
  return set(re.findall(r"^## (\d+)\.", text, re.M))


def run():
  failures = []
  for name in FILES:
    if not os.path.isfile(os.path.join(SKILL_DIR, name)):
      failures.append("missing file: guided_coding/%s" % name)
  if failures:
    return failures
  texts = dict((name, read(name)) for name in FILES)
  fm = frontmatter(texts["SKILL.md"])
  if fm is None:
    failures.append("SKILL.md: no frontmatter")
  else:
    if fm.get("name") != "gc":
      failures.append("SKILL.md: name is %r, expected 'gc'" % fm.get("name"))
    if fm.get("disable-model-invocation") != "true":
      failures.append("SKILL.md: disable-model-invocation must be true")
    if not fm.get("description"):
      failures.append("SKILL.md: empty description")
  sections = dict((name, section_numbers(text)) for name, text in texts.items())
  for name, text in texts.items():
    for ref in re.findall(r"\$\{CLAUDE_SKILL_DIR\}/([A-Za-z_]+\.md)", text):
      if ref not in FILES:
        failures.append("%s: reference to missing file %s" % (name, ref))
    for other, num in re.findall(r"\b([A-Z]+\.md) §(\d+)", text):
      if other not in sections:
        failures.append("%s: reference to section %s of unknown file %s" % (name, num, other))
      elif num not in sections[other]:
        failures.append("%s: %s section %s does not exist" % (name, other, num))
    plain = re.sub(r"\b[A-Z]+\.md §\d+", "", text)
    for num in re.findall(r"§(\d+)", plain):
      if num not in sections[name]:
        failures.append("%s: section %s does not exist in this file" % (name, num))
    if not re.search(r"[Vv]ersion %s\b" % re.escape(VERSION), text):
      failures.append("%s: no version %s line" % (name, VERSION))
    for retired in ("/lean", "LEAN_NOTES.md is the", "Lean GuidedCoding"):
      if retired in text:
        failures.append("%s: retired name %r" % (name, retired))
  return failures


def self_test():
  """The checks must catch a broken cross-file section reference (outside review of revision 22)."""
  original = read
  def broken(name):
    text = original(name)
    if name == "BATCH.md":
      text = text.replace("## 3. Stopping", "## 9. Stopping")
    return text
  globals()["read"] = broken
  try:
    caught = [f for f in run() if "BATCH.md section 3" in f]
  finally:
    globals()["read"] = original
  return [] if caught else ["self-test: a broken reference to BATCH.md section 3 was not caught"]


if __name__ == "__main__":
  failures = run() + self_test()
  for failure in failures:
    print("FAIL: " + failure)
  if failures:
    sys.exit(1)
  print("OK")
