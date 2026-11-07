#!/usr/bin/env python3

###
# Generates build files for the project.
# This file also includes the project configuration,
# such as compiler flags and the object matching status.
#
# Usage:
#   python3 configure.py
#   ninja
#
# Append --help to see available options.
###

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List

from tools.project import (
    Object,
    ProgressCategory,
    ProjectConfig,
    calculate_progress,
    generate_build,
    is_windows,
)

# Game versions
DEFAULT_VERSION = 0
VERSIONS = [
    "GUBE69",  # 0
]

parser = argparse.ArgumentParser()
parser.add_argument(
    "mode",
    choices=["configure", "progress"],
    default="configure",
    help="script mode (default: configure)",
    nargs="?",
)
parser.add_argument(
    "-v",
    "--version",
    choices=VERSIONS,
    type=str.upper,
    default=VERSIONS[DEFAULT_VERSION],
    help="version to build",
)
parser.add_argument(
    "--build-dir",
    metavar="DIR",
    type=Path,
    default=Path("build"),
    help="base build directory (default: build)",
)
parser.add_argument(
    "--binutils",
    metavar="BINARY",
    type=Path,
    help="path to binutils (optional)",
)
parser.add_argument(
    "--compilers",
    metavar="DIR",
    type=Path,
    help="path to compilers (optional)",
)
parser.add_argument(
    "--map",
    action="store_true",
    help="generate map file(s)",
)
parser.add_argument(
    "--debug",
    action="store_true",
    help="build with debug info (non-matching)",
)
if not is_windows():
    parser.add_argument(
        "--wrapper",
        metavar="BINARY",
        type=Path,
        help="path to wibo or wine (optional)",
    )
parser.add_argument(
    "--dtk",
    metavar="BINARY | DIR",
    type=Path,
    help="path to decomp-toolkit binary or source (optional)",
)
parser.add_argument(
    "--objdiff",
    metavar="BINARY | DIR",
    type=Path,
    help="path to objdiff-cli binary or source (optional)",
)
parser.add_argument(
    "--sjiswrap",
    metavar="EXE",
    type=Path,
    help="path to sjiswrap.exe (optional)",
)
parser.add_argument(
    "--ninja",
    metavar="BINARY",
    type=Path,
    help="path to ninja binary (optional)",
)
parser.add_argument(
    "--verbose",
    action="store_true",
    help="print verbose output",
)
parser.add_argument(
    "--non-matching",
    dest="non_matching",
    action="store_true",
    help="builds equivalent (but non-matching) or modded objects",
)
parser.add_argument(
    "--warn",
    dest="warn",
    type=str,
    choices=["all", "off", "error"],
    help="how to handle warnings",
)
parser.add_argument(
    "--no-progress",
    dest="progress",
    action="store_false",
    help="disable progress calculation",
)
args = parser.parse_args()

config = ProjectConfig()
config.version = str(args.version)
version_num = VERSIONS.index(config.version)

# Apply arguments
config.build_dir = args.build_dir
config.dtk_path = args.dtk
config.objdiff_path = args.objdiff
config.binutils_path = args.binutils
config.compilers_path = args.compilers
config.generate_map = args.map
config.non_matching = args.non_matching
config.sjiswrap_path = args.sjiswrap
config.ninja_path = args.ninja
config.progress = args.progress
if not is_windows():
    config.wrapper = args.wrapper
# Don't build asm unless we're --non-matching
if not config.non_matching:
    config.asm_dir = None

# Tool versions
config.binutils_tag = "2.42-2"
config.compilers_tag = "20251118"
config.dtk_tag = "v1.8.3"
config.objdiff_tag = "v3.6.1"
config.sjiswrap_tag = "v1.2.2"
config.wibo_tag = "1.0.3"

