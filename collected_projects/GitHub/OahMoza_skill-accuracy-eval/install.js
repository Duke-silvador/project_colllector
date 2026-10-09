#!/usr/bin/env node
'use strict';
/*
 * skill-accuracy-eval 兜底安装脚本
 *
 * 官方推荐使用 Vercel CLI：npx skills add OahMoza/skill-accuracy-eval
 *   —— 支持 80+ 智能体平台、选技能(-s)、选平台(-a)、全局/项目(-g)、symlink/copy 交互选择。
 *
 * 本脚本只服务官方工具未覆盖的场景（如豆包）或自定义目录：
 *   npx github:OahMoza/skill-accuracy-eval --dir <技能根目录>
 */
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const NAME = 'skill-accuracy-eval';
const ITEMS = ['SKILL.md', 'references', 'assets'];

function copyDir(s, d) {
  fs.mkdirSync(d, { recursive: true });
  for (const e of fs.readdirSync(s, { withFileTypes: true })) {
    const a = path.join(s, e.name);
    const b = path.join(d, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}
function copyItem(s, d) {
  if (fs.statSync(s).isDirectory()) copyDir(s, d);
  else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); }
}

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
if (args.includes('--help') || args.includes('-h') || dirIdx === -1) {
  console.log('官方推荐（选技能/平台/全局项目/软链）：npx skills add OahMoza/skill-accuracy-eval');
  console.log('本脚本仅兜底官方未覆盖平台（如豆包）：npx github:OahMoza/skill-accuracy-eval --dir <技能根目录>');
  process.exit(0);
}
const dest = path.join(args[dirIdx + 1], NAME);
console.log('skill-accuracy-eval 安装到: ' + dest);
for (const it of ITEMS) {
  const s = path.join(SRC, it);
  if (!fs.existsSync(s)) { console.error('错误: 技能包缺少文件 ' + it); process.exit(1); }
  copyItem(s, path.join(dest, it));
}
console.log('安装完成。用法：向支持技能的 agent 提问"评测某技能的准确性"并触发 skill-accuracy-eval。');
