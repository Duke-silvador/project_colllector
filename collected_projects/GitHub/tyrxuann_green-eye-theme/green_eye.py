#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# /// script
# requires-python = ">=3.9"
# dependencies = ["pillow>=10,<13"]
# ///
"""
Green Eye 跨平台入口。

推荐用法（uv 自动提供 Python + Pillow，macOS / Linux / Windows 一致）：
    uv run green_eye.py build
    uv run green_eye.py install

没有 uv 时也可以用系统 Python：
    python3 green_eye.py build --no-preview   # 不生成预览图，不需要 Pillow
    python3 green_eye.py install

子命令：
    build     生成 .icls / .theme.json / jar，并跑完整验收
    check     平台无关的色值验收（需要先 build 生成 palette.json）
    palette   只导出/验收 shared/palette.json，不生成主题
    test      运行 tests/ 下的单元与安装器集成测试
    preview   只重新渲染预览图（需要 Pillow）
    install   跨平台安装 / 卸载（plugin 或 icls-only 模式）
    package   打发布包：jar + 2 个 .icls + INSTALL.txt
    vscode    生成 VS Code 主题并打包 .vsix
    doctor    预检构建产物、字体与安装状态
    bump      统一更新版本号（project_config + VS Code package.json）
    manual    逐项运行真机走查清单并生成报告
    report    生成发布前汇总 build/ref/report.md
    release   发布前全流程（不自动 tag）
    cvd       生成色觉缺陷（CVD）报告
    cvd-variants 生成 A+ CVD Improved 改善版
    clean     清理 __pycache__ / *.pyc / 临时文件
    version   打印版本
"""
import argparse
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "intellij" / "src"
VSCODE_SRC = ROOT / "vscode" / "src"
sys.path.insert(0, str(SRC))
sys.path.insert(0, str(VSCODE_SRC))

import build_pipeline  # noqa: E402
import install as installer  # noqa: E402
import package_release  # noqa: E402
import doctor  # noqa: E402
import versioning  # noqa: E402
import manual_verify  # noqa: E402
import gen_summary_report  # noqa: E402
import cvd_variants  # noqa: E402
import release as release_flow  # noqa: E402
import vscode_build  # noqa: E402
from project_config import VERSION  # noqa: E402


def make_parser():
    ap = argparse.ArgumentParser(
        prog="green_eye.py",
        description="Green Eye 护眼主题：构建、验收、安装、打包")
    ap.add_argument("--version", action="version", version=VERSION)
    sub = ap.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build", help="生成并验收主题")
    p_build.add_argument("--no-preview", action="store_true",
                         help="不生成预览图（不需要 Pillow）")
    p_build.add_argument("--skip-tests", action="store_true",
                         help="跳过安装器集成测试")

    sub.add_parser("check", help="平台无关的色值验收")
    sub.add_parser("palette", help="只导出并验收 shared/palette.json")
    sub.add_parser("test", help="运行 tests/ 下的测试")
    sub.add_parser("preview", help="只重新渲染预览图")
    sub.add_parser("clean", help="清理 __pycache__ / *.pyc / 临时文件")
    p_cvd = sub.add_parser("cvd", help="生成色觉缺陷（CVD）报告")
    p_cvd.add_argument("--preview", action="store_true",
                       help="同时生成 normal/protanopia/deuteranopia 色板图")
    p_cvdv = sub.add_parser("cvd-variants",
                            help="生成 A+ CVD Improved 改善版")
    p_cvdv.add_argument("--no-package", action="store_true")
    p_cvdv.add_argument("--outdir", help="发布包输出目录")
    p_doctor = sub.add_parser("doctor", help="预检构建产物、字体与安装状态")
    p_doctor.add_argument("--json", action="store_true", help="输出 JSON")
    p_bump = sub.add_parser("bump", help="统一更新版本号")
    p_bump.add_argument("version", help="新版本号，例如 1.2.0")
    p_bump.add_argument("--dry-run", action="store_true")
    p_manual = sub.add_parser("manual", help="逐项运行真机走查清单")
    p_manual.add_argument("--list", action="store_true")
    p_manual.add_argument("--answers", help="逗号分隔的 y/n/s 序列")
    p_manual.add_argument("--report", help="报告输出路径")
    p_report = sub.add_parser("report", help="生成发布前汇总")
    p_report.add_argument("--out", help="输出路径")
    p_release = sub.add_parser("release", help="发布前全流程（不自动 tag）")
    p_release.add_argument("version")
    p_release.add_argument("--dry-run", action="store_true")
    p_release.add_argument("--skip-tests", action="store_true")
    p_release.add_argument("--allow-dirty", action="store_true")

    p_install = sub.add_parser("install", help="安装 / 卸载主题")
    p_install.add_argument("--uninstall", action="store_true",
                           help="卸载插件、手工配色副本和禁用记录")
    p_install.add_argument("--icls-only", action="store_true",
                           help="只安装 .icls 配色方案，不装插件")
    p_install.add_argument("--config-dir", help="指定 IntelliJ 配置目录")
    p_install.add_argument("--all", action="store_true",
                           help="处理全部 IntelliJIdea* 配置")
    p_install.add_argument("--yes", "-y", action="store_true", help="不询问")
    p_install.add_argument("--dry-run", "-n", action="store_true",
                           help="只显示计划，不修改文件")

    p_package = sub.add_parser("package", help="打发布包")
    p_package.add_argument("--outdir", help="发布包输出目录（默认 release/）")
    p_package.add_argument("--all", action="store_true",
                           help="同时包含 VS Code .vsix")

    p_vscode = sub.add_parser("vscode", help="生成 VS Code 主题并打包 .vsix")
    p_vscode.add_argument("--no-package", action="store_true",
                          help="只生成 themes/*.json，不打包 .vsix")
    p_vscode.add_argument("--outdir", help="VSIX 输出目录（默认 vscode/dist/）")

    sub.add_parser("version", help="打印版本")
    return ap


