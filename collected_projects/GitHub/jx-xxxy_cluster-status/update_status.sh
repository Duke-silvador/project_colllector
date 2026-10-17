#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-.}"
OUT_FILE="$OUT_DIR/index.html"
mkdir -p "$OUT_DIR"

html_escape() {
  sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' \
      -e 's/"/\&quot;/g' -e "s/'/\&#39;/g"
}

status_class() {
  case "$1" in
    RUNNING|COMPLETING) printf 'running' ;;
    PENDING|CONFIGURING) printf 'pending' ;;
    FAILED|CANCELLED|TIMEOUT|OUT_OF_MEMORY|NODE_FAIL) printf 'failed' ;;
    *) printf 'other' ;;
  esac
}

status_label() {
  case "$1" in
    RUNNING) printf '运行中' ;;
    PENDING) printf '排队中' ;;
    COMPLETING) printf '收尾中' ;;
    FAILED|CANCELLED|TIMEOUT|OUT_OF_MEMORY|NODE_FAIL) printf '异常/结束' ;;
    *) printf '%s' "$1" ;;
  esac
}

short_workdir() {
  case "$1" in
    /home/jiangxin/*) printf '%s' "${1#/home/jiangxin/}" ;;
    /home/jiangxin) printf '主目录' ;;
    *) printf '%s' "$1" ;;
  esac
}

format_duration() {
  local raw="$1" days=0 hours=0 minutes=0
  if [[ "$raw" =~ ^([0-9]+)-([0-9]{1,2}):([0-9]{2}):[0-9]{2}$ ]]; then
    days=$((10#${BASH_REMATCH[1]}))
    hours=$((10#${BASH_REMATCH[2]}))
    minutes=$((10#${BASH_REMATCH[3]}))
  elif [[ "$raw" =~ ^([0-9]+):([0-9]{2}):[0-9]{2}$ ]]; then
    hours=$((10#${BASH_REMATCH[1]}))
    minutes=$((10#${BASH_REMATCH[2]}))
    days=$((hours / 24))
    hours=$((hours % 24))
  elif [[ "$raw" =~ ^([0-9]+):[0-9]{2}$ ]]; then
    minutes=$((10#${BASH_REMATCH[1]}))
    hours=$((minutes / 60))
    minutes=$((minutes % 60))
    days=$((hours / 24))
    hours=$((hours % 24))
  else
    printf '%s' "$raw"
    return
  fi
  printf '%d天%02d时%02d分' "$days" "$hours" "$minutes"
}

history_class() {
  case "$1" in
    COMPLETED*) printf 'completed' ;;
    CANCELLED*|FAILED*|TIMEOUT*|OUT_OF_MEMORY*|NODE_FAIL*) printf 'failed' ;;
    *) printf 'other' ;;
  esac
}

history_label() {
  case "$1" in
    COMPLETED*) printf '完成' ;;
    CANCELLED*) printf '已取消' ;;
    FAILED*) printf '失败' ;;
    TIMEOUT*) printf '超时' ;;
    OUT_OF_MEMORY*) printf '内存不足' ;;
    NODE_FAIL*) printf '节点失败' ;;
    *) printf '%s' "$1" ;;
  esac
}

node_label() {
  case "$1" in
    idle*) printf '空闲' ;;
    mix*) printf '混合' ;;
    alloc*) printf '已分配' ;;
    down*|drain*|fail*) printf '不可用' ;;
    *) printf '%s' "$1" ;;
  esac
}

now="$(date '+%Y-%m-%d %H:%M:%S')"
queue_file="$(mktemp)"
history_file="$(mktemp)"
node_file="$(mktemp)"
trap 'rm -f "$queue_file" "$history_file" "$node_file"' EXIT

# Only the authenticated user's jobs and accounting history are collected.
# No other users' task data is sent to the public repository.
squeue -h -u "${USER:?}" -o '%i|%j|%T|%M|%R|%C|%Z|%D' > "$queue_file"
sacct -X -u "${USER:?}" -S "$(date -d '2 days ago' '+%Y-%m-%dT%H:%M:%S')" \
  --format=JobIDRaw,JobName,State,Elapsed,End,AllocTRES,WorkDir,NodeList,ExitCode \
  --parsable2 --noheader > "$history_file" 2>/dev/null || true
sinfo -h -N -o '%N|%t|%C' > "$node_file" 2>/dev/null || true

total=0
running=0
pending=0
other=0
rows=""

while IFS='|' read -r job_id job_name state runtime location allocated_cores workdir nodes; do
  [ -n "${job_name:-}" ] || continue
  total=$((total + 1))
  case "$state" in
    RUNNING|COMPLETING) running=$((running + 1)) ;;
    PENDING|CONFIGURING) pending=$((pending + 1)) ;;
    *) other=$((other + 1)) ;;
  esac
  class="$(status_class "$state")"
  label="$(status_label "$state")"
  escaped_workdir="$(short_workdir "$workdir" | html_escape)"
  rows="$rows
    <article class=\"job-card\">
      <div class=\"job-main\"><div class=\"job-title\"><span class=\"job-dot $class\"></span><strong>$(printf '%s' "$job_name" | html_escape)</strong><small class=\"job-id\">#$(printf '%s' "$job_id" | html_escape)</small></div><span class=\"state $class\">$label</span></div>
      <div class=\"facts\"><span><em>运行时间</em><b>$(format_duration "$runtime" | html_escape)</b></span><span><em>分配核数</em><b>$(printf '%s' "$allocated_cores" | html_escape)</b></span><span><em>节点数</em><b>$(printf '%s' "$nodes" | html_escape)</b></span></div>
      <div class=\"location\"><span>节点 / 排队原因</span><b>$(printf '%s' "$location" | html_escape)</b></div>
      <div class=\"workdir\" title=\"$escaped_workdir\"><span>投递目录</span><b>$escaped_workdir</b></div>
    </article>"
done < "$queue_file"

if [ "$total" -eq 0 ]; then
  rows='<div class="empty">当前没有排队或运行中的任务</div>'
fi

history_rows=""
history_count=0
history_limit=10
while IFS='|' read -r history_id history_name history_state history_elapsed history_end history_tres history_workdir history_nodes history_exit; do
  [ -n "${history_id:-}" ] || continue
  case "$history_state" in
    RUNNING*|PENDING*|CONFIGURING*|COMPLETING*|SUSPENDED*) continue ;;
  esac
  history_count=$((history_count + 1))
  history_cpu="$(printf '%s' "$history_tres" | sed -n 's/.*cpu=\([0-9][0-9]*\).*/\1/p')"
  [ -n "$history_cpu" ] || history_cpu='-'
  history_class_name="$(history_class "$history_state")"
  history_label_text="$(history_label "$history_state")"
  history_end_display="$(printf '%s' "$history_end" | sed 's/T/ /')"
  history_short_dir="$(short_workdir "$history_workdir" | html_escape)"
  history_rows="$history_rows
    <article class=\"history-card\">
      <div class=\"history-main\"><div><strong>$(printf '%s' "$history_name" | html_escape)</strong><small>#$(printf '%s' "$history_id" | html_escape)</small></div><span class=\"history-state $history_class_name\">$history_label_text</span></div>
      <div class=\"history-meta\"><span>结束 <b>$(printf '%s' "$history_end_display" | html_escape)</b></span><span>耗时 <b>$(format_duration "$history_elapsed" | html_escape)</b></span><span>分配核数 <b>$(printf '%s' "$history_cpu" | html_escape)</b></span></div>
      <div class=\"history-dir\"><b>$history_short_dir</b></div>
    </article>"
  [ "$history_count" -lt "$history_limit" ] || break
done < <(LC_ALL=C sort -t '|' -k5,5r -k1,1nr "$history_file")

if [ "$history_count" -eq 0 ]; then
  history_rows='<div class="empty">近两天没有已结束任务记录</div>'
fi

node_rows=""
node_count=0
while IFS='|' read -r node_name node_state cpu_state; do
  [ -n "${node_name:-}" ] || continue
  IFS='/' read -r node_alloc node_idle node_other node_total <<EOF_CPU
$cpu_state
EOF_CPU
  node_count=$((node_count + 1))
  node_label_text="$(node_label "$node_state")"
  node_percent="$(awk -v a="$node_alloc" -v t="$node_total" 'BEGIN { if (t > 0) printf "%.1f", a/t*100; else print 0 }')"
  node_rows="$node_rows
    <article class=\"node-card\"><div class=\"node-head\"><strong>$(printf '%s' "$node_name" | html_escape)</strong><span class=\"node-state $node_state\">$node_label_text</span></div><div class=\"node-cpu\"><div><b>$(printf '%s' "$node_idle" | html_escape)</b><span>空闲核</span></div><div><b>$(printf '%s' "$node_alloc" | html_escape)</b><span>已用核</span></div><div><b>$(printf '%s' "$node_total" | html_escape)</b><span>总核数</span></div></div><div class=\"bar\"><i style=\"width:${node_percent}%\"></i></div></article>"
done < "$node_file"

if [ "$node_count" -eq 0 ]; then
  node_rows='<div class="empty">暂时无法读取节点资源</div>'
fi

cat > "$OUT_FILE" <<EOF
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="300">
  <title>集群任务状态</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:#f3f6fc; color:#192743; }
    * { box-sizing:border-box; } body { margin:0; padding:28px 14px 40px; background:radial-gradient(circle at 8% 0%,#e6efff 0,transparent 35%),#f3f6fc; }
    .wrap { max-width:790px; margin:auto; } .header { display:flex; justify-content:space-between; gap:16px; align-items:end; margin-bottom:20px; }
    h1 { margin:0; font-size:28px; letter-spacing:-.03em; } .header-actions { display:flex; align-items:center; gap:10px; } .updated { color:#70809a; font-size:13px; white-space:nowrap; }
    .refresh { border:1px solid #d6e0ee; border-radius:999px; padding:7px 11px; color:#38547d; background:#fff; font:inherit; font-size:12px; cursor:pointer; box-shadow:0 4px 12px #1a2b4a0a; }
    .refresh:hover { background:#f7faff; border-color:#b9cbea; } .refresh:active { transform:translateY(1px); }
    .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
    .stat { background:#fff; border:1px solid #e1e8f4; border-radius:16px; padding:14px 16px; text-align:center; box-shadow:0 8px 22px #1a2b4a0a; }
    .stat span { display:block; color:#6b7c98; font-size:12px; margin-bottom:4px; } .stat b { font-size:24px; color:#1b3968; }
    .job-card { width:100%; min-width:0; background:#fff; border:1px solid #e1e8f4; border-radius:18px; padding:17px 18px; margin:11px 0; box-shadow:0 8px 22px #1a2b4a0a; }
    .job-main,.facts,.location,.workdir { display:flex; justify-content:space-between; gap:12px; align-items:center; } .job-main strong { overflow-wrap:anywhere; }
    .job-title { display:flex; gap:9px; align-items:center; min-width:0; } .job-dot { width:9px; height:9px; border-radius:50%; flex:none; } .job-dot.running { background:#12a66a; box-shadow:0 0 0 4px #e6f7ee; } .job-dot.pending { background:#e2a100; box-shadow:0 0 0 4px #fff3d8; } .job-dot.failed { background:#d92d20; box-shadow:0 0 0 4px #feeceb; } .job-dot.other { background:#7b8aa3; box-shadow:0 0 0 4px #edf1f7; } .job-id { color:#9aa6b8; font:11px ui-monospace,SFMono-Regular,Consolas,monospace; }
    .state { border-radius:999px; padding:4px 9px; font-size:12px; white-space:nowrap; } .running { color:#087443; background:#e6f7ee; } .pending { color:#996300; background:#fff3d8; } .failed { color:#b42318; background:#feeceb; } .other { color:#44546f; background:#edf1f7; }
    .facts { justify-content:flex-start; flex-wrap:wrap; margin-top:16px; padding-top:13px; border-top:1px solid #edf1f6; } .facts span { min-width:112px; } .facts em,.location span,.workdir span { display:block; color:#7485a1; font-size:11px; font-style:normal; margin-bottom:3px; } .facts b,.location b,.workdir b { color:#304565; font-size:13px; font-weight:600; } .facts small { color:#9aa6b8; font-size:10px; margin-left:4px; }
    .location,.workdir { justify-content:flex-start; align-items:baseline; margin-top:11px; gap:10px; color:#34435c; font-size:13px; } .location span,.workdir span { min-width:80px; margin:0; } .location b { overflow-wrap:anywhere; } .workdir { display:grid; grid-template-columns:80px minmax(0,1fr); align-items:start; padding:10px 12px; border-radius:10px; background:#f5f8fd; } .workdir b { min-width:0; white-space:normal; overflow-wrap:anywhere; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:12px; line-height:1.55; }
    .section-head { display:flex; justify-content:space-between; align-items:baseline; margin:25px 2px 10px; } h2 { margin:0; font-size:18px; letter-spacing:-.02em; } .section-head span { color:#8b98ac; font-size:12px; }
    .node-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; } .node-card,.history-card { width:100%; min-width:0; background:#fff; border:1px solid #e1e8f4; border-radius:16px; padding:15px 16px; box-shadow:0 8px 22px #1a2b4a0a; } .node-head,.history-main { display:flex; justify-content:space-between; align-items:center; gap:10px; } .node-state,.history-state { border-radius:999px; padding:4px 8px; color:#53627a; background:#edf1f7; font-size:11px; white-space:nowrap; } .node-state.idle { color:#087443; background:#e6f7ee; } .node-state.mix { color:#996300; background:#fff3d8; } .node-state.alloc { color:#b42318; background:#feeceb; } .node-cpu { display:flex; justify-content:space-around; gap:20px; margin-top:16px; text-align:center; } .node-cpu div { display:flex; flex-direction:column; gap:2px; } .node-cpu b { font-size:20px; color:#1b3968; } .node-cpu span { color:#70809a; font-size:11px; } .bar { height:6px; margin-top:14px; overflow:hidden; border-radius:99px; background:#edf1f7; } .bar i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,#78b8ff,#4e86f7); }
    .history-list { display:grid; width:100%; grid-template-columns:minmax(0,1fr); gap:10px; } .history-main > div { min-width:0; overflow-wrap:anywhere; } .history-main strong { font-size:14px; } .history-main small { color:#8090aa; margin-left:8px; font:11px ui-monospace,SFMono-Regular,Consolas,monospace; } .history-state.completed { color:#087443; background:#e6f7ee; } .history-state.failed { color:#b42318; background:#feeceb; } .history-meta { display:flex; flex-wrap:wrap; gap:12px 20px; margin-top:11px; color:#72839d; font-size:12px; } .history-meta b { color:#304565; font-weight:600; } .history-dir { width:100%; min-width:0; margin-top:10px; padding:9px 10px; border-radius:9px; background:#f5f8fd; color:#53627a; font-size:12px; line-height:1.55; overflow-wrap:anywhere; } .history-dir b { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-weight:500; }
    .empty { background:#fff; border:1px dashed #c8d2e2; border-radius:16px; padding:28px; text-align:center; color:#70809a; }
    .foot { color:#8291a8; font-size:12px; margin-top:18px; text-align:center; } @media (max-width:520px) { body { padding:20px 10px 30px; } .header { display:block; } .header-actions { justify-content:space-between; margin-top:8px; } .updated { display:block; } .summary { gap:7px; } .stat { padding:12px 8px; } .stat b { font-size:21px; } .job-card,.history-card { padding:15px; } .facts { gap:10px 16px; } .facts span { min-width:98px; } .location { display:block; } .location span { margin-bottom:4px; } .workdir { grid-template-columns:minmax(0,1fr); gap:3px; } .workdir b { display:block; } .node-grid { grid-template-columns:minmax(0,1fr); } .node-cpu { gap:24px; } .history-meta { gap:6px 14px; } }
  </style>
</head>
<body><main class="wrap">
  <header class="header"><h1>集群任务状态</h1><div class="header-actions"><div class="updated">更新于 $now</div><button class="refresh" type="button" onclick="window.location.href=window.location.pathname+'?refresh='+Date.now()" aria-label="手动刷新页面">↻ 手动刷新</button></div></header>
  <section class="summary" aria-label="任务统计">
    <div class="stat"><span>全部任务</span><b>$total</b></div><div class="stat"><span>运行中</span><b>$running</b></div><div class="stat"><span>排队中</span><b>$pending</b></div>
  </section>
  <section aria-label="任务列表">$rows</section>
  <section aria-label="节点资源"><div class="section-head"><h2>节点资源</h2><span>每 5 分钟更新</span></div><div class="node-grid">$node_rows</div></section>
  <section aria-label="近两天任务历史"><div class="section-head"><h2>近两天任务历史</h2><span>最近 $history_count 条已结束任务</span></div><div class="history-list">$history_rows</div></section>
  <div class="foot">仅显示当前账号的 Slurm 任务 · 目录从用户目录后开始 · 页面每 5 分钟自动刷新</div>
</main></body></html>
EOF
