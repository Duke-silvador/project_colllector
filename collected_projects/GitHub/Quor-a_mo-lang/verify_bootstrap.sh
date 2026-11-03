#!/bin/bash
# 自举闭环验证
#
# 两层验证：
#   A) seed（Stage0，手写汇编编译器，语言子集）自洽：seed 编 seed 子集程序并跑对；
#      seed 编完整 compiler.mo 需要 compiler.mo 限于 seed 子集 —— 当前 compiler.mo
#      已含 struct/enum/const/match 全家（远超子集），故完整链验证用 moc 三级链。
#   B) moc 三级自举链：moc 编 src → 产物编 src → 再编，三级字节一致。
#      退出码 0 = 闭环成立。
set -e
cd "$(dirname "$0")"
ROOT=$PWD

echo "== A) seed 子集自洽 =="
bash tools/seedsmoke.sh || { echo "❌ seed 冒烟失败"; exit 1; }

if [ ! -f "$ROOT/bin/moc" ]; then
  echo "== B) 跳过（无 bin/moc：全新环境只有 seed Stage0。构建 bin/moc 需前代编译器，见 CHANGELOG 自举链说明） =="
  echo "✅ seed Stage0 自洽（降级模式）"
  exit 0
fi

echo "== B) moc 三级自举链 =="
rm -rf /tmp/moboot && mkdir -p /tmp/moboot/{s1,s2,s3}
cat src/mo/compiler_part*.mo > src/compiler.mo
cp src/compiler.mo /tmp/moboot/s1/test.mo
( cd /tmp/moboot/s1 && "$ROOT/bin/moc" test.mo out.elf )
cp src/compiler.mo /tmp/moboot/s2/test.mo
cp /tmp/moboot/s1/out.elf /tmp/moboot/s2/moc1 && chmod +x /tmp/moboot/s2/moc1
( cd /tmp/moboot/s2 && ./moc1 test.mo out.elf )
cp src/compiler.mo /tmp/moboot/s3/test.mo
cp /tmp/moboot/s2/out.elf /tmp/moboot/s3/moc2 && chmod +x /tmp/moboot/s3/moc2
( cd /tmp/moboot/s3 && ./moc2 test.mo out.elf )
m1=$(md5sum /tmp/moboot/s1/out.elf | cut -d' ' -f1)
m2=$(md5sum /tmp/moboot/s2/out.elf | cut -d' ' -f1)
m3=$(md5sum /tmp/moboot/s3/out.elf | cut -d' ' -f1)
echo "Stage1: $m1"
echo "Stage2: $m2"
echo "Stage3: $m3"
if [ "$m1" = "$m2" ] && [ "$m2" = "$m3" ]; then
  echo "✅ 自举闭环成立：moc 三级产物字节完全一致"
else
  echo "❌ 自举不一致"; exit 1
fi
