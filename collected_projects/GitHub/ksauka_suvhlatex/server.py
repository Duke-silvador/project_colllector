#!/usr/bin/env python3
"""Local-first web application for editing and compiling LaTeX projects."""

from __future__ import annotations

import json
import hmac
import io
import os
import re
import secrets
import shutil
import subprocess
import threading
import time
import zipfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent


def parse_dotenv_text(text: str) -> dict[str, str]:
    """Parse the small, conventional subset of .env syntax used by suvhlatex."""
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key.strip()):
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        elif " #" in value:
            value = value.split(" #", 1)[0].rstrip()
        values[key.strip()] = value
    return values


def load_dotenv(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    return parse_dotenv_text(path.read_text(encoding="utf-8"))


def load_json_config(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Could not read config file {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"Config file {path} must contain a JSON object")
    return payload


DOTENV_PATH = Path(os.environ.get("SUVHLATEX_ENV_FILE", ROOT / ".env"))
if not DOTENV_PATH.is_absolute():
    DOTENV_PATH = ROOT / DOTENV_PATH
CONFIG_PATH = Path(os.environ.get("SUVHLATEX_CONFIG", ROOT / "config.json"))
if not CONFIG_PATH.is_absolute():
    CONFIG_PATH = ROOT / CONFIG_PATH
DOTENV_VALUES = load_dotenv(DOTENV_PATH)
CONFIG_VALUES = load_json_config(CONFIG_PATH)


def config_value(path: str, default: object) -> object:
    current: object = CONFIG_VALUES
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current


def setting(env_name: str, config_path: str, default: object) -> object:
    if env_name in os.environ:
        return os.environ[env_name]
    if env_name in DOTENV_VALUES:
        return DOTENV_VALUES[env_name]
    return config_value(config_path, default)


def configured_path(value: object, default: Path) -> Path:
    path = Path(str(value)) if value is not None else default
    return path if path.is_absolute() else ROOT / path


DATA_ROOT = configured_path(setting("SUVHLATEX_DATA", "storage.data_root", "data"), ROOT / "data")
PROJECTS_ROOT = DATA_ROOT / "projects"
HOST = str(setting("SUVHLATEX_HOST", "server.host", "127.0.0.1"))
PORT = int(setting("SUVHLATEX_PORT", "server.port", 8765))
PASSWORD = str(setting("SUVHLATEX_PASSWORD", "security.password", ""))
COMPILE_MODE = str(setting("SUVHLATEX_COMPILE_MODE", "compile.mode", "local")).lower()
CONTAINER_IMAGE = str(setting("SUVHLATEX_TEX_IMAGE", "compile.tex_image", "texlive/texlive:latest"))
CONTAINER_RUNTIME = str(setting("SUVHLATEX_CONTAINER_RUNTIME", "compile.container_runtime", ""))
SESSION_TTL_SECONDS = int(setting("SUVHLATEX_SESSION_TTL", "security.session_ttl_seconds", 12 * 60 * 60))
MAX_BODY_BYTES = int(setting("SUVHLATEX_MAX_BODY_MB", "limits.max_body_mb", 25)) * 1024 * 1024
MAX_ZIP_BYTES = int(setting("SUVHLATEX_MAX_ZIP_MB", "limits.max_zip_mb", 20)) * 1024 * 1024
MAX_CLONE_SECONDS = int(setting("SUVHLATEX_MAX_CLONE_SECONDS", "limits.max_clone_seconds", 180))
TEXT_EXTENSIONS = {".tex", ".bib", ".sty", ".cls", ".cfg", ".txt", ".md", ".json", ".csv"}
SESSIONS: dict[str, float] = {}
SESSIONS_LOCK = threading.Lock()
COMPILE_LOCKS: dict[str, threading.Lock] = {}
COMPILE_LOCKS_LOCK = threading.Lock()

TEMPLATES = {
    "standard": {
        "name": "Normal document",
        "description": "A clean article starter for notes, reports, and drafts.",
        "files": {
            "main.tex": r"""\documentclass[11pt]{article}
\usepackage[margin=1in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{hyperref}

\title{Your document title}
\author{Your name}
\date{\today}

\begin{document}
\maketitle

\begin{abstract}
Replace this text with a short summary of your document.
\end{abstract}

\section{Introduction}
Start writing here. Save with \texttt{Ctrl+S}, then compile to update the PDF preview.

\section{Next steps}
Add sections, figures, tables, and citations as your document grows.

\end{document}
""",
            "references.bib": r"""@article{example2026,
  author  = {Example, Alex},
  title   = {An Example Reference},
  journal = {Example Journal},
  year    = {2026}
}
""",
            "README.md": "# Normal document\n\nEdit `main.tex` and compile from suvhlatex.\n",
        },
    },
    "acl": {
        "name": "ACL-style paper",
        "description": "A self-contained two-column research-paper starter inspired by ACL submissions.",
        "files": {
            "main.tex": r"""\documentclass[10pt,twocolumn]{article}
\usepackage[letterpaper,margin=0.75in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{times}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}

\title{A Research Paper Title}
\author{First Author \and Second Author}
\date{}

\begin{document}
\maketitle

\begin{abstract}
Write a concise abstract describing the problem, approach, and main result.
\end{abstract}

\section{Introduction}
This starter gives you a familiar two-column research-paper layout. For a real submission, replace this lightweight starter with the official ACL style package and follow that venue's current author instructions.

\section{Related Work}
Summarize the literature and position your contribution.

\section{Method}
Describe your data, setup, and method. Use \texttt{references.bib} for citations when you add a bibliography.

\section{Experiments}
Report your evaluation protocol and results.

\section{Conclusion}
Summarize the contribution and future work.

\end{document}
""",
            "references.bib": r"""@inproceedings{exampleacl2026,
  author    = {Example, Alex},
  title     = {An Example ACL-style Reference},
  booktitle = {Proceedings of an Example Conference},
  year      = {2026}
}
""",
            "README.md": "# ACL-style paper\n\nThis is a self-contained starter, not the official ACL class.\n",
        },
    },
    "armrt": {
        "name": "ARMRT technical report",
        "description": "A structured technical-report starter for applied research and methods documents.",
        "files": {
            "main.tex": r"""\documentclass[11pt]{article}
\usepackage[a4paper,margin=1in]{geometry}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{amsmath,amssymb}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{hyperref}
\usepackage{xcolor}

\definecolor{reportblue}{HTML}{1D4E89}
\title{Applied Research and Methods Technical Report}
\author{Your name}
\date{\today}

\begin{document}
\begin{titlepage}
\centering
\vspace*{2cm}
{\color{reportblue}\rule{\textwidth}{1.5pt}}\\[1.2cm]
{\Huge\bfseries Applied Research and Methods Technical Report\par}
\vspace{0.6cm}
{\Large Project subtitle\par}
\vfill
{\large Your name\\Organisation or research group\\\today\par}
\vspace{1cm}
{\color{reportblue}\rule{\textwidth}{1.5pt}}
\end{titlepage}

\tableofcontents
\newpage

\section{Executive Summary}
State the question, approach, key findings, and implications in a page or less.

\section{Research Context}
Describe the setting, motivation, and scope of the report.

\section{Methods}
Document the data, procedure, instruments, and analysis decisions.

\section{Results}
Present findings with tables and figures.

\section{Discussion and Recommendations}
Interpret the results and translate them into practical next steps.

\section{Conclusion}
Close with the main contribution and limitations.

\end{document}
""",
            "references.bib": r"""@article{examplereport2026,
  author  = {Example, Alex},
  title   = {An Example Technical Report Reference},
  journal = {Example Journal},
  year    = {2026}
}
""",
            "README.md": "# ARMRT technical report\n\nA structured technical-report starter.\n",
        },
    },
}


def ensure_storage() -> None:
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)


def auth_required() -> bool:
    return bool(PASSWORD)


def is_loopback_host(host: str) -> bool:
    return host in {"127.0.0.1", "localhost", "::1"}


def create_session() -> str:
    token = secrets.token_urlsafe(32)
    with SESSIONS_LOCK:
        SESSIONS[token] = time.time() + SESSION_TTL_SECONDS
    return token


def valid_session(token: str | None) -> bool:
    if not token:
        return False
    with SESSIONS_LOCK:
        expires_at = SESSIONS.get(token)
        if expires_at is None:
            return False
        if expires_at < time.time():
            SESSIONS.pop(token, None)
            return False
        return True


def remove_session(token: str | None) -> None:
    if token:
        with SESSIONS_LOCK:
            SESSIONS.pop(token, None)


def cookie_value(header: str, name: str) -> str | None:
    for part in header.split(";"):
        key, separator, value = part.strip().partition("=")
        if separator and key == name:
            return value
    return None


def compile_mode() -> str:
    if COMPILE_MODE not in {"local", "container", "auto"}:
        raise RuntimeError("SUVHLATEX_COMPILE_MODE must be local, container, or auto")
    if COMPILE_MODE == "auto":
        return "container" if container_runtime() else "local"
    return COMPILE_MODE


def container_runtime() -> str | None:
    candidates = [CONTAINER_RUNTIME, "docker", "podman"]
    for candidate in candidates:
        if not candidate or not shutil.which(candidate):
            continue
        try:
            probe = subprocess.run(
                [candidate, "version", "--format", "{{.Server.Version}}"],
                capture_output=True,
                text=True,
                timeout=3,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if probe.returncode == 0:
            return candidate
    return None


def validate_repository_url(repository_url: str) -> str:
    value = repository_url.strip()
    parsed = urlparse(value)
    scp_style = re.fullmatch(r"[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:.+", value)
    if scp_style:
        return value
    if parsed.scheme not in {"https", "ssh"} or not parsed.netloc:
        raise ValueError("Repository URL must use https, ssh, or scp-style Git syntax")
    if parsed.username or parsed.password:
        raise ValueError("Repository URLs with embedded credentials are not allowed")
    if any(character in value for character in {"\n", "\r", "\x00"}):
        raise ValueError("Repository URL contains invalid characters")
    return value


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return value[:48] or "latex-project"


def project_path(project_id: str) -> Path:
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", project_id):
        raise ValueError("Invalid project id")
    path = (PROJECTS_ROOT / project_id).resolve()
    if PROJECTS_ROOT.resolve() not in path.parents:
        raise ValueError("Invalid project path")
    return path


def safe_relative_path(value: str) -> Path:
    value = unquote(value).replace("\\", "/")
    path = Path(value)
    if not value or path.is_absolute() or ".." in path.parts:
        raise ValueError("Invalid file path")
    return path


def safe_project_file(project: Path, relative: Path) -> Path:
    target = project / relative
    project_root = project.resolve()
    resolved = target.resolve(strict=False)
    if project_root not in (resolved, *resolved.parents):
        raise ValueError("Project file resolves outside the project")
    current = project
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("Project symlinks are not allowed")
    return target


def reject_symlinks(path: Path) -> None:
    for root, directories, files in os.walk(path, followlinks=False):
        root_path = Path(root)
        for entry in [*directories, *files]:
            if (root_path / entry).is_symlink():
                raise ValueError("Repositories containing symlinks are not supported")


def read_metadata(path: Path) -> dict:
    metadata_path = path / ".suvhlatex.json"
    if metadata_path.exists():
        try:
            return json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass
    return {"name": path.name, "template": "imported"}


def write_metadata(path: Path, name: str, template: str) -> None:
    (path / ".suvhlatex.json").write_text(
        json.dumps({"name": name, "template": template}, indent=2) + "\n",
        encoding="utf-8",
    )


class CompilationBusyError(RuntimeError):
    pass


def compile_lock(project_id: str) -> threading.Lock:
    with COMPILE_LOCKS_LOCK:
        return COMPILE_LOCKS.setdefault(project_id, threading.Lock())


def list_files(path: Path) -> list[str]:
    result = []
    for item in sorted(path.rglob("*")):
        relative = item.relative_to(path)
        if item.is_file() and not item.is_symlink() and "build" not in relative.parts and ".git" not in relative.parts and item.name != ".suvhlatex.json":
            result.append(item.relative_to(path).as_posix())
    return result


def choose_engine() -> str | None:
    candidates = [os.environ.get("SUVHLATEX_ENGINE"), "pdflatex", "xelatex", "lualatex"]
    for candidate in candidates:
        if candidate and shutil.which(candidate):
            return candidate
    return None


def compile_engine(mode: str) -> str:
    if mode == "container":
        return os.environ.get("SUVHLATEX_ENGINE", "pdflatex")
    engine = choose_engine()
    if engine is None:
        raise RuntimeError("No LaTeX engine found. Install TeX Live/MiKTeX or set SUVHLATEX_ENGINE.")
    return engine


def choose_main_file(path: Path) -> Path | None:
    metadata = read_metadata(path)
    configured = metadata.get("main_file")
    if isinstance(configured, str) and configured:
        try:
            candidate = safe_project_file(path, safe_relative_path(configured))
            if candidate.is_file() and candidate.suffix.lower() == ".tex":
                return candidate
        except ValueError:
            pass
    preferred = path / "main.tex"
    if preferred.exists():
        return preferred
    tex_files = sorted(path.rglob("*.tex"))
    for basename in ("main.tex", "sigconf.tex", "manuscript.tex", "paper.tex", "document.tex"):
        matches = [candidate for candidate in tex_files if candidate.name.lower() == basename]
        if matches:
            return matches[0]
    return tex_files[0] if tex_files else None


def compiled_pdf_path(path: Path) -> Path | None:
    main_file = choose_main_file(path)
    if main_file is None:
        return None
    # LaTeX uses the job name for the output file even when the source lives
    # in a nested folder, while -output-directory controls the destination.
    return path / "build" / f"{main_file.stem}.pdf"


def set_main_file(project_id: str, relative_name: str) -> dict:
    path = project_path(project_id)
    if not path.is_dir():
        raise FileNotFoundError(project_id)
    relative = safe_relative_path(relative_name)
    if relative.suffix.lower() != ".tex":
        raise ValueError("The compile file must be a .tex file")
    target = safe_project_file(path, relative)
    if not target.is_file():
        raise ValueError("The selected compile file does not exist")
    metadata = read_metadata(path)
    metadata["main_file"] = relative.as_posix()
    (path / ".suvhlatex.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return project_payload(project_id)


def project_payload(project_id: str) -> dict:
    path = project_path(project_id)
    if not path.is_dir():
        raise FileNotFoundError(project_id)
    metadata = read_metadata(path)
    pdf = compiled_pdf_path(path)
    return {
        "id": project_id,
        "name": metadata.get("name", project_id),
        "template": metadata.get("template", "imported"),
        "files": list_files(path),
        "tex_files": [file for file in list_files(path) if file.lower().endswith(".tex")],
        "main_file": choose_main_file(path).relative_to(path).as_posix() if choose_main_file(path) else None,
        "pdf_url": f"/api/projects/{project_id}/pdf",
        "pdf_available": bool(pdf and pdf.is_file()),
    }


def create_project(name: str, template_id: str) -> dict:
    template = TEMPLATES.get(template_id)
    if template is None:
        raise ValueError("Unknown template")
    base_id = slugify(name)
    project_id = base_id
    suffix = 2
    while project_path(project_id).exists():
        project_id = f"{base_id}-{suffix}"
        suffix += 1
    path = project_path(project_id)
    path.mkdir(parents=True)
    for filename, content in template["files"].items():
        target = path / safe_relative_path(filename)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    write_metadata(path, name.strip() or template["name"], template_id)
    return project_payload(project_id)


def delete_project(project_id: str) -> None:
    path = project_path(project_id)
    if not path.is_dir():
        raise FileNotFoundError(project_id)
    shutil.rmtree(path)


def clone_repository(repository_url: str, name: str = "") -> dict:
    repository_url = validate_repository_url(repository_url)
    parsed = urlparse(repository_url)
    default_name = Path(parsed.path.rstrip("/")).stem if parsed.path else "repository"
    if default_name in {"", ".", "git"}:
        default_name = "repository"
    project_name = name.strip() or default_name
    base_id = slugify(project_name)
    project_id = base_id
    suffix = 2
    while project_path(project_id).exists():
        project_id = f"{base_id}-{suffix}"
        suffix += 1
    destination = project_path(project_id)
    try:
        result = subprocess.run(
            ["git", "clone", "--depth", "1", "--no-tags", repository_url, str(destination)],
            capture_output=True,
            text=True,
            timeout=MAX_CLONE_SECONDS,
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("Git is not installed or is not on PATH") from exc
    except subprocess.TimeoutExpired as exc:
        shutil.rmtree(destination, ignore_errors=True)
        raise RuntimeError("Repository clone timed out after 180 seconds") from exc
    if result.returncode != 0:
        shutil.rmtree(destination, ignore_errors=True)
        detail = (result.stderr or result.stdout or "Git clone failed").strip()
        raise RuntimeError(f"Git clone failed: {detail[-1200:]}")
    try:
        reject_symlinks(destination)
    except ValueError:
        shutil.rmtree(destination, ignore_errors=True)
        raise
    write_metadata(destination, project_name, "imported")
    return project_payload(project_id)


def extract_zip(data: bytes, name: str) -> dict:
    if len(data) > MAX_ZIP_BYTES:
        raise ValueError("ZIP file is larger than 20 MB")
    project_id = slugify(name.rsplit(".", 1)[0])
    suffix = 2
    while project_path(project_id).exists():
        project_id = f"{slugify(name.rsplit('.', 1)[0])}-{suffix}"
        suffix += 1
    destination = project_path(project_id)
    destination.mkdir(parents=True)
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            total_size = 0
            for info in archive.infolist():
                relative = safe_relative_path(info.filename)
                if info.is_dir():
                    continue
                mode = (info.external_attr >> 16) & 0o170000
                if mode == 0o120000:
                    raise ValueError("ZIP symlinks are not allowed")
                if info.file_size > MAX_ZIP_BYTES or total_size + info.file_size > MAX_ZIP_BYTES:
                    raise ValueError("ZIP contents are larger than 20 MB")
                if info.filename.startswith("__MACOSX/") or relative.name == ".DS_Store":
                    continue
                total_size += info.file_size
                target = destination / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(info))
    except (zipfile.BadZipFile, ValueError):
        shutil.rmtree(destination, ignore_errors=True)
        raise ValueError("The uploaded file is not a safe LaTeX ZIP archive")
    write_metadata(destination, name.rsplit(".", 1)[0], "imported")
    return project_payload(project_id)


def bibliography_backend(main_file: Path) -> str | None:
    """Detect the bibliography tool required by the selected LaTeX source."""
    source = main_file.read_text(encoding="utf-8", errors="replace")
    active_source = "\n".join(re.sub(r"(?<!\\)%.*", "", line) for line in source.splitlines())
    if re.search(r"\\(?:usepackage|RequirePackage)\s*(?:\[[^]]*\])?\s*\{biblatex\}|\\addbibresource\s*\{", active_source):
        return "biber"
    if re.search(r"\\bibliography\s*\{|\\bibliographystyle\s*\{", active_source):
        return "bibtex"
    return None


def compile_project(project_id: str) -> dict:
    lock = compile_lock(project_id)
    if not lock.acquire(blocking=False):
        raise CompilationBusyError("This project is already compiling")
    try:
        return _compile_project(project_id)
    finally:
        lock.release()


def _compile_project(project_id: str) -> dict:
    path = project_path(project_id)
    if not path.is_dir():
        raise FileNotFoundError(project_id)
    main_file = choose_main_file(path)
    if main_file is None:
        raise ValueError("No .tex file was found in this project")
    mode = compile_mode()
    engine = compile_engine(mode)
    runtime = container_runtime() if mode == "container" else None
    if mode == "container" and runtime is None:
        raise RuntimeError("Container mode requires Docker or Podman. Set SUVHLATEX_COMPILE_MODE=local to use the local engine.")
    build = path / "build"
    build.mkdir(exist_ok=True)
    for old_file in build.iterdir():
        if old_file.is_file():
            old_file.unlink()
    relative_main = main_file.relative_to(path).as_posix()
    local_input = main_file.name
    bibliography_tool = bibliography_backend(main_file)
    compile_env = os.environ.copy()
    existing_texinputs = compile_env.get("TEXINPUTS", "")
    compile_env["TEXINPUTS"] = os.pathsep.join([str(main_file.parent), f"{path}//", existing_texinputs])
    existing_bibinputs = compile_env.get("BIBINPUTS", "")
    compile_env["BIBINPUTS"] = os.pathsep.join([str(main_file.parent), f"{path}//", existing_bibinputs])
    existing_bstinputs = compile_env.get("BSTINPUTS", "")
    compile_env["BSTINPUTS"] = os.pathsep.join([str(main_file.parent), f"{path}//", existing_bstinputs])
    latex_args = [engine, "-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "-file-line-error", "-synctex=1", "-output-directory=/work/build", relative_main]
    if mode == "container":
        container_texinputs = f"/work/{main_file.parent.relative_to(path).as_posix()}:/work//:"
        container_bibinputs = f"/work/{main_file.parent.relative_to(path).as_posix()}:/work//:"
        container_prefix = [
            runtime,
            "run",
            "--rm",
            "--network",
            "none",
            "--read-only",
            "--cap-drop=ALL",
            "--security-opt",
            "no-new-privileges",
            "--pids-limit",
            "256",
            "--memory",
            "2g",
            "--cpus",
            "2",
            "--tmpfs",
            "/tmp:rw,noexec,nosuid,size=512m",
            "--env",
            f"TEXINPUTS={container_texinputs}",
            "--env",
            f"BIBINPUTS={container_bibinputs}",
            "--env",
            f"BSTINPUTS={container_bibinputs}",
            "--mount",
            f"type=bind,src={path},dst=/work,rw",
            "--workdir",
            "/work",
            CONTAINER_IMAGE,
        ]
        latex_command = [*container_prefix, *latex_args]
        command_cwd = path
        command_env = None
    else:
        latex_command = [engine, "-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "-file-line-error", "-synctex=1", f"-output-directory={build}", local_input]
        command_cwd = main_file.parent
        command_env = compile_env

    logs: list[str] = []

    def run_step(command: list[str], cwd: Path, env: dict[str, str] | None, label: str):
        try:
            step = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True, timeout=90)
        except subprocess.TimeoutExpired as exc:
            output = (exc.stdout or "") + "\nCompilation timed out after 90 seconds."
            logs.append(f"== {label} ==\n{output}")
            return None
        output = (step.stdout or "") + (step.stderr or "")
        logs.append(f"== {label} ==\n{output}")
        return step

    result = run_step(latex_command, command_cwd, command_env, f"{engine} pass 1")
    if result is None or result.returncode != 0:
        pdf = compiled_pdf_path(path)
        return {"ok": False, "engine": engine, "mode": mode, "log": "\n".join(logs)[-12000:], "pdf": pdf.name if pdf.exists() else None}

    if bibliography_tool:
        if mode == "local" and shutil.which(bibliography_tool) is None:
            logs.append(f"== bibliography ==\nRequired bibliography tool not found: {bibliography_tool}")
            pdf = compiled_pdf_path(path)
            return {"ok": False, "engine": engine, "mode": mode, "log": "\n".join(logs)[-12000:], "pdf": pdf.name if pdf.exists() else None}
        if mode == "container":
            bibliography_command = [*container_prefix, bibliography_tool, f"build/{main_file.stem}"]
            bibliography_cwd = path
            bibliography_env = None
        else:
            bibliography_command = [bibliography_tool, main_file.stem]
            bibliography_cwd = build
            bibliography_env = compile_env
        bibliography_result = run_step(bibliography_command, bibliography_cwd, bibliography_env, bibliography_tool)
        if bibliography_result is None or bibliography_result.returncode != 0:
            pdf = compiled_pdf_path(path)
            return {"ok": False, "engine": engine, "mode": mode, "log": "\n".join(logs)[-12000:], "pdf": pdf.name if pdf.exists() else None}
        for pass_number in (2, 3):
            result = run_step(latex_command, command_cwd, command_env, f"{engine} pass {pass_number}")
            if result is None or result.returncode != 0:
                break

    pdf = compiled_pdf_path(path)
    return {"ok": result is not None and result.returncode == 0 and pdf.exists(), "engine": engine, "mode": mode, "log": "\n".join(logs)[-12000:], "pdf": pdf.name if pdf.exists() else None}


class Handler(BaseHTTPRequestHandler):
    server_version = "suvhlatex/0.1"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[{threading.current_thread().name}] {self.address_string()} - {fmt % args}")

    def send_json(self, payload: dict, status: int = HTTPStatus.OK, headers: dict[str, str] | None = None) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def send_error_json(self, message: str, status: int = HTTPStatus.BAD_REQUEST) -> None:
        self.send_json({"error": message}, status)

    def read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", "0"))
        if length > MAX_BODY_BYTES:
            raise ValueError("Request body is too large")
        return self.rfile.read(length)

    def authenticated(self) -> bool:
        return not auth_required() or valid_session(cookie_value(self.headers.get("Cookie", ""), "suvhlatex_session"))

    def require_auth(self) -> bool:
        if self.authenticated():
            return True
        self.send_error_json("Authentication required", HTTPStatus.UNAUTHORIZED)
        return False

    def auth_status(self) -> dict:
        try:
            current_compile_mode = compile_mode()
        except RuntimeError:
            current_compile_mode = COMPILE_MODE
        return {
            "required": auth_required(),
            "authenticated": self.authenticated(),
            "compile_mode": current_compile_mode,
            "container_available": bool(container_runtime()),
        }

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        route = parsed.path
        try:
            if route == "/" or route == "/index.html":
                return self.serve_file(ROOT / "web" / "index.html", "text/html; charset=utf-8")
            if route == "/app.js":
                return self.serve_file(ROOT / "web" / "app.js", "text/javascript; charset=utf-8")
            if route == "/styles.css":
                return self.serve_file(ROOT / "web" / "styles.css", "text/css; charset=utf-8")
            if route == "/api/auth/status":
                return self.send_json(self.auth_status())
            if route.startswith("/api/") and not self.require_auth():
                return None
            if route == "/api/templates":
                return self.send_json({"templates": [{"id": key, **{k: v for k, v in value.items() if k != "files"}} for key, value in TEMPLATES.items()]})
            if route == "/api/projects":
                projects = [project_payload(item.name) for item in sorted(PROJECTS_ROOT.iterdir()) if item.is_dir()]
                return self.send_json({"projects": projects})
            match = re.fullmatch(r"/api/projects/([a-z0-9][a-z0-9-]{0,63})", route)
            if match:
                return self.send_json(project_payload(match.group(1)))
            match = re.fullmatch(r"/api/projects/([a-z0-9][a-z0-9-]{0,63})/files/(.+)", route)
            if match:
                project = project_path(match.group(1))
                relative = safe_relative_path(match.group(2))
                target = safe_project_file(project, relative)
                if not target.is_file() or relative.name == ".suvhlatex.json" or "build" in relative.parts:
                    return self.send_error_json("File not found", HTTPStatus.NOT_FOUND)
                content_type = "text/plain; charset=utf-8" if target.suffix.lower() in TEXT_EXTENSIONS else "application/octet-stream"
                return self.serve_file(target, content_type)
            match = re.fullmatch(r"/api/projects/([a-z0-9][a-z0-9-]{0,63})/pdf", route)
            if match:
                project = project_path(match.group(1))
                pdf = compiled_pdf_path(project)
                if not pdf or not pdf.exists():
                    return self.send_error_json("No compiled PDF is available yet", HTTPStatus.NOT_FOUND)
                return self.serve_file(pdf, "application/pdf")
            self.send_error(HTTPStatus.NOT_FOUND)
        except FileNotFoundError:
            self.send_error_json("Project not found", HTTPStatus.NOT_FOUND)
        except (ValueError, OSError) as exc:
            self.send_error_json(str(exc), HTTPStatus.BAD_REQUEST)

    def do_POST(self) -> None:
        route = urlparse(self.path).path
        try:
            if route == "/api/auth/login":
                payload = json.loads(self.read_body() or b"{}")
                supplied = str(payload.get("password", ""))
                if not auth_required() or hmac.compare_digest(supplied, PASSWORD):
                    token = create_session()
                    return self.send_json({"ok": True}, headers={"Set-Cookie": f"suvhlatex_session={token}; Max-Age={SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax; Path=/"})
                return self.send_error_json("Incorrect password", HTTPStatus.UNAUTHORIZED)
            if route == "/api/auth/logout":
                token = cookie_value(self.headers.get("Cookie", ""), "suvhlatex_session")
                remove_session(token)
                return self.send_json({"ok": True}, headers={"Set-Cookie": "suvhlatex_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/"})
            if route.startswith("/api/") and not self.require_auth():
                return None
            body = self.read_body()
            if route == "/api/projects":
                payload = json.loads(body or b"{}")
                project = create_project(str(payload.get("name", "")), str(payload.get("template", "standard")))
                return self.send_json(project, HTTPStatus.CREATED)
            if route == "/api/import":
                name = self.headers.get("X-Archive-Name", "imported-project.zip")
                return self.send_json(extract_zip(body, name), HTTPStatus.CREATED)
            if route == "/api/repos/clone":
                payload = json.loads(body or b"{}")
                return self.send_json(clone_repository(str(payload.get("url", "")), str(payload.get("name", ""))), HTTPStatus.CREATED)
            match = re.fullmatch(r"/api/projects/([a-z0-9][a-z0-9-]{0,63})/compile", route)
            if match:
                return self.send_json(compile_project(match.group(1)))
            self.send_error(HTTPStatus.NOT_FOUND)
        except json.JSONDecodeError:
            self.send_error_json("Invalid JSON")
        except FileNotFoundError:
            self.send_error_json("Project not found", HTTPStatus.NOT_FOUND)
        except CompilationBusyError as exc:
            self.send_error_json(str(exc), HTTPStatus.CONFLICT)
        except (ValueError, OSError, RuntimeError) as exc:
            self.send_error_json(str(exc))

    def do_PUT(self) -> None:
        route = urlparse(self.path).path
        if route.startswith("/api/") and not self.require_auth():
            return
        main_match = re.fullmatch(r"/api/projects/([a-z0-9][a-z0-9-]{0,63})/main-file", route)
        if main_match:
            try:
                payload = json.loads(self.read_body() or b"{}")
                return self.send_json(set_main_file(main_match.group(1), str(payload.get("path", ""))))
            except json.JSONDecodeError:
                self.send_error_json("Invalid JSON")
            except FileNotFoundError:
                self.send_error_json("Project not found", HTTPStatus.NOT_FOUND)
            except (ValueError, OSError) as exc:
                self.send_error_json(str(exc))
            return
        match = re.fullmatch(r"/api/projects/([a-z0-9][a-z0-9-]{0,63})/files/(.+)", route)
        if not match:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            project = project_path(match.group(1))
            if not project.is_dir():
                raise FileNotFoundError(match.group(1))
            relative = safe_relative_path(match.group(2))
            if relative.name == ".suvhlatex.json" or "build" in relative.parts:
                raise ValueError("That file is managed by suvhlatex")
            body = self.read_body()
            target = safe_project_file(project, relative)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)
            self.send_json({"ok": True, "path": relative.as_posix()})
        except FileNotFoundError:
            self.send_error_json("Project not found", HTTPStatus.NOT_FOUND)
        except (ValueError, OSError) as exc:
            self.send_error_json(str(exc))

    def do_DELETE(self) -> None:
        route = urlparse(self.path).path
        if route.startswith("/api/") and not self.require_auth():
            return
        match = re.fullmatch(r"/api/projects/([a-z0-9][a-z0-9-]{0,63})", route)
        if not match:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            delete_project(match.group(1))
            self.send_json({"ok": True, "deleted": match.group(1)})
        except FileNotFoundError:
            self.send_error_json("Project not found", HTTPStatus.NOT_FOUND)
        except OSError as exc:
            self.send_error_json(str(exc))

    def serve_file(self, path: Path, content_type: str) -> None:
        data = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    ensure_storage()
    if not is_loopback_host(HOST) and not auth_required():
        raise SystemExit("Refusing non-local bind without SUVHLATEX_PASSWORD authentication")
    if not is_loopback_host(HOST) and COMPILE_MODE != "container":
        raise SystemExit("Refusing non-local bind unless SUVHLATEX_COMPILE_MODE=container")
    print(f"suvhlatex running at http://{HOST}:{PORT}")
    print(f"Project storage: {PROJECTS_ROOT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
