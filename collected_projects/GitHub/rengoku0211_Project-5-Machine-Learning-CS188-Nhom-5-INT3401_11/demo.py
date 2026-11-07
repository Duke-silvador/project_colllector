
import contextlib
import os
import queue
import random
import threading
import traceback
import tkinter as tk
from tkinter import messagebox, ttk
 
import matplotlib
 
matplotlib.use("TkAgg")
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg  # noqa: E402
from matplotlib.figure import Figure  # noqa: E402
 
import numpy as np  # noqa: E402
import torch  # noqa: E402
 
import backend  # noqa: E402
 
backend.use_graphics = False  # tắt cửa sổ matplotlib của autograder, UI tự vẽ
 
IMPORT_ERRORS = []
try:
    import models
except Exception:
    models = None
    IMPORT_ERRORS.append("models.py: " + traceback.format_exc().strip().splitlines()[-1])
try:
    import train
except Exception:
    train = None
    IMPORT_ERRORS.append("train.py: " + traceback.format_exc().strip().splitlines()[-1])
try:
    import losses
except Exception:
    losses = None
    IMPORT_ERRORS.append("losses.py: " + traceback.format_exc().strip().splitlines()[-1])
 
WEIGHT_DIR = "ui_weights"
 
 
# ----------------------------------------------------------------------------
# Tiện ích chung
# ----------------------------------------------------------------------------
def save_weights(model, name):
    os.makedirs(WEIGHT_DIR, exist_ok=True)
    torch.save(model.state_dict(), os.path.join(WEIGHT_DIR, name + ".pt"))
 
 
def load_weights(model, name):
    path = os.path.join(WEIGHT_DIR, name + ".pt")
    if not os.path.exists(path):
        raise FileNotFoundError("Chưa có file trọng số " + path + ". Hãy bấm Train trước.")
    model.load_state_dict(torch.load(path))
 
 
class QueueWriter:
    """Chuyển các dòng print() của hàm train sang hàng đợi để hiện lên nhật ký."""
 
    def __init__(self, q):
        self.q = q
        self.buf = ""
 
    def write(self, s):
        self.buf += s
        while "\n" in self.buf:
            line, self.buf = self.buf.split("\n", 1)
            if line.strip():
                self.q.put(("log", line))
        return len(s)
 
    def flush(self):
        pass
 
 
class TabBase(ttk.Frame):
    """Khung chung cho mỗi tab: nhật ký, chạy tác vụ nền, cập nhật định kỳ."""
 
    POLL_MS = 150
    TICK_EVERY = 1
 
    def __init__(self, master, app):
        super().__init__(master, padding=8)
        self.app = app
        self.q = queue.Queue()
        self.training = False
        self._ticks = 0
        self._on_done = None
        self.lock_widgets = []
        self.status = tk.StringVar(value="")
 
    def make_log(self, parent, height=7):
        frame = ttk.LabelFrame(parent, text="Nhật ký")
        self.logbox = tk.Text(frame, height=height, state="disabled", wrap="word", font=("Consolas", 9))
        sb = ttk.Scrollbar(frame, command=self.logbox.yview)
        self.logbox.configure(yscrollcommand=sb.set)
        self.logbox.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        return frame
 
    def log(self, msg):
        self.logbox.configure(state="normal")
        self.logbox.insert("end", str(msg) + "\n")
        self.logbox.see("end")
        self.logbox.configure(state="disabled")
 
    def fail(self, exc):
        self.log(traceback.format_exc())
        self.status.set("Lỗi: " + str(exc)[:120])
 
    def run_task(self, fn, on_done=None):
        if self.app.busy:
            messagebox.showinfo("Đang bận", "Đang có một tác vụ huấn luyện khác. Hãy chờ nó xong.")
            return
        self.app.busy = True
        self.training = True
        self._on_done = on_done
        for w in self.lock_widgets:
            w.state(["disabled"])
 
        def worker():
            writer = QueueWriter(self.q)
            try:
                with contextlib.redirect_stdout(writer):
                    fn()
                if writer.buf.strip():
                    self.q.put(("log", writer.buf.strip()))
                self.q.put(("done", None))
            except Exception:
                self.q.put(("done", traceback.format_exc()))
 
        threading.Thread(target=worker, daemon=True).start()
        self.after(self.POLL_MS, self._poll)
 
    def _poll(self):
        done, err = False, None
        try:
            while True:
                kind, payload = self.q.get_nowait()
                if kind == "log":
                    self.log(payload)
                elif kind == "done":
                    done, err = True, payload
        except queue.Empty:
            pass
 
        self._ticks += 1
        if self._ticks % self.TICK_EVERY == 0 or done:
            try:
                self.on_tick()
            except Exception:
                pass
 
        if done:
            self.training = False
            self.app.busy = False
            for w in self.lock_widgets:
                w.state(["!disabled"])
            if err:
                self.log(err)
                self.status.set("Lỗi khi huấn luyện (xem nhật ký bên dưới)")
                messagebox.showerror("Lỗi", err.strip().splitlines()[-1])
            elif self._on_done:
                self._on_done()
        else:
            self.after(self.POLL_MS, self._poll)
 
    def on_tick(self):
        pass
 
 
