"""ctypes bridge from the Streamlit dashboard to the C++ cache hierarchy."""

from __future__ import annotations

import ctypes
import platform
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Union


ROOT = Path(__file__).resolve().parent
STAT_NAMES = ("accesses", "reads", "writes", "hits", "misses", "evictions", "writebacks", "bypasses")
RESULT_NAMES = {-1: "—", 0: "HIT", 1: "MISS", 2: "EVICTION", 3: "BYPASS"}
MAPPING_CODES = {"Direct mapped": 0, "Set associative": 1, "Fully associative": 2}
REPLACEMENT_CODES = {"LRU": 0, "FIFO": 1, "Random": 2}
WRITE_POLICY_CODES = {"Write-back": 0, "Write-through": 1}
ALLOCATION_CODES = {"Write-allocate": 0, "No-write-allocate": 1}


class _LevelConfig(ctypes.Structure):
    _fields_ = [("capacity_bytes", ctypes.c_size_t), ("block_size_bytes", ctypes.c_size_t),
                ("associativity", ctypes.c_size_t), ("mapping", ctypes.c_int),
                ("replacement", ctypes.c_int), ("write_policy", ctypes.c_int),
                ("write_allocate", ctypes.c_int), ("access_latency_cycles", ctypes.c_uint64)]


class _LevelResult(ctypes.Structure):
    _fields_ = [("result", ctypes.c_int), ("set_index", ctypes.c_size_t),
                ("block_number", ctypes.c_uint64)]


class _CacheLine(ctypes.Structure):
    _fields_ = [("set_index", ctypes.c_size_t), ("way", ctypes.c_size_t),
                ("block_number", ctypes.c_uint64), ("tag", ctypes.c_uint64),
                ("dirty", ctypes.c_int)]


def _library_path() -> Path:
    return ROOT / ("libcache_simulator.dylib" if platform.system() == "Darwin"
                   else "cache_simulator.dll" if platform.system() == "Windows"
                   else "libcache_simulator.so")


def _build_library(target: Path) -> None:
    if platform.system() == "Darwin":
        command = ["clang++", "-std=c++17", "-O2", "-dynamiclib", "-fPIC"]
    elif platform.system() == "Windows":
        raise RuntimeError("Automatic C++ library build is currently supported on macOS and Linux.")
    else:
        command = ["c++", "-std=c++17", "-O2", "-shared", "-fPIC"]
    command.extend([str(ROOT / "cache.cpp"), str(ROOT / "cache_c_api.cpp"), "-o", str(target)])
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except FileNotFoundError as exc:
        raise RuntimeError("A C++17 compiler is required. Install Xcode Command Line Tools on macOS.") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("Could not build the C++ engine:\n" + exc.stderr.strip()) from exc


def _load_library() -> ctypes.CDLL:
    path = _library_path()
    sources = [ROOT / name for name in ("cache.cpp", "cache.hpp", "cache_c_api.cpp", "cache_c_api.h")]
    if not path.exists() or max(source.stat().st_mtime for source in sources) > path.stat().st_mtime:
        _build_library(path)
    library = ctypes.CDLL(str(path))
    config_pointer = ctypes.POINTER(_LevelConfig)
    result_pointer = ctypes.POINTER(_LevelResult)
    library.cache_create.argtypes = [config_pointer, ctypes.c_size_t, ctypes.c_uint64]
    library.cache_create.restype = ctypes.c_void_p
    library.cache_destroy.argtypes = [ctypes.c_void_p]
    library.cache_destroy.restype = None
    library.cache_access.argtypes = [ctypes.c_void_p, ctypes.c_uint64, ctypes.c_int,
                                     result_pointer, ctypes.c_size_t,
                                     ctypes.POINTER(ctypes.c_uint64)]
    library.cache_access.restype = ctypes.c_int
    library.cache_level_statistics.argtypes = [ctypes.c_void_p, ctypes.c_size_t,
                                               ctypes.POINTER(ctypes.c_uint64)]
    library.cache_level_statistics.restype = ctypes.c_int
    library.cache_memory_statistics.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint64)]
    library.cache_memory_statistics.restype = ctypes.c_int
    library.cache_total_cycles.argtypes = [ctypes.c_void_p]
    library.cache_total_cycles.restype = ctypes.c_uint64
    library.cache_valid_line_count.argtypes = [ctypes.c_void_p, ctypes.c_size_t]
    library.cache_valid_line_count.restype = ctypes.c_size_t
    library.cache_valid_lines.argtypes = [ctypes.c_void_p, ctypes.c_size_t,
                                          ctypes.POINTER(_CacheLine), ctypes.c_size_t]
    library.cache_valid_lines.restype = ctypes.c_int
    library.cache_reset.argtypes = [ctypes.c_void_p]
    library.cache_reset.restype = None
    return library


def _enum_code(mapping: Dict[str, int], value: str, label: str) -> int:
    try:
        return mapping[value]
    except KeyError as exc:
        raise ValueError("Unsupported " + label + ": " + str(value)) from exc


