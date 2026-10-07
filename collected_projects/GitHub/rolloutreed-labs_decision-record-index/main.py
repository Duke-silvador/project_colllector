"""Group architecture decision records by declared status."""
import argparse,csv,io,json,math,re
from collections import Counter
from datetime import date,datetime
from pathlib import Path

def analyze(data):
    groups={}
    for row in data['records']:groups.setdefault(row.get('status','unknown'),[]).append(row['id'])
    return {key:sorted(value) for key,value in sorted(groups.items())}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input',type=Path,help='UTF-8 JSON input file')
    parser.add_argument('--explain',action='store_true',help='Send the local report to the configured chat gateway')
    args=parser.parse_args()
    report=analyze(json.loads(args.input.read_text(encoding='utf-8')))
    if args.explain:
        from gateway_client import explain
        print(explain(report))
    else:print(json.dumps(report,ensure_ascii=False,indent=2))
