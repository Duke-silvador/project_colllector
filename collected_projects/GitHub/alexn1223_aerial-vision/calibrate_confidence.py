"""Confidence calibration: does a predicted 0.6 mean 60% precision?

Runs the model over a val split, greedily matches predictions to ground truth
at IoU >= 0.5 (same class), then reports observed precision per confidence
bin plus expected calibration error (ECE).

    python calibrate_confidence.py --weights runs/.../best.pt
    python calibrate_confidence.py --weights W.pt --data-root .../VisDrone4-degraded/jpeg_q50
"""

import argparse
import csv
from pathlib import Path

import numpy as np

BINS = np.linspace(0.0, 1.0, 11)  # 10 bins of width 0.1


def load_gt(lbl_path: Path, w: int, h: int) -> np.ndarray:
    """Return (n, 5) array: cls, x0, y0, x1, y1 in pixels."""
    if not lbl_path.exists():
        return np.zeros((0, 5))
    rows = []
    for line in lbl_path.read_text().splitlines():
        p = line.split()
        if len(p) != 5:
            continue
        cls, cx, cy, bw, bh = float(p[0]), *(float(v) for v in p[1:])
        rows.append([cls, (cx - bw / 2) * w, (cy - bh / 2) * h,
                     (cx + bw / 2) * w, (cy + bh / 2) * h])
    return np.array(rows) if rows else np.zeros((0, 5))


def iou_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """IoU between (n,4) and (m,4) xyxy boxes."""
    if not len(a) or not len(b):
        return np.zeros((len(a), len(b)))
    ix0 = np.maximum(a[:, None, 0], b[None, :, 0])
    iy0 = np.maximum(a[:, None, 1], b[None, :, 1])
    ix1 = np.minimum(a[:, None, 2], b[None, :, 2])
    iy1 = np.minimum(a[:, None, 3], b[None, :, 3])
    inter = np.clip(ix1 - ix0, 0, None) * np.clip(iy1 - iy0, 0, None)
    area_a = (a[:, 2] - a[:, 0]) * (a[:, 3] - a[:, 1])
    area_b = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
    return inter / (area_a[:, None] + area_b[None, :] - inter + 1e-9)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", required=True)
    ap.add_argument("--data-root", default=str(
        Path.home() / "Desktop/My_Projects/datasets/VisDrone4"))
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--conf", type=float, default=0.05)
    ap.add_argument("--device", default="mps")
    ap.add_argument("--limit", type=int, default=0, help="cap image count (0 = all)")
    ap.add_argument("--out", default="calibration_report.csv")
    args = ap.parse_args()

    from ultralytics import YOLO

    root = Path(args.data_root)
    images = sorted((root / "images/val").glob("*.jpg"))
    if args.limit:
        images = images[: args.limit]
    model = YOLO(args.weights)

    confs, hits = [], []  # one entry per prediction: confidence, matched-or-not
    # zip with our own ordered list: r.path is unreliable for list sources
    stream = model.predict(source=[str(p) for p in images], imgsz=args.imgsz,
                           conf=args.conf, device=args.device, stream=True,
                           verbose=False)
    for img_path, r in zip(images, stream):
        h, w = r.orig_shape
        gt = load_gt(root / "labels/val" / (img_path.stem + ".txt"), w, h)
        boxes = r.boxes.xyxy.cpu().numpy()
        cls = r.boxes.cls.cpu().numpy()
        conf = r.boxes.conf.cpu().numpy()

        order = np.argsort(-conf)  # greedy match, highest confidence first
        taken = np.zeros(len(gt), bool)
        for i in order:
            same = np.where((gt[:, 0] == cls[i]) & ~taken)[0]
            matched = False
            if len(same):
                ious = iou_matrix(boxes[i:i + 1], gt[same, 1:5])[0]
                j = ious.argmax()
                if ious[j] >= 0.5:
                    taken[same[j]] = True
                    matched = True
            confs.append(conf[i])
            hits.append(matched)

    confs = np.array(confs)
    hits = np.array(hits)
    rows, ece = [], 0.0
    for lo, hi in zip(BINS[:-1], BINS[1:]):
        m = (confs >= lo) & (confs < hi)
        n = int(m.sum())
        if n:
            precision = float(hits[m].mean())
            mean_conf = float(confs[m].mean())
            ece += (n / len(confs)) * abs(precision - mean_conf)
        else:
            precision, mean_conf = float("nan"), float("nan")
        rows.append({"bin": f"{lo:.1f}-{hi:.1f}", "n": n,
                     "mean_conf": round(mean_conf, 4) if n else "",
                     "precision": round(precision, 4) if n else ""})
        if n:
            print(f"conf {lo:.1f}-{hi:.1f}  n={n:6d}  "
                  f"mean_conf={mean_conf:.3f}  precision={precision:.3f}")

    print(f"\nECE (expected calibration error): {ece:.4f}")
    print("usable if precision tracks mean_conf; e.g. a 0.6 that means ~0.6")
    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        f.write(f"# ECE,{ece:.4f}\n")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
