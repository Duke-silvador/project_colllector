#!/usr/bin/env bash
set -Eeuo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
TARGET=${SOPHON_SSH_TARGET:-linaro@192.168.150.1}
KNOWN=${SOPHON_KNOWN_HOSTS:-$HOME/.ssh/known_hosts_sophon_ethernet}
CONTROL=${SOPHON_SSH_CONTROL:-/tmp/openvins-focal-%C}
DURATION=${SOPHON_DURATION:-300}
[[ "$DURATION" =~ ^[0-9]+$ ]] && ((DURATION>0 && DURATION<=600)) || { echo 'SOPHON_DURATION must be 1–600 seconds'; exit 2; }
SSH=(ssh -o "UserKnownHostsFile=$KNOWN" -o "ControlPath=$CONTROL" -o ControlMaster=auto -o ControlPersist=600 -o ConnectTimeout=10)
"${SSH[@]}" "$TARGET" true
running=$("${SSH[@]}" -o BatchMode=yes "$TARGET" 'docker inspect -f "{{.State.Running}}" openvins-image-accel-live 2>/dev/null || true')
[[ "$running" != true ]] || { echo 'An OpenVINS acceleration trial is already running on the board.'; exit 1; }
set +u
source /opt/ros/humble/setup.bash
set -u
export ROS_DOMAIN_ID=48 ROS_LOCALHOST_ONLY=0 RMW_IMPLEMENTATION=rmw_cyclonedds_cpp
export CYCLONEDDS_URI="file://${OPENVINS_HOST_NETWORK_CONFIG:-$HERE/deployment/network/sophon_host.xml}"
cmake -S "$HERE/host_live_path" -B "$HERE/host_live_path/build" -DCMAKE_BUILD_TYPE=Release
cmake --build "$HERE/host_live_path/build" -j2
remote_pid='';helper_pid=''
cleanup(){
 local rc=$?;trap - EXIT INT TERM
 if [[ -n "$remote_pid" ]]; then
  "${SSH[@]}" -o BatchMode=yes "$TARGET" 'docker stop --time 20 openvins-image-accel-live >/dev/null 2>&1 || true' || true
  wait "$remote_pid" 2>/dev/null || true
 fi
 if [[ -n "$helper_pid" ]]; then kill -TERM "$helper_pid" 2>/dev/null || true;wait "$helper_pid" 2>/dev/null || true;fi
 exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"$HERE/host_live_path/build/live_path" & helper_pid=$!
"${SSH[@]}" -o BatchMode=yes "$TARGET" "ESTIMATOR_LIBRARY=tracking_lean IMAGE_PUBLISH_HZ=15 bash /home/linaro/openvins_accel_20261019/run_tracking_optimized.sh vio $DURATION" & remote_pid=$!
echo 'OpenVINS runs on the board. RViz runs here. Keep the tower still for initialization.'
rviz2 -d "$HERE/host_live_path/rviz_live_path.rviz"