class ProbBars(ttk.Frame):
    """Biểu đồ cột xác suất, có thể kèm một ảnh (feature map)."""
 
    def __init__(self, master, horizontal=False, with_map=False, figsize=(5.0, 3.4)):
        super().__init__(master)
        self.horizontal = horizontal
        self.fig = Figure(figsize=figsize, dpi=100)
        if with_map:
            self.ax, self.ax_map = self.fig.subplots(1, 2, gridspec_kw={"width_ratios": [2, 1]})
        else:
            self.ax, self.ax_map = self.fig.add_subplot(111), None
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)
 
    def show(self, labels, probs, fmap=None, title=""):
        probs = np.asarray(probs, dtype=float)
        n = len(probs)
        best = int(probs.argmax())
        colors = ["#4c9be8"] * n
        colors[best] = "#e8704c"
        ax = self.ax
        ax.clear()
        if self.horizontal:
            ax.barh(range(n), probs, color=colors)
            ax.set_yticks(range(n))
            ax.set_yticklabels(labels)
            ax.invert_yaxis()
            ax.set_xlim(0, 1)
            for i, p in enumerate(probs):
                ax.text(min(p + 0.02, 0.8), i, "{:.1%}".format(p), va="center", fontsize=8)
        else:
            ax.bar(range(n), probs, color=colors)
            ax.set_xticks(range(n))
            ax.set_xticklabels(labels)
            ax.set_ylim(0, 1)
        ax.set_title(title, fontsize=10)
        if self.ax_map is not None:
            self.ax_map.clear()
            self.ax_map.axis("off")
            if fmap is not None:
                self.ax_map.imshow(fmap, cmap="gray")
                self.ax_map.set_title("Feature map\nsau Convolve", fontsize=9)
        self.fig.tight_layout()
        self.canvas.draw_idle()
 
def center_like_mnist(img):
    """Chuẩn hóa nét vẽ giống MNIST: cắt sát chữ, co về khung 20x20, đặt tâm khối lượng vào giữa ảnh 28x28."""
    img = np.asarray(img, dtype=np.float32)
    ys, xs = np.where(img > 0.1)
    if len(ys) == 0:
        return img
    img = img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = img.shape
    scale = 20.0 / max(h, w)
    nh, nw = max(1, int(round(h * scale))), max(1, int(round(w * scale)))
    ri = np.clip((np.arange(nh) / scale).astype(int), 0, h - 1)
    ci = np.clip((np.arange(nw) / scale).astype(int), 0, w - 1)
    small = img[np.ix_(ri, ci)]
    mass = small.sum()
    cy = (small.sum(axis=1) * np.arange(nh)).sum() / mass
    cx = (small.sum(axis=0) * np.arange(nw)).sum() / mass
    oy = min(max(int(round(14 - cy)), 0), 28 - nh)
    ox = min(max(int(round(14 - cx)), 0), 28 - nw)
    out = np.zeros((28, 28), dtype=np.float32)
    out[oy:oy + nh, ox:ox + nw] = small
    return out

class DrawPad(ttk.Frame):
    """Bảng vẽ 28x28 (mỗi ô 10px). Nét trắng trên nền đen giống MNIST."""

    CELL = 10
    N = 28
 
    def __init__(self, master, on_release=None):
        super().__init__(master)
        size = self.CELL * self.N
        self.canvas = tk.Canvas(self, width=size, height=size, bg="black", highlightthickness=1)
        self.canvas.pack()
        self.img = np.zeros((self.N, self.N), dtype=np.float32)
        self.items = [[None] * self.N for _ in range(self.N)]
        for j in range(self.N):
            for i in range(self.N):
                self.items[j][i] = self.canvas.create_rectangle(
                    i * self.CELL, j * self.CELL, (i + 1) * self.CELL, (j + 1) * self.CELL,
                    fill="#000000", outline="")
        self.on_release = on_release
        self.last = None
        self.canvas.bind("<Button-1>", self._press)
        self.canvas.bind("<B1-Motion>", self._move)
        self.canvas.bind("<ButtonRelease-1>", self._release)
 
    def _set_cell(self, j, i, v):
        self.img[j, i] = v
        g = int(255 * min(1.0, max(0.0, float(v))))
        self.canvas.itemconfig(self.items[j][i], fill="#{:02x}{:02x}{:02x}".format(g, g, g))
 
    def _stamp(self, cx, cy):
        r = 2
        for j in range(max(0, int(cy) - r - 1), min(self.N, int(cy) + r + 2)):
            for i in range(max(0, int(cx) - r - 1), min(self.N, int(cx) + r + 2)):
                d2 = (i - cx) ** 2 + (j - cy) ** 2
                v = float(np.exp(-d2 / (2 * 0.9 ** 2)))
                if v > self.img[j, i]:
                    self._set_cell(j, i, v)
 
    def _paint_to(self, ex, ey):
        cx, cy = ex / self.CELL - 0.5, ey / self.CELL - 0.5
        if self.last is None:
            self._stamp(cx, cy)
        else:
            lx, ly = self.last
            steps = max(1, int(max(abs(cx - lx), abs(cy - ly)) / 0.4))
            for s in range(1, steps + 1):
                t = s / steps
                self._stamp(lx + (cx - lx) * t, ly + (cy - ly) * t)
        self.last = (cx, cy)
 
    def _press(self, e):
        self.last = None
        self._paint_to(e.x, e.y)
 
    def _move(self, e):
        self._paint_to(e.x, e.y)
 
    def _release(self, _e):
        self.last = None
        if self.on_release:
            self.on_release()
 
    def clear(self):
        for j in range(self.N):
            for i in range(self.N):
                self._set_cell(j, i, 0.0)
 
    def set(self, arr):
        arr = np.clip(np.asarray(arr, dtype=np.float32).reshape(self.N, self.N), 0, 1)
        for j in range(self.N):
            for i in range(self.N):
                self._set_cell(j, i, arr[j, i])
 
    def get(self):
        return self.img.copy()
 
 
