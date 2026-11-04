#!/bin/bash
# nyanpass 节点端一键安装。用法与官方脚本相同，但不再向官方地址拉取新版本。
# 锁定版本：nc20260412（2026-04-12）
#
# 海外：从 GitHub Release 下载压缩包
#   bash <(curl -fLSs https://raw.githubusercontent.com/sinalphabeta/nyanpass-scripts/main/nyanpass-install.sh) rel_nodeclient "-t TOKEN -u https://面板域名"
# 国内：末尾加 -c china，从仓库内的压缩包经加速站下载
#   bash <(curl -fLSs https://cdn.jsdmirror.com/gh/sinalphabeta/nyanpass-scripts@nc20260412/nyanpass-install.sh) rel_nodeclient "-t TOKEN -u https://面板域名" -c china
set -e
if [ -n "$DEBUG_INSTALL" ]; then
	set -x
fi

warning() { echo -e "\033[31m\033[01m$*\033[0m"; }         # 红色
error() { echo -e "\033[31m\033[01m$*\033[0m" && exit 1; } # 红色
info() { echo -e "\033[32m\033[01m$*\033[0m"; }            # 绿色
hint() { echo -e "\033[33m\033[01m$*\033[0m"; }            # 黄色

NODE_VERSION="nc20260412"
RELEASE_REPO="${NYANPASS_RELEASE_REPO:-sinalphabeta/nyanpass-scripts}"
RELEASE_TAG="${NYANPASS_RELEASE_TAG:-binary}"
PIN_TAG="${NYANPASS_PIN_TAG:-nc20260412}"
CHINA_BINARY_BASE="${NYANPASS_CHINA_BINARY_BASE:-https://cdn.jsdmirror.com/gh/${RELEASE_REPO}@${PIN_TAG}}"

PRODUCT_EXE="$1"
PRODUCT_ARGUMENTS="$2"
if [ "$3" = "-c" ] && [ "$4" = "china" ] && [ -z "$5" ]; then
	USE_CHINA=1
elif [ -n "$3" ]; then
	error "输入有误"
fi

hint "重要提示："
hint "若您在 [中国商家的机器] 安装节点端，您可能需要考虑：部分主机商可能会因此认定您的实例违规（特别是涉及跨境流量的情况）。如有不确定请先取消安装。"
hint "--------"
info "节点端版本已锁定为 ${NODE_VERSION}，不会跟随官方更新。"

if [ "$PRODUCT_EXE" != "rel_nodeclient" ]; then
	error "此脚本只安装节点端。"
fi

if [ -z "$PRODUCT_ARGUMENTS" ]; then
	error "输入有误"
fi

if [ "$PRODUCT_ARGUMENTS" == "update" ]; then
	if [ -z "$BG_UPDATE" ]; then
		BG_UPDATE=1 bash "update.sh" "$1" "$2" >/dev/null 2>&1 &
		exit
	fi
fi

#### 判断处理器架构

case $(uname -m) in
aarch64 | arm64) ARCH=arm64 ;;
x86_64 | amd64) [[ "$(awk -F ':' '/flags/{print $2; exit}' /proc/cpuinfo)" =~ avx2 ]] && ARCH=amd64v3 || ARCH=amd64 ;;
*) error "cpu not supported" ;;
esac

if grep "Intel Core Processor (Broadwell)" /proc/cpuinfo >/dev/null 2>&1; then
	ARCH=amd64
fi

case "$ARCH" in
amd64) EXPECT_SHA256=6c7b57e41b08be160b5b2d5cc934e8e8518c8491864e9d3910f98763418a7bd6 ;;
amd64v3) EXPECT_SHA256=4241674907e84255debce2bc5cf277ea7ca06dc1d2d9d6fd7e21ad8cd8f87610 ;;
arm64) EXPECT_SHA256=dbcd544305b0d21088d8931efec5f57ab586634e26e12725a6dd1daf561ad274 ;;
*) error "cpu not supported" ;;
esac

ASSET="rel_nodeclient_linux_${ARCH}.tar.gz"
if [ -n "$NYANPASS_BINARY_BASE" ]; then
	BINARY_URL="${NYANPASS_BINARY_BASE%/}/${ASSET}"
