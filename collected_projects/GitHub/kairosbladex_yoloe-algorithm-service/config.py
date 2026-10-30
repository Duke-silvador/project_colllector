"""
YOLOE 多模态检测服务配置
"""
import os
import re
from pathlib import Path
from typing import Literal

# 基础路径
BASE_DIR = Path(__file__).parent
MODEL_DIR = BASE_DIR / "pretrain"
UPLOAD_DIR = BASE_DIR / "uploads"
RESULT_DIR = BASE_DIR / "results"

# 批量检索任务结果目录（HTTP 兜底，挂到 main /retrieval-files）
RETRIEVAL_BATCH_DIR = RESULT_DIR / "retrieval_batch"

# 对外拼接结果访问 URL 前缀（如 https://host:8188，留空则用相对路径 /retrieval-files/...）
RESULT_PUBLIC_URL_PREFIX = os.getenv("RESULT_PUBLIC_URL_PREFIX", "").strip().rstrip("/")

# MQTT（批量检索进度）
MQTT_HOST = os.getenv("MQTT_HOST", "").strip()
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "").strip()
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "").strip()
MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "yoloe/retrieval").strip().strip("/")

# MinIO（检测结果与缩略图；未配置时写本地 retrieval_batch）
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "").strip()
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "").strip()
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "").strip()
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "").strip()
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"
# MinIO 初始化探测必须有界；否则 SDK 默认 socket 超时会把首张结果图卡住数分钟。
MINIO_CONNECT_TIMEOUT_SECONDS = float(os.getenv("MINIO_CONNECT_TIMEOUT_SECONDS", "5"))
MINIO_READ_TIMEOUT_SECONDS = float(os.getenv("MINIO_READ_TIMEOUT_SECONDS", "60"))
# 上传大图和对象读取共用 urllib3 的 read socket 超时；保留独立写超时配置名，
# 便于部署侧按实测覆盖（urllib3 2.x 没有单独的 write 参数）。
MINIO_WRITE_TIMEOUT_SECONDS = float(
    os.getenv("MINIO_WRITE_TIMEOUT_SECONDS", os.getenv("MINIO_READ_TIMEOUT_SECONDS", "60"))
)
MINIO_FAILURE_COOLDOWN_SECONDS = float(os.getenv("MINIO_FAILURE_COOLDOWN_SECONDS", "60"))
# 浏览器/SDK 访问对象 URL 前缀，如 https://minio.example.com/my-bucket
MINIO_PUBLIC_BASE_URL = os.getenv("MINIO_PUBLIC_BASE_URL", "").strip().rstrip("/")

# 二次复检智能体（YOLOv8n 初检 + YOLOE 复核）文件目录
REVIEW_AGENT_UPLOAD_DIR = UPLOAD_DIR / "review_agent"
REVIEW_AGENT_RESULT_DIR = RESULT_DIR / "review_agent"
# 人工标注队列：SQLite 文件放在运行时结果目录，不进入代码仓库。
REVIEW_ANNOTATION_DB_PATH = Path(
    os.getenv("REVIEW_ANNOTATION_DB_PATH", str(REVIEW_AGENT_RESULT_DIR / "annotations.sqlite3"))
)
# YOLOv8n 权重：默认放在 pretrain（与 YOLOE 一致）；不存在时可改为 "yolov8n.pt" 由 ultralytics 拉取
REVIEW_YOLOV8_PATH = os.getenv("REVIEW_YOLOV8_PATH", str(MODEL_DIR / "yolov8n.pt"))