def main(argv=None):
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = make_parser().parse_args(argv)

    if args.command == "build":
        return build_pipeline.build(no_preview=args.no_preview,
                                    skip_tests=args.skip_tests)
    if args.command == "check":
        return build_pipeline.check()
    if args.command == "palette":
        return build_pipeline.palette()
    if args.command == "test":
        return build_pipeline.test()
    if args.command == "preview":
        return build_pipeline.preview()
    if args.command == "clean":
        return build_pipeline.clean()
    if args.command == "doctor":
        return doctor.main(["--json"] if args.json else [])
    if args.command == "release":
        return release_flow.run(args.version, dry_run=args.dry_run,
                                skip_tests=args.skip_tests,
                                allow_dirty=args.allow_dirty)
    if args.command == "report":
        return gen_summary_report.main(["--out", args.out] if args.out else [])
    if args.command == "manual":
        answers = args.answers.split(",") if args.answers else None
        return manual_verify.run(list_only=args.list, answers=answers,
                                  report=args.report)
    if args.command == "bump":
        try:
            return versioning.bump(args.version, dry_run=args.dry_run)
        except ValueError as exc:
            print("错误: %s" % exc, file=sys.stderr)
            return 1
    if args.command == "cvd-variants":
        if not (ROOT / "shared" / "palette.json").is_file():
            rc = build_pipeline.palette()
            if rc:
                return rc
        return cvd_variants.build(package=not args.no_package,
                                  outdir=args.outdir)
    if args.command == "cvd":
        if not (ROOT / "shared" / "palette.json").is_file():
            rc = build_pipeline.palette()
            if rc:
                return rc
        return build_pipeline.cvd(preview=args.preview)
    if args.command == "install":
        try:
            return installer.run(
                uninstall=args.uninstall,
                icls_only=args.icls_only,
                config_dir=args.config_dir,
                all_configs=args.all,
                assume_yes=args.yes,
                dry_run=args.dry_run,
            )
        except installer.InstallError as exc:
            print("错误: %s" % exc, file=sys.stderr)
            return 1
    if args.command == "package":
        if args.all:
            if vscode_build.build() != 0:
                return 1
            rc = package_release.package(outdir=args.outdir)
            if rc:
                return rc
            return package_release.package_all(outdir=args.outdir)
        return package_release.package(outdir=args.outdir)
    if args.command == "vscode":
        if not (ROOT / "shared" / "palette.json").is_file():
            rc = build_pipeline.palette()
            if rc:
                return rc
        return vscode_build.build(package=not args.no_package,
                                  outdir=args.outdir)
    if args.command == "version":
        print(VERSION)
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
