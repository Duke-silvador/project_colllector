"""Render nginx config from template + state."""
import os, re, socket, subprocess
from common import *


def _ipv6():
    if not socket.has_ipv6 or os.environ.get("JX_IPV6", "auto") == "off":
        return False
    try:
        s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
        s.bind(("::", 0)); s.close()
        return True
    except OSError:
        return False


def _cpus():
    """Real CPUs for this container (Railway hosts report dozens of cores; 'auto' would spawn one
    nginx worker per host core and can eat the whole RAM of a small plan)."""
    n = 1
    try:
        n = len(os.sched_getaffinity(0))
    except Exception:
        n = os.cpu_count() or 1
    try:
        q, per = open("/sys/fs/cgroup/cpu.max").read().split()[:2]
        if q != "max":
            n = min(n, max(1, int(-(-int(q) // int(per)))))
    except Exception:
        pass
    return max(1, n)


def _extra_port():
    """Railway may also inject $PORT; answer there too so a healthcheck/domain on it never misses."""
    try:
        p = int(os.environ.get("PORT", "0"))
    except ValueError:
        return 0
    return p if 1 <= p <= 65535 and p not in (PUBLIC_PORT, PANEL_PORT, SUB_PORT, WS_PORT, HELPER_PORT, 62789, 11111) else 0


def _has_sub_filter():
    try:
        out = subprocess.run(["nginx", "-V"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=10).stdout.decode()
        return "http_sub_module" in out
    except Exception:
        return False

# lock add-on + cache-busting of panel scripts (an old broken copy in the browser cache can never be reused)
SUBF = ("            sub_filter_once off;\n"
        "            sub_filter '</body>' '<script src=\"/__jx/lock.js?v=5\" defer></script></body>';\n"
        "            sub_filter 'min.js\"></script>' 'min.js?jx=4\"></script>';\n"
        "            sub_filter 'min.css\">' 'min.css?jx=4\">';\n"
        "            sub_filter '.js?2.9.4\"' '.js?2.9.4&jx=4\"';\n"
        "            sub_filter '.css?2.9.4\"' '.css?2.9.4&jx=4\"';\n")

OPTIONAL = ("gzip", "charset ", "multi_accept", "worker_rlimit_nofile", "server_name_in_redirect",
            "keepalive_requests", "proxy_socket_keepalive")

TPL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nginx.conf.tpl")
OUT = os.path.join(RUN, "nginx.conf")


def nginx(st, safe=None):
    if safe is None:
        safe = bool(st.get("nginx_safe"))
    base = st["base"]
    fast = bool(st.get("turbo"))
    t = open(TPL, encoding="utf-8").read()
    rep = {
        "@@PORT@@": str(PUBLIC_PORT), "@@PANEL@@": str(PANEL_PORT), "@@SUB@@": str(SUB_PORT),
        "@@WSPORT@@": str(WS_PORT), "@@HELPER@@": str(HELPER_PORT), "@@WS@@": st["ws"],
        "@@BASE@@": base, "@@BASE_NOSLASH@@": base.rstrip("/"), "@@BASE_RE@@": re.escape(base),
        "@@IID@@": str(int(st.get("inbound_id") or 0)),
        "@@LISTENX@@": ("        listen 0.0.0.0:%d;\n" % _extra_port()) if _extra_port() else "",
        "@@WPROC@@": str(min(_cpus(), 4 if fast else 2)),
        "@@WCONN@@": "8192",
        "@@LOPTS@@": "" if safe else " reuseport backlog=4096",
        "@@SOCKKA@@": "" if safe else "    proxy_socket_keepalive on;\n",
        "@@LISTEN6@@": ("        listen [::]:%d default_server%s ipv6only=on;\n" % (PUBLIC_PORT, "" if safe else " reuseport backlog=4096")) if (_ipv6() and not safe) else "",
        "@@SUBFILTER@@": SUBF if (_has_sub_filter() and not safe) else "",
        "@@TURBO_WS@@": "" if safe else ("proxy_buffer_size 64k; proxy_buffers 8 64k; proxy_busy_buffers_size 128k;" if fast
                                          else "proxy_buffer_size 32k; proxy_buffers 8 32k; proxy_busy_buffers_size 64k;"),
    }
    for k, v in rep.items():
        t = t.replace(k, v)
    if safe:
        # safe config: keep only the core directives every nginx build understands
        t = "\n".join(l for l in t.split("\n") if not l.strip().startswith(OPTIONAL)) + "\n"
    assert "@@" not in t, "unrendered placeholder"
    os.makedirs(RUN, exist_ok=True)
    for d in ("ngx-body", "ngx-proxy", "ngx-fcgi", "ngx-uwsgi", "ngx-scgi"):
        os.makedirs("/tmp/" + d, exist_ok=True)
        try:
            os.chmod("/tmp/" + d, 0o1777)   # nginx workers must be able to write here
        except OSError:
            pass
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(t)
    os.replace(tmp, OUT)
    return OUT


if __name__ == "__main__":
    # used by init.sh: "render.py --safe" rebuilds a minimal config if nginx rejects the full one
    import sys
    st = load_state()
    safe = "--safe" in sys.argv
    if safe:
        st["nginx_safe"] = True
        save_state(st)
    print(nginx(st, safe))