# 创建必要目录
for directory in [MODEL_DIR, UPLOAD_DIR, RESULT_DIR, REVIEW_AGENT_UPLOAD_DIR, REVIEW_AGENT_RESULT_DIR, RETRIEVAL_BATCH_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# 模型配置（权重文件名与 ultralytics / pretrain 一致：yoloe-v8l-seg.pt、yoloe-26l-seg.pt，尺寸为小写字母）
YOLOE_MODEL_SIZE: Literal["s", "m", "l", "x"] = os.getenv("YOLOE_MODEL_SIZE", "l").lower()  # type: ignore[assignment]
YOLOE_MODEL_VERSION: str = os.getenv("YOLOE_MODEL_VERSION", "v8")
YOLOE_MODEL_TYPE: Literal["seg", "det"] = os.getenv("YOLOE_MODEL_TYPE", "seg")

# 构建模型名称：version 与 size 连写，例如 yoloe-v8l-seg、yoloe-26l-seg（不要用大写 L，否则找不到文件）
MODEL_NAME = f"yoloe-{YOLOE_MODEL_VERSION}{YOLOE_MODEL_SIZE}-{YOLOE_MODEL_TYPE}"
_env_yoloe_path = os.getenv("YOLOE_MODEL_PATH", "").strip()
MODEL_PATH = Path(_env_yoloe_path) if _env_yoloe_path else (MODEL_DIR / f"{MODEL_NAME}.pt")

# 二次复检（AlgorithmReviewAgent / YoloERechecker）专用 YOLOE 权重
# 原 zhuoyi二次检测智能体/app.py 使用 yoloe-*-seg-pf.pt，与主检测用的 yoloe-*-seg.pt 不是同一文件；
# 若复检误用主模型，类别空间与推理行为不同，结果会与原版完全对不上。
_review_pf_name = f"yoloe-{YOLOE_MODEL_VERSION}{YOLOE_MODEL_SIZE}-{YOLOE_MODEL_TYPE}-pf.pt"
_review_pf_path = MODEL_DIR / _review_pf_name
REVIEW_YOLOE_MODEL_PATH_ENV: str = os.getenv("REVIEW_YOLOE_MODEL_PATH", "").strip()
if REVIEW_YOLOE_MODEL_PATH_ENV:
    REVIEW_YOLOE_PATH = Path(REVIEW_YOLOE_MODEL_PATH_ENV)
elif _review_pf_path.is_file():
    REVIEW_YOLOE_PATH = _review_pf_path
else:
    REVIEW_YOLOE_PATH = MODEL_PATH

# 二次复检 YOLOE：env 默认 cpu；若写 cuda0/cuda1 会规范为 cuda:0 / cuda:1
def _normalize_torch_device(name: str, default: str = "cuda:0") -> str:
    s = (name or default).strip()
    if s.lower() in ("cpu", ""):
        return "cpu" if s.lower() == "cpu" else default
    m = re.fullmatch(r"cuda[:]?(\d+)", s.replace(" ", ""), flags=re.I)
    if m:
        return f"cuda:{m.group(1)}"
    return s


_review_dev = os.getenv("REVIEW_YOLOE_DEVICE", "cpu").strip()
if _review_dev.lower() == "cpu" or not _review_dev:
    REVIEW_YOLOE_DEVICE = "cpu"
else:
    REVIEW_YOLOE_DEVICE = _normalize_torch_device(_review_dev, default="cuda:0")

REVIEW_YOLOE_CONF_INIT = float(os.getenv("REVIEW_YOLOE_CONF", "0.25"))
REVIEW_YOLOE_IOU = float(os.getenv("REVIEW_YOLOE_IOU", "0.45"))

# 推理配置（docker 中须与 CUDA_VISIBLE_DEVICES 映射后序号一致，单卡时一般为 cuda:0）
DEVICE = _normalize_torch_device(os.getenv("DEVICE", "cuda:0"), default="cuda:0")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.05"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.7"))
MAX_DETECTIONS = int(os.getenv("MAX_DETECTIONS", "300"))

