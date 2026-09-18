#!/usr/bin/env bash
# One-shot setup for RunPod (or any Linux box with an NVIDIA GPU).
#   cd /workspace && git clone https://github.com/Aakash-Rajput-2024/leetgpu-bench && cd leetgpu-bench
#   ./setup.sh                # add --profilers to also install Nsight Compute / Systems
set -euo pipefail
cd "$(dirname "$0")"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "GPU"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader || {
  echo "nvidia-smi failed: no GPU visible"; exit 1; }

say "CUDA compiler"
if ! command -v nvcc >/dev/null; then
  for d in /usr/local/cuda/bin /usr/local/cuda-*/bin; do
    [ -x "$d/nvcc" ] && export PATH="$d:$PATH" && break
  done
fi
if command -v nvcc >/dev/null; then
  nvcc --version | tail -n 2
  # make it stick for new shells
  grep -q 'cuda/bin' ~/.bashrc 2>/dev/null || echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
else
  echo "nvcc not found. Use a RunPod PyTorch template with a *-devel* image (it ships the CUDA toolkit)."
  exit 1
fi

say "Python + PyTorch"
PY=${PYTHON:-python3}
if ! $PY -c "import torch, sys; sys.exit(0 if torch.cuda.is_available() else 1)" 2>/dev/null; then
  echo "Installing PyTorch (CUDA build) ..."
  $PY -m pip install -q torch
fi
$PY -c "import torch; print('torch', torch.__version__, '| CUDA', torch.version.cuda, '|', torch.cuda.get_device_name(0))"

if [[ "${1:-}" == "--profilers" ]]; then
  say "Nsight tools"
  $PY -m lgb install-profilers
fi

say "Official challenges + calibration"
$PY -m lgb sync
$PY -m lgb calibrate

say "Ready"
cat <<'EOF'
  python -m lgb list                    all problems, and which ones you have folders for
  python -m lgb bench 1                 compare every .cu in problems/001_*/
  python -m lgb profile 1 v1_naive --tool ncu
  jupyter lab LeetGPU_Bench.ipynb       same notebook as Colab
EOF
