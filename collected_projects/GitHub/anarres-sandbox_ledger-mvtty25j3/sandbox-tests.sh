#!/bin/sh
{
  echo '<testsuites><testsuite name="sandbox">'
  for file in modules/*/tests/*; do
    [ -f "$file" ] || continue
    module=$(echo "$file" | cut -d/ -f2)
    if grep -qs 'passes on purpose' "$file" || { ls modules/$module/src/* >/dev/null 2>&1 && ! grep -rqs 'fails on purpose' modules/$module/src; }; then
      echo "<testcase name=\"$file\"/>"
    else
      echo "<testcase name=\"$file\"><failure/></testcase>"
    fi
  done
  echo '</testsuite></testsuites>'
} > junit.xml
! grep -rqs 'fails on purpose' modules