# Project
config.config_path = Path("config") / config.version / "config.yml"
config.check_sha_path = Path("config") / config.version / "build.sha1"
config.asflags = [
    "-mgekko",
    "--strip-local-absolute",
    "-I include",
    f"-I build/{config.version}/include",
    f"--defsym BUILD_VERSION={version_num}",
]
# SN Systems ProDG toolchain (ngccc / ngcld) instead of Metrowerks, as in the
# Bustin' Out decomp (same engine): https://github.com/daftblazer/bustin-out-decomp
config.prodg = True
config.prodg_ldscript = Path("config") / config.version / "ldscript.ld"
config.ldflags = []

# Use for any additional files that should cause a re-configure when modified
config.reconfig_deps = []

# Optional numeric ID for decomp.me preset
# Can be overridden in libraries or objects
config.scratch_preset_id = None

# Base flags for ngccc (GCC 2.95.2, SN build), taken from the Bustin' Out decomp
cflags_base = [
    "-O2",
    "-G8",
    # Vtables go to .rodata and inline/template functions are emitted as local
    # copies in every translation unit
    "-fno-weak",
    # Template repository: instances are emitted once, as global symbols, in the
    # unit chosen at link time (see tools/prodg_cc.py)
    "-frepo",
    "-fno-implement-inlines",
    # Plain `char` is signed (the engine was ported from PS2)
    "-fsigned-char",
    "-Iinclude",
    f"-Ibuild/{config.version}/include",
    f"-DBUILD_VERSION={version_num}",
    f"-DVERSION_{config.version}",
]

if args.debug:
    cflags_base.extend(["-g", "-DDEBUG=1"])
else:
    cflags_base.append("-DNDEBUG=1")

if args.warn == "all":
    cflags_base.append("-Wall")
elif args.warn == "off":
    cflags_base.append("-w")
elif args.warn == "error":
    cflags_base.append("-Werror")

cflags_runtime = cflags_base
cflags_rel = cflags_base

# Metrowerks flags for the code linked in prebuilt: the Dolphin SDK and the CodeWarrior runtime
# (their functions save LR before creating the frame, as the older CodeWarrior compilers do)
cflags_mw = [
    "-nodefaults",
    "-proc gekko",
    "-align powerpc",
    "-enum int",
    "-fp hardware",
    "-Cpp_exceptions off",
    "-O4,p",
    "-inline auto",
    '-pragma "cats off"',
    '-pragma "warn_notinlined off"',
    "-maxerrors 1",
    "-nosyspath",
    "-RTTI off",
    "-fp_contract on",
    "-str reuse",
    "-multibyte",
    "-i include",
    f"-i build/{config.version}/include",
    f"-DBUILD_VERSION={version_num}",
    f"-DVERSION_{config.version}",
    "-DNDEBUG=1",
]

config.linker_version = "ProDG/3.7"
config.shift_jis = False


# Helper function for Dolphin libraries
def DolphinLib(lib_name: str, objects: List[Object]) -> Dict[str, Any]:
    return {
        "lib": lib_name,
        "mw_version": "GC/1.2.5n",
        "cflags": cflags_mw,
        "progress_category": "sdk",
        "objects": objects,
    }


# Helper function for REL script objects
def Rel(lib_name: str, objects: List[Object]) -> Dict[str, Any]:
    return {
        "lib": lib_name,
        "mw_version": config.linker_version,
        "cflags": cflags_rel,
        "progress_category": "game",
        "objects": objects,
    }


Matching = True                   # Object matches and should be linked
NonMatching = False               # Object does not match and should not be linked
Equivalent = config.non_matching  # Object should be linked when configured with --non-matching


# Object is only matching for specific versions
def MatchingFor(*versions):
    return config.version in versions


