#!/bin/bash
# 墨语言 (Mo) 构建脚本
#   ./build.sh seed        汇编 Stage0 编译器（手写 x86-64 汇编）
#   ./build.sh self [CC]   用 CC 编译 src/compiler.mo（默认 bin/seed）
#   ./build.sh all         seed → self
set -e
cd "$(dirname "$0")"
ROOT=$PWD

seed() {
  echo "== 汇编 Stage0 seed 编译器 =="
  ( cd src/asm && for f in base lex sym expr stmt main; do as -o "$f.o" "$f.s"; done
    ld -o ../../bin/seed base.o lex.o sym.o expr.o stmt.o main.o
    rm -f *.o )
  echo "   -> bin/seed"
}

self() {
  local CC=${1:-bin/seed}
  echo "== 用 $CC 编译 src/compiler.mo =="
  rm -rf /tmp/mobuild && mkdir -p /tmp/mobuild
  cp src/compiler.mo /tmp/mobuild/test.mo
  if [ "$CC" = "bin/seed" ]; then
    ( cd /tmp/mobuild && "$ROOT/bin/seed" test.mo out.elf )
  else
    ( cd /tmp/mobuild && "$ROOT/$CC" )
  fi
  cp /tmp/mobuild/out.elf bin/moc
  # 🔴 记下这一版 bin/moc 是**由哪份源码**编出来的。
  #    变异脚本（switchmut / formut / ...）收尾时只还原源码，而
  #    `cp 备份 src/compiler.mo` 与上一次构建常常落在同一秒 —— make 只
  #    看 mtime，会认为 bin/moc 仍更新而跳过重建，于是跑完变异脚本后
  #    整个项目一直在用一个**被改坏的编译器**跑测试（v1.136 的
  #    "empty case: got 0, want 42" 就是这样来的）。
  #    projcheck 第 8 项拿这个文件比对：源码干净 ≠ 产物干净。
  md5sum src/compiler.mo | cut -d' ' -f1 > bin/moc.srcmd5
  echo "   -> bin/moc"
}

case "$1" in
  seed) seed ;;
  self) self "${2:-bin/seed}" ;;
  all)  seed; self bin/seed ;;
  *) echo "用法: $0 {seed|self [编译器]|all}"; exit 1 ;;
esac