# ----------------------------------------------------------------------------
# Q1: Perceptron
# ----------------------------------------------------------------------------
class Q1Tab(TabBase):
    def __init__(self, master, app):
        super().__init__(master, app)
        top = ttk.Frame(self)
        top.pack(fill="x")
        b_reset = ttk.Button(top, text="Dữ liệu + mô hình mới", command=self.reset)
        b_train = ttk.Button(top, text="Train perceptron", command=self.train)
        b_reset.pack(side="left")
        b_train.pack(side="left", padx=6)
        self.lock_widgets = [b_reset, b_train]
        ttk.Label(top, textvariable=self.status).pack(side="left", padx=10)
 
        self.fig = Figure(figsize=(6, 4.6), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)
        self.make_log(self, 6).pack(fill="x")
        self.model = None
        self.dataset = None
        self.reset()
 
    def reset(self):
        try:
            self.model = models.PerceptronModel(3)
            self.dataset = backend.PerceptronDataset(self.model)
            self.status.set("Đã tạo dữ liệu 500 điểm. Bấm Train.")
            self.draw()
        except Exception as e:
            self.model = None
            self.fail(e)
 
    def draw(self):
        ax = self.ax
        ax.clear()
        x, y = self.dataset.x, self.dataset.y.flatten()
        ax.scatter(x[y == 1, 0], x[y == 1, 1], color="red", marker="+", label="+1")
        ax.scatter(x[y == -1, 0], x[y == -1, 1], color="blue", marker="_", label="-1")
        w = self.model.get_weights().detach().numpy().flatten()
        lim = np.array([-3.0, 3.0])
        if w.size == 3:
            if w[1] != 0:
                ax.plot(lim, (-w[0] * lim - w[2]) / w[1], color="black")
            elif w[0] != 0:
                ax.plot(np.full(2, -w[2] / w[0]), lim, color="black")
            acc = float(np.mean(np.where(x @ w >= 0, 1.0, -1.0) == y))
            ax.set_title("w = [{:.2f}, {:.2f}, {:.2f}]   accuracy = {:.1%}".format(w[0], w[1], w[2], acc), fontsize=10)
        ax.set_xlim(lim)
        ax.set_ylim(lim)
        ax.legend(loc="lower right")
        self.canvas.draw_idle()
 
    def train(self):
        if self.model is None:
            return
        self.status.set("Đang train...")
        self.run_task(lambda: train.train_perceptron(self.model, self.dataset), self.after_train)
 
    def after_train(self):
        self.status.set("Train xong. Đường đen là ranh giới phân loại.")
        self.draw()
 
    def on_tick(self):
        if self.model is not None:
            self.draw()
 
 
