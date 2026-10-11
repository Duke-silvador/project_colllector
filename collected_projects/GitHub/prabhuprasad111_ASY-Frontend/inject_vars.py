import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

anchor = r'const calcExecConv = filteredExecutiveTable\.reduce\(\(a,\s*c\)\s*=>\s*a\s*\+\s*parseAmt\(c\.conv\),\s*0\)\.toFixed\(1\);'

new_calcs = r"""const calcExecConv = filteredExecutiveTable.reduce((a, c) => a + parseAmt(c.conv), 0).toFixed(1);
  const calcExecTourists = filteredExecutiveTable.reduce((a, c) => a + (c.tour || 0), 0);
  const calcExecTrain = filteredExecutiveTable.reduce((a, c) => a + (c.train || 0), 0);
  const calcExecProj = filteredExecutiveTable.reduce((a, c) => a + (c.proj || 0), 0);
  const calcExecNtfp = filteredExecutiveTable.reduce((a, c) => a + parseAmt(c.ntfp), 0).toFixed(1);
  const calcExecEdc = filteredExecutiveTable.reduce((a, c) => a + (c.edc || 0), 0);
  const calcExecShg = filteredExecutiveTable.reduce((a, c) => a + (c.shg || 0), 0);"""

if not 'calcExecNtfp' in content:
    content = re.sub(anchor, new_calcs, content)
    with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Variables added.")
else:
    print("Variables already exist.")