config.warn_missing_config = True
config.warn_missing_source = False
config.libs = [
    {
        "lib": "game",
        "mw_version": config.linker_version,
        "cflags": cflags_base,
        "progress_category": "game",
        "objects": [
            Object(NonMatching, "auto/text_800034C0.c"),
            Object(NonMatching, "auto/AptShaderWord.c"),
            Object(NonMatching, "auto/AptViewer.c"),
            Object(NonMatching, "auto/text_8000C5C8.c"),
            Object(NonMatching, "auto/ESimsCam.c"),
            Object(NonMatching, "auto/CameraManager.c"),
            Object(NonMatching, "auto/ECheatLookup.c"),
            Object(NonMatching, "auto/text_8001A244.c"),
            Object(NonMatching, "auto/ESimsDataManager.c"),
            Object(NonMatching, "auto/text_8001E78C.c"),
            Object(NonMatching, "auto/text_80023C00.c"),
            Object(NonMatching, "auto/EIWallPart.c"),
            Object(NonMatching, "auto/ESim.c"),
            Object(NonMatching, "auto/ESpriteRenderMan.c"),
            Object(NonMatching, "auto/EyeToyClient.c"),
            Object(NonMatching, "auto/GameData.c"),
            Object(NonMatching, "auto/EGlobal.c"),
            Object(NonMatching, "auto/text_8004F1BC.c"),
            Object(NonMatching, "auto/HouseRecon.c"),
            Object(NonMatching, "auto/EFloorShdTblNode.c"),
            Object(NonMatching, "auto/BBI.c"),
            Object(NonMatching, "auto/ISimInstance.c"),
            Object(NonMatching, "auto/PlumbBob.c"),
            Object(NonMatching, "auto/text_8008C46C.c"),
            Object(NonMatching, "auto/ScrollingTextBox.c"),
            Object(NonMatching, "auto/SimImageMaker.c"),
            Object(NonMatching, "auto/text_8009E9D4.c"),
            Object(NonMatching, "auto/SimsMemCardWrap.c"),
            Object(NonMatching, "auto/text_800ABD80.c"),
            Object(NonMatching, "auto/text_800B3040.c"),
            Object(NonMatching, "auto/CUnlockDisplayObject.c"),
            Object(NonMatching, "auto/CDirtyXmlNode.c"),
            Object(NonMatching, "auto/CTGFileImpl.c"),
            Object(NonMatching, "auto/WrapperPaneBase.c"),
            Object(NonMatching, "auto/BString.c"),
            Object(NonMatching, "auto/BString2.c"),
            Object(NonMatching, "auto/CTGDump.c"),
            Object(NonMatching, "auto/QuickStringSet.c"),
            Object(NonMatching, "auto/cBoxX.c"),
            Object(NonMatching, "auto/ChainResFile.c"),
            Object(NonMatching, "auto/FamilyImpl.c"),
            Object(NonMatching, "auto/Interaction.c"),
            Object(NonMatching, "auto/text_801178D4.c"),
            Object(NonMatching, "auto/cXMTObjectImpl.c"),
            Object(NonMatching, "auto/NeighborhoodImpl.c"),
            Object(NonMatching, "auto/NghResFile.c"),
            Object(NonMatching, "auto/cXObjectImpl.c"),
            Object(NonMatching, "auto/ObjectModuleImpl.c"),
            Object(NonMatching, "auto/ObjSelector.c"),
            Object(NonMatching, "auto/text_8016F87C.c"),
            Object(NonMatching, "auto/cXPersonImpl.c"),
            Object(NonMatching, "auto/QuickResFile.c"),
            Object(NonMatching, "auto/RoomManager.c"),
            Object(NonMatching, "auto/SpacePartition.c"),
            Object(NonMatching, "auto/SeqResFile.c"),
            Object(NonMatching, "auto/TTabScratchEntry.c"),
            Object(NonMatching, "auto/ObjectDataBehaviorTree.c"),
            Object(NonMatching, "auto/TreeTableQuickData.c"),
            Object(NonMatching, "auto/CasListener.c"),
            Object(NonMatching, "auto/text_801C9904.c"),
            Object(NonMatching, "auto/CasTweakTool.c"),
            Object(NonMatching, "auto/text_801D4B84.c"),
            Object(NonMatching, "auto/text_801D4E2C.c"),
            Object(NonMatching, "auto/text_801D50D4.c"),
            Object(NonMatching, "auto/text_801D5404.c"),
            Object(NonMatching, "auto/text_801D573C.c"),
            Object(NonMatching, "auto/text_801D59E4.c"),
            Object(NonMatching, "auto/text_801D5C8C.c"),
            Object(NonMatching, "auto/text_801D5F34.c"),
            Object(NonMatching, "auto/text_801D626C.c"),
            Object(NonMatching, "auto/text_801D6514.c"),
            Object(NonMatching, "auto/text_801D67BC.c"),
            Object(NonMatching, "auto/text_801D6A64.c"),
            Object(NonMatching, "auto/INVTarget.c"),
            Object(NonMatching, "auto/text_802323F0.c"),
            Object(NonMatching, "auto/InteractorModule.c"),
            Object(NonMatching, "auto/text_8023EA34.c"),
            Object(NonMatching, "libsn/text_8023EBD8.c"),
            Object(NonMatching, "clib/text_80241A98.c"),
            Object(NonMatching, "engine/text_802781E4.c"),
            Object(NonMatching, "engine/AptActionInterpreter.c"),
            Object(NonMatching, "engine/AptCharacterAnimation.c"),
            Object(NonMatching, "engine/EAStringC.c"),
            Object(NonMatching, "engine/EFileSystem.c"),
            Object(NonMatching, "engine/EMat4.c"),
            Object(NonMatching, "engine/EString.c"),
            Object(NonMatching, "engine/EA.c"),
            Object(NonMatching, "engine/ENgcFile.c"),
            Object(NonMatching, "engine/EEngine.c"),
            Object(NonMatching, "engine/text_802E1A84.c"),
            Object(NonMatching, "engine/E3DWindow.c"),
            Object(NonMatching, "engine/EGraphics.c"),
            Object(NonMatching, "engine/text_802EF524.c"),
            Object(NonMatching, "engine/EILight.c"),
            Object(NonMatching, "engine/EInstance.c"),
            Object(NonMatching, "engine/text_802F1AD4.c"),
            Object(NonMatching, "engine/EIPortalPointLight.c"),
            Object(NonMatching, "engine/text_802F3374.c"),
            Object(NonMatching, "engine/text_802F3E74.c"),
            Object(NonMatching, "engine/ERC.c"),
            Object(NonMatching, "engine/EShader.c"),
            Object(NonMatching, "engine/ESubModelShader.c"),
            Object(NonMatching, "engine/EWindow.c"),
            Object(NonMatching, "engine/Emitter.c"),
            Object(NonMatching, "engine/text_8030CB8C.c"),
            Object(NonMatching, "engine/EController.c"),
            Object(NonMatching, "engine/EFrameAllocGroup.c"),
            Object(NonMatching, "engine/ETweak.c"),
            Object(NonMatching, "engine/EVibrate.c"),
            Object(NonMatching, "engine/ERCharacter.c"),
            Object(NonMatching, "engine/text_8031BDE0.c"),
            Object(NonMatching, "engine/EResourceLoaderImpl.c"),
            Object(NonMatching, "engine/text_8031E810.c"),
            Object(NonMatching, "engine/EResPrefetch.c"),
            Object(NonMatching, "engine/EResPrefetchFile.c"),
            Object(NonMatching, "engine/text_80320408.c"),
            Object(NonMatching, "engine/text_80324168.c"),
            Object(NonMatching, "engine/ERModel.c"),
            Object(NonMatching, "engine/ERQuickdata.c"),
            Object(NonMatching, "engine/ERTexture.c"),
            Object(NonMatching, "engine/HDDThread.c"),
            Object(NonMatching, "engine/text_80332DE0.c"),
            Object(NonMatching, "engine/text_80332F70.c"),
            Object(NonMatching, "engine/text_803331B8.c"),
            Object(NonMatching, "engine/text_80333360.c"),
            Object(NonMatching, "engine/text_80333504.c"),
            Object(NonMatching, "engine/EControllerManager.c"),
            Object(NonMatching, "engine/text_80335020.c"),
            Object(NonMatching, "engine/text_803351E8.c"),
            Object(NonMatching, "engine/text_8033536C.c"),
            Object(NonMatching, "engine/text_80335530.c"),
            Object(NonMatching, "engine/text_803356D4.c"),
            Object(NonMatching, "engine/text_803357FC.c"),
            Object(NonMatching, "engine/text_803359A0.c"),
            Object(NonMatching, "engine/text_80335BFC.c"),
            Object(NonMatching, "engine/EResourceManager.c"),
            Object(NonMatching, "engine/text_80338CB0.c"),
            Object(NonMatching, "engine/text_80338E40.c"),
            Object(NonMatching, "engine/EyeToyManager.c"),
            Object(NonMatching, "engine/ENgcAudio.c"),
            Object(NonMatching, "engine/ENgcAudioSampleManager.c"),
            Object(NonMatching, "engine/ENgcClockMan.c"),
            Object(NonMatching, "engine/text_8033E370.c"),
            Object(NonMatching, "engine/ENgcEngine.c"),
            Object(NonMatching, "engine/ENgcGraphics.c"),
            Object(NonMatching, "engine/text_8034058C.c"),
            Object(NonMatching, "engine/ENgcMemoryCard.c"),
            Object(NonMatching, "engine/ENgcRC.c"),
            Object(NonMatching, "engine/ENgcRenderer.c"),
            Object(NonMatching, "engine/ENgcTexture.c"),
            Object(NonMatching, "engine/EStringRedBlackTreeNoCase.c"),
            Object(NonMatching, "engine/text_8036A768.c"),
            Object(NonMatching, "engine/ScalarDecomp.c"),
            Object(NonMatching, "engine/EFontCharacter.c"),
            Object(NonMatching, "engine/text_8036D4B8.c"),
            Object(NonMatching, "engine/text_8036D7C8.c"),
            Object(NonMatching, "engine/ETexture.c"),
            Object(NonMatching, "engine/text_803710DC.c"),
            Object(NonMatching, "engine/text_803715F8.c"),
            Object(NonMatching, "engine/text_80371AC4.c"),
            Object(NonMatching, "engine/text_80372470.c"),
            Object(NonMatching, "engine/text_80372928.c"),
            Object(NonMatching, "engine/ENgcAram.c"),
            Object(NonMatching, "engine/EMemoryWriteStream.c"),
            Object(NonMatching, "engine/text_80375C5C.c"),
            Object(NonMatching, "misc/text_8038FC80.c"),
            Object(NonMatching, "libs/text_80398934.c"),
        ],
    },
    DolphinLib(
        "dolphin",
        [
            Object(NonMatching, "sdk/text_802500FC.c"),
            Object(NonMatching, "sdk/text_80378E78.c"),
            Object(NonMatching, "runtime/text_80390B40.c"),
        ],
    ),
]