# ----------------------------------------------------------------------------
# Q2: Hồi quy sin(x)
# ----------------------------------------------------------------------------
class Q2Tab(TabBase):
    TICK_EVERY = 2
 
    def __init__(self, master, app):
        super().__init__(master, app)
        top = ttk.Frame(self)
        top.pack(fill="x")
        b_train = ttk.Button(top, text="Train hồi quy", command=self.train)
        b_load = ttk.Button(top, text="Nạp trọng số đã lưu", command=self.load)
        b_train.pack(side="left")
        b_load.pack(side="left", padx=6)
        self.lock_widgets = [b_train, b_load]
        ttk.Label(top, textvariable=self.status).pack(side="left", padx=10)
 
        self.fig = Figure(figsize=(6, 4.2), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)
        self.make_log(self, 6).pack(fill="x")
        self.grid_x = np.linspace(-2 * np.pi, 2 * np.pi, 200).reshape(-1, 1).astype(np.float32)
        self.model = None
        self.draw()
 
    def draw(self):
        ax = self.ax
        ax.clear()
        ax.plot(self.grid_x, np.sin(self.grid_x), color="blue", label="sin(x) thật")
        title = "Chưa có mô hình"
        if self.model is not None:
            with torch.no_grad():
                pred = self.model(torch.tensor(self.grid_x))
                loss = losses.regression_loss(pred, torch.tensor(np.sin(self.grid_x))).item()
            ax.plot(self.grid_x, pred.detach().numpy(), color="red", label="mô hình học được")
            title = "loss (MSE) = {:.5f}   (ngưỡng đề: <= 0.02)".format(loss)
        ax.set_xlim(-2 * np.pi, 2 * np.pi)
        ax.set_ylim(-1.4, 1.4)
        ax.set_title(title, fontsize=10)
        ax.legend(loc="upper right")
        self.canvas.draw_idle()
 
    def train(self):
        self.status.set("Đang train... (đường đỏ cập nhật trực tiếp)")
 
        def job():
            self.model = models.RegressionModel()
            dataset = backend.RegressionDataset(self.model)
            train.train_regression(self.model, dataset)
            save_weights(self.model, "q2")
 
        self.run_task(job, lambda: self.status.set("Train xong, đã lưu trọng số."))
 
    def load(self):
        try:
            m = models.RegressionModel()
            load_weights(m, "q2")
            self.model = m
            self.status.set("Đã nạp trọng số.")
            self.draw()
        except Exception as e:
            self.fail(e)
 
    def on_tick(self):
        if self.model is not None:
            self.draw()
 
 
# ----------------------------------------------------------------------------
# Q3 và Q5: Nhận dạng chữ số (dùng chung giao diện)
# ----------------------------------------------------------------------------
class DigitTab(TabBase):
    MODEL_NAME = ""
    DATASET_NAME = ""
    TRAIN_NAME = ""
    WNAME = ""
    WITH_MAP = False
 
    def __init__(self, master, app):
        super().__init__(master, app)
        self.model = None
        self.dataset = None
 
        top = ttk.Frame(self)
        top.pack(fill="x")
        b_train = ttk.Button(top, text="Train mô hình", command=self.train_clicked)
        b_load = ttk.Button(top, text="Nạp trọng số đã lưu", command=self.load_clicked)
        b_acc = ttk.Button(top, text="Đo độ chính xác tập test", command=self.test_acc)
        b_train.pack(side="left")
        b_load.pack(side="left", padx=6)
        b_acc.pack(side="left")
        self.lock_widgets = [b_train, b_load, b_acc]
        if self.WITH_MAP:
            ttk.Button(top, text="Kiểm tra hàm Convolve", command=self.check_convolve).pack(side="left", padx=6)
        ttk.Label(top, textvariable=self.status).pack(side="left", padx=10)
 
        mid = ttk.Frame(self)
        mid.pack(fill="both", expand=True, pady=6)
        left = ttk.LabelFrame(mid, text="Vẽ chữ số bằng chuột trái")
        left.pack(side="left", padx=6)
        self.pad = DrawPad(left, on_release=self.predict)
        self.pad.pack(padx=6, pady=6)
        row = ttk.Frame(left)
        row.pack(pady=4)
        ttk.Button(row, text="Xóa", command=self.pad.clear).pack(side="left", padx=3)
        ttk.Button(row, text="Dự đoán", command=self.predict).pack(side="left", padx=3)
        ttk.Button(row, text="Ảnh test ngẫu nhiên", command=self.random_test).pack(side="left", padx=3)
        self.bars = ProbBars(mid, with_map=self.WITH_MAP, figsize=(6.0, 3.6) if self.WITH_MAP else (5.0, 3.6))
        self.bars.pack(side="left", fill="both", expand=True, padx=6)
        self.make_log(self, 6).pack(fill="x")
        self.status.set("Hãy Train hoặc Nạp trọng số trước khi dự đoán.")
 
    def _new_model(self):
        return getattr(models, self.MODEL_NAME)()
 
    def _new_dataset(self, model):
        return getattr(backend, self.DATASET_NAME)(model)
 
    def train_clicked(self):
        self.status.set("Đang train... (xem tiến độ ở nhật ký)")
 
        def job():
            model = self._new_model()
            dataset = self._new_dataset(model)
            self.model, self.dataset = model, dataset
            getattr(train, self.TRAIN_NAME)(model, dataset)
            save_weights(model, self.WNAME)
 
        self.run_task(job, lambda: self.status.set("Train xong, đã lưu trọng số. Hãy vẽ một chữ số."))
 
    def load_clicked(self):
        try:
            model = self._new_model()
            load_weights(model, self.WNAME)
            self.model = model
            if self.dataset is not None:
                self.dataset.model = model
            self.status.set("Đã nạp trọng số. Hãy vẽ một chữ số.")
        except Exception as e:
            self.fail(e)
 
    def _ensure_dataset(self):
        if self.dataset is None:
            self.dataset = self._new_dataset(self.model)
        else:
            self.dataset.model = self.model
 
    def _ready(self):
        if self.model is None:
            self.status.set("Chưa có mô hình: hãy Train hoặc Nạp trọng số.")
            return False
        return True
 
    def predict(self):
        if not self._ready():
            return
        try:
            arr = center_like_mnist(self.pad.get())
            x = torch.tensor(arr.reshape(1, 784), dtype=torch.float32)
            with torch.no_grad():
                probs = torch.softmax(self.model(x), dim=-1)[0].numpy()
                fmap = None
                if self.WITH_MAP:
                    fmap = models.Convolve(torch.tensor(arr), self.model.convolution_weights).detach().numpy()
            best = int(probs.argmax())
            self.bars.show([str(i) for i in range(10)], probs, fmap, "Dự đoán: {}  ({:.1%})".format(best, probs[best]))
            self.status.set("Dự đoán: {}".format(best))
        except Exception as e:
            self.fail(e)
 
    def random_test(self):
        if not self._ready():
            return
        try:
            self._ensure_dataset()
            i = random.randrange(len(self.dataset.test_images))
            self.pad.set(np.asarray(self.dataset.test_images[i]).reshape(28, 28))
            self.predict()
            self.status.set(self.status.get() + "   (nhãn thật: {})".format(int(self.dataset.test_labels[i])))
        except Exception as e:
            self.fail(e)
 
    def test_acc(self):
        if not self._ready():
            return
        try:
            self._ensure_dataset()
            with torch.no_grad():
                logits = self.model(torch.tensor(np.asarray(self.dataset.test_images), dtype=torch.float32))
            pred = logits.argmax(dim=1).numpy()
            acc = float(np.mean(pred == self.dataset.test_labels))
            self.status.set("Độ chính xác trên tập test: {:.2%}".format(acc))
            self.log("Test accuracy = {:.2%}".format(acc))
        except Exception as e:
            self.fail(e)
 
    def check_convolve(self):
        try:
            for size in (2, 4, 6):
                w = np.random.rand(2, 2)
                a = np.random.rand(size, size)
                out = models.Convolve(torch.Tensor(a), torch.Tensor(w))
                out = np.asarray(out.detach().numpy() if hasattr(out, "detach") else out)
                k = size - 1
                expected = np.array([[(a[r:r + 2, c:c + 2] * w).sum() for c in range(k)] for r in range(k)])
                ok = out.shape == expected.shape and np.allclose(out, expected, atol=1e-5)
                self.log("Convolve ảnh {0}x{0}, kernel 2x2 -> {1}".format(size, "ĐÚNG" if ok else "SAI (shape {} so với {})".format(out.shape, expected.shape)))
            self.status.set("Đã kiểm tra Convolve (xem nhật ký).")
        except Exception as e:
            self.fail(e)
 
 