# 服务配置
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_WORKERS = int(os.getenv("API_WORKERS", "1"))
API_KEY = os.getenv("API_KEY", "").strip()
# 接口防护：配置后所有业务接口需要携带 X-API-Key
API_KEY = os.getenv("API_KEY", "").strip()
# 允许匿名访问的路径前缀/精确路径（如健康检查）
PUBLIC_PATHS = {
    "/api/v1/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# 文件上传配置
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "52428800"))  # 50MB
# 批量检索（text/visual-search）远程媒体下载上限（须落盘时生效，默认 1GB）
MAX_BATCH_MEDIA_DOWNLOAD_SIZE = int(os.getenv("MAX_BATCH_MEDIA_DOWNLOAD_SIZE", str(1024 ** 3)))
# 批量任务下载大视频的读超时（秒），默认 600
BATCH_MEDIA_DOWNLOAD_TIMEOUT = float(os.getenv("BATCH_MEDIA_DOWNLOAD_TIMEOUT", "600"))
# 远程媒体 HTTPS 证书校验：默认开启；内网/自签名证书源可设置 REMOTE_MEDIA_SSL_VERIFY=false。
REMOTE_MEDIA_SSL_VERIFY = os.getenv(
    "REMOTE_MEDIA_SSL_VERIFY", "true"
).lower() in ("1", "true", "yes", "on")
# 若证书校验失败，是否自动用 verify=false 重试一次（仅媒体下载；避免自签名源导致整个批任务失败）。
REMOTE_MEDIA_SSL_RETRY_INSECURE = os.getenv(
    "REMOTE_MEDIA_SSL_RETRY_INSECURE", "true"
).lower() in ("1", "true", "yes", "on")
# 批量视觉检索：native VP 无检出时是否跳过 prompt-free/文本回退（显著提速，默认开启）
BATCH_VISUAL_SKIP_COMPATIBLE_FALLBACK = os.getenv(
    "BATCH_VISUAL_SKIP_COMPATIBLE_FALLBACK", "true"
).lower() in ("1", "true", "yes", "on")
# 同时占用 GPU worker 的批量任务数：0=不限制并发；>0 为排队上限（默认 0 放开多任务）
try:
    BATCH_MAX_CONCURRENT_GPU_JOBS = int(os.getenv("BATCH_MAX_CONCURRENT_GPU_JOBS", "0"))
except ValueError:
    BATCH_MAX_CONCURRENT_GPU_JOBS = 0
# 并行 GPU 推理槽位数（每槽一份模型权重副本；T4 建议 2~3，显存不足请调低）
try:
    GPU_INFER_PARALLEL_SLOTS = max(1, int(os.getenv("GPU_INFER_PARALLEL_SLOTS", "2")))
except ValueError:
    GPU_INFER_PARALLEL_SLOTS = 2
# 批量 I/O 线程池大小（下载/解码/上传/画框 JPEG）
try:
    BATCH_IO_THREAD_POOL_SIZE = max(4, int(os.getenv("BATCH_IO_THREAD_POOL_SIZE", "32")))
except ValueError:
    BATCH_IO_THREAD_POOL_SIZE = 32
# 视频抽帧异步队列深度（解码-推理流水线缓冲）
try:
    BATCH_VIDEO_FRAME_QUEUE_SIZE = max(2, int(os.getenv("BATCH_VIDEO_FRAME_QUEUE_SIZE", "12")))
except ValueError:
    BATCH_VIDEO_FRAME_QUEUE_SIZE = 12
# text-search 视频帧批推理大小（>1 时多帧 stack 一次 forward；visual 仍逐帧）
try:
    BATCH_INFER_FRAME_BATCH_SIZE = max(1, int(os.getenv("BATCH_INFER_FRAME_BATCH_SIZE", "2")))
except ValueError:
    BATCH_INFER_FRAME_BATCH_SIZE = 2
# 单个批任务同时处理的 URL 数；限制在 1~16，避免下载线程和显存无限膨胀。
try:
    BATCH_RETRIEVAL_URL_CONCURRENCY = min(
        16, max(1, int(os.getenv("BATCH_RETRIEVAL_URL_CONCURRENCY", "4")))
    )
