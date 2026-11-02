"""Run a stable benchmark and three-arm ablation report.

LLM calls are disabled by default. Pass --enable-llm to explicitly load .env and
allow live provider requests in the hybrid arm.
"""
import argparse
import hashlib
import json
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--target', default='JavaScript', choices=['JavaScript', 'Python'])
parser.add_argument('--output', default='evaluation_result.json')
parser.add_argument('--repeats', type=int, default=1)
parser.add_argument('--enable-llm', action='store_true')
args = parser.parse_args()
if not 1 <= args.repeats <= 10:
    parser.error('--repeats must be between 1 and 10')

if args.enable_llm:
    from dotenv import load_dotenv
    load_dotenv(ROOT / '.env', override=False)

from backend.benchmark import run_benchmark, run_experiment
from backend.llm_fallback import fallback_status
from backend.rules import RULE_TABLE_VERSION


def _sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _version(command):
    try:
        return subprocess.check_output(command, text=True, stderr=subprocess.STDOUT).strip()
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None


def _implementation_sha256():
    digest = hashlib.sha256()
    paths = sorted((ROOT / 'backend').glob('*.py')) + [Path(__file__), ROOT / 'data' / 'external_task_cases.jsonl']
    for path in paths:
        digest.update(path.relative_to(ROOT).as_posix().encode('utf-8'))
        digest.update(b'\0')
        digest.update(path.read_bytes())
        digest.update(b'\0')
    return digest.hexdigest()


record = {
    'schema_version': '2.0',
    'runner': 'evaluate.py',
    'runtime': {'python': platform.python_version(), 'node': _version(['node', '--version'])},
    'inputs': {
        'task_cases_sha256': _sha256(ROOT / 'data' / 'external_task_cases.jsonl'),
        'supported_subset_sha256': _sha256(ROOT / 'data' / 'supported_subset.json'),
        'implementation_sha256': _implementation_sha256(),
    },
    'settings': {
        'target': args.target,
        'repeats': args.repeats,
        'llm_enabled': args.enable_llm,
        'dotenv_loaded': args.enable_llm,
        'rule_table_version': RULE_TABLE_VERSION,
    },
    'llm_configuration': (
        fallback_status(enabled=True)
        if args.enable_llm
        else {'configured': False, 'enabled_for_request': False, 'dotenv_loaded': False}
    ),
    'benchmark': run_benchmark(args.target),
    'experiment': run_experiment(args.target, repeats=args.repeats, enable_llm=args.enable_llm),
}
output = Path(args.output)
if not output.is_absolute():
    output = ROOT / output
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(record, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({'output': str(output), 'target': args.target, 'llm_enabled': args.enable_llm}, indent=2))