class Cache:
    def __init__(self, configurations: List[Dict[str, Union[int, str]]],
                 memory_latency_cycles: int = 100):
        if not 1 <= len(configurations) <= 3:
            raise ValueError("Configure between one and three cache levels.")
        if memory_latency_cycles <= 0:
            raise ValueError("Memory latency must be a positive number of cycles.")
        block_size = int(configurations[0]["block_size_bytes"])
        converted = []
        for number, config in enumerate(configurations, start=1):
            capacity = int(config["capacity_bytes"])
            level_block = int(config["block_size_bytes"])
            if capacity <= 0 or level_block <= 0 or capacity % level_block:
                raise ValueError(f"L{number}: capacity must be positive and a multiple of block size.")
            if level_block != block_size:
                raise ValueError("All cache levels must use the same block size.")
            converted.append(_LevelConfig(
                capacity, level_block, int(config.get("associativity", 1)),
                _enum_code(MAPPING_CODES, str(config["mapping"]), "mapping type"),
                _enum_code(REPLACEMENT_CODES, str(config["replacement"]), "replacement policy"),
                _enum_code(WRITE_POLICY_CODES, str(config["write_policy"]), "write policy"),
                _enum_code(ALLOCATION_CODES, str(config["write_allocate"]), "allocation policy"),
                int(config.get("access_latency_cycles", 1)),
            ))
            if int(config.get("access_latency_cycles", 1)) <= 0:
                raise ValueError(f"L{number}: access latency must be positive.")
        self.configurations = configurations
        self._configs = (_LevelConfig * len(converted))(*converted)
        self._library = _load_library()
        self._handle = self._library.cache_create(self._configs, len(converted), memory_latency_cycles)
        if not self._handle:
            raise ValueError("The C++ engine rejected this cache configuration. Check ways and cache capacity.")

    def close(self) -> None:
        if getattr(self, "_handle", None):
            self._library.cache_destroy(self._handle)
            self._handle = None

    def __del__(self):
        self.close()

    def run(self, operations: List[Tuple[int, bool]]) -> List[Dict[str, Union[int, str]]]:
        rows = []
        results = (_LevelResult * len(self.configurations))()
        access_cycles = ctypes.c_uint64()
        set_counts = []
        for config in self.configurations:
            line_count = int(config["capacity_bytes"]) // int(config["block_size_bytes"])
            if config["mapping"] == "Fully associative":
                set_counts.append(1)
            elif config["mapping"] == "Set associative":
                set_counts.append(line_count // int(config.get("associativity", 1)))
            else:
                set_counts.append(line_count)
        for index, (address, is_write) in enumerate(operations, start=1):
            code = self._library.cache_access(self._handle, address, int(is_write),
                                              results, len(self.configurations),
                                              ctypes.byref(access_cycles))
            if code != 0:
                raise RuntimeError("The C++ cache engine rejected an access.")
            row = {"#": index, "Operation": "WRITE" if is_write else "READ",
                   "Address": f"0x{address:X}", "Block": int(results[0].block_number),
                   "Cycles": int(access_cycles.value)}
            for level_index, result in enumerate(results, start=1):
                row[f"L{level_index}"] = RESULT_NAMES.get(result.result, "UNKNOWN")
                if result.result >= 0:
                    row[f"L{level_index} set"] = str(int(result.set_index))
                    row[f"L{level_index} tag"] = str(int(result.block_number) // set_counts[level_index - 1])
                else:
                    row[f"L{level_index} set"] = "—"
                    row[f"L{level_index} tag"] = "—"
            rows.append(row)
        return rows

    @property
    def statistics(self) -> Dict[str, object]:
        levels = []
        for level_index in range(len(self.configurations)):
            values = (ctypes.c_uint64 * len(STAT_NAMES))()
            if self._library.cache_level_statistics(self._handle, level_index, values) != 0:
                raise RuntimeError("Could not read cache statistics.")
            levels.append(dict(zip(STAT_NAMES, map(int, values))))
        memory_values = (ctypes.c_uint64 * 2)()
        if self._library.cache_memory_statistics(self._handle, memory_values) != 0:
            raise RuntimeError("Could not read memory statistics.")
        total_cycles = int(self._library.cache_total_cycles(self._handle))
        accesses = levels[0]["accesses"]
        return {"levels": levels, "memory": {"reads": int(memory_values[0]),
                                               "writes": int(memory_values[1])},
                "total_cycles": total_cycles,
                "average_access_time_cycles": total_cycles / accesses if accesses else 0.0}

    def contents(self, max_rows: int = 5000) -> List[Dict[str, object]]:
        rows = []
        for level_index, config in enumerate(self.configurations):
            total = int(self._library.cache_valid_line_count(self._handle, level_index))
            count = min(total, max_rows)
            lines = (_CacheLine * count)()
            if self._library.cache_valid_lines(self._handle, level_index, lines, count) != 0:
                raise RuntimeError("Could not read cache contents.")
            rows.append({
                "level": level_index + 1,
                "total": total,
                "truncated": total > count,
                "lines": [{"Set": line.set_index, "Way": line.way,
                           "Block": line.block_number, "Tag": line.tag,
                           "Dirty": "Yes" if line.dirty else "No"} for line in lines],
            })
        return rows