except ValueError:
    BATCH_RETRIEVAL_URL_CONCURRENCY = 4
# 多任务时 MQTT/快照 ticker 间隔放大系数上限（秒）
try:
    BATCH_TICKER_INTERVAL_CAP_SECONDS = max(
        2.0, float(os.getenv("BATCH_TICKER_INTERVAL_CAP_SECONDS", "30"))
    )
except ValueError:
    BATCH_TICKER_INTERVAL_CAP_SECONDS = 30.0
# HLS 无法 time-seek / 无时长时跳过（禁止 sequential 顺序读流，避免 CPU 飙高）
BATCH_HLS_SKIP_SEQUENTIAL_FALLBACK = os.getenv(
    "BATCH_HLS_SKIP_SEQUENTIAL_FALLBACK", "true"
).lower() in ("1", "true", "yes", "on")
# HLS 抽样优先 ffmpeg 按时间点抓帧（可配合 VIDEO_FFMPEG_HWACCEL=cuda 硬件解码）
BATCH_HLS_USE_FFMPEG_SAMPLE = os.getenv(
    "BATCH_HLS_USE_FFMPEG_SAMPLE", "true"
).lower() in ("1", "true", "yes", "on")
# 普通视频（本地文件/已下载 MP4/MOV 等）也优先使用 ffmpeg -ss 按时间点 seek 抓帧。
# 比 OpenCV CAP_PROP_POS_FRAMES 更少受后端实现影响；对长视频低频抽帧可避免从头逐帧扫描。
BATCH_VIDEO_USE_FFMPEG_SAMPLE = os.getenv(
    "BATCH_VIDEO_USE_FFMPEG_SAMPLE", "true"
).lower() in ("1", "true", "yes", "on")
# 单个 ffmpeg -ss 抓帧子进程超时（秒）
try:
    BATCH_VIDEO_FFMPEG_SAMPLE_TIMEOUT = max(
        5.0, float(os.getenv("BATCH_VIDEO_FFMPEG_SAMPLE_TIMEOUT", "60"))
    )
except ValueError:
    BATCH_VIDEO_FFMPEG_SAMPLE_TIMEOUT = 60.0
# ffmpeg -ss 快速抽帧并发数：抽帧侧并行执行，检测侧通过异步队列边抽边检。
try:
    BATCH_VIDEO_FFMPEG_SAMPLE_WORKERS = max(
        1, int(os.getenv("BATCH_VIDEO_FFMPEG_SAMPLE_WORKERS", "4"))
    )
except ValueError:
    BATCH_VIDEO_FFMPEG_SAMPLE_WORKERS = 4
# ffmpeg 抽帧默认使用快速 seek：-ss 放在 -i 前并关闭 accurate seek，直接取附近关键帧，不精确追帧。
BATCH_VIDEO_FFMPEG_FAST_KEYFRAME_SAMPLE = os.getenv(
    "BATCH_VIDEO_FFMPEG_FAST_KEYFRAME_SAMPLE", "true"
).lower() in ("1", "true", "yes", "on")
# ffmpeg 硬件加速：空=关闭；cuda / auto=尝试 NVDEC（需容器内 ffmpeg 与 NVIDIA 驱动）
VIDEO_FFMPEG_HWACCEL = os.getenv("VIDEO_FFMPEG_HWACCEL", "").strip().lower()
# OpenCV / BLAS 线程上限（降低批量解码时 CPU 抢占，默认 4）
OPENCV_NUM_THREADS = max(1, int(os.getenv("OPENCV_NUM_THREADS", "4")))
OMP_NUM_THREADS = max(1, int(os.getenv("OMP_NUM_THREADS", "4")))
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m3u8", ".m3u"}
ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac"}

