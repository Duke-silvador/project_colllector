#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stellaris 存档拆分与合并工具 (纯 Python)
==========================================
群星存档 (.sav) 本质是一个 ZIP 文件，内含两个文本文件:
  - gamestate : Paradox Clausewitz 引擎格式的完整游戏状态 (通常几十 MB)
  - meta      : 存档元信息 (版本、日期、玩家、DLC 等)

本工具提供以下能力:
  info     查看 .sav 存档概要信息
  split    将 .sav 预拆分为若干细粒度文本单元 (按顶层键 / 国家 / pop / 舰队 ...)
  merge    将拆分目录重新组装为 .sav
  list     列出拆分目录中的所有单元
  extract  提取并打印某个单元的内容
  verify   校验拆分-合并的可逆性 (字节级比对)

设计要点 (字节级可逆):
  - 拆分时保留原始文本切片 (不重新格式化), 仅做物理切分
  - index.json 记录顶层语句序列与每个块的"组装配方"
  - 合并时按配方顺序拼接切片即可还原原始 gamestate 字节
  - 集合型块 (country/pop/fleet/...) 拆为 head + 每个子ID + tail 三类文件
  - 非集合块整体保留; 简单赋值合并到 _scalars.txt

文件命名 (符合用户要求 savename_country_1.txt):
  <savename>_scalars.txt            所有顶层简单赋值
  <savename>_<key>.txt               非集合型顶层块 (整块)
  <savename>_<key>__<seq>.txt        重复出现的非集合型顶层块 (加序号)
  <savename>_<key>_head.txt          集合型块的头部 (key={ 及块内非ID属性)
  <savename>_<key>_<id>.txt          集合型块的子项 (\t<id>={...})
  <savename>_<key>_tail.txt          集合型块的尾部 (})
  _meta.txt                          meta 文件原样
  _index.json                        拆分索引 (组装配方)