class Q3Tab(DigitTab):
    MODEL_NAME = "DigitClassificationModel"
    DATASET_NAME = "DigitClassificationDataset"
    TRAIN_NAME = "train_digitclassifier"
    WNAME = "q3"
 
 
class Q5Tab(DigitTab):
    MODEL_NAME = "DigitConvolutionalModel"
    DATASET_NAME = "DigitClassificationDataset"   # đổi: dùng bộ MNIST đầy đủ 60 000 ảnh
    TRAIN_NAME = "Train_DigitConvolution"
    WNAME = "q5_full"    
    WITH_MAP = True
 
 
# ----------------------------------------------------------------------------
# Q4: Nhận dạng ngôn ngữ
# ----------------------------------------------------------------------------
class Q4Tab(TabBase):
    EXAMPLES = ["discussed", "eternidad", "itseänne", "paleis", "mieszkać"]
 
    def __init__(self, master, app):
        super().__init__(master, app)
        self.model = None
        self.dataset = None
 
        top = ttk.Frame(self)
        top.pack(fill="x")
        b_train = ttk.Button(top, text="Train mô hình", command=self.train_clicked)
        b_load = ttk.Button(top, text="Nạp trọng số đã lưu", command=self.load_clicked)
        b_acc = ttk.Button(top, text="Đo độ chính xác", command=self.measure)
        b_train.pack(side="left")
        b_load.pack(side="left", padx=6)
        b_acc.pack(side="left")
        self.lock_widgets = [b_train, b_load, b_acc]
        ttk.Label(top, textvariable=self.status).pack(side="left", padx=10)
 
        inp = ttk.LabelFrame(self, text="Gõ một từ để đoán ngôn ngữ")
        inp.pack(fill="x", pady=6)
        self.word = tk.StringVar()
        ent = ttk.Entry(inp, textvariable=self.word, width=28, font=("Segoe UI", 12))
        ent.pack(side="left", padx=6, pady=6)
        ent.bind("<Return>", lambda _e: self.predict())
        ttk.Button(inp, text="Đoán", command=self.predict).pack(side="left")
        ttk.Label(inp, text="  Ví dụ:").pack(side="left")
        for w in self.EXAMPLES:
            ttk.Button(inp, text=w, command=lambda w=w: self.use_example(w)).pack(side="left", padx=2)
 
        self.bars = ProbBars(self, horizontal=True, figsize=(6.0, 3.2))
        self.bars.pack(fill="both", expand=True)
        self.make_log(self, 7).pack(fill="x")
        self.status.set("Hãy Train hoặc Nạp trọng số trước khi dự đoán.")
 
    def train_clicked(self):
        self.status.set("Đang train... (xem tiến độ ở nhật ký)")
 
        def job():
            model = models.LanguageIDModel()
            dataset = backend.LanguageIDDataset(model)
            self.model, self.dataset = model, dataset
            train.train_languageid(model, dataset)
            save_weights(model, "q4")
 
        self.run_task(job, lambda: self.status.set("Train xong, đã lưu trọng số. Hãy gõ một từ."))
 
    def load_clicked(self):
        try:
            model = models.LanguageIDModel()
            load_weights(model, "q4")
            self.model = model
            self._ensure_dataset()
            self.status.set("Đã nạp trọng số. Hãy gõ một từ.")
        except Exception as e:
            self.fail(e)
 
    def _ensure_dataset(self):
        if self.dataset is None:
            self.dataset = backend.LanguageIDDataset(self.model)
        else:
            self.dataset.model = self.model
 
    def use_example(self, w):
        self.word.set(w)
        self.predict()
 
    def measure(self):
        if self.model is None:
            self.status.set("Chưa có mô hình.")
            return
        try:
            self._ensure_dataset()
            with torch.no_grad():
                acc = self.dataset.get_validation_accuracy()
            self.status.set("Độ chính xác: {:.2%}".format(acc))
            self.log("Accuracy = {:.2%}".format(acc))
        except Exception as e:
            self.fail(e)
 
    def predict(self):
        if self.model is None:
            self.status.set("Chưa có mô hình: hãy Train hoặc Nạp trọng số.")
            return
        word = self.word.get().strip().lower()
        if not word:
            return
        try:
            self._ensure_dataset()
            chars = [str(c) for c in self.dataset.chars]
            names = [str(n) for n in self.dataset.language_names]
            index = {c: i for i, c in enumerate(chars)}
            kept = [index[c] for c in word if c in index]
            skipped = [c for c in word if c not in index]
            if not kept:
                self.status.set("Không ký tự nào nằm trong bảng chữ cái của mô hình.")
                return
            xs = torch.zeros(len(kept), 1, len(chars))
            for t, i in enumerate(kept):
                xs[t, 0, i] = 1.0
            with torch.no_grad():
                probs = torch.softmax(self.model(xs), dim=-1)[0].numpy()
            best = int(probs.argmax())
            self.bars.show(names, probs, None, "Dự đoán: {}  ({:.1%})".format(names[best], probs[best]))
            msg = "Dự đoán: " + names[best]
            if skipped:
                msg += "   (bỏ qua ký tự lạ: {})".format(" ".join(skipped))
            self.status.set(msg)
        except Exception as e:
            self.fail(e)
 
 
