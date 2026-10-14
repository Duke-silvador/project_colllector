#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CONBOOST 공통 경로 설정
#
# 세 단계(1_synthesis / 2_training / 3_evaluation)의 모든 스크립트가 이 파일을
# source 합니다. 아래 값을 직접 고치거나, 셸에서 환경변수로 덮어쓰세요.
#
#   export SWB_ROOT=/data/switchboard
#   ./2_training/scripts/train_peft_10h.sh
#
# 절대경로 하드코딩은 없습니다. 기본값은 모두 리포지토리 루트 기준입니다.
# ═══════════════════════════════════════════════════════════

CONBOOST_ROOT="${CONBOOST_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
export CONBOOST_ROOT

# ── 입력 데이터 (라이선스 데이터, 별도 준비 필요. README 2절 참고) ──────────
# Switchboard (LDC97S62): audio_wav/sw0XXXX{A,B}.wav + transcripts/**/*-trans.text
export SWB_ROOT="${SWB_ROOT:-$CONBOOST_ROOT/data/switchboard}"
export SWB_AUDIO_DIR="${SWB_AUDIO_DIR:-$SWB_ROOT/audio_wav}"
export SWB_TRANSCRIPT_DIR="${SWB_TRANSCRIPT_DIR:-$SWB_ROOT/transcripts}"

# FSD50K 개발셋 오디오 (Zenodo) — 노이즈 소스
export FSD50K_ROOT="${FSD50K_ROOT:-$CONBOOST_ROOT/data/FSD50K.dev_audio}"

# CHiME-3/4 코퍼스 루트 (data/annotations, data/audio/16kHz/embedded 포함)
export CHIME3_ROOT="${CHIME3_ROOT:-$CONBOOST_ROOT/data/CHiME3}"

# ── 중간 산출물 / 출력 ────────────────────────────────────
export OUTPUT_ROOT="${OUTPUT_ROOT:-$CONBOOST_ROOT/outputs}"

# [1] 합성 노이즈 (RUN_FAST.sh 출력)
export NOISE_DIR="${NOISE_DIR:-$OUTPUT_ROOT/noise/backgrounds}"
export NOISE_META_DIR="${NOISE_META_DIR:-$OUTPUT_ROOT/noise/metadata}"
export CLAP_CACHE="${CLAP_CACHE:-$OUTPUT_ROOT/fsd50k_clap_cache.pkl}"

# [1]→[2] 노이즈 믹싱된 Switchboard 채널 wav. apply_all_noise_snr.sh 가
#        $SWB_ROOT/audio_wav_ours_snr{5,10,20}/ 에, generate_random_noise.sh 가
#        $SWB_ROOT/audio_wav_random/ 에 씁니다 (원본과 같은 파일명 유지).
#        prepare_*_seeds.sh 가 여기서 읽어 $SWB_ROOT/processed_dataset_*_10h_seedN/ 을 만듭니다.

# [2] 학습 결과 (LoRA adapter)
export SAVED_MODELS_DIR="${SAVED_MODELS_DIR:-$OUTPUT_ROOT/saved_models}"

# [3] CHiME-4 평가셋 (prepare_chime4.sh 출력, eval_peft.py 입력)
export CHIME4_PROCESSED="${CHIME4_PROCESSED:-$OUTPUT_ROOT/chime4_processed}"

export LOG_DIR="${LOG_DIR:-$OUTPUT_ROOT/logs}"

# ── 실험 설정 (논문 설정) ─────────────────────────────────
export NUM_GPUS="${NUM_GPUS:-4}"
export SEEDS="${SEEDS:-66 77 88 99 111}"           # 10h 서브셋 샘플링 시드 5개
export SNR_LEVELS="${SNR_LEVELS:-5 10 20}"         # 본 실험 10 dB, ablation 5/20 dB
export MODELS="${MODELS:-openai/whisper-tiny openai/whisper-base openai/whisper-small openai/whisper-medium openai/whisper-large-v3}"
export SEED="${SEED:-42}"                          # 노이즈 합성 seed
export DEFAULT_SNR="${DEFAULT_SNR:-10}"

export PYTHON="${PYTHON:-python3}"

mkdir -p "$OUTPUT_ROOT" "$NOISE_DIR" "$NOISE_META_DIR" "$SAVED_MODELS_DIR" "$LOG_DIR" 2>/dev/null || true

# 필수 입력 존재 확인 헬퍼
cb_require_dir() {
    if [ ! -d "$1" ]; then
        echo "[ERROR] 디렉토리를 찾을 수 없습니다: $1"
        echo "        env.sh 를 수정하거나 환경변수로 지정하세요."
        return 1
    fi
    return 0
}