"""

import argparse
import io
import json
import os
import re
import sys
import zipfile

INDEX_FILE = "_index.json"
META_FILE = "_meta.txt"
SCALARS_FILE = "_scalars.txt"

# 顶层语句起始: 行首 标识符 = ...
TOP_STMT_RE = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*)=')
# 集合子项: 制表符 + 数字ID = {
CHILD_RE = re.compile(r'^\t([0-9]+)=\{')
# 块赋值行: key={
BLOCK_OPEN_RE = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*)=\{')


# ---------------------------------------------------------------------------
# Clausewitz 文本扫描器
# ---------------------------------------------------------------------------

def _strip_strings(line):
    """移除一行中的 "..." 字符串内容, 用于安全地计数大括号深度。
    Clausewitz 字符串不会跨行, 因此逐行处理即可。"""
    out = []
    in_str = False
    esc = False
    for ch in line:
        if in_str:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == '"':
                in_str = False
            # 字符串内字符不计入
        else:
            if ch == '"':
                in_str = True
            else:
                out.append(ch)
    return ''.join(out)


def _find_block_end(lines, start):
    """从 lines[start] 开始 (该行包含 key={), 找到匹配的 } 所在行号 (exclusive end)。
    基于行级括号深度计数, 已排除字符串内括号。"""
    depth = 0
    for i in range(start, len(lines)):
        cleaned = _strip_strings(lines[i])
        depth += cleaned.count('{') - cleaned.count('}')
        if depth <= 0:
            return i + 1
    raise ValueError(f"未找到匹配的 '}}' (起始行 {start + 1})")


def _scan_top_statements(lines):
    """扫描 gamestate, 返回顶层语句列表。
    每项: ('scalar', text) 或 ('block', key, start_line, end_line_exclusive)
    跳过空行与无法识别的行 (归入间隙, 合并时按原样保留)。"""
    statements = []
    gaps = []  # 语句之间的空白/注释行, 记录 (after_index, text)
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        m = TOP_STMT_RE.match(line)
        if m:
            key = m.group(1)
            if '={' in line:
                end = _find_block_end(lines, i)
                statements.append(('block', key, i, end))
                i = end
            else:
                statements.append(('scalar', line))
                i += 1
        else:
            # 空行或非语句行, 收集为 gap
            j = i
            while j < n and not TOP_STMT_RE.match(lines[j]):
                j += 1
            gap_text = ''.join(lines[i:j])
            if gap_text.strip():
                gaps.append((len(statements), gap_text))
            i = j
    return statements, gaps


def _scan_collection_children(lines, start, end):
    """扫描块 [start, end) 内的直接子项。
    返回 (head_lines, children, tail_lines):
      head_lines : 块头 (key={ 行) 及其后的非子项行 (属性), 直到第一个 \t<id>={
      children   : [(id, child_start, child_end), ...]
      tail_lines: 最后一个子项之后到块尾的行 (含 })
    若块内无 \t<id>={ 子项, 返回 (None, [], None) 表示非集合块。"""
    # 块头: start 行是 key={...}
    head_end = start + 1
    children = []
    i = start + 1
    while i < end:
        line = lines[i]
        cm = CHILD_RE.match(line)
        if cm:
            cid = cm.group(1)
            cend = _find_block_end(lines, i)
            children.append((cid, i, cend))
            i = cend
        else:
            i += 1
    if not children:
        return None, [], None
    # head: 从 start 到第一个 child 之前
    first_child_start = children[0][1]
    head_lines = lines[start:first_child_start]
    # tail: 最后一个 child 之后到 end
    last_child_end = children[-1][2]
    tail_lines = lines[last_child_end:end]
    return head_lines, children, tail_lines


# ---------------------------------------------------------------------------
# .sav 读写 (ZIP)
# ---------------------------------------------------------------------------

def read_sav(path):
    """读取 .sav, 返回 (gamestate_text, meta_text)。"""
    with zipfile.ZipFile(path, 'r') as z:
        gs = z.read('gamestate').decode('utf-8')
        meta = z.read('meta').decode('utf-8')
    return gs, meta


def write_sav(path, gamestate_text, meta_text):
    """写入 .sav (ZIP, deflate)。"""
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        z.writestr('gamestate', gamestate_text.encode('utf-8'))
        z.writestr('meta', meta_text.encode('utf-8'))


# ---------------------------------------------------------------------------
# 拆分
# ---------------------------------------------------------------------------

def split_sav(sav_path, out_dir):
    """拆分 .sav 到 out_dir。"""
    sav_name = os.path.splitext(os.path.basename(sav_path))[0]
    os.makedirs(out_dir, exist_ok=True)

    print(f"[*] 读取存档: {sav_path}")
    gs_text, meta_text = read_sav(sav_path)
    print(f"    gamestate: {len(gs_text):,} 字符 | meta: {len(meta_text):,} 字符")

    # 保留原始换行: splitlines(keepends=True)
    lines = gs_text.splitlines(keepends=True)
    statements, gaps = _scan_top_statements(lines)
    n_scalar = sum(1 for s in statements if s[0] == 'scalar')
    n_block = sum(1 for s in statements if s[0] == 'block')
    print(f"[*] 顶层语句: {n_scalar} 简单赋值 + {n_block} 块赋值")

    # 写 meta
    with open(os.path.join(out_dir, META_FILE), 'w', encoding='utf-8') as f:
        f.write(meta_text)

    # 写 scalars (所有简单赋值按序拼接)
    scalar_buf = io.StringIO()
    scalar_count = 0
    for s in statements:
        if s[0] == 'scalar':
            scalar_buf.write(s[1])
            scalar_count += 1
    with open(os.path.join(out_dir, SCALARS_FILE), 'w', encoding='utf-8') as f:
        f.write(scalar_buf.getvalue())

    # 处理每个块
    index_statements = []
    key_counter = {}  # 重复键计数
    total_children = 0
    collection_blocks = 0

    for s in statements:
        if s[0] == 'scalar':
            # scalar 已合并写入 _scalars.txt, index 记录占位
            index_statements.append({"type": "scalar"})
            continue
        _, key, start, end = s
        # 决定文件名基名 (处理重复键)
        cnt = key_counter.get(key, 0)
        key_counter[key] = cnt + 1
        if cnt == 0:
            base = f"{sav_name}_{key}"
            seq_suffix = None
        else:
            base = f"{sav_name}_{key}__{cnt}"
            seq_suffix = cnt

        head_lines, children, tail_lines = _scan_collection_children(lines, start, end)

        if not children:
            # 非集合块: 整块写入一个文件
            block_text = ''.join(lines[start:end])
            fname = f"{base}.txt"
            with open(os.path.join(out_dir, fname), 'w', encoding='utf-8') as f:
                f.write(block_text)
            index_statements.append({
                "type": "block",
                "key": key,
                "seq": seq_suffix,
                "collection": False,
                "file": fname,
            })
        else:
            # 集合块: head + children + tail
            collection_blocks += 1
            total_children += len(children)
            head_text = ''.join(head_lines)
            tail_text = ''.join(tail_lines)
            head_fname = f"{base}_head.txt"
            tail_fname = f"{base}_tail.txt"
            with open(os.path.join(out_dir, head_fname), 'w', encoding='utf-8') as f:
                f.write(head_text)
            with open(os.path.join(out_dir, tail_fname), 'w', encoding='utf-8') as f:
                f.write(tail_text)
            child_files = []
            for cid, cstart, cend in children:
                cfname = f"{base}_{cid}.txt"
                with open(os.path.join(out_dir, cfname), 'w', encoding='utf-8') as f:
                    f.write(''.join(lines[cstart:cend]))
                child_files.append({"id": cid, "file": cfname})
            index_statements.append({
                "type": "block",
                "key": key,
                "seq": seq_suffix,
                "collection": True,
                "head": head_fname,
                "tail": tail_fname,
                "children": child_files,
            })

    # gaps: 语句间的非空内容 (本存档通常无, 但保留以保可逆)
    gap_records = [{"after": idx, "text": txt} for idx, txt in gaps]

    index = {
        "tool": "stellaris_sav_tool",
        "version": 1,
        "savename": sav_name,
        "source": os.path.basename(sav_path),
        "gamestate_chars": len(gs_text),
        "meta_chars": len(meta_text),
        "statement_count": len(statements),
        "scalar_count": scalar_count,
        "block_count": n_block,
        "collection_block_count": collection_blocks,
        "total_child_count": total_children,
        "statements": index_statements,
        "gaps": gap_records,
    }
    with open(os.path.join(out_dir, INDEX_FILE), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"[*] 集合型块: {collection_blocks} 个, 共 {total_children} 个子单元")
    print(f"[+] 拆分完成 -> {out_dir}")
    print(f"    索引: {os.path.join(out_dir, INDEX_FILE)}")
    return index


# ---------------------------------------------------------------------------
# 合并
# ---------------------------------------------------------------------------

def merge_split(in_dir, out_sav):
    """将拆分目录合并为 .sav。"""
    idx_path = os.path.join(in_dir, INDEX_FILE)
    if not os.path.exists(idx_path):
        raise FileNotFoundError(f"找不到索引文件: {idx_path}")
    with open(idx_path, 'r', encoding='utf-8') as f:
        index = json.load(f)

    meta_path = os.path.join(in_dir, META_FILE)
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta_text = f.read()

    scalars_text = ""
    scalars_path = os.path.join(in_dir, SCALARS_FILE)
    if os.path.exists(scalars_path):
        with open(scalars_path, 'r', encoding='utf-8') as f:
            scalars_text = f.read()

    # 重组 gamestate
    buf = io.StringIO()
    scalar_lines = scalars_text.splitlines(keepends=True)
    scalar_idx = 0
    gaps = {g["after"]: g["text"] for g in index.get("gaps", [])}

    stmts = index["statements"]
    for i, st in enumerate(stmts):
        if st["type"] == "scalar":
            if scalar_idx < len(scalar_lines):
                buf.write(scalar_lines[scalar_idx])
                scalar_idx += 1
        else:
            if st.get("collection"):
                head_path = os.path.join(in_dir, st["head"])
                tail_path = os.path.join(in_dir, st["tail"])
                with open(head_path, 'r', encoding='utf-8') as f:
                    buf.write(f.read())
                for child in st["children"]:
                    cpath = os.path.join(in_dir, child["file"])
                    with open(cpath, 'r', encoding='utf-8') as f:
                        buf.write(f.read())
                with open(tail_path, 'r', encoding='utf-8') as f:
                    buf.write(f.read())
            else:
                bpath = os.path.join(in_dir, st["file"])
                with open(bpath, 'r', encoding='utf-8') as f:
                    buf.write(f.read())
        # 插入 gap
        if i in gaps:
            buf.write(gaps[i])

    gs_text = buf.getvalue()

    # 写 .sav
    os.makedirs(os.path.dirname(os.path.abspath(out_sav)), exist_ok=True)
    write_sav(out_sav, gs_text, meta_text)
    print(f"[+] 合并完成 -> {out_sav}")
    print(f"    gamestate: {len(gs_text):,} 字符 | meta: {len(meta_text):,} 字符")
    return gs_text, meta_text


# ---------------------------------------------------------------------------
# info / list / extract / verify
# ---------------------------------------------------------------------------

def info_sav(sav_path):
    """显示存档概要。"""
    gs_text, meta_text = read_sav(sav_path)
    lines = gs_text.splitlines(keepends=True)
    statements, _ = _scan_top_statements(lines)

    # 解析 meta 中的关键字段
    meta_info = {}
    for line in meta_text.splitlines():
        m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)=(.*)$', line)
        if m:
            meta_info[m.group(1)] = m.group(2).strip().strip('"')

    print("=" * 60)
    print(f"存档文件: {sav_path}")
    print("=" * 60)
    print(f"  版本       : {meta_info.get('version', '?')}")
    print(f"  存档名称   : {meta_info.get('name', '?')}")
    print(f"  游戏日期   : {meta_info.get('date', '?')}")
    print(f"  铁人模式   : {meta_info.get('ironman', '?')}")
    print(f"  舰队数     : {meta_info.get('meta_fleets', '?')}")
    print(f"  行星数     : {meta_info.get('meta_planets', '?')}")
    print(f"  gamestate  : {len(gs_text):,} 字符 / {len(lines):,} 行")
    print(f"  meta       : {len(meta_text):,} 字符")
    print("-" * 60)
    print("顶层块统计 (按子项数排序):")
    block_stats = {}
    for s in statements:
        if s[0] == 'block':
            _, key, start, end = s
            head, children, tail = _scan_collection_children(lines, start, end)
            if children:
                block_stats.setdefault(key, [0, 0])
                block_stats[key][0] += 1
                block_stats[key][1] += len(children)
            else:
                block_stats.setdefault(key, [0, 0])
                block_stats[key][0] += 1
    print(f"  {'键':<30} {'块数':>6} {'子项数':>8}")
    for key in sorted(block_stats.keys(), key=lambda k: -block_stats[k][1]):
        bn, cn = block_stats[key]
        print(f"  {key:<30} {bn:>6} {cn:>8}")
    n_scalar = sum(1 for s in statements if s[0] == 'scalar')
    n_block = sum(1 for s in statements if s[0] == 'block')
    print("-" * 60)
    print(f"  合计: {n_scalar} 简单赋值 + {n_block} 块赋值")


def list_split(in_dir):
    """列出拆分目录中的所有单元。"""
    idx_path = os.path.join(in_dir, INDEX_FILE)
    with open(idx_path, 'r', encoding='utf-8') as f:
        index = json.load(f)
    print(f"拆分目录: {in_dir}")
    print(f"源存档  : {index.get('source', '?')}")
    print(f"原始 gamestate: {index.get('gamestate_chars', '?'):,} 字符")
    print(f"集合型块: {index.get('collection_block_count', 0)} | 子单元总数: {index.get('total_child_count', 0)}")
    print("=" * 70)
    print(f"{'#':>4}  {'类型':<8}  {'键':<28}  {'子项':>6}  说明")
    print("-" * 70)
    for i, st in enumerate(index["statements"]):
        if st["type"] == "scalar":
            print(f"{i:>4}  {'scalar':<8}  {'(简单赋值)':<28}  {'':>6}  -> {SCALARS_FILE}")
        else:
            key = st["key"]
            if st.get("seq") is not None:
                key = f"{key}#{st['seq']}"
            if st.get("collection"):
                n = len(st["children"])
                print(f"{i:>4}  {'block':<8}  {key:<28}  {n:>6}  集合 (head+children+tail)")
            else:
                print(f"{i:>4}  {'block':<8}  {key:<28}  {'':>6}  -> {st['file']}")


def extract_unit(in_dir, key, child_id=None):
    """打印拆分目录中指定键或子项的内容。
    参数:
        in_dir  拆分目录
        key     顶层块键名 (如 'country', 'pop', 'fleet')
        child_id 可选, 若为集合块则提取指定子ID
    """
    idx_path = os.path.join(in_dir, INDEX_FILE)
    with open(idx_path, 'r', encoding='utf-8') as f:
        index = json.load(f)

    matches = []
    for i, st in enumerate(index["statements"]):
        if st["type"] == "block" and st["key"] == key:
            matches.append((i, st))

    if not matches:
        print(f"未找到键 '{key}' 的块")
        return

    if child_id is not None:
        # 查找集合块且包含该子ID
        for idx, st in matches:
            if st.get("collection"):
                for child in st["children"]:
                    if child["id"] == child_id:
                        fpath = os.path.join(in_dir, child["file"])
                        with open(fpath, 'r', encoding='utf-8') as f:
                            print(f.read())
                        return
        print(f"键 '{key}' 中未找到子ID {child_id}")
        return

    # 没有 child_id: 打印该键的所有块 (可能多个)
    for idx, st in matches:
        print(f"--- 语句 #{idx} (键 {key}) ---")
        if st.get("collection"):
            # 打印 head + 所有 child + tail 拼接内容
            with open(os.path.join(in_dir, st["head"]), 'r', encoding='utf-8') as f:
                print(f.read(), end='')
            for child in st["children"]:
                with open(os.path.join(in_dir, child["file"]), 'r', encoding='utf-8') as f:
                    print(f.read(), end='')
            with open(os.path.join(in_dir, st["tail"]), 'r', encoding='utf-8') as f:
                print(f.read(), end='')
        else:
            with open(os.path.join(in_dir, st["file"]), 'r', encoding='utf-8') as f:
                print(f.read(), end='')
        print()  # 换行分隔


def verify_sav(original_sav, work_dir=None, verbose=True):
    """验证拆分-合并的可逆性。返回 True/False。"""
    import tempfile
    if work_dir is None:
        work_dir = tempfile.mkdtemp(prefix="sav_verify_")
    split_dir = os.path.join(work_dir, "split")
    merged_sav = os.path.join(work_dir, "merged.sav")

    print(f"[verify] 拆分 {original_sav} -> {split_dir}")
    split_sav(original_sav, split_dir)

    print(f"[verify] 合并 {split_dir} -> {merged_sav}")
    merge_split(split_dir, merged_sav)

    # 读取两者内容比较
    gs_orig, meta_orig = read_sav(original_sav)
    gs_merged, meta_merged = read_sav(merged_sav)

    same_gs = gs_orig == gs_merged
    same_meta = meta_orig == meta_merged
    if verbose:
        print("=" * 60)
        print(f"gamestate 字节一致: {same_gs}")
        print(f"meta      字节一致: {same_meta}")
        if same_gs and same_meta:
            print("[PASS] 拆分-合并可逆性验证通过")
        else:
            print("[FAIL] 拆分-合并存在差异!")
        print(f"临时目录: {work_dir}")
    return same_gs and same_meta


# ---------------------------------------------------------------------------
# 命令行接口
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Stellaris 存档拆分与合并工具 (纯 Python)")
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # info
    p_info = subparsers.add_parser("info", help="查看 .sav 存档概要")
    p_info.add_argument("sav", help=".sav 文件路径")

    # split
    p_split = subparsers.add_parser("split", help="拆分 .sav 到指定目录")
    p_split.add_argument("sav", help=".sav 文件路径")
    p_split.add_argument("-o", "--out-dir", default=None,
                         help="输出目录 (默认: <savename>_split)")

    # merge
    p_merge = subparsers.add_parser("merge", help="将拆分目录合并为 .sav")
    p_merge.add_argument("in_dir", help="拆分目录路径")
    p_merge.add_argument("-o", "--out-sav", default=None,
                         help="输出 .sav 路径 (默认: 拆分目录同级下的 merged.sav)")

    # list
    p_list = subparsers.add_parser("list", help="列出拆分目录中的单元")
    p_list.add_argument("in_dir", help="拆分目录路径")

    # extract
    p_extract = subparsers.add_parser("extract", help="提取指定键或子项内容")
    p_extract.add_argument("in_dir", help="拆分目录路径")
    p_extract.add_argument("key", help="顶层键名 (如 country, pop, fleet)")
    p_extract.add_argument("child_id", nargs="?", default=None,
                           help="可选子ID (仅集合块)")

    # verify
    p_verify = subparsers.add_parser("verify", help="验证拆分-合并可逆性")
    p_verify.add_argument("sav", help="原始 .sav 文件路径")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return

    try:
        if args.command == "info":
            info_sav(args.sav)
        elif args.command == "split":
            out_dir = args.out_dir or (os.path.splitext(args.sav)[0] + "_split")
            split_sav(args.sav, out_dir)
        elif args.command == "merge":
            out_sav = args.out_sav or "merged.sav"
            merge_split(args.in_dir, out_sav)
        elif args.command == "list":
            list_split(args.in_dir)
        elif args.command == "extract":
            extract_unit(args.in_dir, args.key, args.child_id)
        elif args.command == "verify":
            verify_sav(args.sav)
    except Exception as e:
        print(f"[错误] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
