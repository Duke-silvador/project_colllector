#!/usr/bin/env python3
"""
grab_slides.py - Lấy từng trang của PDF đang xem trong Google Drive rồi ghép thành PDF.

Cài đặt (1 lần):
    pip install playwright img2pdf pillow imagehash
    playwright install chromium

Các lệnh (chạy theo thứ tự):
    python grab_slides.py login   "LINK"            # (nếu link yêu cầu đăng nhập) đăng nhập tay 1 lần
    python grab_slides.py explore "LINK"            # dò xem trình xem tải trang bằng cách nào
    python grab_slides.py fetch   --template "URL_CÓ_{page}" --pages 96   # CÁCH 1: tải ảnh gốc
    python grab_slides.py extract "LINK" --pages 96 --test 3              # CÁCH 3 (khuyên dùng với OneDrive/SharePoint): lấy thẳng ảnh từng trang
    python grab_slides.py shoot   "LINK" --pages 96 --test 3              # CÁCH 2: chụp từng trang
    python grab_slides.py build   --expect 96       # ghép ảnh trong output/images thành output/slides.pdf

Tuỳ chọn chung (đặt TRƯỚC tên lệnh):
    --name TEN      đặt tên bộ slide; ảnh vào output/TEN/images, PDF là output/TEN/TEN.pdf
                    (mỗi môn/tuần dùng 1 tên riêng để không lẫn ảnh)
    --auto          chạy không cần bấm Enter (dùng khi giao cho agent chạy)
    --chromium      dùng Chromium của Playwright thay vì Chrome thật
    --cdp           nối vào cửa sổ Chrome bạn tự mở (cổng 9222), dùng khi
                    cửa sổ do script mở không cuộn/không tải đủ trang. Xem hướng dẫn ở cuối file.

Chỉ dùng cho mục đích học tập cá nhân, không chia sẻ lại tài liệu của thầy.
"""
import argparse
import io
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROFILE_DIR = ROOT / "chrome-profile"      # profile trình duyệt riêng, lưu phiên đăng nhập
OUT_DIR = ROOT / "output" / "slides"       # được main() đổi theo --name
IMG_DIR = OUT_DIR / "images"
PDF_PATH = OUT_DIR / "slides.pdf"
AUTO = False                                # được main() đổi theo --auto
CDP_URL = None                              # được main() đổi theo --cdp

# ---------------------------------------------------------------------------
# CẤU HÌNH - agent sẽ điền các mục này sau khi chạy lệnh `explore`
# ---------------------------------------------------------------------------
VIEWPORT = {"width": 1500, "height": 780}   # phải NHỎ HƠN vùng hiển thị thật của cửa sổ, nếu không thanh công cụ bên dưới bị khuất
SCALE = 2                       # device_scale_factor: 2 = ảnh nét gấp đôi

# Selector CSS của MỖI TRANG trong trình xem (mỗi trang là 1 phần tử). Ví dụ: "canvas", "img.page"
PAGE_SELECTOR = None
# Selector của ô nhập số trang (ô hiện "8" trong "8 / 96"). Ví dụ: "input[aria-label*='rang']"
PAGE_INPUT_SELECTOR = None
# Nếu không có PAGE_SELECTOR thì chụp theo vùng cố định (toạ độ pixel của khung trang):
# CLIP = {"x": 352, "y": 61, "width": 1200, "height": 676}
CLIP = None
# Các phần tử cần ẩn trước khi chụp (thanh công cụ nổi...). Ví dụ: ["div.toolbar"]
HIDE_SELECTORS = []
# --- Dành cho lệnh `extract` ---
# OneDrive/SharePoint: khung chứa TẤT CẢ trang (dùng [class*=...] vì class có thể đổi khi Microsoft cập nhật)
CONTAINER_SELECTOR = '[class*="pdfContent_"]'
# Google Drive: container là div chứa tất cả trang ảnh
GDRIVE_CONTAINER_SELECTOR = '.ndfHFb-c4YZDc-cYSp0e-Oz6c3e'
# Google Drive: mỗi trang là một thẻ img lớn bên trong container
GDRIVE_PAGE_SELECTOR = 'img.ndfHFb-c4YZDc-cYSp0e-DARUcf-RJLb9c'
# Google Drive: ô nhập số trang (aria-label chứa 'Trang' tiếng Việt hoặc 'Page' tiếng Anh)
GDRIVE_INPUT_SELECTOR = 'input[aria-label*="Trang"], input[aria-label*="Page"]'
SETTLE_SECONDS = 1.0            # thời gian chờ trang render xong (tăng dần nếu phải thử lại)
# ---------------------------------------------------------------------------