# ----------------------------------------------------------------------------
# Q6: Attention
# ----------------------------------------------------------------------------
class Q6Tab(TabBase):
    def __init__(self, master, app):
        super().__init__(master, app)
        top = ttk.Frame(self)
        top.pack(fill="x")
        ttk.Label(top, text="Chuỗi ký tự:").pack(side="left")
        self.text = tk.StringVar(value="pacman")
        ent = ttk.Entry(top, textvariable=self.text, width=24)
        ent.pack(side="left", padx=6)
        ent.bind("<Return>", lambda _e: self.run())
        ttk.Label(top, text="layer_size:").pack(side="left")
        self.size = tk.StringVar(value="16")
        ttk.Spinbox(top, from_=4, to=64, textvariable=self.size, width=5).pack(side="left", padx=6)
        ttk.Button(top, text="Chạy Attention", command=self.run).pack(side="left", padx=6)
        ttk.Label(top, textvariable=self.status).pack(side="left", padx=10)
 
        self.fig = Figure(figsize=(6, 4.6), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().pack(fill="both", expand=True)
        self.make_log(self, 5).pack(fill="x")
        self.log("Mỗi ký tự được gán một vector ngẫu nhiên cố định, rồi đưa qua lớp Attention của nhóm (Q6).")
        self.log("Bản đồ nhiệt: hàng = ký tự đang xét, cột = ký tự được 'nhìn'. Phần trên đường chéo phải bằng 0 (mặt nạ nhân quả).")
        self.run()
 
    def run(self):
        try:
            text = self.text.get().lower()[:24]
            if len(text) < 2:
                self.status.set("Hãy nhập ít nhất 2 ký tự.")
                return
            T, C = len(text), int(self.size.get())
            torch.manual_seed(0)
            att = models.Attention(C, T)
            emb = {ch: torch.randn(C) for ch in sorted(set(text))}
            x = torch.stack([emb[ch] for ch in text]).unsqueeze(0)
            with torch.no_grad():
                Q, K, V = att.q_layer(x), att.k_layer(x), att.v_layer(x)
                scores = torch.matmul(Q, torch.movedim(K, 1, 2)) / C ** 0.5
                scores = scores.masked_fill(att.mask[:, :, :T, :T] == 0, float("-inf"))[0]
                w = torch.softmax(scores, dim=-1)
                expected = torch.matmul(w, V)
                got = att(x)
            if got is None:
                raise RuntimeError("Attention.forward chưa trả về kết quả (còn trống?).")
            diff = (got - expected).abs().max().item()
            w0 = w[0] if w.dim() == 3 else w
            upper = torch.triu(w0, diagonal=1).abs().max().item()
 
            ax = self.ax
            ax.clear()
            ax.imshow(w0.numpy(), cmap="viridis", vmin=0, vmax=1)
            ax.set_xticks(range(T))
            ax.set_xticklabels(list(text))
            ax.set_yticks(range(T))
            ax.set_yticklabels(list(text))
            if T <= 12:
                for r in range(T):
                    for c in range(T):
                        ax.text(c, r, "{:.2f}".format(float(w0[r, c])), ha="center", va="center", fontsize=7, color="white")
            ax.set_title("Trọng số attention", fontsize=10)
            self.fig.tight_layout()
            self.canvas.draw_idle()
            self.status.set("Khớp công thức (sai lệch {:.1e}); mặt nạ nhân quả {}".format(diff, "ĐÚNG" if upper < 1e-6 else "SAI"))
        except Exception as e:
            self.fail(e)
 
 
# ----------------------------------------------------------------------------
# Q7: character-GPT
# ----------------------------------------------------------------------------
class Q7Tab(TabBase):
    TICK_EVERY = 3
    BLOCK, EMB, LAYERS = 10, 100, 6
 
    def __init__(self, master, app):
        super().__init__(master, app)
        self.model = None
        self.ds = None
        self.data = None
        self.hist = []
        self.stop = False
 
        top = ttk.Frame(self)
        top.pack(fill="x")
        self.iters = tk.StringVar(value="3000")
        self.lr = tk.StringVar(value="0.0004")
        self.batch = tk.StringVar(value="500")
        ttk.Label(top, text="Số vòng lặp:").pack(side="left")
        ttk.Entry(top, textvariable=self.iters, width=7).pack(side="left", padx=4)
        ttk.Label(top, text="lr:").pack(side="left")
        ttk.Entry(top, textvariable=self.lr, width=8).pack(side="left", padx=4)
        ttk.Label(top, text="batch:").pack(side="left")
        ttk.Entry(top, textvariable=self.batch, width=6).pack(side="left", padx=4)
        b_train = ttk.Button(top, text="Train", command=self.train_clicked)
        b_load = ttk.Button(top, text="Nạp trọng số", command=self.load_clicked)
        b_train.pack(side="left", padx=4)
        b_load.pack(side="left", padx=4)
        ttk.Button(top, text="Dừng", command=self.request_stop).pack(side="left", padx=4)
        self.lock_widgets = [b_train, b_load]
        ttk.Label(top, textvariable=self.status).pack(side="left", padx=10)
 
        self.fig = Figure(figsize=(6, 2.6), dpi=100)
        self.ax = self.fig.add_subplot(111)
        self.canvas = FigureCanvasTkAgg(self.fig, master=self)
        self.canvas.get_tk_widget().pack(fill="x")
 
        gen = ttk.LabelFrame(self, text="Sinh văn bản")
        gen.pack(fill="both", expand=True, pady=4)
        row = ttk.Frame(gen)
        row.pack(fill="x", pady=4)
        ttk.Label(row, text="Prompt:").pack(side="left", padx=4)
        self.prompt = tk.StringVar(value="Pacman")
        ttk.Entry(row, textvariable=self.prompt, width=24).pack(side="left")
        ttk.Label(row, text="  Số ký tự:").pack(side="left")
        self.length = tk.StringVar(value="300")
        ttk.Spinbox(row, from_=20, to=1000, increment=20, textvariable=self.length, width=6).pack(side="left", padx=4)
        ttk.Button(row, text="Sinh văn bản", command=self.generate).pack(side="left", padx=6)
        self.out = tk.Text(gen, height=9, wrap="word", font=("Consolas", 10))
        self.out.pack(fill="both", expand=True, padx=4, pady=4)
        self.make_log(self, 5).pack(fill="x")
        self.status.set("Train (cần input.txt) hoặc Nạp trọng số để sinh văn bản.")
        self.draw()
 
    def _prepare(self):
        if self.ds is not None:
            return
        import chargpt
 
        if not os.path.exists("input.txt"):
            raise FileNotFoundError("Không thấy input.txt trong thư mục dự án (tải từ trang đề Q7).")
        with open("input.txt", "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        self.ds = chargpt.CharDataset(text)
        self.data = torch.tensor([self.ds.char2index[c] for c in text], dtype=torch.long)
 
    def _new_model(self):
        from gpt_model import Character_GPT
 
        return Character_GPT(self.BLOCK, n_embd=self.EMB, n_layer=self.LAYERS, vocab_size=self.ds.vocab_size)
 
    def request_stop(self):
        self.stop = True
 
    def train_clicked(self):
        try:
            iters, lr, batch = int(self.iters.get()), float(self.lr.get()), int(self.batch.get())
        except ValueError:
            self.status.set("Số vòng lặp, lr, batch không hợp lệ.")
            return
        self.stop = False
        self.hist = []
        self.status.set("Đang train... (có thể bấm Dừng)")
 
        def job():
            self._prepare()
            model = self._new_model()
            self.model = model
            opt = torch.optim.Adam(model.parameters(), lr=lr)
            n = len(self.data) - self.BLOCK - 1
            ar = torch.arange(self.BLOCK)
            model.train()
            for it in range(iters):
                if self.stop:
                    print("Đã dừng theo yêu cầu ở vòng {}.".format(it))
                    break
                idx = torch.randint(0, n, (batch,))
                x = self.data[idx[:, None] + ar]
                y = self.data[idx[:, None] + ar + 1]
                loss = model.get_loss(x, y)
                model.zero_grad(set_to_none=True)
                loss.backward()
                opt.step()
                if it % 10 == 0:
                    self.hist.append((it, loss.item()))
                if it % 100 == 0:
                    print("Iteration {}: train loss {:.4f}".format(it, loss.item()))
            model.eval()
            save_weights(model, "q7")
 
        self.run_task(job, lambda: self.status.set("Train xong, đã lưu trọng số. Hãy sinh văn bản."))
 
    def load_clicked(self):
        try:
            self._prepare()
            model = self._new_model()
            load_weights(model, "q7")
            model.eval()
            self.model = model
            self.status.set("Đã nạp trọng số. Hãy sinh văn bản.")
        except Exception as e:
            self.fail(e)
 
    def generate(self):
        if self.training:
            self.status.set("Đang train, hãy chờ xong rồi sinh văn bản.")
            return
        if self.model is None or self.ds is None:
            self.status.set("Chưa có mô hình: hãy Train hoặc Nạp trọng số.")
            return
        try:
            prompt = self.prompt.get()
            ids = [self.ds.char2index[c] for c in prompt if c in self.ds.char2index]
            if not ids:
                self.status.set("Prompt không có ký tự nào nằm trong dữ liệu huấn luyện.")
                return
            n = int(self.length.get())
            x = torch.tensor(ids, dtype=torch.long)[None, ...]
            y = self.model.generate(x, n)[0]
            text = "".join(self.ds.index2char[int(i)] for i in y)
            self.out.delete("1.0", "end")
            self.out.insert("end", text)
            self.status.set("Đã sinh {} ký tự.".format(n))
        except Exception as e:
            self.fail(e)
 
    def draw(self):
        ax = self.ax
        ax.clear()
        h = list(self.hist)
        if h:
            ax.plot([a for a, _ in h], [b for _, b in h], color="#e8704c")
        ax.set_xlabel("vòng lặp")
        ax.set_ylabel("train loss")
        ax.set_title("Đường cong loss", fontsize=10)
        self.fig.tight_layout()
        self.canvas.draw_idle()
 
    def on_tick(self):
        self.draw()
 
 
# ----------------------------------------------------------------------------
# Cửa sổ chính
# ----------------------------------------------------------------------------
TABS = [
    ("Q1 Perceptron", Q1Tab),
    ("Q2 Hồi quy", Q2Tab),
    ("Q3 Chữ số", Q3Tab),
    ("Q4 Ngôn ngữ", Q4Tab),
    ("Q5 CNN", Q5Tab),
    ("Q6 Attention", Q6Tab),
    ("Q7 GPT", Q7Tab),
]
 
 
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Project 5 - Demo giao diện (Nhóm 5)")
        self.geometry("1100x800")
        self.busy = False
        try:
            ttk.Style(self).theme_use("clam")
        except Exception:
            pass
        if IMPORT_ERRORS:
            tk.Label(self, fg="red", justify="left", wraplength=1050,
                     text="Không import được một số file: " + " | ".join(IMPORT_ERRORS)).pack(fill="x")
        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True)
        for title, cls in TABS:
            try:
                nb.add(cls(nb, self), text=title)
            except Exception:
                frame = ttk.Frame(nb, padding=12)
                ttk.Label(frame, text="Không tạo được tab này:\n" + traceback.format_exc(),
                          foreground="red", justify="left").pack(anchor="nw")
                nb.add(frame, text=title)
 
 
if __name__ == "__main__":
    App().mainloop()
 