# 语音识别引擎配置：whisper / sensevoice，可通过环境变量切换
SPEECH_RECOGNITION_ENGINE = os.getenv("SPEECH_RECOGNITION_ENGINE", "whisper").strip().lower()
# Whisper 语音识别配置
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "large")  # tiny, base, small, medium, large
WHISPER_LANGUAGE = os.getenv("WHISPER_LANGUAGE", "zh")  # zh, en, auto
# SenseVoice 模型路径（默认使用仓库内的 SenseVoicemain/FunASR 代码）
SENSEVOICE_MODEL_DIR = os.getenv(
    "SENSEVOICE_MODEL_DIR",
    str(BASE_DIR / "SenseVoicemain" / "FunASR" / "runtime" / "python" / "libtorch"),
)
SENSEVOICE_MODEL_NAME = os.getenv("SENSEVOICE_MODEL_NAME", "iic/SenseVoiceSmall")
SENSEVOICE_DEVICE = os.getenv("SENSEVOICE_DEVICE", "cpu")
SENSEVOICE_LANGUAGE = os.getenv("SENSEVOICE_LANGUAGE", "auto")
SENSEVOICE_TEXTNORM = os.getenv("SENSEVOICE_TEXTNORM", "woitn")
SENSEVOICE_FALLBACK_TO_WHISPER = os.getenv(
    "SENSEVOICE_FALLBACK_TO_WHISPER", "true"
).lower() in ("1", "true", "yes", "on")
SENSEVOICE_DEBUG = os.getenv("SENSEVOICE_DEBUG", "false").lower() in ("1", "true", "yes", "on")

# MobileCLIP 配置（用于文本编码）
MOBILECLIP_PATH = MODEL_DIR / "mobileclip_blt.pt"

# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# 第三方 LLM 翻译配置（用于 TEXT 模式中文类别名 → 英文翻译）
# ─────────────────────────────────────────────────────────────────────────────
LLM_TRANSLATION_ENABLED: bool = os.getenv("LLM_TRANSLATION_ENABLED", "false").lower() == "true"
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "").strip()
LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.deepseek.com").strip().rstrip("/")
LLM_MODEL: str = os.getenv("LLM_MODEL", "deepseek-chat").strip()
# 中文标签翻译专用模型（可选）：留空则沿用 LLM_MODEL。
# 批量检索的“中文检索目标→英文标签”翻译需要模型直接给出答案，若沿用思考模型（如 qwen3-vl），
# reasoning 会先耗尽 num_predict 预算，导致 content 为空/截断、译文解析失败，最终按中文标签检索而命中 0 条。
TRANSLATE_LLM_MODEL: str = os.getenv("TRANSLATE_LLM_MODEL", "").strip()
LLM_REQUEST_TIMEOUT: int = int(os.getenv("LLM_REQUEST_TIMEOUT", "60"))
# Ollama 本地部署时使用此端点（设置为空则走默认 /chat/completions）
LLM_API_ENDPOINT: str = os.getenv("LLM_API_ENDPOINT", "").strip()
# 设为 true 则使用 Ollama 原生 /api/chat 接口（响应格式不同）
LLM_USE_OLLAMA: bool = os.getenv("LLM_USE_OLLAMA", "false").lower() == "true"

# 检测结果 MySQL（可选）：批量任务结束时落库；需在环境启用 MYSQL_* 变量
MYSQL_ENABLED = os.getenv("MYSQL_ENABLED", "false").lower() == "true"
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1").strip()
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3307"))
MYSQL_USER = os.getenv("MYSQL_USER", "").strip()
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "").strip()
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "").strip()
MYSQL_DETECTIONS_TABLE = os.getenv("MYSQL_DETECTIONS_TABLE", "yoloe_detections").strip()

# 日志配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# 性能配置
ENABLE_CACHE = os.getenv("ENABLE_CACHE", "true").lower() == "true"
CACHE_DIR = BASE_DIR / "cache"
if ENABLE_CACHE:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
