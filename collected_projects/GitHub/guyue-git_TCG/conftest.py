"""pytest 根级配置：把 `experiments/` 排除出测试收集（2026-09-18）.

`experiments/` 存的是一次性实验脚本（模块级就渲染、开 PDF、写磁盘），不是测试
用例。但它们按 `*_test.py` 命名，会被 pytest 的 `python_files` 默认规则误收集。

后果（2026-09-18 实测并复现）：`experiments/frozen_render_test.py` 在**导入时**
就地改写 `tc_builder.SETTLEMENT_LINES`，而 `tests/test_cp003.py` 的
`TestRenderCp003` 类体在收集期就要渲染一次 CP003 模板 —— 于是被污染的全局常量
让后者报 `ValueError: not enough values to unpack (expected 3, got 2)`：

    pytest tests/test_cp003.py                                  -> 23 collected ✅
    pytest experiments/frozen_render_test.py tests/test_cp003.py -> 2 errors ❌

仓库根直接跑 `pytest` 时 `experiments/` 排在 `tests/` 之前，必然触发 →
`Interrupted`，**一条测试都不执行**。

排除后根目录 `pytest` 与 `pytest tests/` 等价。需要跑某个实验脚本时，
直接 `python experiments/xxx.py`（它们本就不是 pytest 用例）。
"""

# 两个模式都要写：collect_ignore_glob 不自动向下递归
collect_ignore_glob = ["experiments/*", "experiments/*/*"]