elif [ -n "$USE_CHINA" ]; then
	BINARY_URL="${CHINA_BINARY_BASE%/}/${ASSET}"
else
	BINARY_URL="https://github.com/${RELEASE_REPO}/releases/download/${RELEASE_TAG}/${ASSET}"
fi

#### 重复安装

echo_uninstall() {
	echo "rm -f /etc/systemd/system/$1.service ; rm -rf /opt/$1 ; systemctl disable --now $1"
}

echo_uninstall_to_file() {
	echo "rm -f /etc/systemd/system/$1.service ; rm -rf /opt/$1 ; systemctl disable --now $1" >"$2"
}

sha256_file() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print $1}'
	elif command -v shasum >/dev/null 2>&1; then
		shasum -a 256 "$1" | awk '{print $1}'
	else
		error "缺少 sha256sum，无法校验节点端。"
	fi
}

#### 询问用户

if [ -z "$S" ]; then
	if [ -z "$BG_UPDATE" ]; then
		read -p "请输入服务名 [默认 nyanpass] : " service_name
		if [ -z "$service_name" ]; then
			service_name="nyanpass"
		fi
		if [[ ! "$service_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
			error "服务名不符合规则，只接受英文和数字。"
		fi
		#
		if [ -f "/etc/systemd/system/${service_name}.service" ]; then
			hint "该服务已经存在，请先运行以下命令卸载："
			echo_uninstall "$service_name"
			read -p "或者您也可以输入 [u] 重装程序（保留配置），输入 [r] 彻底重装（不保留配置）: " reinstall
			reinstall=$(echo "$reinstall" | awk '{print$1}')
			if [ "${reinstall,,}" == "u" ]; then
				REINSTALL=1
			elif [ "${reinstall,,}" == "r" ]; then
				rm -rf "/opt/$service_name"
			else
				exit
			fi
		fi
		##
		read -p "是否优化系统参数 [输入 y 优化] : " youhua
		youhua=$(echo "$youhua" | awk '{print$1}')
		if [ "${youhua,,}" == "y" ]; then
			OPTIMIZE=1
		fi
		##
		read -p "是否安装常用工具 [输入 y 安装] : " azcygj
		azcygj=$(echo "$azcygj" | awk '{print$1}')
		if [ "${azcygj,,}" == "y" ]; then
			INSTALL_TOOLS=1
		fi
	else
		service_name=$(basename "$PWD")
	fi
else
	# 静默安装
	service_name="$S"
fi

#### ？

if [ -z "$BG_UPDATE" ]; then
	#### 检查重复对接
	nyaUUID=$(echo "$PRODUCT_ARGUMENTS" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}' || true)
	if [ -n "$nyaUUID" ]; then
		if [ -z "$REINSTALL" ]; then
			nyaFiles=$(grep -R --include "start.sh" -- "$nyaUUID" /opt || true)
		else
			nyaFiles=$(grep -R --include "start.sh" --exclude-dir="$service_name" -- "$nyaUUID" /opt || true)
		fi
		if [ -n "$nyaFiles" ]; then
			warning "检测到重复对接，会影响正常运行。参考信息如下："
			echo "$nyaFiles"
			error "请卸载上述服务，再进行对接。"
		fi
	fi
	####
	mkdir -p /etc/systemd/system
	mkdir -p ~/.config
	mkdir -p /opt/"${service_name}"
	cd /opt/"${service_name}"
	#### 安装一些常用工具
	if [ -n "$INSTALL_TOOLS" ]; then
		apt-get update
		apt-get install -y wget curl mtr-tiny iftop unzip htop net-tools dnsutils nload psmisc nano screen
	fi
fi

#### Download

rm -rf temp_backup
mkdir -p temp_backup

if [ -z "$NO_DOWNLOAD" ]; then
	command -v tar >/dev/null 2>&1 || error "缺少 tar，无法解压节点端。"
	command -v gzip >/dev/null 2>&1 || error "缺少 gzip，无法解压节点端。"
	mv "$PRODUCT_EXE" temp_backup/ || true
	info "正在下载 ${ASSET}"
	info "$BINARY_URL"
	archive="${ASSET}.partial"
	if ! curl ${CURL_FLAGS:+$CURL_FLAGS} -fL --retry 3 --retry-delay 2 -o "$archive" "$BINARY_URL"; then
		rm -f "$archive"
		mv temp_backup/* . || true
		error "下载失败。请确认 Release「${RELEASE_TAG}」里已有 ${ASSET}。"
	fi
	got_sha=$(sha256_file "$archive")
	if [ "$got_sha" != "$EXPECT_SHA256" ]; then
		rm -f "$archive"
		mv temp_backup/* . || true
		error "校验失败，下载到的文件与锁定的 ${NODE_VERSION} 不一致。"
	fi
	rm -rf temp_download
	mkdir -p temp_download
	if ! gzip -dc "$archive" | tar -xf - -C temp_download; then
		rm -rf temp_download
		rm -f "$archive"
		mv temp_backup/* . || true
		error "解压失败。"
	fi
	if [ ! -f "temp_download/${PRODUCT_EXE}" ]; then
		rm -rf temp_download
		rm -f "$archive"
		mv temp_backup/* . || true
		error "压缩包里没有 ${PRODUCT_EXE}。"
	fi
	mv "temp_download/${PRODUCT_EXE}" "$PRODUCT_EXE"
	chmod +x "$PRODUCT_EXE"
	rm -rf temp_download
	rm -f "$archive"
fi

if [ -f "$PRODUCT_EXE" ]; then
	rm -rf temp_backup
else
	mv temp_backup/* . || true
	error "下载失败！"
fi

#### Install

rm -rf download.sh update.sh nyanpass-install.sh temp_backup temp_download "${ASSET}.partial"

if [ ! -f "start.sh" ]; then
	echo 'source ./env.sh || true' >>start.sh
	echo './'"$PRODUCT_EXE" "$PRODUCT_ARGUMENTS" >>start.sh
fi

if [ ! -f "env.sh" ]; then
	touch env.sh
fi

echo "[Unit]
Description=nyanpass
After=network-online.target
Wants=network-online.target systemd-networkd-wait-online.service
[Service]
Type=simple
LimitAS=infinity
LimitRSS=infinity
LimitCORE=infinity
LimitNOFILE=999999
User=root
Restart=always
RestartSec=3
WorkingDirectory=/opt/${service_name}
ExecStart=/bin/bash /opt/${service_name}/start.sh
[Install]
WantedBy=multi-user.target
" >/etc/systemd/system/"${service_name}".service

systemctl daemon-reload
systemctl enable "${service_name}"
systemctl restart "${service_name}"

info "安装成功"
info "节点端版本: ${NODE_VERSION} (${ARCH})"
info "如需卸载，请运行以下命令："
echo_uninstall "$service_name"

UNINSTALL_FILE="/opt/${service_name}.uninstall.sh"
echo_uninstall_to_file "$service_name" "$UNINSTALL_FILE"
info "或者："
echo "bash $UNINSTALL_FILE"

if [ -n "$BG_UPDATE" ]; then
	# TODO BUG?
	if [ -n "$NYP_DOCKER" ]; then
		kill -9 1
	fi
fi

echo

#### 系统参数优化

if [ -n "$OPTIMIZE" ]; then
	info "正在优化系统参数..."
	rm -f /etc/sysctl.d/ny.conf
	echo '
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr

net.ipv4.conf.all.rp_filter = 0
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_ecn = 0
net.ipv4.tcp_frto = 0
net.ipv4.tcp_mtu_probing = 0
net.ipv4.tcp_rfc1337 = 1
net.ipv4.tcp_sack = 1
net.ipv4.tcp_fack = 1
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_adv_win_scale = -2
net.ipv4.tcp_moderate_rcvbuf = 1
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.udp_rmem_min = 8192
net.ipv4.udp_wmem_min = 8192
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.core.somaxconn = 4096
net.ipv4.tcp_abort_on_overflow = 1

vm.swappiness = 10
fs.file-max = 6553560
' >/etc/sysctl.d/ny.conf
	sysctl --system
fi

info "tcp_congestion_control: " "$(cat /proc/sys/net/ipv4/tcp_congestion_control)"