# Optional callback to adjust link order. This can be used to add, remove, or reorder objects.
# This is called once per module, with the module ID and the current link order.
#
# For example, this adds "dummy.c" to the end of the DOL link order if configured with --non-matching.
# "dummy.c" *must* be configured as a Matching (or Equivalent) object in order to be linked.
def link_order_callback(module_id: int, objects: List[str]) -> List[str]:
    # Don't modify the link order for matching builds
    if not config.non_matching:
        return objects
    if module_id == 0:  # DOL
        return objects + ["dummy.c"]
    return objects


# Uncomment to enable the link order callback.
# config.link_order_callback = link_order_callback


# Optional extra categories for progress tracking
# Adjust as desired for your project
config.progress_categories = [
    ProgressCategory("game", "Game Code"),
    ProgressCategory("sdk", "SDK Code"),
]
config.progress_each_module = args.verbose
# Optional extra arguments to `objdiff-cli report generate`
config.progress_report_args = [
    # Marks relocations as mismatching if the target value is different
    # Default is "functionRelocDiffs=none", which is most lenient
    # "--config functionRelocDiffs=data_value",
]

if args.mode == "configure":
    # Write build.ninja and objdiff.json
    generate_build(config)
elif args.mode == "progress":
    # Print progress information
    calculate_progress(config)
else:
    sys.exit("Unknown mode: " + args.mode)