def _is_gdrive(url):
    """Kiểm tra URL có phải Google Drive không."""
    return url and "drive.google.com" in url


def pause(msg):
    """Chế độ thường: chờ người dùng bấm Enter. Chế độ --auto: chỉ chờ trang tải."""
    if AUTO:
        time.sleep(6)
    else:
        input(msg)


def auto_scroll(page, steps=8):
    """Tự cuộn thử để trình xem tải thêm trang (dùng khi cuộn tay không được)."""
    try:
        v = page.viewport_size or {"width": 1000, "height": 700}
        page.mouse.click(v["width"] // 2, v["height"] // 2)
    except Exception:
        pass
    for _ in range(steps):
        page.mouse.wheel(0, 700)
        page.keyboard.press("PageDown")
        time.sleep(0.8)


def close_context(ctx):
    try:
        if CDP_URL:
            ctx.browser.close()     # chỉ ngắt kết nối, KHÔNG tắt Chrome của bạn
        else:
            ctx.close()
    except Exception:
        pass


def open_context(p, use_chromium=False):
    if CDP_URL:
        browser = p.chromium.connect_over_cdp(CDP_URL)
        return browser.contexts[0]
    base = dict(
        user_data_dir=str(PROFILE_DIR),
        headless=False,
        viewport=VIEWPORT,
        device_scale_factor=SCALE,
        args=["--disable-blink-features=AutomationControlled",
              "--window-position=0,0", "--window-size=1600,950"],
        ignore_default_args=["--enable-automation"],
    )
    if not use_chromium:
        try:
            return p.chromium.launch_persistent_context(channel="chrome", **base)
        except Exception as e:  # chưa cài Chrome thật
            print("Không mở được Chrome thật ({}), dùng Chromium của Playwright."
                  .format(str(e).splitlines()[0]))
    return p.chromium.launch_persistent_context(**base)


def open_page(ctx, url):
    if CDP_URL:
        page = ctx.new_page()
    else:
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.goto(url, wait_until="domcontentloaded")
    return page


# ----------------------------- login --------------------------------------
def cmd_login(a):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        ctx = open_context(p, a.chromium)
        open_page(ctx, a.url)
        pause("Đăng nhập Google bằng tay trong cửa sổ vừa mở (nếu cần), "
              "thấy slide hiện ra thì nhấn Enter ở đây...")
        close_context(ctx)
    print("Đã lưu phiên đăng nhập vào", PROFILE_DIR)


# ----------------------------- explore ------------------------------------
def cmd_explore(a):
    from playwright.sync_api import sync_playwright
    hits = []

    def on_response(resp):
        try:
            ct = resp.headers.get("content-type", "")
            if ct.startswith("image/"):
                size = int(resp.headers.get("content-length", "0") or 0)
                hits.append((resp.status, ct, size, resp.url))
        except Exception:
            pass

    with sync_playwright() as p:
        ctx = open_context(p, a.chromium)
        page = ctx.new_page() if CDP_URL else (ctx.pages[0] if ctx.pages else ctx.new_page())
        page.on("response", on_response)
        page.goto(a.url, wait_until="domcontentloaded")
        pause("Đợi trang tải xong. Có thể cuộn tay qua vài trang; nếu không cuộn được thì cứ nhấn Enter, script sẽ tự cuộn thử...")
        auto_scroll(page)

        print("\n=== Ảnh tải về qua mạng (lớn hơn 20KB hoặc không rõ kích thước) ===")
        shown = 0
        for status, ct, size, url in hits:
            if size == 0 or size > 20000:
                print("[{}] {} {}B\n    {}".format(status, ct, size, url[:300]))
                m = re.search(r"([?&]page=)(\d+)", url)
                if m:
                    print("    -> mẫu gợi ý:", url.replace(m.group(0), m.group(1) + "{page}", 1)[:300])
                shown += 1
        if not shown:
            print("(không thấy ảnh nào - trình xem có thể vẽ trang bằng canvas, dùng lệnh `shoot`)")

        info = page.evaluate("""() => {
            const out = {inputs: [], big: {}};
            document.querySelectorAll('input').forEach(i =>
                out.inputs.push({aria: i.getAttribute('aria-label'), value: i.value, cls: i.className}));
            document.querySelectorAll('canvas,img,div').forEach(e => {
                const r = e.getBoundingClientRect();
                if (r.width > 600 && r.height > 300 && r.width < 1900) {
                    const key = e.tagName + '.' + String(e.className).trim().split(/\\s+/).join('.');
                    out.big[key] = out.big[key] || {count: 0, w: Math.round(r.width), h: Math.round(r.height)};
                    out.big[key].count++;
                }
            });
            out.imgs = [...document.querySelectorAll('img')]
                .filter(i => i.getBoundingClientRect().width > 300).slice(0, 5)
                .map(i => ({src: i.src.slice(0, 40) + (i.src.length > 40 ? '...' : ''),
                            natural: i.naturalWidth + 'x' + i.naturalHeight,
                            shown: Math.round(i.getBoundingClientRect().width) + 'x' + Math.round(i.getBoundingClientRect().height)}));
            return out;
        }""")
        print("\n=== Các ô input trên trang (tìm ô số trang) ===")
        for i in info["inputs"]:
            print(i)
        print("\n=== Phần tử lớn (ứng viên cho PAGE_SELECTOR; count gần số trang đã cuộn qua là đúng) ===")
        for k, v in info["big"].items():
            print(k, v)
        print("\n=== Ảnh lớn: nguồn (đầu src), kích thước gốc, kích thước hiển thị ===")
        for i in info["imgs"]:
            print(i)
        close_context(ctx)


# ----------------------------- fetch (cách 1) -----------------------------
def cmd_fetch(a):
    from playwright.sync_api import sync_playwright
    ext_map = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        ctx = open_context(p, a.chromium)
        if a.url:
            open_page(ctx, a.url)
        for n in range(1, a.pages + 1):
            out_exists = list(IMG_DIR.glob("{:03d}.*".format(n)))
            if out_exists and not a.overwrite:
                continue
            value = n - 1 + a.first_index
            url = a.template.replace("{page}", str(value))
            resp = ctx.request.get(url)
            ct = resp.headers.get("content-type", "").split(";")[0]
            if not resp.ok or not ct.startswith("image/"):
                print("Trang {}: lỗi (status {}, {}). Dừng. Kiểm tra lại template/đăng nhập."
                      .format(n, resp.status, ct))
                break
            (IMG_DIR / "{:03d}{}".format(n, ext_map.get(ct, ".png"))).write_bytes(resp.body())
            print("Đã tải trang", n)
            time.sleep(0.3)
        close_context(ctx)


# ----------------------------- shoot (cách 2) -----------------------------
def best_visible_index(page):
    return page.evaluate("""(sel) => {
        const els = [...document.querySelectorAll(sel)];
        let best = -1, area = 0;
        els.forEach((e, i) => {
            const r = e.getBoundingClientRect();
            const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
            const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
            const a = Math.max(0, w) * Math.max(0, h);
            if (a > area) { area = a; best = i; }
        });
        return best;
    }""", PAGE_SELECTOR)


def go_to(page, n):
    """Đưa trang n vào màn hình. Trả về True nếu dùng ô nhập số trang."""
    if PAGE_INPUT_SELECTOR:
        box = page.locator(PAGE_INPUT_SELECTOR).first
        box.click()
        page.keyboard.press("ControlOrMeta+A")
        page.keyboard.type(str(n))
        page.keyboard.press("Enter")
        return True
    page.locator(PAGE_SELECTOR).nth(n - 1).scroll_into_view_if_needed()
    return False


def capture(page, n, jumped):
    if PAGE_SELECTOR:
        idx = best_visible_index(page) if jumped else n - 1
        return page.locator(PAGE_SELECTOR).nth(idx).screenshot()
    return page.screenshot(clip=CLIP)


def cmd_shoot(a):
    from playwright.sync_api import sync_playwright
    from PIL import Image, ImageStat
    import imagehash

    if not PAGE_SELECTOR and not PAGE_INPUT_SELECTOR:
        sys.exit("Hãy điền PAGE_SELECTOR hoặc PAGE_INPUT_SELECTOR ở đầu file (dùng kết quả của `explore`).")
    if not PAGE_SELECTOR and not CLIP:
        sys.exit("Không có PAGE_SELECTOR thì phải điền CLIP (vùng chụp).")

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    last = min(a.pages, a.test) if a.test else a.pages

    def is_blank(img):
        return ImageStat.Stat(img.convert("L")).stddev[0] < 2.0

    with sync_playwright() as p:
        ctx = open_context(p, a.chromium)
        page = open_page(ctx, a.url)
        pause("Chờ trang đầu hiện ra, ĐÓNG thanh bên trái (Hình thu nhỏ/Mục lục) nếu đang mở, rồi nhấn Enter...")
        if HIDE_SELECTORS:
            page.add_style_tag(content=", ".join(HIDE_SELECTORS) + " { display: none !important; }")

        prev_hash = None
        for n in range(1, last + 1):
            out = IMG_DIR / "{:03d}.png".format(n)
            if out.exists() and not a.overwrite:
                prev_hash = imagehash.phash(Image.open(out).convert("RGB"))
                continue

            jumped = go_to(page, n)
            img, h = None, None
            for attempt in range(3):
                time.sleep(SETTLE_SECONDS * (attempt + 1))
                img = Image.open(io.BytesIO(capture(page, n, jumped))).convert("RGB")
                h = imagehash.phash(img)
                if not is_blank(img) and (prev_hash is None or h != prev_hash):
                    break
                print("  trang {}: trống hoặc trùng trang trước, thử lại ({}/3)".format(n, attempt + 1))
            else:
                print("  CẢNH BÁO trang {}: vẫn nghi trống/trùng, hãy kiểm tra thủ công".format(n))
            img.save(out)
            prev_hash = h
            print("Đã chụp trang {}/{}".format(n, last))
        close_context(ctx)


# ----------------------------- extract (cách 3) ---------------------------
# Chọn ảnh trang đang hiện rõ nhất trong màn hình (không phụ thuộc phép tính chỉ số trang).
GRAB_JS = """({container, minW, grab}) => {
    const c = document.querySelector(container);
    if (!c) return {state: 'no-container'};
    const cr = c.getBoundingClientRect();
    let best = null, bestArea = 0;
    const seen = [];
    for (const im of c.querySelectorAll('img')) {
        const r = im.getBoundingClientRect();
        if (r.width < 300) continue;
        const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
        const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
        const area = Math.max(0, w) * Math.max(0, h);
        seen.push({rel: Math.round(r.top - cr.top), area: Math.round(area), nat: im.naturalWidth});
        if (area > bestArea) { bestArea = area; best = im; }
    }
    if (!best) return {state: 'missing', seen: seen};
    const rel = Math.round(best.getBoundingClientRect().top - cr.top);
    if (!best.complete || best.naturalWidth < minW) return {state: 'loading', rel: rel, seen: seen};
    if (!grab) return {state: 'ready', rel: rel, src: best.src, seen: seen};
    const cv = document.createElement('canvas');
    cv.width = best.naturalWidth; cv.height = best.naturalHeight;
    cv.getContext('2d').drawImage(best, 0, 0);
    return {state: 'ok', rel: rel, src: best.src, nat: best.naturalWidth, h: best.naturalHeight,
            data: cv.toDataURL('image/png'), seen: seen};
}"""


def show_toolbar(page, box, tries=5):
    """Thanh công cụ nổi (có ô số trang) tự ẩn khi không dùng; di chuột để nó hiện ra."""
    try:
        w, h = page.evaluate("() => [innerWidth, innerHeight]")
    except Exception:
        w, h = 1200, 700
    for _ in range(tries):
        try:
            if box.is_visible():
                return True
        except Exception:
            pass
        for x, y in ((w * 0.5, h * 0.5), (w * 0.5, h - 70), (w * 0.5 + 30, h - 45)):
            page.mouse.move(x, y, steps=8)
            time.sleep(0.3)
    try:
        return box.is_visible()
    except Exception:
        return False


def jump_to_page(page, sel, n):
    box = page.locator(sel).first
    if show_toolbar(page, box):
        box.click(timeout=3000)
    else:  # thanh công cụ vẫn ẩn: thử chọn ô số trang bằng JS
        try:
            box.evaluate("e => { e.focus(); if (e.select) e.select(); }")
            focused = box.evaluate("e => document.activeElement === e")
        except Exception:
            focused = False
        if not focused:
            sys.exit("Không chọn được ô số trang vì thanh công cụ của trình xem đang ẩn.\n"
                     "Hãy chuyển sang cửa sổ Chrome, di chuột trong trình xem cho thanh công cụ "
                     "(có ô 'x / N') hiện ra, kiểm tra tab đang ở phía trước, rồi chạy lại lệnh.")
    page.keyboard.press("ControlOrMeta+A")
    page.keyboard.type(str(n))
    page.keyboard.press("Enter")


def cmd_extract(a):
    import base64
    import hashlib
    from playwright.sync_api import sync_playwright

    N = a.pages
    last = min(N, a.test) if a.test else N
    gdrive = _is_gdrive(a.url)

    if gdrive:
        input_sel = GDRIVE_INPUT_SELECTOR
        print("Phat hien Google Drive — dung che do extract cho Google Drive.")
    else:
        input_sel = PAGE_INPUT_SELECTOR or 'input[aria-label*="{}"]'.format(N)

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    failed = []
    args = {"container": CONTAINER_SELECTOR, "minW": a.min_width, "grab": False}

    def box_value(pg):
        try:
            return pg.locator(input_sel).first.input_value(timeout=1500)
        except Exception:
            return None

    def grab_gdrive_page(pg, n):
        """Lay anh trang n tu Google Drive bang cach chup screenshot phan tu img."""
        jump_to_page(pg, input_sel, n)
        for attempt in range(16):
            time.sleep(0.75)
            imgs = pg.locator(GDRIVE_PAGE_SELECTOR).all()
            if not imgs:
                continue
            best_img, best_area = None, 0
            for img in imgs:
                try:
                    bb = img.bounding_box()
                    if not bb or bb["width"] < 300:
                        continue
                    vw, vh = pg.evaluate("() => [innerWidth, innerHeight]")
                    visible_w = min(bb["x"] + bb["width"], vw) - max(bb["x"], 0)
                    visible_h = min(bb["y"] + bb["height"], vh) - max(bb["y"], 0)
                    area = max(0, visible_w) * max(0, visible_h)
                    if area > best_area:
                        best_area = area
                        best_img = img
                except Exception:
                    continue
            if best_img is None:
                continue
            nat_w = best_img.evaluate("e => e.naturalWidth")
            if nat_w < a.min_width:
                continue
            # Ve anh len canvas roi xuat PNG - tranh loi blob chua load xong
            result = best_img.evaluate("""async (img) => {
                if (!img.complete || img.naturalWidth === 0)
                    return {ok: false, err: 'not loaded'};
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                return new Promise(resolve => {
                    canvas.toBlob(blob => {
                        if (!blob) return resolve({ok: false, err: 'toBlob failed'});
                        const reader = new FileReader();
                        reader.onload = e => resolve({
                            ok: true,
                            data: e.target.result.split(',')[1],
                            nat: img.naturalWidth,
                            h: img.naturalHeight
                        });
                        reader.readAsDataURL(blob);
                    }, 'image/png');
                });
            }""")
            if not result or not result.get("ok"):
                # Fallback: canvas that bai -> chup screenshot element
                best_img.scroll_into_view_if_needed()
                time.sleep(0.3)
                return best_img.screenshot(), (None, None)
            import base64 as _b64
            raw = _b64.b64decode(result["data"])
            return raw, (result["nat"], result["h"])
        return None, None

    with sync_playwright() as p:
        ctx = open_context(p, a.chromium)
        page = open_page(ctx, a.url)
        pause("Cho slide dau tien hien ra ro net, roi nhan Enter...")
        page.bring_to_front()

        prev_hash = None
        for n in range(1, last + 1):
            out = IMG_DIR / "{:03d}.png".format(n)
            if out.exists() and not a.overwrite:
                prev_hash = hashlib.sha256(out.read_bytes()).hexdigest()
                continue

            data = None
            if gdrive:
                for jump_try in range(3):
                    raw, sz = grab_gdrive_page(page, n)
                    if raw is None:
                        print("  trang {}: chua load duoc, thu lai {}/3".format(n, jump_try + 1))
                        continue
                    h = hashlib.sha256(raw).hexdigest()
                    if h == prev_hash:
                        print("  trang {}: anh trung trang truoc, thu lai {}/3".format(n, jump_try + 1))
                        time.sleep(1.5)
                        continue
                    data = raw
                    prev_hash = h
                    if sz and sz[0]:
                        w_out, h_out = sz
                    else:
                        import io as _io
                        from PIL import Image as _Img
                        w_out, h_out = _Img.open(_io.BytesIO(raw)).size
                    shown = box_value(page)
                    note = "" if shown in (None, str(n)) else "  (o trang hien {})".format(shown)
                    print("Da lay trang {}/{} ({}x{}){}".format(n, last, w_out, h_out, note))
                    break
            else:
                info = None
                for jump_try in range(3):
                    jump_to_page(page, input_sel, n)
                    time.sleep(0.8)
                    last_poll, got = None, None
                    for _ in range(16):
                        time.sleep(0.75)
                        r = page.evaluate(GRAB_JS, dict(args, grab=False))
                        info = r
                        if r["state"] == "no-container":
                            sys.exit("Khong thay khung chua trang. Kiem tra CONTAINER_SELECTOR o dau file.")
                        if r["state"] == "ready":
                            if last_poll and last_poll["rel"] == r["rel"] and last_poll["src"] == r["src"]:
                                got = page.evaluate(GRAB_JS, dict(args, grab=True))
                                break
                            last_poll = r
                        else:
                            last_poll = None
                    if not got or got.get("state") != "ok":
                        continue
                    raw = base64.b64decode(got["data"].split(",", 1)[1])
                    if hashlib.sha256(raw).hexdigest() == prev_hash:
                        print("  trang {}: anh trung trang truoc, thu lai {}/3".format(n, jump_try + 1))
                        continue
                    data = raw
                    prev_hash = hashlib.sha256(data).hexdigest()
                    shown = box_value(page)
                    note = "" if shown in (None, str(n)) else "  (luu y: o so trang hien {})".format(shown)
                    print("Da lay trang {}/{} ({}x{}){}".format(n, last, got["nat"], got["h"], note))
                    break
                if data is None:
                    print("  CANH BAO trang {}: khong lay duoc. O so trang: {}. Chan doan: {}"
                          .format(n, box_value(page), {k: v for k, v in (info or {}).items() if k != "data"}))

            if data is None:
                failed.append(n)
                continue
            out.write_bytes(data)
        close_context(ctx)

    if failed:
        print("Cac trang chua lay duoc:", failed, "- chay lai lenh nay de thu rieng cac trang do.")



# ----------------------------- build --------------------------------------
def cmd_build(a):
    import img2pdf
    import imagehash
    from PIL import Image

    exts = {".png", ".jpg", ".jpeg", ".webp"}
    files = sorted(f for f in IMG_DIR.glob("*") if f.suffix.lower() in exts)
    if not files:
        sys.exit("Không có ảnh trong " + str(IMG_DIR))

    if a.expect:
        have = {int(f.stem) for f in files if f.stem.isdigit()}
        missing = [n for n in range(1, a.expect + 1) if n not in have]
        if len(files) != a.expect or missing:
            print("CẢNH BÁO: có {} ảnh, mong đợi {}. Thiếu trang: {}".format(len(files), a.expect, missing or "không rõ"))

    blobs, prev = [], None
    for f in files:
        img = Image.open(f).convert("RGB")
        h = imagehash.phash(img)
        if prev is not None and h == prev:
            print("Nghi trùng với trang liền trước:", f.name)
        prev = h
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        blobs.append(buf.getvalue())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PDF_PATH.write_bytes(img2pdf.convert(blobs))
    print("Đã tạo {} ({} trang)".format(PDF_PATH, len(blobs)))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--chromium", action="store_true", help="dùng Chromium của Playwright thay vì Chrome thật")
    ap.add_argument("--name", default="slides", help="tên bộ slide (thư mục con trong output/)")
    ap.add_argument("--auto", action="store_true", help="không chờ bấm Enter")
    ap.add_argument("--cdp", action="store_true",
                    help="nối vào Chrome đang mở với --remote-debugging-port=9222")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("login");   s.add_argument("url");   s.set_defaults(fn=cmd_login)
    s = sub.add_parser("explore"); s.add_argument("url");   s.set_defaults(fn=cmd_explore)

    s = sub.add_parser("fetch")
    s.add_argument("--template", required=True, help="URL ảnh của 1 trang, thay số trang bằng {page}")
    s.add_argument("--pages", type=int, required=True)
    s.add_argument("--first-index", type=int, default=0, help="giá trị của tham số page ứng với trang 1 (0 hoặc 1)")
    s.add_argument("--url", help="link Drive (để nạp cookie nếu cần)")
    s.add_argument("--overwrite", action="store_true")
    s.set_defaults(fn=cmd_fetch)

    s = sub.add_parser("shoot")
    s.add_argument("url")
    s.add_argument("--pages", type=int, required=True)
    s.add_argument("--test", type=int, default=0, help="chỉ chụp N trang đầu để thử")
    s.add_argument("--overwrite", action="store_true")
    s.set_defaults(fn=cmd_shoot)

    s = sub.add_parser("extract")
    s.add_argument("url")
    s.add_argument("--pages", type=int, required=True)
    s.add_argument("--test", type=int, default=0, help="chỉ lấy N trang đầu để thử")
    s.add_argument("--min-width", type=int, default=1000,
                   help="bỏ qua ảnh có chiều rộng gốc nhỏ hơn mức này (ảnh xem trước mờ)")
    s.add_argument("--overwrite", action="store_true")
    s.set_defaults(fn=cmd_extract)

    s = sub.add_parser("build")
    s.add_argument("--expect", type=int, default=0, help="số trang mong đợi")
    s.set_defaults(fn=cmd_build)

    a = ap.parse_args()
    global AUTO, OUT_DIR, IMG_DIR, PDF_PATH, CDP_URL
    AUTO = a.auto
    CDP_URL = "http://localhost:9222" if a.cdp else None
    OUT_DIR = ROOT / "output" / a.name
    IMG_DIR = OUT_DIR / "images"
    PDF_PATH = OUT_DIR / (a.name + ".pdf")
    a.fn(a)


if __name__ == "__main__":
    main()


# ---------------------------------------------------------------------------
# DÙNG --cdp (Windows, PowerShell): tự mở Chrome "thường" rồi để script nối vào
#   1) Tắt các cửa sổ Chrome dùng riêng profile bên dưới (nếu có), rồi chạy:
#      & "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" `
#        --remote-debugging-port=9222 --user-data-dir="D:\\Antigravity\\slide_grabber\\chrome-cdp-profile"
#   2) Trong cửa sổ Chrome đó: mở link, đăng nhập nếu cần, kiểm tra cuộn được bình thường.
#   3) Chạy script như thường nhưng thêm --cdp trước tên lệnh, ví dụ:
#      python grab_slides.py --cdp explore "LINK"
#   Script chỉ mở thêm 1 tab trong Chrome đó và ngắt kết nối khi xong, không tắt Chrome của bạn.
# ---------------------------------------------------------------------------